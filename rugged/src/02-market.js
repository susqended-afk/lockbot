// ============================================================
// MARKET — memecoin simulation (pure logic, no rendering)
//
// Launchpad coins use a pump-style bonding curve: a constant-product
// curve over *virtual* reserves (30 SOL / 1.073B tokens). 793.1M tokens
// are sold on the curve; when they're gone (~85 SOL raised) the coin
// "graduates": the raised SOL + the last 206.9M tokens seed a DEX pool
// (x*y=k) and the LP tokens are burned. Custom launches skip the curve
// and the dev seeds (and controls) the pool directly.
// ============================================================
const SUPPLY = 1_000_000_000;
const V_SOL0 = 30;
const V_TOK0 = 1_073_000_000;
const CURVE_TOK = 793_100_000;
const LP_TOK = SUPPLY - CURVE_TOK;
const MIGRATION_FEE = 2;
const CURVE_FEE = 0.01;
const DEX_FEE = 0.0025;
const CANDLE_SEC = 3;
const PUMP_LAUNCH_FEE = 0.02;
const DEV_TX_FEE = 0.005; // priority fee per dev transaction
const CREATOR_FEE = 0.003; // creator reward: share of every trade's volume
const CUSTOM_DEPLOY_FEE = 0.4;

const MEME_KINDS = {
  frog:    { meta: 'FROGS',     animal: true,  label: 'Frog' },
  dog:     { meta: 'DOGS',      animal: true,  label: 'Dog' },
  cat:     { meta: 'CATS',      animal: true,  label: 'Cat' },
  penguin: { meta: 'ANIMALS',   animal: true,  label: 'Penguin' },
  robot:   { meta: 'AI AGENTS', animal: false, label: 'AI Bot' },
  rocket:  { meta: 'SPACE',     animal: false, label: 'Rocket' },
  moon:    { meta: 'SPACE',     animal: false, label: 'Moon' },
  burger:  { meta: 'FOOD',      animal: false, label: 'Burger' },
  banana:  { meta: 'FOOD',      animal: false, label: 'Banana' },
  chad:    { meta: 'GIGACHAD',  animal: false, label: 'Chad' },
};
const METAS = ['FROGS', 'DOGS', 'CATS', 'ANIMALS', 'AI AGENTS', 'SPACE', 'FOOD', 'GIGACHAD'];

function metaMultiplier(kind, meta) {
  const k = MEME_KINDS[kind];
  if (!k) return 1;
  if (k.meta === meta) return 1.75;
  if (meta === 'ANIMALS' && k.animal) return 1.35;
  return 1;
}

// Trader personalities. w = arrival weight, smart = how much RugRadar
// risk scares them off, paper = how hard they panic.
const TT = {
  sniper:   { w: 0,    buy: [0.3, 2.5],  tp: [1.25, 2.6], sl: [0.7, 0.8],  hold: [6, 35],     paper: 1.0,  smart: 0.2 },
  degen:    { w: 1.0,  buy: [0.03, 1.2], tp: [1.4, 5],    sl: [0.4, 0.7],  hold: [25, 260],   paper: 0.65, smart: 0.18 },
  smart:    { w: 0.25, buy: [0.4, 4],    tp: [1.8, 4.5],  sl: [0.68, 0.78],hold: [20, 160],   paper: 0.8,  smart: 1.0 },
  whale:    { w: 0.035,buy: [6, 30],     tp: [1.6, 3.5],  sl: [0.55, 0.7], hold: [40, 220],   paper: 0.5,  smart: 0.75 },
  diamond:  { w: 0.15, buy: [0.05, 1.5], tp: [10, 60],    sl: [0.02, 0.08],hold: [400, 3000], paper: 0.12, smart: 0.05 },
  chirp:    { w: 0,    buy: [0.03, 0.9],  tp: [1.3, 3.0],  sl: [0.5, 0.7],  hold: [15, 140],   paper: 0.75, smart: 0.2 },
  follower: { w: 0,    buy: [0.05, 1.0], tp: [1.3, 2.5],  sl: [0.55, 0.7], hold: [12, 90],    paper: 0.85, smart: 0.25 },
  kol:      { w: 0,    buy: [1, 1],      tp: [1.4, 2.0],  sl: [0.5, 0.6],  hold: [25, 70],    paper: 0.9,  smart: 0.3 },
};

const HANDLES = ['wenlambo', 'ser_pump', 'degenDave', 'apeMaxi', '0xKaren', 'solgod', 'bagholdr', 'jeetHunter', 'rentmoney', 'moonboi',
  'cupNhandle', 'gm_guy', 'notfinancial', 'liquidLarry', 'pumpPriest', 'fudbuster', 'exitLiq', 'chartwizard', 'tradinGran', 'lilBagz',
  'sendooor', 'cryptoKev', 'BasedBrenda', 'wagmiWill', 'nGMI_ned', 'ruggedRita', 'aped_again', 'diamondDan', 'mcapMike', 'fomoFiona',
  'shrimpSam', 'whaleWatch', 'ser_ape', 'ponziPete', 'goblinMode', 'dumpTruck', 'stableSteve', 'yoloYuki', 'cope_lord', 'greenCandle'];

const CHAT = {
  launch: ['first 🫡', 'CA?', 'just aped {n}', 'dev based?', 'early af', 'LFG', 'who else here from block 0', 'this name is fire', 'ok im in'],
  pump: ['WE ARE SO EARLY', 'send it 🚀', 'chart is beautiful', '100x easy', 'imagine fading ${t}', 'green candles only', 'buying more', '${t} to 1M mcap', 'dev cooking 🔥', 'raid the replies boys', 'this is the one', 'told my wife to buy'],
  calm: ['gm', 'wen marketing', 'dev wya', 'holding', 'comfy bags', 'any news?', 'floor is solid', 'who is the dev', 'wen CEX', 'vibes are good here'],
  dip: ['who sold 😡', 'just a shakeout', 'buy the dip', 'paper hands everywhere', 'jeets out, chads in', 'relax its healthy', 'im not selling', 'red candle lol'],
  devsold: ['DEV SOLD 🚨🚨', 'dev is dumping wtf', 'DEV JUST SOLD', 'get out now', 'dev sold his bag lmao', 'this is a rug', 'dev wallet moving!!'],
  rug: ['RUGGED', 'bro i just lost everything', 'that was my rent money', 'reported', 'i will find you dev', 'lmao another one', 'gg', 'classic', 'rip', 'i trusted you', 'my kid\'s birthday money man', 'sleuths on it already'],
  grad: ['WE BONDED 🎓', 'dex time baby', 'graduated!!', 'next stop 1M', 'dex paid?', 'dex listing lets go'],
  kol: ['saw the post from {k}', '{k} called it', 'here from {k}', '{k} never misses', 'came from {k} tweet'],
  dead: ['dead coin', 'anyone still here?', 'volume is gone', 'i guess its over', 'hello?'],
  unlock: ['LP UNLOCKED??', 'lock expired get out', 'dev can pull now 😬'],
};

function chatFill(s, coin, extra = {}) {
  return s.replace('${t}', '$' + coin.ticker).replace('{n}', (extra.n ?? rand(0.1, 2)).toFixed(1)).replace('{k}', extra.k || '@someone');
}

let COIN_SEQ = 1;

class Coin {
  constructor(o) {
    this.id = o.id ?? COIN_SEQ++;
    this.name = o.name; this.ticker = o.ticker; this.kind = o.kind; this.hue = o.hue ?? 120;
    this.desc = o.desc || '';
    this.type = o.type || 'pump';
    this.addr = fakeAddr();
    this.devAddr = o.devAddr || fakeAddr();
    this.devHistory = o.devHistory || 0;   // previous rugs traced to this dev wallet
    this.t = 0;
    this.supply = SUPPLY;
    this.phase = 'curve';
    this.vSol = V_SOL0; this.vTok = V_TOK0; this.realSol = 0; this.curveTokLeft = CURVE_TOK;
    this.poolSol = 0; this.poolTok = 0; this.lp = 'burned'; this.lockUntil = 0; this.lpSeed = 0;
    this.holders = [];
    this.exited = { count: 0, lossCount: 0, lossSol: 0, gainSol: 0 };
    this.dev = { main: { addr: this.devAddr, tokens: 0, cost: 0, start: 0 }, soldFrac: 0, soldAny: false };
    this.devCost = 0; this.devProceeds = 0; this.creatorFees = 0; this.feesClaimed = 0;
    this.memeScore = o.memeScore ?? 1;
    this.metaMult = o.metaMult ?? 1;
    this.attnImp = 0; this.attnTrend = 0; this.panic = 0; this.kolBoost = 0; this.chirpBoost = 0; this.chirpBuys = 0; this.chirpSize = 1;
    this.shills = 0; this.lies = 0; this.antiSnipe = !!o.antiSnipe;
    this.candles = []; this.trades = []; this.chat = []; this.events = [];
    this.volume = 0; this.recentVol = [];
    this.priceHist = []; this._phTimer = 0;
    this.athMcap = 0; this.peakHolders = 0;
    this.kolQueue = []; this.snipeQueue = [];
    this.lastTradeT = 0; this.kothDone = false; this.ended = false; this.result = null;
    this._chatTimer = rand(1, 3); this._mood = 'launch';
    this.rugMethod = null; this.closedAt = null; this.graduated = false; this.dead = false; this.recentBuys = [];
  }

  // ---------- pricing ----------
  price() {
    if (this.phase === 'curve') return this.vSol / this.vTok;
    if (this.poolTok > 0 && this.poolSol > 0) return this.poolSol / this.poolTok;
    return 0;
  }
  mcapSol() { return this.price() * this.supply; }
  progress() { return this.phase === 'curve' ? (CURVE_TOK - this.curveTokLeft) / CURVE_TOK : 1; }
  liquiditySol() { return this.phase === 'curve' ? this.realSol : this.poolSol; }
  isLive() { return this.phase === 'curve' || this.phase === 'dex'; }
  devTokens() { return this.dev.main.tokens; }

  quoteSell(tokIn) {
    if (tokIn <= 0) return 0;
    if (this.phase === 'curve') {
      const k = this.vSol * this.vTok;
      return Math.min(this.vSol - k / (this.vTok + tokIn), this.realSol) * (1 - CURVE_FEE);
    }
    if (this.phase === 'dex' && this.poolTok > 0) {
      const k = this.poolSol * this.poolTok;
      return (this.poolSol - k / (this.poolTok + tokIn)) * (1 - DEX_FEE);
    }
    return 0;
  }
  quoteBuy(solIn) {
    if (this.phase === 'curve') {
      const net = solIn * (1 - CURVE_FEE), k = this.vSol * this.vTok;
      return Math.min(this.vTok - k / (this.vSol + net), this.curveTokLeft);
    }
    if (this.phase === 'dex') {
      const net = solIn * (1 - DEX_FEE), k = this.poolSol * this.poolTok;
      return this.poolTok - k / (this.poolSol + net);
    }
    return 0;
  }

  // ---------- core swaps ----------
  _buy(solIn) {
    if (solIn <= 0) return { tokens: 0, sol: 0 };
    if (this.phase === 'curve') {
      let net = solIn * (1 - CURVE_FEE);
      const k = this.vSol * this.vTok;
      let out = this.vTok - k / (this.vSol + net);
      if (out >= this.curveTokLeft) {
        out = this.curveTokLeft;
        net = k / (this.vTok - out) - this.vSol;
        solIn = net / (1 - CURVE_FEE);
      }
      this.vSol += net; this.vTok -= out; this.realSol += net; this.curveTokLeft -= out;
      this.volume += solIn;
      if (this.curveTokLeft <= 1) this._graduate();
      return { tokens: out, sol: solIn };
    }
    if (this.phase === 'dex') {
      const net = solIn * (1 - DEX_FEE);
      const k = this.poolSol * this.poolTok;
      const out = this.poolTok - k / (this.poolSol + net);
      this.poolSol += net; this.poolTok -= out;
      this.volume += solIn;
      return { tokens: out, sol: solIn };
    }
    return { tokens: 0, sol: 0 };
  }
  _sell(tokIn) {
    if (tokIn <= 0) return 0;
    if (this.phase === 'curve') {
      const k = this.vSol * this.vTok;
      const out = Math.min(this.vSol - k / (this.vTok + tokIn), this.realSol);
      this.vSol -= out; this.vTok += tokIn; this.realSol -= out; this.curveTokLeft += tokIn;
      this.volume += out;
      return out * (1 - CURVE_FEE);
    }
    if (this.phase === 'dex' && this.poolTok > 0) {
      const k = this.poolSol * this.poolTok;
      const out = this.poolSol - k / (this.poolTok + tokIn);
      this.poolSol -= out; this.poolTok += tokIn;
      this.volume += out;
      return out * (1 - DEX_FEE);
    }
    return 0;
  }

  _graduate() {
    this.phase = 'dex'; this.graduated = true;
    this.poolSol = Math.max(1, this.realSol - MIGRATION_FEE);
    this.poolTok = LP_TOK;
    this.realSol = 0;
    this.lp = 'burned';
    this.attnImp += 1.1;
    this._event('graduated', `$${this.ticker} graduated! ${fmtSOL(this.poolSol)} SOL + ${fmtNum(LP_TOK)} tokens seeded a DEX pool. LP tokens burned.`);
    this._burstChat('grad', 4);
  }

  // ---------- bookkeeping ----------
  _event(type, text, data = {}) { this.events.push({ type, text, t: this.t, ...data }); }
  _trade(side, sol, tokens, who) {
    const mc = this.mcapSol();
    this.trades.push({ t: this.t, side, sol, tokens, who: who.handle || shortAddr(who.addr || fakeAddr()), type: who.type || '', via: who.via || '', dev: !!who.dev, mcap: mc });
    if (this.trades.length > 80) this.trades.splice(0, this.trades.length - 80);
    this.recentVol.push([this.t, sol]);
    if (!who.dev) this.creatorFees += sol * CREATOR_FEE;
    if (side === 'buy' && !who.dev) this.recentBuys.push([this.t, sol]);
    this.lastTradeT = this.t;
    this._mark(mc, sol);
  }
  _mark(mc, vol = 0) {
    const ci = Math.floor(this.t / CANDLE_SEC);
    let c = this.candles[this.candles.length - 1];
    if (!c || c.i !== ci) {
      const o = c ? c.c : mc;
      // fill gaps so the chart has a continuous time axis
      if (c) for (let i = c.i + 1; i < ci; i++) this.candles.push({ i, o: c.c, h: c.c, l: c.c, c: c.c, v: 0 });
      c = { i: ci, o, h: Math.max(o, mc), l: Math.min(o, mc), c: mc, v: 0 };
      this.candles.push(c);
      if (this.candles.length > 400) this.candles.splice(0, this.candles.length - 400);
    }
    c.c = mc; c.h = Math.max(c.h, mc); c.l = Math.min(c.l, mc); c.v += vol;
    if (mc > this.athMcap) this.athMcap = mc;
  }
  _say(who, text, kind = 'holder') {
    this.chat.push({ t: this.t, who, text, kind });
    if (this.chat.length > 120) this.chat.splice(0, this.chat.length - 120);
  }
  _burstChat(mood, n, extra) {
    for (let i = 0; i < n; i++) {
      const txt = chatFill(pick(CHAT[mood]), this, extra);
      setTimeoutSim(this, rand(0.2, 4), () => this._say(pick(HANDLES), txt));
    }
  }

  _newHolder(type, r, extra = {}) {
    const cfg = TT[type];
    const h = {
      addr: fakeAddr(), handle: chance(0.55) ? pick(HANDLES) : null, type,
      tokens: r.tokens, cost: r.sol, proceeds: 0, avg: r.sol / r.tokens,
      tp: rand(cfg.tp[0], cfg.tp[1]), sl: rand(cfg.sl[0], cfg.sl[1]),
      hold: rand(cfg.hold[0], cfg.hold[1]), paper: cfg.paper, born: this.t, failed: false, ...extra,
    };
    this.holders.push(h);
    return h;
  }
  _spawnBuyer(type, sol, extra) {
    if (!this.isLive()) return null;
    const r = this._buy(sol);
    if (r.tokens <= 0) return null;
    const h = this._newHolder(type, r, extra);
    this._trade('buy', r.sol, r.tokens, h);
    if (type === 'whale') this._event('whale', `🐋 Whale bought ${fmtSOL(r.sol)} SOL of $${this.ticker}`);
    return h;
  }
  _holderSell(h, frac) {
    const tk = h.tokens * frac;
    const sol = this._sell(tk);
    h.tokens -= tk; h.proceeds += sol;
    this._trade('sell', sol, tk, h);
    if (h.tokens < 1) {
      h.tokens = 0;
      const pnl = h.proceeds - h.cost;
      this.exited.count++;
      if (pnl < 0) { this.exited.lossCount++; this.exited.lossSol -= pnl; } else this.exited.gainSol += pnl;
    }
  }

  // ---------- RugRadar ----------
  risk() {
    const flags = [];
    let s = 0;
    const add = (pts, level, label, detail) => { s += pts; flags.push({ level, label, detail }); };
    add(0, 'ok', 'Mint authority', 'Revoked: nobody can print more tokens.');
    if (this.phase === 'curve') add(0, 'ok', 'Liquidity', 'On bonding curve. LP will be burned automatically at graduation.');
    else if (this.lp === 'burned') add(0, 'ok', 'Liquidity: BURNED', 'LP tokens were sent to a burn address. Liquidity can never be pulled.');
    else if (this.lp === 'locked') {
      const left = this.lockUntil - this.t;
      add(left < 120 ? 18 : 8, left < 120 ? 'warn' : 'warn', `Liquidity: LOCKED (${fmtDur(left)} left)`, 'LP tokens are in a time-lock. When it expires the dev can pull everything. Short locks are a red flag.');
    } else if (this.phase === 'dex') add(34, 'bad', 'Liquidity: NOT LOCKED', 'The dev holds the LP tokens and can remove all liquidity at any moment (a "hard rug").');
    const devPct = this.dev.main.tokens / this.supply;
    if (devPct > 0.1) add(18, 'bad', `Dev holds ${fmtPct(devPct, false)}`, 'A big dev bag can be dumped on buyers.');
    else if (devPct > 0.04) add(9, 'warn', `Dev holds ${fmtPct(devPct, false)}`, 'Moderate dev holdings.');
    else add(0, 'ok', `Dev holds ${fmtPct(devPct, false)}`, 'Small or no dev bag.');
    const top = this.top10Pct();
    if (top > 0.4) add(14, 'bad', `Top 10 holders: ${fmtPct(top, false)}`, 'Supply is concentrated. A few wallets can crash the price.');
    else if (top > 0.25) add(7, 'warn', `Top 10 holders: ${fmtPct(top, false)}`, 'Somewhat concentrated supply.');
    else add(0, 'ok', `Top 10 holders: ${fmtPct(top, false)}`, 'Healthy distribution.');
    if (this.dev.soldAny) add(16, 'bad', `Dev sold ${fmtPct(Math.min(1, this.dev.soldFrac), false)} of bag`, 'The creator wallet is selling.');
    if (this.devHistory > 0) add(Math.min(36, 12 * this.devHistory), 'bad', `Dev wallet linked to ${this.devHistory} previous rug${this.devHistory > 1 ? 's' : ''}`, 'On-chain history never forgets.');
    if (this.t < 60 && this.isLive()) add(4, 'warn', 'Brand new token', 'Launched less than a minute ago.');
    return { score: clamp(Math.round(s), 0, 100), flags };
  }
  top10Pct() {
    const bags = this.holders.map((h) => h.tokens);
    bags.push(this.dev.main.tokens);
    bags.sort((a, b) => b - a);
    let s = 0; for (let i = 0; i < 10 && i < bags.length; i++) s += bags[i];
    return s / this.supply;
  }
  holderCount() {
    let n = 0; for (const h of this.holders) if (h.tokens > 0) n++;
    if (this.dev.main.tokens > 0) n++;
    return n;
  }

  // ---------- tick ----------
  tick(dt, env) {
    if (this.ended) return;
    this.t += dt;
    runSimTimers(this);
    const price0 = this.price();

    // price history (1s samples) for momentum
    this._phTimer -= dt;
    if (this._phTimer <= 0) {
      this._phTimer = 1; this.priceHist.push(price0);
      if (this.priceHist.length > 90) this.priceHist.shift();
      this._mark(this.mcapSol(), 0);
      const cut = this.t - 30;
      while (this.recentVol.length && this.recentVol[0][0] < cut) this.recentVol.shift();
      while (this.recentBuys.length && this.recentBuys[0][0] < cut) this.recentBuys.shift();
      const bh = this.holderCount(); if (bh > this.peakHolders) this.peakHolders = bh;
    }

    // lock expiry
    if (this.lp === 'locked' && this.t >= this.lockUntil) {
      this.lp = 'dev'; this.panic = Math.min(1, this.panic + 0.35);
      this._event('unlock', `LP lock on $${this.ticker} expired. You control the liquidity again.`);
      this._burstChat('unlock', 3);
    }
    if (!this.isLive()) return;

    // snipers
    while (this.snipeQueue.length && this.snipeQueue[0].at <= this.t) {
      const s = this.snipeQueue.shift();
      const h = this._spawnBuyer('sniper', s.sol);
      if (h && chance(0.6)) { h.hold = rand(2, 9); h.tp = rand(1.05, 1.35); }
    }
    // KOL pipeline
    for (const k of this.kolQueue) {
      if (k.stage === 0 && this.t >= k.buyAt) {
        k.stage = 1;
        this._spawnBuyer('kol', k.kol.bag, { handle: null, kolName: k.kol.handle });
      }
      if (k.stage === 1 && this.t >= k.postAt) {
        k.stage = 2;
        const reach = k.kol.reach * (0.75 + 0.5 * this.memeScore) * env.sentiment;
        this.attnImp += reach * 0.55; this.kolBoost += reach;
        this._event('kol', `${k.kol.handle} posted about $${this.ticker} to ${fmtNum(k.kol.followers)} followers.`);
        this._burstChat('kol', 4, { k: k.kol.handle });
      }
    }
    this.kolQueue = this.kolQueue.filter((k) => k.stage < 2);

    // attention dynamics
    this.attnImp *= Math.exp(-dt / 55);
    this.panic *= Math.exp(-dt / 16);
    this.kolBoost *= Math.exp(-dt / 22);
    this.chirpBoost *= Math.exp(-dt / 26);
    this.chirpSize = 1 + (this.chirpSize - 1) * Math.exp(-dt / 60);
    const vol30 = this.recentVol.reduce((a, v) => a + v[1], 0);
    const buy30 = this.recentBuys.reduce((a, v) => a + v[1], 0);
    const novelty = Math.exp(-this.t / 210);
    this.attnTrend = 0.32 * Math.tanh(buy30 / 70) * this.memeScore * novelty;
    if (chance(dt * Math.max(0, this.memeScore - 0.85) * 0.006 * env.sentiment)) {
      this.attnImp += rand(0.5, 1.2);
      this._event('viral', `$${this.ticker} is going viral on Chirp! Organic buyers incoming.`);
      this._burstChat('pump', 3);
    }
    if (!this.kothDone && this.phase === 'curve' && this.progress() >= 0.5) {
      this.kothDone = true; this.attnImp += 0.45;
      this._event('koth', `$${this.ticker} hit King of the Hill on PumpBin (50% of curve). Front page visibility!`);
    }

    // momentum / FOMO
    const ph = this.priceHist;
    const p20 = ph.length > 20 ? ph[ph.length - 21] : ph[0] || price0;
    const mom = price0 / Math.max(1e-18, p20);
    const fomo = clamp(1 + 0.8 * (mom - 1), 0.35, 1.9);
    const risk = this.risk().score;
    const mcNow = this.mcapSol();
    const ddF = 0.3 + 0.7 * Math.sqrt(clamp(mcNow / Math.max(1e-9, this.athMcap), 0, 1));
    let base = (this.attnImp + this.attnTrend + 0.02 * novelty) * env.sentiment * fomo * ddF * (1 - 0.85 * this.panic);
    if (this.dead) base = this.attnImp > 0.3 ? base : 0;
    const liqF = clamp(this.liquiditySol() / 80, 0.15, 2.5);

    for (const type of ['degen', 'smart', 'whale', 'diamond']) {
      const cfg = TT[type];
      const trust = clamp(1 - (risk / 100) * cfg.smart * 1.5, 0.03, 1);
      let lambda = base * cfg.w * trust * 1.25;
      if (type === 'whale') lambda *= liqF;
      const n = poisson(lambda * dt);
      for (let i = 0; i < n; i++) this._spawnBuyer(type, logRand(cfg.buy[0], cfg.buy[1]) * env.sizeMult);
    }
    if (this.kolBoost > 0.02) {
      const n = poisson(this.kolBoost * 2.0 * dt * (1 - 0.7 * this.panic));
      for (let i = 0; i < n; i++) this._spawnBuyer('follower', logRand(TT.follower.buy[0], TT.follower.buy[1]) * env.sizeMult);
    }
    // buyers arriving from your own Chirp posts
    if (this.chirpBoost > 0.02) {
      const n = poisson(this.chirpBoost * 1.9 * dt * (1 - 0.7 * this.panic) * env.sentiment);
      for (let i = 0; i < n; i++) if (this._spawnBuyer('chirp', logRand(TT.chirp.buy[0], TT.chirp.buy[1]) * env.sizeMult * this.chirpSize, { via: 'chirp' })) this.chirpBuys++;
    }
    // the occasional dip-buyer among existing holders
    if (this.panic < 0.3 && mom < 0.9 && chance(dt * 0.6 * base)) {
      const h = pick(this.holders);
      if (h && h.tokens > 0 && h.type !== 'sniper' && h.type !== 'kol') {
        const r = this._buy(logRand(0.05, 0.8) * env.sizeMult);
        if (r.tokens > 0) { h.avg = (h.cost + r.sol) / (h.tokens + r.tokens); h.tokens += r.tokens; h.cost += r.sol; this._trade('buy', r.sol, r.tokens, h); }
      }
    }

    // holder exits
    const price = this.price();
    for (const h of this.holders) {
      if (h.tokens <= 0) continue;
      const ratio = price / h.avg;
      let rate = 1 / h.hold;
      if (ratio >= h.tp) rate += 0.5;
      if (ratio <= h.sl) rate += 0.35;
      rate += this.panic * h.paper * 0.9;
      if (Math.random() < rate * dt) {
        const frac = ratio >= h.tp ? rand(0.4, 1) : (ratio <= h.sl || this.panic > 0.5 ? 1 : rand(0.5, 1));
        this._holderSell(h, frac);
        if (!this.isLive()) break;
      }
    }
    if (this.holders.length > 500) this.holders = this.holders.filter((h) => h.tokens > 0);

    // moods + chat
    const p5 = ph.length > 5 ? ph[ph.length - 6] : price0;
    const m5 = price / Math.max(1e-18, p5);
    this._mood = this.t < 25 ? 'launch' : this.panic > 0.45 ? 'devsold' : m5 > 1.08 ? 'pump' : m5 < 0.93 ? 'dip' : (this.t - this.lastTradeT > 25 ? 'dead' : 'calm');
    this._chatTimer -= dt;
    if (this._chatTimer <= 0) {
      const activity = clamp(base, 0.05, 3);
      this._chatTimer = rand(1.2, 4) / activity;
      if (this._mood !== 'devsold') this._say(pick(HANDLES), chatFill(pick(CHAT[this._mood]), this));
    }

    // death
    if (!this.dead && this.t > 90 && this.t - this.lastTradeT > 40 && this.attnImp < 0.08) {
      this.dead = true;
      this._event('dead', `$${this.ticker} died. No buyers left. Most coins end like this. You can still sell or pull, or shill hard to revive it.`);
      this._burstChat('dead', 2);
    } else if (this.dead && this.attnImp > 0.3) {
      this.dead = false; this.lastTradeT = this.t;
      this._event('revive', `$${this.ticker} is getting attention again.`);
    }
  }

  // ---------- dev actions ----------
  devSell(frac) {
    if (!this.isLive()) return 0;
    const main = this.dev.main;
    const tk = main.tokens * frac;
    if (tk <= 0) return 0;
    let sol = this._sell(tk);
    main.tokens -= tk;
    this._trade('sell', sol, tk, { handle: 'DEV', dev: true });
    sol = Math.max(0, sol - DEV_TX_FEE);
    this.devProceeds += sol;
    const f = tk / Math.max(1, main.start);
    this.dev.soldAny = true; this.dev.soldFrac += f;
    this.panic = Math.min(1, this.panic + 0.22 + f * 0.75);
    this._event('devsold', `Your dev wallet sold ${fmtNum(tk)} $${this.ticker} for ${fmtSOL(sol)} SOL. Everyone saw it.`);
    this._burstChat('devsold', 3 + Math.round(f * 4));
    this.rugMethod = this.rugMethod || 'devdump';
    return sol;
  }
  canPull() { return this.phase === 'dex' && this.type === 'custom' && this.lp === 'dev'; }
  pullLiquidity() {
    if (!this.canPull()) return 0;
    const sol = this.poolSol;
    this.poolSol = 0; this.poolTok = 0;
    this.devProceeds += sol;
    this.phase = 'rugged'; this.rugMethod = 'lp';
    this._mark(0, 0);
    this.trades.push({ t: this.t, side: 'sell', sol, tokens: 0, who: 'DEV', dev: true, mcap: 0, lp: true });
    this._event('rugged', `You pulled ${fmtSOL(sol)} SOL of liquidity from $${this.ticker}. The chart is a vertical line down.`);
    this._event('extract', null, { sol, method: 'lp' });
    this._burstChat('rug', 8);
    return sol;
  }
  lockLP(sec) {
    if (this.lp !== 'dev' || this.phase !== 'dex') return false;
    this.lp = 'locked'; this.lockUntil = this.t + sec; this.attnImp += 0.2;
    this._event('lock', `LP locked for ${fmtDur(sec)}. Buyers feel safer. When it expires you can pull.`);
    return true;
  }
  burnLP() {
    if (this.lp !== 'dev' || this.phase !== 'dex') return false;
    this.lp = 'burned'; this.attnImp += 0.35;
    this._event('burn', 'LP burned. Nobody can pull the liquidity now — including you.');
    return true;
  }
  // A Chirp post about the coin: a burst of buyers who saw it, plus lingering attention.
  shill(power, size = 1) {
    const eff = power * Math.pow(0.8, this.shills);
    this.chirpSize = Math.max(this.chirpSize, size);
    this.shills++;
    this.attnImp += eff * 0.55;
    this.chirpBoost += eff;
    if (this.dead && eff > 0.3) this.attnImp += 0.3;
    return eff;
  }
  // Bad press: a sleuth thread, getting ratioed, a "taking profits" post.
  fud(power, text) {
    this.panic = Math.min(1, this.panic + power);
    this.attnImp *= 1 - Math.min(0.6, power * 0.5);
    if (text) this._event('fud', text);
    this._burstChat('dip', 2 + Math.round(power * 4));
  }
  telePost(kind) {
    // posting in the community chat to steer the mood
    if (kind === 'calm') { this.panic *= 0.55; this._say('DEV', pick(['relax guys, just a shakeout 🫡', 'not selling, building', 'jeets out, we good']), 'dev'); }
    if (kind === 'hype') { this.attnImp += 0.12; this._say('DEV', pick(['WE ARE GOING TO 10M', 'raid time, everyone to Chirp 🚀', 'who is ready for dex?']), 'dev'); }
  }
  queueKol(kol) {
    const buyAt = this.t + rand(3, 8);
    this.kolQueue.push({ kol, stage: 0, buyAt, postAt: buyAt + rand(4, 9) });
  }

  // ---------- end of life ----------
  close(solUsd) {
    if (this.ended) return this.result;
    this.ended = true; this.closedAt = this.t;
    const pNow = this.price();
    let victims = this.exited.lossCount, loss = this.exited.lossSol;
    for (const h of this.holders) {
      if (h.tokens <= 0) continue;
      const l = h.cost - h.proceeds - h.tokens * pNow;
      if (l > 0.005) { victims++; loss += l; }
    }
    const devLeft = this.devTokens() > 0 && this.isLive() ? this.quoteSell(this.devTokens()) : 0;
    this.result = {
      id: this.id, name: this.name, ticker: this.ticker, kind: this.kind, hue: this.hue, type: this.type,
      peakMcapUsd: this.athMcap * solUsd, devCost: this.devCost, devProceeds: this.devProceeds,
      profit: this.devProceeds - this.devCost, unsold: devLeft,
      victims, victimLossSol: loss, method: this.rugMethod || (this.dead ? 'died' : 'abandoned'),
      graduated: this.graduated,
      life: this.t, volume: this.volume, holders: this.peakHolders, fees: this.creatorFees,
    };
    return this.result;
  }
}

// lightweight per-coin timers that run on sim time (so pausing works)
function setTimeoutSim(coin, sec, fn) { (coin._timers || (coin._timers = [])).push({ at: coin.t + sec, fn }); }
function runSimTimers(coin) {
  if (!coin._timers || !coin._timers.length) return;
  const due = coin._timers.filter((x) => x.at <= coin.t);
  if (!due.length) return;
  coin._timers = coin._timers.filter((x) => x.at > coin.t);
  for (const d of due) d.fn();
}

// ---------- launch helpers ----------
function launchPumpCoin(o, env) {
  const c = new Coin({ ...o, type: 'pump' });
  c.devCost += PUMP_LAUNCH_FEE;
  if (o.devBuy > 0) {
    const r = c._buy(o.devBuy);
    c.dev.main.tokens = r.tokens; c.dev.main.start = r.tokens; c.dev.main.cost = r.sol; c.devCost += r.sol;
    c._trade('buy', r.sol, r.tokens, { handle: 'DEV', dev: true });
  }
  c.attnImp = 0.11 * c.memeScore * c.metaMult;
  queueSnipers(c, env);
  c._event('launch', `$${c.ticker} is live on PumpBin. Bonding curve open. Snipers are watching.`);
  c._burstChat('launch', 3);
  return c;
}

function launchCustomCoin(o, env) {
  const c = new Coin({ ...o, type: 'custom' });
  c.phase = 'dex';
  c.poolSol = o.lpSol; c.poolTok = SUPPLY * o.lpPct; c.lpSeed = o.lpSol;
  c.dev.main.tokens = SUPPLY * (1 - o.lpPct); c.dev.main.start = c.dev.main.tokens;
  c.lp = o.lp || 'dev';
  if (c.lp === 'locked') c.lockUntil = o.lockSec || 180;
  c.devCost += CUSTOM_DEPLOY_FEE + o.lpSol;
  c.attnImp = 0.26 * c.memeScore * c.metaMult + Math.min(0.5, o.lpSol / 80);
  queueSnipers(c, env);
  c._mark(c.mcapSol(), 0);
  c._event('launch', `$${c.ticker} deployed. Pool seeded with ${fmtSOL(o.lpSol)} SOL. You hold the keys.`);
  c._burstChat('launch', 3);
  return c;
}

// Sniper bots buy in the first seconds. Most are flippers: they dump within
// seconds, usually before a human dev can react.
function queueSnipers(c, env) {
  const n = Math.round(randi(0, 4) * (c.antiSnipe ? 0.25 : 1) * (env.sentiment ?? 1) * clamp(c.memeScore, 0.7, 1.2));
  for (let i = 0; i < n; i++) c.snipeQueue.push({ at: rand(0.3, 3.5), sol: logRand(TT.sniper.buy[0], TT.sniper.buy[1]) });
  c.snipeQueue.sort((a, b) => a.at - b.at);
}

// how "good" a meme is: hidden roll from the name, nudged by ticker shape
function memeScoreFor(name, ticker, kind, meta) {
  const r = mulberry32(hashStr(name.toLowerCase() + '|' + ticker.toUpperCase() + '|' + kind))();
  let s = 0.7 + r * 0.6;
  const tl = ticker.length;
  if (tl >= 3 && tl <= 5) s += 0.06;
  if (tl > 7) s -= 0.08;
  const lower = name.toLowerCase();
  const kw = { FROGS: ['frog', 'ribbit', 'toad'], DOGS: ['dog', 'inu', 'doge', 'pup', 'wif'], CATS: ['cat', 'kitty', 'meow', 'cat'], 'AI AGENTS': ['ai', 'gpt', 'agent', 'bot'], SPACE: ['moon', 'mars', 'rocket', 'space'], FOOD: ['burger', 'banana', 'pizza', 'taco'], GIGACHAD: ['chad', 'giga', 'sigma'], ANIMALS: ['frog', 'dog', 'cat', 'penguin', 'pengu'] };
  if ((kw[meta] || []).some((k) => lower.includes(k))) s += 0.12;
  return clamp(s, 0.6, 1.45);
}

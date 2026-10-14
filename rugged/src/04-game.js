// ============================================================
// GAME — state, economy, reputation, Chirp, shop, saving
//
// Two ways to make money:
//  - Run a real coin: creator fees (a cut of every trade) + modest
//    profit-taking. Holders who make money follow you.
//  - Rug it: dump your whole bag or pull liquidity for a bigger payout.
//    Bagholders unfollow you, your credibility drops, and RugRadar
//    shows your rug history on every future launch.
// ============================================================
const SAVE_KEY = 'rugged.save.v2';
const SIM_DT = 0.1;

const ITEMS = [
  { id: 'drinks', name: 'VOLT 6-pack', price: 18, cat: 'Supplies', consumable: true, desc: 'Six energy drinks for the fridge. Each one restores 35 energy.' },
  { id: 'rug', name: 'An actual rug', price: 90, cat: 'Basement', desc: 'Ties the room together.' },
  { id: 'posters', name: 'Poster pack', price: 60, cat: 'Basement', desc: 'Frog, chart, Lambo and WAGMI posters for the walls.' },
  { id: 'ledStrip', name: 'LED strip', price: 75, cat: 'Basement', desc: 'Purple glow over the desk. +5% post reach (vibes matter).' },
  { id: 'lavaLamp', name: 'Lava lamp', price: 55, cat: 'Basement', desc: 'Pure focus. Cosmetic.' },
  { id: 'monitor2', name: 'Second monitor', price: 650, cat: 'Setup', desc: 'Run 2 coins at the same time.' },
  { id: 'ringLight', name: 'Ring light + mic', price: 480, cat: 'Setup', desc: 'Your posts look legit. +30% post reach.' },
  { id: 'gamingChair', name: 'Gaming chair', price: 420, cat: 'Setup', desc: 'Your back says thanks. +20 max energy.' },
  { id: 'neon', name: 'RUGGED neon sign', price: 750, cat: 'Basement', desc: 'Every empire needs a logo. Cosmetic.' },
  { id: 'burner', name: 'Second phone', price: 900, cat: 'Contacts', desc: 'Unlocks tier-2 KOLs (bigger influencers).' },
  { id: 'monitor3', name: 'Third monitor', price: 1400, cat: 'Setup', desc: 'Run 3 coins at once.', req: 'monitor2' },
  { id: 'bed', name: 'Real bed', price: 1200, cat: 'Basement', desc: 'Off the floor finally. +30 max energy.' },
  { id: 'gamingPC', name: 'RGB gaming PC', price: 3200, cat: 'Setup', desc: 'Fast launch relay: far fewer sniper bots at launch.' },
  { id: 'couchTV', name: 'Couch + TV', price: 2600, cat: 'Basement', desc: 'A real velvet couch and a TV running crypto news.' },
  { id: 'miningRig', name: 'GPU mining rig', price: 6500, cat: 'Setup', desc: 'Earns 0.35 SOL every day. Loud.' },
  { id: 'kev', name: 'Hire Kev (coder)', price: 12000, cat: 'Crew', desc: 'Unlocks custom tokens: you seed and control the liquidity pool.' },
  { id: 'arcade', name: 'Arcade cabinet', price: 4500, cat: 'Basement', desc: 'RUG RUNNER. Cosmetic flex.' },
  { id: 'mo', name: 'Hire Mo (community manager)', price: 25000, cat: 'Crew', desc: '+25% followers from every post. Your Tele chats panic less.' },
  { id: 'rolodex', name: 'KOL rolodex', price: 40000, cat: 'Contacts', desc: 'Unlocks tier-3 mega influencers.', req: 'burner' },
  { id: 'serverRack', name: 'Analytics server', price: 60000, cat: 'Setup', desc: 'Shows each name\'s hidden virality score before you launch.' },
  { id: 'penthouse', name: 'Penthouse (move out)', price: 1000000, cat: 'Empire', desc: 'Leave the basement for good. Ends the game.' },
];
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

const KOLS = [
  { handle: '@smol_degen', followers: 12400, price: 0.6, reach: 0.45, bag: 0.4, scam: 0.18, tier: 1 },
  { handle: '@CryptoKingz', followers: 86000, price: 3.5, reach: 1.15, bag: 2.0, scam: 0.12, tier: 1 },
  { handle: '@moonmathmax', followers: 262000, price: 14, reach: 2.1, bag: 6, scam: 0.08, tier: 2 },
  { handle: '@0xAlphaWhale', followers: 540000, price: 30, reach: 3.0, bag: 12, scam: 0.06, tier: 2 },
  { handle: '@elonfan420', followers: 1250000, price: 70, reach: 4.4, bag: 25, scam: 0.05, tier: 3 },
];

const POST_TYPES = {
  shill:   { label: 'Shill post', needsCoin: true, stamina: 8, mult: 1.0, follow: 1.0, hint: 'Talk up your coin. Your followers see it and some buy.' },
  alpha:   { label: '"100x gem" call', needsCoin: true, stamina: 10, mult: 1.45, follow: 1.0, hint: 'Stronger push. If you rug a coin you called, people remember.' },
  meme:    { label: 'Meme', needsCoin: true, stamina: 6, mult: 1.0, follow: 1.6, variance: true, hint: 'High variance. Could flop, could go viral.' },
  thread:  { label: 'Roadmap thread 🧵', needsCoin: true, stamina: 16, mult: 0.85, follow: 1.2, linger: true, hint: 'Attention lingers longer.' },
  shitpost:{ label: 'Shitpost', needsCoin: false, stamina: 5, mult: 0, follow: 1.8, variance: true, hint: 'No coin. Grows followers.' },
  giveaway:{ label: 'SOL giveaway', needsCoin: false, stamina: 4, mult: 0, follow: 0, costSol: 0.1, hint: 'Costs 0.1 SOL. Guaranteed follower bump.' },
};

const SHITPOSTS = ['gm to everyone except people who sold the bottom', 'my therapist asked about my portfolio and now she\'s in the basement with me', 'bear market builders vs basement dwellers. same thing', 'if you\'re not up 100x you\'re basically poor', 'reminder: it\'s not gambling if you have a chart', 'mom asked what i do for work. i said "liquidity"', 'touching grass is a bearish signal', 'the real gains were the friends we made along the way'];
const SHILL_TEXT = ['${t} is the most undervalued thing on the chain right now. Not financial advice 🫡', 'just aped ${t}. chart is CLEAN. community is cooking 🔥', 'if you missed the last 100x, ${t} is your second chance', '${t} community is the best on the timeline 🚀', '${t}. that\'s it. that\'s the tweet.'];
const ALPHA_TEXT = ['🚨 100x GEM ALERT 🚨 ${t} — early, low cap, insane community. Do not fade.', 'I don\'t call many. Calling ${t}. Mark this tweet.', '${t} is going to 10M. I\'ve never been more sure.'];
const THREAD_TEXT = ['🧵 Why ${t} is different (1/9): community first, memes second, lambos third...', '🧵 ${t} roadmap: Q1 merch, Q2 mobile game, Q3 Lambo. Let\'s go.'];
const MEME_TEXT = ['[image: ${t} mascot photoshopped on the moon]', '[image: wojak crying because he sold ${t}]', '[image: ${t} chart but it\'s a staircase to heaven]'];

let S = null;            // game state
let LIVE = [];           // live Coin objects
let FOCUS = null;        // focused coin id
const BUS = new EventTarget();
const emit = (type, detail = {}) => BUS.dispatchEvent(new CustomEvent(type, { detail }));

function newGameState() {
  return {
    v: 2, day: 1, clock: 3 * 60 + 7,
    sol: 0.3, cash: 25,
    stamina: 100,
    followers: 40, cred: 1.0, handle: 'basementdev',
    drinks: 2,
    owned: {},
    history: [],
    stats: { launched: 0, rugs: 0, legit: 0, graduated: 0, extractedSol: 0, feesSol: 0, victims: 0, victimLossSol: 0, bestRug: 0, peakMcap: 0, tweets: 0, cashedOut: 0 },
    solPrice: 150, sentiment: 1, meta: pick(METAS),
    objective: 0, flags: {}, posts: [], feed: [],
    log: [], ended: null,
  };
}

const maxCoins = () => 1 + (S.owned.monitor2 ? 1 : 0) + (S.owned.monitor3 ? 1 : 0);
const staminaMax = () => 100 + (S.owned.gamingChair ? 20 : 0) + (S.owned.bed ? 30 : 0);
const usd = (sol) => sol * S.solPrice;
const netWorth = () => S.cash + usd(S.sol) + LIVE.reduce((a, c) => a + usd(c.quoteSell(c.devTokens()) + c.creatorFees - c.feesClaimed), 0);
const focusCoin = () => LIVE.find((c) => c.id === FOCUS) || LIVE[0] || null;
function logTx(text) { S.log.unshift({ day: S.day, text }); if (S.log.length > 40) S.log.length = 40; }

function shillPower() {
  let p = 0.06 + 0.3 * Math.pow(S.followers / 1000, 0.45);
  p *= S.cred;
  if (S.owned.ringLight) p *= 1.3;
  if (S.owned.ledStrip) p *= 1.05;
  return p;
}
const shillSize = () => 1 + Math.max(0, Math.log10(S.followers / 1000)) * 0.3;
const coinEnv = () => ({ sentiment: S.sentiment, sizeMult: 1 });

// ---------------- launches ----------------
function canLaunch() {
  if (LIVE.length >= maxCoins()) return `You can only run ${maxCoins()} coin${maxCoins() > 1 ? 's' : ''} at once. Buy another monitor.`;
  if (S.stamina < 12) return 'Too tired to launch. Grab an energy drink or sleep.';
  return null;
}
function launchCost(o) { return o.type === 'custom' ? CUSTOM_DEPLOY_FEE + o.lpSol : PUMP_LAUNCH_FEE + o.devBuy; }
function launchCoin(o) {
  const err = canLaunch(); if (err) return err;
  const custom = o.type === 'custom';
  if (custom && !S.owned.kev) return 'Hire Kev to deploy custom tokens.';
  if (!o.name || !o.ticker) return 'Give it a name and a ticker.';
  const cost = launchCost(o);
  if (cost > S.sol + 1e-9) return `Not enough SOL. Need ${fmtSOL(cost)} SOL.`;
  S.sol -= cost;
  S.stamina -= 12;
  const memeScore = memeScoreFor(o.name, o.ticker, o.kind, S.meta);
  const base = {
    name: o.name.slice(0, 24), ticker: o.ticker.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8), kind: o.kind,
    hue: o.hue ?? randi(0, 359), memeScore, metaMult: metaMultiplier(o.kind, S.meta), devHistory: S.stats.rugs, antiSnipe: !!S.owned.gamingPC,
  };
  const c = custom
    ? launchCustomCoin({ ...base, lpSol: o.lpSol, lpPct: o.lpPct, lp: o.lp, lockSec: o.lockSec }, coinEnv())
    : launchPumpCoin({ ...base, devBuy: o.devBuy }, coinEnv());
  c.devCost = cost;
  c.tweetedAt = null; c.tweetMcap = 0; c.calledAlpha = false; c.extraCosts = 0; c.calledPaid = false; c.rugged = false;
  LIVE.push(c); FOCUS = c.id;
  S.stats.launched++;
  logTx(`Launched $${c.ticker} (${custom ? 'custom token' : 'PumpBin'}) for ${fmtSOL(cost)} SOL.`);
  emit('launch', { coin: c });
  advanceObjective(1);
  return null;
}

// ---------------- dev actions ----------------
function devSell(c, frac) {
  const sol = c.devSell(frac);
  S.sol += sol;
  if (sol > 0) {
    emit('sold', { coin: c, sol });
    advanceObjective(3);
    // dumping most of the bag on your holders is a rug
    if (!c.rugged && c.dev.soldFrac >= 0.5) markRug(c, 'devdump');
  }
  return sol;
}
function pullLP(c) {
  const sol = c.pullLiquidity();
  S.sol += sol;
  if (sol > 0) { emit('rug', { coin: c, sol, method: 'lp' }); if (!c.rugged) markRug(c, 'lp'); }
  return sol;
}
function claimFees(c) {
  const f = c.creatorFees - c.feesClaimed;
  if (f < 0.0005) return 'No creator fees to claim yet.';
  c.feesClaimed += f; c.devProceeds += f; S.sol += f; S.stats.feesSol += f;
  logTx(`Claimed ${fmtSOL(f)} SOL in creator fees from $${c.ticker}.`);
  emit('fees', { coin: c, sol: f });
  advanceObjective(3);
  return null;
}

// Reputation hit: bagholders unfollow, credibility drops. Rug history shows on RugRadar.
function markRug(c, method) {
  c.rugged = true;
  S.stats.rugs++;
  let holders = 0, bag = 0;
  for (const h of c.holders) if (h.tokens > 0) { holders++; bag += h.cost - h.proceeds; }
  const severity = (method === 'lp' ? 1.6 : 1) * (c.calledAlpha ? 1.5 : 1) * (c.tweetedAt != null ? 1.3 : 0.7);
  const lost = Math.round(Math.min(S.followers * 0.35, (holders * 1.5 + S.followers * 0.04) * severity));
  S.followers = Math.max(10, S.followers - lost);
  S.cred = clamp(S.cred - 0.06 * severity, 0.3, 1.25);
  pushFeed({ who: 'Chirp', text: `$${c.ticker} holders are calling you out. -${lost.toLocaleString()} followers. Credibility ${Math.round(S.cred * 100)}%.`, kind: 'bad' });
  emit('rugged', { coin: c, lost, method });
}

// ---------------- closing a coin ----------------
function closeCoin(c) {
  if (c.creatorFees - c.feesClaimed > 0.0005) claimFees(c);
  const r = c.close(S.solPrice);
  r.profit = c.devProceeds - c.devCost - c.extraCosts;
  r.rugged = c.rugged;
  LIVE = LIVE.filter((x) => x !== c);
  if (FOCUS === c.id) FOCUS = LIVE[0]?.id ?? null;
  S.stats.extractedSol += c.devProceeds;
  S.stats.peakMcap = Math.max(S.stats.peakMcap, r.peakMcapUsd);
  if (c.graduated) { S.stats.graduated++; advanceObjective(7); }
  if (c.rugged) {
    S.stats.victims += r.victims; S.stats.victimLossSol += r.victimLossSol;
    S.stats.bestRug = Math.max(S.stats.bestRug, usd(r.profit));
  } else if (c.t > 120 && c.peakHolders >= 15) {
    // a coin you didn't rug: holders who did well become followers
    S.stats.legit++;
    const winners = c.holders.filter((h) => h.proceeds + h.tokens * c.price() > h.cost).length + Math.max(0, c.exited.count - c.exited.lossCount);
    const g = Math.round(winners * 0.6 + S.followers * 0.02 * (c.graduated ? 3 : 1));
    S.followers += g; S.cred = Math.min(1.25, S.cred + (c.graduated ? 0.06 : 0.02));
    pushFeed({ who: 'Chirp', text: `$${c.ticker} holders respect a dev who didn't rug. +${g} followers.`, kind: 'good' });
  }
  r.day = S.day;
  S.history.unshift(r); if (S.history.length > 60) S.history.length = 60;
  logTx(`Closed $${c.ticker}: ${r.profit >= 0 ? '+' : ''}${fmtSOL(r.profit)} SOL${c.rugged ? ' (rugged)' : ''}.`);
  emit('closed', { coin: c, result: r });
  return r;
}

// ---------------- Chirp ----------------
function pushFeed(p) { S.feed.unshift({ t: Date.now(), ...p }); if (S.feed.length > 40) S.feed.length = 40; emit('feed'); }
function postChirp(type, coin) {
  const pt = POST_TYPES[type];
  if (!pt) return 'Unknown post type.';
  if (pt.needsCoin && (!coin || !coin.isLive())) return 'Pick a live coin to post about.';
  if (S.stamina < pt.stamina) return 'Too tired to post. Energy drink?';
  if (pt.costSol && S.sol < pt.costSol) return 'Not enough SOL for the giveaway.';
  S.stamina -= pt.stamina;
  if (pt.costSol) S.sol -= pt.costSol;
  let q = logRand(0.55, 1.6);
  if (pt.variance) q = chance(0.5) ? logRand(0.25, 0.9) : logRand(0.9, 2.6);
  const viral = chance(0.025 + Math.max(0, q - 1.4) * 0.08);
  const viralMult = viral ? rand(4, 14) : 1;
  // small accounts get some algorithmic reach; follow-through is higher when you're new
  const impressions = Math.round((S.followers * rand(0.2, 0.65) + rand(40, 140)) * Math.max(0.3, q) * viralMult * (pt.mult || 1));
  const likes = Math.round(impressions * rand(0.012, 0.045));
  const followRate = 0.004 + 0.026 / (1 + S.followers / 500);
  let gain = Math.max(pt.follow > 0 ? 1 : 0, Math.round(impressions * followRate * rand(0.6, 1.4) * pt.follow * (S.owned.mo ? 1.25 : 1)));
  if (type === 'giveaway') gain = Math.round(20 + S.followers * rand(0.04, 0.08));
  const ratioed = !viral && q < 0.5 && chance(0.35);
  if (ratioed) gain = -Math.round(S.followers * rand(0.005, 0.02));
  S.followers = Math.max(10, S.followers + gain);
  S.stats.tweets++;
  const tick = coin ? '$' + coin.ticker : '';
  const tpl = { shill: SHILL_TEXT, alpha: ALPHA_TEXT, thread: THREAD_TEXT, meme: MEME_TEXT, shitpost: SHITPOSTS, giveaway: ['🎁 0.1 SOL GIVEAWAY 🎁 follow + RT + drop your wallet. 24h.'] }[type];
  const text = pick(tpl).replace('${t}', tick);
  let effect = 0;
  if (coin && pt.needsCoin) {
    effect = shillPower() * pt.mult * q * (viral ? Math.min(4, viralMult * 0.5) : 1);
    if (ratioed) coin.fud(0.15, `Your $${coin.ticker} post got ratioed. Holders are spooked.`);
    else coin.shill(effect, shillSize());
    if (pt.linger) coin.attnImp += effect * 0.4;
    if (type === 'alpha') coin.calledAlpha = true;
    if (coin.tweetedAt == null) { coin.tweetedAt = coin.t; coin.tweetMcap = coin.mcapSol(); }
    advanceObjective(2);
  }
  const post = { id: Date.now() + Math.random(), type, text, coin: coin?.ticker || null, impressions, likes, reposts: Math.round(likes * rand(0.1, 0.35)), replies: Math.round(likes * rand(0.05, 0.25)), gain, viral, ratioed, age: 0, quality: q, effect };
  S.posts.unshift(post); if (S.posts.length > 30) S.posts.length = 30;
  emit('posted', { post, coin });
  return null;
}

function hireKol(coin, kol) {
  if (!coin || !coin.isLive()) return 'Pick a live coin.';
  if (kol.tier === 2 && !S.owned.burner) return 'Tier-2 KOLs only answer your second phone.';
  if (kol.tier === 3 && !S.owned.rolodex) return 'You need the KOL rolodex for mega influencers.';
  if (S.sol < kol.price) return `Not enough SOL. ${kol.handle} wants ${fmtSOL(kol.price)} SOL.`;
  S.sol -= kol.price;
  coin.extraCosts += kol.price;
  if (chance(kol.scam)) {
    pushFeed({ who: kol.handle, text: `${kol.handle} took your ${fmtSOL(kol.price)} SOL and blocked you.`, kind: 'bad' });
    return null;
  }
  coin.queueKol(kol);
  pushFeed({ who: kol.handle, text: `Paid ${kol.handle} ${fmtSOL(kol.price)} SOL. They'll post about $${coin.ticker} soon (and buy first).`, kind: 'info' });
  return null;
}

// ---------------- wallet ----------------
function cashOut(sol) {
  sol = Math.min(sol, S.sol);
  if (sol <= 0.0001) return 'Nothing to cash out.';
  const cashGot = usd(sol) * 0.985;
  S.sol -= sol; S.cash += cashGot; S.stats.cashedOut += cashGot;
  logTx(`Cashed out ${fmtSOL(sol)} SOL → ${fmtUSD(cashGot)}.`);
  emit('cashout', { cash: cashGot });
  advanceObjective(4);
  return null;
}
function buySol(usdAmt) {
  usdAmt = Math.min(usdAmt, S.cash);
  if (usdAmt < 1) return 'Not enough cash.';
  const sol = (usdAmt * 0.98) / S.solPrice;
  S.cash -= usdAmt; S.sol += sol;
  logTx(`Bought ${fmtSOL(sol)} SOL with ${fmtUSD(usdAmt)} (2% fee).`);
  return null;
}
function buyItem(id) {
  const it = ITEM[id];
  if (!it) return 'Unknown item.';
  if (!it.consumable && S.owned[id]) return 'Already owned.';
  if (it.req && !S.owned[it.req]) return `Requires ${ITEM[it.req].name}.`;
  if (S.cash < it.price) return `You need ${fmtUSD(it.price)} in cash. Cash out SOL in the Wallet app.`;
  S.cash -= it.price;
  if (id === 'drinks') S.drinks += 6;
  else S.owned[id] = true;
  if (id === 'kev') { S.owned.kevDesk = true; advanceObjective(8); }
  logTx(`Bought ${it.name} for ${fmtUSD(it.price)}.`);
  emit('bought', { item: it });
  advanceObjective(5);
  if (id === 'penthouse') { S.ended = 'moveout'; emit('ending', { kind: 'moveout' }); }
  return null;
}
function drink() {
  if (S.drinks <= 0) return 'Fridge is empty. Order a 6-pack from the Shop.';
  S.drinks--; S.stamina = Math.min(staminaMax(), S.stamina + 35);
  emit('drink');
  return null;
}

// ---------------- day cycle ----------------
function sleep() {
  if (LIVE.length) return 'You still have live coins. Close them first (Terminal → Close coin).';
  const rep = { day: S.day, lines: [] };
  S.day++;
  S.stamina = staminaMax();
  const c0 = S.cred;
  S.cred = Math.min(1.1, S.cred + 0.03);
  if (S.cred > c0) rep.lines.push(['Credibility', `${Math.round(c0 * 100)}% → ${Math.round(S.cred * 100)}% (people forget slowly)`]);
  if (S.owned.miningRig) { S.sol += 0.35; rep.lines.push(['Mining rig', '+0.35 SOL']); }
  if (S.day % 3 === 0) {
    const rent = S.cash > 20000 ? 500 : S.cash > 2000 ? 120 : 40;
    S.cash -= rent;
    rep.lines.push(['Mom', `"Grocery money." -${fmtUSD(rent)}`]);
  }
  const s0 = S.solPrice;
  S.solPrice = clamp(S.solPrice * Math.exp(gauss() * 0.06 + (150 - S.solPrice) / 1500), 70, 400);
  rep.lines.push(['SOL price', `${fmtUSD(s0)} → ${fmtUSD(S.solPrice)}`]);
  S.sentiment = clamp(0.55 + Math.random() * 0.95, 0.5, 1.5);
  rep.lines.push(['Degen mood', S.sentiment > 1.15 ? 'EUPHORIC: everyone is aping' : S.sentiment < 0.8 ? 'Bearish: nobody is buying' : 'Normal']);
  S.meta = pick(METAS.filter((m) => m !== S.meta));
  rep.lines.push(['New meta', `${S.meta} coins are trending today`]);
  S.clock = 13 * 60 + randi(0, 50);
  emit('slept', rep);
  return rep;
}

// ---------------- objectives ----------------
const OBJECTIVES = [
  'Sit down at your PC (desk, north wall)',
  'Launch your first coin on PumpBin',
  'Post about your coin on Chirp',
  'Take profit or claim creator fees (Terminal)',
  'Cash out SOL to dollars (Wallet app)',
  'Buy something from the Shop',
  'Grow your Chirp account to 1,000 followers',
  'Get a coin to graduate to the DEX',
  'Save $12,000 and hire Kev (Shop → Crew)',
  'Reach $100,000 net worth',
  'Move out: buy the Penthouse ($1,000,000)',
];
function advanceObjective(i) {
  if (S.objective === i) { S.objective++; emit('objective'); }
}
function checkObjectives() {
  if (S.objective === 6 && S.followers >= 1000) advanceObjective(6);
  if (S.objective === 7 && LIVE.some((c) => c.graduated)) advanceObjective(7);
  if (S.objective === 9 && netWorth() >= 100000) advanceObjective(9);
}

// ---------------- tick ----------------
let simAcc = 0;
function gameTick(dt) {
  if (!S || S.ended) return;
  simAcc += dt;
  const env = coinEnv();
  while (simAcc >= SIM_DT) {
    simAcc -= SIM_DT;
    for (const c of LIVE) {
      if (c.ended) continue;
      c.tick(SIM_DT, env);
      if (c.tweetedAt != null && !c.calledPaid && c.mcapSol() > c.tweetMcap * 3) {
        c.calledPaid = true;
        const g = Math.round(S.followers * 0.05 + 30);
        S.followers += g; S.cred = Math.min(1.25, S.cred + 0.03);
        pushFeed({ who: 'Chirp', text: `You called $${c.ticker} before a 3x. +${g} followers.`, kind: 'good' });
      }
    }
  }
  for (const c of LIVE) while (c.events.length) emit('coinevent', { coin: c, ev: c.events.shift() });
  for (const p of S.posts) if (p.age < 30) p.age += dt;
  S.clock += dt;
  if (S.clock >= 24 * 60) S.clock -= 24 * 60;
  checkObjectives();
}

// ---------------- save / load ----------------
function serializeCoin(c) {
  const o = {};
  for (const k of Object.keys(c)) if (k !== '_timers') o[k] = c[k];
  return o;
}
function saveGame() {
  if (!S) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ S, LIVE: LIVE.map(serializeCoin), FOCUS, seq: COIN_SEQ })); } catch (e) { /* storage unavailable */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d?.S || d.S.v !== 2) return false;
    S = Object.assign(newGameState(), d.S);
    LIVE = (d.LIVE || []).map((o) => Object.assign(Object.create(Coin.prototype), o));
    FOCUS = d.FOCUS; COIN_SEQ = Math.max(COIN_SEQ, d.seq || 1);
    return true;
  } catch (e) { return false; }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
function newGame() { S = newGameState(); LIVE = []; FOCUS = null; }

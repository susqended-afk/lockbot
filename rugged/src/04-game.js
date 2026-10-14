// ============================================================
// GAME — state, economy, reputation, Chirp, the Trenches, shop, saving
//
// Ways to make money:
//  - Run a real coin: creator fees (a cut of every trade) + modest
//    profit-taking. Holders who make money follow you.
//  - Rug it: dump your whole bag or pull liquidity for a bigger payout.
//    Bagholders unfollow you and your rug count follows every launch.
//  - Trade the Trenches: ape into other devs' coins. Some of them rug you.
// ============================================================
const SAVE_KEY = 'rugged.save.v3';
const SIM_DT = 0.1;

const ITEMS = [
  // supplies
  { id: 'drinks', name: 'VOLT 6-pack', price: 18, cat: 'Supplies', consumable: true, icon: 'can', desc: 'Six energy drinks for the fridge. Each restores 35 energy.' },
  { id: 'pizza', name: 'Large pizza', price: 30, cat: 'Supplies', consumable: true, icon: 'pizza', desc: 'Delivered to the basement door. +60 energy right now.' },
  // decor (moves with you)
  { id: 'rug', name: 'An actual rug', price: 90, cat: 'Decor', icon: 'rug', desc: 'Ties the room together.' },
  { id: 'posters', name: 'Poster pack', price: 60, cat: 'Decor', icon: 'poster', desc: 'Frog, chart, Lambo and WAGMI posters.' },
  { id: 'ledStrip', name: 'LED strip', price: 75, cat: 'Decor', icon: 'bulb', desc: 'Purple glow over the desk. +5% post reach.' },
  { id: 'lavaLamp', name: 'Lava lamp', price: 55, cat: 'Decor', icon: 'lamp', desc: 'Pure focus. Cosmetic.' },
  { id: 'neon', name: 'RUGGED neon sign', price: 750, cat: 'Decor', icon: 'sign', desc: 'Every empire needs a logo.' },
  { id: 'aquarium', name: 'Reef aquarium', price: 2200, cat: 'Decor', icon: 'fish', desc: 'Calming. +10 max energy.' },
  { id: 'couchTV', name: 'Couch + TV', price: 2600, cat: 'Decor', icon: 'tv', desc: 'Velvet couch and a TV running crypto news.' },
  { id: 'arcade', name: 'Arcade cabinet', price: 4500, cat: 'Decor', icon: 'joystick', desc: 'RUG RUNNER. Cosmetic.' },
  { id: 'vending', name: 'Vending machine', price: 6000, cat: 'Decor', icon: 'vend', desc: 'Unlimited free energy drinks. The fridge is retired.' },
  // setup
  { id: 'mechKeyboard', name: 'RGB mechanical keyboard', price: 220, cat: 'Setup', icon: 'keyboard', desc: 'Posts cost 2 less energy.' },
  { id: 'gamingChair', name: 'Gaming chair', price: 420, cat: 'Setup', icon: 'chair', desc: '+20 max energy.' },
  { id: 'ringLight', name: 'Ring light + mic', price: 480, cat: 'Setup', icon: 'ring', desc: '+30% post reach.' },
  { id: 'monitor2', name: 'Second monitor', price: 650, cat: 'Setup', icon: 'monitor', desc: 'Run 2 coins at once.' },
  { id: 'espresso', name: 'Espresso machine', price: 900, cat: 'Setup', icon: 'coffee', desc: 'Drinks restore 50 energy instead of 35.' },
  { id: 'bed', name: 'Real bed', price: 1200, cat: 'Setup', icon: 'bed', desc: '+30 max energy.' },
  { id: 'monitor3', name: 'Third monitor', price: 1400, cat: 'Setup', icon: 'monitor', desc: 'Run 3 coins at once.', req: 'monitor2' },
  { id: 'gamingPC', name: 'RGB gaming PC', price: 3200, cat: 'Setup', icon: 'cpu', desc: 'Fast launch relay: far fewer sniper bots on your launches.' },
  { id: 'miningRig', name: 'GPU mining rig', price: 6500, cat: 'Setup', icon: 'gpu', desc: 'Earns 0.35 SOL every day.' },
  { id: 'stream', name: 'Streaming setup', price: 7500, cat: 'Setup', icon: 'camera', desc: 'Go live once per coin: a huge burst of attention.' },
  { id: 'sniper', name: 'Sniper bot', price: 9000, cat: 'Setup', icon: 'target', desc: 'Auto-buys new Trenches launches in the first block. Some will be rugs.' },
  { id: 'serverRack', name: 'Analytics server', price: 60000, cat: 'Setup', icon: 'server', desc: 'Reveals virality before launch and each Trenches dev\'s type.' },
  { id: 'coldWallet', name: 'Hardware wallet', price: 400, cat: 'Setup', icon: 'shield', desc: 'Every signature needs a button press. Phishing links can\'t drain you.' },
  // crew & contacts
  { id: 'burner', name: 'Second phone', price: 900, cat: 'Crew', icon: 'phone', desc: 'Unlocks tier-2 KOLs.' },
  { id: 'kev', name: 'Hire Kev (coder)', price: 12000, cat: 'Crew', icon: 'code', desc: 'Custom tokens: you seed and control the liquidity pool.' },
  { id: 'mo', name: 'Hire Mo (community)', price: 25000, cat: 'Crew', icon: 'users', desc: '+25% followers from posts. Your chats panic less.' },
  { id: 'rolodex', name: 'KOL rolodex', price: 40000, cat: 'Crew', icon: 'book', desc: 'Unlocks tier-3 mega influencers.', req: 'burner' },
  { id: 'zoe', name: 'Hire Zoe (clip editor)', price: 60000, cat: 'Crew', icon: 'camera', desc: '+15% post reach. Posts clips overnight: +3% followers every morning.', req: 'hypehouse' },
  { id: 'dex', name: 'Hire Dex (analyst)', price: 90000, cat: 'Crew', icon: 'chart', desc: 'Forecasts tomorrow\'s market cycle and meta. Your sniper bot skips known ruggers.', req: 'hypehouse' },
  // mom
  { id: 'momCar', name: 'Pay off Mom\'s car', price: 15000, cat: 'Mom', icon: 'car', desc: 'No more grocery money. Mom is suspicious but grateful.' },
  { id: 'momKitchen', name: 'Mom\'s kitchen remodel', price: 40000, cat: 'Mom', icon: 'chef', desc: 'She sends food down: +40 bonus energy every morning.' },
  { id: 'momHouse', name: 'Beach house for Mom', price: 500000, cat: 'Mom', icon: 'home', desc: 'She moves to Florida. She still calls every day.' },
  // flex
  { id: 'chain', name: 'Gold chain', price: 12000, cat: 'Flex', icon: 'chain', desc: 'Displayed in a glass case. +3% post reach.' },
  { id: 'rolex', name: 'Gold watch', price: 25000, cat: 'Flex', icon: 'watch', desc: 'In the case next to the chain. +3% post reach.' },
  { id: 'statue', name: 'Diamond hands statue', price: 50000, cat: 'Flex', icon: 'diamond', desc: '+10% credibility, permanently.' },
  { id: 'toilet', name: 'Golden toilet', price: 75000, cat: 'Flex', icon: 'crown', desc: 'In the corner. Content. +5% followers per post.' },
  { id: 'lambo', name: 'Lamborghini', price: 300000, cat: 'Flex', icon: 'car', desc: 'Parked on Mom\'s lawn. +10% post reach. Mom is furious.' },
  // real estate: each one is a new place to live (and a new chapter)
  { id: 'apartment', name: 'Studio apartment', price: 25000, cat: 'Real estate', icon: 'home', follows: 1000, desc: 'Move out of Mom\'s basement. +1 coin slot, +20 max energy, +10% reach. Rent $150 a day.' },
  { id: 'hypehouse', name: 'The Hype House', price: 250000, cat: 'Real estate', icon: 'users', follows: 10000, req: 'apartment', desc: 'Pool, glass wall, desks for the crew. +1 coin slot, +25% followers per post. Rent $1,500 a day.' },
  { id: 'penthouse', name: 'The Penthouse', price: 1000000, cat: 'Real estate', icon: 'building', follows: 50000, req: 'hypehouse', desc: 'Forty floors up. +20% reach, +30 max energy. Rent $5,000 a day. Starts the final chapter.' },
];
const HOMES = { basement: { rent: 0 }, apartment: { rent: 150 }, hypehouse: { rent: 1500 }, penthouse: { rent: 5000 } };
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

const KOLS = [
  { handle: '@smol_degen', followers: 12400, price: 0.6, reach: 0.45, bag: 0.4, scam: 0.18, tier: 1 },
  { handle: '@CryptoKingz', followers: 86000, price: 3.5, reach: 1.15, bag: 2.0, scam: 0.12, tier: 1 },
  { handle: '@moonmathmax', followers: 262000, price: 14, reach: 2.1, bag: 6, scam: 0.08, tier: 2 },
  { handle: '@0xAlphaWhale', followers: 540000, price: 30, reach: 3.0, bag: 12, scam: 0.06, tier: 2 },
  { handle: '@elonfan420', followers: 1250000, price: 70, reach: 4.4, bag: 25, scam: 0.05, tier: 3 },
];

const POST_TYPES = {
  shill:   { label: 'Shill', needsCoin: true, stamina: 8, mult: 1.0, follow: 1.0, hint: 'Talk up your coin. Your followers see it and some buy.' },
  alpha:   { label: '100x call', needsCoin: true, stamina: 10, mult: 1.45, follow: 1.0, hint: 'Stronger push. Rugging a coin you called costs extra followers.' },
  meme:    { label: 'Meme', needsCoin: true, stamina: 6, mult: 1.0, follow: 1.6, variance: true, hint: 'High variance. Could flop, could go viral.' },
  thread:  { label: 'Thread', needsCoin: true, stamina: 16, mult: 0.85, follow: 1.2, linger: true, hint: 'Attention lingers longer.' },
  shitpost:{ label: 'Shitpost', needsCoin: false, stamina: 5, mult: 0, follow: 1.8, variance: true, hint: 'No coin. Grows followers.' },
  giveaway:{ label: 'Giveaway', needsCoin: false, stamina: 4, mult: 0, follow: 0, costSol: 0.1, hint: 'Costs 0.1 SOL. Guaranteed follower bump.' },
};

const SHITPOSTS = ['gm to everyone except people who sold the bottom', 'my therapist asked about my portfolio and now she\'s in the basement with me', 'bear market builders vs basement dwellers. same thing', 'if you\'re not up 100x you\'re basically poor', 'reminder: it\'s not gambling if you have a chart', 'mom asked what i do for work. i said "liquidity"', 'touching grass is a bearish signal', 'the real gains were the friends we made along the way'];
const SHILL_TEXT = ['${t} is the most undervalued thing on the chain right now. Not financial advice 🫡', 'just aped ${t}. chart is CLEAN. community is cooking 🔥', 'if you missed the last 100x, ${t} is your second chance', '${t} community is the best on the timeline 🚀', '${t}. that\'s it. that\'s the tweet.'];
const ALPHA_TEXT = ['🚨 100x GEM ALERT 🚨 ${t}: early, low cap, insane community. Do not fade.', 'I don\'t call many. Calling ${t}. Mark this tweet.', '${t} is going to 10M. I\'ve never been more sure.'];
const THREAD_TEXT = ['🧵 Why ${t} is different (1/9): community first, memes second, lambos third...', '🧵 ${t} roadmap: Q1 merch, Q2 mobile game, Q3 Lambo. Let\'s go.'];
const MEME_TEXT = ['[image: ${t} mascot photoshopped on the moon]', '[image: wojak crying because he sold ${t}]', '[image: ${t} chart but it\'s a staircase to heaven]'];

let S = null;            // game state
let LIVE = [];           // your coins
let ECO = [];            // other devs' coins (the Trenches)
let FOCUS = null;        // focused coin id (yours or the Trenches)
const BUS = new EventTarget();
const emit = (type, detail = {}) => BUS.dispatchEvent(new CustomEvent(type, { detail }));

function newGameState() {
  return {
    v: 3, day: 1, clock: 3 * 60 + 7,
    sol: 0.3, cash: 25,
    stamina: 100,
    followers: 40, cred: 1.0, handle: 'basementdev',
    drinks: 2,
    owned: {},
    history: [],
    stats: { launched: 0, rugs: 0, legit: 0, graduated: 0, extractedSol: 0, feesSol: 0, victims: 0, victimLossSol: 0, bestRug: 0, peakMcap: 0, tweets: 0, cashedOut: 0, trades: 0, tradePnl: 0, gotRugged: 0, lives: 0, hackedSol: 0, listings: 0, summits: 0 },
    solPrice: 150, sentiment: 1, meta: pick(METAS),
    mode: 'story', loc: 'basement', chapter: 1, chapterDay: 1, done: {}, flags: {}, posts: [], feed: [], texts: [], unread: 0,
    cycle: { phase: 'normal', days: 0, forced: null }, rivals: {}, karma: { good: 0, bad: 0 }, story: {}, boosts: {},
    snipe: { on: false, sol: 0.1 },
    netHist: [], log: [], ended: null,
  };
}

const allCoins = () => LIVE.concat(ECO);
const isMine = (c) => !!c && LIVE.includes(c);
const maxCoins = () => 1 + (S.owned.monitor2 ? 1 : 0) + (S.owned.monitor3 ? 1 : 0) + (S.owned.apartment ? 1 : 0) + (S.owned.hypehouse ? 1 : 0);
const staminaMax = () => 100 + (S.owned.gamingChair ? 20 : 0) + (S.owned.bed ? 30 : 0) + (S.owned.aquarium ? 10 : 0) + (S.owned.apartment ? 20 : 0) + (S.owned.penthouse ? 30 : 0);
const usd = (sol) => sol * S.solPrice;
const positionValue = (c) => { const y = c.you(); return y && y.tokens > 0 ? c.quoteSell(y.tokens) : 0; };
const netWorth = () => S.cash + usd(S.sol) + LIVE.reduce((a, c) => a + usd(c.quoteSell(c.devTokens()) + c.creatorFees - c.feesClaimed), 0) + ECO.reduce((a, c) => a + usd(positionValue(c)), 0);
const focusCoin = () => allCoins().find((c) => c.id === FOCUS) || LIVE[0] || null;
function logTx(text) { S.log.unshift({ day: S.day, text }); if (S.log.length > 40) S.log.length = 40; }

function shillPower() {
  let p = 0.06 + 0.3 * Math.pow(S.followers / 1000, 0.45);
  p *= S.cred;
  const o = S.owned;
  p *= 1 + (o.ringLight ? 0.3 : 0) + (o.ledStrip ? 0.05 : 0) + (o.chain ? 0.03 : 0) + (o.rolex ? 0.03 : 0) + (o.lambo ? 0.1 : 0) + (o.apartment ? 0.1 : 0) + (o.penthouse ? 0.2 : 0) + (o.zoe ? 0.15 : 0);
  return p;
}
const shillSize = () => 1 + Math.max(0, Math.log10(S.followers / 1000)) * 0.3;
const coinEnv = () => ({ sentiment: S.sentiment * (S.story.celebLive ? 0.82 : 1), sizeMult: 1 });
const credCap = () => 1.25 + (S.owned.statue ? 0.1 : 0);

// ---------------- crew texts ----------------
const CHAD_TIPS = () => [
  S.followers < 300 ? `nobody buys from an account with ${S.followers} followers. shitpost more lol` : null,
  `everyone's on ${S.meta} coins today. ride the meta`,
  'coins that don\'t rug keep paying creator fees. just saying',
  'if a coin dies just close it and launch the next one. most coins die',
  'check the Trenches. other devs launching nonstop. some of them are rugs tho',
  'buy more of our own coin when it dips. volume brings eyes',
  S.sol < 0.05 && S.cash > 5 ? 'out of SOL? buy some in the Wallet app and run it back' : null,
  S.cred < 0.7 ? 'people don\'t trust us rn. maybe run a clean one for a bit' : null,
].filter(Boolean);
function text(from, msg) {
  S.texts.push({ from, text: msg, day: S.day, time: Math.floor(S.clock) });
  if (S.texts.length > 60) S.texts.splice(0, S.texts.length - 60);
  S.unread++;
  emit('text', { from, text: msg });
}

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
  Object.assign(c, { tweetedAt: null, tweetMcap: 0, calledAlpha: false, extraCosts: 0, calledPaid: false, rugged: false, wentLive: false, copycats: 0 });
  LIVE.push(c); FOCUS = c.id;
  S.stats.launched++;
  logTx(`Launched $${c.ticker} (${custom ? 'custom token' : 'PumpBin'}) for ${fmtSOL(cost)} SOL.`);
  emit('launch', { coin: c });
  if (S.stats.launched === 1) text('Chad', 'LETS GOOO. now post about it on Chirp or nobody will ever see it');
  objDone('launch');
  storyOnLaunch(c);
  return null;
}

// ---------------- dev actions on your coins ----------------
function devBuyMore(c, sol) {
  if (!isMine(c) || !c.isLive()) return 'That coin isn\'t live.';
  if (sol > S.sol) return 'Not enough SOL.';
  S.sol -= sol;
  const tk = c.devBuy(sol);
  if (!tk) { S.sol += sol; return 'Buy failed.'; }
  logTx(`Bought ${fmtSOL(sol)} SOL more of your own $${c.ticker}.`);
  return null;
}
function devSell(c, frac) {
  const sol = c.devSell(frac);
  S.sol += sol;
  if (sol > 0) {
    emit('sold', { coin: c, sol });
    objDone('profit');
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
  objDone('profit');
  return null;
}
function goLive(c) {
  if (!S.owned.stream) return 'Buy the streaming setup first.';
  if (!isMine(c) || !c.isLive()) return 'Pick one of your live coins.';
  if (c.wentLive) return 'You already streamed this coin.';
  if (S.stamina < 25) return 'Streaming takes 25 energy.';
  S.stamina -= 25; c.wentLive = true; S.stats.lives++;
  const viewers = Math.round(S.followers * rand(0.03, 0.09) + rand(5, 30));
  c.shill(shillPower() * 2.6, shillSize() * 1.15);
  c.attnImp += 0.4;
  const g = Math.round(viewers * rand(0.3, 0.6));
  S.followers += g;
  c._event('live', `You went live: ${viewers.toLocaleString()} viewers watched you pump $${c.ticker}. +${g} followers.`);
  return null;
}

function markRug(c, method) {
  c.rugged = true;
  S.stats.rugs++;
  let holders = 0;
  for (const h of c.holders) if (h.tokens > 0 && h.type !== 'you') holders++;
  const severity = (method === 'lp' ? 1.6 : 1) * (c.calledAlpha ? 1.5 : 1) * (c.tweetedAt != null ? 1.3 : 0.7);
  const lost = Math.round(Math.min(S.followers * 0.35, (holders * 1.5 + S.followers * 0.04) * severity));
  S.followers = Math.max(10, S.followers - lost);
  S.cred = clamp(S.cred - 0.06 * severity, 0.3, credCap());
  pushFeed({ who: 'Chirp', text: `$${c.ticker} holders are calling you out. -${lost.toLocaleString()} followers. Credibility ${Math.round(S.cred * 100)}%.`, kind: 'bad' });
  emit('rugged', { coin: c, lost, method });
  if (S.stats.rugs === 1) text('Chad', 'bro... the tele chat is NOT happy. we lost followers. money is money tho');
  storyOnRug(c, method);
}

function closeCoin(c) {
  if (c.creatorFees - c.feesClaimed > 0.0005) claimFees(c);
  const r = c.close(S.solPrice);
  r.profit = c.devProceeds - c.devCost - c.extraCosts;
  r.rugged = c.rugged;
  LIVE = LIVE.filter((x) => x !== c);
  if (FOCUS === c.id) FOCUS = LIVE[0]?.id ?? null;
  S.stats.extractedSol += c.devProceeds;
  S.stats.peakMcap = Math.max(S.stats.peakMcap, r.peakMcapUsd);
  if (c.graduated) S.stats.graduated++;
  if (c.rugged) {
    S.stats.victims += r.victims; S.stats.victimLossSol += r.victimLossSol;
    S.stats.bestRug = Math.max(S.stats.bestRug, usd(r.profit));
  } else if (c.t > 120 && c.peakHolders >= 15) {
    S.stats.legit++;
    const winners = c.holders.filter((h) => h.proceeds + h.tokens * c.price() > h.cost).length + Math.max(0, c.exited.count - c.exited.lossCount);
    const g = Math.round(winners * 0.6 + S.followers * 0.02 * (c.graduated ? 3 : 1));
    S.followers += g; S.cred = Math.min(credCap(), S.cred + (c.graduated ? 0.06 : 0.02));
    pushFeed({ who: 'Chirp', text: `$${c.ticker} holders respect a dev who didn't rug. +${g} followers.`, kind: 'good' });
    storyOnLegit(c);
  }
  r.day = S.day;
  S.history.unshift(r); if (S.history.length > 60) S.history.length = 60;
  logTx(`Closed $${c.ticker}: ${r.profit >= 0 ? '+' : ''}${fmtSOL(r.profit)} SOL${c.rugged ? ' (rugged)' : ''}.`);
  emit('closed', { coin: c, result: r });
  return r;
}

// ---------------- the Trenches: other devs' coins ----------------
const DEV_PROFILES = { honest: 'Builder', flipper: 'Flipper', rugger: 'Rugger' };
let ecoSpawnT = 4;
function npcName(kind) {
  const k = MEME_KINDS[kind];
  const [n, t] = pick(k.names);
  const v = randi(0, 4);
  if (v === 0) return [n, t];
  if (v === 1) return [`Baby ${n}`, ('B' + t).slice(0, 7)];
  if (v === 2) return [`${n} Classic`, (t + 'C').slice(0, 7)];
  if (v === 3) return [`Super ${n}`, ('S' + t).slice(0, 7)];
  return [`${n} 420`, (t.slice(0, 4) + '420')];
}
function spawnNpcCoin(o = {}) {
  const kinds = Object.keys(MEME_KINDS);
  const metaKinds = kinds.filter((k) => MEME_KINDS[k].meta === S.meta);
  const kind = o.kind || (metaKinds.length && chance(0.45) ? pick(metaKinds) : pick(kinds));
  const [name, ticker] = o.name ? [o.name, o.ticker] : npcName(kind);
  const r = Math.random();
  const profile = o.profile || (r < 0.45 ? 'honest' : r < 0.77 ? 'flipper' : 'rugger');
  const devBuy = profile === 'rugger' ? rand(1.2, 4) : profile === 'flipper' ? rand(0.4, 1.8) : rand(0.05, 0.8);
  const c = launchPumpCoin({ name, ticker, kind, hue: randi(0, 359), devBuy, memeScore: rand(0.7, 1.3), metaMult: metaMultiplier(kind, S.meta), devHistory: profile === 'rugger' ? randi(0, 4) : profile === 'flipper' ? randi(0, 1) : 0 }, coinEnv());
  c.npc = { profile, nextShill: rand(2, 12), plan: profile === 'rugger' ? rand(2.2, 6) : profile === 'flipper' ? rand(1.8, 3.2) : rand(4, 12), rugAt: rand(45, 200), step: 0 };
  c.attnImp += rand(0.05, 0.35) * S.sentiment;
  c.copycatOf = o.copycatOf || null;
  if (o.rival) c.rival = o.rival;
  if (o.celeb) c.celeb = o.celeb;
  ECO.push(c);
  if (S.owned.sniper && S.snipe.on && S.sol >= S.snipe.sol + 0.02 && !(S.owned.dex && profile === 'rugger')) {
    S.sol -= S.snipe.sol;
    c.traderBuy(S.snipe.sol);
    c.sniped = true; S.stats.trades++;
    logTx(`Sniper bot bought ${fmtSOL(S.snipe.sol)} SOL of $${c.ticker} in block 0.`);
    emit('sniped', { coin: c });
  }
  return c;
}
function npcDevTick(c) {
  const n = c.npc; if (!n || !c.isLive()) return;
  if (c.t >= n.nextShill && c.t < 170) { c.shill(rand(0.08, 0.5) * S.sentiment); n.nextShill = c.t + rand(14, 40); }
  const m = c.mcapSol() / 28;
  const youHold = (c.you()?.tokens || 0) > 0;
  if (n.profile === 'rugger' && n.step === 0 && (m >= n.plan || c.t >= n.rugAt)) {
    const before = youHold ? positionValue(c) : 0;
    n.step = 1; c.devSell(1);
    const after = youHold ? positionValue(c) : 0;
    if (youHold) { S.stats.gotRugged++; emit('gotrugged', { coin: c, lost: before - after }); if (S.stats.gotRugged === 1) text('Chad', 'rip lmao. always check RugRadar before you ape. dev bag + rug history = run'); }
  } else if (n.profile === 'flipper') {
    if (n.step === 0 && m >= n.plan) { n.step = 1; c.devSell(0.5); }
    else if (n.step === 1 && m >= n.plan * 1.6) { n.step = 2; c.devSell(1); }
  } else if (n.profile === 'honest' && n.step === 0 && m >= n.plan) { n.step = 1; c.devSell(0.12); }
}
function tradeBuy(c, sol) {
  if (!c || !c.isLive()) return 'That coin isn\'t trading.';
  if (isMine(c)) return devBuyMore(c, sol);
  if (sol > S.sol) return 'Not enough SOL.';
  S.sol -= sol;
  if (!c.traderBuy(sol)) { S.sol += sol; return 'Buy failed.'; }
  S.stats.trades++;
  logTx(`Bought ${fmtSOL(sol)} SOL of $${c.ticker}.`);
  return null;
}
function tradeSell(c, frac) {
  const y = c.you();
  if (!y || y.tokens <= 0) return 'You don\'t hold any.';
  const sol = c.traderSell(frac);
  if (sol <= 0) return c.isLive() ? 'Sell failed.' : 'No liquidity left. Those tokens are worth nothing.';
  S.sol += sol;
  const pnl = sol - (y.cost - (y.costBooked || 0)) * frac;
  y.costBooked = (y.costBooked || 0) + (y.cost - (y.costBooked || 0)) * frac;
  S.stats.tradePnl += pnl;
  logTx(`Sold ${Math.round(frac * 100)}% of $${c.ticker} for ${fmtSOL(sol)} SOL (${pnl >= 0 ? '+' : ''}${fmtSOL(pnl)}).`);
  if (pnl > 0) objDone('trade');
  return null;
}
function writeOff(c) {
  const y = c.you(); if (y) y.tokens = 0;
  ECO = ECO.filter((x) => x !== c);
  if (FOCUS === c.id) FOCUS = LIVE[0]?.id ?? null;
}
function ecoTick(dt) {
  ecoSpawnT -= dt;
  const liveEco = ECO.filter((c) => c.isLive() && !c.dead).length;
  if (ecoSpawnT <= 0) {
    ecoSpawnT = rand(16, 40) / clamp(S.sentiment, 0.6, 1.4);
    if (liveEco < 9) spawnNpcCoin();
  }
  // copycats of your pumping coins
  for (const c of LIVE) {
    if (!c.isLive() || c.copycats >= 2) continue;
    if (usd(c.mcapSol()) > 20000 && chance(dt / 45)) {
      c.copycats++;
      const nm = pick([`${c.name} 2.0`, `Real ${c.name}`, `${c.name} CTO`, `Baby ${c.name}`]);
      spawnNpcCoin({ kind: c.kind, name: nm.slice(0, 24), ticker: (c.ticker + (c.copycats + 1)).slice(0, 8), profile: chance(0.7) ? 'rugger' : 'flipper', copycatOf: c.ticker });
      c.attnImp *= 0.85;
      emit('copycat', { coin: c, name: nm });
      if (c.copycats === 1) text('Chad', `someone copied $${c.ticker} 💀 "${nm}". they're stealing our buyers`);
    }
  }
  // clear out dead coins you don't hold
  ECO = ECO.filter((c) => {
    const holding = (c.you()?.tokens || 0) > 0;
    if (holding || c.id === FOCUS) return true;
    return !((c.dead && c.t > 120) || !c.isLive() || c.t > 480);
  });
}

// ---------------- Chirp ----------------
function pushFeed(p) { S.feed.unshift({ t: Date.now(), ...p }); if (S.feed.length > 40) S.feed.length = 40; emit('feed'); }
function postChirp(type, coin) {
  const pt = POST_TYPES[type];
  if (!pt) return 'Unknown post type.';
  if (pt.needsCoin && (!coin || !coin.isLive())) return 'Pick a live coin to post about.';
  const cost = Math.max(2, pt.stamina - (S.owned.mechKeyboard ? 2 : 0));
  if (S.stamina < cost) return 'Too tired to post. Energy drink?';
  if (pt.costSol && S.sol < pt.costSol) return 'Not enough SOL for the giveaway.';
  S.stamina -= cost;
  if (pt.costSol) S.sol -= pt.costSol;
  let q = logRand(0.55, 1.6);
  if (pt.variance) q = chance(0.5) ? logRand(0.25, 0.9) : logRand(0.9, 2.6);
  const viral = chance(0.025 + Math.max(0, q - 1.4) * 0.08);
  const viralMult = viral ? rand(4, 14) : 1;
  const impressions = Math.round((S.followers * rand(0.2, 0.65) + rand(40, 140)) * Math.max(0.3, q) * viralMult * (pt.mult || 1));
  const likes = Math.round(impressions * rand(0.012, 0.045));
  const followRate = 0.004 + 0.026 / (1 + S.followers / 500);
  const boost = (S.owned.mo ? 1.25 : 1) * (S.owned.toilet ? 1.05 : 1) * (S.owned.hypehouse ? 1.25 : 1) * (S.boosts.mod ? 1.05 : 1) * cycleFollowMult();
  let gain = Math.max(pt.follow > 0 ? 1 : 0, Math.round(impressions * followRate * rand(0.6, 1.4) * pt.follow * boost));
  if (type === 'giveaway') gain = Math.round(20 + S.followers * rand(0.04, 0.08));
  const ratioed = !viral && q < 0.5 && chance(0.35);
  if (ratioed) gain = -Math.round(S.followers * rand(0.005, 0.02));
  S.followers = Math.max(10, S.followers + gain);
  S.stats.tweets++;
  const tick = coin ? '$' + coin.ticker : '';
  const tpl = { shill: SHILL_TEXT, alpha: ALPHA_TEXT, thread: THREAD_TEXT, meme: MEME_TEXT, shitpost: SHITPOSTS, giveaway: ['🎁 0.1 SOL GIVEAWAY 🎁 follow + RT + drop your wallet. 24h.'] }[type];
  const textOut = pick(tpl).replace('${t}', tick);
  let effect = 0;
  if (coin && pt.needsCoin) {
    effect = shillPower() * pt.mult * q * (viral ? Math.min(4, viralMult * 0.5) : 1);
    if (ratioed) coin.fud(0.15, `Your $${coin.ticker} post got ratioed. Holders are spooked.`);
    else coin.shill(effect, shillSize());
    if (pt.linger) coin.attnImp += effect * 0.4;
    if (type === 'alpha') coin.calledAlpha = true;
    if (coin.tweetedAt == null) { coin.tweetedAt = coin.t; coin.tweetMcap = coin.mcapSol(); }
    objDone('post');
  }
  const post = { id: Date.now() + Math.random(), type, text: textOut, coin: coin?.ticker || null, impressions, likes, reposts: Math.round(likes * rand(0.1, 0.35)), replies: Math.round(likes * rand(0.05, 0.25)), gain, viral, ratioed, age: 0, quality: q, effect };
  S.posts.unshift(post); if (S.posts.length > 30) S.posts.length = 30;
  emit('posted', { post, coin });
  return null;
}

function hireKol(coin, kol) {
  if (!coin || !coin.isLive() || !isMine(coin)) return 'Pick one of your live coins.';
  if (kol.tier === 2 && !S.owned.burner) return 'Tier-2 KOLs only answer your second phone.';
  if (kol.tier === 3 && !S.owned.rolodex) return 'You need the KOL rolodex for mega influencers.';
  if (S.sol < kol.price) return `Not enough SOL. ${kol.handle} wants ${fmtSOL(kol.price)} SOL.`;
  S.sol -= kol.price;
  coin.extraCosts += kol.price;
  if (chance(kol.scam)) { pushFeed({ who: kol.handle, text: `${kol.handle} took your ${fmtSOL(kol.price)} SOL and blocked you.`, kind: 'bad' }); return null; }
  coin.queueKol(kol);
  pushFeed({ who: kol.handle, text: `Paid ${kol.handle} ${fmtSOL(kol.price)} SOL. They'll post about $${coin.ticker} soon (and buy first).`, kind: 'info' });
  return null;
}

// ---------------- wallet & shop ----------------
function cashOut(sol) {
  sol = Math.min(sol, S.sol);
  if (sol <= 0.0001) return 'Nothing to cash out.';
  const cashGot = usd(sol) * 0.985;
  S.sol -= sol; S.cash += cashGot; S.stats.cashedOut += cashGot;
  logTx(`Cashed out ${fmtSOL(sol)} SOL → ${fmtUSD(cashGot)}.`);
  emit('cashout', { cash: cashGot });
  objDone('cashout');
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
  if (it.follows && S.followers < it.follows) return `The landlord wants to see ${fmtNum(it.follows)} followers first.`;
  if (S.cash < it.price) return `You need ${fmtUSD(it.price)} in cash. Cash out SOL in the Wallet app.`;
  if (HOMES[id] && LIVE.length) return 'Close your live coins before moving.';
  S.cash -= it.price;
  if (id === 'drinks') S.drinks += 6;
  else if (id === 'pizza') S.stamina = Math.min(staminaMax() + 40, S.stamina + 60);
  else S.owned[id] = true;
  if (id === 'kev') S.owned.kevDesk = true;
  if (ITEM[id].cat === 'Crew' && id !== 'burner' && id !== 'rolodex') objDone(id === 'zoe' || id === 'dex' ? 'crew' : id);
  if (id === 'statue') S.cred = Math.min(credCap(), S.cred + 0.1);
  if (id === 'lambo') setTimeout(() => text('Mom', 'WHY IS THERE A LAMBORGHINI ON MY LAWN'), 4000);
  if (id === 'momCar') setTimeout(() => text('Mom', 'The bank says my car is paid off?? What did you do. Love you.'), 3000);
  if (id === 'momHouse') setTimeout(() => text('Mom', 'Florida is wonderful. Are you eating vegetables?'), 3000);
  logTx(`Bought ${it.name} for ${fmtUSD(it.price)}.`);
  emit('bought', { item: it });
  objDone('buy');
  if (HOMES[id]) moveHome(id);
  return null;
}
function drink() {
  if (!S.owned.vending && S.drinks <= 0) return 'Fridge is empty. Order a 6-pack from the Shop.';
  if (!S.owned.vending) S.drinks--;
  const gain = S.owned.espresso ? 50 : 35;
  S.stamina = Math.min(staminaMax(), S.stamina + gain);
  emit('drink', { gain });
  return null;
}

// ---------------- day cycle ----------------
function sleep() {
  if (LIVE.length) return 'You still have live coins. Close them first (Terminal → Close coin).';
  const rep = { day: S.day, lines: [] };
  S.day++;
  S.stamina = staminaMax() + (S.owned.momKitchen ? 40 : 0);
  if (S.owned.momKitchen) rep.lines.push(['Mom', 'Sent down breakfast. +40 energy']);
  const c0 = S.cred;
  S.cred = Math.min(Math.max(c0, 1.1), S.cred + 0.03);
  if (S.cred > c0) rep.lines.push(['Credibility', `${Math.round(c0 * 100)}% → ${Math.round(S.cred * 100)}%`]);
  if (S.owned.miningRig) { S.sol += 0.35; rep.lines.push(['Mining rig', '+0.35 SOL']); }
  if (S.boosts.rested) { S.stamina += 30; delete S.boosts.rested; rep.lines.push(['Slept in', '+30 energy']); }
  if (S.owned.zoe) { const g = Math.round(S.followers * 0.03 + 20); S.followers += g; rep.lines.push(['Zoe\'s clips', `+${fmtNum(g)} followers overnight`]); }
  const rent = HOMES[S.loc]?.rent || 0;
  if (rent) { S.cash -= rent; rep.lines.push(['Rent', `-${fmtUSD(rent)}`]); if (S.cash < 0) rep.lines.push(['Landlord', 'You\'re behind on rent. Cash out some SOL.']); }
  if (S.loc === 'basement' && S.day % 3 === 0 && !S.owned.momCar && !S.owned.momHouse) {
    const rent = S.cash > 20000 ? 500 : S.cash > 2000 ? 120 : 40;
    S.cash -= rent;
    rep.lines.push(['Mom', `"Grocery money." -${fmtUSD(rent)}`]);
  }
  const cyc = rollCycle();
  const drift = S.cycle.phase === 'bull' ? 0.05 : S.cycle.phase === 'bear' ? -0.06 : 0;
  const s0 = S.solPrice;
  S.solPrice = clamp(S.solPrice * Math.exp(gauss() * 0.06 + drift + (150 - S.solPrice) / 1500), 60, 520);
  rep.lines.push(['SOL price', `${fmtUSD(s0)} → ${fmtUSD(S.solPrice)}`]);
  S.sentiment = S.cycle.phase === 'bull' ? rand(1.2, 1.6) : S.cycle.phase === 'bear' ? rand(0.45, 0.75) : clamp(0.55 + Math.random() * 0.95, 0.5, 1.5);
  if (cyc) rep.lines.push(['Market cycle', cyc]);
  rep.lines.push(['Market mood', S.cycle.phase === 'bull' ? 'Bull run: buyers everywhere' : S.cycle.phase === 'bear' ? 'Bear market: nobody is buying' : S.sentiment > 1.15 ? 'Euphoric: everyone is aping' : S.sentiment < 0.8 ? 'Bearish: nobody is buying' : 'Normal']);
  S.meta = S.story.nextMeta && S.story.nextMeta !== S.meta ? S.story.nextMeta : pick(METAS.filter((m) => m !== S.meta));
  rep.lines.push(['New meta', `${S.meta} are trending today`]);
  if (S.owned.dex) { S.story.nextMeta = pick(METAS.filter((m) => m !== S.meta)); rep.lines.push(['Dex\'s forecast', `${S.story.nextMeta} tomorrow. Cycle: ${forecastCycle()}`]); }
  S.clock = 13 * 60 + randi(0, 50);
  ECO = ECO.filter((c) => (c.you()?.tokens || 0) > 0);
  ecoSpawnT = 2;
  storyMorning(rep);
  emit('slept', rep);
  return rep;
}

// ---------------- objectives (per chapter, see story.js) ----------------
function objDone(key) {
  if (!S || S.done[key]) return;
  S.done[key] = true;
  const ch = CHAPTERS[S.chapter - 1];
  if (ch && ch.goals.some(([k]) => k === key)) emit('objective', { key });
}
function checkObjectives() {
  if (S.followers >= 1000) objDone('f1k');
  if (S.followers >= 10000) objDone('f10k');
  if (S.followers >= 50000) objDone('f50k');
  if (LIVE.some((c) => c.graduated) || S.stats.graduated > 0) objDone('graduate');
  if (S.chapter >= 3 && netWorth() >= 500000) objDone('nw500k');
}

// ---------------- tick ----------------
let simAcc = 0, chadT = 160, netT = 0;
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
        S.followers += g; S.cred = Math.min(credCap(), S.cred + 0.03);
        pushFeed({ who: 'Chirp', text: `You called $${c.ticker} before a 3x. +${g} followers.`, kind: 'good' });
      }
    }
    for (const c of ECO) { c.tick(SIM_DT, c.celeb ? { ...env, sentiment: S.sentiment * 1.3 } : env); npcDevTick(c); }
  }
  for (const c of LIVE) while (c.events.length) emit('coinevent', { coin: c, ev: c.events.shift(), mine: true });
  for (const c of ECO) {
    const holding = (c.you()?.tokens || 0) > 0;
    while (c.events.length) { const ev = c.events.shift(); if (holding || c.id === FOCUS) emit('coinevent', { coin: c, ev, mine: false }); }
  }
  ecoTick(dt);
  for (const p of S.posts) if (p.age < 30) p.age += dt;
  S.clock += dt;
  if (S.clock >= 24 * 60) S.clock -= 24 * 60;
  chadT -= dt;
  if (chadT <= 0) { chadT = rand(150, 260); text('Chad', pick(CHAD_TIPS())); }
  netT -= dt;
  if (netT <= 0) { netT = 5; S.netHist.push(Math.round(netWorth())); if (S.netHist.length > 120) S.netHist.shift(); }
  checkObjectives();
  storyTick(dt);
}

// ---------------- save / load ----------------
function serializeCoin(c) {
  const o = {};
  for (const k of Object.keys(c)) if (k !== '_timers') o[k] = c[k];
  return o;
}
function saveGame() {
  if (!S) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ S, LIVE: LIVE.map(serializeCoin), ECO: ECO.filter((c) => (c.you()?.tokens || 0) > 0).map(serializeCoin), FOCUS, seq: COIN_SEQ })); } catch (e) { /* storage unavailable */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d?.S || d.S.v !== 3) return false;
    S = Object.assign(newGameState(), d.S);
    if (!S.done) S.done = {};
    if (S.owned.penthouse && S.loc === 'basement') S.loc = 'penthouse';
    S.chapter = Math.max(S.chapter || 1, LOCS[S.loc]?.chapter || 1);
   
    const revive = (o) => Object.assign(Object.create(Coin.prototype), o);
    LIVE = (d.LIVE || []).map(revive);
    ECO = (d.ECO || []).map(revive);
    FOCUS = d.FOCUS; COIN_SEQ = Math.max(COIN_SEQ, d.seq || 1);
    return true;
  } catch (e) { return false; }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
function newGame(mode = 'story') {
  S = newGameState(); S.mode = mode; LIVE = []; ECO = []; FOCUS = null; ecoSpawnT = 4;
  for (let i = 0; i < 4; i++) { const c = spawnNpcCoin(); for (let k = 0; k < 200 + i * 300; k++) { c.tick(SIM_DT, coinEnv()); npcDevTick(c); } c.events.length = 0; }
  text('Chad', 'yo you up?? i found the play. MEMECOINS. get on the PC');
}

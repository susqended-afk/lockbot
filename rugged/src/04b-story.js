// ============================================================
// STORY — chapters, market cycles, rivals, events, endings
//
// Four chapters, one per place you live. Events queue up as
// choice cards; main.js shows them when you're free.
// Sandbox mode gets the same events on a looser schedule and
// no finale.
// ============================================================
const CHAPTERS = [
  { n: 1, loc: 'basement', title: "Mom's Basement", sub: '0.3 SOL and a dream', goals: [
    ['pc', 'Sit down at your PC'], ['launch', 'Launch your first coin on PumpBin'], ['post', 'Post about your coin on Chirp'],
    ['profit', 'Take profit or claim creator fees'], ['cashout', 'Cash out SOL to dollars (Wallet)'], ['buy', 'Buy something from the Shop'],
    ['trade', 'Make a profitable trade in the Trenches'], ['f1k', 'Grow your Chirp account to 1,000 followers'],
    ['apartment', 'Move out: rent the studio apartment (Shop → Real estate)'],
  ] },
  { n: 2, loc: 'apartment', title: 'The Apartment', sub: 'Your own front door', goals: [
    ['graduate', 'Get a coin to graduate to the DEX'], ['kev', 'Hire Kev (Shop → Crew)'], ['rival', 'Deal with @SolSamurai'],
    ['summit', 'Speak at the Degen Summit'], ['f10k', 'Reach 10,000 followers'], ['hypehouse', 'Move into the Hype House ($250,000)'],
  ] },
  { n: 3, loc: 'hypehouse', title: 'The Hype House', sub: 'Content never sleeps', goals: [
    ['crew', 'Hire Zoe or Dex (Shop → Crew)'], ['celeb', 'Survive a celebrity coin launch'], ['listing', 'Get a coin listed on MoonEx'],
    ['nw500k', 'Reach $500,000 net worth'], ['f50k', 'Reach 50,000 followers'], ['penthouse', 'Buy the Penthouse ($1,000,000)'],
  ] },
  { n: 4, loc: 'penthouse', title: 'The Penthouse', sub: 'Forty floors above Mom', goals: [
    ['lastcoin', 'Launch the Last Coin'], ['finale', 'Decide how it ends'],
  ] },
];
const chapterGoals = () => CHAPTERS[S.chapter - 1]?.goals || [];
function currentGoal() {
  const g = chapterGoals();
  const i = g.findIndex(([k]) => !S.done[k]);
  const doneCount = g.filter(([k]) => S.done[k]).length;
  return i < 0 ? { key: null, text: S.chapter < 4 ? `Chapter ${S.chapter} done. Keep growing.` : 'The end. Or is it?', idx: g.length, total: g.length, doneCount } : { key: g[i][0], text: g[i][1], idx: i, total: g.length, doneCount };
}

// ---------------- rivals ----------------
const RIVALS = {
  samurai: {
    handle: 'SolSamurai', name: 'Sol Samurai', profile: 'flipper', followers: 48000, bio: 'Hype dev. Big launches, bigger ego.', color: '#ff6a3d', kinds: ['shiba', 'dogwifhat', 'chad'],
    diss: ['mid', 'chart looks like my ex\'s credit score', 'basement energy', 'we did this exact coin last cycle. better.'],
    launch: ['🗡️ $T is live. Samurai-tier launch. Don\'t say I didn\'t warn you.', 'New blade: $T. Early is now.', '$T. If you fade this you\'re ngmi.'],
    posts: ['If your dev isn\'t posting at 4am is he even a dev', 'Another day, another 10x for the Samurai army', 'Bear markets are for people who sleep', 'Rate my setup: 6 monitors and zero regrets'],
  },
  flex: {
    handle: 'rugmaster_flex', name: 'Flex', profile: 'rugger', followers: 21000, bio: 'Serial rugger. Weirdly proud of it.', color: '#b26bff', kinds: ['frog', 'fart', 'monkey'],
    diss: ['ngmi', 'cute coin. would rug.', 'this dev is soft'],
    launch: ['$T live. Trust me bro 😈', 'Launching $T. Dev is definitely not selling. 😇', '$T. LP is safe. Probably.'],
    posts: ['If you got rugged you were exit liquidity, that\'s just science', 'Lambo #3 arrived. Thanks bagholders', 'LP is a state of mind', 'DYOR means read my tweets'],
  },
  ben: {
    handle: 'BuilderBen', name: 'Ben', profile: 'honest', followers: 90000, bio: 'Builds in public. Hates ruggers.', color: '#3ec5ff', kinds: ['penguin', 'robot', 'squirrel'],
    diss: ['Check the wallet history before you ape this one.', 'Not financial advice: this dev has rugged before.'],
    launch: ['Shipping $T today. LP burned, dev bag small, roadmap in thread 🧵', '$T is live. Building in public as always.'],
    posts: ['Reminder: burned LP and a small dev bag. Every time.', 'Thread: how to read a dev wallet in 30 seconds 🧵', 'Builders outlast cycles.', 'If a dev sells 50% in minute one, that is not a coin. That is a trap.'],
  },
};
function activateRival(k) {
  if (S.rivals[k]) return;
  S.rivals[k] = { feud: 0, t: rand(30, 90), fx: rand(80, 140) };
  const R = RIVALS[k];
  pushFeed({ who: '@' + R.handle, text: pick(R.posts), kind: 'rival' });
}
function rivalLaunch(k) {
  const R = RIVALS[k];
  const c = spawnNpcCoin({ profile: R.profile, rival: k, kind: pick(R.kinds) });
  c.attnImp += 0.3 + R.followers / 200000;
  c.npc.plan *= R.profile === 'honest' ? 1.4 : 1.25;
  if (k === 'flex' && S.rivals.flex.exposed) { c.attnImp *= 0.5; S.rivals.flex.exposed = false; }
  pushFeed({ who: '@' + R.handle, text: pick(R.launch).replace('$T', '$' + c.ticker), kind: 'rival' });
}
function rivalsTick(step) {
  for (const [k, r] of Object.entries(S.rivals)) {
    const R = RIVALS[k];
    r.t -= step;
    if (r.t <= 0) {
      r.t = rand(150, 300);
      const live = ECO.find((c) => c.rival === k && c.isLive() && !c.dead);
      if (!live && chance(0.65)) rivalLaunch(k);
      else pushFeed({ who: '@' + R.handle, text: pick(R.posts), kind: 'rival' });
    }
    r.fx -= step;
    if (r.fx <= 0) {
      r.fx = rand(90, 160);
      const mine = LIVE.filter((c) => c.isLive());
      if (!mine.length) continue;
      const c = pick(mine);
      if (r.feud >= 2 && chance(0.5)) {
        c.fud(0.1, `@${R.handle} quote-tweeted $${c.ticker}: "${pick(R.diss)}"`);
        c.attnImp += 0.12;
      } else if (r.feud <= -1 && chance(0.6)) {
        c.shill(0.25 * S.sentiment, 1.2);
        pushFeed({ who: '@' + R.handle, text: `Shilled your $${c.ticker} to ${fmtNum(R.followers)} followers.`, kind: 'good' });
      }
    }
  }
}
const rivalMood = (k) => { const f = S.rivals[k]?.feud ?? 0; return f >= 2 ? 'Feud' : f <= -1 ? 'Friendly' : 'Neutral'; };

// ---------------- market cycles ----------------
function rollCycle() {
  const c = S.cycle, prev = c.phase;
  if (c.forced) { c.phase = c.forced; c.days = randi(2, 3); c.forced = null; }
  else if (c.days > 0) { c.days--; if (c.days === 0) c.phase = 'normal'; }
  else { const r = Math.random(); if (r < 0.16) { c.phase = 'bull'; c.days = randi(2, 4); } else if (r < 0.3) { c.phase = 'bear'; c.days = randi(2, 3); } }
  if (c.phase === prev) return null;
  S.story.cycleNews = c.phase === 'normal' ? 'normal:' + prev : c.phase;
  return c.phase === 'bull' ? 'A bull run started' : c.phase === 'bear' ? 'A bear market hit' : prev === 'bull' ? 'The bull run cooled off' : 'The bear market is over';
}
function forecastCycle() {
  const c = S.cycle;
  if (c.forced) return c.forced === 'bull' ? 'bull run coming' : 'bear coming';
  if (c.days > 1) return `${c.phase} continues`;
  if (c.days === 1) return 'back to normal';
  return 'calm';
}
const cycleFollowMult = () => (S.cycle.phase === 'bull' ? 1.15 : S.cycle.phase === 'bear' ? 0.85 : 1);

// ---------------- celebrity coins ----------------
const CELEBS = [
  { name: 'Tiffani Glow', who: 'reality TV star', coin: ['Glow Up', 'GLOW'], kind: 'chill' },
  { name: 'Big Rick Ruckus', who: 'pro wrestler', coin: ['Ruckus', 'RUCKUS'], kind: 'chad' },
  { name: 'Lil Wagmi', who: 'rapper', coin: ['Wagmi Gang', 'WAGMI'], kind: 'mogcat' },
  { name: 'Coach Brock Vance', who: 'football coach', coin: ['Brock Coin', 'BROCK'], kind: 'goat' },
];
function startCeleb() {
  const cel = pick(CELEBS);
  const c = spawnNpcCoin({ kind: cel.kind, name: cel.coin[0], ticker: cel.coin[1], profile: 'rugger', celeb: cel.name });
  c.npc.plan = rand(9, 14); c.npc.rugAt = rand(170, 260);
  c.attnImp += 2.2; c.shill(1.2, 2.2);
  S.story.celeb = { id: c.id, name: cel.name, who: cel.who, ticker: c.ticker, choice: null, over: false };
  S.story.celebLive = true;
  pushFeed({ who: 'Chirp', text: `${cel.name} launched $${c.ticker}. It's the only thing anyone is talking about.`, kind: 'info' });
  queueEvent('celeb');
}
function celebTick() {
  const ce = S.story.celeb; if (!ce || ce.over) return;
  const c = ECO.find((x) => x.id === ce.id);
  if (!c || c.npc?.step >= 1 || c.dead || !c.isLive()) {
    ce.over = true; S.story.celebLive = false;
    queueEvent('celebAfter');
    objDone('celeb');
    if (S.mode === 'story' && S.chapter === 3) S.cycle.forced = 'bear';
  }
}

// ---------------- moving house ----------------
function moveHome(id) {
  const prev = S.loc;
  S.loc = id;
  const ch = LOCS[id].chapter;
  if (ch > S.chapter) { S.chapter = ch; S.chapterDay = S.day; S.story.chT = S.story.t || 0; }
  objDone(id);
  if (S.mode === 'story' && id === 'apartment') S.cycle.forced = 'bull';
  if (S.mode === 'story' && id === 'penthouse') S.cycle.forced = 'bull';
  const lines = {
    apartment: ['Mom', 'You\'re really moving out?? Take the good towels. Call me.'],
    hypehouse: ['Chad', 'BRO THERE\'S A POOL. i\'m never leaving'],
    penthouse: ['Mom', 'Forty floors?! Do they have railings? Send pictures.'],
  }[id];
  if (lines) setTimeout(() => text(lines[0], lines[1]), 6000);
  emit('move', { loc: id, from: prev });
}

// ---------------- event queue ----------------
// Events are stored as [type, arg] so a save can rebuild them.
function queueEvent(type, arg = null, front = false) {
  const q = S.story.q || (S.story.q = []);
  if (q.some(([t, a]) => t === type && a === arg)) return;
  if (front) q.unshift([type, arg]); else q.push([type, arg]);
}
function nextEvent() {
  const q = S.story.q || [];
  while (q.length) {
    const [type, arg] = q.shift();
    const ev = EV[type]?.(arg);
    if (ev) return ev;
  }
  return null;
}
const pctF = (f) => Math.round(S.followers * f);
const gainF = (n) => { const g = Math.max(0, Math.round(n)); S.followers += g; return g; };
const loseF = (n) => { const l = Math.max(0, Math.min(S.followers - 10, Math.round(n))); S.followers -= l; return l; };
const credAdd = (d) => { S.cred = clamp(S.cred + d, 0.3, credCap()); };

const EV = {
  cycle(ph) {
    const end = String(ph).startsWith('normal');
    const prev = end ? ph.split(':')[1] : null;
    return {
      kicker: 'Market', icon: ph === 'bull' ? '🐂' : ph === 'bear' ? '🐻' : '🌤️',
      title: ph === 'bull' ? 'Bull run' : ph === 'bear' ? 'Bear market' : prev === 'bull' ? 'The bull run is over' : 'The bear market is over',
      body: ph === 'bull' ? '<p>SOL is ripping and every timeline is green. New buyers everywhere, more launches in the Trenches, and your posts travel further.</p><p class="mut">Pump while it lasts. Bull runs end without warning.</p>'
        : ph === 'bear' ? '<p>SOL is bleeding and nobody wants to buy anything. Charts pump less, dumps hit harder, and followers come slower.</p><p class="mut">Smaller launches, faster profit-taking. Or sit it out.</p>'
          : '<p>The market is back to normal. Sentiment depends on the day again.</p>',
      choices: [{ id: 'ok', label: 'Got it', kind: 'primary', fx: () => null }],
    };
  },

  samuraiCallout() {
    const R = RIVALS.samurai;
    return {
      kicker: 'Rival', icon: '🗡️', who: R,
      title: '@SolSamurai quote-tweeted you',
      body: `<div class="dm"><b>@SolSamurai</b><p>"@${h(S.handle)} is a basement dev with a mid chart. Real ones launch with the Samurai army." 🗡️</p><small>${fmtNum(R.followers)} followers saw it</small></div><p>The timeline wants a response.</p>`,
      choices: [
        { id: 'clap', label: 'Clap back', sub: 'Drama is free marketing. He won\'t forget it.', fx: () => {
          S.rivals.samurai.feud += 2; S.karma.bad += 0;
          const g = gainF(pctF(0.05) + 150);
          const c = LIVE.find((x) => x.isLive()); if (c) c.shill(shillPower() * 1.2, shillSize());
          objDone('rival');
          return `The timeline loved it. +${fmtNum(g)} followers${c ? `, and the drama sent buyers to $${c.ticker}` : ''}. Now he quote-tweets your coins.`;
        } },
        { id: 'collab', label: 'Offer a collab', sub: 'Turn a rival into a shill.', fx: () => {
          S.rivals.samurai.feud = Math.min(S.rivals.samurai.feud, -1) - 1; credAdd(0.02); S.boosts.samuraiCollab = true;
          objDone('rival');
          return '"say less 🤝" He\'ll shill your next launch to his army.';
        } },
        { id: 'ignore', label: 'Ignore him', sub: 'Stay above it.', fx: () => { credAdd(0.01); objDone('rival'); return 'You stayed out of it. By tomorrow nobody remembers.'; } },
      ],
    };
  },

  flexWelcome() {
    return {
      kicker: 'Rival', icon: '😈', who: RIVALS.flex,
      title: '@rugmaster_flex noticed your rug',
      body: `<div class="dm"><b>@rugmaster_flex</b><p>"welcome to the club @${h(S.handle)} 😈 DMs open if you ever want to run one together"</p></div>`,
      choices: [
        { id: 'embrace', label: 'Reply with a 😈', sub: 'Degens will love it. Builders will remember it.', fx: () => { S.karma.bad++; S.rivals.flex.feud = -1; const g = gainF(pctF(0.03) + 60); credAdd(-0.03); return `+${fmtNum(g)} followers from the degen side of the timeline. Credibility took a hit.`; } },
        { id: 'distance', label: 'Distance yourself', sub: '"It was a liquidity mistake."', fx: () => { credAdd(0.02); return 'You posted that it was a mistake. Some people bought it.'; } },
        { id: 'expose', label: 'Expose his wallet', sub: 'Thread every rug he\'s ever done.', fx: () => { S.karma.good++; S.rivals.flex.feud += 2; S.rivals.flex.exposed = true; const g = gainF(pctF(0.04) + 80); return `Your thread mapped every one of his rugs. +${fmtNum(g)} followers. His next launch will struggle, and he's coming for yours.`; } },
      ],
    };
  },

  benExpose() {
    return {
      kicker: 'Rival', icon: '🧵', who: RIVALS.ben,
      title: '@BuilderBen posted a thread about you',
      body: `<div class="dm"><b>@BuilderBen</b><p>"A thread on @${h(S.handle)}'s wallet 🧵 ${S.stats.rugs} rugs, ${fmtNum(S.stats.victims)} bagholders, ${fmtUSD(S.stats.victimLossSol * S.solPrice, { compact: true })} gone. Check dev history before you ape."</p><small>${fmtNum(RIVALS.ben.followers)} followers · going viral</small></div>`,
      choices: [
        { id: 'apologize', label: 'Apologize and promise to build', sub: 'Rug again after this and it\'s over.', fx: () => { S.karma.good++; S.flags.benPromise = true; credAdd(0.03); const l = loseF(pctF(0.02)); return `Ben replied "we'll see." -${fmtNum(l)} followers, but credibility is up. Don't rug again.`; } },
        { id: 'deny', label: 'Deny everything', sub: 'The chain doesn\'t lie, but people are lazy.', fx: () => { S.rivals.ben.feud += 1; credAdd(-0.05); const l = loseF(pctF(0.05)); return `People checked the chain. -${fmtNum(l)} followers.`; } },
        { id: 'fire', label: 'Fire back: "cope, poor"', sub: 'Pick a side.', fx: () => { S.karma.bad++; S.rivals.ben.feud += 2; credAdd(-0.08); const l = loseF(pctF(0.03)); const g = gainF(pctF(0.015)); return `Degens cheered, everyone else unfollowed. -${fmtNum(l)} / +${fmtNum(g)} followers. Ben will warn people about every coin you launch.`; } },
      ],
    };
  },

  benShout() {
    return {
      kicker: 'Rival', icon: '🫡', who: RIVALS.ben,
      title: '@BuilderBen gave you a shoutout',
      body: `<div class="dm"><b>@BuilderBen</b><p>"Shoutout @${h(S.handle)}. ${S.stats.legit} clean launches, LP never pulled. Rare in this market."</p></div>`,
      choices: [{ id: 'ok', label: 'Let\'s go', kind: 'primary', fx: () => { S.karma.good++; S.rivals.ben.feud = -1; credAdd(0.05); const g = gainF(pctF(0.08) + 300); return `+${fmtNum(g)} followers and a credibility boost.`; } }],
    };
  },

  celeb() {
    const ce = S.story.celeb; if (!ce) return null;
    const c = ECO.find((x) => x.id === ce.id);
    return {
      kicker: 'Breaking', icon: '⭐',
      title: `${ce.name} launched a coin`,
      body: `<p><b>${h(ce.name)}</b>, the ${h(ce.who)}, just launched <b>$${h(ce.ticker)}</b>. Every timeline is talking about it, and attention everywhere else is drying up.</p><p class="mut">Celebrity coins pump hard. Their teams usually sell harder.</p>`,
      choices: [
        { id: 'ape', label: 'Ape in early', sub: `Buy ${fmtSOL(Math.min(1, S.sol))} SOL right now.`, disabled: !c || !c.isLive() ? 'Too late.' : S.sol < 0.05 ? 'Not enough SOL.' : null, fx: () => { const amt = Math.min(1, S.sol); tradeBuy(c, amt); ce.choice = 'ape'; FOCUS = c.id; return `You bought ${fmtSOL(amt)} SOL of $${ce.ticker}. Watch the chart. Sell before the team does.`; } },
        { id: 'warn', label: 'Post a warning thread', sub: 'Costs 10 energy. Looks genius if it dumps.', fx: () => { S.stamina = Math.max(0, S.stamina - 10); ce.choice = 'warn'; return 'Posted "celebrity coins are exit liquidity 🧵". Now you wait.'; } },
        { id: 'parody', label: 'Launch a parody coin', sub: 'Your next launch in 4 minutes rides the hype.', fx: () => { ce.choice = 'parody'; S.boosts.parody = { until: (S.story.t || 0) + 240, ticker: ce.ticker }; return `Launch something that riffs on $${ce.ticker}. Parody coins catch the overflow.`; } },
      ],
    };
  },

  celebAfter() {
    const ce = S.story.celeb; if (!ce) return null;
    const lines = [`<p><b>$${h(ce.ticker)}</b> dumped. ${h(ce.name)}'s team sold into the hype, and the chart is a cliff.</p>`];
    let fx = () => null;
    if (ce.choice === 'warn') { lines.push('<p>Your warning thread is the top post on the timeline.</p>'); fx = () => { credAdd(0.05); const g = gainF(pctF(0.06) + 200); S.karma.good++; return `+${fmtNum(g)} followers. People screenshot you calling it.`; }; }
    else if (ce.choice === 'ape') lines.push('<p>If you were still holding, you were the exit liquidity.</p>');
    else lines.push('<p>Attention is flowing back to the rest of the Trenches.</p>');
    return { kicker: 'Aftermath', icon: '📉', title: `${ce.name}'s coin rugged`, body: lines.join(''), choices: [{ id: 'ok', label: 'Back to work', kind: 'primary', fx }] };
  },

  listing(id) {
    const c = LIVE.find((x) => x.id === id); if (!c || !c.isLive()) return null;
    const fee = Math.round(clamp(c.mcapSol() * 0.06, 8, 80));
    const pay = () => {
      S.sol -= fee; c.extraCosts += fee; c.listed = true; S.stats.listings++;
      c.shill(shillPower() * 3, shillSize() * 1.6); c.attnImp += 1.2;
      const g = gainF(pctF(0.02) + 100);
      c._event?.('listed', `$${c.ticker} is live on MoonEx. A wave of new buyers is coming.`);
      objDone('listing');
      return `$${c.ticker} is listed on MoonEx. New buyers are pouring in. +${fmtNum(g)} followers.`;
    };
    return {
      kicker: 'Offer', icon: '🏦',
      title: `MoonEx wants to list $${c.ticker}`,
      body: `<p>MoonEx, a mid-tier exchange, wants to list <b>$${h(c.ticker)}</b> (${usdC(c.mcapSol())} market cap). A listing brings buyers who have never heard of PumpBin.</p><div class="sumlist"><div><span>Listing fee</span><b>${fee} SOL</b></div><div><span>Your balance</span><b>${fmtSOL(S.sol)} SOL</b></div></div>`,
      choices: [
        { id: 'pay', label: `Pay ${fee} SOL`, kind: 'primary', disabled: S.sol < fee ? `You need ${fee} SOL.` : null, fx: pay },
        { id: 'nego', label: 'Negotiate', sub: 'They might take half. They might walk.', fx: () => {
          if (chance(0.55) && S.sol >= fee / 2) { const f0 = fee; S.sol += f0 / 2; const r = pay(); return `They took ${Math.round(f0 / 2)} SOL. ${r}`; }
          return 'MoonEx stopped replying. Maybe next coin.';
        } },
        { id: 'pass', label: 'Pass', fx: () => 'You passed. Exchanges will call again if a coin gets big.' },
      ],
    };
  },

  phish(n) {
    const first = n === 1;
    const from = first ? 'Ghostly Wallet Support ✓' : 'MoonEx Rewards ✓';
    const msg = first ? 'We detected unusual activity on your wallet. Verify ownership within 30 minutes or your funds will be frozen.' : `You qualify for the MoonEx loyalty airdrop: 2,400 $MOONX (about ${fmtUSD(18000)}). Connect your wallet to claim before it expires.`;
    const link = first ? 'ghostly-verify.app/secure' : 'moonex-rewards.claims';
    const choices = [
      { id: 'connect', label: first ? 'Connect wallet and verify' : 'Connect wallet and claim', fx: () => {
        if (S.owned.coldWallet) return 'Your hardware wallet popped up a request to hand over control of every token you own. You hit reject. That page was a drainer.';
        const lost = S.sol * (first ? 0.7 : 0.6);
        S.sol -= lost; S.stats.hackedSol += lost;
        logTx(`Drained by a phishing site: -${fmtSOL(lost)} SOL.`);
        setTimeout(() => text('Chad', lost > 0.5 ? 'BRO. did you click a link?? get a hardware wallet. shop → setup' : 'did you just click a scam link lmao. good thing we were broke'), 2500);
        return `The page asked you to sign one transaction. It wasn't a verification. ${fmtSOL(lost)} SOL is gone.`;
      } },
      { id: 'report', label: 'Ignore and report the account', kind: 'primary', fx: () => { credAdd(0.01); return 'Support never DMs first. You reported the account and moved on.'; } },
    ];
    if (S.owned.kev) choices.splice(1, 0, { id: 'kev', label: 'Ask Kev', fx: () => 'Kev: "that domain was registered yesterday. block and move on." Good call.' });
    return {
      kicker: 'Direct message', icon: '✉️',
      title: from,
      body: `<div class="dm"><b>${h(from)}</b><p>${h(msg)}</p><p class="link">🔗 ${h(link)}</p></div>`,
      choices,
    };
  },

  summitInvite() {
    const story = S.mode === 'story';
    S.story.summitAsked = S.day;
    return {
      kicker: 'Invite', icon: '🎤',
      title: 'Degen Summit · Miami',
      body: '<p>You\'re invited to speak at <b>Degen Summit</b>, the biggest memecoin conference of the year. Panels, afterparties, and a lot of people who have bought your coins.</p><div class="sumlist"><div><span>Flight + hotel</span><b>$2,500</b></div><div><span>Takes</span><b>The whole day</b></div></div>',
      choices: [
        { id: 'go', label: 'Book the trip', kind: 'primary', disabled: S.cash < 2500 ? 'You need $2,500 cash.' : LIVE.length ? 'Close your live coins first.' : null, fx: () => {
          S.cash -= 2500; S.stats.summits++; S.story.lastSummit = S.day;
          return { next: ['summitPanel'] };
        } },
        { id: 'no', label: 'Not this time', sub: story ? 'They\'ll ask again tomorrow.' : '', fx: () => null },
      ],
    };
  },
  summitPanel() {
    return {
      kicker: 'Degen Summit · 1/3', icon: '🎤', scene: 'stage',
      title: 'The panel',
      body: '<p>"Are memecoins just gambling?" The moderator turns to you. Two thousand people in the room, forty thousand on the livestream.</p>',
      choices: [
        { id: 'honest', label: '"Honestly? Mostly, yeah."', sub: 'Credibility up.', fx: () => { S.karma.good++; credAdd(0.06); const g = gainF(pctF(0.03) + 100); return { text: `The room laughed, then clapped. +${fmtNum(g)} followers.`, next: ['summitParty'] }; } },
        { id: 'hype', label: '"It\'s the future of finance."', sub: 'Followers up, credibility down.', fx: () => { credAdd(-0.03); const g = gainF(pctF(0.08) + 200); return { text: `The clip went everywhere. +${fmtNum(g)} followers.`, next: ['summitParty'] }; } },
        { id: 'plug', label: 'Plug your next coin', sub: 'Your next launch starts with a crowd.', fx: () => { S.boosts.summitPlug = true; const g = gainF(pctF(0.02) + 60); return { text: `You teased "something big next week." +${fmtNum(g)} followers.`, next: ['summitParty'] }; } },
      ],
    };
  },
  summitParty() {
    const sam = !!S.rivals.samurai;
    return {
      kicker: 'Degen Summit · 2/3', icon: '🍸', scene: 'party',
      title: 'The afterparty',
      body: sam ? '<p>@SolSamurai is at the afterparty, three drinks in, telling everyone he invented memecoins.</p>' : '<p>A rooftop afterparty. Someone hands you a mic.</p>',
      choices: sam ? [
        { id: 'peace', label: 'Make peace', sub: 'He\'ll shill your next launch.', fx: () => { S.rivals.samurai.feud = -1; S.boosts.samuraiCollab = true; return { text: 'You split a bottle and a group photo. Friends now, apparently.', next: ['summitFan'] }; } },
        { id: 'roast', label: 'Roast him on the mic', sub: 'Feud gets worse. Followers love it.', fx: () => { S.rivals.samurai.feud += 2; const g = gainF(pctF(0.04) + 120); return { text: `The roast is the most-clipped moment of the summit. +${fmtNum(g)} followers.`, next: ['summitFan'] }; } },
        { id: 'leave', label: 'Leave early', sub: '+30 energy tomorrow.', fx: () => { S.boosts.rested = true; return { text: 'You slept like a person with a job.', next: ['summitFan'] }; } },
      ] : [
        { id: 'mic', label: 'Take the mic', fx: () => { const g = gainF(pctF(0.04) + 120); return { text: `Crowd work. +${fmtNum(g)} followers.`, next: ['summitFan'] }; } },
        { id: 'leave', label: 'Leave early', sub: '+30 energy tomorrow.', fx: () => { S.boosts.rested = true; return { text: 'You slept like a person with a job.', next: ['summitFan'] }; } },
      ],
    };
  },
  summitFan() {
    const rug = S.history.find((r) => r.rugged);
    const fin = (t) => ({ text: t, after: () => travelHome() });
    if (rug) return {
      kicker: 'Degen Summit · 3/3', icon: '🧳', scene: 'lobby',
      title: 'A fan stops you in the lobby',
      body: `<p>"Hey, you're @${h(S.handle)}, right? I was in <b>$${h(rug.ticker)}</b>. Lost my rent money. Was any of it real?"</p>`,
      choices: [
        { id: 'refund', label: 'Refund them', sub: '-$2,000 cash.', disabled: S.cash < 2000 ? 'Not enough cash.' : null, fx: () => { S.cash -= 2000; S.karma.good += 2; credAdd(0.04); return fin('They hugged you. Somebody filmed it. Credibility up.'); } },
        { id: 'dyor', label: '"DYOR, bro."', fx: () => { S.karma.bad++; credAdd(-0.03); return fin('They posted about it. It did numbers. Not good numbers.'); } },
        { id: 'walk', label: 'Walk away', fx: () => fin('You pretended to take a call.') },
      ],
    };
    return {
      kicker: 'Degen Summit · 3/3', icon: '🧳', scene: 'lobby',
      title: 'A fan stops you in the lobby',
      body: '<p>"Your coin paid for my flight here. Can I get a selfie? Also... are you hiring?"</p>',
      choices: [
        { id: 'selfie', label: 'Take the selfie', fx: () => { const g = gainF(pctF(0.02) + 40); return fin(`They posted it. +${fmtNum(g)} followers.`); } },
        { id: 'hire', label: 'Make them a community mod', sub: '+5% followers per post from now on.', fx: () => { S.boosts.mod = true; S.karma.good++; return fin('New mod acquired. They\'re already banning bots.'); } },
      ],
    };
  },

  lastIntro() {
    return {
      kicker: 'Chapter 4', icon: '🏙️',
      title: 'One more coin',
      body: `<p>Forty floors above Mom's basement. Chad, Kev, Mo and everyone on the timeline are asking the same thing: <b>what's the last coin?</b></p><p>Your next launch is <b>the Last Coin</b>. Every rival, every KOL, and every bagholder you ever made will be watching it.</p>`,
      choices: [{ id: 'ok', label: 'Let\'s do it', kind: 'primary', fx: () => { S.story.lastArmed = true; return null; } }],
    };
  },

  finale(id) {
    const c = LIVE.find((x) => x.id === id); if (!c) return null;
    const st = S.stats;
    const legendOK = st.rugs <= Math.max(2, Math.floor(st.launched * 0.2)) && S.cred >= 0.9;
    return {
      kicker: 'The Last Coin', icon: '👑', finale: true,
      title: `$${c.ticker} · ${usdC(c.mcapSol())}`,
      body: `<p>${fmtNum(c.holderCount())} holders. Rivals, KOLs and journalists are all watching the chart. This is the last decision of the game.</p><div class="sumlist"><div><span>Coins launched</span><b>${st.launched}</b></div><div><span>Rugs</span><b>${st.rugs}</b></div><div><span>Ran clean</span><b>${st.legit}</b></div><div><span>Credibility</span><b>${Math.round(S.cred * 100)}%</b></div><div><span>Followers</span><b>${fmtNum(S.followers)}</b></div></div>`,
      choices: [
        { id: 'legend', label: 'Hand it to the community', sub: 'Burn the LP, renounce, walk away clean.', kind: 'good', disabled: legendOK ? null : 'Nobody would believe it. Your rug history is too long, or your credibility too low.', fx: () => endGame('legend', c) },
        { id: 'influencer', label: 'Become the face of it', sub: 'Sell slowly, keep posting, collect sponsorships.', disabled: S.followers >= 60000 ? null : 'Needs 60,000 followers.', fx: () => endGame('influencer', c) },
        { id: 'villain', label: 'Rug it', sub: 'The biggest exit of the cycle.', kind: 'danger', fx: () => endGame('villain', c) },
        { id: 'quiet', label: 'Log off', sub: 'Take some profit, cash out everything, call Mom.', fx: () => endGame('quiet', c) },
      ],
    };
  },
};

// ---------------- hooks from the game ----------------
function storyOnLaunch(c) {
  const st = S.story;
  if (S.boosts.samuraiCollab && S.rivals.samurai) {
    delete S.boosts.samuraiCollab;
    c.shill(0.6 * S.sentiment, 1.6); c.attnImp += 0.3;
    pushFeed({ who: '@SolSamurai', text: `Aping my friend's $${c.ticker}. Samurai army, you know what to do 🗡️`, kind: 'good' });
  }
  if (S.boosts.summitPlug) {
    delete S.boosts.summitPlug;
    c.attnImp += 0.9; c.shill(shillPower() * 1.4, shillSize() * 1.3);
    pushFeed({ who: 'Chirp', text: `The Degen Summit crowd showed up for $${c.ticker}.`, kind: 'good' });
  }
  if (S.boosts.parody && (st.t || 0) < S.boosts.parody.until) {
    c.attnImp += 0.8; c.shill(shillPower() * 1.5, shillSize());
    pushFeed({ who: 'Chirp', text: `$${c.ticker} is riding the $${S.boosts.parody.ticker} hype.`, kind: 'good' });
    delete S.boosts.parody;
  }
  if (S.rivals.ben?.feud >= 2) c.fud(0.08, `@BuilderBen: "${pick(RIVALS.ben.diss)}" ($${c.ticker})`);
  if (S.mode === 'story' && S.chapter >= 4 && st.lastArmed && !st.lastLaunched) {
    c.lastCoin = true; st.lastLaunched = c.id;
    c.attnImp += 2.5; c.shill(shillPower() * 2.5, shillSize() * 1.6);
    objDone('lastcoin');
    for (const k of Object.keys(S.rivals)) pushFeed({ who: '@' + RIVALS[k].handle, text: { samurai: `Everyone watching @${S.handle}'s $${c.ticker}. Fine. I'm watching too.`, flex: `$${c.ticker}... rug speedrun? 👀`, ben: `@${S.handle} launched $${c.ticker}. Let's see what kind of dev you are.` }[k], kind: 'rival' });
    setTimeout(() => text('Chad', `THE LAST COIN IS LIVE. $${c.ticker}. everyone is watching bro`), 2000);
  }
}
function storyOnRug(c) {
  S.karma.bad++;
  if (c.lastCoin) return;
  if (S.flags.benPromise && !S.flags.benBroken) {
    S.flags.benBroken = true;
    const l = loseF(pctF(0.1)); credAdd(-0.1);
    pushFeed({ who: '@BuilderBen', text: `He promised to build. He rugged $${c.ticker}. Unfollow and block. (-${fmtNum(l)} followers)`, kind: 'bad' });
  } else if (S.rivals.ben && chance(0.6)) pushFeed({ who: '@BuilderBen', text: `Another rug: $${c.ticker}. Check dev history before you ape, people.`, kind: 'bad' });
  if (S.rivals.flex && S.stats.rugs > 1 && chance(0.5)) pushFeed({ who: '@rugmaster_flex', text: pick(['respect the craft 😈', `$${c.ticker} speedrun lmao`, 'another one for the club']), kind: 'rival' });
}
function storyOnLegit(c) {
  S.karma.good++;
  if (S.rivals.ben && chance(0.5)) { credAdd(0.01); pushFeed({ who: '@BuilderBen', text: `Clean run on $${c.ticker} from @${S.handle}. More of this.`, kind: 'good' }); }
}
BUS.addEventListener('coinevent', (e) => {
  const { coin, ev, mine } = e.detail;
  if (mine && ev.type === 'graduated' && S.rivals.samurai && chance(0.7)) pushFeed({ who: '@SolSamurai', text: `$${coin.ticker} graduated? cute. mine do that in 4 minutes`, kind: 'rival' });
});
BUS.addEventListener('gotrugged', (e) => {
  if (e.detail.coin.rival === 'flex') setTimeout(() => pushFeed({ who: '@rugmaster_flex', text: 'thanks for the liquidity @' + S.handle + ' 😘', kind: 'rival' }), 3000);
});

function storyMorning() {
  const st = S.story, story = S.mode === 'story';
  let n = 0;
  if (st.cycleNews) { queueEvent('cycle', st.cycleNews); st.cycleNews = null; n++; }
  if (!st.phish && ((story && S.chapter >= 2 && S.day > S.chapterDay) || (!story && S.day >= 4 && chance(0.35)))) { st.phish = 1; queueEvent('phish', 1); n++; }
  else if (st.phish && !st.phish2 && ((story && S.chapter >= 3 && S.day > S.chapterDay) || (!story && S.day >= 9 && chance(0.25)))) { st.phish2 = 1; queueEvent('phish', 2); n++; }
  if (n < 2 && S.chapter >= 2) {
    const want = story ? !S.done.summit && S.day > S.chapterDay : S.followers >= 5000 && S.day - (st.lastSummit ?? -99) >= 6 && chance(0.5);
    if (want) queueEvent('summitInvite');
  }
}

let storyAcc = 0;
function storyTick(dt) {
  const st = S.story;
  st.t = (st.t || 0) + dt;
  storyAcc += dt;
  if (storyAcc < 1) return;
  const step = storyAcc; storyAcc = 0;
  const story = S.mode === 'story';
  const sinceCh = st.t - (st.chT || 0);
  // rivals show up as you rise
  if (!S.rivals.samurai && (S.chapter >= 2 || (!story && S.day >= 2))) activateRival('samurai');
  if (!S.rivals.flex && (S.chapter >= 2 || S.stats.rugs >= 1)) activateRival('flex');
  if (!S.rivals.ben && ((S.chapter >= 2 && sinceCh > 240) || S.stats.rugs >= 2 || (!story && S.day >= 3))) activateRival('ben');
  rivalsTick(step);
  if (S.rivals.samurai && !st.samuraiCallout && S.chapter >= 2 && (sinceCh > 90 || S.stats.graduated >= 1)) { st.samuraiCallout = 1; queueEvent('samuraiCallout'); }
  if (S.rivals.flex && S.stats.rugs >= 1 && !st.flexWelcome) { st.flexWelcome = 1; queueEvent('flexWelcome'); }
  if (S.rivals.ben && S.stats.rugs >= 2 && !st.benExpose) { st.benExpose = 1; queueEvent('benExpose'); }
  if (S.rivals.ben && S.stats.legit >= 3 && S.stats.rugs <= 1 && !st.benShout) { st.benShout = 1; queueEvent('benShout'); }
  // celebrity coin
  if (!st.celeb && ((story && S.chapter >= 3 && sinceCh > 100) || (!story && S.day >= 5 && chance(step / 900)))) startCeleb();
  else if (!story && st.celeb?.over && S.day - (st.celebDay ?? S.day) >= 6) { st.celeb = null; }
  if (st.celeb && st.celebDay == null) st.celebDay = S.day;
  celebTick();
  // exchange listing offers
  const lc = LIVE.find((c) => c.isLive() && c.graduated && !c.listingOffered && usd(c.mcapSol()) >= 120000);
  if (lc && (S.chapter >= 3 || (!story && S.day >= 3))) { lc.listingOffered = true; queueEvent('listing', lc.id); }
  // the final chapter
  if (story && S.chapter >= 4 && !st.lastIntro && sinceCh > 15) { st.lastIntro = 1; queueEvent('lastIntro'); }
  const last = LIVE.find((c) => c.lastCoin);
  if (last && !st.finale && (usd(last.mcapSol()) >= 250000 || last.t >= 240 || !last.isLive())) { st.finale = 1; queueEvent('finale', last.id, true); }
}

// ---------------- endings ----------------
const ENDINGS = {
  legend: { title: 'Legend', tag: 'You built something.', icon: '🏛️' },
  villain: { title: 'Villain', tag: 'The biggest rug of the cycle.', icon: '😈' },
  influencer: { title: 'The Influencer', tag: 'You stopped launching and started posting for money.', icon: '📸' },
  quiet: { title: 'Quiet Exit', tag: 'You logged off.', icon: '🌅' },
};
function endGame(kind, c) {
  if (c && c.isLive()) {
    if (kind === 'villain') { if (c.canPull?.()) pullLP(c); else devSell(c, 1); }
    else if (kind === 'legend') { c.handedOff = true; if (c.lp === 'dev' && c.burnLP) c.burnLP(); credAdd(0.1); gainF(pctF(0.2)); }
    else if (kind === 'influencer') { devSell(c, 0.3); gainF(pctF(0.1)); }
    else if (kind === 'quiet') { devSell(c, 0.45); }
  }
  if (c && c.creatorFees - c.feesClaimed > 0.0005) claimFees(c);
  if (kind === 'quiet' && S.sol > 0.01) cashOut(S.sol);
  objDone('finale');
  S.ended = kind; S.endDay = S.day;
  emit('ending', { kind });
  return null;
}
// a few lines about how you played, for the ending screen
function epilogue(kind) {
  const st = S.stats, out = [];
  if (st.rugs === 0) out.push('You never rugged anyone. In this market that\'s close to a miracle.');
  else if (st.rugs > st.legit) out.push(`${st.rugs} rugs against ${st.legit} clean runs. RugRadar has a whole page on you.`);
  else out.push(`${st.legit} clean runs, ${st.rugs} rug${st.rugs > 1 ? 's' : ''}. Mostly a builder. Mostly.`);
  if (st.victims) out.push(`${fmtNum(st.victims)} bagholders lost ${fmtUSD(st.victimLossSol * S.solPrice, { compact: true })} on your coins.`);
  const sam = S.rivals.samurai, ben = S.rivals.ben, flex = S.rivals.flex;
  if (sam) out.push(sam.feud >= 2 ? '@SolSamurai still subtweets you every week.' : sam.feud <= -1 ? '@SolSamurai calls you "brother" in every space now.' : '@SolSamurai moved on to a new rival.');
  if (S.flags.benBroken) out.push('@BuilderBen\'s thread about your broken promise is still pinned.');
  else if (ben && ben.feud <= -1) out.push('@BuilderBen uses your launches as examples in his threads. The good kind.');
  if (flex && flex.feud <= -1) out.push('@rugmaster_flex keeps inviting you to "one more".');
  if (st.hackedSol > 0) out.push(`You lost ${fmtSOL(st.hackedSol)} SOL to a phishing link. Everyone does once.`);
  if (S.owned.momHouse) out.push('Mom loves Florida. She still calls every day.');
  else if (S.owned.momCar || S.owned.momKitchen) out.push('Mom tells her friends you "work in liquidity".');
  if (kind === 'villain' && S.karma.good > S.karma.bad) out.push('Nobody saw it coming. That was the point.');
  if (kind === 'legend' && S.karma.bad > 2) out.push('Not bad for someone who started out rugging.');
  return out;
}

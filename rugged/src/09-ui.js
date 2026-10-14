// ============================================================
// UI — HUD, BasementOS (the PC), phone, dialogs, menus
// ============================================================
const $ = (s, r = document) => r.querySelector(s);
const h = (s) => escapeHtml(s);
const ICON_CACHE = {};
function memeIconURL(kind, hue, seed = 1, size = 96) {
  const key = kind + '|' + hue + '|' + seed + '|' + size;
  if (!ICON_CACHE[key]) { const c = newCanvas(size); drawMemeIcon(c.getContext('2d'), kind, hue, size, seed); ICON_CACHE[key] = c.toDataURL(); }
  return ICON_CACHE[key];
}
const coinIcon = (c, size = 40) => `<img class="ci" width="${size}" height="${size}" src="${memeIconURL(c.kind, c.hue, c.id || 1)}" alt="">`;
const usdOf = (sol) => fmtUSD(sol * S.solPrice);
const NAME_A = ['Basement', 'Mom', 'Moon', 'Cope', 'Giga', 'Baby', 'Turbo', 'Smol', 'Based', 'Degen', 'Ser', 'Lil', 'Mega', 'Retro', 'Sad', 'Rich', 'Chill', 'Angry', 'Sleepy', 'Cozy'];
const NAME_B = { frog: ['Frog', 'Ribbit', 'Toad', 'Froggo'], dog: ['Inu', 'Doge', 'Pup', 'Doggo'], cat: ['Cat', 'Kitty', 'Meow', 'Catwif'], penguin: ['Pengu', 'Penguin', 'Waddle', 'Iceboi'], robot: ['AI', 'Agent', 'GPT', 'Bot'], rocket: ['Rocket', 'Launch', 'Mars', 'Thrust'], moon: ['Moon', 'Luna', 'Lunar', 'Crater'], burger: ['Burger', 'Patty', 'Fries', 'Combo'], banana: ['Banana', 'Nana', 'Peel', 'Split'], chad: ['Chad', 'Sigma', 'Jawline', 'Alpha'] };
const METHOD_LABEL = { lp: 'Liquidity pull', devdump: 'Dev dump', died: 'Died', abandoned: 'Closed' };

const UI = {
  app: 'terminal', pcOpen: false, phoneOpen: false, draft: null, wikiId: 'memecoin', chirpCoin: null, chirpType: 'shill',
  shopCat: 'All', lastLive: 0,

  init(ctx) {
    this.ctx = ctx;
    this.draft = this.newDraft();
    $('#pc').addEventListener('click', (e) => this.onClick(e));
    $('#pc').addEventListener('input', (e) => this.onInput(e));
    $('#pc').addEventListener('change', (e) => this.onInput(e));
    $('#phone').addEventListener('click', (e) => this.onClick(e));
    $('#modal').addEventListener('click', (e) => { const b = e.target.closest('[data-modal]'); if (b) { AUDIO.sfx('click'); const cb = this._modalCb; this._modalCb = null; $('#modal').hidden = true; cb?.(b.dataset.modal); } });
    $('#dialog').addEventListener('click', (e) => { const b = e.target.closest('[data-topic]'); if (b) { AUDIO.sfx('click'); this.ctx.dialogTopic(b.dataset.topic); } });
    BUS.addEventListener('coinevent', (e) => this.onCoinEvent(e.detail));
    BUS.addEventListener('feed', () => { if (this.pcOpen && this.app === 'chirp') this.renderAppKeep(); });
    BUS.addEventListener('objective', () => { this.updateObjective(); AUDIO.sfx('notify'); this.toast(`Objective done! Next: ${OBJECTIVES[S.objective] || 'Live your best life'}`, 'good'); });
    BUS.addEventListener('posted', (e) => {
      AUDIO.sfx('tweet');
      const p = e.detail.post;
      this.toast(p.viral ? `🔥 Your post went VIRAL: ${fmtNum(p.impressions)} views, +${p.gain} followers` : p.ratioed ? `Your post got ratioed. ${p.gain} followers.` : `Posted. ${fmtNum(p.impressions)} views, ${p.gain >= 0 ? '+' : ''}${p.gain} followers`, p.viral ? 'good' : p.ratioed ? 'bad' : '');
      if (this.pcOpen && this.app === 'chirp') this.renderAppKeep();
    });
    BUS.addEventListener('rugged', (e) => { AUDIO.sfx('rug'); this.toast(`You rugged $${e.detail.coin.ticker}. -${e.detail.lost.toLocaleString()} followers.`, 'bad'); });
  },
  newDraft() {
    return { type: 'pump', name: '', ticker: '', kind: pick(Object.keys(MEME_KINDS)), hue: randi(0, 359), devBuy: 0.2, lpSol: 5, lpPct: 0.85, lp: 'dev', lockSec: 180 };
  },

  // ---------------- HUD ----------------
  updateHUD() {
    if (!S) return;
    $('#h-cash').textContent = fmtUSD(S.cash);
    $('#h-sol').textContent = `${fmtSOL(S.sol)} SOL`;
    $('#h-foll').textContent = fmtNum(S.followers);
    $('#h-cred').textContent = Math.round(S.cred * 100) + '%';
    $('#h-cred').dataset.level = S.cred < 0.6 ? 'bad' : S.cred < 0.9 ? 'warn' : 'ok';
    $('#h-stam').style.width = (S.stamina / staminaMax() * 100) + '%';
    $('#h-stamv').textContent = Math.round(S.stamina);
    $('#h-day').textContent = `DAY ${S.day}`;
    $('#h-time').textContent = clockText();
    $('#coinbar').innerHTML = LIVE.map((c) => {
      const mc = c.mcapSol() * S.solPrice;
      const ph = c.priceHist, ch = ph.length > 10 ? c.price() / ph[ph.length - 11] - 1 : 0;
      return `<div class="tick ${ch >= 0 ? 'up' : 'down'}">${coinIcon(c, 18)}<b>$${h(c.ticker)}</b><span>${fmtUSD(mc, { compact: true })}</span><i>${fmtPct(ch)}</i></div>`;
    }).join('');
  },
  updateObjective() {
    const o = OBJECTIVES[S.objective];
    $('#objective').innerHTML = o ? `<span>Objective</span>${h(o)}` : '';
  },
  prompt(text) {
    const p = $('#prompt'), b = $('#use-btn');
    if (!text) { p.hidden = true; b.hidden = true; return; }
    const touch = this.ctx.player.isTouch;
    p.hidden = false; p.innerHTML = touch ? h(text) : `<kbd>E</kbd> ${h(text)}`;
    b.hidden = !touch;
  },
  toast(text, kind = '') {
    const box = $('#toasts');
    const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = text;
    box.prepend(el);
    while (box.children.length > 4) box.lastChild.remove();
    setTimeout(() => el.classList.add('out'), 4200); setTimeout(() => el.remove(), 4800);
  },
  subtitle(who, text, ms = 4500) {
    const el = $('#subtitle');
    el.innerHTML = `<b>${h(who)}</b> ${h(text)}`; el.hidden = false;
    clearTimeout(this._subT); this._subT = setTimeout(() => (el.hidden = true), ms);
  },
  onCoinEvent({ coin, ev }) {
    const kinds = { graduated: 'good', koth: 'good', viral: 'good', whale: '', kol: '', devsold: '', unlock: 'bad', dead: 'bad', rugged: 'bad', fud: 'bad', revive: 'good', lock: '', burn: 'good' };
    if (ev.type in kinds && ev.text) {
      this.toast(ev.text, kinds[ev.type]);
      if (['graduated', 'koth', 'viral', 'kol'].includes(ev.type)) AUDIO.sfx('notify');
    }
    this.ctx.crewReact(ev.type, coin);
  },

  // ---------------- modal ----------------
  modal(html, buttons, cb, cls = '') {
    const m = $('#modal');
    m.innerHTML = `<div class="mbox ${cls}">${html}<div class="mbtns">${buttons.map(([id, label, k]) => `<button class="btn ${k || ''}" data-modal="${id}">${label}</button>`).join('')}</div></div>`;
    m.hidden = false; this._modalCb = cb;
  },
  confirm(html, yes, cb) { this.modal(html, [['no', 'Cancel', 'ghost'], ['yes', yes, 'rug']], (id) => id === 'yes' && cb()); },

  // ---------------- PC ----------------
  openPC(app) {
    this.pcOpen = true; if (app) this.app = app;
    $('#pc').hidden = false; document.body.classList.add('in-pc');
    this.renderPC();
    advanceObjective(0);
  },
  closePC() { this.pcOpen = false; $('#pc').hidden = true; document.body.classList.remove('in-pc'); },
  renderPC() {
    const apps = [['terminal', 'Terminal', '📈'], ['pumpbin', 'PumpBin', '💊'], ['chirp', 'Chirp', '🐦'], ['tele', 'Tele', '✈️'], ['radar', 'RugRadar', '🛡️'], ['wallet', 'Wallet', '👛'], ['shop', 'Shop', '🛒'], ['wiki', 'Wiki', '📖'], ['history', 'History', '🗂️']];
    $('#pc-dock').innerHTML = apps.map(([id, label, ic]) => `<button class="dock-btn ${this.app === id ? 'on' : ''}" data-act="app" data-app="${id}"><span>${ic}</span><em>${label}</em></button>`).join('');
    this.renderApp();
  },
  renderApp() {
    const el = $('#pc-main');
    const fn = this['app_' + this.app];
    el.innerHTML = fn ? fn.call(this) : '';
    el.scrollTop = 0;
    this.live(true);
  },
  renderAppKeep() { const el = $('#pc-main'); const st = el.scrollTop; const fn = this['app_' + this.app]; el.innerHTML = fn ? fn.call(this) : ''; el.scrollTop = st; this.live(true); },
  live(force) {
    if (!this.pcOpen && !this.phoneOpen) return;
    const now = performance.now();
    if (!force && now - this.lastLive < 220) return;
    this.lastLive = now;
    if (this.pcOpen) {
      $('#pc-bal').innerHTML = `<b>${fmtUSD(S.cash)}</b><span>${fmtSOL(S.sol)} SOL</span><span>${fmtNum(S.followers)} followers</span>`;
      $('#pc-clock').textContent = clockText();
      const fn = this['live_' + this.app];
      if (fn) fn.call(this);
    }
    if (this.phoneOpen) this.livePhone();
  },
  coinTabs() {
    if (LIVE.length < 2) return '';
    return `<div class="coin-tabs">${LIVE.map((c) => `<button class="ctab ${c.id === FOCUS ? 'on' : ''}" data-act="focus" data-id="${c.id}">${coinIcon(c, 20)}$${h(c.ticker)}</button>`).join('')}</div>`;
  },

  app_terminal() {
    const c = focusCoin();
    if (!c) {
      const last = S.history[0];
      return `<div class="empty"><h2>No live coins</h2><p>Launch one on PumpBin. You can run ${maxCoins()} at a time.</p><button class="btn primary" data-act="app" data-app="pumpbin">Open PumpBin</button>
      ${last ? `<p class="mut">Last coin: $${h(last.ticker)}, ${last.profit >= 0 ? '+' : ''}${fmtSOL(last.profit)} SOL${last.rugged ? ' (rugged)' : ''}</p>` : ''}</div>`;
    }
    FOCUS = c.id;
    const custom = c.type === 'custom';
    return `${this.coinTabs()}
    <div class="term">
      <div class="term-head">
        ${coinIcon(c, 48)}
        <div class="tname"><b>${h(c.name)}</b><span>$${h(c.ticker)} · <span id="t-phase"></span> · <span id="t-age"></span></span></div>
        <div class="tstats">
          <div><label>Mcap</label><b id="t-mcap"></b></div>
          <div><label>Price</label><b id="t-price"></b></div>
          <div><label>Liquidity</label><b id="t-liq"></b></div>
          <div><label>Holders</label><b id="t-hold"></b></div>
          <div><label>Risk</label><b id="t-risk"></b></div>
        </div>
      </div>
      <div class="curve" id="t-curvewrap"><div class="curve-bar"><i id="t-curve"></i></div><span id="t-curvetxt"></span></div>
      <div class="term-grid">
        <div class="chart-box"><canvas id="t-chart"></canvas><div class="mood" id="t-mood"></div></div>
        <div class="side">
          <section class="card">
            <h4>Your position</h4>
            <div class="kv"><span>Dev bag</span><b id="t-devtok"></b></div>
            <div class="kv"><span>If sold now</span><b id="t-quote" class="hi"></b></div>
            <div class="kv"><span>Creator fees</span><b id="t-fees"></b></div>
            <div class="kv"><span>Spent / earned</span><b id="t-pnl"></b></div>
            ${custom ? `<div class="kv"><span>Pool</span><b id="t-pool"></b></div>` : ''}
            <div class="rugmeter"><div><i id="t-rugbar"></i></div><span id="t-rugtxt"></span></div>
          </section>
          <section class="card actions">
            <h4>Take profit</h4>
            <div class="row4">
              <button class="btn sell" data-act="sell" data-frac="0.1">10%</button>
              <button class="btn sell" data-act="sell" data-frac="0.25">25%</button>
              <button class="btn sell" data-act="sell" data-frac="0.5">50%</button>
              <button class="btn rug" data-act="sell" data-frac="1">Dump all</button>
            </div>
            <button class="btn good wide" data-act="claim" id="t-claim">Claim creator fees</button>
            ${custom ? `<h4>Liquidity pool</h4><div class="row2" id="t-custom"></div>` : ''}
            <h4>Promote</h4>
            <div class="row2">
              <button class="btn" data-act="app" data-app="chirp">🐦 Post / hire KOL</button>
              <button class="btn" data-act="app" data-app="tele">✈️ Tele chat</button>
            </div>
            <button class="btn ghost wide" data-act="close-coin">Close coin (walk away)</button>
          </section>
        </div>
      </div>
      <section class="card feed"><h4>Live trades</h4><div id="t-trades"></div></section>
    </div>`;
  },
  live_terminal() {
    const c = focusCoin(); if (!c) return;
    const sp = S.solPrice;
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
    set('t-mcap', fmtUSD(c.mcapSol() * sp));
    set('t-price', '$' + fmtPrice(c.price() * sp));
    set('t-liq', fmtUSD(c.liquiditySol() * sp));
    set('t-hold', c.holderCount());
    const r = c.risk();
    set('t-risk', `<span class="risk r${r.score > 45 ? 3 : r.score > 20 ? 2 : 1}">${r.score}</span>`);
    set('t-phase', c.phase === 'curve' ? 'Bonding curve' : c.phase === 'dex' ? (c.type === 'custom' ? 'DEX pool (yours)' : 'Graduated to DEX') : 'RUGGED');
    set('t-age', (c.dead ? '💀 dead · ' : '') + fmtDur(c.t));
    const cw = document.getElementById('t-curvewrap');
    if (cw) {
      cw.hidden = c.phase !== 'curve';
      set('t-curvetxt', `Bonding curve ${Math.round(c.progress() * 100)}%. Graduates near ${fmtUSD(410 * sp, { compact: true })} mcap`);
      const b = document.getElementById('t-curve'); if (b) b.style.width = c.progress() * 100 + '%';
    }
    const devTok = c.dev.main.tokens;
    set('t-devtok', `${fmtNum(devTok)} <small>${fmtPct(devTok / c.supply, false)} of supply</small>`);
    const q = c.isLive() ? c.quoteSell(devTok) : 0;
    set('t-quote', `${fmtSOL(q)} SOL <small>${usdOf(q)}</small>`);
    const fees = c.creatorFees - c.feesClaimed;
    set('t-fees', `${fmtSOL(fees)} SOL <small>${usdOf(fees)}</small>`);
    const claim = document.getElementById('t-claim'); if (claim) claim.disabled = fees < 0.0005;
    const pnl = c.devProceeds - c.devCost - c.extraCosts;
    set('t-pnl', `${fmtSOL(c.devCost + c.extraCosts)} / ${fmtSOL(c.devProceeds)} <small class="${pnl >= 0 ? 'up' : 'down'}">${pnl >= 0 ? '+' : ''}${fmtSOL(pnl)}</small>`);
    const sold = Math.min(1, c.dev.soldFrac);
    const rb = document.getElementById('t-rugbar'); if (rb) { rb.style.width = sold * 100 + '%'; rb.parentElement.dataset.level = c.rugged ? 'bad' : sold > 0.3 ? 'warn' : 'ok'; }
    set('t-rugtxt', c.rugged ? 'You rugged this coin.' : `Sold ${Math.round(sold * 100)}% of your bag. Past 50% counts as a rug.`);
    if (c.type === 'custom') {
      set('t-pool', `${fmtSOL(c.poolSol)} SOL <small>seeded ${fmtSOL(c.lpSeed)}</small>`);
      const cc = document.getElementById('t-custom');
      const sig = [c.lp, c.phase, Math.ceil(Math.max(0, c.lockUntil - c.t) / 5)].join();
      if (cc && cc.dataset.sig !== sig) {
        cc.dataset.sig = sig;
        const b = [];
        if (c.phase !== 'dex') b.push('<span class="mut">The pool is empty.</span>');
        else if (c.lp === 'dev') b.push(`<button class="btn rug" data-act="pull">Pull liquidity</button><button class="btn" data-act="burn">Burn LP (go legit)</button><button class="btn" data-act="lock" data-sec="120">Lock LP 2 min</button><button class="btn" data-act="lock" data-sec="300">Lock LP 5 min</button>`);
        else if (c.lp === 'locked') b.push(`<button class="btn" disabled>🔒 Locked ${fmtDur(c.lockUntil - c.t)}</button><button class="btn" disabled>LP unlocks after</button>`);
        else b.push('<span class="mut">LP burned. Nobody can pull it, including you.</span>');
        cc.innerHTML = b.join('');
      }
    }
    const tr = document.getElementById('t-trades');
    if (tr) tr.innerHTML = c.trades.slice(-14).reverse().map((t) => `<div class="trade ${t.side}${t.dev ? ' dev' : ''}"><span>${t.side === 'buy' ? 'BUY' : 'SELL'}</span><b>${h(t.who)}</b><em>${t.via === 'chirp' ? '🐦 via Chirp' : t.type === 'kol' ? '📣 KOL' : t.type === 'whale' ? '🐋 whale' : t.type === 'sniper' ? '🎯 sniper' : t.lp ? 'LIQUIDITY PULLED' : ''}</em><i>${fmtSOL(t.sol)} SOL</i><small>${fmtUSD(t.mcap * S.solPrice, { compact: true })}</small></div>`).join('');
    const md = document.getElementById('t-mood');
    if (md) md.textContent = { launch: '🚀 launch frenzy', pump: '📈 pumping', calm: '😐 ranging', dip: '📉 dipping', devsold: '🚨 panic', dead: '💀 dead' }[c._mood] || '';
    const cv = document.getElementById('t-chart');
    if (cv) {
      const rr = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      const w = Math.max(50, Math.round(rr.width * dpr)), hh = Math.max(50, Math.round(rr.height * dpr));
      if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
      drawChart(cv.getContext('2d'), c, w, hh, { axis: true, scale: dpr });
    }
  },

  app_pumpbin() {
    const d = this.draft;
    const custom = d.type === 'custom';
    const kinds = Object.keys(MEME_KINDS);
    const cost = launchCost(d);
    const err = canLaunch();
    const preview = custom ? 0 : new Coin({ name: 'x', ticker: 'x', kind: 'x' }).quoteBuy(d.devBuy);
    const maxDev = Math.max(0.01, Math.min(25, S.sol - PUMP_LAUNCH_FEE));
    if (d.devBuy > maxDev) d.devBuy = Math.max(0, +maxDev.toFixed(2));
    const vibe = S.owned.serverRack && d.name && d.ticker ? memeScoreFor(d.name, d.ticker, d.kind, S.meta) : null;
    return `<div class="pb">
      <div class="pb-head"><h2>💊 PumpBin</h2><p>Today's meta: <b class="meta">${S.meta}</b> · Market mood: <b>${S.sentiment > 1.15 ? 'euphoric' : S.sentiment < 0.8 ? 'bearish' : 'normal'}</b></p></div>
      <div class="seg"><button class="${!custom ? 'on' : ''}" data-act="dtype" data-v="pump">PumpBin launch</button><button class="${custom ? 'on' : ''}" data-act="dtype" data-v="custom" ${S.owned.kev ? '' : 'disabled'}>Custom token ${S.owned.kev ? '(Kev)' : '🔒 hire Kev'}</button></div>
      <div class="pb-grid">
        <section class="card">
          <h4>1 · The meme</h4>
          <div class="memes">${kinds.map((k) => `<button class="meme ${d.kind === k ? 'on' : ''}" data-act="kind" data-v="${k}"><img src="${memeIconURL(k, d.hue, 1, 72)}" alt="${k}"><em>${MEME_KINDS[k].label}</em>${MEME_KINDS[k].meta === S.meta ? '<i>META</i>' : ''}</button>`).join('')}</div>
          <label class="fld">Name<input id="pb-name" maxlength="24" value="${h(d.name)}" placeholder="Basement Frog" autocomplete="off"></label>
          <label class="fld">Ticker<input id="pb-ticker" maxlength="8" value="${h(d.ticker)}" placeholder="BFROG" autocomplete="off"></label>
          <div class="row2"><button class="btn" data-act="randname">🎲 Random name</button><button class="btn" data-act="rehue">🎨 New colors</button></div>
          ${vibe != null ? `<p class="hint">Analytics server virality score: <b>${Math.round(vibe * 100)}</b>/145</p>` : `<p class="hint">Names get a hidden virality roll. Coins that match today's meta get about 1.75× attention.</p>`}
        </section>
        <section class="card">
          ${custom ? `
          <h4>2 · Your pool</h4>
          <label class="fld">Seed the pool with <b id="lbl-lpsol">${fmtSOL(d.lpSol)} SOL</b><input type="range" id="pb-lpsol" min="1" max="${Math.max(1, Math.floor(Math.min(300, S.sol - CUSTOM_DEPLOY_FEE)))}" step="0.5" value="${d.lpSol}"></label>
          <label class="fld">Tokens in the pool <b id="lbl-lppct">${Math.round(d.lpPct * 100)}%</b><input type="range" id="pb-lppct" min="0.6" max="0.98" step="0.01" value="${d.lpPct}"></label>
          <p class="hint">You keep the rest as your dev bag.</p>
          <div class="seg small">${['dev', 'locked', 'burned'].map((v) => `<button class="${d.lp === v ? 'on' : ''}" data-act="dlp" data-v="${v}">${{ dev: 'Keep LP', locked: 'Lock 3 min', burned: 'Burn LP' }[v]}</button>`).join('')}</div>
          <p class="hint">Keeping LP lets you pull it (a rug), and RugRadar warns buyers about it. Burning LP earns trust and creator fees but you can't pull.</p>
          ` : `
          <h4>2 · Dev buy</h4>
          <label class="fld">Your first buy <b id="lbl-dev">${fmtSOL(d.devBuy)} SOL</b><input type="range" id="pb-dev" min="0" max="${maxDev.toFixed(2)}" step="0.01" value="${d.devBuy}"></label>
          <p class="hint" id="lbl-devtok">≈ ${fmtNum(preview)} tokens (${fmtPct(preview / SUPPLY, false)} of supply), bought at the lowest price on the curve.</p>
          <p class="hint">You also earn 0.3% of all trading volume as creator fees, whether you sell or not.</p>
          `}
        </section>
        <section class="card launch">
          <h4>3 · Launch</h4>
          <div class="preview"><img src="${memeIconURL(d.kind, d.hue, 1, 96)}" alt=""><div><b id="pv-name">${h(d.name || 'Unnamed')}</b><span id="pv-tick">$${h(d.ticker || '???')}</span></div></div>
          <div class="kv"><span>Total cost</span><b id="lbl-cost">${fmtSOL(cost)} SOL</b></div>
          <div class="kv"><span>Your SOL</span><b>${fmtSOL(S.sol)}</b></div>
          <div class="kv"><span>Energy</span><b>12</b></div>
          ${S.stats.rugs ? `<p class="warn">RugRadar will show buyers you're linked to ${S.stats.rugs} rug${S.stats.rugs > 1 ? 's' : ''}.</p>` : ''}
          ${err ? `<p class="warn">${h(err)}</p>` : ''}
          <button class="btn primary big" data-act="launch" ${err ? 'disabled' : ''}>🚀 Launch</button>
          ${S.sol < 0.05 ? '<p class="hint">Out of SOL? Buy some with cash in the Wallet app.</p>' : ''}
        </section>
      </div></div>`;
  },

  app_chirp() {
    const live = LIVE.filter((c) => c.isLive());
    if (!live.find((c) => c.id === this.chirpCoin)) this.chirpCoin = live[0]?.id ?? null;
    const pt = POST_TYPES[this.chirpType];
    const coin = live.find((c) => c.id === this.chirpCoin);
    const can = (k) => k.tier === 1 || (k.tier === 2 && S.owned.burner) || (k.tier === 3 && S.owned.rolodex);
    return `<div class="chirp">
      <section class="card profile">
        <div class="avatar">🐸</div>
        <div><b>@${h(S.handle)}</b><span>${fmtNum(S.followers)} followers · credibility ${Math.round(S.cred * 100)}%</span></div>
        <div class="reach"><label>Reach</label><b>${Math.round(shillPower() * 100)}</b></div>
      </section>
      <section class="card compose">
        <h4>New post</h4>
        <div class="chips">${Object.entries(POST_TYPES).map(([k, v]) => `<button class="chip ${this.chirpType === k ? 'on' : ''}" data-act="ptype" data-v="${k}">${v.label}</button>`).join('')}</div>
        <p class="hint">${h(pt.hint)} Costs ${pt.stamina} energy${pt.costSol ? ` and ${pt.costSol} SOL` : ''}.</p>
        ${pt.needsCoin ? (live.length ? `<div class="chips">${live.map((c) => `<button class="chip ${c.id === this.chirpCoin ? 'on' : ''}" data-act="ccoin" data-id="${c.id}">${coinIcon(c, 16)} $${h(c.ticker)}</button>`).join('')}</div>` : `<p class="warn">No live coin to post about. Shitposts grow your following.</p>`) : ''}
        <button class="btn primary" data-act="post" ${pt.needsCoin && !coin ? 'disabled' : ''}>Post</button>
      </section>
      <section class="card">
        <h4>Paid promotion</h4>
        <div class="kols">${KOLS.map((k, i) => `<div class="kol ${can(k) ? '' : 'locked'}"><b>${h(k.handle)}</b><span>${fmtNum(k.followers)} followers</span><em>${fmtSOL(k.price)} SOL</em><button class="btn small" data-act="kol" data-i="${i}" ${!coin || !can(k) ? 'disabled' : ''}>${can(k) ? 'Hire' : k.tier === 2 ? 'Needs 2nd phone' : 'Needs rolodex'}</button></div>`).join('')}</div>
        <p class="hint">KOLs buy before they post and sell into their own followers. Some take the money and run.</p>
      </section>
      <section class="card timeline"><h4>Your posts</h4><div id="c-posts"></div></section>
      <section class="card timeline"><h4>Notifications</h4><div>${S.feed.slice(0, 12).map((f) => `<div class="fpost ${f.kind || ''}"><b>${h(f.who)}</b><p>${h(f.text)}</p></div>`).join('') || '<p class="mut">Nothing yet.</p>'}</div></section>
    </div>`;
  },
  live_chirp() {
    const el = document.getElementById('c-posts'); if (!el) return;
    el.innerHTML = S.posts.slice(0, 8).map((p) => {
      const e = 1 - Math.pow(1 - clamp(p.age / 25, 0, 1), 2);
      return `<div class="post ${p.viral ? 'viral' : ''} ${p.ratioed ? 'ratio' : ''}"><div class="ph"><b>@${h(S.handle)}</b><span>${h(POST_TYPES[p.type].label)}${p.viral ? ' · 🔥 viral' : ''}${p.ratioed ? ' · ratioed' : ''}</span></div><p>${h(p.text)}</p><div class="eng"><span>👁 ${fmtNum(p.impressions * e)}</span><span>♥ ${fmtNum(p.likes * e)}</span><span>🔁 ${fmtNum(p.reposts * e)}</span><span>💬 ${fmtNum(p.replies * e)}</span><span class="${p.gain >= 0 ? 'up' : 'down'}">${p.gain >= 0 ? '+' : ''}${Math.round(p.gain * e)} followers</span></div></div>`;
    }).join('') || `<p class="mut">No posts yet. With ${S.followers} followers nobody's listening. Shitpost to grow.</p>`;
  },

  app_tele() {
    const c = focusCoin();
    if (!c) return `<div class="empty"><h2>No community yet</h2><p>Every coin gets a Tele group when it launches.</p></div>`;
    return `${this.coinTabs()}<div class="tele"><section class="card chat"><h4>$${h(c.ticker)} community <small id="tl-count"></small></h4><div id="tl-msgs" class="msgs"></div></section>
      <section class="card"><h4>Post as dev</h4><div class="row2"><button class="btn" data-act="tele" data-k="calm">😌 "Relax, it's a shakeout"</button><button class="btn" data-act="tele" data-k="hype">🚀 Hype the community</button></div>
      <p class="hint">Calm posts cool down panic sellers. Hype posts bring a little attention.</p></section></div>`;
  },
  live_tele() {
    const c = focusCoin(); const el = document.getElementById('tl-msgs'); if (!c || !el) return;
    if (el.dataset.n == c.chat.length && el.dataset.id == c.id) return;
    el.dataset.n = c.chat.length; el.dataset.id = c.id;
    el.innerHTML = c.chat.slice(-40).map((m) => `<div class="msg ${m.kind}"><b>${h(m.who)}</b><span>${h(m.text)}</span></div>`).join('');
    el.scrollTop = el.scrollHeight;
    const cnt = document.getElementById('tl-count'); if (cnt) cnt.textContent = `${c.holderCount()} holders`;
  },

  app_radar() {
    const c = focusCoin();
    if (!c) return `<div class="empty"><h2>RugRadar</h2><p>Scans coins the way buyers do. Launch a coin to see what they see.</p></div>`;
    return `${this.coinTabs()}<div class="radar"><section class="card score"><div class="dial" id="r-dial"></div><div><h3>$${h(c.ticker)} risk score</h3><p>Careful buyers check this before they ape. A higher score means fewer and smaller buys from smart wallets.</p></div></section><section class="card"><div id="r-flags"></div></section></div>`;
  },
  live_radar() {
    const c = focusCoin(); if (!c) return;
    const r = c.risk();
    const d = document.getElementById('r-dial');
    if (d) d.innerHTML = `<b class="r${r.score > 45 ? 3 : r.score > 20 ? 2 : 1}">${r.score}</b><span>${r.score > 45 ? 'Danger' : r.score > 20 ? 'Caution' : 'Looks OK'}</span>`;
    const f = document.getElementById('r-flags');
    const sig = r.flags.map((x) => x.label).join('|');
    if (f && f.dataset.sig !== sig) { f.dataset.sig = sig; f.innerHTML = r.flags.map((x) => `<div class="flag ${x.level}"><i></i><div><b>${h(x.label)}</b><p>${h(x.detail)}</p></div></div>`).join(''); }
  },

  app_wallet() {
    return `<div class="wallet">
      <section class="card bal"><div><label>SOL</label><b>${fmtSOL(S.sol)}</b><span>${usdOf(S.sol)}</span></div><div><label>Cash</label><b>${fmtUSD(S.cash)}</b></div><div><label>SOL price</label><b>${fmtUSD(S.solPrice)}</b></div><div><label>Net worth</label><b>${fmtUSD(netWorth())}</b></div></section>
      <div class="pb-grid two">
      <section class="card"><h4>Cash out</h4><p class="hint">Sell SOL for dollars to spend in the Shop. 1.5% fee.</p>
        <div class="row3"><button class="btn" data-act="cashout" data-f="0.25">25%</button><button class="btn" data-act="cashout" data-f="0.5">50%</button><button class="btn primary" data-act="cashout" data-f="1">All</button></div></section>
      <section class="card"><h4>Buy SOL</h4><p class="hint">Turn cash back into SOL for launches and KOLs. 2% fee.</p>
        <div class="row3"><button class="btn" data-act="buysol" data-u="20">$20</button><button class="btn" data-act="buysol" data-u="100">$100</button><button class="btn" data-act="buysol" data-u="1000">$1,000</button></div></section>
      </div>
      <section class="card"><h4>Activity</h4>${S.log.slice(0, 14).map((l) => `<div class="logl"><span>Day ${l.day}</span>${h(l.text)}</div>`).join('') || '<p class="mut">Nothing yet.</p>'}</section>
    </div>`;
  },

  app_shop() {
    const cats = ['All', ...new Set(ITEMS.map((i) => i.cat))];
    const list = ITEMS.filter((i) => this.shopCat === 'All' || i.cat === this.shopCat);
    return `<div class="shop"><div class="pb-head"><h2>🛒 Shop</h2><p>Cash <b>${fmtUSD(S.cash)}</b> · Fridge: ${S.drinks} drink${S.drinks === 1 ? '' : 's'} · Net worth ${fmtUSD(netWorth())}</p></div>
      <div class="chips">${cats.map((c) => `<button class="chip ${this.shopCat === c ? 'on' : ''}" data-act="shopcat" data-v="${c}">${c}</button>`).join('')}</div>
      <div class="items">${list.map((it) => {
        const owned = !it.consumable && S.owned[it.id];
        const locked = it.req && !S.owned[it.req];
        return `<div class="item ${owned ? 'owned' : ''}"><div class="ih"><b>${h(it.name)}</b><span class="cat">${it.cat}</span></div><p>${h(it.desc)}</p><div class="buyrow"><em>${fmtUSD(it.price)}</em>${owned ? '<span class="own">Owned</span>' : `<button class="btn ${S.cash >= it.price && !locked ? 'primary' : ''}" data-act="buy" data-id="${it.id}" ${S.cash < it.price || locked ? 'disabled' : ''}>${locked ? 'Locked' : 'Buy'}</button>`}</div></div>`;
      }).join('')}</div></div>`;
  },

  app_wiki() {
    const a = WIKI.find((w) => w.id === this.wikiId) || WIKI[0];
    return `<div class="wiki"><nav>${WIKI.map((w) => `<button class="${w.id === a.id ? 'on' : ''}" data-act="wiki" data-id="${w.id}">${h(w.title)}</button>`).join('')}</nav><article><h2>${h(a.title)}</h2>${a.body}</article></div>`;
  },

  app_history() {
    const st = S.stats;
    return `<div class="hist"><section class="card bal"><div><label>Launched</label><b>${st.launched}</b></div><div><label>Graduated</label><b>${st.graduated}</b></div><div><label>Rugs</label><b>${st.rugs}</b></div><div><label>Creator fees</label><b>${fmtSOL(st.feesSol)} SOL</b></div><div><label>Bagholders left</label><b>${fmtNum(st.victims)}</b></div><div><label>Best rug</label><b>${fmtUSD(st.bestRug)}</b></div></section>
      <section class="card tablewrap"><table><thead><tr><th>Coin</th><th>Day</th><th>Peak mcap</th><th>Outcome</th><th>Profit</th></tr></thead><tbody>
      ${S.history.map((r) => `<tr><td>${coinIcon(r, 18)} $${h(r.ticker)}</td><td>${r.day}</td><td>${fmtUSD(r.peakMcapUsd, { compact: true })}</td><td>${r.rugged ? 'Rugged (' + (METHOD_LABEL[r.method] || r.method) + ')' : r.graduated ? 'Graduated' : METHOD_LABEL[r.method] || 'Closed'}</td><td class="${r.profit >= 0 ? 'up' : 'down'}">${r.profit >= 0 ? '+' : ''}${fmtSOL(r.profit)}</td></tr>`).join('') || '<tr><td colspan="5" class="mut">No coins yet.</td></tr>'}
      </tbody></table></section></div>`;
  },

  // ---------------- phone (quick actions anywhere) ----------------
  togglePhone(force) {
    this.phoneOpen = force ?? !this.phoneOpen;
    $('#phone').hidden = !this.phoneOpen;
    if (this.phoneOpen) this.renderPhone();
  },
  renderPhone() {
    const c = focusCoin();
    $('#phone').innerHTML = `<div class="ph-top"><b>${clockText()}</b><span>${fmtSOL(S.sol)} SOL · ${fmtUSD(S.cash)}</span></div>
      ${c ? `<div class="ph-coin">${coinIcon(c, 34)}<div><b>$${h(c.ticker)}</b><span id="ph-mc"></span></div></div><canvas id="ph-chart" width="300" height="140"></canvas>
      <div class="row3"><button class="btn sell" data-act="sell" data-frac="0.25">Sell 25%</button><button class="btn" data-act="claim">Fees</button><button class="btn" data-act="quickpost">🐦 Shill</button></div>` : '<p class="mut">No live coin. Head to the PC to launch one.</p>'}
      <div class="ph-feed">${S.feed.slice(0, 4).map((f) => `<p class="${f.kind || ''}"><b>${h(f.who)}</b> ${h(f.text)}</p>`).join('')}</div>
      <p class="hint">${this.ctx.player.isTouch ? 'Tap 📱 to close' : 'Tab to close'}</p>`;
    this.livePhone();
  },
  livePhone() {
    const c = focusCoin(); if (!c) return;
    const e = document.getElementById('ph-mc'); if (e) e.textContent = `${fmtUSD(c.mcapSol() * S.solPrice)} mcap · ${c.holderCount()} holders`;
    const cv = document.getElementById('ph-chart'); if (cv) drawChart(cv.getContext('2d'), c, cv.width, cv.height, { max: 50 });
  },

  // ---------------- input ----------------
  onInput(e) {
    const t = e.target, d = this.draft;
    if (t.id === 'pb-name') { d.name = t.value; const p = document.getElementById('pv-name'); if (p) p.textContent = d.name || 'Unnamed'; return; }
    if (t.id === 'pb-ticker') { d.ticker = t.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); t.value = d.ticker; const p = document.getElementById('pv-tick'); if (p) p.textContent = '$' + (d.ticker || '???'); return; }
    const map = { 'pb-dev': 'devBuy', 'pb-lpsol': 'lpSol', 'pb-lppct': 'lpPct' };
    if (map[t.id]) {
      d[map[t.id]] = parseFloat(t.value);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('lbl-dev', fmtSOL(d.devBuy) + ' SOL'); set('lbl-lpsol', fmtSOL(d.lpSol) + ' SOL'); set('lbl-lppct', Math.round(d.lpPct * 100) + '%');
      if (t.id === 'pb-dev') { const tk = new Coin({ name: 'x', ticker: 'x', kind: 'x' }).quoteBuy(d.devBuy); set('lbl-devtok', `≈ ${fmtNum(tk)} tokens (${fmtPct(tk / SUPPLY, false)} of supply), bought at the lowest price on the curve.`); }
      set('lbl-cost', fmtSOL(launchCost(d)) + ' SOL');
    }
  },
  act(fn) { const err = fn(); if (err) { this.toast(err, 'bad'); AUDIO.sfx('error'); } return !err; },
  onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const a = b.dataset.act, d = this.draft, c = focusCoin();
    AUDIO.sfx('click');
    switch (a) {
      case 'app': this.app = b.dataset.app; this.renderPC(); break;
      case 'close-pc': this.ctx.leavePC(); break;
      case 'focus': FOCUS = +b.dataset.id; this.renderApp(); break;
      case 'dtype': d.type = b.dataset.v; this.renderAppKeep(); break;
      case 'kind': d.kind = b.dataset.v; this.renderAppKeep(); break;
      case 'dlp': d.lp = b.dataset.v; this.renderAppKeep(); break;
      case 'rehue': d.hue = randi(0, 359); this.renderAppKeep(); break;
      case 'randname': {
        const nb = NAME_B[d.kind] || ['Coin'];
        d.name = `${pick(NAME_A)} ${pick(nb)}`;
        d.ticker = (chance(0.5) ? pick(nb) : d.name.split(' ').map((w) => w[0]).join('') + pick(nb).slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        this.renderAppKeep(); break;
      }
      case 'launch':
        if (this.act(() => launchCoin(d))) {
          AUDIO.sfx('launch');
          this.toast(`$${focusCoin().ticker} is live!`, 'good');
          this.draft = { ...this.newDraft(), type: d.type, devBuy: d.devBuy, lpSol: d.lpSol, lpPct: d.lpPct, lp: d.lp };
          this.app = 'terminal'; this.renderPC();
        }
        break;
      case 'sell': {
        if (!c) break;
        const frac = +b.dataset.frac;
        const after = c.dev.soldFrac + (c.dev.main.tokens * frac) / Math.max(1, c.dev.main.start);
        const doSell = () => { const sol = devSell(c, frac); if (sol > 0) { AUDIO.sfx('cash'); this.toast(`Sold for ${fmtSOL(sol)} SOL (${usdOf(sol)})`, 'good'); } this.renderAppKeep(); if (this.phoneOpen) this.renderPhone(); };
        if (!c.rugged && after >= 0.5 && c.holderCount() > 3) this.confirm(`<h3>Rug $${h(c.ticker)}?</h3><p>Selling past half your bag dumps on ${c.holderCount() - 1} holders. They'll call you out: expect to lose followers and credibility, and RugRadar will flag your next coins.</p>`, 'Dump it', doSell);
        else doSell();
        break;
      }
      case 'claim': if (c && this.act(() => claimFees(c))) { AUDIO.sfx('cash'); this.renderAppKeep(); if (this.phoneOpen) this.renderPhone(); } break;
      case 'pull':
        if (c) this.confirm(`<h3>Pull the liquidity?</h3><p>You take the ${fmtSOL(c.poolSol)} SOL in the pool. Every holder's tokens become unsellable. This is a hard rug: big unfollow wave incoming.</p>`, 'Pull it', () => { const sol = pullLP(c); this.toast(`Pulled ${fmtSOL(sol)} SOL (${usdOf(sol)})`, 'bad'); this.renderAppKeep(); });
        break;
      case 'lock': if (c?.lockLP(+b.dataset.sec)) this.renderAppKeep(); break;
      case 'burn': if (c) this.confirm(`<h3>Burn the LP?</h3><p>Nobody can ever pull this pool, including you. Buyers trust it more and you keep earning creator fees.</p>`, 'Burn it', () => { c.burnLP(); this.renderAppKeep(); }); break;
      case 'close-coin':
        if (c) {
          const doClose = () => { const r = closeCoin(c); this.toast(`Closed $${r.ticker}: ${r.profit >= 0 ? '+' : ''}${fmtSOL(r.profit)} SOL`, r.profit >= 0 ? 'good' : 'bad'); this.renderPC(); };
          if (c.isLive() && c.dev.main.tokens > 1 && c.quoteSell(c.dev.main.tokens) > 0.01) this.confirm(`<h3>Walk away from $${h(c.ticker)}?</h3><p>Your remaining bag (worth about ${fmtSOL(c.quoteSell(c.dev.main.tokens))} SOL right now) stays in the coin. Unclaimed creator fees are claimed automatically.</p>`, 'Close it', doClose);
          else doClose();
        }
        break;
      case 'ptype': this.chirpType = b.dataset.v; this.renderAppKeep(); break;
      case 'ccoin': this.chirpCoin = +b.dataset.id; this.renderAppKeep(); break;
      case 'post': this.act(() => postChirp(this.chirpType, LIVE.find((x) => x.id === this.chirpCoin))); break;
      case 'quickpost': if (this.act(() => postChirp('shill', c))) this.renderPhone(); break;
      case 'kol': if (this.act(() => hireKol(LIVE.find((x) => x.id === this.chirpCoin), KOLS[+b.dataset.i]))) this.renderAppKeep(); break;
      case 'tele': if (c) { c.telePost(b.dataset.k); this.live(true); } break;
      case 'cashout': if (this.act(() => cashOut(S.sol * +b.dataset.f))) { AUDIO.sfx('cash'); this.renderAppKeep(); } break;
      case 'buysol': if (this.act(() => buySol(+b.dataset.u))) { AUDIO.sfx('buy'); this.renderAppKeep(); } break;
      case 'shopcat': this.shopCat = b.dataset.v; this.renderAppKeep(); break;
      case 'buy': {
        const it = ITEM[b.dataset.id];
        const go = () => { if (this.act(() => buyItem(it.id))) { AUDIO.sfx('buy'); this.toast(`Bought ${it.name}`, 'good'); this.renderAppKeep(); } };
        if (it.price >= 10000) this.confirm(`<h3>Buy ${h(it.name)}?</h3><p>${fmtUSD(it.price)}. ${h(it.desc)}</p>`, 'Buy', go); else go();
        break;
      }
      case 'wiki': this.wikiId = b.dataset.id; this.renderApp(); break;
    }
  },

  // ---------------- crew dialog ----------------
  openDialog(person, lines, topics) {
    const d = $('#dialog');
    d.innerHTML = `<div class="dbox"><div class="dwho"><b>${h(person.spec.name)}</b><span>${h(person.spec.role)}</span></div><p>${h(lines)}</p><div class="dtopics">${topics.map(([id, label]) => `<button class="btn ${id === 'bye' ? 'ghost' : ''}" data-topic="${id}">${h(label)}</button>`).join('')}</div></div>`;
    d.hidden = false;
  },
  closeDialog() { $('#dialog').hidden = true; },
};

function clockText() {
  const m = Math.floor(S.clock) % (24 * 60), hh = Math.floor(m / 60), mm = m % 60;
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
}

// Candles of market cap in USD (what memecoin screeners show)
function drawChart(ctx, coin, w, h, o = {}) {
  const sc = o.scale || 1;
  const axis = o.axis ? 64 * sc : 0;
  const pad = { l: 6 * sc, r: axis + 6 * sc, t: 10 * sc, b: (o.axis ? 18 : 6) * sc };
  ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, w, h);
  const all = coin.candles;
  const cs = all.slice(-(o.max || 90));
  if (!cs.length) return;
  const sp = S.solPrice;
  let lo = Infinity, hi = -Infinity;
  for (const c of cs) { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); }
  if (hi - lo < hi * 0.02) { hi *= 1.05; lo *= 0.95; }
  const span = hi - lo; hi += span * 0.08; lo = Math.max(0, lo - span * 0.08);
  const X = (i) => pad.l + (i + 0.5) * ((w - pad.l - pad.r) / cs.length);
  const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  ctx.strokeStyle = '#1b2029'; ctx.lineWidth = 1 * sc;
  ctx.font = `${11 * sc}px "JetBrains Mono", ui-monospace, monospace`; ctx.fillStyle = '#6f7787'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = lo + (hi - lo) * (i / 4), y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    if (axis) ctx.fillText(fmtUSD(v * sp, { compact: true }), w - axis + 2 * sc, y);
  }
  const cw = Math.max(1, ((w - pad.l - pad.r) / cs.length) * 0.66);
  cs.forEach((c, i) => {
    const up = c.c >= c.o;
    ctx.fillStyle = ctx.strokeStyle = up ? '#2fd082' : '#f04a5c';
    const x = X(i);
    ctx.lineWidth = Math.max(1, sc);
    ctx.beginPath(); ctx.moveTo(x, Y(c.h)); ctx.lineTo(x, Y(c.l)); ctx.stroke();
    const y1 = Y(Math.max(c.o, c.c)), y2 = Y(Math.min(c.o, c.c));
    ctx.fillRect(x - cw / 2, y1, cw, Math.max(1 * sc, y2 - y1));
  });
  // dev sells
  const i0 = cs[0].i;
  ctx.fillStyle = '#ffb547';
  for (const t of coin.trades) {
    if (!t.dev || t.side !== 'sell') continue;
    const k = Math.floor(t.t / CANDLE_SEC) - i0;
    if (k < 0 || k >= cs.length) continue;
    const x = X(k), y = Y(cs[k].h) - 6 * sc;
    ctx.beginPath(); ctx.moveTo(x, y + 5 * sc); ctx.lineTo(x - 4 * sc, y - 2 * sc); ctx.lineTo(x + 4 * sc, y - 2 * sc); ctx.fill();
  }
  // last price tag
  const last = cs[cs.length - 1].c, ly = Y(last);
  ctx.setLineDash([4 * sc, 4 * sc]); ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(pad.l, ly); ctx.lineTo(w - pad.r, ly); ctx.stroke(); ctx.setLineDash([]);
  if (axis) {
    ctx.fillStyle = cs[cs.length - 1].c >= cs[cs.length - 1].o ? '#2fd082' : '#f04a5c';
    ctx.fillRect(w - axis, ly - 9 * sc, axis - 2 * sc, 18 * sc);
    ctx.fillStyle = '#0b0d12'; ctx.fillText(fmtUSD(last * sp, { compact: true }), w - axis + 3 * sc, ly);
  }
}

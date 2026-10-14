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
const coinIcon = (c, size = 40) => `<img class="ci" width="${size}" height="${size}" src="${memeIconURL(c.kind, c.hue, c.id || 1, Math.max(64, size * 2))}" alt="">`;
const usdOf = (sol) => fmtUSD(sol * S.solPrice);
const usdC = (sol) => fmtUSD(sol * S.solPrice, { compact: true });

const ICONS = {
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z"/>',
  next: '<path d="M5 4v16l10-8z"/><path d="M18 4v16"/>',
  prev: '<path d="M19 4v16L9 12z"/><path d="M6 4v16"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.5-4.8.3 2.3.5 3.3 1.5 3.8C11.2 9 12 6 12 3z"/>',
  chart: '<path d="M4 20h16"/><path d="M7 17V8"/><rect x="5.5" y="10" width="3" height="5" rx=".5"/><path d="M12 14V4"/><rect x="10.5" y="6" width="3" height="5" rx=".5"/><path d="M17 18v-8"/><rect x="15.5" y="11" width="3" height="5" rx=".5"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 4-2 6 2 0 4.5-.5 6-2"/><path d="M9 15l-3-3c1-4 4.5-8.5 12-9-.5 7.5-5 11-9 12z"/><circle cx="15" cy="9" r="1.6"/>',
  chirp: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><path d="M16 15h2"/><path d="M6 6V5a2 2 0 0 1 2-2h9"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  msg: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  live: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  can: '<path d="M8 4h8l1 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6z"/><path d="M7 8h10"/>',
  pizza: '<path d="M3 6c5-3 13-3 18 0L12 21z"/><circle cx="10" cy="9" r="1"/><circle cx="14" cy="12" r="1"/>',
  rug: '<rect x="4" y="5" width="16" height="14" rx="1"/><rect x="8" y="9" width="8" height="6"/>',
  poster: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 15l3-4 2 2 3-4"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
  lamp: '<path d="M9 3h6l3 8H6z"/><path d="M12 11v8M8 21h8"/>',
  sign: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h10"/>',
  fish: '<path d="M3 12c3-5 10-6 14-2l4-3v10l-4-3c-4 4-11 3-14-2z"/><circle cx="8" cy="11" r=".8"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  joystick: '<path d="M12 6v7"/><circle cx="12" cy="5" r="2"/><rect x="4" y="13" width="16" height="7" rx="2"/>',
  vend: '<rect x="5" y="2.5" width="14" height="19" rx="1.5"/><path d="M8 6h5M8 9h5M8 12h5M16 6v6M8 17h8"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  chair: '<path d="M7 3h10v9H7z"/><path d="M5 12h14v3H5z"/><path d="M8 15l-1 6M16 15l1 6M12 15v6"/>',
  ring: '<circle cx="12" cy="10" r="6"/><circle cx="12" cy="10" r="3"/><path d="M12 16v6M9 22h6"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M9 21h6M12 17v4"/>',
  coffee: '<path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M8 3v3M12 3v3"/>',
  bed: '<path d="M3 18V7M3 13h18v5"/><path d="M21 18v-3a3 3 0 0 0-3-3H10v1"/><circle cx="7" cy="10.5" r="1.8"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  gpu: '<rect x="2.5" y="7" width="19" height="10" rx="1.5"/><circle cx="9" cy="12" r="2.5"/><circle cx="16" cy="12" r="2.5"/>',
  camera: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/>',
  server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01"/>',
  code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  car: '<path d="M3 15l2-5 4-3h6l4 3 2 5v3H3z"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/>',
  chef: '<path d="M7 14a4 4 0 0 1-1-7.8A4.5 4.5 0 0 1 12 3a4.5 4.5 0 0 1 6 3.2A4 4 0 0 1 17 14z"/><path d="M7 14v6h10v-6"/>',
  chain: '<path d="M9.5 14.5l5-5"/><path d="M11 6.5l1.5-1.5a4 4 0 0 1 5.5 5.5l-1.5 1.5"/><path d="M13 17.5l-1.5 1.5a4 4 0 0 1-5.5-5.5l1.5-1.5"/>',
  watch: '<circle cx="12" cy="12" r="6"/><path d="M12 9v3l2 1"/><path d="M9 6.5l1-4h4l1 4M9 17.5l1 4h4l1-4"/>',
  diamond: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l3 6 3-6"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
};
const ic = (n, extra = '') => `<svg class="i ${extra}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.plus}</svg>`;
const AVATAR = { Chad: ['C', '#ff8a5b', '#ffcf7a'], Kev: ['K', '#4aa8ff', '#7a6bff'], Mo: ['M', '#1fd18a', '#8af06b'], Mom: ['♥', '#ff7aa8', '#ffc0d6'] };
const av = (name, size = 30) => { const a = AVATAR[name] || [name[0] || '?', '#5b6475', '#8a93a6']; return `<span class="av" style="width:${size}px;height:${size}px;background:linear-gradient(135deg,${a[1]},${a[2]})">${h(a[0])}</span>`; };
const METHOD_LABEL = { lp: 'Liquidity pull', devdump: 'Dev dump', died: 'Died', abandoned: 'Closed' };
const NAV = [['home', 'Home', 'home'], ['trenches', 'Trenches', 'flame'], ['terminal', 'Terminal', 'chart'], ['launch', 'Launch', 'rocket'], ['chirp', 'Chirp', 'chirp'], ['radar', 'RugRadar', 'shield'], ['wallet', 'Wallet', 'wallet'], ['shop', 'Shop', 'bag'], ['messages', 'Messages', 'msg'], ['tunes', 'Tunes', 'music'], ['wiki', 'Wiki', 'book'], ['history', 'History', 'clock']];

const UI = {
  app: 'home', pcOpen: false, phoneOpen: false, draft: null, wikiId: 'memecoin', chirpCoin: null, chirpType: 'shill',
  shopCat: 'All', termTab: 'trades', tradeMode: 'buy', search: '', lastLive: 0,

  init(ctx) {
    this.ctx = ctx;
    this.draft = this.newDraft();
    for (const id of ['#pc', '#phone']) { $(id).addEventListener('click', (e) => this.onClick(e)); }
    $('#pc').addEventListener('input', (e) => this.onInput(e));
    $('#pc').addEventListener('change', (e) => this.onInput(e));
    $('#modal').addEventListener('click', (e) => { const b = e.target.closest('[data-modal]'); if (b) { AUDIO.sfx('click'); const cb = this._modalCb; this._modalCb = null; $('#modal').hidden = true; cb?.(b.dataset.modal); } });
    $('#dialog').addEventListener('click', (e) => { const b = e.target.closest('[data-topic]'); if (b) { AUDIO.sfx('click'); this.ctx.dialogTopic(b.dataset.topic); } });
    BUS.addEventListener('coinevent', (e) => this.onCoinEvent(e.detail));
    BUS.addEventListener('feed', () => { if (this.pcOpen && this.app === 'chirp') this.renderAppKeep(); });
    BUS.addEventListener('objective', () => { this.updateObjective(); AUDIO.sfx('notify'); this.toast(`Objective done. Next: ${OBJECTIVES[S.objective] || 'enjoy the view'}`, 'good'); });
    BUS.addEventListener('posted', (e) => {
      AUDIO.sfx('tweet');
      const p = e.detail.post;
      this.toast(p.viral ? `Your post went viral: ${fmtNum(p.impressions)} views, +${p.gain} followers` : p.ratioed ? `Your post got ratioed. ${p.gain} followers.` : `Posted. ${fmtNum(p.impressions)} views, ${p.gain >= 0 ? '+' : ''}${p.gain} followers`, p.viral ? 'good' : p.ratioed ? 'bad' : '');
      if (this.pcOpen && this.app === 'chirp') this.renderAppKeep();
    });
    BUS.addEventListener('rugged', (e) => { AUDIO.sfx('rug'); this.toast(`You rugged $${e.detail.coin.ticker}. -${e.detail.lost.toLocaleString()} followers.`, 'bad'); });
    BUS.addEventListener('text', (e) => { AUDIO.sfx('notify'); this.textToast(e.detail.from, e.detail.text); if (this.pcOpen) { this.renderNav(); if (this.app === 'messages') { S.unread = 0; this.renderAppKeep(); } } });
    BUS.addEventListener('gotrugged', (e) => { AUDIO.sfx('rug'); this.toast(`The $${e.detail.coin.ticker} dev rugged. Your position lost ${fmtSOL(e.detail.lost)} SOL.`, 'bad'); });
    BUS.addEventListener('sniped', (e) => this.toast(`Sniper bot bought $${e.detail.coin.ticker} in block 0.`, ''));
    BUS.addEventListener('music', (e) => {
      if (e.detail.track && this.lastTrack !== e.detail.track.id) { this.lastTrack = e.detail.track.id; if (!(this.pcOpen && this.app === 'tunes')) this.toast(`Now playing: ${e.detail.track.title} · ${e.detail.track.artist}`); }
      if (this.pcOpen && this.app === 'tunes') this.renderAppKeep(); else if (this.pcOpen) this.live(true);
    });
    BUS.addEventListener('copycat', (e) => this.toast(`Copycat launched: "${e.detail.name}". It's stealing $${e.detail.coin.ticker}'s buyers.`, 'bad'));
  },
  newDraft() {
    const kind = pick(Object.keys(MEME_KINDS).filter((k) => MEME_KINDS[k].meta === S?.meta).concat(['frog']));
    return { type: 'pump', name: '', ticker: '', kind, hue: randi(0, 359), devBuy: 0.2, lpSol: 5, lpPct: 0.85, lp: 'dev', lockSec: 180 };
  },

  // ---------------- HUD ----------------
  updateHUD() {
    if (!S) return;
    $('#h-cash').textContent = fmtUSD(S.cash);
    $('#h-sol').textContent = `${fmtSOL(S.sol)} SOL`;
    $('#h-foll').textContent = fmtNum(S.followers);
    $('#h-cred').textContent = Math.round(S.cred * 100) + '%';
    $('#h-cred').dataset.level = S.cred < 0.6 ? 'bad' : S.cred < 0.9 ? 'warn' : 'ok';
    $('#h-stam').style.width = Math.min(100, S.stamina / staminaMax() * 100) + '%';
    $('#h-stamv').textContent = Math.round(S.stamina);
    $('#h-day').textContent = `DAY ${S.day}`;
    $('#h-time').textContent = clockText();
    $('#coinbar').innerHTML = LIVE.map((c) => {
      const ph = c.priceHist, ch = ph.length > 10 ? c.price() / ph[ph.length - 11] - 1 : 0;
      return `<div class="tick ${ch >= 0 ? 'up' : 'down'}">${coinIcon(c, 18)}<b>$${h(c.ticker)}</b><span>${usdC(c.mcapSol())}</span><i>${fmtPct(ch)}</i></div>`;
    }).join('');
  },
  updateObjective() { const o = OBJECTIVES[S.objective]; $('#objective').innerHTML = o ? `<span>Objective ${S.objective + 1}/${OBJECTIVES.length}</span>${h(o)}` : ''; },
  prompt(text) {
    const p = $('#prompt'), b = $('#use-btn');
    if (!text) { p.hidden = true; b.hidden = true; return; }
    const touch = this.ctx.player.isTouch;
    p.hidden = false; p.innerHTML = touch ? h(text) : `<kbd>E</kbd> ${h(text)}`;
    b.hidden = !touch;
  },
  toast(text, kind = '') {
    const box = $('#toasts');
    const el = document.createElement('div'); el.className = 'toast ' + kind;
    el.innerHTML = `<i class="dot"></i><div>${h(text)}</div>`;
    box.prepend(el);
    while (box.children.length > 4) box.lastChild.remove();
    setTimeout(() => el.classList.add('out'), 4200); setTimeout(() => el.remove(), 4800);
  },
  textToast(from, text) {
    const box = $('#toasts');
    const el = document.createElement('div'); el.className = 'toast msg';
    el.innerHTML = `${av(from, 26)}<div><b>${h(from)}</b>${h(text)}</div>`;
    box.prepend(el);
    while (box.children.length > 4) box.lastChild.remove();
    setTimeout(() => el.classList.add('out'), 5200); setTimeout(() => el.remove(), 5800);
  },
  subtitle(who, text, ms = 4500) {
    const el = $('#subtitle');
    el.innerHTML = `<b>${h(who)}</b> ${h(text)}`; el.hidden = false;
    clearTimeout(this._subT); this._subT = setTimeout(() => (el.hidden = true), ms);
  },
  onCoinEvent({ coin, ev, mine }) {
    const kinds = mine
      ? { graduated: 'good', koth: 'good', viral: 'good', whale: '', kol: '', unlock: 'bad', dead: 'bad', fud: 'bad', revive: 'good', burn: 'good', live: 'good' }
      : { graduated: 'good', dead: 'bad', devsold: 'bad' };
    if (ev.type in kinds && ev.text) {
      this.toast(ev.text, kinds[ev.type]);
      if (['graduated', 'koth', 'viral', 'kol', 'live'].includes(ev.type)) AUDIO.sfx('notify');
    }
    if (mine) this.ctx.crewReact(ev.type, coin);
  },

  // ---------------- modal ----------------
  modal(html, buttons, cb, cls = '') {
    const m = $('#modal');
    m.innerHTML = `<div class="mbox ${cls}">${html}<div class="mbtns">${buttons.map(([id, label, k]) => `<button class="btn ${k || ''}" data-modal="${id}">${label}</button>`).join('')}</div></div>`;
    m.hidden = false; this._modalCb = cb;
  },
  confirm(html, yes, cb, kind = 'danger') { this.modal(html, [['no', 'Cancel', 'ghost'], ['yes', yes, kind]], (id) => id === 'yes' && cb()); },

  // ---------------- PC shell ----------------
  openPC(app) {
    this.pcOpen = true; if (app) this.app = app;
    $('#pc').hidden = false; document.body.classList.add('in-pc');
    this.renderPC();
    advanceObjective(0);
  },
  closePC() { this.pcOpen = false; $('#pc').hidden = true; document.body.classList.remove('in-pc'); },
  renderNav() {
    $('#pc-nav').innerHTML = NAV.map(([id, label, icon]) => `<button class="nav-btn ${this.app === id ? 'on' : ''}" data-act="app" data-app="${id}" title="${label}">${ic(icon)}<em>${label}</em>${id === 'messages' && S.unread ? `<span class="nb">${S.unread}</span>` : ''}${id === 'terminal' && LIVE.length ? `<span class="nb" style="background:var(--brand);color:var(--brand-ink)">${LIVE.length}</span>` : ''}</button>`).join('');
  },
  renderPC() { this.renderNav(); this.renderApp(); },
  renderApp() {
    if (this.app === 'messages') S.unread = 0;
    const el = $('#pc-main');
    const fn = this['app_' + this.app];
    el.innerHTML = fn ? fn.call(this) : '';
    el.scrollTop = 0;
    this._sig = null;
    this.live(true);
  },
  renderAppKeep() { const el = $('#pc-main'); const st = el.scrollTop; const fn = this['app_' + this.app]; el.innerHTML = fn ? fn.call(this) : ''; el.scrollTop = st; this._sig = null; this.live(true); },
  live(force) {
    if (!this.pcOpen && !this.phoneOpen) return;
    const now = performance.now();
    if (!force && now - this.lastLive < 250) return;
    this.lastLive = now;
    if (this.pcOpen) {
      const tr = MUSIC.track;
      $('#pc-pills').innerHTML = `<button class="pill hide-sm np-pill" data-act="music-toggle" title="${MUSIC.on ? 'Pause' : 'Play'} music">${ic(MUSIC.on ? 'pause' : 'play')}<span class="np-t">${h(tr.title)}</span></button><div class="pill hide-sm"><span class="lbl">SOL</span>${fmtUSD(S.solPrice)}</div><div class="pill"><span class="lbl">Bal</span>${fmtSOL(S.sol)}</div><div class="pill"><span class="lbl">Cash</span>${fmtUSD(S.cash)}</div><div class="pill hide-sm"><span class="lbl">Energy</span>${Math.round(S.stamina)}</div>`;
      $('#pc-clock').textContent = `Day ${S.day} · ${clockText()}`;
      const fn = this['live_' + this.app];
      if (fn) fn.call(this);
    }
    if (this.phoneOpen) this.livePhone();
  },

  // ---------------- Home ----------------
  app_home() {
    const hot = ECO.filter((c) => c.isLive()).sort((a, b) => b.mcapSol() - a.mcapSol()).slice(0, 4);
    const positions = ECO.filter((c) => (c.you()?.tokens || 0) > 0);
    const done = S.objective, total = OBJECTIVES.length;
    return `<div class="page-head"><div><h1>Good ${S.clock % 1440 < 720 ? 'morning' : 'evening'}, @${h(S.handle)}</h1><p>Day ${S.day}. ${S.meta} are the meta today, market mood is ${S.sentiment > 1.15 ? 'euphoric' : S.sentiment < 0.8 ? 'bearish' : 'normal'}.</p></div><div class="chips"><button class="btn primary" data-act="app" data-app="launch">${ic('rocket')}Launch a coin</button><button class="btn" data-act="app" data-app="trenches">${ic('flame')}Trenches</button></div></div>
    <div class="home">
      <div class="stack">
        <section class="panel"><div class="nw"><span class="lbl">Net worth</span><span class="big" id="hm-nw"></span><span id="hm-nwch" class="num"></span><canvas id="hm-spark" height="84"></canvas></div>
          <div class="stats4"><div><label>SOL</label><b id="hm-sol"></b></div><div><label>Cash</label><b id="hm-cash"></b></div><div><label>Followers</label><b id="hm-fol"></b></div><div><label>Credibility</label><b id="hm-cred"></b></div></div></section>
        <section class="panel"><div class="panel-h"><h3>Your coins</h3><span class="dim">${LIVE.length}/${maxCoins()} slots</span></div>
          ${LIVE.length ? `<div class="rowlist">${LIVE.map((c) => `<div class="row" data-act="open" data-id="${c.id}">${coinIcon(c, 34)}<div class="nm"><b>${h(c.name)}</b><span>$${h(c.ticker)} · ${c.phase === 'curve' ? `curve ${Math.round(c.progress() * 100)}%` : c.phase === 'dex' ? 'DEX' : 'rugged'}</span></div><canvas data-spark="${c.id}" width="140" height="56"></canvas><div class="rv"><span data-f="mc${c.id}"></span><small data-f="pnl${c.id}"></small></div></div>`).join('')}</div>`
          : `<div class="empty"><div class="icons">${['dogwifhat', 'frog', 'mogcat', 'hippo'].map((k, i) => `<img src="${memeIconURL(k, 40 + i * 70, 1, 80)}" width="40" height="40" alt="">`).join('')}</div><h3>No coins live</h3><p>Launch one on the launchpad. It costs about 0.02 SOL plus your first buy.</p><button class="btn primary" data-act="app" data-app="launch">${ic('rocket')}Launch a coin</button></div>`}
        </section>
        ${positions.length ? `<section class="panel"><div class="panel-h"><h3>Open positions</h3></div><div class="rowlist">${positions.map((c) => `<div class="row" data-act="open" data-id="${c.id}">${coinIcon(c, 34)}<div class="nm"><b>${h(c.name)}</b><span>$${h(c.ticker)}</span></div><div class="rv"><span data-f="pv${c.id}"></span><small data-f="pp${c.id}"></small></div></div>`).join('')}</div></section>` : ''}
      </div>
      <div class="stack">
        <section class="panel obj"><span class="lbl-sm">Objective ${Math.min(done + 1, total)} of ${total}</span><b>${h(OBJECTIVES[done] || 'All done. Enjoy the penthouse.')}</b><div class="prog"><i style="width:${done / total * 100}%"></i></div></section>
        <section class="panel"><div class="panel-h"><h3>Hot in the Trenches</h3><button class="btn ghost sm" data-act="app" data-app="trenches">View all</button></div>
          <div class="rowlist">${hot.map((c) => `<div class="row" data-act="open" data-id="${c.id}">${coinIcon(c, 30)}<div class="nm"><b>${h(c.name)}</b><span>$${h(c.ticker)} · ${fmtDur(c.t)}</span></div><div class="rv">${usdC(c.mcapSol())}<small class="dim">${c.holderCount()} holders</small></div></div>`).join('') || '<div class="empty"><p>Quiet right now.</p></div>'}</div></section>
        <section class="panel"><div class="panel-h"><h3>Messages</h3><button class="btn ghost sm" data-act="app" data-app="messages">Open</button></div>
          <div class="rowlist">${S.texts.slice(-3).reverse().map((t) => `<div class="row" data-act="app" data-app="messages">${av(t.from, 30)}<div class="nm"><b>${h(t.from)}</b><span style="white-space:normal">${h(t.text)}</span></div></div>`).join('') || '<div class="empty"><p>No messages.</p></div>'}</div></section>
      </div>
    </div>`;
  },
  live_home() {
    const nw = netWorth();
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
    set('hm-nw', fmtUSD(nw)); set('hm-sol', fmtSOL(S.sol)); set('hm-cash', fmtUSD(S.cash)); set('hm-fol', fmtNum(S.followers)); set('hm-cred', Math.round(S.cred * 100) + '%');
    const hist = S.netHist.length ? S.netHist : [nw];
    const first = hist[0] || 1, ch = nw / Math.max(1, first) - 1;
    set('hm-nwch', `<span class="${ch >= 0 ? 'up' : 'down'}">${fmtPct(ch)}</span> <span class="dim">this session</span>`);
    const cv = document.getElementById('hm-spark');
    if (cv) { const w = cv.clientWidth * 2; if (cv.width !== w) cv.width = w; cv.height = 168; drawSpark(cv.getContext('2d'), hist.concat([nw]), cv.width, cv.height, ch >= 0 ? '#1fd18a' : '#ff4d61', true); }
    for (const c of LIVE) {
      const q = c.quoteSell(c.dev.main.tokens) + c.creatorFees - c.feesClaimed, pnl = c.devProceeds + q - c.devCost - c.extraCosts;
      const a = document.querySelector(`[data-f="mc${c.id}"]`); if (a) a.textContent = usdC(c.mcapSol());
      const b = document.querySelector(`[data-f="pnl${c.id}"]`); if (b) { b.className = pnl >= 0 ? 'up' : 'down'; b.textContent = `${pnl >= 0 ? '+' : ''}${fmtSOL(pnl)} SOL`; }
      const sp = document.querySelector(`[data-spark="${c.id}"]`); if (sp) drawSpark(sp.getContext('2d'), c.priceHist.slice(-60), sp.width, sp.height, c._mood === 'dip' || c._mood === 'devsold' ? '#ff4d61' : '#1fd18a');
    }
    for (const c of ECO) {
      const y = c.you(); if (!y || y.tokens <= 0) continue;
      const v = positionValue(c), pnl = v + y.proceeds - y.cost;
      const a = document.querySelector(`[data-f="pv${c.id}"]`); if (a) a.textContent = `${fmtSOL(v)} SOL`;
      const b = document.querySelector(`[data-f="pp${c.id}"]`); if (b) { b.className = pnl >= 0 ? 'up' : 'down'; b.textContent = `${pnl >= 0 ? '+' : ''}${fmtSOL(pnl)} SOL`; }
    }
  },

  // ---------------- Trenches ----------------
  trenchCols() {
    const q = this.search.trim().toLowerCase();
    const list = allCoins().filter((c) => (c.isLive() || isMine(c) || (c.you()?.tokens || 0) > 0) && (!q || c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q)));
    const cols = { fresh: [], stretch: [], grad: [] };
    for (const c of list) (c.phase === 'curve' ? (c.progress() >= 0.4 ? cols.stretch : cols.fresh) : cols.grad).push(c);
    cols.fresh.sort((a, b) => a.t - b.t); cols.stretch.sort((a, b) => b.progress() - a.progress()); cols.grad.sort((a, b) => b.mcapSol() - a.mcapSol());
    return cols;
  },
  trenchCard(c) {
    const mine = isMine(c), hold = (c.you()?.tokens || 0) > 0;
    const prof = c.npc && (S.owned.serverRack || c.npc.step > 0 && c.npc.profile === 'rugger') ? `<span class="badge ${c.npc.profile === 'rugger' ? 'down' : c.npc.profile === 'flipper' ? 'warn' : 'up'}">${DEV_PROFILES[c.npc.profile]}</span>` : '';
    return `<div class="tcard ${mine ? 'mine' : ''} ${hold ? 'hold' : ''}" data-act="open" data-id="${c.id}">
      <div class="tc-top">${coinIcon(c, 40)}<div class="nm"><b>${h(c.name)}</b><span>$${h(c.ticker)} · <span data-f="age${c.id}">${fmtDur(c.t)}</span></span></div><div class="tc-mc"><span data-f="mc${c.id}">${usdC(c.mcapSol())}</span><small>mcap</small></div></div>
      <div class="tc-meta"><span>${ic('users')}</span><span data-f="ho${c.id}">${c.holderCount()}</span><span>vol <span data-f="vo${c.id}">${usdC(c.volume)}</span></span>${mine ? '<span class="badge brand">Yours</span>' : ''}${hold ? '<span class="badge up">Holding</span>' : ''}${c.copycatOf ? '<span class="badge warn">Copycat</span>' : ''}${prof}<span data-f="rk${c.id}"></span></div>
      ${c.phase === 'curve' ? `<div class="tc-curve"><i data-f="cv${c.id}" style="width:${c.progress() * 100}%"></i></div>` : ''}
      ${mine ? '' : `<div class="tc-act"><button class="btn buy" data-act="qbuy" data-id="${c.id}" data-sol="0.1">Buy 0.1</button><button class="btn buy" data-act="qbuy" data-id="${c.id}" data-sol="0.5">Buy 0.5</button></div>`}
    </div>`;
  },
  app_trenches() {
    const cols = this.trenchCols();
    const snipe = S.owned.sniper ? `<section class="panel" style="margin-bottom:12px"><div class="panel-b snipe"><b>${ic('target')} Sniper bot</b><span class="switch ${S.snipe.on ? 'on' : ''}" data-act="snipe-toggle" role="switch" aria-checked="${S.snipe.on}"></span><span class="mut">Auto-buy every new launch in block 0 with</span><div class="chips">${[0.05, 0.1, 0.25, 0.5].map((v) => `<button class="chip ${S.snipe.sol === v ? 'on' : ''}" data-act="snipe-amt" data-v="${v}">${v} SOL</button>`).join('')}</div></div></section>` : '';
    const col = (key, title, icon, items) => `<section class="panel tcol"><div class="panel-h"><h3>${ic(icon)} ${title}</h3><span class="dim num">${items.length}</span></div><div class="cards" data-col="${key}">${items.map((c) => this.trenchCard(c)).join('') || '<div class="empty"><p>Nothing here yet.</p></div>'}</div></section>`;
    return `<div class="page-head"><div><h1>The Trenches</h1><p>Every coin launching right now, yours included. Ape in, but check RugRadar first: some devs rug.</p></div></div>${snipe}
      <div class="trench">${col('fresh', 'New pairs', 'plus', cols.fresh)}${col('stretch', 'Final stretch', 'flame', cols.stretch)}${col('grad', 'Graduated', 'check', cols.grad)}</div>`;
  },
  live_trenches() {
    const cols = this.trenchCols();
    const sig = Object.values(cols).map((l) => l.map((c) => c.id + (c.you()?.tokens > 0 ? 'h' : '')).join(',')).join('|');
    if (sig !== this._sig) {
      for (const [k, items] of Object.entries(cols)) { const el = document.querySelector(`[data-col="${k}"]`); if (el) el.innerHTML = items.map((c) => this.trenchCard(c)).join('') || '<div class="empty"><p>Nothing here yet.</p></div>'; }
      this._sig = sig;
    }
    for (const items of Object.values(cols)) for (const c of items) {
      const f = (k, v) => { const e = document.querySelector(`[data-f="${k}${c.id}"]`); if (e) e.innerHTML = v; };
      f('mc', usdC(c.mcapSol())); f('age', fmtDur(c.t)); f('ho', c.holderCount()); f('vo', usdC(c.volume));
      const r = c.risk().score; f('rk', `<span class="risk r${r > 45 ? 3 : r > 20 ? 2 : 1}">risk ${r}</span>`);
      const cv = document.querySelector(`[data-f="cv${c.id}"]`); if (cv) cv.style.width = c.progress() * 100 + '%';
    }
  },

  // ---------------- Terminal ----------------
  app_terminal() {
    const c = focusCoin();
    if (!c) return `<div class="page-head"><div><h1>Terminal</h1><p>Charts and trading for any coin.</p></div></div><section class="panel"><div class="empty"><div class="icons">${['frog', 'shiba', 'popcat'].map((k, i) => `<img src="${memeIconURL(k, 120 + i * 80, 1, 80)}" width="40" height="40" alt="">`).join('')}</div><h3>Nothing selected</h3><p>Launch a coin or pick one from the Trenches.</p><div class="chips"><button class="btn primary" data-act="app" data-app="launch">${ic('rocket')}Launch</button><button class="btn" data-act="app" data-app="trenches">${ic('flame')}Trenches</button></div></div></section>`;
    FOCUS = c.id;
    const mine = isMine(c);
    const tabsCoins = LIVE.length > 1 || (!mine && LIVE.length) ? `<div class="chips" style="margin-bottom:12px">${LIVE.map((x) => `<button class="chip ${x.id === c.id ? 'on' : ''}" data-act="focus" data-id="${x.id}">${coinIcon(x, 18)}$${h(x.ticker)}</button>`).join('')}${!mine ? `<button class="chip on">${coinIcon(c, 18)}$${h(c.ticker)}</button>` : ''}</div>` : '';
    return `${tabsCoins}
    <div class="tk-head">${coinIcon(c, 52)}
      <div class="tk-name"><h2>${h(c.name)} <span id="t-badges"></span></h2><div class="sub"><span>$${h(c.ticker)}</span><span class="ca" data-act="copy-ca" title="Copy contract address">${ic('copy')}${shortAddr(c.addr)}</span><span id="t-age"></span></div></div>
      <div class="tk-stats"><div class="stat"><label>Market cap</label><b class="num" id="t-mcap"></b></div><div class="stat"><label>Price</label><b class="num" id="t-price"></b></div><div class="stat"><label>Liquidity</label><b class="num" id="t-liq"></b></div><div class="stat"><label>Volume</label><b class="num" id="t-vol"></b></div><div class="stat"><label>Holders</label><b class="num" id="t-hold"></b></div><div class="stat"><label>Risk</label><b id="t-risk"></b></div></div>
    </div>
    <div class="tk-grid">
      <div class="stack">
        <section class="panel chart-panel"><div class="chart-bar"><b class="mut">$${h(c.ticker)}/SOL</b><span>Market cap · 3s candles</span><span class="sp"></span><span id="t-mood"></span></div><div class="chart-wrap"><canvas id="t-chart"></canvas></div>
          <div class="curve-row" id="t-curvewrap"><span>Bonding curve</span><div class="prog"><i id="t-curve"></i></div><span class="num" id="t-curvetxt"></span></div></section>
        <section class="panel"><div class="tabs">${['trades', 'holders', 'chat'].map((t) => `<button class="tab ${this.termTab === t ? 'on' : ''}" data-act="ttab" data-v="${t}">${{ trades: 'Trades', holders: 'Holders', chat: 'Community' }[t]}</button>`).join('')}</div><div id="t-tab"></div>
          ${this.termTab === 'chat' && mine ? `<div class="panel-b" style="border-top:1px solid var(--line)"><div class="grid-btns" style="--n:2"><button class="btn" data-act="tele" data-k="calm">Post: "Relax, just a shakeout"</button><button class="btn" data-act="tele" data-k="hype">Post: hype the community</button></div></div>` : ''}</section>
      </div>
      <div class="stack">${mine ? this.devPanel(c) : this.traderPanel(c)}</div>
    </div>`;
  },
  devPanel(c) {
    const custom = c.type === 'custom';
    const m = this.tradeMode === 'sell' ? 'sell' : 'buy';
    return `<section class="panel trade-box"><div class="panel-h"><h3>Your bag</h3><span class="badge brand">Dev wallet</span></div>
      <div class="panel-b"><div class="pos"><div><label>Bag</label><b id="t-bag"></b></div><div><label>Worth if sold</label><b id="t-quote"></b></div><div><label>Creator fees</label><b id="t-fees"></b></div><div><label>Net P&amp;L</label><b id="t-pnl"></b></div></div>
      <div class="meter" id="t-meter"><div class="prog"><i id="t-rugbar"></i></div><span id="t-rugtxt"></span></div></div>
      <div class="seg"><button class="${m === 'buy' ? 'on b' : ''}" data-act="tmode" data-v="buy">Buy more</button><button class="${m === 'sell' ? 'on s' : ''}" data-act="tmode" data-v="sell">Take profit</button></div>
      <div class="panel-b">${m === 'buy'
        ? `<div class="grid-btns" style="--n:4">${[0.1, 0.25, 0.5, 1].map((v) => `<button class="btn buy" data-act="devbuy" data-sol="${v}">${v} SOL</button>`).join('')}</div><p class="hint">Buying your own coin pushes the chart, adds volume and shows holders you believe in it. Your bag gets bigger on RugRadar too.</p>`
        : `<div class="grid-btns" style="--n:4"><button class="btn sell" data-act="sell" data-frac="0.1">10%</button><button class="btn sell" data-act="sell" data-frac="0.25">25%</button><button class="btn sell" data-act="sell" data-frac="0.5">50%</button><button class="btn danger" data-act="sell" data-frac="1">All</button></div><p class="hint">Selling past half your bag counts as a rug: holders call you out and followers leave.</p>`}
        <button class="btn block" style="margin-top:10px" data-act="claim" id="t-claim">${ic('wallet')}Claim creator fees</button></div></section>
      ${custom ? `<section class="panel"><div class="panel-h"><h3>Liquidity pool</h3><span id="t-pool" class="num mut"></span></div><div class="panel-b"><div class="grid-btns" style="--n:2" id="t-custom"></div></div></section>` : ''}
      <section class="panel"><div class="panel-h"><h3>Promote</h3></div><div class="panel-b"><div class="grid-btns" style="--n:2"><button class="btn info" data-act="promo-post">${ic('chirp')}Post on Chirp</button><button class="btn" data-act="promo-kol">${ic('users')}Hire a KOL</button></div>
        ${S.owned.stream ? `<button class="btn block" style="margin-top:6px" data-act="golive" ${c.wentLive ? 'disabled' : ''}>${ic('live')}${c.wentLive ? 'Already streamed this coin' : 'Go live on stream (25 energy)'}</button>` : ''}
        <button class="btn ghost block" style="margin-top:6px" data-act="close-coin">${ic('logout')}Close coin</button></div></section>`;
  },
  traderPanel(c) {
    const m = this.tradeMode === 'sell' ? 'sell' : 'buy';
    const hold = (c.you()?.tokens || 0) > 0;
    return `<section class="panel trade-box"><div class="panel-h"><h3>Trade</h3>${c.sniped ? '<span class="badge info">Sniped</span>' : ''}</div>
      <div class="panel-b"><div class="pos"><div><label>Holding</label><b id="t-hold2"></b></div><div><label>Value</label><b id="t-val"></b></div><div><label>Cost</label><b id="t-cost"></b></div><div><label>P&amp;L</label><b id="t-tpnl"></b></div></div></div>
      <div class="seg"><button class="${m === 'buy' ? 'on b' : ''}" data-act="tmode" data-v="buy">Buy</button><button class="${m === 'sell' ? 'on s' : ''}" data-act="tmode" data-v="sell">Sell</button></div>
      <div class="panel-b">${m === 'buy'
        ? `<div class="grid-btns" style="--n:3">${[0.05, 0.1, 0.25, 0.5, 1, 2].map((v) => `<button class="btn buy" data-act="tbuy" data-sol="${v}">${v} SOL</button>`).join('')}</div>`
        : `<div class="grid-btns" style="--n:3"><button class="btn sell" data-act="tsell" data-frac="0.25" ${hold ? '' : 'disabled'}>25%</button><button class="btn sell" data-act="tsell" data-frac="0.5" ${hold ? '' : 'disabled'}>50%</button><button class="btn sell" data-act="tsell" data-frac="1" ${hold ? '' : 'disabled'}>100%</button></div>`}
        ${!c.isLive() && hold ? `<button class="btn ghost block" style="margin-top:8px" data-act="writeoff">Write off (no liquidity left)</button>` : ''}</div></section>
      <section class="panel"><div class="panel-h"><h3>RugRadar</h3><button class="btn ghost sm" data-act="app" data-app="radar">Full report</button></div><div id="t-flags"></div></section>`;
  },
  live_terminal() {
    const c = focusCoin(); if (!c) return;
    const sp = S.solPrice, mine = isMine(c);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
    set('t-mcap', fmtUSD(c.mcapSol() * sp));
    set('t-price', '$' + fmtPrice(c.price() * sp));
    set('t-liq', fmtUSD(c.liquiditySol() * sp, { compact: true }));
    set('t-vol', fmtUSD(c.volume * sp, { compact: true }));
    set('t-hold', c.holderCount());
    const r = c.risk();
    set('t-risk', `<span class="risk r${r.score > 45 ? 3 : r.score > 20 ? 2 : 1}">${r.score}</span>`);
    const phase = c.phase === 'curve' ? '<span class="badge info">Bonding curve</span>' : c.phase === 'dex' ? (c.type === 'custom' ? '<span class="badge brand">Custom pool</span>' : '<span class="badge up">Graduated</span>') : '<span class="badge down">Rugged</span>';
    const prof = c.npc && (S.owned.serverRack || (c.npc.step > 0 && c.npc.profile === 'rugger')) ? `<span class="badge ${c.npc.profile === 'rugger' ? 'down' : c.npc.profile === 'flipper' ? 'warn' : 'up'}">Dev: ${DEV_PROFILES[c.npc.profile]}</span>` : '';
    set('t-badges', phase + (mine ? ' <span class="badge brand">Your coin</span>' : '') + (c.dead ? ' <span class="badge">Dead</span>' : '') + (prof ? ' ' + prof : ''));
    set('t-age', fmtDur(c.t) + ' old');
    const cw = document.getElementById('t-curvewrap');
    if (cw) { cw.hidden = c.phase !== 'curve'; set('t-curvetxt', `${Math.round(c.progress() * 100)}% → ${usdC(410)}`); const b = document.getElementById('t-curve'); if (b) b.style.width = c.progress() * 100 + '%'; }
    set('t-mood', { launch: 'Launch frenzy', pump: '<span class="up">Pumping</span>', calm: 'Ranging', dip: '<span class="down">Dipping</span>', devsold: '<span class="down">Panic</span>', dead: 'Dead' }[c._mood] || '');
    if (mine) {
      const tok = c.dev.main.tokens, q = c.isLive() ? c.quoteSell(tok) : 0, fees = c.creatorFees - c.feesClaimed;
      const pnl = c.devProceeds + q + fees - c.devCost - c.extraCosts;
      set('t-bag', `${fmtNum(tok)} <small class="dim">${fmtPct(tok / c.supply, false)}</small>`);
      set('t-quote', `${fmtSOL(q)} <small class="dim">SOL</small>`);
      set('t-fees', `${fmtSOL(fees)} <small class="dim">SOL</small>`);
      set('t-pnl', `<span class="${pnl >= 0 ? 'up' : 'down'}">${pnl >= 0 ? '+' : ''}${fmtSOL(pnl)}</span>`);
      const claim = document.getElementById('t-claim'); if (claim) claim.disabled = fees < 0.0005;
      const sold = Math.min(1, c.dev.soldFrac);
      const mt = document.getElementById('t-meter'); if (mt) mt.dataset.level = c.rugged ? 'bad' : sold > 0.3 ? 'warn' : 'ok';
      const rb = document.getElementById('t-rugbar'); if (rb) rb.style.width = Math.max(2, sold * 100) + '%';
      set('t-rugtxt', c.rugged ? 'You rugged this coin.' : `Sold ${Math.round(sold * 100)}% of your bag · rug line at 50%`);
      if (c.type === 'custom') {
        set('t-pool', `${fmtSOL(c.poolSol)} SOL`);
        const cc = document.getElementById('t-custom');
        const sig = [c.lp, c.phase, Math.ceil(Math.max(0, c.lockUntil - c.t) / 5)].join();
        if (cc && cc.dataset.sig !== sig) {
          cc.dataset.sig = sig;
          let b = '';
          if (c.phase !== 'dex') b = '<span class="mut">The pool is empty.</span>';
          else if (c.lp === 'dev') b = `<button class="btn danger" data-act="pull">Pull liquidity</button><button class="btn" data-act="burn">Burn LP</button><button class="btn" data-act="lock" data-sec="120">${ic('lock')}Lock 2 min</button><button class="btn" data-act="lock" data-sec="300">${ic('lock')}Lock 5 min</button>`;
          else if (c.lp === 'locked') b = `<button class="btn" disabled>${ic('lock')}Locked · ${fmtDur(c.lockUntil - c.t)}</button>`;
          else b = '<span class="mut">LP burned. Nobody can pull it, including you.</span>';
          cc.innerHTML = b;
        }
      }
    } else {
      const y = c.you(), tok = y?.tokens || 0, v = positionValue(c);
      const cost = y ? y.cost - (y.costBooked || 0) : 0, pnl = y ? v + y.proceeds - y.cost : 0;
      set('t-hold2', tok > 0 ? `${fmtNum(tok)}` : '—');
      set('t-val', tok > 0 ? `${fmtSOL(v)} <small class="dim">SOL</small>` : '—');
      set('t-cost', y ? `${fmtSOL(cost)} <small class="dim">SOL</small>` : '—');
      set('t-tpnl', y ? `<span class="${pnl >= 0 ? 'up' : 'down'}">${pnl >= 0 ? '+' : ''}${fmtSOL(pnl)}</span>` : '—');
      const fl = document.getElementById('t-flags');
      const fsig = r.flags.map((x) => x.label).join('|');
      if (fl && fl.dataset.sig !== fsig) { fl.dataset.sig = fsig; fl.innerHTML = r.flags.filter((x) => x.level !== 'ok').slice(0, 4).map((x) => `<div class="flag ${x.level}"><i></i><div><b>${h(x.label)}</b></div></div>`).join('') || '<div class="flag ok"><i></i><div><b>No red flags right now</b><p>That can change the moment the dev sells.</p></div></div>'; }
    }
    // bottom tab
    const tab = document.getElementById('t-tab');
    if (tab) {
      if (this.termTab === 'trades') tab.innerHTML = `<div class="trades">${c.trades.slice(-14).reverse().map((t) => `<div class="trade ${t.side}${t.dev ? ' dev' : ''}${t.who === 'YOU' ? ' you' : ''}"><span class="side">${t.side === 'buy' ? 'Buy' : 'Sell'}</span><b>${h(t.who)}</b><em class="${t.via === 'chirp' ? 'via' : ''}">${t.via === 'chirp' ? 'via Chirp' : t.type === 'kol' ? 'KOL' : t.type === 'whale' ? 'Whale' : t.type === 'sniper' ? 'Sniper bot' : t.lp ? 'Liquidity pulled' : ''}</em><i>${fmtSOL(t.sol)} SOL</i><small>${usdC(t.mcap)}</small></div>`).join('')}</div>`;
      else if (this.termTab === 'holders') {
        const bags = c.holders.filter((x) => x.tokens > 0).map((x) => ({ who: x.type === 'you' ? 'YOU' : (x.handle || shortAddr(x.addr)), t: x.tokens, cls: x.type === 'you' ? 'you' : '' }));
        if (c.dev.main.tokens > 0) bags.push({ who: mine ? 'DEV (you)' : 'DEV', t: c.dev.main.tokens, cls: 'dev' });
        bags.sort((a, b) => b.t - a.t);
        const top = bags[0]?.t || 1;
        tab.innerHTML = `<div class="holders">${bags.slice(0, 12).map((b, i) => `<div class="holder ${b.cls}"><span class="dim">${i + 1}</span><span>${h(b.who)}</span><div class="hb"><i style="width:${b.t / top * 100}%"></i></div><span>${fmtPct(b.t / c.supply, false)}</span></div>`).join('') || '<div class="empty"><p>No holders yet.</p></div>'}</div>`;
      } else {
        const n = c.chat.length;
        if (tab.dataset.n != n || tab.dataset.id != c.id) {
          tab.dataset.n = n; tab.dataset.id = c.id;
          tab.innerHTML = `<div class="chatbox" id="t-chatbox">${c.chat.slice(-40).map((x) => `<div class="cmsg ${x.kind}"><b>${h(x.who)}</b><span>${h(x.text)}</span></div>`).join('')}</div>`;
          const cb = document.getElementById('t-chatbox'); if (cb) cb.scrollTop = cb.scrollHeight;
        }
      }
    }
    const cv = document.getElementById('t-chart');
    if (cv) {
      const rr = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      const w = Math.max(50, Math.round(rr.width * dpr)), hh = Math.max(50, Math.round(rr.height * dpr));
      if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
      drawChart(cv.getContext('2d'), c, w, hh, { axis: true, scale: dpr, volume: true });
    }
  },

  // ---------------- Launch ----------------
  app_launch() {
    const d = this.draft;
    const custom = d.type === 'custom';
    const kinds = Object.keys(MEME_KINDS);
    const cost = launchCost(d);
    const err = canLaunch();
    const tk = custom ? 0 : new Coin({ name: 'x', ticker: 'x', kind: 'x' }).quoteBuy(d.devBuy);
    const maxDev = Math.max(0.01, Math.min(25, S.sol - PUMP_LAUNCH_FEE));
    if (d.devBuy > maxDev) d.devBuy = Math.max(0, +maxDev.toFixed(2));
    const vibe = S.owned.serverRack && d.name && d.ticker ? memeScoreFor(d.name, d.ticker, d.kind, S.meta) : null;
    const K = MEME_KINDS[d.kind];
    return `<div class="page-head"><div><h1>Launch a coin</h1><p>Pick a meme, name it, make the first buy. Today's meta is <b style="color:var(--brand)">${S.meta}</b>.</p></div>
      <div class="seg" style="display:inline-grid;grid-template-columns:1fr 1fr;background:var(--bg-2);border:1px solid var(--line);border-radius:9px;padding:3px;min-width:280px"><button class="${!custom ? 'on' : ''}" data-act="dtype" data-v="pump">PumpBin launch</button><button class="${custom ? 'on' : ''}" data-act="dtype" data-v="custom" ${S.owned.kev ? '' : 'disabled title="Hire Kev in the Shop"'}>${S.owned.kev ? '' : ic('lock')} Custom token</button></div></div>
    <div class="launch">
      <div class="stack">
        <section class="panel"><div class="panel-h"><h3>1 · Pick a meme</h3><button class="btn ghost sm" data-act="rehue">Shuffle colors</button></div><div class="panel-b"><div class="tpl-grid">${kinds.map((k) => `<button class="tpl ${d.kind === k ? 'on' : ''}" data-act="kind" data-v="${k}"><img src="${memeIconURL(k, d.hue, 1, 96)}" alt=""><em>${MEME_KINDS[k].label}</em>${MEME_KINDS[k].meta === S.meta ? '<span class="badge brand">Meta</span>' : ''}</button>`).join('')}</div></div></section>
        <section class="panel"><div class="panel-h"><h3>2 · Name it</h3></div><div class="panel-b">
          <div class="lbl-sm">Trending names for ${h(K.label.toLowerCase())} coins</div>
          <div class="chips" style="margin-bottom:14px">${K.names.map(([n, t]) => `<button class="chip" data-act="usename" data-n="${h(n)}" data-t="${t}">${h(n)} <span class="dim">$${t}</span></button>`).join('')}</div>
          <div class="fields"><label class="field"><span>Name</span><span class="input"><input id="pb-name" maxlength="24" value="${h(d.name)}" placeholder="${h(K.names[0][0])}" autocomplete="off"></span></label>
          <label class="field"><span>Ticker</span><span class="input"><span class="pre">$</span><input id="pb-ticker" maxlength="8" value="${h(d.ticker)}" placeholder="${K.names[0][1]}" autocomplete="off"></span></label></div>
          <p class="hint">${vibe != null ? `Analytics server virality score: <b style="color:var(--text)">${Math.round(vibe * 100)}</b> / 145` : 'Every name gets a hidden virality roll. Matching the meta gets about 1.75× the attention.'}</p></div></section>
        <section class="panel"><div class="panel-h"><h3>3 · ${custom ? 'Seed your pool' : 'First buy'}</h3></div><div class="panel-b">${custom ? `
          <label class="field"><span>Pool liquidity · <b class="num" id="lbl-lpsol">${fmtSOL(d.lpSol)} SOL</b></span><input type="range" id="pb-lpsol" min="1" max="${Math.max(1, Math.floor(Math.min(300, S.sol - CUSTOM_DEPLOY_FEE)))}" step="0.5" value="${d.lpSol}"></label>
          <label class="field" style="margin-top:12px"><span>Tokens in the pool · <b class="num" id="lbl-lppct">${Math.round(d.lpPct * 100)}%</b> (you keep the rest)</span><input type="range" id="pb-lppct" min="0.6" max="0.98" step="0.01" value="${d.lpPct}"></label>
          <div class="lbl-sm" style="margin-top:14px">LP tokens</div><div class="chips">${['dev', 'locked', 'burned'].map((v) => `<button class="chip ${d.lp === v ? 'on' : ''}" data-act="dlp" data-v="${v}">${{ dev: 'Keep', locked: 'Lock 3 min', burned: 'Burn' }[v]}</button>`).join('')}</div>
          <p class="hint">Keeping LP lets you pull it later (a rug) and RugRadar warns buyers. Burned LP earns trust.</p>` : `
          <div class="chips" style="margin-bottom:10px">${[0.05, 0.1, 0.25, 0.5, 1].map((v) => `<button class="chip ${Math.abs(d.devBuy - v) < 1e-6 ? 'on' : ''}" data-act="devamt" data-v="${v}" ${v > maxDev ? 'disabled' : ''}>${v} SOL</button>`).join('')}<button class="chip" data-act="devamt" data-v="${maxDev.toFixed(2)}">Max</button></div>
          <input type="range" id="pb-dev" min="0" max="${maxDev.toFixed(2)}" step="0.01" value="${d.devBuy}" aria-label="First buy">
          <p class="hint" id="lbl-devtok">${fmtSOL(d.devBuy)} SOL buys ≈ ${fmtNum(tk)} tokens (${fmtPct(tk / SUPPLY, false)} of supply) at the lowest price on the curve. You also earn 0.3% of all volume as creator fees.</p>`}
        </div></section>
      </div>
      <div class="stack" style="position:sticky;top:0">
        <section class="panel preview-card"><span class="lbl-sm">Preview</span>
          <div class="pc-coin"><img src="${memeIconURL(d.kind, d.hue, 1, 128)}" width="64" height="64" alt=""><div><b id="pv-name">${h(d.name || 'Unnamed coin')}</b><span id="pv-tick">$${h(d.ticker || '???')} · by @${h(S.handle)}</span></div></div>
          <div><div class="kv"><span>Starting market cap</span><b>${custom ? usdC((d.lpSol / (SUPPLY * d.lpPct)) * SUPPLY) : usdC(28)}</b></div>
          <div class="kv"><span>Total cost</span><b id="lbl-cost">${fmtSOL(cost)} SOL</b></div>
          <div class="kv"><span>Balance after</span><b>${fmtSOL(Math.max(0, S.sol - cost))} SOL</b></div>
          <div class="kv"><span>Energy</span><b>12</b></div></div>
          ${S.stats.rugs ? `<div class="note bad">RugRadar will show buyers your dev history: ${S.stats.rugs} rug${S.stats.rugs > 1 ? 's' : ''}.</div>` : ''}
          ${err ? `<div class="note">${h(err)}</div>` : ''}
          <button class="btn primary lg block" data-act="launch" ${err ? 'disabled' : ''}>${ic('rocket')}Launch $${h(d.ticker || 'coin')}</button>
          ${S.sol < 0.05 ? '<p class="hint">Out of SOL? Buy some with cash in the Wallet.</p>' : ''}
        </section>
      </div>
    </div>`;
  },

  // ---------------- Chirp ----------------
  app_chirp() {
    const live = LIVE.filter((c) => c.isLive());
    if (!live.find((c) => c.id === this.chirpCoin)) this.chirpCoin = live[0]?.id ?? null;
    const pt = POST_TYPES[this.chirpType];
    const coin = live.find((c) => c.id === this.chirpCoin);
    const can = (k) => k.tier === 1 || (k.tier === 2 && S.owned.burner) || (k.tier === 3 && S.owned.rolodex);
    return `<div class="page-head"><div><h1>Chirp</h1><p>Posts bring buyers. Bigger account, bigger waves.</p></div></div>
    <div class="chirp">
      <div class="stack">
        <section class="panel profile"><span class="av">🐸</span><div><b>@${h(S.handle)}</b><span>${fmtNum(S.followers)} followers · credibility ${Math.round(S.cred * 100)}%</span></div><div class="reach"><label>Reach</label><b>${Math.round(shillPower() * 100)}</b></div></section>
        <section class="panel"><div class="panel-h"><h3>New post</h3></div><div class="panel-b">
          <div class="chips">${Object.entries(POST_TYPES).map(([k, v]) => `<button class="chip ${this.chirpType === k ? 'on' : ''}" data-act="ptype" data-v="${k}">${v.label}</button>`).join('')}</div>
          <p class="hint">${h(pt.hint)} Costs ${Math.max(2, pt.stamina - (S.owned.mechKeyboard ? 2 : 0))} energy${pt.costSol ? ` and ${pt.costSol} SOL` : ''}.</p>
          ${pt.needsCoin ? (live.length ? `<div class="lbl-sm" style="margin-top:12px">About</div><div class="chips">${live.map((c) => `<button class="chip ${c.id === this.chirpCoin ? 'on' : ''}" data-act="ccoin" data-id="${c.id}">${coinIcon(c, 18)}$${h(c.ticker)}</button>`).join('')}</div>` : `<div class="note" style="margin-top:10px">No live coin to post about. Shitposts grow your following.</div>`) : ''}
          <button class="btn info block" style="margin-top:12px" data-act="post" ${pt.needsCoin && !coin ? 'disabled' : ''}>${ic('chirp')}Post</button></div></section>
        <section class="panel"><div class="panel-h"><h3>Paid promotion</h3></div>
          ${KOLS.map((k, i) => `<div class="kol ${can(k) ? '' : 'locked'}"><span class="av">${h(k.handle[1].toUpperCase())}</span><div><b>${h(k.handle)}</b><span>${fmtNum(k.followers)} followers</span></div><em>${fmtSOL(k.price)} SOL</em><button class="btn sm" data-act="kol" data-i="${i}" ${!coin || !can(k) ? 'disabled' : ''}>${can(k) ? 'Hire' : ic('lock')}</button></div>`).join('')}
          <div class="panel-b" style="border-top:1px solid var(--line)"><p class="hint" style="margin:0">KOLs buy before they post and sell into their own followers. Tier 2 needs a second phone, tier 3 the rolodex.</p></div></section>
      </div>
      <div class="stack">
        <section class="panel"><div class="panel-h"><h3>Your posts</h3></div><div id="c-posts"></div></section>
        <section class="panel"><div class="panel-h"><h3>Notifications</h3></div>${S.feed.slice(0, 10).map((f) => `<div class="notif ${f.kind || ''}"><i class="dot"></i><div><b>${h(f.who)}</b> ${h(f.text)}</div></div>`).join('') || '<div class="empty"><p>Nothing yet.</p></div>'}</section>
      </div>
    </div>`;
  },
  live_chirp() {
    const el = document.getElementById('c-posts'); if (!el) return;
    el.innerHTML = S.posts.slice(0, 8).map((p) => {
      const e = 1 - Math.pow(1 - clamp(p.age / 25, 0, 1), 2);
      return `<div class="post"><span class="av">🐸</span><div><div class="ph"><b>@${h(S.handle)}</b><span>· ${h(POST_TYPES[p.type].label)}</span>${p.viral ? '<span class="badge brand">Viral</span>' : ''}${p.ratioed ? '<span class="badge down">Ratioed</span>' : ''}</div><p>${h(p.text)}</p><div class="eng"><span>${ic('eye')}${fmtNum(p.impressions * e)}</span><span>${ic('heart')}${fmtNum(p.likes * e)}</span><span>${ic('repeat')}${fmtNum(p.reposts * e)}</span><span>${ic('chirp')}${fmtNum(p.replies * e)}</span><span class="${p.gain >= 0 ? 'up' : 'down'}">${p.gain >= 0 ? '+' : ''}${Math.round(p.gain * e)} followers</span></div></div></div>`;
    }).join('') || `<div class="empty"><h3>No posts yet</h3><p>With ${S.followers} followers almost nobody sees you. Shitpost to grow.</p></div>`;
  },

  // ---------------- RugRadar ----------------
  app_radar() {
    const coins = allCoins().filter((c) => c.isLive() || isMine(c));
    const c = focusCoin();
    return `<div class="page-head"><div><h1>RugRadar</h1><p>What careful buyers check before they ape. A higher score scares off smart money.</p></div></div>
    <div class="radar"><section class="panel"><div class="panel-h"><h3>Coins</h3></div><div class="rowlist" style="max-height:calc(100vh - 230px);overflow-y:auto">${coins.map((x) => `<div class="row" data-act="focus" data-id="${x.id}" style="${c && x.id === c.id ? 'background:var(--bg-3)' : ''}">${coinIcon(x, 28)}<div class="nm"><b>$${h(x.ticker)}</b><span>${isMine(x) ? 'Yours' : fmtDur(x.t)}</span></div><span class="risk r${x.risk().score > 45 ? 3 : x.risk().score > 20 ? 2 : 1}">${x.risk().score}</span></div>`).join('') || '<div class="empty"><p>No coins.</p></div>'}</div></section>
    ${c ? `<div class="stack"><section class="panel score"><div class="dial" id="r-dial"></div><div><h3 style="margin:0 0 4px">${h(c.name)} <span class="dim num">$${h(c.ticker)}</span></h3><p class="mut" style="margin:0">${isMine(c) ? 'This is what buyers see about your coin.' : 'Read this before you buy.'}</p></div></section><section class="panel" id="r-flags"></section></div>` : '<section class="panel"><div class="empty"><p>Pick a coin.</p></div></section>'}</div>`;
  },
  live_radar() {
    const c = focusCoin(); if (!c) return;
    const r = c.risk();
    const d = document.getElementById('r-dial');
    if (d) { d.style.setProperty('--p', r.score); d.style.setProperty('--c', r.score > 45 ? 'var(--down)' : r.score > 20 ? 'var(--warn)' : 'var(--up)'); d.innerHTML = `<b>${r.score}</b><span>${r.score > 45 ? 'Danger' : r.score > 20 ? 'Caution' : 'Looks OK'}</span>`; }
    const f = document.getElementById('r-flags');
    const sig = r.flags.map((x) => x.label).join('|');
    if (f && f.dataset.sig !== sig) { f.dataset.sig = sig; f.innerHTML = r.flags.map((x) => `<div class="flag ${x.level}"><i></i><div><b>${h(x.label)}</b><p>${h(x.detail)}</p></div></div>`).join(''); }
  },

  // ---------------- Wallet ----------------
  app_wallet() {
    return `<div class="page-head"><div><h1>Wallet</h1><p>Cash out to spend in the Shop, or buy SOL to launch and trade.</p></div></div>
    <div class="wallet">
      <section class="panel balances"><div><span class="lbl-sm">SOL</span><b>${fmtSOL(S.sol)}</b><small>${usdOf(S.sol)}</small></div><div><span class="lbl-sm">Cash</span><b>${fmtUSD(S.cash)}</b><small>spendable</small></div><div><span class="lbl-sm">SOL price</span><b>${fmtUSD(S.solPrice)}</b><small>moves daily</small></div><div><span class="lbl-sm">Net worth</span><b>${fmtUSD(netWorth())}</b><small>incl. coins</small></div></section>
      <section class="panel"><div class="panel-h"><h3>Cash out</h3><span class="dim">1.5% fee</span></div><div class="panel-b"><div class="grid-btns" style="--n:3"><button class="btn" data-act="cashout" data-f="0.25">25%</button><button class="btn" data-act="cashout" data-f="0.5">50%</button><button class="btn primary" data-act="cashout" data-f="1">All</button></div><p class="hint">Sells SOL for dollars at ${fmtUSD(S.solPrice)}.</p></div></section>
      <section class="panel"><div class="panel-h"><h3>Buy SOL</h3><span class="dim">2% fee</span></div><div class="panel-b"><div class="grid-btns" style="--n:4">${[20, 100, 1000, 10000].map((v) => `<button class="btn" data-act="buysol" data-u="${v}" ${S.cash < v ? 'disabled' : ''}>${fmtUSD(v)}</button>`).join('')}</div><p class="hint">For launches, trades and KOLs.</p></div></section>
      <section class="panel" style="grid-column:1/-1"><div class="panel-h"><h3>Activity</h3></div><div class="tablewrap"><table class="tbl"><tbody>${S.log.slice(0, 16).map((l) => `<tr><td class="dim num" style="width:70px">Day ${l.day}</td><td style="white-space:normal">${h(l.text)}</td></tr>`).join('') || '<tr><td class="dim">Nothing yet.</td></tr>'}</tbody></table></div></section>
    </div>`;
  },

  // ---------------- Shop ----------------
  app_shop() {
    const cats = ['All', ...new Set(ITEMS.map((i) => i.cat))];
    const list = ITEMS.filter((i) => this.shopCat === 'All' || i.cat === this.shopCat);
    return `<div class="page-head"><div><h1>Shop</h1><p>Upgrades show up in the basement. Pay with cash from the Wallet.</p></div><div class="pill" style="height:40px;font-size:15px"><span class="lbl">Cash</span>${fmtUSD(S.cash)}</div></div>
      <div class="chips" style="margin-bottom:14px">${cats.map((c) => `<button class="chip ${this.shopCat === c ? 'on' : ''}" data-act="shopcat" data-v="${c}">${c}</button>`).join('')}</div>
      <div class="shop-grid">${list.map((it) => {
        const owned = !it.consumable && S.owned[it.id];
        const locked = it.req && !S.owned[it.req];
        return `<div class="item ${owned ? 'owned' : ''}"><div class="ih"><span class="ico">${ic(it.icon)}</span><div><b>${h(it.name)}</b><span class="cat">${it.cat}</span></div></div><p>${h(it.desc)}${it.id === 'drinks' ? ` In fridge: ${S.owned.vending ? '∞' : S.drinks}.` : ''}</p><div class="buyrow"><span class="price">${fmtUSD(it.price)}</span>${owned ? `<span class="owned-tag">${ic('check')}Owned</span>` : `<button class="btn sm ${S.cash >= it.price && !locked ? 'primary' : ''}" data-act="buy" data-id="${it.id}" ${S.cash < it.price || locked ? 'disabled' : ''}>${locked ? `${ic('lock')}Needs ${h(ITEM[it.req].name)}` : 'Buy'}</button>`}</div></div>`;
      }).join('')}</div>`;
  },

  // ---------------- Messages ----------------
  app_messages() {
    S.unread = 0;
    return `<div class="page-head"><div><h1>Messages</h1><p>The basement group chat.</p></div><button class="btn" data-act="asktip">${ic('chirp')}Ask Chad for a tip</button></div>
      <section class="panel"><div class="msgs" id="m-list">${S.texts.map((t) => `<div class="bubble">${av(t.from, 30)}<div><div class="who">${h(t.from)}</div><div class="bb">${h(t.text)}</div><div class="tm">Day ${t.day} · ${clockAt(t.time)}</div></div></div>`).join('') || '<div class="empty"><p>No messages yet.</p></div>'}</div></section>`;
  },

  // ---------------- Tunes ----------------
  app_tunes() {
    const tr = MUSIC.track;
    return `<div class="page-head"><div><h1>Tunes</h1><p>Beats to rug to. Generated live, so no two plays sound exactly alike.</p></div></div>
    <div class="tunes">
      <section class="panel np">
        <canvas id="mu-art" width="440" height="440"></canvas>
        <div class="np-info"><span class="lbl-sm">${MUSIC.on ? 'Now playing' : 'Paused'} · ${h(tr.genre)}</span><h2>${h(tr.title)}</h2><p>${h(tr.artist)}</p></div>
        <div class="np-prog"><span class="num" id="mu-el">0:00</span><div class="prog"><i id="mu-bar"></i></div><span class="num">${fmtClock(MUSIC.length())}</span></div>
        <div class="np-ctl"><button class="btn ghost ${MUSIC.shuffle ? 'on' : ''}" data-act="music-shuffle" title="Shuffle" aria-pressed="${MUSIC.shuffle}">${ic('shuffle')}</button><button class="btn" data-act="music-prev" title="Previous">${ic('prev')}</button><button class="btn primary big-play" data-act="music-toggle" title="${MUSIC.on ? 'Pause' : 'Play'}">${ic(MUSIC.on ? 'pause' : 'play')}</button><button class="btn" data-act="music-next" title="Next">${ic('next')}</button><span class="sp"></span></div>
        <label class="np-vol">${ic('music')}<input type="range" id="mu-vol" min="0" max="1" step="0.02" value="${MUSIC.vol}" aria-label="Music volume"></label>
        <canvas id="mu-viz" width="880" height="140"></canvas>
      </section>
      <section class="panel"><div class="panel-h"><h3>Basement playlist</h3><span class="dim num">${TRACKS.length} tracks</span></div>
        <div class="rowlist">${TRACKS.map((t, i) => `<div class="row track ${i === MUSIC.idx ? 'cur' : ''}" data-act="music-play" data-i="${i}"><span class="tn num">${i === MUSIC.idx && MUSIC.on ? ic('music') : i + 1}</span><canvas data-art="${i}" width="80" height="80"></canvas><div class="nm"><b>${h(t.title)}</b><span>${h(t.artist)}</span></div><span class="badge">${h(t.genre)}</span><span class="num dim">${fmtClock(MUSIC.length(i))}</span></div>`).join('')}</div></section>
    </div>`;
  },
  live_tunes() {
    const a = document.getElementById('mu-art');
    if (a && a.dataset.id !== MUSIC.track.id) { a.dataset.id = MUSIC.track.id; drawAlbumArt(a.getContext('2d'), MUSIC.track, a.width); }
    document.querySelectorAll('[data-art]').forEach((c) => { if (!c.dataset.done) { c.dataset.done = 1; drawAlbumArt(c.getContext('2d'), TRACKS[+c.dataset.art], c.width); } });
    const el = MUSIC.elapsed(), len = MUSIC.length();
    const e = document.getElementById('mu-el'); if (e) e.textContent = fmtClock(el);
    const b = document.getElementById('mu-bar'); if (b) b.style.width = Math.min(100, el / len * 100) + '%';
    if (!this._viz) {
      const loop = () => {
        const cv = document.getElementById('mu-viz');
        if (!cv || !this.pcOpen || this.app !== 'tunes') { this._viz = null; return; }
        const ctx = cv.getContext('2d'), w = cv.width, hh = cv.height;
        ctx.clearRect(0, 0, w, hh);
        if (MUSIC.analyser) MUSIC.analyser.getByteFrequencyData(MUSIC.fft);
        const n = 48, bw = w / n;
        for (let i = 0; i < n; i++) {
          const v = MUSIC.on && MUSIC.fft ? MUSIC.fft[Math.floor(i * 1.6) + 1] / 255 : 0.02;
          const bh = Math.max(3, v * hh * 0.95);
          const g = ctx.createLinearGradient(0, hh, 0, hh - bh); g.addColorStop(0, '#ff9a2e'); g.addColorStop(1, '#ffd27a');
          ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(i * bw + 2, hh - bh, bw - 4, bh, 3); ctx.fill();
        }
        this._viz = requestAnimationFrame(loop);
      };
      this._viz = requestAnimationFrame(loop);
    }
  },

  // ---------------- Wiki / History ----------------
  app_wiki() {
    const a = WIKI.find((w) => w.id === this.wikiId) || WIKI[0];
    return `<div class="page-head"><div><h1>Degen Wiki</h1><p>How memecoins actually work.</p></div></div><div class="wiki"><section class="panel"><nav>${WIKI.map((w) => `<button class="${w.id === a.id ? 'on' : ''}" data-act="wiki" data-id="${w.id}">${h(w.title)}</button>`).join('')}</nav></section><section class="panel"><article><h2>${h(a.title)}</h2>${a.body}</article></section></div>`;
  },
  app_history() {
    const st = S.stats;
    return `<div class="page-head"><div><h1>History</h1><p>Every coin you launched.</p></div></div>
      <section class="panel" style="margin-bottom:14px"><div class="stats4" style="border-top:0"><div><label>Launched</label><b>${st.launched}</b></div><div><label>Graduated</label><b>${st.graduated}</b></div><div><label>Rugs</label><b>${st.rugs}</b></div><div><label>Creator fees</label><b>${fmtSOL(st.feesSol)} SOL</b></div></div><div class="stats4"><div><label>Trades</label><b>${st.trades}</b></div><div><label>Trading P&amp;L</label><b class="${st.tradePnl >= 0 ? 'up' : 'down'}">${st.tradePnl >= 0 ? '+' : ''}${fmtSOL(st.tradePnl)}</b></div><div><label>Got rugged</label><b>${st.gotRugged}</b></div><div><label>Best rug</label><b>${fmtUSD(st.bestRug)}</b></div></div></section>
      <section class="panel tablewrap"><table class="tbl"><thead><tr><th>Coin</th><th>Day</th><th class="r">Peak mcap</th><th>Outcome</th><th class="r">Profit</th></tr></thead><tbody>
      ${S.history.map((r) => `<tr><td><span class="cc">${coinIcon(r, 22)}$${h(r.ticker)}</span></td><td class="num">${r.day}</td><td class="num r">${fmtUSD(r.peakMcapUsd, { compact: true })}</td><td>${r.rugged ? `<span class="badge down">Rugged · ${METHOD_LABEL[r.method] || r.method}</span>` : r.graduated ? '<span class="badge up">Graduated</span>' : `<span class="badge">${METHOD_LABEL[r.method] || 'Closed'}</span>`}</td><td class="num r ${r.profit >= 0 ? 'up' : 'down'}">${r.profit >= 0 ? '+' : ''}${fmtSOL(r.profit)} SOL</td></tr>`).join('') || '<tr><td colspan="5" class="dim">No coins yet.</td></tr>'}
      </tbody></table></section>`;
  },

  // ---------------- phone ----------------
  togglePhone(force) {
    this.phoneOpen = force ?? !this.phoneOpen;
    $('#phone').hidden = !this.phoneOpen;
    if (this.phoneOpen) { S.unread = 0; this.renderPhone(); }
  },
  renderPhone() {
    const c = focusCoin();
    const mine = isMine(c);
    $('#phone').innerHTML = `<div class="ph-top"><b>${clockText()}</b><span>${fmtSOL(S.sol)} SOL · ${fmtUSD(S.cash)}</span></div>
      ${c ? `<div class="ph-coin">${coinIcon(c, 36)}<div><b>$${h(c.ticker)}</b><span id="ph-mc"></span></div></div><canvas id="ph-chart" width="600" height="260"></canvas>
      <div class="grid-btns" style="--n:3">${mine ? `<button class="btn buy sm" data-act="devbuy" data-sol="0.1">Buy 0.1</button><button class="btn sell sm" data-act="sell" data-frac="0.25">Sell 25%</button><button class="btn info sm" data-act="quickpost">Shill</button>` : `<button class="btn buy sm" data-act="tbuy" data-sol="0.1">Buy 0.1</button><button class="btn sell sm" data-act="tsell" data-frac="0.5">Sell 50%</button><button class="btn sell sm" data-act="tsell" data-frac="1">Sell all</button>`}</div>` : '<p class="mut">No coin selected. Head to the PC.</p>'}
      <div class="ph-msgs">${S.texts.slice(-4).reverse().map((t) => `<p><b>${h(t.from)}:</b> ${h(t.text)}</p>`).join('')}</div>
      <p class="hint" style="margin:0">${this.ctx.player.isTouch ? 'Tap the phone button to close' : 'Tab to close'}</p>`;
    this.livePhone();
  },
  livePhone() {
    const c = focusCoin(); if (!c) return;
    const e = document.getElementById('ph-mc'); if (e) e.textContent = `${fmtUSD(c.mcapSol() * S.solPrice)} · ${c.holderCount()} holders`;
    const cv = document.getElementById('ph-chart'); if (cv) drawChart(cv.getContext('2d'), c, cv.width, cv.height, { max: 50, scale: 2 });
  },

  // ---------------- input ----------------
  onInput(e) {
    const t = e.target, d = this.draft;
    if (t.id === 'mu-vol') { MUSIC.setVolume(+t.value); SET.music = +t.value; saveSettings(); return; }
    if (t.id === 'pc-search') { this.search = t.value; if (this.app !== 'trenches') { this.app = 'trenches'; this.renderPC(); const s = $('#pc-search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); } else { this._sig = null; this.live(true); } return; }
    if (t.id === 'pb-name') { d.name = t.value; const p = document.getElementById('pv-name'); if (p) p.textContent = d.name || 'Unnamed coin'; return; }
    if (t.id === 'pb-ticker') { d.ticker = t.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); t.value = d.ticker; const p = document.getElementById('pv-tick'); if (p) p.textContent = `$${d.ticker || '???'} · by @${S.handle}`; return; }
    const map = { 'pb-dev': 'devBuy', 'pb-lpsol': 'lpSol', 'pb-lppct': 'lpPct' };
    if (map[t.id]) {
      d[map[t.id]] = parseFloat(t.value);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('lbl-lpsol', fmtSOL(d.lpSol) + ' SOL'); set('lbl-lppct', Math.round(d.lpPct * 100) + '%'); set('lbl-cost', fmtSOL(launchCost(d)) + ' SOL');
      if (t.id === 'pb-dev') { const tk = new Coin({ name: 'x', ticker: 'x', kind: 'x' }).quoteBuy(d.devBuy); set('lbl-devtok', `${fmtSOL(d.devBuy)} SOL buys ≈ ${fmtNum(tk)} tokens (${fmtPct(tk / SUPPLY, false)} of supply) at the lowest price on the curve. You also earn 0.3% of all volume as creator fees.`); }
      if (e.type === 'change') this.renderAppKeep();
    }
  },
  act(fn) { const err = fn(); if (err) { this.toast(err, 'bad'); AUDIO.sfx('error'); } return !err; },
  onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const a = b.dataset.act, d = this.draft, c = focusCoin();
    AUDIO.sfx('click');
    const refresh = () => { if (this.pcOpen) this.renderAppKeep(); if (this.phoneOpen) this.renderPhone(); };
    switch (a) {
      case 'app': this.app = b.dataset.app; this.renderPC(); break;
      case 'open': FOCUS = +b.dataset.id; this.app = 'terminal'; this.tradeMode = 'buy'; this.renderPC(); break;
      case 'focus': FOCUS = +b.dataset.id; this.renderApp(); break;
      case 'copy-ca': try { navigator.clipboard.writeText(c.addr).catch(() => {}); } catch (err) { /* ignore */ } this.toast('Contract address copied'); break;
      case 'ttab': this.termTab = b.dataset.v; this.renderAppKeep(); break;
      case 'tmode': this.tradeMode = b.dataset.v; this.renderAppKeep(); break;
      case 'dtype': d.type = b.dataset.v; this.renderAppKeep(); break;
      case 'kind': d.kind = b.dataset.v; this.renderAppKeep(); break;
      case 'usename': d.name = b.dataset.n; d.ticker = b.dataset.t; this.renderAppKeep(); break;
      case 'dlp': d.lp = b.dataset.v; this.renderAppKeep(); break;
      case 'devamt': d.devBuy = +b.dataset.v; this.renderAppKeep(); break;
      case 'rehue': d.hue = randi(0, 359); this.renderAppKeep(); break;
      case 'launch':
        if (!d.name) { const n = MEME_KINDS[d.kind].names[0]; d.name = n[0]; d.ticker = d.ticker || n[1]; }
        if (this.act(() => launchCoin(d))) {
          AUDIO.sfx('launch');
          this.toast(`$${focusCoin().ticker} is live.`, 'good');
          this.draft = { ...this.newDraft(), type: d.type, devBuy: d.devBuy, lpSol: d.lpSol, lpPct: d.lpPct, lp: d.lp };
          this.app = 'terminal'; this.tradeMode = 'buy'; this.renderPC();
        }
        break;
      case 'devbuy': if (c && this.act(() => devBuyMore(c, +b.dataset.sol))) { AUDIO.sfx('buy'); this.toast(`Bought ${b.dataset.sol} SOL more of $${c.ticker}`, 'good'); refresh(); } break;
      case 'sell': {
        if (!c) break;
        const frac = +b.dataset.frac;
        const after = c.dev.soldFrac + (c.dev.main.tokens * frac) / Math.max(1, c.dev.main.start);
        const doSell = () => { const sol = devSell(c, frac); if (sol > 0) { AUDIO.sfx('cash'); this.toast(`Sold for ${fmtSOL(sol)} SOL (${usdOf(sol)})`, 'good'); } refresh(); };
        if (!c.rugged && after >= 0.5 && c.holderCount() > 3) this.confirm(`<h3>Rug $${h(c.ticker)}?</h3><p class="mut">Selling past half your bag dumps on ${c.holderCount() - 1} holders. They'll call you out: you lose followers and credibility, and RugRadar flags your next coins.</p>`, 'Dump it', doSell);
        else doSell();
        break;
      }
      case 'claim': if (c && this.act(() => claimFees(c))) { AUDIO.sfx('cash'); refresh(); } break;
      case 'golive': if (c && this.act(() => goLive(c))) { AUDIO.sfx('notify'); refresh(); } break;
      case 'pull': if (c) this.confirm(`<h3>Pull the liquidity?</h3><p class="mut">You take the ${fmtSOL(c.poolSol)} SOL in the pool and every holder is left with unsellable tokens. Expect a big unfollow wave.</p>`, 'Pull it', () => { const sol = pullLP(c); this.toast(`Pulled ${fmtSOL(sol)} SOL (${usdOf(sol)})`, 'bad'); refresh(); }); break;
      case 'lock': if (c?.lockLP(+b.dataset.sec)) refresh(); break;
      case 'burn': if (c) this.confirm(`<h3>Burn the LP?</h3><p class="mut">Nobody can ever pull this pool, including you. Buyers trust it more and you keep earning creator fees.</p>`, 'Burn it', () => { c.burnLP(); refresh(); }, 'primary'); break;
      case 'close-coin':
        if (c) {
          const doClose = () => { const r = closeCoin(c); this.toast(`Closed $${r.ticker}: ${r.profit >= 0 ? '+' : ''}${fmtSOL(r.profit)} SOL`, r.profit >= 0 ? 'good' : 'bad'); this.app = 'home'; this.renderPC(); };
          if (c.isLive() && c.dev.main.tokens > 1 && c.quoteSell(c.dev.main.tokens) > 0.01) this.confirm(`<h3>Close $${h(c.ticker)}?</h3><p class="mut">Your remaining bag (about ${fmtSOL(c.quoteSell(c.dev.main.tokens))} SOL right now) stays in the coin. Unclaimed creator fees are claimed for you.</p>`, 'Close it', doClose, 'primary');
          else doClose();
        }
        break;
      case 'promo-post': this.chirpCoin = c?.id; this.chirpType = 'shill'; this.app = 'chirp'; this.renderPC(); break;
      case 'promo-kol': this.chirpCoin = c?.id; this.app = 'chirp'; this.renderPC(); break;
      case 'tbuy': if (c && this.act(() => tradeBuy(c, +b.dataset.sol))) { AUDIO.sfx('buy'); this.toast(`Bought ${b.dataset.sol} SOL of $${c.ticker}`, 'good'); refresh(); } break;
      case 'qbuy': { const x = allCoins().find((k) => k.id === +b.dataset.id); e.stopPropagation(); if (x && this.act(() => tradeBuy(x, +b.dataset.sol))) { AUDIO.sfx('buy'); this.toast(`Bought ${b.dataset.sol} SOL of $${x.ticker}`, 'good'); this._sig = null; this.live(true); } break; }
      case 'tsell': if (c && this.act(() => tradeSell(c, +b.dataset.frac))) { AUDIO.sfx('cash'); refresh(); } break;
      case 'writeoff': if (c) { writeOff(c); this.app = 'trenches'; this.renderPC(); } break;
      case 'snipe-toggle': S.snipe.on = !S.snipe.on; this.renderAppKeep(); break;
      case 'snipe-amt': S.snipe.sol = +b.dataset.v; this.renderAppKeep(); break;
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
        if (it.price >= 10000) this.confirm(`<h3>Buy ${h(it.name)}?</h3><p class="mut">${fmtUSD(it.price)}. ${h(it.desc)}</p>`, 'Buy it', go, 'primary'); else go();
        break;
      }
      case 'music-toggle': AUDIO.init(); MUSIC.toggle(); this.live(true); if (this.app === 'tunes') this.renderAppKeep(); break;
      case 'music-next': AUDIO.init(); MUSIC.next(); break;
      case 'music-prev': AUDIO.init(); MUSIC.prev(); break;
      case 'music-play': AUDIO.init(); MUSIC.pausedAt = 0; MUSIC.play(+b.dataset.i); break;
      case 'music-shuffle': MUSIC.shuffle = !MUSIC.shuffle; this.renderAppKeep(); break;
      case 'asktip': text('Chad', pick(CHAD_TIPS())); break;
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

function clockAt(m) {
  m = Math.floor(m) % (24 * 60); const hh = Math.floor(m / 60), mm = m % 60;
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
}
function clockText() { return clockAt(S.clock); }
function fmtClock(sec) { sec = Math.max(0, Math.floor(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }

function drawSpark(ctx, vals, w, h, color, fill) {
  ctx.clearRect(0, 0, w, h);
  if (!vals || vals.length < 2) return;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1e-12) { hi = lo * 1.01 + 1e-9; lo *= 0.99; }
  const X = (i) => (i / (vals.length - 1)) * w, Y = (v) => h - 4 - ((v - lo) / (hi - lo)) * (h - 8);
  ctx.beginPath(); vals.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  if (fill) {
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, color + '40'); g.addColorStop(1, color + '00');
    ctx.fillStyle = g; ctx.fill();
  }
}

// Candles of market cap in USD (what memecoin screeners show)
function drawChart(ctx, coin, w, h, o = {}) {
  const sc = o.scale || 1;
  const axis = o.axis ? 66 * sc : 0;
  const volH = o.volume ? h * 0.16 : 0;
  const pad = { l: 8 * sc, r: axis + 8 * sc, t: 12 * sc, b: (o.axis ? 10 : 6) * sc + volH };
  ctx.fillStyle = '#0c1016'; ctx.fillRect(0, 0, w, h);
  const cs = coin.candles.slice(-(o.max || 90));
  if (!cs.length) return;
  const sp = S.solPrice;
  let lo = Infinity, hi = -Infinity, vmax = 0;
  for (const c of cs) { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); vmax = Math.max(vmax, c.v); }
  if (hi - lo < hi * 0.02) { hi *= 1.05; lo *= 0.95; }
  const span = hi - lo; hi += span * 0.08; lo = Math.max(0, lo - span * 0.08);
  const X = (i) => pad.l + (i + 0.5) * ((w - pad.l - pad.r) / cs.length);
  const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1 * sc;
  ctx.font = `500 ${11 * sc}px "JetBrains Mono", ui-monospace, monospace`; ctx.fillStyle = '#687387'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = lo + (hi - lo) * (i / 4), y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    if (axis) ctx.fillText(fmtUSD(v * sp, { compact: true }), w - axis + 6 * sc, y);
  }
  const cw = Math.max(1, ((w - pad.l - pad.r) / cs.length) * 0.64);
  cs.forEach((c, i) => {
    const up = c.c >= c.o, x = X(i);
    ctx.fillStyle = ctx.strokeStyle = up ? '#1fd18a' : '#ff4d61';
    ctx.lineWidth = Math.max(1, sc);
    ctx.beginPath(); ctx.moveTo(x, Y(c.h)); ctx.lineTo(x, Y(c.l)); ctx.stroke();
    const y1 = Y(Math.max(c.o, c.c)), y2 = Y(Math.min(c.o, c.c));
    ctx.fillRect(x - cw / 2, y1, cw, Math.max(1 * sc, y2 - y1));
    if (volH && vmax > 0 && c.v > 0) { ctx.globalAlpha = 0.35; ctx.fillRect(x - cw / 2, h - (c.v / vmax) * volH, cw, (c.v / vmax) * volH); ctx.globalAlpha = 1; }
  });
  // dev / your trades as markers
  const i0 = cs[0].i;
  for (const t of coin.trades) {
    const you = t.who === 'YOU';
    if (!t.dev && !you) continue;
    const k = Math.floor(t.t / CANDLE_SEC) - i0;
    if (k < 0 || k >= cs.length) continue;
    const x = X(k), buy = t.side === 'buy';
    const y = buy ? Y(cs[k].l) + 10 * sc : Y(cs[k].h) - 10 * sc;
    ctx.fillStyle = you ? '#4aa8ff' : buy ? '#1fd18a' : '#ffb547';
    ctx.beginPath(); ctx.arc(x, y, 6 * sc, 0, 7); ctx.fill();
    ctx.fillStyle = '#0c1016'; ctx.font = `700 ${8 * sc}px Manrope, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(you ? (buy ? 'B' : 'S') : 'D', x, y + 0.5 * sc);
    ctx.textAlign = 'left';
  }
  const last = cs[cs.length - 1], ly = Y(last.c), lup = last.c >= last.o;
  ctx.setLineDash([3 * sc, 4 * sc]); ctx.strokeStyle = lup ? 'rgba(31,209,138,0.5)' : 'rgba(255,77,97,0.5)';
  ctx.beginPath(); ctx.moveTo(pad.l, ly); ctx.lineTo(w - pad.r, ly); ctx.stroke(); ctx.setLineDash([]);
  if (axis) {
    ctx.fillStyle = lup ? '#1fd18a' : '#ff4d61';
    ctx.beginPath(); ctx.roundRect(w - axis + 2 * sc, ly - 9 * sc, axis - 6 * sc, 18 * sc, 4 * sc); ctx.fill();
    ctx.fillStyle = '#0c1016'; ctx.font = `600 ${11 * sc}px "JetBrains Mono", monospace`; ctx.fillText(fmtUSD(last.c * sp, { compact: true }), w - axis + 7 * sc, ly);
  }
}

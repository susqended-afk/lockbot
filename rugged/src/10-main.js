// ============================================================
// MAIN — boot, render loop, interactions, crew, menus
// ============================================================
const SETTINGS_KEY = 'rugged.settings';
const SET = (() => {
  const isMobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
  const d = { quality: isMobile ? 'low' : 'high', sens: 1, volume: 0.7, music: 0.45 };
  try { return { ...d, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch (e) { return d; }
})();
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SET)); } catch (e) { /* ignore */ } };

const G = { paused: true, started: false, mode: 'walk', dialogWith: null, frame: 0 };
let renderer, scene, camera, composer, WORLD, player, CREW = {};

function setLoading(text, pct) {
  const l = $('#loading'); if (!l) return;
  $('#load-txt').textContent = text; $('#load-bar').style.width = pct + '%';
}
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

async function boot() {
  const high = SET.quality === 'high';
  TEX_SIZE = high ? 1024 : 512;
  const Q = { tex: TEX_SIZE, shadow: high ? 2048 : 1024, high };
  setLoading('Waking up the basement…', 5); await nextFrame();
  await loadEmoji();
  renderer = new THREE.WebGLRenderer({ antialias: high, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, high ? 2 : 1.25));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.id = 'gl';
  $('#app').prepend(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x050407);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.03, 60);
  setLoading('Pouring concrete…', 15); await nextFrame();
  WORLD = buildWorld(scene, Q);
  setLoading('Loading photo textures…', 55); await nextFrame();
  await applyPhotoTextures(WORLD);
  setLoading('Calling the crew…', 70); await nextFrame();
  for (const k of ['kev', 'mo']) { CREW[k] = new Person({ ...CREW_SPECS[k], ...(k === 'mo' ? { phone: true, cash: false } : {}) }); scene.add(CREW[k].root); }
  setLoading('Carrying the couch downstairs…', 82); await nextFrame();
  await loadSofa();
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (high) composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.45, 0.85));
  composer.addPass(new OutputPass());
  player = new Player(camera, renderer.domElement, WORLD);
  player.sens = SET.sens;
  UI.init({ player, crewReact, dialogTopic, leavePC });
  bindInput();
  addEventListener('resize', onResize);
  setLoading('Ready', 100);
  $('#loading').hidden = true;
  showTitle();
  requestAnimationFrame(loop);
}

// ---------- photo textures (brick walls, pine boards) ----------
async function applyPhotoTextures(W) {
  const L = new THREE.TextureLoader();
  const load = (f, srgb) => new Promise((res) => L.load('assets/' + f, (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null)));
  const [bd, bb, br, wd, wb, wr] = await Promise.all([load('brick_diffuse.jpg', true), load('brick_bump.jpg'), load('brick_roughness.jpg'), load('hardwood2_diffuse.jpg', true), load('hardwood2_bump.jpg'), load('hardwood2_roughness.jpg')]);
  if (bd) {
    for (const t of [bd, bb, br]) t && t.repeat.set(0.8, 1.04);
    const m = W.mats.wall;
    m.map = bd; m.bumpMap = bb; m.bumpScale = 3; m.roughnessMap = br; m.normalMap = null;
    m.color.set(0xb9ada3); m.roughness = 1; m.needsUpdate = true;
  }
  if (wd) {
    const tune = (m, rx, ry, tint) => {
      const c = (t) => { if (!t) return null; const n = t.clone(); n.repeat.set(rx, ry); n.needsUpdate = true; return n; };
      m.map = c(wd); m.bumpMap = c(wb); m.bumpScale = 1.5; m.roughnessMap = c(wr); m.normalMap = null; m.color.set(tint); m.needsUpdate = true;
    };
    tune(W.mats.ply, 1, 1, 0x8c857a);    // subfloor boards overhead (aged, dim)
    tune(W.mats.pine, 1, 0.35, 0xa49786); // joists, stairs, sawhorses
  }
}
async function loadSofa() {
  try {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    // .glb when served from the repo; a base64 .js module where only scripts are served
    let buf = null;
    try { const r = await fetch('assets/sofa.glb'); if (r.ok) buf = await r.arrayBuffer(); } catch (e) { /* fall through */ }
    if (!buf) { const m = await import('./assets/sofa.js'); const b = atob(m.default); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); buf = u.buffer; }
    const gltf = await new GLTFLoader().parseAsync(buf, '');
    const sofa = gltf.scene;
    const box = new THREE.Box3().setFromObject(sofa), size = box.getSize(new THREE.Vector3());
    const s = 2.0 / Math.max(size.x, size.z);
    sofa.scale.setScalar(s);
    const b2 = new THREE.Box3().setFromObject(sofa), c = b2.getCenter(new THREE.Vector3());
    sofa.position.set(-c.x, -b2.min.y, -c.z);
    const holder = new THREE.Group(); holder.add(sofa);
    holder.position.set(2.5, 0, 1.05); holder.rotation.y = Math.PI / 2;
    sofa.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    gltf.scene.traverse((o) => { if (o.isLight) o.visible = false; });
    // swap the blocky placeholder couch for the real one
    const couch = WORLD.items.couchTV.children.find((g) => g.position.x === 2.5);
    if (couch) couch.visible = false;
    WORLD.items.couchTV.add(holder);
  } catch (e) { /* keep the placeholder couch */ }
}

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight);
}

// ---------- crew ----------
function placeCrew() {
  const o = S.owned;
  CREW.kev.root.visible = !!o.kev;
  CREW.kev.root.position.set(WORLD.seats.kev.x, 0, WORLD.seats.kev.z); CREW.kev.root.rotation.y = -Math.PI / 2; CREW.kev.setState('type');
  CREW.mo.root.visible = !!o.mo;
  CREW.mo.root.position.set(3.75, 0, -1.7); CREW.mo.root.rotation.y = -Math.PI / 2; CREW.mo.setState('phone');
}
const CREW_LINES = {
  kev: {
    intro: 'Custom tokens are ready. You seed the pool yourself, so you hold the LP tokens. Keep them, lock them, or burn them.',
    tip: () => pick(['Burn the LP and buyers relax. Keep it and RugRadar screams "not locked".', 'A short lock buys trust for a few minutes. When it expires, the LP is yours again. Everyone knows that, though.', 'Bigger pool, bigger moves needed to pump it. Smaller pool, faster chart.']),
    topics: [['tip', 'Any tips?'], ['lp', 'What\'s the LP thing?'], ['bye', 'Back to work']],
    lp: 'The pool is SOL on one side and tokens on the other. Whoever owns the LP tokens can withdraw both. Burn them and nobody can, ever. That\'s why RugRadar checks it first.',
  },
  mo: {
    intro: 'I run the community side now. Tele chats, replies, vibes. Your posts grow faster with me around.',
    tip: () => pick(['When a chat panics, a calm post from the dev cools it down.', `Credibility is at ${Math.round(S.cred * 100)}%. It multiplies every post you make.`, 'Called a coin before a 3x? People follow winners.', 'A coin that graduates without a rug does more for your account than ten shitposts.']),
    topics: [['tip', 'What\'s the vibe?'], ['bye', 'Thanks Mo']],
  },
};
function talkTo(key) {
  const p = CREW[key];
  G.dialogWith = key; G.mode = 'dialog';
  player.unlock();
  p.lookTarget = camera.position.clone(); p.say(3000);
  const L = CREW_LINES[key];
  const first = !S.flags['met_' + key];
  S.flags['met_' + key] = true;
  UI.openDialog(p, first ? L.intro : L.tip(), L.topics);
}
function dialogTopic(t) {
  const key = G.dialogWith; if (!key) return;
  const L = CREW_LINES[key];
  if (t === 'bye') { UI.closeDialog(); G.mode = 'walk'; G.dialogWith = null; player.lock(); return; }
  const text = t === 'tip' ? L.tip() : L[t];
  CREW[key].say(3200);
  UI.openDialog(CREW[key], text, L.topics);
}
BUS.addEventListener('bought', () => { WORLD.applyItems(S.owned); placeCrew(); saveGame(); });
function crewReact(type, coin) {
  if (type === 'graduated') text('Chad', `$${coin.ticker} GRADUATED!! WE'RE ON THE DEX BABY`);
  else if (type === 'koth' && chance(0.6)) text('Chad', `$${coin.ticker} is king of the hill on PumpBin 👑`);
  else if (type === 'viral') text('Chad', 'we are going VIRAL bro');
  else if (type === 'dead' && chance(0.5)) text('Chad', `rip $${coin.ticker}. next one`);
  else if (type === 'whale' && chance(0.35)) text('Chad', 'WHALE just aped 🐋');
}

// ---------- interactions ----------
function interactables() {
  const list = WORLD.interact.filter((it) => !it.need || S.owned[it.need]);
  for (const [k, p] of Object.entries(CREW)) {
    if (!p.root.visible) continue;
    const pos = new THREE.Vector3(); p.j.head.getWorldPosition(pos); pos.y -= 0.25;
    list.push({ id: 'crew_' + k, pos, r: 1.8, size: 0.5, label: () => `Talk to ${p.spec.name}`, action: 'talk', key: k });
  }
  return list;
}
function interact(it) {
  if (!it) return;
  AUDIO.sfx('click');
  switch (it.action) {
    case 'pc': sitAtPC(); break;
    case 'fridge': {
      WORLD.fridgeOpen = 1.4;
      const err = drink();
      if (err) UI.toast(err, 'bad'); else { AUDIO.sfx('can'); UI.toast(`+35 energy. ${S.drinks} drinks left.`, 'good'); }
      break;
    }
    case 'sleep': trySleep(); break;
    case 'whiteboard': showWhiteboard(); break;
    case 'stairs': UI.subtitle('Mom (upstairs)', pick(['Don\'t come up here unless you\'re doing the dishes!', 'Is that the bitcoin again? Your cousin has a real job.', 'Dinner was three hours ago!', 'Why is the electric bill so high?!', 'Are your friends staying over AGAIN?'])); AUDIO.sfx('knock'); break;
    case 'tv': UI.subtitle('Crypto News 24', newsHeadline()); break;
    case 'rig': UI.toast('The rig earns 0.35 SOL every time you sleep.', ''); break;
    case 'talk': talkTo(it.key); break;
  }
}
function sitAtPC() {
  G.mode = 'pc'; player.unlock(); player.enabled = false; UI.prompt(null);
  const seat = WORLD.seats.pc;
  player.tweenTo(seat, new THREE.Vector3(WORLD.DESK.x, 1.05, WORLD.DESK.z), 0.55, () => UI.openPC());
}
function leavePC() {
  UI.closePC();
  const back = new THREE.Vector3(WORLD.DESK.x, 1.63, WORLD.DESK.z + 1.35);
  player.tweenTo(back, new THREE.Vector3(WORLD.DESK.x, 1.4, WORLD.DESK.z - 2), 0.45, () => {
    player.setStand(new THREE.Vector3(back.x, 0, back.z), 0);
    player.enabled = true; G.mode = 'walk'; player.lock();
  });
  saveGame();
}
function trySleep() {
  const r = sleep();
  if (typeof r === 'string') { UI.toast(r, 'bad'); return; }
  AUDIO.sfx('sleep');
  player.unlock(); G.mode = 'modal';
  $('#fade').classList.add('on');
  setTimeout(() => {
    UI.modal(`<h2>Day ${S.day}</h2><p class="mut">You slept like a basement gremlin.</p><div class="sumlist">${r.lines.map(([a, b]) => `<div><span>${h(a)}</span><b>${h(b)}</b></div>`).join('')}</div>`, [['ok', 'Get up', 'primary']], () => { $('#fade').classList.remove('on'); G.mode = 'walk'; player.lock(); });
    placeCrew(); WORLD.applyItems(S.owned); saveGame();
  }, 700);
}
function showWhiteboard() {
  player.unlock(); G.mode = 'modal';
  UI.modal(`<h2>The Plan</h2><div class="sumlist">
    <div><span>Objective</span><b>${h(OBJECTIVES[S.objective] || 'Done. Enjoy the penthouse.')}</b></div>
    <div><span>Net worth</span><b>${fmtUSD(netWorth())}</b></div>
    <div><span>Followers</span><b>${fmtNum(S.followers)} (credibility ${Math.round(S.cred * 100)}%)</b></div>
    <div><span>Coins launched</span><b>${S.stats.launched}</b></div>
    <div><span>Graduated</span><b>${S.stats.graduated}</b></div>
    <div><span>Rugs</span><b>${S.stats.rugs}</b></div>
    <div><span>Creator fees earned</span><b>${fmtSOL(S.stats.feesSol)} SOL</b></div></div>`, [['ok', 'Back to work', 'primary']], () => { G.mode = 'walk'; player.lock(); });
}
function newsHeadline() {
  const last = S.history[0];
  if (last?.rugged) return `Breaking: $${last.ticker} collapses ${Math.round(90 + Math.random() * 9)}% after its creator cashed out. Holders furious.`;
  if (last?.graduated) return `$${last.ticker} graduates to the DEX as memecoin mania continues.`;
  return pick([`SOL trades at ${fmtUSD(S.solPrice)}. Analysts: "Number could go up. Or down."`, `${S.meta} coins dominate today's trending list.`, 'Survey: 97% of memecoins die within a day. The other 3% die within a week.', 'Local mom reports "strange typing noises" from basement at 4 AM.']);
}

// ---------- monitors / TV / whiteboard ----------
let screenT = 0;
function updateScreens(dt) {
  screenT += dt;
  if (screenT < 0.4) return;
  screenT = 0;
  const S_ = WORLD.screens;
  const c = focusCoin();
  const m = S_.main;
  if (m) {
    const ctx = m.ctx, w = m.canvas.width, hh = m.canvas.height;
    if (c) {
      drawChart(ctx, c, w, hh - 40, { max: 60 });
      ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, hh - 40, w, 40);
      ctx.fillStyle = '#e8e2d6'; ctx.font = 'bold 20px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(`$${c.ticker}  ${fmtUSD(c.mcapSol() * S.solPrice, { compact: true })}`, 12, hh - 20);
      WORLD.lights.screenGlow.color.set(c._mood === 'dip' || c._mood === 'devsold' ? 0xff5566 : c._mood === 'pump' ? 0x55ff99 : 0x6fa8ff);
    } else {
      ctx.fillStyle = '#0d0a14'; ctx.fillRect(0, 0, w, hh);
      ctx.fillStyle = '#ffb547'; ctx.font = '900 46px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('BASEMENT OS', w / 2, hh / 2 - 14);
      ctx.fillStyle = '#9a8f85'; ctx.font = '18px "JetBrains Mono", monospace'; ctx.fillText(`${clockText()} · ${fmtSOL(S.sol)} SOL`, w / 2, hh / 2 + 26);
      WORLD.lights.screenGlow.color.set(0xffb070);
    }
    m.tex.needsUpdate = true;
  }
  const m2 = S_.m2;
  if (m2 && WORLD.items.monitor2.visible) {
    const ctx = m2.ctx, w = m2.canvas.width, hh = m2.canvas.height;
    ctx.fillStyle = '#0c1016'; ctx.fillRect(0, 0, w, hh);
    ctx.font = '15px "JetBrains Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const msgs = c ? c.chat.slice(-12) : [];
    msgs.forEach((x, i) => { ctx.fillStyle = '#5aa9ff'; ctx.fillText(x.who.slice(0, 12), 10, 8 + i * 22); ctx.fillStyle = '#d8dee8'; ctx.fillText(x.text.slice(0, 34), 130, 8 + i * 22); });
    m2.tex.needsUpdate = true;
  }
  const m3 = S_.m3;
  if (m3 && WORLD.items.monitor3.visible) {
    const ctx = m3.ctx, w = m3.canvas.width, hh = m3.canvas.height;
    ctx.fillStyle = '#0c1016'; ctx.fillRect(0, 0, w, hh);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffb547'; ctx.font = '800 18px Manrope, sans-serif'; ctx.fillText('THE TRENCHES', 14, 20);
    ECO.filter((c) => c.isLive()).sort((a, b) => b.mcapSol() - a.mcapSol()).slice(0, 6).forEach((c, i) => {
      const y = 52 + i * 38;
      ctx.fillStyle = '#e8edf4'; ctx.font = '700 16px Manrope, sans-serif'; ctx.fillText('$' + c.ticker, 14, y);
      ctx.fillStyle = '#a3adbd'; ctx.font = '500 15px "JetBrains Mono", monospace'; ctx.fillText(fmtUSD(c.mcapSol() * S.solPrice, { compact: true }), 200, y);
      ctx.fillStyle = c._mood === 'dip' || c._mood === 'devsold' ? '#ff4d61' : '#1fd18a'; ctx.fillRect(330, y - 3, Math.min(160, c.progress() * 160), 6);
    });
    m3.tex.needsUpdate = true;
  }
  const tv = S_.tv;
  if (tv && WORLD.items.couchTV.visible) {
    const ctx = tv.ctx, w = tv.canvas.width, hh = tv.canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, '#132447'); g.addColorStop(1, '#0a1226'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh);
    ctx.fillStyle = '#d4202f'; ctx.fillRect(0, hh - 64, w, 34);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const head = newsHeadlineCached();
    const off = (performance.now() / 18) % (w + head.length * 10);
    ctx.fillText(head, w - off, hh - 47);
    ctx.font = '900 30px Impact, sans-serif'; ctx.fillText('CRYPTO NEWS 24', 20, 40);
    ctx.font = '22px "JetBrains Mono", monospace'; ctx.fillStyle = '#ffd34a'; ctx.fillText(`SOL ${fmtUSD(S.solPrice)}`, 20, 100);
    tv.tex.needsUpdate = true;
  }
  const wb = S_.whiteboard;
  const sig = [S.objective, S.stats.rugs, S.stats.graduated, S.stats.launched, Math.round(S.followers / 50)].join();
  if (wb && wb.sig !== sig) {
    wb.sig = sig;
    const ctx = wb.ctx, w = wb.canvas.width, hh = wb.canvas.height;
    ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, 0, w, hh);
    ctx.strokeStyle = 'rgba(120,130,150,0.15)'; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(Math.random() * w, Math.random() * hh); ctx.lineTo(Math.random() * w, Math.random() * hh); ctx.stroke(); }
    ctx.font = 'bold 64px "Comic Sans MS", "Marker Felt", cursive'; ctx.fillStyle = '#1b3fa0'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('THE PLAN', 40, 30);
    ctx.font = '36px "Comic Sans MS", "Marker Felt", cursive';
    const lines = OBJECTIVES.slice(Math.max(0, S.objective - 2), S.objective + 4);
    lines.forEach((l, i) => {
      const idx = Math.max(0, S.objective - 2) + i, done = idx < S.objective;
      ctx.fillStyle = done ? '#2c8a3c' : idx === S.objective ? '#c0202f' : '#333';
      ctx.fillText(`${done ? '✔' : idx === S.objective ? '→' : '•'} ${l.slice(0, 40)}`, 40, 130 + i * 70);
    });
    ctx.fillStyle = '#c0202f'; ctx.font = 'bold 40px "Comic Sans MS", cursive';
    ctx.fillText(`followers: ${fmtNum(S.followers)}`, 600, 40);
    wb.tex.needsUpdate = true;
  }
}
let _news = { t: 0, text: '' };
function newsHeadlineCached() { if (performance.now() - _news.t > 15000) _news = { t: performance.now(), text: newsHeadline() }; return _news.text; }

// ---------- menus ----------
function showTitle() {
  G.paused = true; G.mode = 'menu';
  document.body.classList.remove('playing');
  const m = $('#menu');
  m.hidden = false;
  const cont = hasSave();
  m.innerHTML = `<div class="title-wrap">
    <h1 class="logo">RUGGED</h1>
    <p class="tag">A memecoin game set in your mom's basement.</p>
    <div class="menu-btns">
      ${cont ? '<button class="btn primary big" data-m="continue">Continue</button>' : ''}
      <button class="btn ${cont ? '' : 'primary'} big" data-m="new">New game</button>
      <button class="btn" data-m="settings">Settings</button>
      <button class="btn" data-m="controls">Controls</button>
    </div>
    <p class="fine">Satire. Not financial advice. No real coins were harmed.</p></div>`;
}
function showPause() {
  if (G.mode !== 'walk' || !G.started) return;
  G.paused = true; G.mode = 'pause';
  const m = $('#menu'); m.hidden = false;
  m.innerHTML = `<div class="title-wrap small"><h2>Paused</h2><div class="menu-btns">
    <button class="btn primary big" data-m="resume">Resume</button><button class="btn" data-m="settings">Settings</button><button class="btn" data-m="controls">Controls</button><button class="btn ghost" data-m="quit">Save & quit to title</button></div></div>`;
}
function showSettings(back) {
  const m = $('#menu');
  m.innerHTML = `<div class="title-wrap small"><h2>Settings</h2>
    <label class="fld">Graphics<select id="set-q"><option value="high" ${SET.quality === 'high' ? 'selected' : ''}>High (bloom, sharp shadows)</option><option value="low" ${SET.quality === 'low' ? 'selected' : ''}>Low (phones, laptops)</option></select></label>
    <label class="fld">Look sensitivity <b id="sv">${SET.sens.toFixed(1)}</b><input type="range" id="set-s" min="0.3" max="2.5" step="0.1" value="${SET.sens}"></label>
    <label class="fld">Sound effects<input type="range" id="set-v" min="0" max="1" step="0.05" value="${SET.volume}"></label>
    <label class="fld">Music<input type="range" id="set-m" min="0" max="1" step="0.05" value="${SET.music}"></label>
    <p class="hint">Graphics changes apply after a reload.</p>
    <div class="menu-btns"><button class="btn primary" data-m="${back}">Back</button></div></div>`;
  $('#set-q').onchange = (e) => { SET.quality = e.target.value; saveSettings(); };
  $('#set-s').oninput = (e) => { SET.sens = +e.target.value; player.sens = SET.sens; $('#sv').textContent = SET.sens.toFixed(1); saveSettings(); };
  $('#set-v').oninput = (e) => { SET.volume = +e.target.value; AUDIO.setVolume(SET.volume); saveSettings(); };
  $('#set-m').oninput = (e) => { SET.music = +e.target.value; MUSIC.setVolume(SET.music); saveSettings(); };
}
function showControls(back) {
  const touch = player.isTouch;
  $('#menu').innerHTML = `<div class="title-wrap small"><h2>Controls</h2><div class="sumlist">
    ${touch ? '<div><span>Move</span><b>Left thumb</b></div><div><span>Look</span><b>Drag on the right</b></div><div><span>Use</span><b>USE button</b></div><div><span>Phone</span><b>📱 button</b></div>'
    : '<div><span>Move</span><b>WASD / arrows (Shift to run)</b></div><div><span>Look</span><b>Mouse</b></div><div><span>Use / talk</span><b>E or click</b></div><div><span>Phone</span><b>Tab or Q</b></div><div><span>Leave PC / pause</span><b>Esc</b></div>'}
    </div><div class="menu-btns"><button class="btn primary" data-m="${back}">Back</button></div></div>`;
}
function startPlaying(isNew) {
  $('#menu').hidden = true;
  AUDIO.init(); AUDIO.setVolume(SET.volume);
  MUSIC.vol = SET.music;
  if (!MUSIC.on && SET.music > 0) { MUSIC.play(MUSIC.idx, MUSIC.pausedAt); MUSIC.setVolume(SET.music); }
  document.body.classList.add('playing');
  WORLD.applyItems(S.owned); placeCrew();
  UI.updateObjective(); UI.updateHUD();
  G.paused = false; G.started = true; G.mode = 'walk';
  if (isNew) {
    player.setStand(new THREE.Vector3(-0.4, 0, -0.9), Math.PI * 0.92);
    G.mode = 'modal';
    UI.modal(`<h2>3:07 AM</h2><p>Mom's basement. <b>0.3 SOL</b> and <b>$25</b> to your name. 40 followers, and twelve of them are bots.</p><p>Chad keeps texting about memecoins. Launch them, post about them, grow an audience, and trade other devs' coins in the Trenches. Run them honestly and earn fees, or rug them and watch your followers walk.</p><p class="mut">Start at the PC on the north wall. Press Tab for your phone.</p>`, [['go', 'Let\'s get it', 'primary']], () => { G.mode = 'walk'; player.lock(); });
  } else player.lock();
}
function onMenuClick(e) {
  const b = e.target.closest('[data-m]'); if (!b) return;
  AUDIO.init(); AUDIO.sfx('click');
  const a = b.dataset.m;
  if (a === 'continue') { if (loadGame()) startPlaying(false); else { newGame(); startPlaying(true); } }
  else if (a === 'new') {
    if (hasSave() && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Overwrite your save? Click again'; return; }
    wipeSave(); newGame(); UI.draft = UI.newDraft(); startPlaying(true);
  }
  else if (a === 'settings') showSettings(G.started ? 'pause' : 'title');
  else if (a === 'controls') showControls(G.started ? 'pause' : 'title');
  else if (a === 'title') showTitle();
  else if (a === 'pause') { G.mode = 'walk'; showPause(); }
  else if (a === 'resume') { $('#menu').hidden = true; G.paused = false; G.mode = 'walk'; player.lock(); }
  else if (a === 'quit') { saveGame(); G.started = false; showTitle(); }
}
BUS.addEventListener('ending', () => {
  saveGame();
  setTimeout(() => {
    UI.closePC(); player.unlock(); G.mode = 'modal';
    const st = S.stats;
    UI.modal(`<div class="ending"><p class="kicker">Day ${S.day}</p><h2>You moved out.</h2><p>From 0.3 SOL in a basement to a penthouse.</p><div class="sumlist">
      <div><span>Coins launched</span><b>${st.launched}</b></div><div><span>Graduated</span><b>${st.graduated}</b></div><div><span>Ran clean</span><b>${st.legit}</b></div>
      <div><span>Rugs</span><b>${st.rugs}</b></div><div><span>Bagholders left behind</span><b>${fmtNum(st.victims)}</b></div><div><span>Their losses</span><b>${fmtUSD(st.victimLossSol * S.solPrice)}</b></div>
      <div><span>Creator fees</span><b>${fmtSOL(st.feesSol)} SOL</b></div><div><span>Followers</span><b>${fmtNum(S.followers)}</b></div></div>
      <p class="mut">${st.rugs === 0 ? 'And you never rugged anyone. Chad is weirdly proud.' : st.rugs > st.legit ? 'Mom still thinks you work in "liquidity".' : 'Some of your holders even made money.'}</p></div>`, [['new', 'New game', 'primary']], () => { wipeSave(); newGame(); startPlaying(true); });
  }, 600);
});

// ---------- input ----------
function bindInput() {
  $('#menu').addEventListener('click', onMenuClick);
  renderer.domElement.addEventListener('click', () => { AUDIO.init(); if (G.mode === 'walk' && !player.locked) player.lock(); else if (G.mode === 'walk' && player.target) interact(player.target); });
  addEventListener('pointerlockchange', () => {});
  BUS.addEventListener('lockchange', (e) => { if (!e.detail.locked && G.mode === 'walk' && G.started && !player.isTouch) setTimeout(() => { if (!player.locked && G.mode === 'walk') showPause(); }, 120); });
  addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === 'KeyE' && G.mode === 'walk') interact(player.target);
    if ((e.code === 'Tab' || e.code === 'KeyQ') && G.started && (G.mode === 'walk' || UI.phoneOpen)) { e.preventDefault(); UI.togglePhone(); }
    if (e.code === 'Escape') {
      if (G.mode === 'pc') leavePC();
      else if (G.mode === 'dialog') dialogTopic('bye');
      else if (UI.phoneOpen) UI.togglePhone(false);
    }
  });
  // touch controls
  const tz = $('#touch');
  if (player.isTouch) {
    tz.hidden = false; document.body.classList.add('touch');
    const stick = $('#stick'), knob = $('#knob');
    tz.addEventListener('touchstart', (e) => {
      AUDIO.init();
      for (const t of e.changedTouches) {
        if (t.target.closest('button')) continue;
        const side = t.clientX < innerWidth * 0.45 ? 'left' : 'right';
        const r = player.touchStart(t.identifier, t.clientX, t.clientY, side);
        if (r === 'move') { stick.hidden = false; stick.style.left = t.clientX + 'px'; stick.style.top = t.clientY + 'px'; knob.style.transform = 'translate(-50%,-50%)'; }
      }
    }, { passive: true });
    tz.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) { const r = player.touchMove(t.identifier, t.clientX, t.clientY); if (r) knob.style.transform = `translate(calc(-50% + ${r.dx}px), calc(-50% + ${r.dy}px))`; } e.preventDefault(); }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === player.touch.moveId) stick.hidden = true; player.touchEnd(t.identifier); } };
    tz.addEventListener('touchend', end); tz.addEventListener('touchcancel', end);
    $('#use-btn').addEventListener('click', () => interact(player.target));
    $('#phone-btn').addEventListener('click', () => { if (G.started && (G.mode === 'walk' || UI.phoneOpen)) UI.togglePhone(); });
    $('#menu-btn').addEventListener('click', () => { if (G.mode === 'walk') { G.paused = true; G.mode = 'pause'; showPause(); } });
  }
  $('#pc-close').addEventListener('click', () => leavePC());
  addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
}

// ---------- loop ----------
let last = performance.now(), saveT = 0, hudT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  G.frame++;
  if (!G.paused && S) {
    gameTick(dt);
    if (G.mode === 'walk') player.update(dt, interactables());
    else if (player.tween) player.update(dt, []);
    const tgt = G.mode === 'walk' ? player.target : null;
    UI.prompt(tgt ? tgt.label() : null);
    hudT += dt; if (hudT > 0.25) { hudT = 0; UI.updateHUD(); }
    UI.live();
    saveT += dt; if (saveT > 20) { saveT = 0; saveGame(); }
    AUDIO.updateFan(Math.hypot(camera.position.x - WORLD.DESK.x, camera.position.z - WORLD.DESK.z));
  }
  if (!S || !WORLD) return;
  // crew + world animate even in menus; skip heavy 3D while the PC covers the screen
  const covered = G.mode === 'pc' && !player.tween;
  if (covered && G.frame % 6) { updateScreens(dt); return; }
  const t = now / 1000;
  for (const p of Object.values(CREW)) {
    if (!p.root.visible) continue;
    const d = p.root.position.distanceTo(camera.position);
    p.lookTarget = d < 3.2 || G.dialogWith ? camera.position.clone() : null;
    p.update(dt, camera.position);
  }
  WORLD.update(dt, t, {});
  if (WORLD.speakerMat) WORLD.speakerMat.emissiveIntensity = 0.25 + MUSIC.level() * 5;
  updateScreens(dt);
  composer.render();
}

// hot-reload support for the artifact viewer
(function start() {
  const hot = window.claude?.hot;
  hot?.snapshot?.(() => { saveGame(); return {}; });
  boot().catch((e) => { setLoading('Something broke: ' + e.message, 100); console.error(e); });
})();

// test hook (only with #debug in the URL)
if (location.hash.includes('debug')) {
  window.__rug = { get S() { return S; }, get LIVE() { return LIVE; }, get ECO() { return ECO; }, get G() { return G; }, UI, MUSIC, tradeBuy, devBuyMore, spawnNpcCoin, CREW, sitAtPC, leavePC, interact, launchCoin, postChirp, devSell, closeCoin, gameTick, cashOut, buyItem, trySleep, placeCrew,
    player: () => player, camera: () => camera, world: () => WORLD };
}

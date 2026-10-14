// preview-only bootstrap (not shipped)
TEX_SIZE = 1024;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1280, 720); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050407);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.12;
const camera = new THREE.PerspectiveCamera(70, 1280 / 720, 0.03, 60);
const t0 = performance.now();
const W = buildWorld(scene, { tex: 1024, shadow: 2048, high: true });
console.log('[p] world built in', Math.round(performance.now() - t0), 'ms');
const owned = { monitor2: true, monitor3: true, ledStrip: true, neon: true, rug: true, lavaLamp: true, posters: true, kevDesk: true, miningRig: true };
W.applyItems(owned);
const crew = {};
for (const k of ['chad', 'kev', 'mo']) { crew[k] = new Person(CREW_SPECS[k]); scene.add(crew[k].root); }
crew.chad.root.position.set(0.9, 0, -1.2); crew.chad.root.rotation.y = -0.5; crew.chad.setState('phone');
crew.kev.root.position.copy(W.seats.kev).setY(0); crew.kev.root.rotation.y = -Math.PI / 2; crew.kev.setState('type');
crew.mo.root.position.set(3.9, 0, -1.7); crew.mo.root.rotation.y = -Math.PI / 2 - 0.4; crew.mo.setState('count');
// fake screen content
for (const k of ['main', 'm2', 'm3']) { const s = W.screens[k]; const c = s.ctx; c.fillStyle = '#0b0f14'; c.fillRect(0, 0, s.canvas.width, s.canvas.height); let y = s.canvas.height * 0.7; for (let i = 0; i < 40; i++) { const o = y; y -= (Math.random() - 0.4) * 14; c.fillStyle = y < o ? '#38e08c' : '#ff4d5e'; c.fillRect(10 + i * 12, Math.min(o, y), 8, Math.max(2, Math.abs(o - y))); } s.tex.needsUpdate = true; }
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.55, 0.5, 0.82));
composer.addPass(new OutputPass());
const views = {
  wide: [[2.6, 1.62, 2.6], [-1.2, 1.0, -2.6]],
  desk: [[-1.2, 1.55, -1.6], [-1.5, 0.95, -3.8]],
  chad: [[0.95, 1.62, -0.35], [0.9, 1.55, -1.2]],
  kev: [[-2.35, 1.35, -1.35], [-3.15, 1.25, -1.55]],
  mo: [[3.0, 1.6, -1.25], [3.9, 1.5, -1.7]],
  stairs: [[-1.0, 1.6, 2.6], [-4.4, 1.6, 0.8]],
  laundry: [[0.5, 1.6, 0.8], [4.0, 1.0, -2.2]],
  face: [[0.92, 1.66, -0.75], [0.9, 1.62, -1.2]],
};
window.__shot = (name) => {
  const v = views[name];
  camera.position.set(...v[0]); camera.lookAt(new THREE.Vector3(...v[1]));
  for (const p of Object.values(crew)) p.lookTarget = camera.position.clone();
  for (let i = 0; i < 40; i++) { for (const p of Object.values(crew)) p.update(1 / 30, camera.position); W.update(1 / 30, i / 30, {}); }
  composer.render();
};
window.__ready = true;

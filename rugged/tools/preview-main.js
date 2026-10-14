// preview-only bootstrap (not shipped): renders the crew in the basement
TEX_SIZE = 1024;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1280, 720); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050407);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.12;
const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.01, 60);
const W = buildWorld(scene, { tex: 1024, shadow: 2048, high: true });
W.applyItems({ monitor2: true, ledStrip: true, posters: true, kevDesk: true });
const crew = {};
for (const k of ['chad', 'kev', 'mo']) { crew[k] = new Person({ ...CREW_SPECS[k], ...(k === 'mo' ? { phone: true, cash: false } : {}) }); scene.add(crew[k].root); }
crew.chad.root.position.set(0.0, 0, -1.0); crew.chad.root.rotation.y = 0; crew.chad.setState('stand');
crew.kev.root.position.set(-0.8, 0, -1.2); crew.kev.root.rotation.y = 0.3; crew.kev.setState('stand');
crew.mo.root.position.set(0.8, 0, -1.2); crew.mo.root.rotation.y = -0.3; crew.mo.setState('stand');
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.5, 0.45, 0.85));
composer.addPass(new OutputPass());
const views = {
  lineup: [[0, 1.45, 1.4], [0, 1.2, -1.1], 50],
  chadface: [[0.0, 1.7, -0.55], [0, 1.66, -1.0], 40],
  kevface: [[-0.62, 1.66, -0.75], [-0.8, 1.62, -1.2], 40],
  moface: [[0.62, 1.7, -0.75], [0.8, 1.66, -1.2], 40],
  profile: [[0.45, 1.68, -1.0], [0, 1.66, -1.0], 40],
};
window.__shot = (name) => {
  const v = views[name];
  camera.position.set(...v[0]); camera.lookAt(new THREE.Vector3(...v[1])); camera.fov = v[2]; camera.updateProjectionMatrix();
  for (const p of Object.values(crew)) p.lookTarget = name === 'profile' ? null : camera.position.clone();
  if (name === 'chadface') crew.chad.say(5000);
  for (let i = 0; i < 50; i++) { for (const p of Object.values(crew)) p.update(1 / 30); W.update(1 / 30, i / 30, {}); }
  composer.render();
};
window.__ready = true;

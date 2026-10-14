// ============================================================
// WORLD — the basement
// Room: x [-5,5], z [-4,4], floor y=0, subfloor (ceiling) y=2.5,
// joists hang to y=2.26. Stairs climb the west wall to Mom's door.
// ============================================================
const ROOM = { x0: -5, x1: 5, z0: -4, z1: 4, h: 2.5 };

// Planar UVs in world meters (good for boxes / flat-faced meshes)
function planarUV(geo, scale = 1, grainY = false) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = z; v = y; } else if (ay >= az) { u = x; v = z; } else { u = x; v = y; }
    if (grainY) { const t = u; u = v; v = t; }
    uv.setXY(i, u / scale, v / scale);
  }
  uv.needsUpdate = true;
  return geo;
}

function buildWorld(scene, Q) {
  const W = {
    colliders: [], interact: [], screens: {}, items: {}, anim: [], lights: {}, root: new THREE.Group(),
    fridgeDoor: null, bulbs: [], fans: [], blinkers: [], seats: {},
  };
  scene.add(W.root);
  const S = Q.tex;
  const R = W.root;

  // ---------- textures ----------
  const T = {};
  const concrete = genConcrete(S);
  T.floor = texSet(concrete, [4, 3.2]);
  const cinder = genCinder(S, Math.round(S * 1.5));
  T.wall = texSet(cinder);
  const pine = genWood(S / 2, { seed: 33, light: [214, 176, 122], dark: [170, 126, 78], rings: 2, knots: true, rough: 0.8 });
  T.pine = texSet(pine);
  const ply = genWood(S / 2, { seed: 34, light: [200, 160, 108], dark: [150, 108, 62], rings: 4, planks: 2, rough: 0.85 });
  T.ply = texSet(ply);
  const oak = genWood(S / 2, { seed: 35, light: [160, 112, 70], dark: [96, 60, 34], rings: 5, rough: 0.55 });
  T.oak = texSet(oak);
  const doorPaint = genPaintedMetal(256, [236, 232, 222], 0.04); T.doorPaint = texSet(doorPaint);
  const knit = genKnit(S / 2); T.knit = texSet(knit);
  const denim = genDenim(S / 2); T.denim = texSet(denim);
  const weave = genWeave(S / 2); T.weave = texSet(weave);
  const leather = genLeather(S / 4); T.leather = texSet(leather);
  const white = genPaintedMetal(S / 4, [232, 230, 222], 0.12); T.whiteMetal = texSet(white);
  const gray = genPaintedMetal(S / 4, [120, 128, 136], 0.3); T.grayMetal = texSet(gray);
  const galv = genGalvanized(S / 4); T.galv = texSet(galv);
  const cardboard = genCardboard(S / 4); T.cardboard = texSet(cardboard);
  const insul = genInsulation(S / 4); T.insul = texSet(insul);
  const mattress = genMattress(S / 2); T.mattress = texSet(mattress);
  const rug = genRug(S / 2); T.rug = texSet(rug);
  W.textures = T;

  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M.floor = std({ ...T.floor, roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) });
  M.wall = std({ ...T.wall, roughness: 1, normalScale: new THREE.Vector2(0.9, 0.9) });
  M.pine = std({ ...T.pine, roughness: 1 });
  M.ply = std({ ...T.ply, roughness: 1 });
  M.oak = std({ ...T.oak, roughness: 0.9 });
  M.door = std({ ...T.doorPaint, roughness: 0.7 });
  M.whiteMetal = std({ ...T.whiteMetal, metalness: 0.2 });
  M.grayMetal = std({ ...T.grayMetal, metalness: 0.4 });
  M.galv = std({ ...T.galv, metalness: 0.85 });
  M.cardboard = std({ ...T.cardboard });
  M.insul = std({ ...T.insul, roughness: 1 });
  M.black = std({ color: 0x15161a, roughness: 0.5, metalness: 0.2 });
  M.plastic = std({ color: 0x2a2c33, roughness: 0.45 });
  M.beige = std({ color: 0xd8cfb8, roughness: 0.55 });
  M.steel = std({ color: 0x8a9099, roughness: 0.35, metalness: 0.9 });
  M.chrome = std({ color: 0xdfe3ea, roughness: 0.15, metalness: 1 });
  M.copper = std({ color: 0xb36a3c, roughness: 0.35, metalness: 1 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x9fb7c9, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.25 });
  M.screenOff = std({ color: 0x07080a, roughness: 0.2, metalness: 0.5 });
  W.mats = M;

  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = R, cast = true, recv = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z, parent = R, uvScale = 0) => {
    const g = new THREE.BoxGeometry(w, h, d); if (uvScale) planarUV(g, uvScale);
    return mesh(g, mat, x, y, z, parent);
  };
  const rbox = (w, h, d, r, mat, x, y, z, parent = R, uvScale = 0) => {
    const g = new RoundedBoxGeometry(w, h, d, 3, r); if (uvScale) planarUV(g, uvScale);
    return mesh(g, mat, x, y, z, parent);
  };
  const cyl = (rt, rb, h, mat, x, y, z, parent = R, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, parent);
  const collide = (x0, z0, x1, z1) => W.colliders.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) });
  const group = (x = 0, y = 0, z = 0, parent = R) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  W.helpers = { mesh, box, rbox, cyl, group, collide };

  // ---------- shell ----------
  {
    const fg = new THREE.PlaneGeometry(10, 8); fg.rotateX(-Math.PI / 2);
    const f = mesh(fg, M.floor, 0, 0, 0, R, false, true);
    // floor drain
    const drain = mesh(new THREE.CircleGeometry(0.09, 24), std({ color: 0x3b3a38, roughness: 0.6, metalness: 0.6 }), 3.6, 0.002, -2.4, R, false, true);
    drain.rotation.x = -Math.PI / 2;
    const walls = [
      { L: 10, x: 0, z: ROOM.z0, ry: 0 },
      { L: 10, x: 0, z: ROOM.z1, ry: Math.PI },
      { L: 8, x: ROOM.x0, z: 0, ry: Math.PI / 2 },
      { L: 8, x: ROOM.x1, z: 0, ry: -Math.PI / 2 },
    ];
    for (const w of walls) {
      const g = new THREE.PlaneGeometry(w.L, ROOM.h);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * w.L / 1.6);
      const m = mesh(g, M.wall, w.x, ROOM.h / 2, w.z, R, false, true);
      m.rotation.y = w.ry;
    }
    // subfloor above, with stairwell opening (x -4.95..-3.95, z 0.1..3.7)
    const sub = new THREE.Shape();
    sub.moveTo(-5, -4); sub.lineTo(5, -4); sub.lineTo(5, 4); sub.lineTo(-5, 4); sub.lineTo(-5, 3.7); sub.lineTo(-3.95, 3.7); sub.lineTo(-3.95, 0.1); sub.lineTo(-5, 0.1); sub.lineTo(-5, -4);
    const sg = new THREE.ShapeGeometry(sub); sg.rotateX(Math.PI / 2);
    planarUV(sg, 1.2);
    mesh(sg, M.ply, 0, ROOM.h, 0, R, false, true);
    // joists (run along z), 2x10 every 40cm
    for (let x = -4.8; x <= 4.8; x += 0.4) {
      const inStair = x < -3.9;
      if (inStair) {
        box(0.045, 0.24, 3.95, M.pine, x, ROOM.h - 0.12, -1.95, R, 0.9);
        box(0.045, 0.24, 0.3, M.pine, x, ROOM.h - 0.12, 3.85, R, 0.9);
      } else box(0.045, 0.24, 8, M.pine, x, ROOM.h - 0.12, 0, R, 0.9);
      // pink insulation between some joists near the rim
      if (x < 4.6 && !inStair) {
        box(0.35, 0.16, 0.6, M.insul, x + 0.2, ROOM.h - 0.08, -3.68, R, 0.5);
        box(0.35, 0.16, 0.6, M.insul, x + 0.2, ROOM.h - 0.08, 3.68, R, 0.5);
      }
    }
    // header beam (steel I-beam) across the middle
    const beam = group(0, ROOM.h - 0.24, 0.6);
    box(10, 0.012, 0.14, M.grayMetal, 0, 0.0, 0, beam);
    box(10, 0.2, 0.01, M.grayMetal, 0, -0.1, 0, beam);
    box(10, 0.012, 0.14, M.grayMetal, 0, -0.2, 0, beam);
    // steel lally column under the beam
    cyl(0.05, 0.05, ROOM.h - 0.44, M.grayMetal, 0.9, (ROOM.h - 0.44) / 2, 0.6);
    cyl(0.12, 0.12, 0.02, M.grayMetal, 0.9, ROOM.h - 0.45, 0.6);
    collide(0.82, 0.52, 0.98, 0.68);
    // sill plate on the walls top
    box(10, 0.04, 0.14, M.pine, 0, ROOM.h - 0.02, ROOM.z0 + 0.07, R, 1);
    box(10, 0.04, 0.14, M.pine, 0, ROOM.h - 0.02, ROOM.z1 - 0.07, R, 1);
  }

  // ---------- ductwork & pipes ----------
  {
    const trunk = box(7.2, 0.22, 0.42, M.galv, 0.9, ROOM.h - 0.38, -2.2, R, 0.6);
    for (const x of [-2, 0.3, 2.4]) {
      const d = cyl(0.08, 0.08, 1.6, M.galv, x, ROOM.h - 0.33, -1.2, R, 20); d.rotation.x = Math.PI / 2;
      const reg = box(0.3, 0.02, 0.14, M.whiteMetal, x, ROOM.h - 0.42, -0.42);
    }
    // copper water line + PVC drain along north wall
    const p1 = cyl(0.012, 0.012, 9.6, M.copper, 0, ROOM.h - 0.3, -3.88, R, 10); p1.rotation.z = Math.PI / 2;
    const p2 = cyl(0.04, 0.04, 9.6, std({ color: 0xe9e9e4, roughness: 0.4 }), 0, ROOM.h - 0.36, -3.82, R, 14); p2.rotation.z = Math.PI / 2;
    // electrical: armored cable + junction box
    const cable = cyl(0.008, 0.008, 6, M.steel, -1.5, ROOM.h - 0.27, 1.6, R, 6); cable.rotation.z = Math.PI / 2;
  }

  // ---------- lighting ----------
  {
    const hemi = new THREE.HemisphereLight(0x8a96b8, 0x2a1d14, 0.12);
    R.add(hemi);
    const makeBulb = (x, z, power, shadows) => {
      const g = group(x, ROOM.h - 0.24, z);
      cyl(0.04, 0.05, 0.06, M.beige, 0, -0.03, 0, g, 16);
      const glass = mesh(new THREE.SphereGeometry(0.045, 20, 14), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 6, roughness: 0.3 }), 0, -0.1, 0, g, false, false);
      const chain = cyl(0.002, 0.002, 0.45, M.chrome, 0.03, -0.3, 0, g, 4);
      const pull = mesh(new THREE.SphereGeometry(0.008, 8, 6), M.chrome, 0.03, -0.53, 0, g);
      const pl = new THREE.PointLight(0xffd3a3, power, 9, 2);
      pl.position.set(x, ROOM.h - 0.36, z);
      R.add(pl);
      let spot = null;
      if (shadows) {
        spot = new THREE.SpotLight(0xffd3a3, power * 1.6, 10, 1.25, 0.65, 2);
        spot.position.set(x, ROOM.h - 0.36, z);
        spot.target.position.set(x, 0, z);
        spot.castShadow = true;
        spot.shadow.mapSize.set(Q.shadow, Q.shadow);
        spot.shadow.bias = -0.0006; spot.shadow.normalBias = 0.02;
        spot.shadow.camera.near = 0.1; spot.shadow.camera.far = 8;
        R.add(spot); R.add(spot.target);
      }
      W.bulbs.push({ glass, pl, spot, base: power, flicker: 0 });
      return g;
    };
    makeBulb(-0.4, -0.6, 2.2, true);
    makeBulb(3.4, -1.2, 1.1, Q.high);
    // desk lamp + monitor glow are added with the desk
    // moonlight through the hopper windows
    const moon = new THREE.SpotLight(0x7f9cff, 2.2, 12, 0.5, 0.8, 1.2);
    moon.position.set(1.8, 3.6, 6.5); moon.target.position.set(0.5, 0, 0.5);
    moon.castShadow = Q.high; moon.shadow.mapSize.set(512, 512);
    R.add(moon); R.add(moon.target);
    W.lights.moon = moon;
  }

  // ---------- hopper windows (south wall, high) ----------
  {
    const winMat = new THREE.MeshStandardMaterial({ color: 0x05070c, emissive: 0x0d1830, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.2 });
    W.windowMats = [];
    for (const x of [0.4, 2.9]) {
      const g = group(x, 2.05, ROOM.z1 - 0.01);
      box(0.84, 0.42, 0.08, M.whiteMetal, 0, 0, -0.02, g);
      const pane = mesh(new THREE.PlaneGeometry(0.74, 0.32), winMat.clone(), 0, 0, -0.065, g, false, false);
      pane.rotation.y = Math.PI;
      W.windowMats.push(pane.material);
      box(0.76, 0.02, 0.02, M.whiteMetal, 0, 0, -0.07, g);
      // a few dead leaves in the window well
      box(0.8, 0.03, 0.12, std({ color: 0x3c2c1a, roughness: 1 }), 0, -0.2, -0.11, g);
    }
  }

  // ---------- stairs to Mom's door ----------
  {
    const sx0 = -4.95, sx1 = -3.97, zBottom = 3.62, zTop = 0.12;
    const steps = 13, rise = ROOM.h / steps, run = (zBottom - zTop) / steps;
    const st = group(0, 0, 0);
    for (let i = 0; i < steps; i++) {
      const y = rise * (i + 1), z = zBottom - run * (i + 0.5);
      box(sx1 - sx0, 0.03, run + 0.03, M.pine, (sx0 + sx1) / 2, y - 0.015, z, st, 0.6);
      box(sx1 - sx0, rise - 0.03, 0.015, M.ply, (sx0 + sx1) / 2, y - rise / 2 - 0.015, z + run / 2 - 0.01, st, 0.6);
    }
    // stringers
    const len = Math.hypot(zBottom - zTop, ROOM.h);
    const ang = Math.atan2(ROOM.h, zBottom - zTop);
    for (const x of [sx0 + 0.03, sx1 - 0.03]) {
      const s = box(0.04, 0.24, len, M.pine, x, ROOM.h / 2 - 0.12, (zBottom + zTop) / 2, st, 0.9);
      s.rotation.x = ang;
    }
    // handrail on the open side
    const rail = cyl(0.022, 0.022, len, M.oak, sx1 + 0.02, ROOM.h / 2 + 0.85, (zBottom + zTop) / 2, st, 10);
    rail.rotation.x = Math.PI / 2 - ang;
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4;
      const z = zBottom - t * (zBottom - zTop), y = t * ROOM.h;
      box(0.04, 0.9, 0.04, M.pine, sx1 + 0.02, y + 0.45, z, st);
    }
    // stairwell walls above the opening, door at top
    const shaftH = 2.3;
    box(0.02, shaftH, 3.6, M.door, sx1 + 0.01, ROOM.h + shaftH / 2, (zBottom + zTop) / 2, st);
    box(1.0, 0.02, 3.6, M.door, (sx0 + sx1) / 2, ROOM.h + shaftH, (zBottom + zTop) / 2, st);
    // landing + door (faces +z, at the top of the stairs)
    box(1.0, 0.04, 0.6, M.pine, (sx0 + sx1) / 2, ROOM.h, zTop - 0.2, st);
    const door = group((sx0 + sx1) / 2, ROOM.h, zTop - 0.48, st);
    rbox(0.82, 2.0, 0.045, 0.01, M.door, 0, 1.0, 0, door);
    for (const [y, h] of [[1.45, 0.7], [0.55, 0.75]]) { rbox(0.62, h, 0.012, 0.005, M.door, 0, y, 0.027, door); }
    mesh(new THREE.SphereGeometry(0.03, 16, 12), M.chrome, 0.31, 1.0, 0.05, door);
    // warm light leaking under Mom's door
    const leak = mesh(new THREE.PlaneGeometry(0.8, 0.012), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), 0, 0.006, 0.03, door, false, false);
    const leakLight = new THREE.PointLight(0xffc988, 0.6, 3, 2); leakLight.position.set(0, 0.1, 0.25); door.add(leakLight);
    W.momDoor = door; W.momLeak = leakLight;
    collide(sx0, zTop - 0.1, sx1 + 0.06, zBottom + 0.05);
    W.interact.push({ id: 'stairs', pos: new THREE.Vector3(-4.2, 1.2, 3.3), r: 1.6, label: () => 'Go upstairs', action: 'stairs' });
    // boxes under the stairs
    const labels = ['XMAS', 'TAXES 2019', "DAD'S STUFF", 'MOM - DO NOT TOUCH', 'HALLOWEEN', 'BEANIE BABIES'];
    let li = 0;
    for (const [x, y, z, w, h, d] of [[-4.55, 0.2, 2.9, 0.6, 0.4, 0.5], [-4.55, 0.6, 2.95, 0.5, 0.38, 0.45], [-4.5, 0.18, 2.3, 0.55, 0.36, 0.5], [-4.6, 0.15, 1.75, 0.5, 0.3, 0.45]]) {
      const tex = toTex(drawBoxLabel(labels[li++ % labels.length]));
      const m = new THREE.MeshStandardMaterial({ map: tex, normalMap: T.cardboard.normalMap, roughness: 0.9 });
      const b = rbox(w, h, d, 0.012, m, x, y, z); b.rotation.y = (Math.random() - 0.5) * 0.3;
    }
  }

  // ---------- desk area (north wall) ----------
  const DESK = { x: -1.55, z: -3.6, top: 0.76 };
  W.DESK = DESK;
  {
    // an old door slab on two sawhorses
    const desk = group(DESK.x, 0, DESK.z);
    W.items.deskBasic = desk;
    const slab = rbox(1.9, 0.04, 0.78, 0.008, M.door, 0, DESK.top - 0.02, 0, desk);
    const hole = mesh(new THREE.CircleGeometry(0.028, 20), M.black, 0.84, DESK.top + 0.0005, 0.2, desk, false, false); hole.rotation.x = -Math.PI / 2;
    for (const sx of [-0.7, 0.7]) {
      const sh = group(sx, 0, 0, desk);
      box(0.08, 0.06, 0.7, M.pine, 0, DESK.top - 0.07, 0, sh);
      for (const s of [-1, 1]) for (const zz of [-0.28, 0.28]) {
        const leg = box(0.05, 0.76, 0.05, M.pine, s * 0.12, 0.36, zz, sh); leg.rotation.z = s * 0.2;
      }
    }
    collide(DESK.x - 0.97, DESK.z - 0.42, DESK.x + 0.97, DESK.z + 0.42);
    W.interact.push({ id: 'pc', pos: new THREE.Vector3(DESK.x, 1.0, DESK.z + 0.3), r: 1.7, label: () => 'Use PC', action: 'pc' });

    // monitors with live canvas screens
    const makeMonitor = (key, x, rotY, parent, size = [0.53, 0.31], big = false) => {
      const g = group(x, DESK.top, 0.05, parent);
      g.rotation.y = rotY;
      const [w, h] = size;
      rbox(0.18, 0.012, 0.14, 0.004, M.plastic, 0, 0.006, 0, g);
      box(0.03, 0.2, 0.025, M.plastic, 0, 0.1, -0.03, g);
      const body = rbox(w + 0.025, h + 0.025, 0.035, 0.008, M.plastic, 0, 0.08 + h / 2 + 0.02, -0.01, g);
      const cv = newCanvas(512, Math.round(512 * h / w)); const ctx = cv.getContext('2d');
      ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, cv.width, cv.height);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const smat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
      smat.color.setScalar(0.85);
      const scr = mesh(new THREE.PlaneGeometry(w, h), smat, 0, 0.08 + h / 2 + 0.02, 0.0085, g, false, false);
      W.screens[key] = { canvas: cv, ctx, tex, mesh: scr, group: g };
      return g;
    };
    const mon = group(0, 0, 0, desk);
    makeMonitor('main', 0, 0, mon);
    W.items.monitor2 = makeMonitor('m2', -0.6, 0.35, mon);
    W.items.monitor3 = makeMonitor('m3', 0.6, -0.35, mon);
    // keyboard & mouse
    const kb = rbox(0.44, 0.022, 0.14, 0.006, M.plastic, -0.02, DESK.top + 0.011, 0.24, desk);
    const keyMat = std({ color: 0x3a3d46, roughness: 0.6 });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) box(0.024, 0.008, 0.022, keyMat, -0.02 - 0.2 + c * 0.0285, DESK.top + 0.026, 0.24 - 0.052 + r * 0.026, desk);
    rbox(0.06, 0.025, 0.1, 0.012, M.plastic, 0.32, DESK.top + 0.0125, 0.26, desk);
    // energy drink cans
    const canCv = newCanvas(256, 128), cc = canCv.getContext('2d');
    cc.fillStyle = '#121418'; cc.fillRect(0, 0, 256, 128); cc.fillStyle = '#7dff3a'; cc.font = '900 64px Impact, sans-serif'; cc.fillText('VOLT', 60, 90);
    cc.strokeStyle = '#7dff3a'; cc.lineWidth = 6; cc.beginPath(); cc.moveTo(10, 20); cc.lineTo(40, 64); cc.lineTo(20, 64); cc.lineTo(50, 108); cc.stroke();
    const canMat = new THREE.MeshStandardMaterial({ map: toTex(canCv), metalness: 0.6, roughness: 0.35 });
    W.cans = [];
    for (let i = 0; i < 9; i++) {
      const c = cyl(0.033, 0.033, 0.12, canMat, -0.85 + (i % 3) * 0.075, DESK.top + 0.06, -0.22 + Math.floor(i / 3) * 0.08, desk, 18);
      c.rotation.y = Math.random() * 6; c.visible = i < 2;
      W.cans.push(c);
    }
    // crushed can + pizza box on the floor
    const pz = rbox(0.42, 0.04, 0.42, 0.005, M.cardboard, 0.4, 0.02, 0.75, desk); pz.rotation.y = 0.4;
    // desk lamp
    const lamp = group(0.8, DESK.top, -0.22, desk);
    cyl(0.07, 0.08, 0.02, M.black, 0, 0.01, 0, lamp);
    const arm = cyl(0.008, 0.008, 0.38, M.black, 0, 0.2, 0, lamp, 8); arm.rotation.z = 0.25;
    const shade = mesh(new THREE.ConeGeometry(0.07, 0.1, 20, 1, true), std({ color: 0x1c1d22, side: THREE.DoubleSide, roughness: 0.4 }), -0.08, 0.38, 0.05, lamp);
    shade.rotation.z = -0.9;
    const lampBulb = mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd9a0, emissiveIntensity: 4 }), -0.1, 0.35, 0.05, lamp, false, false);
    const lampLight = new THREE.PointLight(0xffd9a0, 0.35, 2.5, 2); lampLight.position.set(-0.12, 0.3, 0.06); lamp.add(lampLight);
    // monitor glow (color follows the chart)
    const glow = new THREE.PointLight(0x6fa8ff, 0.9, 3.2, 2); glow.position.set(0, DESK.top + 0.35, 0.45); desk.add(glow);
    W.lights.screenGlow = glow;

    // beige office tower (replaced by gaming PC upgrade)
    const tower = group(1.15, 0, 0.05, desk);
    W.items.towerBasic = tower;
    rbox(0.19, 0.42, 0.44, 0.01, M.beige, 0, 0.21, 0, tower);
    box(0.15, 0.04, 0.005, std({ color: 0x777064 }), 0, 0.33, 0.222, tower);
    mesh(new THREE.CircleGeometry(0.008, 10), new THREE.MeshBasicMaterial({ color: 0x3cff6a }), 0.05, 0.15, 0.2215, tower, false, false);
    // gaming PC with glass side and RGB fans
    const gpc = group(1.15, 0, 0.0, desk);
    W.items.gamingPC = gpc;
    rbox(0.23, 0.5, 0.48, 0.012, M.black, 0, 0.25, 0, gpc);
    const glass = mesh(new THREE.PlaneGeometry(0.44, 0.44), M.glass, -0.117, 0.27, 0, gpc, false, false); glass.rotation.y = -Math.PI / 2;
    W.rgbMats = [];
    for (let i = 0; i < 3; i++) {
      const fm = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff00ff, emissiveIntensity: 3 });
      const ring = mesh(new THREE.TorusGeometry(0.05, 0.007, 8, 24), fm, 0, 0.13 + i * 0.13, 0.242, gpc, false, false);
      const blades = mesh(new THREE.CircleGeometry(0.045, 6), std({ color: 0x222 }), 0, 0.13 + i * 0.13, 0.241, gpc, false, false);
      W.fans.push(blades); W.rgbMats.push(fm);
    }
    const gpu = box(0.02, 0.1, 0.3, std({ color: 0x24262c, metalness: 0.6, roughness: 0.4 }), -0.06, 0.22, 0, gpc);
    const rgbLight = new THREE.PointLight(0xff00ff, 0.5, 1.5, 2); rgbLight.position.set(-0.2, 0.3, 0.1); gpc.add(rgbLight);
    W.lights.rgb = rgbLight;

    // folding chair (replaced by gaming chair)
    const chair = group(DESK.x, 0, DESK.z + 0.85);
    W.items.chairBasic = chair;
    const metalDark = std({ color: 0x4b4f57, metalness: 0.7, roughness: 0.4 });
    rbox(0.42, 0.03, 0.4, 0.01, metalDark, 0, 0.46, 0, chair);
    const back = rbox(0.42, 0.26, 0.02, 0.01, metalDark, 0, 0.72, 0.21, chair); back.rotation.x = -0.12;
    for (const s of [-1, 1]) {
      const fl = cyl(0.01, 0.01, 0.9, metalDark, s * 0.2, 0.42, 0.06, chair, 8); fl.rotation.x = 0.28;
      const bl = cyl(0.01, 0.01, 0.5, metalDark, s * 0.2, 0.24, 0.12, chair, 8); bl.rotation.x = -0.4;
    }
    const gchair = group(DESK.x, 0, DESK.z + 0.85);
    W.items.gamingChair = gchair;
    const lMat = std({ ...T.leather, color: 0x1a1b20, roughness: 0.5 });
    const red = std({ ...T.leather, color: 0xc0203a, roughness: 0.5 });
    rbox(0.52, 0.1, 0.5, 0.04, lMat, 0, 0.5, 0, gchair);
    const gb = rbox(0.5, 0.78, 0.1, 0.05, lMat, 0, 0.95, 0.26, gchair); gb.rotation.x = -0.12;
    const gbs = rbox(0.12, 0.7, 0.11, 0.05, red, -0.16, 0.95, 0.265, gchair); gbs.rotation.x = -0.12;
    const gbs2 = rbox(0.12, 0.7, 0.11, 0.05, red, 0.16, 0.95, 0.265, gchair); gbs2.rotation.x = -0.12;
    rbox(0.18, 0.12, 0.08, 0.04, red, 0, 1.28, 0.31, gchair);
    cyl(0.03, 0.03, 0.3, M.chrome, 0, 0.3, 0, gchair, 12);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leg = box(0.04, 0.03, 0.3, M.black, Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15, gchair); leg.rotation.y = a; cyl(0.025, 0.025, 0.03, M.black, Math.sin(a) * 0.3, 0.03, Math.cos(a) * 0.3, gchair, 10).rotation.z = Math.PI / 2; }
    for (const s of [-1, 1]) { rbox(0.06, 0.04, 0.26, 0.015, lMat, s * 0.3, 0.72, 0.02, gchair); box(0.025, 0.2, 0.025, M.black, s * 0.3, 0.6, 0.06, gchair); }
    W.seats.pc = new THREE.Vector3(DESK.x, 1.18, DESK.z + 0.78);
  }

  // ---------- mini fridge ----------
  {
    const g = group(-0.15, 0, -3.62);
    const fm = std({ ...T.whiteMetal, color: 0xf2f2ee });
    rbox(0.5, 0.82, 0.52, 0.02, fm, 0, 0.41, 0, g);
    const hinge = group(-0.25, 0, 0.265, g);
    const door = rbox(0.5, 0.8, 0.04, 0.02, fm, 0.25, 0.41, 0.0, hinge);
    box(0.02, 0.3, 0.03, M.chrome, 0.46, 0.52, 0.035, hinge);
    const inner = mesh(new THREE.PlaneGeometry(0.44, 0.74), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 0.6 }), 0, 0.41, 0.255, g, false, false);
    W.fridgeDoor = hinge;
    // stickers
    const st = newCanvas(128); const sc = st.getContext('2d'); drawMemeIcon(sc, 'dog', 30, 128, 4);
    const sticker = mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshStandardMaterial({ map: toTex(st), transparent: true, roughness: 0.4 }), 0.3, 0.58, 0.022, hinge, false, false);
    collide(-0.42, -3.92, 0.12, -3.34);
    W.interact.push({ id: 'fridge', pos: new THREE.Vector3(-0.15, 0.7, -3.3), r: 1.4, label: () => 'Grab an energy drink', action: 'fridge' });
  }

  // ---------- mining rig (upgrade) ----------
  {
    const g = group(1.1, 0, -3.6); W.items.miningRig = g;
    const frame = std({ color: 0x2b2e35, metalness: 0.8, roughness: 0.35 });
    for (const x of [-0.45, 0.45]) for (const z of [-0.2, 0.2]) box(0.02, 1.1, 0.02, frame, x, 0.55, z, g);
    for (const y of [0.3, 0.75]) box(0.92, 0.02, 0.42, frame, 0, y, 0, g);
    W.rigFans = [];
    for (const y of [0.3, 0.75]) for (let i = 0; i < 4; i++) {
      const card = group(-0.33 + i * 0.22, y + 0.12, 0, g);
      box(0.04, 0.2, 0.36, std({ color: 0x1a1c22, metalness: 0.5, roughness: 0.4 }), 0, 0, 0, card);
      for (const z of [-0.09, 0.09]) {
        const f = mesh(new THREE.CircleGeometry(0.075, 7), std({ color: 0x0c0c0c }), -0.021, 0, z, card, false, false); f.rotation.y = -Math.PI / 2;
        W.rigFans.push(f);
      }
      mesh(new THREE.PlaneGeometry(0.3, 0.008), new THREE.MeshBasicMaterial({ color: 0x40ffb0 }), 0.0, 0.1, 0, card, false, false).rotation.x = -Math.PI / 2;
    }
    const rl = new THREE.PointLight(0x40ffb0, 0.6, 2, 2); rl.position.set(0, 0.6, 0.4); g.add(rl);
    collide(0.6, -3.85, 1.6, -3.35);
    W.interact.push({ id: 'rig', pos: new THREE.Vector3(1.1, 0.8, -3.3), r: 1.4, label: () => 'Check the mining rig', action: 'rig', need: 'miningRig' });
  }

  // ---------- furnace + water heater (NE corner) ----------
  {
    const f = rbox(0.62, 1.4, 0.72, 0.02, std({ ...T.grayMetal, color: 0x9aa3ad, metalness: 0.3 }), 3.6, 0.7, -3.55);
    box(0.4, 0.06, 0.01, M.black, 3.6, 1.1, -3.185);
    const flame = mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0x4a8bff }), 3.5, 0.3, -3.188, R, false, false);
    W.furnaceFlame = flame;
    box(0.5, 0.5, 0.5, M.galv, 3.6, 1.6, -3.55, R, 0.5);
    const up = box(0.42, 0.5, 0.36, M.galv, 3.6, 2.05, -3.4, R, 0.5);
    collide(3.27, -3.93, 3.93, -3.17);
    const wh = cyl(0.28, 0.28, 1.5, std({ ...T.whiteMetal, metalness: 0.25 }), 4.55, 0.75, -3.5, R, 32);
    cyl(0.29, 0.29, 0.04, M.whiteMetal, 4.55, 1.5, -3.5);
    const flue = cyl(0.05, 0.05, 0.9, M.galv, 4.55, 1.95, -3.5, R, 14);
    const valve = box(0.06, 0.1, 0.06, M.copper, 4.27, 1.25, -3.5);
    collide(4.25, -3.82, 4.85, -3.18);
  }

  // ---------- washer + dryer (east wall) ----------
  {
    const ww = std({ ...T.whiteMetal, color: 0xf4f3ee, metalness: 0.15 });
    for (const [z, isW] of [[-2.05, true], [-1.35, false]]) {
      const g = group(4.62, 0, z);
      rbox(0.68, 0.92, 0.66, 0.025, ww, 0, 0.46, 0, g);
      const ring = mesh(new THREE.TorusGeometry(0.19, 0.03, 12, 32), M.chrome, -0.335, 0.45, 0, g); ring.rotation.y = Math.PI / 2;
      const port = mesh(new THREE.CircleGeometry(0.17, 32), isW ? new THREE.MeshPhysicalMaterial({ color: 0x23364a, roughness: 0.05, metalness: 0.2, clearcoat: 1 }) : std({ color: 0xdcdcd8 }), -0.336, 0.45, 0, g, false, false);
      port.rotation.y = -Math.PI / 2;
      box(0.02, 0.1, 0.6, std({ color: 0xcfd2d6 }), -0.33, 0.85, 0, g);
      for (let i = 0; i < 3; i++) cyl(0.02, 0.02, 0.02, M.chrome, -0.345, 0.85, -0.18 + i * 0.1, g, 12).rotation.z = Math.PI / 2;
      if (isW) W.washerPort = port;
    }
    // laundry basket + detergent
    const bask = cyl(0.22, 0.18, 0.32, std({ color: 0x3f7fd0, roughness: 0.5 }), 4.0, 0.16, -2.9);
    collide(4.25, -2.42, 4.98, -1.0);
    collide(3.76, -3.12, 4.24, -2.68);
  }

  // ---------- mattress / bed (SE corner) ----------
  {
    const g = group(4.05, 0, 3.05); W.items.mattress = g;
    rbox(1.45, 0.22, 1.9, 0.06, std({ ...T.mattress, roughness: 1 }), 0, 0.11, 0, g);
    const pillow = rbox(0.55, 0.12, 0.34, 0.05, std({ ...T.weave, color: 0xdfe3ea }), 0.2, 0.28, -0.7, g); pillow.rotation.y = 0.15;
    const blanket = rbox(1.2, 0.08, 1.0, 0.04, std({ ...T.knit, color: 0x5a6e8c }), -0.05, 0.25, 0.35, g); blanket.rotation.y = -0.2; blanket.rotation.z = 0.03;
    const bed = group(4.05, 0, 3.05); W.items.bed = bed;
    rbox(1.6, 0.3, 2.05, 0.03, M.oak, 0, 0.2, 0, bed, 1);
    rbox(1.6, 0.9, 0.08, 0.03, M.oak, 0, 0.55, -1.02, bed, 1);
    rbox(1.5, 0.25, 1.95, 0.08, std({ ...T.weave, color: 0xeeeeea }), 0, 0.45, 0, bed);
    rbox(1.52, 0.1, 1.4, 0.05, std({ ...T.knit, color: 0x2c3e66 }), 0, 0.6, 0.27, bed);
    for (const x of [-0.38, 0.38]) rbox(0.6, 0.14, 0.35, 0.06, std({ ...T.weave, color: 0xf2f2f0 }), x, 0.64, -0.75, bed);
    collide(3.3, 2.05, 4.95, 3.98);
    W.interact.push({ id: 'bed', pos: new THREE.Vector3(4.0, 0.4, 2.6), r: 1.6, label: () => 'Sleep (end the day)', action: 'sleep' });
  }

  // ---------- whiteboard (west wall) ----------
  {
    const g = group(ROOM.x0 + 0.03, 1.4, -2.3);
    g.rotation.y = Math.PI / 2;
    box(1.32, 0.86, 0.025, M.steel, 0, 0, 0, g);
    const cv = newCanvas(1024, 660); const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    mesh(new THREE.PlaneGeometry(1.28, 0.82), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25 }), 0, 0, 0.014, g, false, true);
    box(1.2, 0.03, 0.06, M.steel, 0, -0.44, 0.03, g);
    W.screens.whiteboard = { canvas: cv, ctx, tex };
    W.interact.push({ id: 'whiteboard', pos: new THREE.Vector3(-4.6, 1.4, -2.3), r: 1.5, label: () => 'Read the rug plan', action: 'whiteboard' });
  }

  // ---------- posters ----------
  {
    const P = (kind, x, y, z, ry, item, s = 1) => {
      const tex = toTex(drawPoster(kind));
      const m = mesh(new THREE.PlaneGeometry(0.5 * s, 0.7 * s), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }), x, y, z, R, false, true);
      m.rotation.y = ry; m.rotation.z = (Math.random() - 0.5) * 0.05;
      if (item) (W.items[item] || (W.items[item] = new THREE.Group())).add(m), R.add(W.items[item]);
      return m;
    };
    P('hodl', -2.9, 1.55, ROOM.z0 + 0.02, 0);
    W.items.posters = new THREE.Group(); R.add(W.items.posters);
    const pp = [['frog', -0.1, 1.75, ROOM.z0 + 0.02, 0], ['chart', ROOM.x1 - 0.02, 1.5, 0.15, -Math.PI / 2], ['lambo', 1.7, 1.55, ROOM.z1 - 0.02, Math.PI], ['wagmi', -0.9, 1.5, ROOM.z1 - 0.02, Math.PI]];
    for (const p of pp) { const m = P(...p); R.remove(m); W.items.posters.add(m); }
  }

  // ---------- upgrades around the room ----------
  // LED strip along the joist above the desk
  {
    const g = group(0, 0, 0); W.items.ledStrip = g;
    W.ledMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x8a3dff, emissiveIntensity: 4 });
    mesh(new THREE.BoxGeometry(6.5, 0.012, 0.012), W.ledMat, -0.5, ROOM.h - 0.25, -3.75, g, false, false);
    mesh(new THREE.BoxGeometry(0.012, 0.012, 7.5), W.ledMat, 4.95, ROOM.h - 0.25, 0.2, g, false, false);
    W.ledLights = [];
    for (const [x, z] of [[-2.5, -3.6], [0.5, -3.6], [4.8, 0.5], [4.8, 2.8]]) { const l = new THREE.PointLight(0x8a3dff, 0.7, 3.2, 2); l.position.set(x, ROOM.h - 0.35, z); g.add(l); W.ledLights.push(l); }
  }
  // neon sign above the desk
  {
    const g = group(-1.55, 1.95, ROOM.z0 + 0.04); W.items.neon = g;
    const cv = newCanvas(1024, 256), c = cv.getContext('2d');
    c.font = '900 170px "Bungee", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff3fd2'; c.shadowBlur = 30; c.fillStyle = '#ffd6f6'; c.fillText('RUGGED', 512, 135);
    const nm = new THREE.MeshBasicMaterial({ map: toTex(cv), transparent: true, toneMapped: false, color: 0xffffff });
    nm.color.setScalar(2.2);
    mesh(new THREE.PlaneGeometry(1.2, 0.3), nm, 0, 0, 0.01, g, false, false);
    box(1.15, 0.26, 0.01, std({ color: 0x0c0c10, transparent: true, opacity: 0.6 }), 0, 0, 0, g);
    const nl = new THREE.PointLight(0xff3fd2, 1.1, 3.5, 2); nl.position.set(0, -0.05, 0.3); g.add(nl);
    W.neonMat = nm; W.neonLight = nl;
  }
  // the actual rug
  {
    const g = group(0.6, 0, 0.9); W.items.rug = g;
    const rg = new THREE.PlaneGeometry(3, 2.1); rg.rotateX(-Math.PI / 2);
    const rm = mesh(rg, std({ ...T.rug, roughness: 1 }), 0, 0.006, 0, g, false, true);
  }
  // lava lamp on the desk
  {
    const g = group(DESK.x - 0.82, DESK.top, DESK.z - 0.05); W.items.lavaLamp = g;
    cyl(0.035, 0.06, 0.12, M.chrome, 0, 0.06, 0, g, 20);
    W.lavaMat = new THREE.MeshPhysicalMaterial({ color: 0xff5a1f, emissive: 0xff3a0a, emissiveIntensity: 1.6, roughness: 0.1, transmission: 0.0, transparent: true, opacity: 0.85 });
    cyl(0.025, 0.05, 0.22, W.lavaMat, 0, 0.23, 0, g, 20);
    cyl(0.025, 0.025, 0.04, M.chrome, 0, 0.36, 0, g, 20);
    W.lavaBlobs = [];
    for (let i = 0; i < 3; i++) { const b = mesh(new THREE.SphereGeometry(0.014 + i * 0.004, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd23a }), 0, 0.15 + i * 0.05, 0, g, false, false); W.lavaBlobs.push(b); }
    const ll = new THREE.PointLight(0xff5a1f, 0.4, 1.6, 2); ll.position.set(0, 0.25, 0.1); g.add(ll);
  }
  // ring light (better shills)
  {
    const g = group(DESK.x + 0.95, 0, DESK.z + 0.25); W.items.ringLight = g;
    cyl(0.01, 0.01, 1.4, M.black, 0, 0.7, 0, g, 8);
    for (let i = 0; i < 3; i++) { const l = cyl(0.008, 0.008, 0.35, M.black, Math.sin(i * 2.1) * 0.12, 0.08, Math.cos(i * 2.1) * 0.12, g, 6); l.rotation.set(Math.cos(i * 2.1) * 0.9, 0, -Math.sin(i * 2.1) * 0.9); }
    const ring = mesh(new THREE.TorusGeometry(0.2, 0.02, 12, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e8, emissiveIntensity: 2.5 }), 0, 1.45, 0, g, false, false);
    ring.rotation.y = -0.6;
    const rl = new THREE.PointLight(0xfff4e8, 0.7, 2.5, 2); rl.position.set(-0.1, 1.45, 0.2); g.add(rl);
  }
  // couch + TV
  {
    const g = group(0, 0, 0); W.items.couchTV = g;
    const fab = std({ ...T.weave, color: 0x6b4a3a, roughness: 1 });
    const couch = group(2.5, 0, 1.05, g); couch.rotation.y = -Math.PI / 2;
    rbox(1.9, 0.42, 0.85, 0.08, fab, 0, 0.21, 0, couch);
    rbox(1.9, 0.5, 0.22, 0.09, fab, 0, 0.55, 0.32, couch);
    for (const s of [-1, 1]) rbox(0.2, 0.3, 0.85, 0.08, fab, s * 0.93, 0.5, 0, couch);
    for (const x of [-0.45, 0.45]) rbox(0.84, 0.14, 0.7, 0.06, fab, x, 0.47, -0.05, couch);
    const tv = group(4.86, 0, 1.05, g); tv.rotation.y = -Math.PI / 2;
    rbox(1.2, 0.5, 0.4, 0.02, M.oak, 0, 0.25, 0, tv, 1);
    rbox(1.12, 0.66, 0.05, 0.01, M.black, 0, 0.95, 0, tv);
    const cv = newCanvas(512, 288); const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const tm = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); tm.color.setScalar(0.9);
    mesh(new THREE.PlaneGeometry(1.06, 0.6), tm, 0, 0.95, 0.027, tv, false, false);
    W.screens.tv = { canvas: cv, ctx, tex };
    const tvl = new THREE.PointLight(0x9fc4ff, 0.6, 3, 2); tvl.position.set(4.3, 1.0, 1.05); g.add(tvl); W.lights.tv = tvl;
    W.couchCollider = [2.0, 0.08, 2.95, 2.0];
    W.tvCollider = [4.6, 0.4, 4.98, 1.7];
    W.seats.couch = new THREE.Vector3(2.45, 0.42, 1.05);
    W.interact.push({ id: 'tv', pos: new THREE.Vector3(4.6, 1.0, 1.05), r: 1.8, label: () => 'Watch the news', action: 'tv', need: 'couchTV' });
  }
  // arcade cabinet
  {
    const g = group(-2.8, 0, 3.6); g.rotation.y = Math.PI; W.items.arcade = g;
    const cab = std({ color: 0x1b1430, roughness: 0.6 });
    rbox(0.66, 1.7, 0.7, 0.02, cab, 0, 0.85, 0, g);
    rbox(0.66, 0.08, 0.3, 0.02, std({ color: 0x2a1e48 }), 0, 1.05, -0.45, g);
    const cv = newCanvas(256, 200), c = cv.getContext('2d');
    c.fillStyle = '#05010e'; c.fillRect(0, 0, 256, 200); c.fillStyle = '#ffde3b'; c.font = '900 34px Impact'; c.textAlign = 'center'; c.fillText('RUG RUNNER', 128, 60);
    c.fillStyle = '#ff3fd2'; c.font = '20px monospace'; c.fillText('INSERT COIN', 128, 150);
    const scr = mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshBasicMaterial({ map: toTex(cv), toneMapped: false }), 0, 1.38, -0.36, g, false, false);
    scr.rotation.y = Math.PI; scr.rotation.x = 0.15;
    for (let i = 0; i < 4; i++) cyl(0.02, 0.02, 0.02, new THREE.MeshStandardMaterial({ color: [0xff4d5e, 0x38e08c, 0x3ec5ff, 0xffde3b][i], roughness: 0.3 }), -0.15 + i * 0.1, 1.1, -0.5, g, 12);
    const al = new THREE.PointLight(0xff3fd2, 0.5, 2, 2); al.position.set(0, 1.4, -0.7); g.add(al);
    W.arcadeCollider = [-3.15, 3.2, -2.45, 3.98];
  }
  // server rack
  {
    const g = group(-3.75, 0, -3.55); W.items.serverRack = g;
    rbox(0.6, 1.9, 0.7, 0.02, M.black, 0, 0.95, 0, g);
    W.serverLeds = [];
    for (let i = 0; i < 10; i++) {
      box(0.5, 0.09, 0.01, std({ color: 0x24262d, metalness: 0.7, roughness: 0.3 }), 0, 0.3 + i * 0.15, 0.352, g);
      for (let j = 0; j < 4; j++) {
        const lm = new THREE.MeshBasicMaterial({ color: j % 2 ? 0x38e08c : 0x3ec5ff });
        mesh(new THREE.PlaneGeometry(0.01, 0.01), lm, 0.17 + j * 0.02, 0.3 + i * 0.15, 0.358, g, false, false);
        W.serverLeds.push(lm);
      }
    }
    const sl = new THREE.PointLight(0x3ec5ff, 0.5, 2, 2); sl.position.set(0, 1.0, 0.5); g.add(sl);
    W.rackCollider = [-4.08, -3.92, -3.42, -3.18];
  }
  // dead plant -> (nothing fancy, flavor)
  {
    const pot = cyl(0.12, 0.09, 0.2, std({ color: 0xa0522d, roughness: 0.8 }), -4.6, 0.1, -0.6);
    for (let i = 0; i < 5; i++) { const s = cyl(0.004, 0.004, 0.35, std({ color: 0x6b5a3a }), -4.6 + Math.sin(i) * 0.03, 0.35, -0.6 + Math.cos(i) * 0.03, R, 5); s.rotation.set(Math.sin(i * 2) * 0.4, 0, Math.cos(i * 2) * 0.4); }
    collide(-4.75, -0.75, -4.45, -0.45);
  }

  // beanbag (Chad's spot until the couch shows up)
  {
    const bb = mesh(new THREE.SphereGeometry(0.45, 28, 20), std({ ...T.leather, color: 0x2f6b4f, roughness: 0.7 }), 1.35, 0.26, -1.55);
    bb.scale.set(1, 0.55, 1);
    W.items.beanbag = bb;
    W.seats.beanbag = new THREE.Vector3(1.35, 0.36, -1.55);
    W.beanbagCollider = [0.95, -1.95, 1.75, -1.15];
  }

  // Kev's station (folding table + laptop) — appears when hired
  {
    const g = group(-3.7, 0, -1.55); W.items.kevDesk = g; g.rotation.y = Math.PI / 2;
    rbox(1.0, 0.03, 0.6, 0.01, std({ color: 0xe8e6e0, roughness: 0.5 }), 0, 0.72, 0, g);
    for (const x of [-0.45, 0.45]) for (const z of [-0.25, 0.25]) box(0.025, 0.72, 0.025, M.steel, x, 0.36, z, g);
    const lap = group(0, 0.735, 0.0, g);
    rbox(0.34, 0.015, 0.23, 0.005, std({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.3 }), 0, 0.0075, 0, lap);
    const lid = group(0, 0.015, -0.115, lap); lid.rotation.x = -0.25;
    rbox(0.34, 0.23, 0.01, 0.005, std({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.3 }), 0, 0.115, 0, lid);
    const cv = newCanvas(256, 170), c = cv.getContext('2d');
    c.fillStyle = '#0b0f14'; c.fillRect(0, 0, 256, 170);
    c.font = '11px monospace';
    const lines = ['// meme generator v0.3', 'const mascot = pick(memes);', 'render(mascot, {', '  hat: true,', '  laser_eyes: true,', '});', '// TODO: sleep', 'while (true) {', '  ship();', '}'];
    lines.forEach((l, i) => { c.fillStyle = ['#c678dd', '#e5c07b', '#98c379', '#5c6370', '#abb2bf'][i % 5]; c.fillText(l, 8, 16 + i * 15); });
    mesh(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshBasicMaterial({ map: toTex(cv), toneMapped: false }), 0, 0.115, 0.006, lid, false, false);
    const kl = new THREE.PointLight(0x7fb0ff, 0.35, 1.5, 2); kl.position.set(0, 0.3, 0.2); lap.add(kl);
    const ch = group(0, 0, 0.55, g);
    rbox(0.42, 0.03, 0.4, 0.01, std({ color: 0x4b4f57, metalness: 0.6 }), 0, 0.46, 0, ch);
    rbox(0.42, 0.26, 0.02, 0.01, std({ color: 0x4b4f57, metalness: 0.6 }), 0, 0.72, 0.21, ch);
    for (const x of [-0.19, 0.19]) for (const z of [-0.18, 0.18]) box(0.02, 0.46, 0.02, M.steel, x, 0.23, z, ch);
    W.kevCollider = [-4.05, -2.1, -3.0, -1.0];
    W.seats.kev = new THREE.Vector3(-3.15, 0.47, -1.55);
  }

  // ---------- dust motes in the bulb light ----------
  {
    const n = Q.high ? 260 : 90;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = rand(-3.5, 3.5); pos[i * 3 + 1] = rand(0.2, 2.3); pos[i * 3 + 2] = rand(-3.5, 3.5); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dm = new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.0035, transparent: true, opacity: 0.3, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(g, dm); R.add(pts);
    W.dust = pts;
  }

  // ---------- per-frame ----------
  W.update = (dt, t, state) => {
    for (const b of W.bulbs) {
      const fl = (Math.random() < 0.004 ? 0.55 : 1) * (0.98 + Math.sin(t * 50) * 0.01);
      b.flicker = damp(b.flicker || 1, fl, 30, dt);
      b.pl.intensity = b.base * b.flicker;
      if (b.spot) b.spot.intensity = b.base * 1.6 * b.flicker;
      b.glass.material.emissiveIntensity = 6 * b.flicker;
    }
    for (const f of W.fans) f.rotation.z += dt * 18;
    if (W.rigFans) for (const f of W.rigFans) f.rotation.x += dt * 25;
    if (W.rgbMats) { const c = new THREE.Color().setHSL((t * 0.08) % 1, 1, 0.5); for (const m of W.rgbMats) m.emissive.copy(c); if (W.lights.rgb) W.lights.rgb.color.copy(c); }
    if (W.ledMat) { const c = new THREE.Color().setHSL(0.72 + Math.sin(t * 0.3) * 0.12, 1, 0.55); W.ledMat.emissive.copy(c); for (const l of W.ledLights) l.color.copy(c); }
    if (W.neonMat) { const on = Math.random() < 0.003 ? 0.3 : 1; W.neonMat.opacity = on; W.neonLight.intensity = 1.1 * on; }
    if (W.lavaBlobs) W.lavaBlobs.forEach((b, i) => { b.position.y = 0.16 + (Math.sin(t * (0.3 + i * 0.13) + i) * 0.5 + 0.5) * 0.14; });
    if (W.serverLeds && Math.random() < 0.3) { const m = pick(W.serverLeds); m.visible = !m.visible; }
    if (W.furnaceFlame) W.furnaceFlame.scale.y = 0.8 + Math.random() * 0.4;
    if (W.dust) { W.dust.rotation.y += dt * 0.01; W.dust.position.y = Math.sin(t * 0.2) * 0.03; }
    if (W.fridgeDoor) W.fridgeDoor.rotation.y = damp(W.fridgeDoor.rotation.y, W.fridgeOpen > 0 ? -1.6 : 0, 6, dt);
    if (W.fridgeOpen > 0) W.fridgeOpen -= dt;
  };

  // ---------- items ----------
  W.applyItems = (owned) => {
    const has = (k) => !!owned[k];
    const vis = (k, v) => { if (W.items[k]) W.items[k].visible = v; };
    vis('monitor2', has('monitor2')); vis('monitor3', has('monitor3'));
    vis('chairBasic', !has('gamingChair')); vis('gamingChair', has('gamingChair'));
    vis('towerBasic', !has('gamingPC')); vis('gamingPC', has('gamingPC'));
    for (const k of ['ledStrip', 'neon', 'rug', 'lavaLamp', 'ringLight', 'couchTV', 'miningRig', 'arcade', 'serverRack', 'posters', 'kevDesk']) vis(k, has(k));
    vis('mattress', !has('bed')); vis('bed', has('bed'));
    vis('beanbag', !has('couchTV'));
    // dynamic colliders
    W.dynColliders = [];
    const add = (c) => W.dynColliders.push({ x0: c[0], z0: c[1], x1: c[2], z1: c[3] });
    if (has('couchTV')) { add(W.couchCollider); add(W.tvCollider); } else add(W.beanbagCollider);
    if (has('arcade')) add(W.arcadeCollider);
    if (has('serverRack')) add(W.rackCollider);
    if (has('kevDesk')) add(W.kevCollider);
  };
  W.dynColliders = [];
  return W;
}

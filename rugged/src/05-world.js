// ============================================================
// WORLD — the places you live. One kit of furniture, four rooms:
// Mom's basement → studio apartment → hype house → penthouse.
// Every item is built in local space (back toward -z, facing +z)
// and dropped into a location's slot: [x, z, ry] on the floor or
// [x, y, z, ry] on a wall.
// ============================================================
const ROOM = { x0: -5, x1: 5, z0: -4, z1: 4, h: 2.5 }; // the basement
const PI = Math.PI, HP = Math.PI / 2;

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

const LOCS = {
  basement: {
    id: 'basement', name: "Mom's Basement", chapter: 1, b: { x0: -5, x1: 5, z0: -4, z1: 4 }, h: 2.5,
    env: 0.12, furnished: false, spawn: [-0.4, -0.9, 0.4],
    blurb: 'Concrete floor, a mini fridge and Mom upstairs.',
    slots: {
      desk: [-1.55, -3.6, 0], fridge: [-0.15, -3.62, 0], espresso: [-0.15, 0.82, -3.66, 0], miningRig: [1.1, -3.6, 0],
      bed: [4.05, 2.95, PI], whiteboard: [-4.97, 1.4, -2.3, HP], rug: [0.6, 0.9, 0], lounge: [4.75, 1.05, -HP],
      arcade: [-2.8, 3.6, PI], serverRack: [-3.75, -3.55, 0], kevDesk: [-3.7, -1.55, HP], mo: [3.75, -1.7, -HP],
      aquarium: [0.75, 3.66, PI], vending: [-1.75, 3.55, PI], showcase: [-0.55, 3.6, PI], statue: [2.1, 3.55, PI],
      toilet: [4.6, -0.5, -HP], lambo: [4.97, 1.55, 3.0, -HP], beanbag: [1.35, -1.55],
      posters: [['frog', -0.1, 1.75, -3.98, 0], ['chart', 4.98, 1.5, 0.15, -HP], ['lambo', 1.7, 1.55, 3.98, PI], ['wagmi', -0.9, 1.5, 3.98, PI]],
      led: { y: 2.25, segs: [[-3.75, -3.75, 2.75, -3.75], [4.95, -3.55, 4.95, 3.95]], lights: [[-2.5, -3.6], [0.5, -3.6], [4.8, 0.5], [4.8, 2.8]] },
    },
  },
  apartment: {
    id: 'apartment', name: 'Studio Apartment', chapter: 2, b: { x0: -5, x1: 5, z0: -3.75, z1: 3.75 }, h: 2.7,
    env: 0.2, furnished: true, spawn: [-1.2, 0.6, 0.25],
    blurb: 'Hardwood, a real kitchen and a window on the city.',
    slots: {
      desk: [-2.2, -3.35, 0], serverRack: [-4.4, -3.38, 0], miningRig: [0.15, -3.5, 0],
      kitchen: { at: [3.15, -3.44, 0], len: 3.6, side: 1, top: 'oak' }, espresso: [1.95, 0.92, -3.58, 0],
      toilet: [4.62, -1.4, -HP], bed: [3.95, 1.3, -HP], lambo: [4.97, 1.65, 1.3, -HP],
      arcade: [4.35, 3.35, PI], vending: [3.3, 3.32, PI], aquarium: [2.2, 3.5, PI], kevDesk: [0, 3.35, PI],
      statue: [-2.45, 3.4, PI], showcase: [-3.35, 3.45, PI], lounge: [-4.75, 0.2, HP], rug: [-3.55, 0.2, HP],
      whiteboard: [-4.97, 1.45, -1.75, HP], mo: [1.6, -1.5, -HP], frontDoor: [-4.99, 2.6, HP],
      posters: [['frog', -0.9, 1.65, -3.73, 0], ['lambo', 1.0, 1.6, -3.73, 0], ['chart', 4.98, 1.6, -0.3, -HP], ['wagmi', -4.3, 1.65, 3.73, PI]],
      plants: [[-1.9, 3.35, 1], [4.55, -2.55, 0.9]],
      led: { y: 2.62, segs: [[-5, -3.72, 5, -3.72], [4.97, -3.75, 4.97, 3.75]], lights: [[-2.5, -3.5], [1.5, -3.5], [4.8, 0], [4.8, 2.6]] },
    },
  },
  hypehouse: {
    id: 'hypehouse', name: 'The Hype House', chapter: 3, b: { x0: -7, x1: 7, z0: -5, z1: 5 }, h: 3.2,
    env: 0.3, furnished: true, spawn: [0.6, -0.6, 0],
    blurb: 'Glass wall, a pool, desks for the whole crew.',
    slots: {
      desk: [0.6, -4.6, 0], dexDesk: [-5.2, -4.45, 0], zoeDesk: [-3.6, -4.45, 0], kevDesk: [-2.0, -4.45, 0],
      serverRack: [2.7, -4.62, 0], miningRig: [4.0, -4.72, 0],
      kitchen: { at: [6.68, -2.7, -HP], len: 4.2, side: -1, top: 'quartz' }, espresso: [6.78, 0.92, -1.45, -HP],
      toilet: [6.62, -0.15, -HP], frontDoor: [6.99, 1.3, -HP], bed: [5.95, 3.45, -HP], lambo: [6.97, 1.75, 3.45, -HP],
      lounge: [-6.75, 1.0, HP], loungeOpts: { big: true }, rug: [-5.6, 1.0, HP], whiteboard: [-6.97, 1.5, -2.6, HP],
      aquarium: [-6.75, -0.95, HP], arcade: [-6.6, 2.75, HP], vending: [-6.55, -4.3, HP],
      statue: [-6.3, 4.35, PI], showcase: [-5.2, 4.5, PI], podcast: [3.0, 2.9], mo: [1.8, 1.2, PI], wall: [-3.6, 2.35, -4.97, 0],
      posters: [['frog', 5.2, 1.75, -4.97, 0], ['chart', 6.0, 1.75, -4.97, 0], ['lambo', -6.97, 1.8, 3.8, HP], ['wagmi', 6.97, 1.75, 2.2, -HP]],
      plants: [[-0.85, -4.55, 1.2], [6.4, 4.6, 1.3], [-1.6, 4.5, 1.1]],
      led: { y: 3.0, segs: [[-7, -4.97, 7, -4.97], [-6.97, -5, -6.97, 5]], lights: [[-4, -4.8], [3, -4.8], [-6.8, -1], [-6.8, 3]] },
    },
  },
  penthouse: {
    id: 'penthouse', name: 'The Penthouse', chapter: 4, b: { x0: -7, x1: 7, z0: -5, z1: 5 }, h: 3.4,
    env: 0.3, furnished: true, spawn: [0, 0.6, PI],
    blurb: 'Forty floors up. Marble, glass and the whole skyline.',
    slots: {
      desk: [0, 4.2, PI], lounge: [-6.8, 0, HP], loungeOpts: { big: true, wall: true }, rug: [-5.6, 0, HP],
      whiteboard: [-4.5, 1.5, -4.97, 0], kitchen: { at: [3.6, -4.66, 0], len: 4.4, side: 1, top: 'marble' }, espresso: [2.0, 0.92, -4.78, 0],
      frontDoor: [6.4, -4.99, 0], bed: [-1.8, -3.95, 0], lambo: [-1.8, 1.85, -4.97, 0],
      serverRack: [-6.6, -4.5, HP], miningRig: [-6.7, -2.9, HP], kevDesk: [-4.5, -4.45, 0], zoeDesk: [0.35, -4.45, 0], dexDesk: [6.5, -2.2, -HP],
      aquarium: [6.75, -0.2, -HP], vending: [-6.55, 3.0, HP], arcade: [-6.6, 4.3, HP],
      statue: [3.6, 4.3, PI], showcase: [2.4, 4.5, PI], toilet: [6.6, 3.8, -HP], mo: [2.6, 0.6, PI],
      posters: [['frog', -6.97, 1.8, -1.8, HP], ['chart', -3.1, 1.8, -4.97, 0], ['lambo', 1.1, 1.8, -4.97, 0], ['wagmi', -6.97, 1.8, 1.9, HP]],
      plants: [[-6.5, -1.5, 1.2], [6.5, 4.55, 1.4], [5.6, -3.4, 1.1]],
      led: { y: 3.2, segs: [[-7, -4.97, 7, -4.97], [-6.97, -5, -6.97, 5]], lights: [[-4, -4.8], [3, -4.8], [-6.8, -2], [-6.8, 2.5]] },
    },
  },
};
const LOC_ORDER = ['basement', 'apartment', 'hypehouse', 'penthouse'];

// textures survive moving house, so each one is generated once
const TEXCACHE = {};
const KEEP_TEX = new Set();
function cachedTex(key, make) {
  if (!TEXCACHE[key]) {
    const set = make(); TEXCACHE[key] = set;
    for (const t of Object.values(set)) if (t && t.isTexture) KEEP_TEX.add(t);
  }
  return TEXCACHE[key];
}
function repSet(set, rx, ry) {
  const o = {};
  for (const [k, t] of Object.entries(set)) { if (!t) { o[k] = t; continue; } const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; o[k] = c; }
  return o;
}

function disposeWorld(scene, W) {
  if (!W) return;
  scene.remove(W.root);
  const mats = new Set(), geos = new Set();
  W.root.traverse((o) => {
    if (o.userData.shared) return;
    if (o.geometry) geos.add(o.geometry);
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
    if (o.isLight && o.shadow?.map) o.shadow.map.dispose();
  });
  for (const g of geos) g.dispose();
  for (const m of mats) {
    for (const v of Object.values(m)) if (v && v.isTexture && !KEEP_TEX.has(v) && !v.userData?.keep) v.dispose();
    m.dispose();
  }
}

function buildWorld(scene, Q, locId = 'basement') {
  const L = LOCS[locId] || LOCS.basement;
  const B = L.b, H = L.h, SL = L.slots;
  const W = {
    loc: L, locId: L.id, bounds: B, h: H,
    colliders: [], dynColliders: [], interact: [], screens: {}, items: {}, itemCols: {}, lights: {}, root: new THREE.Group(),
    fridgeDoor: null, bulbs: [], fans: [], seats: {}, crewSpots: {}, updaters: [], photo: [], _owned: {},
  };
  scene.add(W.root);
  const S = Q.tex;
  const R = W.root;

  // ---------- textures (lazy + cached) ----------
  const TGEN = {
    concrete: () => texSet(genConcrete(S), [4, 3.2]),
    cinder: () => texSet(genCinder(S, Math.round(S * 1.5))),
    pine: () => texSet(genWood(S / 2, { seed: 33, light: [214, 176, 122], dark: [170, 126, 78], rings: 2, knots: true, rough: 0.8 })),
    ply: () => texSet(genWood(S / 2, { seed: 34, light: [200, 160, 108], dark: [150, 108, 62], rings: 4, planks: 2, rough: 0.85 })),
    oak: () => texSet(genWood(S / 2, { seed: 35, light: [160, 112, 70], dark: [96, 60, 34], rings: 5, rough: 0.55 })),
    walnut: () => texSet(genWood(S / 2, { seed: 36, light: [118, 78, 50], dark: [64, 40, 24], rings: 6, planks: 4, rough: 0.5 })),
    doorPaint: () => texSet(genPaintedMetal(256, [236, 232, 222], 0.04)),
    knit: () => texSet(genKnit(S / 2)),
    weave: () => texSet(genWeave(S / 2)),
    leather: () => texSet(genLeather(S / 4)),
    whiteMetal: () => texSet(genPaintedMetal(S / 4, [232, 230, 222], 0.12)),
    grayMetal: () => texSet(genPaintedMetal(S / 4, [120, 128, 136], 0.3)),
    galv: () => texSet(genGalvanized(S / 4)),
    cardboard: () => texSet(genCardboard(S / 4)),
    insul: () => texSet(genInsulation(S / 4)),
    mattress: () => texSet(genMattress(S / 2)),
    rug: () => texSet(genRug(S / 2)),
    marble: () => texSet(genMarble(S)),
    marbleDark: () => texSet(genMarble(S / 2, { seed: 175, base: [40, 40, 44], vein: [190, 186, 180], tiles: 1 })),
    plaster: () => texSet(genPlaster(S / 2)),
    plasterCool: () => texSet(genPlaster(S / 2, [232, 232, 230])),
    polished: () => texSet(genPolishedConcrete(S)),
  };
  const T = new Proxy({}, { get: (o, k) => (TGEN[k] ? cachedTex(k + ':' + S, TGEN[k]) : undefined) });
  W.textures = T;

  // ---------- materials (created on first use) ----------
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {};
  const lazy = (k, f) => Object.defineProperty(M, k, { configurable: true, enumerable: true, get() { const v = f(); Object.defineProperty(M, k, { value: v, enumerable: true, writable: true }); return v; } });
  lazy('floor', () => std({ ...T.concrete, roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) }));
  lazy('wall', () => std({ ...T.cinder, roughness: 1, normalScale: new THREE.Vector2(0.9, 0.9) }));
  lazy('pine', () => std({ ...T.pine, roughness: 1 }));
  lazy('ply', () => std({ ...T.ply, roughness: 1 }));
  lazy('oak', () => std({ ...T.oak, roughness: 0.9 }));
  lazy('door', () => std({ ...T.doorPaint, roughness: 0.7 }));
  lazy('whiteMetal', () => std({ ...T.whiteMetal, metalness: 0.2 }));
  lazy('grayMetal', () => std({ ...T.grayMetal, metalness: 0.4 }));
  lazy('galv', () => std({ ...T.galv, metalness: 0.85 }));
  lazy('insul', () => std({ ...T.insul, roughness: 1 }));
  lazy('black', () => std({ color: 0x15161a, roughness: 0.5, metalness: 0.2 }));
  lazy('beige', () => std({ color: 0xd8cfb8, roughness: 0.55 }));
  lazy('steel', () => std({ color: 0x8a9099, roughness: 0.35, metalness: 0.9 }));
  lazy('brushed', () => std({ color: 0xb8bcc2, roughness: 0.32, metalness: 0.95 }));
  lazy('chrome', () => std({ color: 0xdfe3ea, roughness: 0.15, metalness: 1 }));
  lazy('copper', () => std({ color: 0xb36a3c, roughness: 0.35, metalness: 1 }));
  lazy('gold', () => std({ color: 0xffc34a, roughness: 0.18, metalness: 1 }));
  lazy('brass', () => std({ color: 0xc9a36a, roughness: 0.3, metalness: 1 }));
  lazy('glass', () => new THREE.MeshPhysicalMaterial({ color: 0x9fb7c9, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.25 }));
  lazy('pane', () => new THREE.MeshPhysicalMaterial({ color: 0xbfd6ea, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.07, depthWrite: false }));
  lazy('mullion', () => std({ color: 0x17181c, roughness: 0.4, metalness: 0.7 }));
  lazy('ceiling', () => std({ color: 0xf2f0ea, roughness: 0.95 }));
  lazy('trim', () => std({ color: 0xf4f2ec, roughness: 0.5 }));
  lazy('walnut', () => std({ ...T.walnut, roughness: 0.6 }));
  lazy('quartz', () => std({ color: 0xf4f4f2, roughness: 0.18, metalness: 0 }));
  lazy('marbleTop', () => std({ ...T.marbleDark, roughness: 0.15 }));
  W.mats = M;

  // ---------- helpers ----------
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
  const at = (s, parent = R) => { const g = s.length === 4 ? group(s[0], s[1], s[2], parent) : group(s[0], 0, s[1], parent); g.rotation.y = (s.length === 4 ? s[3] : s[2]) || 0; return g; };
  const wp = (g, x, y, z) => { g.updateWorldMatrix(true, false); return g.localToWorld(new THREE.Vector3(x, y, z)); };
  const rectOf = (g, x0, z0, x1, z1) => { const a = wp(g, x0, 0, z0), b = wp(g, x1, 0, z1); return { x0: Math.min(a.x, b.x), z0: Math.min(a.z, b.z), x1: Math.max(a.x, b.x), z1: Math.max(a.z, b.z) }; };
  const colStatic = (g, x0, z0, x1, z1) => W.colliders.push(rectOf(g, x0, z0, x1, z1));
  const colItem = (key, g, x0, z0, x1, z1) => (W.itemCols[key] || (W.itemCols[key] = [])).push(rectOf(g, x0, z0, x1, z1));
  const point = (color, power, dist, x, y, z, parent = R) => { const l = new THREE.PointLight(color, power, dist, 2); l.position.set(x, y, z); parent.add(l); return l; };
  const canvasTex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  W.helpers = { mesh, box, rbox, cyl, group, collide, at, wp };

  // ============================================================
  // SHELLS
  // ============================================================
  // a wall plane along one side of the room, with rectangular holes [a0, a1, y0, y1] in world coords
  const wallSide = (side, mat, holes = [], uvs = 1.6) => {
    const len = side === 'n' || side === 's' ? B.x1 - B.x0 : B.z1 - B.z0;
    const toS = (a) => (side === 'n' ? a - B.x0 : side === 'e' ? a - B.z0 : side === 's' ? B.x1 - a : B.z1 - a);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(len, 0); shape.lineTo(len, H); shape.lineTo(0, H); shape.lineTo(0, 0);
    for (const [a0, a1, y0, y1] of holes) {
      const s0 = Math.min(toS(a0), toS(a1)), s1 = Math.max(toS(a0), toS(a1));
      const p = new THREE.Path(); p.moveTo(s0, y0); p.lineTo(s0, y1); p.lineTo(s1, y1); p.lineTo(s1, y0); p.lineTo(s0, y0);
      shape.holes.push(p);
    }
    const g = new THREE.ShapeGeometry(shape);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / uvs, pos.getY(i) / uvs);
    const m = mesh(g, mat, 0, 0, 0, R, false, true);
    if (side === 'n') m.position.set(B.x0, 0, B.z0);
    if (side === 'e') { m.position.set(B.x1, 0, B.z0); m.rotation.y = -HP; }
    if (side === 's') { m.position.set(B.x1, 0, B.z1); m.rotation.y = PI; }
    if (side === 'w') { m.position.set(B.x0, 0, B.z1); m.rotation.y = HP; }
    return m;
  };
  const floorPlane = (mat) => { const fg = new THREE.PlaneGeometry(B.x1 - B.x0, B.z1 - B.z0); fg.rotateX(-HP); return mesh(fg, mat, (B.x0 + B.x1) / 2, 0, (B.z0 + B.z1) / 2, R, false, true); };
  const ceilingPlane = (mat) => { const cg = new THREE.PlaneGeometry(B.x1 - B.x0, B.z1 - B.z0); cg.rotateX(HP); return mesh(cg, mat, (B.x0 + B.x1) / 2, H, (B.z0 + B.z1) / 2, R, false, true); };
  const baseboards = (sides, mat, hgt = 0.1) => {
    for (const s of sides) {
      if (s === 'n') box(B.x1 - B.x0, hgt, 0.015, mat, (B.x0 + B.x1) / 2, hgt / 2, B.z0 + 0.008);
      if (s === 's') box(B.x1 - B.x0, hgt, 0.015, mat, (B.x0 + B.x1) / 2, hgt / 2, B.z1 - 0.008);
      if (s === 'e') box(0.015, hgt, B.z1 - B.z0, mat, B.x1 - 0.008, hgt / 2, (B.z0 + B.z1) / 2);
      if (s === 'w') box(0.015, hgt, B.z1 - B.z0, mat, B.x0 + 0.008, hgt / 2, (B.z0 + B.z1) / 2);
    }
  };
  // painted backdrop seen through windows
  const backdrop = (mode, x, y, z, w, h, ry = 0, bright = 0.8) => {
    const tex = canvasTex(drawCityView(mode)); tex.wrapS = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }); m.color.setScalar(bright);
    const p = mesh(new THREE.PlaneGeometry(w, h), m, x, y, z, R, false, false); p.rotation.y = ry;
    return p;
  };
  // glass curtain wall from a0..a1 along a side, mullions every `step`
  const glassWall = (side, a0, a1, y0, y1, step = 1.75) => {
    const n = Math.max(1, Math.round((a1 - a0) / step));
    const len = a1 - a0, d = len / n;
    const ns = side === 'n' || side === 's';
    const fixed = side === 'n' ? B.z0 : side === 's' ? B.z1 : side === 'e' ? B.x1 : B.x0;
    const P = (a, y, off = 0) => (ns ? [a, y, fixed + off] : [fixed + off, y, a]);
    const inward = side === 's' || side === 'e' ? -1 : 1;
    for (let i = 0; i <= n; i++) {
      const [x, y, z] = P(a0 + i * d, (y0 + y1) / 2, inward * 0.03);
      box(ns ? 0.05 : 0.08, y1 - y0, ns ? 0.08 : 0.05, M.mullion, x, y, z);
    }
    for (const yy of [y0 + 0.02, y1 - 0.02]) { const [x, y, z] = P((a0 + a1) / 2, yy, inward * 0.03); box(ns ? len : 0.1, 0.05, ns ? 0.1 : len, M.mullion, x, y, z); }
    const [x, y, z] = P((a0 + a1) / 2, (y0 + y1) / 2, inward * 0.02);
    const p = mesh(new THREE.PlaneGeometry(len, y1 - y0), M.pane, x, y, z, R, false, false);
    p.rotation.y = side === 'n' ? 0 : side === 's' ? PI : side === 'e' ? -HP : HP;
    p.renderOrder = 2;
  };
  const recessed = (x, z, power, color = 0xfff1dc) => {
    const dm = new THREE.MeshBasicMaterial({ color, toneMapped: false }); dm.color.multiplyScalar(1.6);
    mesh(new THREE.CircleGeometry(0.07, 24), dm, x, H - 0.005, z, R, false, false).rotation.x = HP;
    mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 24), M.chrome, x, H - 0.006, z, R, false, false).rotation.x = HP;
    return power > 0 ? point(color, power, 7, x, H - 0.2, z) : null;
  };
  const shadowSpot = (x, y, z, tx, tz, power, color = 0xfff0dc, angle = 1.1) => {
    const s = new THREE.SpotLight(color, power, 14, angle, 0.7, 1.6);
    s.position.set(x, y, z); s.target.position.set(tx, 0, tz);
    s.castShadow = true; s.shadow.mapSize.set(Q.shadow, Q.shadow); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.02;
    s.shadow.camera.near = 0.1; s.shadow.camera.far = 12;
    R.add(s); R.add(s.target);
    return s;
  };

  if (L.id === 'basement') buildBasementShell();
  else if (L.id === 'apartment') buildApartmentShell();
  else if (L.id === 'hypehouse') buildHypeShell();
  else buildPenthouseShell();

  function buildBasementShell() {
    {
      floorPlane(M.floor);
      const drain = mesh(new THREE.CircleGeometry(0.09, 24), std({ color: 0x3b3a38, roughness: 0.6, metalness: 0.6 }), 3.6, 0.002, -2.4, R, false, true);
      drain.rotation.x = -HP;
      for (const s of ['n', 's', 'e', 'w']) wallSide(s, M.wall);
      W.photo.push({ mat: M.wall, set: 'brick', repeat: [0.8, 1.04], tint: 0xb9ada3, bump: 3 });
      // subfloor above, with stairwell opening (x -4.95..-3.95, z 0.1..3.7)
      const sub = new THREE.Shape();
      sub.moveTo(-5, -4); sub.lineTo(5, -4); sub.lineTo(5, 4); sub.lineTo(-5, 4); sub.lineTo(-5, 3.7); sub.lineTo(-3.95, 3.7); sub.lineTo(-3.95, 0.1); sub.lineTo(-5, 0.1); sub.lineTo(-5, -4);
      const sg = new THREE.ShapeGeometry(sub); sg.rotateX(HP);
      planarUV(sg, 1.2);
      mesh(sg, M.ply, 0, H, 0, R, false, true);
      W.photo.push({ mat: M.ply, set: 'hardwood', repeat: [1, 1], tint: 0x8c857a, bump: 1.5 });
      W.photo.push({ mat: M.pine, set: 'hardwood', repeat: [1, 0.35], tint: 0xa49786, bump: 1.5 });
      for (let x = -4.8; x <= 4.8; x += 0.4) {
        const inStair = x < -3.9;
        if (inStair) {
          box(0.045, 0.24, 3.95, M.pine, x, H - 0.12, -1.95, R, 0.9);
          box(0.045, 0.24, 0.3, M.pine, x, H - 0.12, 3.85, R, 0.9);
        } else box(0.045, 0.24, 8, M.pine, x, H - 0.12, 0, R, 0.9);
        if (x < 4.6 && !inStair) {
          box(0.35, 0.16, 0.6, M.insul, x + 0.2, H - 0.08, -3.68, R, 0.5);
          box(0.35, 0.16, 0.6, M.insul, x + 0.2, H - 0.08, 3.68, R, 0.5);
        }
      }
      const beam = group(0, H - 0.24, 0.6);
      box(10, 0.012, 0.14, M.grayMetal, 0, 0.0, 0, beam);
      box(10, 0.2, 0.01, M.grayMetal, 0, -0.1, 0, beam);
      box(10, 0.012, 0.14, M.grayMetal, 0, -0.2, 0, beam);
      cyl(0.05, 0.05, H - 0.44, M.grayMetal, 0.9, (H - 0.44) / 2, 0.6);
      cyl(0.12, 0.12, 0.02, M.grayMetal, 0.9, H - 0.45, 0.6);
      collide(0.82, 0.52, 0.98, 0.68);
      box(10, 0.04, 0.14, M.pine, 0, H - 0.02, B.z0 + 0.07, R, 1);
      box(10, 0.04, 0.14, M.pine, 0, H - 0.02, B.z1 - 0.07, R, 1);
    }
    // ductwork & pipes
    {
      box(7.2, 0.22, 0.42, M.galv, 0.9, H - 0.38, -2.2, R, 0.6);
      for (const x of [-2, 0.3, 2.4]) {
        const d = cyl(0.08, 0.08, 1.6, M.galv, x, H - 0.33, -1.2, R, 20); d.rotation.x = HP;
        box(0.3, 0.02, 0.14, M.whiteMetal, x, H - 0.42, -0.42);
      }
      const p1 = cyl(0.012, 0.012, 9.6, M.copper, 0, H - 0.3, -3.88, R, 10); p1.rotation.z = HP;
      const p2 = cyl(0.04, 0.04, 9.6, std({ color: 0xe9e9e4, roughness: 0.4 }), 0, H - 0.36, -3.82, R, 14); p2.rotation.z = HP;
      const cable = cyl(0.008, 0.008, 6, M.steel, -1.5, H - 0.27, 1.6, R, 6); cable.rotation.z = HP;
    }
    // lighting
    {
      R.add(new THREE.HemisphereLight(0x8a96b8, 0x2a1d14, 0.12));
      const makeBulb = (x, z, power, shadows) => {
        const g = group(x, H - 0.24, z);
        cyl(0.04, 0.05, 0.06, M.beige, 0, -0.03, 0, g, 16);
        const glass = mesh(new THREE.SphereGeometry(0.045, 20, 14), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 6, roughness: 0.3 }), 0, -0.1, 0, g, false, false);
        cyl(0.002, 0.002, 0.45, M.chrome, 0.03, -0.3, 0, g, 4);
        mesh(new THREE.SphereGeometry(0.008, 8, 6), M.chrome, 0.03, -0.53, 0, g);
        const pl = point(0xffd3a3, power, 9, x, H - 0.36, z);
        const spot = shadows ? shadowSpot(x, H - 0.36, z, x, z, power * 1.6, 0xffd3a3, 1.25) : null;
        W.bulbs.push({ glass, pl, spot, base: power, flicker: 0 });
        return g;
      };
      makeBulb(-0.4, -0.6, 2.2, true);
      makeBulb(3.4, -1.2, 1.1, Q.high);
      const moon = new THREE.SpotLight(0x7f9cff, 2.2, 12, 0.5, 0.8, 1.2);
      moon.position.set(1.8, 3.6, 6.5); moon.target.position.set(0.5, 0, 0.5);
      moon.castShadow = Q.high; moon.shadow.mapSize.set(512, 512);
      R.add(moon); R.add(moon.target);
      W.lights.moon = moon;
    }
    // hopper windows (south wall, high)
    {
      const winMat = new THREE.MeshStandardMaterial({ color: 0x05070c, emissive: 0x0d1830, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.2 });
      for (const x of [0.4, 2.9]) {
        const g = group(x, 2.05, B.z1 - 0.01);
        box(0.84, 0.42, 0.08, M.whiteMetal, 0, 0, -0.02, g);
        const pane = mesh(new THREE.PlaneGeometry(0.74, 0.32), winMat.clone(), 0, 0, -0.065, g, false, false);
        pane.rotation.y = PI;
        box(0.76, 0.02, 0.02, M.whiteMetal, 0, 0, -0.07, g);
        box(0.8, 0.03, 0.12, std({ color: 0x3c2c1a, roughness: 1 }), 0, -0.2, -0.11, g);
      }
    }
    // stairs to Mom's door
    {
      const sx0 = -4.95, sx1 = -3.97, zBottom = 3.62, zTop = 0.12;
      const steps = 13, rise = H / steps, run = (zBottom - zTop) / steps;
      const st = group(0, 0, 0);
      for (let i = 0; i < steps; i++) {
        const y = rise * (i + 1), z = zBottom - run * (i + 0.5);
        box(sx1 - sx0, 0.03, run + 0.03, M.pine, (sx0 + sx1) / 2, y - 0.015, z, st, 0.6);
        box(sx1 - sx0, rise - 0.03, 0.015, M.ply, (sx0 + sx1) / 2, y - rise / 2 - 0.015, z + run / 2 - 0.01, st, 0.6);
      }
      const len = Math.hypot(zBottom - zTop, H);
      const ang = Math.atan2(H, zBottom - zTop);
      for (const x of [sx0 + 0.03, sx1 - 0.03]) { const s = box(0.04, 0.24, len, M.pine, x, H / 2 - 0.12, (zBottom + zTop) / 2, st, 0.9); s.rotation.x = ang; }
      const rail = cyl(0.022, 0.022, len, M.oak, sx1 + 0.02, H / 2 + 0.85, (zBottom + zTop) / 2, st, 10);
      rail.rotation.x = HP - ang;
      for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4; box(0.04, 0.9, 0.04, M.pine, sx1 + 0.02, t * H + 0.45, zBottom - t * (zBottom - zTop), st); }
      const shaftH = 2.3;
      box(0.02, shaftH, 3.6, M.door, sx1 + 0.01, H + shaftH / 2, (zBottom + zTop) / 2, st);
      box(1.0, 0.02, 3.6, M.door, (sx0 + sx1) / 2, H + shaftH, (zBottom + zTop) / 2, st);
      box(1.0, 0.04, 0.6, M.pine, (sx0 + sx1) / 2, H, zTop - 0.2, st);
      const door = group((sx0 + sx1) / 2, H, zTop - 0.48, st);
      rbox(0.82, 2.0, 0.045, 0.01, M.door, 0, 1.0, 0, door);
      for (const [y, h] of [[1.45, 0.7], [0.55, 0.75]]) rbox(0.62, h, 0.012, 0.005, M.door, 0, y, 0.027, door);
      mesh(new THREE.SphereGeometry(0.03, 16, 12), M.chrome, 0.31, 1.0, 0.05, door);
      mesh(new THREE.PlaneGeometry(0.8, 0.012), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), 0, 0.006, 0.03, door, false, false);
      const leakLight = new THREE.PointLight(0xffc988, 0.6, 3, 2); leakLight.position.set(0, 0.1, 0.25); door.add(leakLight);
      W.momDoor = door; W.momLeak = leakLight;
      collide(sx0, zTop - 0.1, sx1 + 0.06, zBottom + 0.05);
      W.interact.push({ id: 'stairs', pos: new THREE.Vector3(-4.2, 1.2, 3.3), r: 1.6, label: () => 'Go upstairs', action: 'stairs' });
      const labels = ['XMAS', 'TAXES 2019', "DAD'S STUFF", 'MOM - DO NOT TOUCH', 'HALLOWEEN', 'BEANIE BABIES'];
      let li = 0;
      for (const [x, y, z, w, h, d] of [[-4.55, 0.2, 2.9, 0.6, 0.4, 0.5], [-4.55, 0.6, 2.95, 0.5, 0.38, 0.45], [-4.5, 0.18, 2.3, 0.55, 0.36, 0.5], [-4.6, 0.15, 1.75, 0.5, 0.3, 0.45]]) {
        const m = new THREE.MeshStandardMaterial({ map: toTex(drawBoxLabel(labels[li++ % labels.length])), normalMap: T.cardboard.normalMap, roughness: 0.9 });
        const b = rbox(w, h, d, 0.012, m, x, y, z); b.rotation.y = (Math.random() - 0.5) * 0.3;
      }
    }
    // furnace + water heater (NE corner)
    {
      rbox(0.62, 1.4, 0.72, 0.02, std({ ...T.grayMetal, color: 0x9aa3ad, metalness: 0.3 }), 3.6, 0.7, -3.55);
      box(0.4, 0.06, 0.01, M.black, 3.6, 1.1, -3.185);
      W.furnaceFlame = mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshBasicMaterial({ color: 0x4a8bff }), 3.5, 0.3, -3.188, R, false, false);
      box(0.5, 0.5, 0.5, M.galv, 3.6, 1.6, -3.55, R, 0.5);
      box(0.42, 0.5, 0.36, M.galv, 3.6, 2.05, -3.4, R, 0.5);
      collide(3.27, -3.93, 3.93, -3.17);
      cyl(0.28, 0.28, 1.5, std({ ...T.whiteMetal, metalness: 0.25 }), 4.55, 0.75, -3.5, R, 32);
      cyl(0.29, 0.29, 0.04, M.whiteMetal, 4.55, 1.5, -3.5);
      cyl(0.05, 0.05, 0.9, M.galv, 4.55, 1.95, -3.5, R, 14);
      box(0.06, 0.1, 0.06, M.copper, 4.27, 1.25, -3.5);
      collide(4.25, -3.82, 4.85, -3.18);
    }
    // washer + dryer (east wall)
    {
      const ww = std({ ...T.whiteMetal, color: 0xf4f3ee, metalness: 0.15 });
      for (const [z, isW] of [[-2.05, true], [-1.35, false]]) {
        const g = group(4.62, 0, z);
        rbox(0.68, 0.92, 0.66, 0.025, ww, 0, 0.46, 0, g);
        const ring = mesh(new THREE.TorusGeometry(0.19, 0.03, 12, 32), M.chrome, -0.335, 0.45, 0, g); ring.rotation.y = HP;
        const port = mesh(new THREE.CircleGeometry(0.17, 32), isW ? new THREE.MeshPhysicalMaterial({ color: 0x23364a, roughness: 0.05, metalness: 0.2, clearcoat: 1 }) : std({ color: 0xdcdcd8 }), -0.336, 0.45, 0, g, false, false);
        port.rotation.y = -HP;
        box(0.02, 0.1, 0.6, std({ color: 0xcfd2d6 }), -0.33, 0.85, 0, g);
        for (let i = 0; i < 3; i++) cyl(0.02, 0.02, 0.02, M.chrome, -0.345, 0.85, -0.18 + i * 0.1, g, 12).rotation.z = HP;
      }
      cyl(0.22, 0.18, 0.32, std({ color: 0x3f7fd0, roughness: 0.5 }), 4.0, 0.16, -2.9);
      collide(4.25, -2.42, 4.98, -1.0);
      collide(3.76, -3.12, 4.24, -2.68);
    }
    // a dead plant and the hodl poster that came with the place
    {
      cyl(0.12, 0.09, 0.2, std({ color: 0xa0522d, roughness: 0.8 }), -4.6, 0.1, -0.6);
      for (let i = 0; i < 5; i++) { const s = cyl(0.004, 0.004, 0.35, std({ color: 0x6b5a3a }), -4.6 + Math.sin(i) * 0.03, 0.35, -0.6 + Math.cos(i) * 0.03, R, 5); s.rotation.set(Math.sin(i * 2) * 0.4, 0, Math.cos(i * 2) * 0.4); }
      collide(-4.75, -0.75, -4.45, -0.45);
      const hp = mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ map: toTex(drawPoster('hodl')), roughness: 0.75 }), -2.9, 1.55, B.z0 + 0.02, R, false, true);
      hp.rotation.z = 0.02;
    }
    // dust motes in the bulb light
    {
      const n = Q.high ? 260 : 90;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = rand(-3.5, 3.5); pos[i * 3 + 1] = rand(0.2, 2.3); pos[i * 3 + 2] = rand(-3.5, 3.5); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      W.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.0035, transparent: true, opacity: 0.3, depthWrite: false, sizeAttenuation: true }));
      R.add(W.dust);
    }
  }

  function buildApartmentShell() {
    const fl = std({ ...repSet(T.oak, 2.5, 2.5), roughness: 0.6 });
    floorPlane(fl);
    W.photo.push({ mat: fl, set: 'hardwood', repeat: [2.2, 2.2], tint: 0xc8b8a4, bump: 1.2 });
    const wall = std({ ...T.plaster, roughness: 0.92 });
    const win = [-1.6, 1.6, 0.9, 2.4];
    wallSide('n', wall); wallSide('e', wall); wallSide('w', wall);
    wallSide('s', wall, [win]);
    ceilingPlane(M.ceiling);
    baseboards(['n', 'e', 'w', 's'], M.trim, 0.11);
    for (const [w, d, x, z] of [[10, 0.05, 0, B.z0 + 0.025], [10, 0.05, 0, B.z1 - 0.025], [0.05, 7.5, B.x0 + 0.025, 0], [0.05, 7.5, B.x1 - 0.025, 0]]) box(w, 0.06, d, M.trim, x, H - 0.03, z);
    // window: frame, sill, mullions, curtains, the city outside
    {
      const [a0, a1, y0, y1] = win;
      box(a1 - a0 + 0.12, 0.05, 0.22, M.trim, 0, y0 - 0.02, B.z1 - 0.08);
      for (const x of [a0, 0, a1]) box(0.06, y1 - y0, 0.12, M.mullion, x, (y0 + y1) / 2, B.z1);
      for (const y of [y0, y1, (y0 + y1) / 2 + 0.25]) box(a1 - a0, 0.05, 0.1, M.mullion, 0, y, B.z1);
      const pane = mesh(new THREE.PlaneGeometry(a1 - a0, y1 - y0), M.pane, 0, (y0 + y1) / 2, B.z1 + 0.01, R, false, false); pane.rotation.y = PI;
      const curtain = std({ ...T.weave, color: 0x50586a, roughness: 1, side: THREE.DoubleSide });
      for (const s of [-1, 1]) {
        const cg = new THREE.PlaneGeometry(0.7, 2.25, 24, 1);
        const p = cg.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 26) * 0.035);
        cg.computeVertexNormals();
        mesh(cg, curtain, s * (a1 + 0.3), 1.42, B.z1 - 0.08, R, true, true).rotation.y = PI;
      }
      cyl(0.012, 0.012, a1 - a0 + 1.6, M.black, 0, 2.56, B.z1 - 0.08, R, 8).rotation.z = HP;
      backdrop('street', 0, 5.2, B.z1 + 13, 44, 19.3, PI, 0.75);
      const city = new THREE.SpotLight(0x8fa6ff, 6, 16, 0.55, 0.8, 1.2);
      city.position.set(0.6, 3.8, B.z1 + 6); city.target.position.set(-0.3, 0, 0.6);
      city.castShadow = Q.high; city.shadow.mapSize.set(1024, 1024); city.shadow.bias = -0.0008;
      R.add(city); R.add(city.target);
    }
    // lights: recessed cans, two pendants over the counter, a floor lamp by the couch
    R.add(new THREE.HemisphereLight(0xc8d2ff, 0x3a2c22, 0.22));
    shadowSpot(-0.6, H - 0.05, -0.4, -0.8, -0.6, 7, 0xffe6c8, 1.15);
    for (const [x, z] of [[-2.6, -1.8], [2.8, -1.8], [-2.6, 1.8], [2.8, 1.8]]) recessed(x, z, 0.9);
    for (const x of [2.4, 3.6]) {
      const g = group(x, H, -2.9);
      cyl(0.004, 0.004, 0.9, M.black, 0, -0.45, 0, g, 4);
      mesh(new THREE.ConeGeometry(0.14, 0.16, 24, 1, true), std({ color: 0x1c1d22, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.5 }), 0, -0.95, 0, g);
      mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd9a0, emissiveIntensity: 5 }), 0, -1.0, 0, g, false, false);
      point(0xffd9a0, 0.7, 3.5, x, H - 1.05, -2.9);
    }
    {
      const g = group(-2.55, 0, 1.55);
      cyl(0.13, 0.15, 0.03, M.black, 0, 0.015, 0, g);
      cyl(0.012, 0.012, 1.55, M.brass, 0, 0.78, 0, g, 8);
      mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.26, 24, 1, true), std({ color: 0xf0e6d2, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffd9a0, emissiveIntensity: 0.4 }), 0, 1.6, 0, g, false, false);
      point(0xffd2a0, 0.9, 4, -2.55, 1.55, 1.55);
      collide(-2.7, 1.4, -2.4, 1.7);
    }
  }

  function buildHypeShell() {
    const fl = std({ ...repSet(T.polished, 3.5, 2.5), roughness: 0.35, metalness: 0.05 });
    floorPlane(fl);
    const wall = std({ ...T.plasterCool, roughness: 0.9 });
    wallSide('n', wall); wallSide('e', wall); wallSide('w', wall);
    wallSide('s', wall, [[-6, 6, 0, H - 0.25]]);
    ceilingPlane(M.ceiling);
    baseboards(['n', 'e', 'w'], std({ color: 0x1b1c20, roughness: 0.5 }), 0.08);
    glassWall('s', -6, 6, 0, H - 0.25, 2);
    // LED cove around the ceiling (color drifts slowly)
    W.coveMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x7a5cff, emissiveIntensity: 2.4 });
    for (const [w, d, x, z] of [[14, 0.03, 0, B.z0 + 0.12], [0.03, 10, B.x0 + 0.12, 0], [0.03, 10, B.x1 - 0.12, 0]]) {
      mesh(new THREE.BoxGeometry(w, 0.02, d), W.coveMat, x, H - 0.16, z, R, false, false);
      box(w + (d > 1 ? 0.18 : 0), 0.14, d + (w > 1 ? 0.18 : 0), M.ceiling, x, H - 0.07, z);
    }
    W.coveLights = [point(0x7a5cff, 0.8, 6, -4, H - 0.3, -4.6), point(0x7a5cff, 0.8, 6, 4, H - 0.3, -4.6), point(0x7a5cff, 0.6, 6, -6.6, H - 0.3, 0)];
    W.updaters.push((dt, t) => { const c = new THREE.Color().setHSL(0.72 + Math.sin(t * 0.12) * 0.08, 0.9, 0.55); W.coveMat.emissive.copy(c); for (const l of W.coveLights) l.color.copy(c); });
    R.add(new THREE.HemisphereLight(0xdfe6ff, 0x3a3540, 0.3));
    shadowSpot(0, H - 0.05, -1.2, 0, -1.6, 9, 0xfff2e2, 1.2);
    for (const x of [-4.5, -1.5, 1.5, 4.5]) for (const z of [-3, 0.5, 3.2]) recessed(x, z, 0);
    point(0xfff0dc, 1.1, 8, -4.5, H - 0.3, -2.5); point(0xfff0dc, 1.0, 8, 4.5, H - 0.3, -2.5); point(0xfff0dc, 0.8, 8, 0, H - 0.3, 2.5);
    // backyard: deck, glowing pool, palms, hedges, hills behind
    {
      const deckMat = std({ ...repSet(T.walnut, 6, 3), color: 0x9a8a7a, roughness: 0.8 });
      const dg = new THREE.PlaneGeometry(40, 16); dg.rotateX(-HP);
      mesh(dg, deckMat, 0, -0.02, B.z1 + 8, R, false, true);
      const pc = newCanvas(512, 256), px = pc.getContext('2d');
      const grd = px.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#36e0ff'); grd.addColorStop(1, '#0a7fc4'); px.fillStyle = grd; px.fillRect(0, 0, 512, 256);
      px.strokeStyle = 'rgba(255,255,255,0.35)'; px.lineWidth = 3;
      for (let i = 0; i < 60; i++) { px.beginPath(); const x = Math.random() * 512, y = Math.random() * 256; px.moveTo(x, y); px.bezierCurveTo(x + 20, y - 10, x + 30, y + 10, x + 50, y); px.stroke(); }
      const ptex = canvasTex(pc); ptex.wrapS = ptex.wrapT = THREE.RepeatWrapping; ptex.repeat.set(2, 1);
      const pm = new THREE.MeshBasicMaterial({ map: ptex, toneMapped: false }); pm.color.setScalar(0.9);
      const pg = new THREE.PlaneGeometry(8, 3.6); pg.rotateX(-HP);
      mesh(pg, pm, 0, 0.0, B.z1 + 4.6, R, false, false);
      for (const [w, d, x, z] of [[8.4, 0.2, 0, B.z1 + 2.7], [8.4, 0.2, 0, B.z1 + 6.5], [0.2, 4, -4.1, B.z1 + 4.6], [0.2, 4, 4.1, B.z1 + 4.6]]) box(w, 0.06, d, M.quartz, x, 0.02, z);
      W.updaters.push((dt, t) => { ptex.offset.x = (t * 0.02) % 1; ptex.offset.y = Math.sin(t * 0.3) * 0.05; });
      point(0x3fd6ff, 3.2, 12, 0, 0.6, B.z1 + 3.2);
      const trunkM = std({ color: 0x5a4632, roughness: 0.95 }), frondM = std({ color: 0x1e4a2c, roughness: 0.8, side: THREE.DoubleSide });
      for (const [x, z, h] of [[-6.5, B.z1 + 5, 5.2], [6.2, B.z1 + 6.5, 6], [-2.6, B.z1 + 10, 6.5], [9.5, B.z1 + 3.5, 4.6]]) {
        const tr = group(x, 0, z);
        for (let i = 0; i < 6; i++) { const s = cyl(0.13 - i * 0.012, 0.15 - i * 0.012, h / 6 + 0.02, trunkM, Math.sin(i * 0.4) * 0.12 * i / 3, h / 6 * (i + 0.5), 0, tr, 10); s.rotation.z = -0.05 * i / 3; }
        for (let i = 0; i < 9; i++) {
          const f = new THREE.PlaneGeometry(0.5, 2.4, 1, 4); const p = f.attributes.position;
          for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, -Math.pow((y + 1.2) / 2.4, 2) * 0.9); p.setX(k, p.getX(k) * (1 - Math.abs(y) / 1.4)); }
          f.translate(0, 1.2, 0); f.rotateX(-1.2);
          const fm = mesh(f, frondM, 0.1, h, 0, tr, false, false); fm.rotation.y = (i / 9) * PI * 2;
        }
      }
      box(40, 1.6, 1.2, std({ color: 0x14301c, roughness: 1 }), 0, 0.8, B.z1 + 14);
      backdrop('yard', 0, 7, B.z1 + 30, 90, 39.5, PI, 0.75);
      const moon = new THREE.SpotLight(0x9fb4ff, 5, 22, 0.5, 0.8, 1.1);
      moon.position.set(3, 7, B.z1 + 9); moon.target.position.set(-1, 0, 1);
      moon.castShadow = Q.high; moon.shadow.mapSize.set(1024, 1024); R.add(moon); R.add(moon.target);
    }
    // content wall: a giant screen over the crew desks
    {
      const g = at(SL.wall);
      rbox(4.12, 1.36, 0.06, 0.01, M.black, 0, 0, 0.03, g);
      const cv = newCanvas(1024, 330), ctx = cv.getContext('2d');
      ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, 1024, 330);
      const tex = canvasTex(cv);
      const sm = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); sm.color.setScalar(0.85);
      mesh(new THREE.PlaneGeometry(4.0, 1.29), sm, 0, 0, 0.065, g, false, false);
      W.screens.wall = { canvas: cv, ctx, tex };
      W.lights.wall = point(0x6fa8ff, 0.8, 4, 0, 0, 0.8, g);
    }
    // podcast corner: round table, two mics, two stools
    {
      const g = at(SL.podcast);
      cyl(0.55, 0.55, 0.04, M.walnut, 0, 0.74, 0, g, 40);
      cyl(0.05, 0.05, 0.72, M.black, 0, 0.36, 0, g, 12);
      cyl(0.3, 0.3, 0.02, M.black, 0, 0.01, 0, g, 24);
      for (const s of [-1, 1]) {
        const st = group(s * 0.85, 0, 0, g);
        cyl(0.18, 0.18, 0.05, std({ ...T.leather, color: 0x22252b }), 0, 0.68, 0, st, 20);
        cyl(0.02, 0.02, 0.66, M.chrome, 0, 0.33, 0, st, 8);
        cyl(0.17, 0.17, 0.015, M.chrome, 0, 0.01, 0, st, 20);
        const arm = cyl(0.008, 0.008, 0.5, M.black, s * 0.35, 1.0, 0, g, 6); arm.rotation.z = s * 0.7;
        const mic = cyl(0.028, 0.028, 0.14, std({ color: 0x23262c, roughness: 0.4, metalness: 0.6 }), s * 0.52, 1.12, 0, g, 16); mic.rotation.z = s * 1.3;
      }
      const sc = newCanvas(512, 128), sx = sc.getContext('2d');
      sx.font = '900 76px "Bungee", Impact, sans-serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.shadowColor = '#3ec5ff'; sx.shadowBlur = 24; sx.fillStyle = '#d6f4ff'; sx.fillText('RUG POD', 256, 66);
      const nm = new THREE.MeshBasicMaterial({ map: canvasTex(sc), transparent: true, toneMapped: false, side: THREE.DoubleSide }); nm.color.setScalar(1.8);
      mesh(new THREE.PlaneGeometry(1.2, 0.3), nm, 0, 2.3, 0, g, false, false);
      cyl(0.004, 0.004, 0.9, M.black, -0.5, 2.9, 0, g, 4); cyl(0.004, 0.004, 0.9, M.black, 0.5, 2.9, 0, g, 4);
      point(0x3ec5ff, 0.6, 3, 0, 2.0, -0.3, g);
      colStatic(g, -1.1, -0.65, 1.1, 0.65);
    }
  }

  function buildPenthouseShell() {
    const fl = std({ ...repSet(T.marble, 3.5, 2.5), roughness: 0.14, metalness: 0.02 });
    floorPlane(fl);
    const panel = std({ ...repSet(T.walnut, 1, 1), roughness: 0.55 });
    wallSide('n', panel, [], 1.4); wallSide('w', panel, [], 1.4);
    for (const [len, x, z, ry] of [[14, 0, B.z0 + 0.02, 0], [10, B.x0 + 0.02, 0, HP]]) {
      box(len, 0.012, 0.012, M.brass, x, 0.9, z).rotation.y = ry;
      box(len, 0.012, 0.012, M.brass, x, H - 0.35, z).rotation.y = ry;
    }
    const dark = std({ color: 0x1a1a1e, roughness: 0.9 });
    ceilingPlane(dark);
    baseboards(['n', 'w'], std({ color: 0x0f0f12, roughness: 0.4, metalness: 0.3 }), 0.08);
    glassWall('s', B.x0, B.x1, 0, H, 1.75);
    glassWall('e', B.z0, B.z1, 0, H, 1.75);
    cyl(0.12, 0.12, H, M.mullion, B.x1, H / 2, B.z1, R, 16);
    // warm cove light where the ceiling meets the wood
    W.coveMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb36b, emissiveIntensity: 2.2 });
    mesh(new THREE.BoxGeometry(14, 0.02, 0.03), W.coveMat, 0, H - 0.12, B.z0 + 0.1, R, false, false);
    mesh(new THREE.BoxGeometry(0.03, 0.02, 10), W.coveMat, B.x0 + 0.1, H - 0.12, 0, R, false, false);
    for (const [w, d, x, z] of [[14.2, 0.2, 0, B.z0 + 0.1], [0.2, 10, B.x0 + 0.1, 0]]) box(w, 0.1, d, dark, x, H - 0.05, z);
    // the view
    backdrop('high', 0, 2.5, B.z1 + 32, 110, 48, PI, 0.8);
    backdrop('high', B.x1 + 32, 2.5, 0, 110, 48, -HP, 0.75);
    R.add(new THREE.HemisphereLight(0xb8c6ff, 0x2a2420, 0.2));
    const city = new THREE.SpotLight(0x9fb2ff, 9, 26, 0.6, 0.9, 1.1);
    city.position.set(10, 8, 12); city.target.position.set(0, 0, 0);
    city.castShadow = true; city.shadow.mapSize.set(Q.shadow, Q.shadow); city.shadow.bias = -0.0006; city.shadow.normalBias = 0.02;
    R.add(city); R.add(city.target);
    shadowSpot(-3, H - 0.05, 0, -3.5, 0, 5, 0xffd6a8, 1.2);
    for (const [x, z] of [[-4, -2.5], [3.5, -2.5], [-4, 2.5], [3.5, 1.5]]) recessed(x, z, 0.8, 0xffd9b0);
    point(0xffb36b, 0.9, 7, -3, H - 0.3, -4.6); point(0xffb36b, 0.8, 7, -6.6, H - 0.3, 1);
    // three glass pendants over the trading desk
    for (const dx of [-0.6, 0, 0.6]) {
      const g = group(dx, H, 3.9);
      cyl(0.003, 0.003, 1.3, M.black, 0, -0.65, 0, g, 4);
      mesh(new THREE.SphereGeometry(0.11, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0xffe2b8, emissive: 0xffb36b, emissiveIntensity: 1.2, roughness: 0.1, transparent: true, opacity: 0.9 }), 0, -1.38, 0, g, false, false);
    }
    point(0xffc890, 1.2, 4, 0, H - 1.5, 3.9);
  }

  // ============================================================
  // ITEM BUILDERS (local space: back at -z, facing +z)
  // ============================================================
  // ---------- desk with everything that sits on it ----------
  const TOP = 0.76;
  {
    const desk = at(SL.desk);
    W.deskGroup = desk;
    W.items.deskBasic = desk;
    const walnut = std({ ...T.oak, color: 0x7a5a42, roughness: 0.55 });
    const frame = std({ color: 0x16181d, roughness: 0.35, metalness: 0.8 });
    rbox(1.9, 0.035, 0.78, 0.012, walnut, 0, TOP - 0.0175, 0, desk);
    for (const sx of [-0.86, 0.86]) {
      box(0.05, TOP - 0.035, 0.05, frame, sx, (TOP - 0.035) / 2, -0.3, desk);
      box(0.05, TOP - 0.035, 0.05, frame, sx, (TOP - 0.035) / 2, 0.3, desk);
      box(0.05, 0.04, 0.66, frame, sx, 0.03, 0, desk);
    }
    box(1.72, 0.05, 0.04, frame, 0, TOP - 0.06, -0.3, desk);
    rbox(0.9, 0.004, 0.36, 0.02, std({ color: 0x1b1d22, roughness: 0.95 }), -0.02, TOP + 0.002, 0.24, desk);
    point(0xffb070, 0.25, 1.4, 0, 0.5, -0.2, desk);
    colStatic(desk, -0.97, -0.42, 0.97, 0.42);
    W.interact.push({ id: 'pc', pos: wp(desk, 0, 1.0, 0.3), r: 1.7, label: () => 'Use PC', action: 'pc' });

    const makeMonitor = (key, x, rotY, parent, size = [0.53, 0.31]) => {
      const g = group(x, TOP, 0.05, parent);
      g.rotation.y = rotY;
      const [w, h] = size;
      const alu = std({ color: 0x2a2d33, roughness: 0.35, metalness: 0.85 });
      rbox(0.2, 0.01, 0.15, 0.004, alu, 0, 0.005, 0, g);
      box(0.03, 0.2, 0.02, alu, 0, 0.1, -0.035, g);
      rbox(w + 0.012, h + 0.012, 0.022, 0.006, std({ color: 0x0b0c0f, roughness: 0.4, metalness: 0.3 }), 0, 0.08 + h / 2 + 0.02, -0.006, g);
      const cv = newCanvas(512, Math.round(512 * h / w)); const ctx = cv.getContext('2d');
      ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, cv.width, cv.height);
      const tex = canvasTex(cv);
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
    const kbBasic = group(0, 0, 0, desk); W.items.kbBasic = kbBasic;
    rbox(0.42, 0.016, 0.13, 0.006, std({ color: 0xd9dbe0, roughness: 0.45, metalness: 0.2 }), -0.02, TOP + 0.009, 0.24, kbBasic);
    const keyMat = std({ color: 0xf2f3f5, roughness: 0.5 });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) box(0.023, 0.005, 0.021, keyMat, -0.02 - 0.2 + c * 0.0285, TOP + 0.019, 0.24 - 0.052 + r * 0.026, kbBasic);
    const kbRgb = group(0, 0, 0, desk); W.items.mechKeyboard = kbRgb;
    rbox(0.44, 0.03, 0.14, 0.006, std({ color: 0x15161a, roughness: 0.4, metalness: 0.5 }), -0.02, TOP + 0.015, 0.24, kbRgb);
    W.kbGlow = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff00ff, emissiveIntensity: 2.2 });
    mesh(new THREE.BoxGeometry(0.44, 0.004, 0.14), W.kbGlow, -0.02, TOP + 0.002, 0.24, kbRgb, false, false);
    const capMat = std({ color: 0x2a2c33, roughness: 0.55 });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) rbox(0.024, 0.014, 0.022, 0.004, capMat, -0.02 - 0.2 + c * 0.0285, TOP + 0.036, 0.24 - 0.052 + r * 0.026, kbRgb);
    rbox(0.062, 0.024, 0.11, 0.014, std({ color: 0x15161a, roughness: 0.35 }), 0.32, TOP + 0.012, 0.26, desk);
    // energy drink cans
    const canCv = newCanvas(256, 128), cc = canCv.getContext('2d');
    cc.fillStyle = '#121418'; cc.fillRect(0, 0, 256, 128); cc.fillStyle = '#7dff3a'; cc.font = '900 64px Impact, sans-serif'; cc.fillText('VOLT', 60, 90);
    cc.strokeStyle = '#7dff3a'; cc.lineWidth = 6; cc.beginPath(); cc.moveTo(10, 20); cc.lineTo(40, 64); cc.lineTo(20, 64); cc.lineTo(50, 108); cc.stroke();
    const canMat = new THREE.MeshStandardMaterial({ map: toTex(canCv), metalness: 0.6, roughness: 0.35 });
    W.cans = [];
    for (let i = 0; i < 9; i++) {
      const c = cyl(0.033, 0.033, 0.12, canMat, -0.85 + (i % 3) * 0.075, TOP + 0.06, -0.22 + Math.floor(i / 3) * 0.08, desk, 18);
      c.rotation.y = Math.random() * 6; c.visible = i < 2;
      W.cans.push(c);
    }
    // bluetooth speaker that pulses with the music
    const spk = group(-0.62, TOP, -0.26, desk);
    rbox(0.1, 0.17, 0.1, 0.03, std({ ...T.knit, color: 0x2a2d34, roughness: 1 }), 0, 0.085, 0, spk);
    W.speakerMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffb547, emissiveIntensity: 0.3 });
    mesh(new THREE.TorusGeometry(0.032, 0.004, 8, 32), W.speakerMat, 0, 0.1, 0.051, spk, false, false);
    mesh(new THREE.CircleGeometry(0.03, 24), std({ color: 0x16181d, roughness: 0.6 }), 0, 0.1, 0.0505, spk, false, false);
    // desk lamp
    const lamp = group(0.8, TOP, -0.22, desk);
    cyl(0.07, 0.08, 0.02, M.black, 0, 0.01, 0, lamp);
    const arm = cyl(0.008, 0.008, 0.38, M.black, 0, 0.2, 0, lamp, 8); arm.rotation.z = 0.25;
    const shade = mesh(new THREE.ConeGeometry(0.07, 0.1, 20, 1, true), std({ color: 0x1c1d22, side: THREE.DoubleSide, roughness: 0.4 }), -0.08, 0.38, 0.05, lamp);
    shade.rotation.z = -0.9;
    mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd9a0, emissiveIntensity: 4 }), -0.1, 0.35, 0.05, lamp, false, false);
    point(0xffd9a0, 0.35, 2.5, -0.12, 0.3, 0.06, lamp);
    W.lights.screenGlow = point(0x6fa8ff, 0.9, 3.2, 0, TOP + 0.35, 0.45, desk);
    // office tower (replaced by the gaming PC upgrade)
    const tower = group(1.15, 0, 0.05, desk);
    W.items.towerBasic = tower;
    rbox(0.2, 0.4, 0.4, 0.012, std({ color: 0x1a1c21, roughness: 0.35, metalness: 0.6 }), 0, 0.2, 0, tower);
    for (let i = 0; i < 7; i++) box(0.12, 0.004, 0.003, std({ color: 0x2c2f36 }), 0, 0.12 + i * 0.03, 0.2015, tower);
    mesh(new THREE.PlaneGeometry(0.004, 0.3), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }), 0.085, 0.2, 0.2016, tower, false, false);
    const gpc = group(1.15, 0, 0.0, desk);
    W.items.gamingPC = gpc;
    rbox(0.23, 0.5, 0.48, 0.012, M.black, 0, 0.25, 0, gpc);
    const glass = mesh(new THREE.PlaneGeometry(0.44, 0.44), M.glass, -0.117, 0.27, 0, gpc, false, false); glass.rotation.y = -HP;
    W.rgbMats = [];
    for (let i = 0; i < 3; i++) {
      const fm = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff00ff, emissiveIntensity: 3 });
      mesh(new THREE.TorusGeometry(0.05, 0.007, 8, 24), fm, 0, 0.13 + i * 0.13, 0.242, gpc, false, false);
      const blades = mesh(new THREE.CircleGeometry(0.045, 6), std({ color: 0x222222 }), 0, 0.13 + i * 0.13, 0.241, gpc, false, false);
      W.fans.push(blades); W.rgbMats.push(fm);
    }
    box(0.02, 0.1, 0.3, std({ color: 0x24262c, metalness: 0.6, roughness: 0.4 }), -0.06, 0.22, 0, gpc);
    W.lights.rgb = point(0xff00ff, 0.5, 1.5, -0.2, 0.3, 0.1, gpc);
    // folding chair (replaced by the gaming chair)
    const chair = group(0, 0, 0.85, desk);
    W.items.chairBasic = chair;
    const metalDark = std({ color: 0x4b4f57, metalness: 0.7, roughness: 0.4 });
    rbox(0.42, 0.03, 0.4, 0.01, metalDark, 0, 0.46, 0, chair);
    const back = rbox(0.42, 0.26, 0.02, 0.01, metalDark, 0, 0.72, 0.21, chair); back.rotation.x = -0.12;
    for (const s of [-1, 1]) {
      const fl = cyl(0.01, 0.01, 0.9, metalDark, s * 0.2, 0.42, 0.06, chair, 8); fl.rotation.x = 0.28;
      const bl = cyl(0.01, 0.01, 0.5, metalDark, s * 0.2, 0.24, 0.12, chair, 8); bl.rotation.x = -0.4;
    }
    const gchair = group(0, 0, 0.85, desk);
    W.items.gamingChair = gchair;
    const lMat = std({ ...T.leather, color: 0x1a1b20, roughness: 0.5 });
    const red = std({ ...T.leather, color: 0xc0203a, roughness: 0.5 });
    rbox(0.52, 0.1, 0.5, 0.04, lMat, 0, 0.5, 0, gchair);
    const gb = rbox(0.5, 0.78, 0.1, 0.05, lMat, 0, 0.95, 0.26, gchair); gb.rotation.x = -0.12;
    for (const s of [-1, 1]) { const st = rbox(0.12, 0.7, 0.11, 0.05, red, s * 0.16, 0.95, 0.265, gchair); st.rotation.x = -0.12; }
    rbox(0.18, 0.12, 0.08, 0.04, red, 0, 1.28, 0.31, gchair);
    cyl(0.03, 0.03, 0.3, M.chrome, 0, 0.3, 0, gchair, 12);
    for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; const leg = box(0.04, 0.03, 0.3, M.black, Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15, gchair); leg.rotation.y = a; cyl(0.025, 0.025, 0.03, M.black, Math.sin(a) * 0.3, 0.03, Math.cos(a) * 0.3, gchair, 10).rotation.z = HP; }
    for (const s of [-1, 1]) { rbox(0.06, 0.04, 0.26, 0.015, lMat, s * 0.3, 0.72, 0.02, gchair); box(0.025, 0.2, 0.025, M.black, s * 0.3, 0.6, 0.06, gchair); }
    W.seats.pc = wp(desk, 0, 1.18, 0.78);
    W.deskLook = wp(desk, 0, 1.05, 0);
    W.deskBack = wp(desk, 0, 1.63, 1.35);
    W.deskBackLook = wp(desk, 0, 1.4, -2);
    W.deskYaw = desk.rotation.y;
    W.DESK = { x: desk.position.x, z: desk.position.z, top: TOP };

    // lava lamp (desk corner)
    {
      const g = group(-0.82, TOP, -0.05, desk); W.items.lavaLamp = g;
      cyl(0.035, 0.06, 0.12, M.chrome, 0, 0.06, 0, g, 20);
      W.lavaMat = new THREE.MeshPhysicalMaterial({ color: 0xff5a1f, emissive: 0xff3a0a, emissiveIntensity: 1.6, roughness: 0.1, transparent: true, opacity: 0.85 });
      cyl(0.025, 0.05, 0.22, W.lavaMat, 0, 0.23, 0, g, 20);
      cyl(0.025, 0.025, 0.04, M.chrome, 0, 0.36, 0, g, 20);
      W.lavaBlobs = [];
      for (let i = 0; i < 3; i++) W.lavaBlobs.push(mesh(new THREE.SphereGeometry(0.014 + i * 0.004, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd23a }), 0, 0.15 + i * 0.05, 0, g, false, false));
      point(0xff5a1f, 0.4, 1.6, 0, 0.25, 0.1, g);
    }
    // ring light
    {
      const g = group(0.95, 0, 0.25, desk); W.items.ringLight = g;
      cyl(0.01, 0.01, 1.4, M.black, 0, 0.7, 0, g, 8);
      for (let i = 0; i < 3; i++) { const l = cyl(0.008, 0.008, 0.35, M.black, Math.sin(i * 2.1) * 0.12, 0.08, Math.cos(i * 2.1) * 0.12, g, 6); l.rotation.set(Math.cos(i * 2.1) * 0.9, 0, -Math.sin(i * 2.1) * 0.9); }
      const ring = mesh(new THREE.TorusGeometry(0.2, 0.02, 12, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e8, emissiveIntensity: 0.9 }), 0, 1.45, 0, g, false, false);
      ring.rotation.y = -0.6;
      point(0xfff4e8, 0.4, 2.5, -0.1, 1.45, 0.2, g);
    }
    // streaming setup: mic arm, webcam, softbox, ON AIR sign
    {
      const g = group(0, 0, 0, desk); W.items.stream = g;
      const armM = std({ color: 0x15161a, roughness: 0.4, metalness: 0.6 });
      cyl(0.012, 0.012, 0.42, armM, -0.7, TOP + 0.21, -0.25, g, 10);
      const a2 = cyl(0.01, 0.01, 0.4, armM, -0.58, TOP + 0.42, -0.05, g, 10); a2.rotation.x = 1.0; a2.rotation.z = -0.5;
      const micm = cyl(0.028, 0.028, 0.13, std({ color: 0x22242a, roughness: 0.5, metalness: 0.5 }), -0.45, TOP + 0.36, 0.12, g, 16); micm.rotation.x = 0.4;
      rbox(0.08, 0.03, 0.03, 0.01, M.black, 0, TOP + 0.46, 0.06, g);
      mesh(new THREE.CircleGeometry(0.01, 12), new THREE.MeshBasicMaterial({ color: 0x3ec5ff }), 0, TOP + 0.46, 0.077, g, false, false);
      const sb = group(1.4, 0, 0.9, g);
      cyl(0.012, 0.012, 1.5, armM, 0, 0.75, 0, sb, 8);
      const box2 = rbox(0.42, 0.42, 0.12, 0.02, M.black, 0, 1.55, 0, sb); box2.rotation.y = -0.9;
      const diff = mesh(new THREE.PlaneGeometry(0.38, 0.38), new THREE.MeshBasicMaterial({ color: 0xfff6ea, toneMapped: false }), 0, 1.55, 0, sb, false, false); diff.rotation.y = -0.9 + PI; diff.position.x -= 0.05; diff.position.z -= 0.04;
      point(0xfff2e0, 0.9, 3.2, -0.2, 1.5, -0.2, sb);
      const oc = newCanvas(256, 96), ox = oc.getContext('2d'); ox.fillStyle = '#1a0306'; ox.fillRect(0, 0, 256, 96); ox.shadowColor = '#ff2a3a'; ox.shadowBlur = 18; ox.fillStyle = '#ff4d5e'; ox.font = '900 54px Impact, sans-serif'; ox.textAlign = 'center'; ox.fillText('ON AIR', 128, 68);
      const onair = mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ map: toTex(oc), toneMapped: false }), 0.95, 1.55, -0.37, g, false, false);
      onair.material.color.setScalar(1.6);
    }
    // neon sign on the wall behind the desk
    {
      const g = group(0, 1.95, -0.36, desk); W.items.neon = g;
      const cv = newCanvas(1024, 256), c = cv.getContext('2d');
      c.font = '900 170px "Bungee", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#ff3fd2'; c.shadowBlur = 30; c.fillStyle = '#ffd6f6'; c.fillText('RUGGED', 512, 135);
      const nm = new THREE.MeshBasicMaterial({ map: toTex(cv), transparent: true, toneMapped: false, color: 0xffffff });
      nm.color.setScalar(2.2);
      mesh(new THREE.PlaneGeometry(1.2, 0.3), nm, 0, 0, 0.01, g, false, false);
      box(1.15, 0.26, 0.01, std({ color: 0x0c0c10, transparent: true, opacity: 0.6 }), 0, 0, 0, g);
      W.neonMat = nm; W.neonLight = point(0xff3fd2, 1.1, 3.5, 0, -0.05, 0.3, g);
    }
    // Lambo keys on the desk (part of the Lambo)
    {
      const g = group(0.55, TOP, 0.25, desk); W.items.lamboKeys = g;
      rbox(0.03, 0.01, 0.06, 0.006, std({ color: 0x111111, metalness: 0.5 }), 0, 0.006, 0, g);
      mesh(new THREE.CircleGeometry(0.008, 12), M.gold, 0, 0.0115, 0, g, false, false).rotation.x = -HP;
    }
  }

  // ---------- mini fridge (basement) ----------
  if (SL.fridge) {
    const g = at(SL.fridge);
    const fm = std({ ...T.whiteMetal, color: 0xf2f2ee });
    rbox(0.5, 0.82, 0.52, 0.02, fm, 0, 0.41, 0, g);
    const hinge = group(-0.25, 0, 0.265, g);
    rbox(0.5, 0.8, 0.04, 0.02, fm, 0.25, 0.41, 0.0, hinge);
    box(0.02, 0.3, 0.03, M.chrome, 0.46, 0.52, 0.035, hinge);
    mesh(new THREE.PlaneGeometry(0.44, 0.74), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 0.6 }), 0, 0.41, 0.255, g, false, false);
    W.fridgeDoor = hinge;
    const st = newCanvas(128); const sc = st.getContext('2d'); drawMemeIcon(sc, 'dogwifhat', 30, 128, 4);
    mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshStandardMaterial({ map: toTex(st), transparent: true, roughness: 0.4 }), 0.3, 0.58, 0.022, hinge, false, false);
    colStatic(g, -0.27, -0.3, 0.27, 0.28);
    W.interact.push({ id: 'fridge', pos: wp(g, 0, 0.7, 0.32), r: 1.4, label: () => 'Grab an energy drink', action: 'fridge' });
  }

  // ---------- kitchen run (furnished places) ----------
  if (SL.kitchen) {
    const K = SL.kitchen, g = at(K.at), len = K.len, side = K.side;
    const topMat = K.top === 'oak' ? std({ ...T.oak, color: 0xb88a5e, roughness: 0.5 }) : K.top === 'marble' ? M.marbleTop : M.quartz;
    const cab = K.top === 'marble' ? std({ ...T.walnut, roughness: 0.5 }) : K.top === 'quartz' ? std({ color: 0x2b2e35, roughness: 0.45, metalness: 0.2 }) : std({ color: 0x5d7a6c, roughness: 0.55 });
    const fx = side * (len / 2 - 0.39);
    const cx0 = side > 0 ? -len / 2 : -len / 2 + 0.8, cx1 = side > 0 ? len / 2 - 0.8 : len / 2;
    const cw = cx1 - cx0, cmid = (cx0 + cx1) / 2;
    box(cw, 0.84, 0.58, cab, cmid, 0.46, -0.02, g);
    box(cw, 0.08, 0.52, std({ color: 0x111214 }), cmid, 0.04, -0.04, g);
    const doors = Math.max(2, Math.round(cw / 0.6));
    for (let i = 0; i < doors; i++) {
      const x = cx0 + (i + 0.5) * cw / doors;
      box(cw / doors - 0.012, 0.76, 0.02, cab, x, 0.47, 0.28, g);
      box(0.14, 0.012, 0.02, M.brushed, x, 0.8, 0.3, g);
    }
    box(cw + 0.02, 0.04, 0.64, topMat, cmid, 0.9, 0.0, g);
    // sink + faucet
    const sx = cmid + side * -0.2;
    box(0.52, 0.012, 0.4, std({ color: 0x2a2c30, roughness: 0.25, metalness: 0.8 }), sx, 0.921, 0.02, g);
    const fa = group(sx, 0.92, -0.2, g);
    cyl(0.018, 0.022, 0.3, M.chrome, 0, 0.15, 0, fa, 12);
    const spout = mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 20, PI), M.chrome, 0, 0.3, 0.1, fa); spout.rotation.y = HP;
    // backsplash: white subway tile
    const tc = newCanvas(256, 256), t2 = tc.getContext('2d');
    t2.fillStyle = '#c9c6bf'; t2.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) { const ox = (r % 2) * 32; t2.fillStyle = `rgb(${242 - (r * 7 + c * 3) % 9},${240 - (r * 5) % 7},234)`; t2.fillRect(c * 64 + ox + 2, r * 32 + 2, 60, 28); }
    const tt = toTex(tc); tt.repeat.set(cw / 0.5, 1.2);
    mesh(new THREE.PlaneGeometry(cw, 0.6), std({ map: tt, roughness: 0.25 }), cmid, 1.22, -0.305, g, false, true);
    // upper cabinets
    box(cw, 0.7, 0.34, cab, cmid, 1.87, -0.14, g);
    for (let i = 0; i < doors; i++) { const x = cx0 + (i + 0.5) * cw / doors; box(cw / doors - 0.012, 0.66, 0.02, cab, x, 1.87, 0.04, g); box(0.012, 0.12, 0.02, M.brushed, x + (i % 2 ? -1 : 1) * (cw / doors / 2 - 0.05), 1.62, 0.06, g); }
    mesh(new THREE.BoxGeometry(cw - 0.1, 0.01, 0.02), new THREE.MeshBasicMaterial({ color: 0xfff1d6, toneMapped: false }), cmid, 1.515, 0.0, g, false, false);
    point(0xffe6c0, 0.6, 2.4, cmid, 1.4, 0.2, g);
    // fridge (French doors + freezer drawer)
    const fg = group(fx, 0, 0.04, g);
    rbox(0.78, 1.86, 0.7, 0.02, M.brushed, 0, 0.93, 0, fg);
    box(0.76, 0.01, 0.01, std({ color: 0x111111 }), 0, 0.62, 0.352, fg);
    box(0.01, 1.2, 0.01, std({ color: 0x111111 }), 0, 1.24, 0.352, fg);
    const hinge = group(-0.385, 0, 0.35, fg);
    rbox(0.38, 1.2, 0.04, 0.01, M.brushed, 0.19, 1.24, 0.0, hinge);
    box(0.02, 0.5, 0.03, M.chrome, 0.35, 1.25, 0.04, hinge);
    box(0.02, 0.5, 0.03, M.chrome, 0.03, 1.25, 0.395, fg);
    box(0.4, 0.02, 0.03, M.chrome, 0, 0.55, 0.38, fg);
    mesh(new THREE.PlaneGeometry(0.7, 1.1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 0.6 }), 0, 1.24, 0.33, fg, false, false);
    W.fridgeDoor = hinge;
    colStatic(g, -len / 2, -0.31, len / 2, 0.42);
    W.interact.push({ id: 'fridge', pos: wp(fg, 0, 1.1, 0.4), r: 1.5, label: () => 'Grab an energy drink', action: 'fridge' });
  }

  // ---------- mining rig ----------
  {
    const g = at(SL.miningRig); W.items.miningRig = g;
    const frame = std({ color: 0x2b2e35, metalness: 0.8, roughness: 0.35 });
    for (const x of [-0.45, 0.45]) for (const z of [-0.2, 0.2]) box(0.02, 1.1, 0.02, frame, x, 0.55, z, g);
    for (const y of [0.3, 0.75]) box(0.92, 0.02, 0.42, frame, 0, y, 0, g);
    W.rigFans = [];
    for (const y of [0.3, 0.75]) for (let i = 0; i < 4; i++) {
      const card = group(-0.33 + i * 0.22, y + 0.12, 0, g);
      box(0.04, 0.2, 0.36, std({ color: 0x1a1c22, metalness: 0.5, roughness: 0.4 }), 0, 0, 0, card);
      for (const z of [-0.09, 0.09]) { const f = mesh(new THREE.CircleGeometry(0.075, 7), std({ color: 0x0c0c0c }), -0.021, 0, z, card, false, false); f.rotation.y = -HP; W.rigFans.push(f); }
      mesh(new THREE.PlaneGeometry(0.3, 0.008), new THREE.MeshBasicMaterial({ color: 0x40ffb0 }), 0.0, 0.1, 0, card, false, false).rotation.x = -HP;
    }
    point(0x40ffb0, 0.6, 2, 0, 0.6, 0.4, g);
    colItem('miningRig', g, -0.5, -0.25, 0.5, 0.25);
    W.interact.push({ id: 'rig', pos: wp(g, 0, 0.8, 0.3), r: 1.4, label: () => 'Check the mining rig', action: 'rig', need: 'miningRig' });
  }

  // ---------- bed (mattress on the floor until you buy a real one) ----------
  {
    const g = at(SL.bed); W.items.mattress = g;
    rbox(1.45, 0.22, 1.9, 0.06, std({ ...T.mattress, roughness: 1 }), 0, 0.11, 0, g);
    const pillow = rbox(0.55, 0.12, 0.34, 0.05, std({ ...T.weave, color: 0xdfe3ea }), 0.2, 0.28, -0.7, g); pillow.rotation.y = 0.15;
    const blanket = rbox(1.2, 0.08, 1.0, 0.04, std({ ...T.knit, color: 0x5a6e8c }), -0.05, 0.25, 0.35, g); blanket.rotation.y = -0.2; blanket.rotation.z = 0.03;
    const bed = at(SL.bed); W.items.bed = bed;
    const wood = L.id === 'penthouse' ? M.walnut : M.oak;
    rbox(1.6, 0.3, 2.05, 0.03, wood, 0, 0.2, 0, bed, 1);
    rbox(1.6, 0.9, 0.08, 0.03, wood, 0, 0.55, -1.02, bed, 1);
    rbox(1.5, 0.25, 1.95, 0.08, std({ ...T.weave, color: 0xeeeeea }), 0, 0.45, 0, bed);
    rbox(1.52, 0.1, 1.4, 0.05, std({ ...T.knit, color: L.id === 'penthouse' ? 0x2a2a30 : 0x2c3e66 }), 0, 0.6, 0.27, bed);
    for (const x of [-0.38, 0.38]) rbox(0.6, 0.14, 0.35, 0.06, std({ ...T.weave, color: 0xf2f2f0 }), x, 0.64, -0.75, bed);
    if (L.furnished) for (const s of [-1, 1]) { // nightstands
      const ns = group(s * 1.08, 0, -0.78, bed);
      rbox(0.45, 0.5, 0.4, 0.015, wood, 0, 0.25, 0, ns);
      cyl(0.06, 0.08, 0.04, M.brass, 0, 0.52, 0, ns, 16);
      mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 20, 1, true), std({ color: 0xf0e6d2, side: THREE.DoubleSide, emissive: 0xffd9a0, emissiveIntensity: 0.5 }), 0, 0.72, 0, ns, false, false);
      if (s > 0) point(0xffd2a0, 0.35, 2.2, 0, 0.75, 0.1, ns);
    }
    colItem('bed', bed, L.furnished ? -1.32 : -0.82, -1.06, L.furnished ? 1.32 : 0.82, 1.03);
    colItem('mattress', g, -0.75, -0.97, 0.75, 0.97);
    W.interact.push({ id: 'bed', pos: wp(g, 0, 0.4, 0), r: 1.7, label: () => 'Sleep (end the day)', action: 'sleep' });
  }

  // ---------- whiteboard ----------
  {
    const g = at(SL.whiteboard);
    box(1.32, 0.86, 0.025, M.steel, 0, 0, 0, g);
    const cv = newCanvas(1024, 660); const ctx = cv.getContext('2d');
    const tex = canvasTex(cv);
    mesh(new THREE.PlaneGeometry(1.28, 0.82), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25 }), 0, 0, 0.014, g, false, true);
    box(1.2, 0.03, 0.06, M.steel, 0, -0.44, 0.03, g);
    W.screens.whiteboard = { canvas: cv, ctx, tex };
    W.interact.push({ id: 'whiteboard', pos: wp(g, 0, 0, 0.35), r: 1.5, label: () => 'Read the plan', action: 'whiteboard' });
  }

  // ---------- posters ----------
  {
    W.items.posters = new THREE.Group(); R.add(W.items.posters);
    for (const [kind, x, y, z, ry] of SL.posters || []) {
      const g = at([x, y, z, ry], W.items.posters);
      const m = mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ map: toTex(drawPoster(kind)), roughness: 0.75 }), 0, 0, 0.005, g, false, true);
      m.rotation.z = (Math.random() - 0.5) * 0.05;
      if (L.furnished) { // framed in nicer places
        const fr = std({ color: 0x15161a, roughness: 0.4 });
        box(0.56, 0.03, 0.03, fr, 0, 0.365, 0, g); box(0.56, 0.03, 0.03, fr, 0, -0.365, 0, g);
        box(0.03, 0.76, 0.03, fr, 0.265, 0, 0, g); box(0.03, 0.76, 0.03, fr, -0.265, 0, 0, g);
      }
    }
  }

  // ---------- LED strip ----------
  if (SL.led) {
    const g = group(0, 0, 0); W.items.ledStrip = g;
    W.ledMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x8a3dff, emissiveIntensity: 2.2 });
    for (const [x0, z0, x1, z1] of SL.led.segs) mesh(new THREE.BoxGeometry(Math.max(0.012, Math.abs(x1 - x0)), 0.012, Math.max(0.012, Math.abs(z1 - z0))), W.ledMat, (x0 + x1) / 2, SL.led.y, (z0 + z1) / 2, g, false, false);
    W.ledLights = SL.led.lights.map(([x, z]) => point(0x8a3dff, 0.32, 3.2, x, SL.led.y - 0.1, z, g));
  }

  // ---------- rug ----------
  {
    const g = at(SL.rug); W.items.rug = g;
    const rg = new THREE.PlaneGeometry(3, 2.1); rg.rotateX(-HP);
    mesh(rg, std({ ...T.rug, roughness: 1 }), 0, 0.006, 0, g, false, true);
  }

  // ---------- lounge: TV against the wall, couch facing it ----------
  {
    const o = SL.loungeOpts || {};
    const g = at(SL.lounge); W.items.couchTV = g;
    const big = !!o.big;
    const tvW = big ? 1.65 : 1.12, tvH = big ? 0.95 : 0.66;
    const tv = group(0, 0, 0, g);
    let tvY = 0.95, tvZ = 0;
    if (o.wall) { // wall-mounted TV over a linear fireplace
      tvY = 1.55; tvZ = -0.12;
      const fp = group(0, 0, 0, g);
      box(1.9, 0.5, 0.32, std({ color: 0x0d0d10, roughness: 0.3, metalness: 0.4 }), 0, 0.42, 0.0, fp);
      const fc = newCanvas(512, 64), f2 = fc.getContext('2d');
      const fgr = f2.createLinearGradient(0, 64, 0, 0); fgr.addColorStop(0, '#ffcf6a'); fgr.addColorStop(0.5, '#ff7a1a'); fgr.addColorStop(1, 'rgba(255,60,0,0)');
      f2.fillStyle = fgr; for (let i = 0; i < 40; i++) { const x = i * 13, w = 10 + Math.random() * 14, hh = 30 + Math.random() * 34; f2.beginPath(); f2.moveTo(x, 64); f2.quadraticCurveTo(x + w / 2, 64 - hh * 1.4, x + w, 64); f2.fill(); }
      const ft = canvasTex(fc); ft.wrapS = THREE.RepeatWrapping;
      const flame = mesh(new THREE.PlaneGeometry(1.6, 0.2), new THREE.MeshBasicMaterial({ map: ft, transparent: true, toneMapped: false }), 0, 0.38, 0.165, fp, false, false);
      flame.material.color.setScalar(1.5);
      const fl = point(0xff8a3a, 1.2, 4, 0, 0.5, 0.5, fp);
      W.updaters.push((dt, t) => { ft.offset.x = (t * 0.15) % 1; fl.intensity = 1.0 + Math.sin(t * 9) * 0.15 + Math.random() * 0.15; });
      box(2.2, 0.04, 0.4, M.marbleTop, 0, 0.69, 0.04, fp);
    } else rbox(big ? 1.8 : 1.2, 0.5, 0.4, 0.02, big ? M.walnut : M.oak, 0, 0.25, 0, tv, 1);
    rbox(tvW + 0.06, tvH + 0.06, 0.05, 0.01, M.black, 0, tvY, tvZ, tv);
    const cv = newCanvas(512, 288); const ctx = cv.getContext('2d');
    const tex = canvasTex(cv);
    const tm = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); tm.color.setScalar(0.9);
    mesh(new THREE.PlaneGeometry(tvW, tvH), tm, 0, tvY, tvZ + 0.027, tv, false, false);
    W.screens.tv = { canvas: cv, ctx, tex };
    W.lights.tv = point(0x9fc4ff, 0.6, 3, 0, tvY, 0.6, g);
    // couch placeholder (the real sofa model replaces it once loaded)
    const couch = group(0, 0, 2.36, g); W.couchGroup = couch;
    const ph = group(0, 0, 0, couch); W.couchPlaceholder = ph;
    const fab = std({ ...T.weave, color: L.id === 'penthouse' ? 0x3a3a40 : 0x6b4a3a, roughness: 1 });
    rbox(1.9, 0.42, 0.85, 0.08, fab, 0, 0.21, 0, ph);
    rbox(1.9, 0.5, 0.22, 0.09, fab, 0, 0.55, 0.32, ph);
    for (const s of [-1, 1]) rbox(0.2, 0.3, 0.85, 0.08, fab, s * 0.93, 0.5, 0, ph);
    for (const x of [-0.45, 0.45]) rbox(0.84, 0.14, 0.7, 0.06, fab, x, 0.47, -0.05, ph);
    if (L.furnished) { // coffee table
      const ct = group(0, 0, 1.2, g);
      rbox(1.0, 0.04, 0.55, 0.015, L.id === 'penthouse' ? M.marbleTop : M.walnut, 0, 0.4, 0, ct);
      for (const x of [-0.42, 0.42]) for (const z of [-0.2, 0.2]) cyl(0.015, 0.015, 0.38, M.black, x, 0.19, z, ct, 8);
      colItem('couchTV', g, -0.52, 0.92, 0.52, 1.48);
    }
    colItem('couchTV', g, -(big ? 0.95 : 0.65), -0.22, big ? 0.95 : 0.65, 0.25);
    colItem('couchTV', g, -0.96, 1.92, 0.96, 2.82);
    W.seats.couch = wp(g, 0, 0.42, 2.41);
    W.interact.push({ id: 'tv', pos: wp(g, 0, tvY, 0.3), r: 1.8, label: () => 'Watch the news', action: 'tv', need: 'couchTV' });
  }

  // ---------- beanbag (basement, until the couch arrives) ----------
  if (SL.beanbag) {
    const g = at(SL.beanbag);
    const bb = mesh(new THREE.SphereGeometry(0.45, 28, 20), std({ ...T.leather, color: 0x2f6b4f, roughness: 0.7 }), 0, 0.26, 0, g);
    bb.scale.set(1, 0.55, 1);
    W.items.beanbag = g;
    colItem('beanbag', g, -0.4, -0.4, 0.4, 0.4);
  }

  // ---------- arcade cabinet ----------
  {
    const g = at(SL.arcade); W.items.arcade = g;
    const cab = std({ color: 0x1b1430, roughness: 0.6 });
    rbox(0.66, 1.7, 0.7, 0.02, cab, 0, 0.85, 0, g);
    rbox(0.66, 0.08, 0.3, 0.02, std({ color: 0x2a1e48 }), 0, 1.05, 0.45, g);
    const cv = newCanvas(256, 200), c = cv.getContext('2d');
    c.fillStyle = '#05010e'; c.fillRect(0, 0, 256, 200); c.fillStyle = '#ffde3b'; c.font = '900 34px Impact'; c.textAlign = 'center'; c.fillText('RUG RUNNER', 128, 60);
    c.fillStyle = '#ff3fd2'; c.font = '20px monospace'; c.fillText('INSERT COIN', 128, 150);
    const scr = mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshBasicMaterial({ map: toTex(cv), toneMapped: false }), 0, 1.38, 0.36, g, false, false);
    scr.rotation.x = -0.15;
    for (let i = 0; i < 4; i++) cyl(0.02, 0.02, 0.02, new THREE.MeshStandardMaterial({ color: [0xff4d5e, 0x38e08c, 0x3ec5ff, 0xffde3b][i], roughness: 0.3 }), -0.15 + i * 0.1, 1.1, 0.5, g, 12);
    point(0xff3fd2, 0.5, 2, 0, 1.4, 0.7, g);
    colItem('arcade', g, -0.35, -0.36, 0.35, 0.6);
  }

  // ---------- server rack ----------
  {
    const g = at(SL.serverRack); W.items.serverRack = g;
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
    point(0x3ec5ff, 0.5, 2, 0, 1.0, 0.5, g);
    colItem('serverRack', g, -0.33, -0.37, 0.33, 0.37);
  }

  // ---------- crew stations (Kev, Zoe, Dex) ----------
  const station = (key, slot, lines, glow) => {
    const g = at(slot); W.items[key] = g;
    rbox(1.0, 0.03, 0.6, 0.01, std({ color: 0xe8e6e0, roughness: 0.5 }), 0, 0.72, 0, g);
    for (const x of [-0.45, 0.45]) for (const z of [-0.25, 0.25]) box(0.025, 0.72, 0.025, M.steel, x, 0.36, z, g);
    const lap = group(0, 0.735, 0.0, g);
    rbox(0.34, 0.015, 0.23, 0.005, std({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.3 }), 0, 0.0075, 0, lap);
    const lid = group(0, 0.015, -0.115, lap); lid.rotation.x = -0.25;
    rbox(0.34, 0.23, 0.01, 0.005, std({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.3 }), 0, 0.115, 0, lid);
    const cv = newCanvas(256, 170), c = cv.getContext('2d');
    c.fillStyle = '#0b0f14'; c.fillRect(0, 0, 256, 170);
    lines(c);
    mesh(new THREE.PlaneGeometry(0.31, 0.2), new THREE.MeshBasicMaterial({ map: toTex(cv), toneMapped: false }), 0, 0.115, 0.006, lid, false, false);
    point(glow, 0.35, 1.5, 0, 0.3, 0.2, lap);
    const ch = group(0, 0, 0.55, g);
    rbox(0.42, 0.03, 0.4, 0.01, std({ color: 0x4b4f57, metalness: 0.6 }), 0, 0.46, 0, ch);
    rbox(0.42, 0.26, 0.02, 0.01, std({ color: 0x4b4f57, metalness: 0.6 }), 0, 0.72, 0.21, ch);
    for (const x of [-0.19, 0.19]) for (const z of [-0.18, 0.18]) box(0.02, 0.46, 0.02, M.steel, x, 0.23, z, ch);
    colItem(key, g, -0.55, -0.35, 0.55, 0.75);
    W.crewSpots[key.replace('Desk', '')] = { pos: wp(g, 0, 0, 0.55), ry: g.rotation.y + PI, state: 'type' };
  };
  if (SL.kevDesk) station('kevDesk', SL.kevDesk, (c) => {
    c.font = '11px monospace';
    ['// meme generator v0.3', 'const mascot = pick(memes);', 'render(mascot, {', '  hat: true,', '  laser_eyes: true,', '});', '// TODO: sleep', 'while (true) {', '  ship();', '}'].forEach((l, i) => { c.fillStyle = ['#c678dd', '#e5c07b', '#98c379', '#5c6370', '#abb2bf'][i % 5]; c.fillText(l, 8, 16 + i * 15); });
  }, 0x7fb0ff);
  if (SL.zoeDesk) station('zoeDesk', SL.zoeDesk, (c) => {
    c.fillStyle = '#1b1f27'; c.fillRect(0, 100, 256, 70);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { c.fillStyle = ['#ff6a8a', '#3ec5ff', '#ffb547'][r]; c.fillRect(6 + i * 42 + (r * 9) % 20, 106 + r * 20, 30 + (i * 7) % 12, 14); }
    c.fillStyle = '#ff3a3a'; c.fillRect(120, 98, 2, 72);
    c.fillStyle = '#2a2f3a'; c.fillRect(48, 8, 160, 86); c.fillStyle = '#ffb547'; c.font = '900 22px Impact'; c.textAlign = 'center'; c.fillText('NEW CLIP', 128, 58);
  }, 0xff8ab0);
  if (SL.dexDesk) station('dexDesk', SL.dexDesk, (c) => {
    c.strokeStyle = '#1fd18a'; c.lineWidth = 2; c.beginPath(); let y = 120;
    for (let x = 0; x < 256; x += 8) { y += (Math.sin(x * 0.11) + Math.random() - 0.45) * 6; c.lineTo(x, y); } c.stroke();
    c.font = '10px monospace'; c.fillStyle = '#a3adbd'; ['SOL   +2.1%', 'META  FROGS', 'CYCLE BULL', 'RISK  MED'].forEach((l, i) => c.fillText(l, 8, 16 + i * 14));
  }, 0x40ffb0);
  if (SL.mo) { const [x, z, ry] = SL.mo; W.crewSpots.mo = { pos: new THREE.Vector3(x, 0, z), ry, state: 'phone' }; }

  // ---------- espresso machine ----------
  {
    const g = at(SL.espresso); W.items.espresso = g;
    rbox(0.26, 0.3, 0.3, 0.02, std({ color: 0xc9ccd2, roughness: 0.25, metalness: 0.9 }), 0, 0.15, 0, g);
    rbox(0.22, 0.04, 0.2, 0.01, M.black, 0, 0.02, 0.05, g);
    cyl(0.03, 0.03, 0.02, M.black, 0, 0.2, 0.16, g, 16);
    box(0.012, 0.012, 0.08, M.black, 0, 0.2, 0.2, g);
    cyl(0.025, 0.02, 0.05, std({ color: 0xffffff, roughness: 0.3 }), 0, 0.065, 0.12, g, 16);
    mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshBasicMaterial({ color: 0x40ff9a }), 0.08, 0.26, 0.151, g, false, false);
  }

  // ---------- reef aquarium ----------
  {
    const g = at(SL.aquarium); W.items.aquarium = g;
    rbox(1.0, 0.72, 0.42, 0.01, std({ color: 0x15171c, roughness: 0.4 }), 0, 0.36, 0, g);
    const water = new THREE.MeshPhysicalMaterial({ color: 0x3aa9ff, emissive: 0x0a4a88, emissiveIntensity: 0.9, transparent: true, opacity: 0.55, roughness: 0.05 });
    mesh(new THREE.BoxGeometry(0.96, 0.5, 0.38), water, 0, 0.98, 0, g, false, false);
    box(1.0, 0.03, 0.42, M.black, 0, 1.245, 0, g);
    box(0.96, 0.06, 0.38, std({ color: 0xe8d8b0, roughness: 1 }), 0, 0.76, 0, g);
    W.fish = [];
    for (let i = 0; i < 6; i++) {
      const f = mesh(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshStandardMaterial({ color: [0xff7a2e, 0xffd23a, 0x3ef0ff, 0xff4d8a, 0xffffff, 0x8a7bff][i], emissive: 0x111111, roughness: 0.3 }), 0, 0.9 + (i % 3) * 0.08, 0, g, false, false);
      f.scale.set(1.8, 1, 0.6); f.userData = { ph: i * 1.3, sp: 0.4 + (i % 3) * 0.15 };
      W.fish.push(f);
    }
    for (let i = 0; i < 5; i++) { const c = cyl(0.008, 0.012, 0.18 + (i % 2) * 0.1, std({ color: [0xff6a8a, 0x8af06b, 0xffb547][i % 3], roughness: 0.6 }), -0.4 + i * 0.2, 0.86, (i % 2 ? 0.08 : -0.08), g, 6); c.rotation.z = (i - 2) * 0.12; }
    point(0x3aa9ff, 0.8, 2.8, 0, 1.2, 0.3, g);
    colItem('aquarium', g, -0.53, -0.24, 0.53, 0.32);
  }

  // ---------- vending machine ----------
  {
    const g = at(SL.vending); W.items.vending = g;
    rbox(0.9, 1.85, 0.8, 0.02, std({ color: 0xc8202f, roughness: 0.35, metalness: 0.4 }), 0, 0.925, 0, g);
    const cv = newCanvas(256, 420), c = cv.getContext('2d');
    c.fillStyle = '#0b0f16'; c.fillRect(0, 0, 256, 420);
    const cols = ['#7dff3a', '#3ef0ff', '#ffb547', '#ff4d8a'];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) { c.fillStyle = cols[(r + k) % 4]; c.fillRect(18 + k * 58, 22 + r * 78, 40, 56); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(22 + k * 58, 26 + r * 78, 8, 48); }
    const front = mesh(new THREE.PlaneGeometry(0.56, 1.1), new THREE.MeshBasicMaterial({ map: toTex(cv), toneMapped: false }), -0.1, 1.15, 0.402, g, false, false);
    front.material.color.setScalar(0.9);
    const lc = newCanvas(256, 64), lx = lc.getContext('2d'); lx.fillStyle = '#c8202f'; lx.fillRect(0, 0, 256, 64); lx.fillStyle = '#fff'; lx.font = '900 40px Impact, sans-serif'; lx.textAlign = 'center'; lx.fillText('VOLT', 128, 48);
    mesh(new THREE.PlaneGeometry(0.56, 0.14), new THREE.MeshBasicMaterial({ map: toTex(lc), toneMapped: false }), -0.1, 1.82, 0.402, g, false, false);
    box(0.18, 0.4, 0.02, M.black, 0.3, 1.2, 0.405, g);
    box(0.6, 0.14, 0.02, M.black, -0.1, 0.32, 0.405, g);
    point(0x9fd0ff, 0.5, 2.2, 0, 1.2, 0.7, g);
    colItem('vending', g, -0.47, -0.43, 0.47, 0.43);
    W.interact.push({ id: 'vending', pos: wp(g, 0, 1.1, 0.45), r: 1.5, label: () => 'Grab a free VOLT', action: 'fridge', need: 'vending' });
  }

  // ---------- display case: gold chain + watch ----------
  {
    const g = at(SL.showcase); W.items.showcase = g;
    rbox(0.5, 0.95, 0.4, 0.01, std({ color: 0x15171c, roughness: 0.35, metalness: 0.5 }), 0, 0.475, 0, g);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0, clearcoat: 1 });
    mesh(new THREE.BoxGeometry(0.46, 0.4, 0.36), glass, 0, 1.15, 0, g, false, false);
    box(0.44, 0.02, 0.34, std({ color: 0x2a0d14, roughness: 1 }), 0, 0.96, 0, g);
    const ch = group(0, 0, 0, g); W.items.chain = ch;
    const chain = mesh(new THREE.TorusGeometry(0.09, 0.012, 10, 48), M.gold, -0.08, 1.0, 0, ch); chain.rotation.x = HP; chain.scale.y = 1.3;
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 24), M.gold, -0.08, 0.98, 0.11, ch);
    const wt = group(0, 0, 0, g); W.items.rolex = wt;
    const face = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 32), M.gold, 0.11, 1.03, 0, wt); face.rotation.x = 0.6;
    const dial = mesh(new THREE.CircleGeometry(0.024, 24), std({ color: 0x0e3b2a, roughness: 0.2 }), 0.11, 1.036, 0.005, wt, false, false); dial.rotation.x = 0.6 - HP;
    const band = mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 24), M.gold, 0.11, 1.0, 0, wt); band.rotation.x = 0.6;
    point(0xfff0c0, 0.5, 1.2, 0, 1.32, 0, g);
    colItem('showcase', g, -0.27, -0.22, 0.27, 0.22);
  }

  // ---------- diamond hands statue ----------
  {
    const g = at(SL.statue); W.items.statue = g;
    cyl(0.26, 0.3, 0.9, std({ color: 0xece8e0, roughness: 0.4 }), 0, 0.45, 0, g, 32);
    const dmat = new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.03, metalness: 0, transmission: 0.6, thickness: 0.4, ior: 2.4, clearcoat: 1, emissive: 0x2a5a7a, emissiveIntensity: 0.4 });
    for (const sx of [-1, 1]) {
      const hand = group(sx * 0.1, 0.92, 0, g); hand.rotation.z = sx * -0.25;
      rbox(0.13, 0.17, 0.07, 0.03, dmat, 0, 0.12, 0, hand);
      for (let i = 0; i < 4; i++) rbox(0.026, 0.11, 0.03, 0.012, dmat, -0.045 + i * 0.03, 0.26, 0, hand);
      const th = rbox(0.03, 0.08, 0.03, 0.012, dmat, sx * -0.08, 0.12, 0.02, hand); th.rotation.z = sx * 0.7;
    }
    const gem = mesh(new THREE.OctahedronGeometry(0.07), dmat, 0, 1.3, 0, g); gem.scale.y = 1.3;
    W.gem = gem;
    point(0x9fdcff, 0.7, 2, 0, 1.5, 0.3, g);
    colItem('statue', g, -0.3, -0.3, 0.3, 0.3);
  }

  // ---------- golden toilet ----------
  {
    const g = at(SL.toilet); W.items.toilet = g;
    cyl(0.16, 0.12, 0.38, M.gold, 0, 0.19, 0.05, g, 28);
    const bowl = mesh(new THREE.TorusGeometry(0.17, 0.045, 12, 32), M.gold, 0, 0.4, 0.07, g); bowl.rotation.x = HP; bowl.scale.y = 1.25;
    rbox(0.42, 0.42, 0.16, 0.04, M.gold, 0, 0.62, -0.18, g);
    rbox(0.38, 0.02, 0.44, 0.04, M.gold, 0, 0.45, 0.06, g);
    colItem('toilet', g, -0.32, -0.3, 0.32, 0.38);
  }

  // ---------- framed Lambo photo ----------
  {
    const g = at(SL.lambo); W.items.lambo = g;
    const cv = newCanvas(512, 320), c = cv.getContext('2d');
    const sky = c.createLinearGradient(0, 0, 0, 320); sky.addColorStop(0, '#ffb07a'); sky.addColorStop(1, '#5a3a7a'); c.fillStyle = sky; c.fillRect(0, 0, 512, 320);
    c.fillStyle = '#3a6a3a'; c.fillRect(0, 220, 512, 100);
    c.fillStyle = '#e8e2d6'; c.fillRect(300, 90, 180, 130); c.fillStyle = '#7a3a2a'; c.beginPath(); c.moveTo(290, 95); c.lineTo(390, 40); c.lineTo(490, 95); c.fill();
    c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(40, 250); c.lineTo(110, 205); c.lineTo(230, 195); c.lineTo(330, 225); c.lineTo(335, 255); c.lineTo(40, 262); c.fill();
    c.fillStyle = '#1a1a1a'; for (const x of [95, 280]) { c.beginPath(); c.arc(x, 262, 24, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; c.font = 'italic 22px Georgia, serif'; c.fillText(L.id === 'basement' ? "parked on mom's lawn" : 'in the garage downstairs', 24, 34);
    mesh(new THREE.PlaneGeometry(0.9, 0.56), new THREE.MeshStandardMaterial({ map: toTex(cv), roughness: 0.4 }), 0, 0, 0.012, g, false, true);
    box(0.96, 0.62, 0.03, M.gold, 0, 0, -0.005, g);
  }

  // ---------- front door (everywhere but the basement) ----------
  if (SL.frontDoor) {
    const g = at(SL.frontDoor);
    const pent = L.id === 'penthouse', hype = L.id === 'hypehouse';
    box(1.04, 2.18, 0.08, pent ? M.brushed : M.trim, 0, 1.09, 0.0, g);
    if (pent) { // private elevator
      for (const s of [-1, 1]) rbox(0.46, 2.06, 0.03, 0.005, M.brushed, s * 0.235, 1.03, 0.05, g);
      const pc = newCanvas(128, 64), pctx = pc.getContext('2d'); pctx.fillStyle = '#05070a'; pctx.fillRect(0, 0, 128, 64); pctx.fillStyle = '#ffb36b'; pctx.font = 'bold 36px monospace'; pctx.textAlign = 'center'; pctx.fillText('PH', 64, 46);
      mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: toTex(pc), toneMapped: false }), 0, 2.32, 0.05, g, false, false);
    } else {
      const dm = hype ? std({ color: 0x15161a, roughness: 0.4 }) : M.door;
      rbox(0.9, 2.04, 0.045, 0.01, dm, 0, 1.03, 0.04, g);
      for (const [y, h] of [[1.5, 0.7], [0.55, 0.75]]) rbox(0.66, h, 0.012, 0.005, hype ? std({ color: 0x1d1e23, roughness: 0.4 }) : M.door, 0, y, 0.068, g);
      cyl(0.02, 0.02, 0.12, M.brass, 0.36, 1.0, 0.09, g, 12).rotation.x = HP;
    }
    W.interact.push({ id: 'door', pos: wp(g, 0, 1.2, 0.3), r: 1.6, label: () => (pent ? 'Private elevator' : 'Front door'), action: 'door' });
  }

  // ---------- house plants ----------
  for (const [x, z, s] of SL.plants || []) {
    const g = group(x, 0, z);
    const pot = std({ color: L.id === 'penthouse' ? 0x1c1c20 : 0xe7e2d8, roughness: 0.5 });
    cyl(0.17 * s, 0.13 * s, 0.36 * s, pot, 0, 0.18 * s, 0, g, 24);
    cyl(0.16 * s, 0.16 * s, 0.01, std({ color: 0x2a1d14, roughness: 1 }), 0, 0.35 * s, 0, g, 20);
    const leafM = std({ color: 0x2f6a3a, roughness: 0.6, side: THREE.DoubleSide });
    const stemM = std({ color: 0x3f6a2a, roughness: 0.8 });
    const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(0.13, 0.12, 0, 0.36); leaf.quadraticCurveTo(-0.13, 0.12, 0, 0);
    const lg = new THREE.ShapeGeometry(leaf, 6);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4, hgt = (0.55 + (i % 4) * 0.12) * s, r = 0.08 + (i % 3) * 0.06;
      const st = cyl(0.006, 0.008, hgt - 0.3 * s, stemM, Math.sin(a) * r * 0.5, 0.35 * s + (hgt - 0.3 * s) / 2, Math.cos(a) * r * 0.5, g, 5);
      st.rotation.set(Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25);
      const l = mesh(lg, leafM, Math.sin(a) * r, 0.3 * s + hgt * 0.95, Math.cos(a) * r, g, true, false);
      l.scale.setScalar(s * (0.9 + (i % 3) * 0.15));
      l.rotation.set(-0.9 - (i % 2) * 0.3, a, 0, 'YXZ');
    }
    collide(x - 0.2 * s, z - 0.2 * s, x + 0.2 * s, z + 0.2 * s);
  }

  // ============================================================
  // PER-FRAME
  // ============================================================
  W.update = (dt, t) => {
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
    if (W.fish) W.fish.forEach((f) => { const u = f.userData; const a = t * u.sp + u.ph; f.position.x = Math.sin(a) * 0.38; f.position.z = Math.cos(a * 1.7) * 0.1; f.rotation.y = Math.cos(a) > 0 ? 0 : PI; });
    if (W.gem) W.gem.rotation.y += dt * 0.8;
    if (W.kbGlow) W.kbGlow.emissive.setHSL((t * 0.12) % 1, 1, 0.5);
    if (W.fridgeDoor) W.fridgeDoor.rotation.y = damp(W.fridgeDoor.rotation.y, W.fridgeOpen > 0 ? -1.6 : 0, 6, dt);
    if (W.fridgeOpen > 0) W.fridgeOpen -= dt;
    for (const u of W.updaters) u(dt, t);
  };

  // ============================================================
  // ITEMS: what's visible + what blocks you
  // ============================================================
  W.has = (k) => !!W._owned[k] || (L.furnished && (k === 'couchTV' || k === 'bed'));
  W.applyItems = (owned) => {
    W._owned = owned || {};
    const has = W.has;
    const vis = (k, v) => { if (W.items[k]) W.items[k].visible = v; };
    vis('monitor2', has('monitor2')); vis('monitor3', has('monitor3'));
    vis('chairBasic', !has('gamingChair')); vis('gamingChair', has('gamingChair'));
    vis('towerBasic', !has('gamingPC')); vis('gamingPC', has('gamingPC'));
    for (const k of ['ledStrip', 'neon', 'rug', 'lavaLamp', 'ringLight', 'couchTV', 'miningRig', 'arcade', 'serverRack', 'posters', 'kevDesk', 'espresso', 'aquarium', 'vending', 'stream', 'statue', 'toilet', 'lambo', 'chain', 'rolex']) vis(k, has(k));
    vis('zoeDesk', has('zoe')); vis('dexDesk', has('dex'));
    vis('lamboKeys', has('lambo'));
    vis('mechKeyboard', has('mechKeyboard')); vis('kbBasic', !has('mechKeyboard'));
    vis('showcase', has('chain') || has('rolex'));
    vis('mattress', !has('bed')); vis('bed', has('bed'));
    vis('beanbag', !has('couchTV'));
    const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    W.dynColliders = [];
    for (const [k, rects] of Object.entries(W.itemCols)) if (W.items[k] && shown(W.items[k])) W.dynColliders.push(...rects);
  };
  return W;
}

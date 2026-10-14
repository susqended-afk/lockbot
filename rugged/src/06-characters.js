// ============================================================
// CHARACTERS — procedural humans with faces, cloth and posing
// Units are meters; a character stands ~1.78m tall facing +z.
// Limb pivots point down -y; rotation.x < 0 swings a limb forward.
// ============================================================
let CHAR_TEX = null;
function charTextures() {
  if (CHAR_TEX) return CHAR_TEX;
  const s = Math.min(TEX_SIZE, 512);
  CHAR_TEX = {
    knit: texSet(genKnit(s), [2, 2]),
    denim: texSet(genDenim(s), [2, 2]),
    hair: texSet(genHair(s / 2), [2, 1]),
    skin: genSkin(256),
    weave: texSet(genWeave(s / 2, 77), [3, 3]),
    leather: texSet(genLeather(s / 2)),
  };
  return CHAR_TEX;
}

// paint the head's color map: skin + blush + stubble + lip tint
function paintFace(spec) {
  const W = 512, H = 256;
  const c = newCanvas(W, H), ctx = c.getContext('2d');
  const sk = new THREE.Color(spec.skin);
  const base = `rgb(${sk.r * 255 | 0},${sk.g * 255 | 0},${sk.b * 255 | 0})`;
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(charTextures().skin.color, 0, 0, W, H);
  ctx.drawImage(charTextures().skin.color, W / 2, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  const fx = W * 0.25; // face center (+z) in sphere UVs
  // cheeks
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(fx + s * W * 0.055, H * 0.6, 2, fx + s * W * 0.055, H * 0.6, W * 0.05);
    g.addColorStop(0, 'rgba(200,80,80,0.22)'); g.addColorStop(1, 'rgba(200,80,80,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // eye sockets slightly darker
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(fx + s * W * 0.055, H * 0.47, 1, fx + s * W * 0.055, H * 0.47, W * 0.035);
    g.addColorStop(0, 'rgba(70,40,40,0.25)'); g.addColorStop(1, 'rgba(70,40,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // lips, mouth line, nostrils
  const lipCol = new THREE.Color(spec.skin).lerp(new THREE.Color(0x9a3a44), 0.45);
  const lc = `rgb(${lipCol.r * 255 | 0},${lipCol.g * 255 | 0},${lipCol.b * 255 | 0})`;
  const ell = (x, y, rx, ry, fill, alpha = 1) => {
    const [u, v] = headUV(x, y, W, H), [u2] = headUV(x + rx, y, W, H), [, v2] = headUV(x, y - ry, W, H);
    ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(u, v, Math.abs(u2 - u), Math.abs(v2 - v), 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  };
  ell(0, -0.0405, 0.0185, 0.0035, lc, 0.85);
  ell(0, -0.0495, 0.0155, 0.0048, lc, 0.9);
  ell(0, -0.0445, 0.0195, 0.0009, 'rgb(60,20,24)', 0.85);
  for (const sx of [-1, 1]) { ell(sx * 0.0085, -0.0228, 0.0035, 0.0018, 'rgb(40,20,18)', 0.6); ell(sx * 0.031, -0.0015, 0.012, 0.004, 'rgba(90,50,50,1)', 0.12); }
  if (spec.stubble) {
    const rnd = mulberry32(5);
    ctx.fillStyle = spec.stubbleColor || 'rgba(40,28,20,0.5)';
    for (let i = 0; i < 9000; i++) {
      const u = fx + (rnd() - 0.5) * W * 0.34, v = H * (0.6 + rnd() * 0.32);
      const du = Math.abs(u - fx) / (W * 0.17), dv = (v / H - 0.6) / 0.32;
      if (du * du + (1 - dv) * (1 - dv) * 0.8 > 1.05 && dv < 0.55) continue;
      if (Math.abs(u - fx) < W * 0.03 && v < H * 0.7) continue;
      ctx.globalAlpha = 0.25 + rnd() * 0.35;
      ctx.fillRect(u, v, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;
  }
  if (spec.freckles) {
    const rnd = mulberry32(9);
    ctx.fillStyle = 'rgba(140,80,50,0.45)';
    for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(fx + (rnd() - 0.5) * W * 0.16, H * (0.52 + rnd() * 0.08), 0.8 + rnd(), 0, 7); ctx.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function irisTexture(color) {
  const S = 128, c = newCanvas(S), ctx = c.getContext('2d');
  const col = new THREE.Color(color);
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.12, S / 2, S / 2, S / 2);
  g.addColorStop(0, `rgb(${col.r * 255 * 1.3 | 0},${col.g * 255 * 1.3 | 0},${col.b * 255 * 1.3 | 0})`);
  g.addColorStop(0.75, `rgb(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0})`);
  g.addColorStop(0.92, '#1a1410'); g.addColorStop(1, '#1a1410');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(S / 2 + Math.cos(a) * S * 0.16, S / 2 + Math.sin(a) * S * 0.16); ctx.lineTo(S / 2 + Math.cos(a) * S * 0.42, S / 2 + Math.sin(a) * S * 0.42); ctx.stroke(); }
  ctx.fillStyle = '#060404'; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.17, 0, 7); ctx.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- sculpted head ----------
// One smooth mesh: proportions, brow, sockets, cheekbones, nose, lips, chin.
const HEAD = { sx: 0.8, sy: 1.16, sz: 0.98 };
function sculpt(x, y, z) {
  x *= HEAD.sx; y *= HEAD.sy; z *= HEAD.sz;
  const jaw = smooth(0.0, -0.11, y);
  x *= 1 - jaw * 0.28;
  if (z < 0) z *= 1 - jaw * 0.38;
  if (z < 0 && y > -0.02) z *= 1.07;
  if (z > 0.056) z = 0.056 + (z - 0.056) * 0.55;
  const f = smooth(0.02, 0.06, z);
  if (f > 0) {
    const g = (cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
    let dz = 0;
    dz += 0.006 * g(0, 0.036, 0.05, 0.011);
    dz -= 0.009 * (g(0.031, 0.011, 0.015, 0.01) + g(-0.031, 0.011, 0.015, 0.01));
    dz += 0.004 * (g(0.046, -0.014, 0.016, 0.016) + g(-0.046, -0.014, 0.016, 0.016));
    if (y < 0.034 && y > -0.036) {
      const t = clamp((0.032 - y) / 0.05, 0, 1);
      const prof = y > -0.017 ? 0.003 + 0.018 * Math.pow(t, 1.5) : 0.021 * smooth(-0.034, -0.017, y);
      const w = 0.0055 + 0.0075 * t;
      dz += prof * Math.exp(-((x / w) ** 2));
    }
    dz += 0.006 * (g(0.0115, -0.02, 0.0055, 0.005) + g(-0.0115, -0.02, 0.0055, 0.005));
    dz += 0.0035 * g(0, -0.038, 0.017, 0.005);
    dz += 0.0045 * g(0, -0.051, 0.015, 0.0045);
    dz -= 0.0022 * g(0, -0.0445, 0.02, 0.0016);
    dz -= 0.002 * g(0, -0.062, 0.02, 0.004);
    dz += 0.006 * g(0, -0.086, 0.022, 0.012);
    z += dz * f;
  }
  return [x, y, z];
}
let HEAD_GEO = null;
function headGeometry() {
  if (HEAD_GEO) return HEAD_GEO;
  const g = new THREE.SphereGeometry(0.1, 96, 72);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const [x, y, z] = sculpt(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, x, y, z); }
  g.computeVertexNormals();
  HEAD_GEO = g;
  return g;
}
// depth of the head's front surface at (x, y)
function headSurfZ(x, y) {
  const p = headGeometry().attributes.position;
  let best = 0, bd = Infinity;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i); if (z < 0.02) continue;
    const d = (p.getX(i) - x) ** 2 + (p.getY(i) - y) ** 2;
    if (d < bd) { bd = d; best = z; }
  }
  return best;
}
// canvas position of a front-of-head point (for painting the face texture)
function headUV(x, y, W, H) {
  const th = Math.acos(clamp(y / HEAD.sy / 0.1, -1, 1));
  const xo = x / (HEAD.sx * (1 - smooth(0.0, -0.11, y) * 0.28));
  const phi = Math.acos(clamp(-xo / (0.1 * Math.max(1e-4, Math.sin(th))), -1, 1));
  return [phi / (Math.PI * 2) * W, th / Math.PI * H];
}
// a shell over part of the head: hair, beards, hats
function headShell(keep, offset) {
  const geo = headGeometry();
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, idx = geo.index;
  const P = [], N = [], U = [];
  for (let i = 0; i < idx.count; i += 3) {
    const t = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)];
    if (!t.every((k) => keep(pos.getX(k), pos.getY(k), pos.getZ(k)))) continue;
    for (const k of t) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const off = typeof offset === 'function' ? offset(x, y, z) : offset;
      P.push(x + nor.getX(k) * off, y + nor.getY(k) * off, z + nor.getZ(k) * off);
      N.push(nor.getX(k), nor.getY(k), nor.getZ(k)); U.push(uv.getX(k), uv.getY(k));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return g;
}
// y above which hair grows: forehead in front, above the ears on the sides, nape at the back
function hairline(x, z, front = 0.05, back = -0.062, ears = 0.012) {
  let th = lerp(back, front, smooth(0.0, 0.07, z));
  const side = smooth(0.045, 0.07, Math.abs(x)) * (1 - smooth(0.0, 0.045, Math.abs(z)));
  return lerp(th, Math.max(th, ears), side);
}

const PERSONS = [];

class Person {
  constructor(spec) {
    this.spec = spec;
    const T = charTextures();
    this.root = new THREE.Group();
    this.root.name = spec.name;
    const sheen = (color, tex) => new THREE.MeshPhysicalMaterial({ color, map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.92, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35) });
    const M = this.M = {
      skin: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: paintFace(spec), normalMap: T.skin.normal ? toTex(T.skin.normal, { srgb: false }) : null, normalScale: new THREE.Vector2(0.25, 0.25), roughness: 0.58, sheen: 0.3, sheenColor: new THREE.Color(0xffc8b0), clearcoat: 0.08 }),
      skinFlat: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(spec.skin).multiplyScalar(0.95), roughness: 0.6, sheen: 0.3, sheenColor: new THREE.Color(0xffc8b0) }),
      top: sheen(spec.top, T.knit),
      top2: sheen(new THREE.Color(spec.top).multiplyScalar(0.8), T.knit),
      pants: new THREE.MeshStandardMaterial({ color: spec.pants, map: T.denim.map, normalMap: T.denim.normalMap, roughness: 0.95 }),
      shoe: new THREE.MeshStandardMaterial({ color: spec.shoes, map: T.leather.map, normalMap: T.leather.normalMap, roughness: 0.55 }),
      sole: new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.7 }),
      hair: new THREE.MeshStandardMaterial({ color: spec.hair, map: T.hair.map, normalMap: T.hair.normalMap, roughness: 0.6, metalness: 0.05 }),
      brow: new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.hair).multiplyScalar(0.8), roughness: 0.9 }),
      eye: new THREE.MeshPhysicalMaterial({ color: 0xf4f1ec, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
      iris: new THREE.MeshPhysicalMaterial({ map: irisTexture(spec.eyes), roughness: 0.15, clearcoat: 1 }),
      lip: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(spec.skin).lerp(new THREE.Color(0xa0404a), 0.42), roughness: 0.4, clearcoat: 0.3 }),
      mouth: new THREE.MeshStandardMaterial({ color: 0x2a0d10, roughness: 0.9 }),
      teeth: new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.3 }),
      black: new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.35, metalness: 0.3 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xffc34a, roughness: 0.22, metalness: 1 }),
      accent: sheen(spec.accent || 0x222222, T.knit),
      cord: new THREE.MeshStandardMaterial({ color: 0xf0f0ea, roughness: 0.8 }),
    };
    this.j = {};
    this._build();
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // animation state
    this.state = spec.state || 'stand';
    this.cur = {}; this.tgt = {};
    this.t = Math.random() * 10;
    this.blinkT = rand(1, 4); this.blink = 0;
    this.talk = 0; this.talkUntil = 0;
    this.lookTarget = null; this.lookW = 0;
    this.emote = null; this.emoteUntil = 0;
    this.gazeYaw = 0; this.gazePitch = 0;
    PERSONS.push(this);
  }

  _build() {
    const s = this.spec, M = this.M, j = this.j;
    const G = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const add = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
    const cap = (r, l, seg = 16) => new THREE.CapsuleGeometry(r, l, 8, seg);
    const sc = s.build || 1; // width scale
    j.hips = G(this.root, 0, 0.94, 0);
    // pelvis / jeans seat
    const pel = add(j.hips, new THREE.SphereGeometry(0.13, 24, 18), M.pants, 0, -0.02, 0); pel.scale.set(1.18 * sc, 0.75, 0.92);
    add(j.hips, new THREE.CylinderGeometry(0.152 * sc, 0.152 * sc, 0.035, 28), new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.5 }), 0, 0.045, 0).scale.z = 0.72; // belt
    j.spine = G(j.hips, 0, 0.05, 0);
    j.chest = G(j.spine, 0, 0.2, 0);
    // torso (hoodie) as a lathe, flattened front-to-back
    const prof = [[0.0, -0.24], [0.155, -0.24], [0.162, -0.17], [0.158, -0.06], [0.172, 0.06], [0.178, 0.14], [0.16, 0.2], [0.11, 0.245], [0.06, 0.255], [0.0, 0.258]].map(([r, y]) => new THREE.Vector2(r * sc, y));
    const torso = add(j.chest, new THREE.LatheGeometry(prof, 32), M.top, 0, 0, 0); torso.scale.z = 0.66;
    // waistband + cuffs ribbing
    add(j.chest, new THREE.TorusGeometry(0.153 * sc, 0.016, 10, 36), M.top2, 0, -0.235, 0).rotation.x = Math.PI / 2;
    j.chest.children[j.chest.children.length - 1].scale.y = 0.66;
    // kangaroo pocket
    const pocket = add(j.chest, new RoundedBoxGeometry(0.2 * sc, 0.1, 0.02, 2, 0.008), M.top2, 0, -0.16, 0.1);
    pocket.rotation.x = -0.08;
    // hood bunched behind the neck
    const hood = add(j.chest, new THREE.TorusGeometry(0.085, 0.04, 12, 24, Math.PI * 1.3), M.top, 0, 0.235, -0.03);
    hood.rotation.set(Math.PI / 2 + 0.25, 0, Math.PI * 1.15 - Math.PI);
    hood.scale.set(1.15, 1.0, 0.9);
    // drawstrings
    for (const sx of [-0.035, 0.035]) {
      const str = add(j.chest, new THREE.CylinderGeometry(0.0035, 0.0035, 0.16, 6), M.cord, sx, 0.16, 0.112); str.rotation.x = 0.12;
      add(j.chest, new THREE.CylinderGeometry(0.005, 0.005, 0.02, 6), M.black, sx, 0.075, 0.122);
    }
    if (s.chain) {
      const ch = add(j.chest, new THREE.TorusGeometry(0.075, 0.006, 8, 40), M.gold, 0, 0.205, 0.045); ch.rotation.x = Math.PI / 2 - 0.5; ch.scale.y = 1.4;
      add(j.chest, new THREE.CylinderGeometry(0.02, 0.02, 0.005, 16), M.gold, 0, 0.13, 0.112).rotation.x = Math.PI / 2;
    }
    if (s.logo) {
      const cv = newCanvas(256, 128), c = cv.getContext('2d');
      c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 256, 128);
      c.fillStyle = s.logoColor || '#ffffff'; c.font = '900 64px Impact, sans-serif'; c.textAlign = 'center'; c.fillText(s.logo, 128, 84);
      const lm = new THREE.MeshStandardMaterial({ map: toTex(cv), transparent: true, roughness: 0.9, depthWrite: false });
      add(j.chest, new THREE.PlaneGeometry(0.16, 0.08), lm, 0, 0.06, 0.118 * 1);
    }
    // neck + head
    j.neck = G(j.chest, 0, 0.245, 0.0);
    add(j.neck, new THREE.CylinderGeometry(0.041, 0.046, 0.11, 20), M.skinFlat, 0, 0.045, 0.004);
    j.head = G(j.neck, 0, 0.1, 0.012);
    const H = j.head;
    j.headMesh = add(H, headGeometry(), M.skin, 0, 0.075, 0);
    const F = G(H, 0, 0.075, 0); // face frame at head center
    // ears
    for (const sx of [-1, 1]) {
      const ear = add(F, new THREE.SphereGeometry(0.02, 18, 14), M.skinFlat, sx * 0.077, 0.002, -0.008);
      ear.scale.set(0.42, 1.45, 1.05); ear.rotation.set(0, sx * 0.3, sx * -0.08);
      const inner = add(F, new THREE.SphereGeometry(0.009, 12, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(s.skin).multiplyScalar(0.62), roughness: 0.8 }), sx * 0.083, 0.0, -0.005);
      inner.scale.set(0.35, 1.3, 1);
    }
    // eyes in their sockets
    j.eyes = []; j.lidsU = []; j.brows = [];
    const ER = 0.0122;
    for (const sx of [-1, 1]) {
      const ex = sx * 0.031, ey = 0.011, ez = headSurfZ(ex, ey) - 0.0085;
      const eg = G(F, ex, ey, ez);
      add(eg, new THREE.SphereGeometry(ER, 24, 18), M.eye);
      add(eg, new THREE.CircleGeometry(0.0056, 28), M.iris, 0, 0, 0.0118);
      add(eg, new THREE.SphereGeometry(0.0011, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.0024, 0.0026, 0.0122);
      j.eyes.push(eg);
      const upper = G(F, ex, ey, ez);
      add(upper, new THREE.SphereGeometry(ER + 0.0007, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.46), M.skinFlat);
      const lash = add(upper, new THREE.TorusGeometry((ER + 0.0007) * Math.sin(Math.PI * 0.46), 0.0008, 4, 24, Math.PI), M.black, 0, (ER + 0.0007) * Math.cos(Math.PI * 0.46), 0);
      lash.rotation.x = Math.PI / 2;
      upper.rotation.x = -0.15;
      j.lidsU.push(upper);
      const lower = G(F, ex, ey, ez);
      add(lower, new THREE.SphereGeometry(ER + 0.0006, 24, 8, 0, Math.PI * 2, Math.PI * 0.7, Math.PI * 0.3), M.skinFlat);
      // eyebrow: a tube following the brow ridge
      const pts = [[0.011, 0.03], [0.023, 0.0355], [0.037, 0.035], [0.048, 0.03]].map(([x, y]) => new THREE.Vector3(sx * x, y, headSurfZ(sx * x, y) + 0.0016));
      const brow = G(F, 0, 0, 0);
      const bm = add(brow, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0021, 6), M.brow);
      bm.scale.z = 1;
      j.brows.push(brow);
    }
    // mouth: an opening that animates, teeth, and a lower lip that drops when talking
    const mz = headSurfZ(0, -0.0445);
    j.mouth = G(F, 0, -0.0445, mz);
    j.inner = add(j.mouth, new THREE.SphereGeometry(0.0112, 18, 12), M.mouth, 0, 0, -0.0035); j.inner.scale.set(1.3, 0.06, 0.45);
    j.teeth = add(j.mouth, new THREE.BoxGeometry(0.019, 0.004, 0.003), M.teeth, 0, 0.0022, -0.0022); j.teeth.visible = false;
    j.lowLip = G(j.mouth, 0, -0.0055, headSurfZ(0, -0.05) - mz - 0.0012);
    const ll = add(j.lowLip, new THREE.CapsuleGeometry(0.0042, 0.02, 6, 12), M.lip); ll.rotation.z = Math.PI / 2; ll.scale.set(1, 1, 0.7);
    j.lowLip.visible = false;
    // hair / headwear
    this._hair(F);
    if (s.glasses) {
      const gm = M.black;
      const gz = headSurfZ(0.031, 0.011) + 0.012;
      for (const sx of [-1, 1]) {
        const rim = add(F, new THREE.TorusGeometry(0.0165, 0.0019, 6, 32), gm, sx * 0.031, 0.011, gz); rim.scale.y = 0.8;
        const lens = add(F, new THREE.CircleGeometry(0.0158, 24), new THREE.MeshPhysicalMaterial({ color: 0xaac4dd, transparent: true, opacity: 0.16, roughness: 0.02, clearcoat: 1, depthWrite: false }), sx * 0.031, 0.011, gz); lens.scale.y = 0.8;
        const temple = add(F, new THREE.BoxGeometry(0.0025, 0.0025, 0.085), gm, sx * 0.0485, 0.014, gz - 0.043); temple.rotation.y = sx * 0.22;
      }
      add(F, new THREE.BoxGeometry(0.012, 0.0025, 0.0025), gm, 0, 0.015, gz + 0.001);
    }
    if (s.headphones) {
      const band = add(F, new THREE.TorusGeometry(0.128, 0.008, 8, 40, Math.PI), M.black, 0, 0.0, -0.01);
      band.scale.x = 0.72;
      for (const sx of [-1, 1]) {
        const cup = add(F, new THREE.CylinderGeometry(0.033, 0.033, 0.026, 24), M.black, sx * 0.09, 0.0, -0.008); cup.rotation.z = Math.PI / 2;
        const glow = add(F, new THREE.TorusGeometry(0.027, 0.004, 8, 24), new THREE.MeshStandardMaterial({ color: s.accent || 0x38e08c, emissive: s.accent || 0x38e08c, emissiveIntensity: 0.8 }), sx * 0.104, 0, -0.008);
        glow.rotation.y = Math.PI / 2;
      }
    }

    // arms
    const armSide = (sx) => {
      const sh = G(j.chest, sx * 0.175 * sc, 0.19, 0.0);
      const shoulderBall = add(sh, new THREE.SphereGeometry(0.062, 18, 14), M.top, 0, -0.01, 0);
      shoulderBall.scale.set(1, 0.9, 0.9);
      const upper = add(sh, cap(0.054, 0.2), M.top, 0, -0.13, 0);
      const el = G(sh, 0, -0.27, 0);
      add(el, new THREE.SphereGeometry(0.05, 14, 10), M.top, 0, 0, 0);
      add(el, cap(0.048, 0.17), M.top, 0, -0.11, 0);
      const cuff = add(el, new THREE.CylinderGeometry(0.04, 0.042, 0.045, 18), M.top2, 0, -0.215, 0);
      const wr = G(el, 0, -0.245, 0);
      add(wr, new THREE.CylinderGeometry(0.026, 0.03, 0.03, 14), M.skinFlat, 0, 0.005, 0);
      // hand
      const hand = G(wr, 0, -0.015, 0);
      const palm = add(hand, new RoundedBoxGeometry(0.075, 0.085, 0.03, 3, 0.013), M.skinFlat, 0, -0.04, 0.0);
      palm.rotation.y = sx * 0.0;
      const fingers = [];
      for (let i = 0; i < 4; i++) {
        const fx = (i - 1.5) * 0.0175;
        const f = G(hand, fx, -0.08, 0.0);
        const len = [0.046, 0.054, 0.05, 0.04][i];
        add(f, cap(0.0078, len * 0.5, 8), M.skinFlat, 0, -len * 0.25, 0);
        const f2 = G(f, 0, -len * 0.5, 0);
        add(f2, cap(0.0072, len * 0.38, 8), M.skinFlat, 0, -len * 0.2, 0);
        fingers.push([f, f2]);
      }
      const th = G(hand, sx * -0.034, -0.03, 0.012);
      add(th, cap(0.0095, 0.03, 8), M.skinFlat, 0, -0.022, 0);
      th.rotation.z = sx * -0.6; th.rotation.y = sx * 0.6;
      if (s.watch && sx < 0) add(wr, new THREE.CylinderGeometry(0.032, 0.032, 0.018, 18), M.gold, 0, 0.01, 0);
      return { sh, el, wr, hand, fingers, thumb: th };
    };
    // character's left is +x (facing +z)
    j.L = armSide(1); j.R = armSide(-1);
    // legs
    const legSide = (sx) => {
      const hip = G(j.hips, sx * 0.09 * sc, -0.03, 0);
      add(hip, cap(0.075, 0.3), M.pants, 0, -0.2, 0);
      const kn = G(hip, 0, -0.43, 0);
      add(kn, new THREE.SphereGeometry(0.062, 14, 10), M.pants, 0, 0, 0);
      add(kn, cap(0.058, 0.32), M.pants, 0, -0.2, 0);
      const hem = add(kn, new THREE.CylinderGeometry(0.06, 0.064, 0.04, 18), M.pants, 0, -0.375, 0);
      const an = G(kn, 0, -0.42, 0);
      // sneaker
      const shoe = add(an, new THREE.SphereGeometry(0.06, 20, 14), M.shoe, 0, -0.035, 0.045); shoe.scale.set(0.95, 0.68, 2.05);
      const sole = add(an, new RoundedBoxGeometry(0.11, 0.03, 0.27, 2, 0.012), M.sole, 0, -0.072, 0.045);
      const tongue = add(an, new THREE.SphereGeometry(0.03, 12, 8), M.sole, 0, -0.005, 0.07); tongue.scale.set(1, 0.6, 1.4);
      return { hip, kn, an };
    };
    j.LL = legSide(1); j.RL = legSide(-1);
    if (s.phone) {
      const ph = new THREE.Group();
      add(ph, new RoundedBoxGeometry(0.075, 0.155, 0.009, 2, 0.008), M.black);
      const scr = add(ph, new THREE.PlaneGeometry(0.068, 0.145), new THREE.MeshBasicMaterial({ color: 0x9fd7ff, toneMapped: false }), 0, 0, -0.0048);
      scr.rotation.y = Math.PI;
      ph.position.set(0, -0.07, 0.03); ph.rotation.set(0, 0, 0);
      j.R.hand.add(ph); this.phoneMesh = ph;
      ph.visible = false;
    }
    if (s.cash) {
      const cs = new THREE.Group();
      const bill = new THREE.MeshStandardMaterial({ color: 0x8fbf7a, roughness: 0.8 });
      for (let i = 0; i < 6; i++) add(cs, new THREE.BoxGeometry(0.07, 0.003, 0.155), bill, 0, i * 0.0035, 0);
      cs.position.set(0, -0.08, 0.04); cs.rotation.x = Math.PI / 2;
      j.L.hand.add(cs); this.cashMesh = cs; cs.visible = false;
    }
  }

  _hair(F) {
    const s = this.spec, M = this.M;
    const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); F.add(m); return m; };
    const hm = M.hair.clone(); hm.side = THREE.DoubleSide;
    const style = s.hairStyle;
    const hatOn = !!s.hat;
    if (style === 'short' || style === 'messy' || style === 'buzz') {
      const thick = style === 'buzz' ? () => 0.0022 : style === 'messy' ? (x, y) => 0.006 + 0.016 * smooth(-0.02, 0.1, y) : (x, y) => 0.004 + 0.011 * smooth(-0.02, 0.1, y);
      const keep = (x, y, z) => y > hairline(x, z, style === 'buzz' ? 0.056 : 0.05) || (Math.abs(x) > 0.064 && z > 0.0 && z < 0.034 && y > -0.016);
      add(headShell(keep, thick), hm);
      if (style !== 'buzz' && !hatOn) {
        // fringe tufts break up the hairline silhouette
        const rnd = mulberry32(hashStr(s.name));
        for (let i = 0; i < (style === 'messy' ? 16 : 9); i++) {
          const x = (rnd() - 0.5) * 0.1, y = 0.052 + rnd() * 0.02;
          const z = headSurfZ(x, y) + 0.004;
          const t = add(new THREE.ConeGeometry(0.011, 0.04, 7), hm, x, y + 0.006, z);
          t.rotation.set(2.3 + rnd() * 0.4, 0, (rnd() - 0.5) * 0.8);
        }
      }
    } else if (style === 'curly') {
      const keep = (x, y, z) => y > hairline(x, z, 0.054, -0.05, 0.02);
      add(headShell(keep, 0.008), hm);
      const rnd = mulberry32(hashStr(s.name));
      const n = 170, geo = new THREE.SphereGeometry(0.019, 10, 8);
      const inst = new THREE.InstancedMesh(geo, M.hair, n);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
      const hp = headGeometry().attributes.position, hn = headGeometry().attributes.normal;
      let k = 0, tries = 0;
      while (k < n && tries < 20000) {
        tries++;
        const vi = Math.floor(rnd() * hp.count);
        const x = hp.getX(vi), y = hp.getY(vi), z = hp.getZ(vi);
        if (!(y > hairline(x, z, 0.06, -0.04, 0.03))) continue;
        const o = 0.012 + rnd() * 0.012;
        p.set(x + hn.getX(vi) * o, y + hn.getY(vi) * o, z + hn.getZ(vi) * o);
        const s0 = 0.75 + rnd() * 0.6; sc.set(s0, s0, s0);
        q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
        m4.compose(p, q, sc); inst.setMatrixAt(k++, m4);
      }
      inst.count = k;
      F.add(inst);
    }
    if (s.hat === 'beanie') {
      const bm = new THREE.MeshPhysicalMaterial({ color: s.hatColor, map: charTextures().knit.map, normalMap: charTextures().knit.normalMap, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(s.hatColor).lerp(new THREE.Color(0xffffff), 0.3), side: THREE.DoubleSide });
      const hl = (x, z) => lerp(-0.004, 0.06, smooth(0.0, 0.07, z));
      add(headShell((x, y, z) => y > hl(x, z), (x, y) => 0.016 + 0.01 * smooth(0.04, 0.11, y)), bm);
      add(headShell((x, y, z) => y > hl(x, z) - 0.002 && y < hl(x, z) + 0.026, 0.022), bm);
    }
    if (s.hat === 'cap') {
      const cm = new THREE.MeshStandardMaterial({ color: s.hatColor, map: charTextures().weave.map, normalMap: charTextures().weave.normalMap, roughness: 0.85, side: THREE.DoubleSide });
      const hl = (x, z) => lerp(0.018, 0.058, smooth(0.0, 0.07, z));
      add(headShell((x, y, z) => y > hl(x, z), 0.019), cm);
      // brim worn backwards
      const brim = add(new THREE.CylinderGeometry(0.068, 0.068, 0.005, 32, 1, false, Math.PI / 2, Math.PI), cm, 0, 0.03, -0.075);
      brim.rotation.x = 0.12; brim.scale.set(0.95, 1, 1);
      add(new THREE.SphereGeometry(0.008, 10, 8), cm, 0, 0.136, -0.004);
    }
    if (s.beard) {
      const keep = (x, y, z) => z > -0.022 && y > -0.135 && (y < -0.028 || (Math.abs(x) > 0.05 && y < 0.004 && z < 0.06)) && !(Math.abs(x) < 0.023 && y > -0.058 && y < -0.034);
      add(headShell(keep, (x, y) => 0.0035 + 0.004 * smooth(-0.04, -0.12, y)), hm);
    }
  }

  // ---------- posing ----------
  static POSES = {
    stand: { hipsY: 0.94, hipsRx: 0, spine: 0.02, chest: 0, neck: 0, headX: 0, L: [0.05, 0, 0.12, -0.15], R: [0.05, 0, -0.12, -0.15], LL: [0, 0, 0.02, 0], RL: [0, 0, -0.02, 0], curl: 0.35 },
    sit: { hipsY: 0.52, hipsRx: 0.06, spine: -0.04, chest: 0.0, neck: 0, headX: 0.05, L: [-0.25, 0, 0.18, -0.5], R: [-0.25, 0, -0.18, -0.5], LL: [-1.5, 0.12, 0.08, 1.45], RL: [-1.5, -0.12, -0.08, 1.45], curl: 0.5 },
    type: { hipsY: 0.52, hipsRx: 0.08, spine: 0.12, chest: 0.06, neck: 0.04, headX: 0.12, L: [-0.55, 0.15, 0.1, -1.1], R: [-0.55, -0.15, -0.1, -1.1], LL: [-1.5, 0.1, 0.06, 1.5], RL: [-1.5, -0.1, -0.06, 1.5], curl: 0.25 },
    couch: { hipsY: 0.47, hipsRx: -0.18, spine: -0.15, chest: -0.05, neck: 0.15, headX: 0.12, L: [-0.15, 0, 0.35, -0.6], R: [-0.15, 0, -0.35, -0.6], LL: [-1.3, 0.18, 0.1, 1.2], RL: [-1.3, -0.2, -0.1, 1.25], curl: 0.4 },
    phone: { hipsY: 0.94, hipsRx: 0, spine: 0.05, chest: 0.05, neck: 0.25, headX: 0.25, L: [0.05, 0, 0.12, -0.25], R: [-0.65, -0.1, -0.12, -1.75], LL: [0, 0, 0.03, 0.02], RL: [0.05, 0, -0.04, 0.05], curl: 0.6 },
    count: { hipsY: 0.94, hipsRx: 0, spine: 0.06, chest: 0.04, neck: 0.25, headX: 0.25, L: [-0.55, 0.2, 0.1, -1.3], R: [-0.55, -0.2, -0.1, -1.25], LL: [0, 0, 0.04, 0], RL: [0, 0, -0.04, 0], curl: 0.5 },
    cross: { hipsY: 0.94, hipsRx: 0, spine: 0, chest: 0, neck: 0, headX: 0, L: [-0.35, 0.5, 0.1, -1.9], R: [-0.3, -0.5, -0.1, -1.9], LL: [0, 0, 0.05, 0], RL: [0, 0, -0.05, 0], curl: 0.6 },
  };
  setState(s) { this.state = s; }
  say(ms = 2500) { this.talkUntil = performance.now() + ms; }
  doEmote(kind, ms = 2500) { this.emote = kind; this.emoteUntil = performance.now() + ms; }

  update(dt, camPos) {
    this.t += dt;
    const t = this.t, j = this.j, now = performance.now();
    let P = { ...Person.POSES[this.state] || Person.POSES.stand };
    P.L = [...P.L]; P.R = [...P.R]; P.LL = [...P.LL]; P.RL = [...P.RL];
    const seated = this.state === 'sit' || this.state === 'type' || this.state === 'couch';
    if (this.emote && now > this.emoteUntil) this.emote = null;
    const talking = now < this.talkUntil;
    // emotes override arms
    if (this.emote === 'cheer') { P.L = [-0.4, 0, 2.6 + Math.sin(t * 10) * 0.15, -0.4]; P.R = [-0.4, 0, -2.6 - Math.sin(t * 10) * 0.15, -0.4]; P.headX = -0.2; P.curl = 0.9; }
    if (this.emote === 'facepalm') { P.R = [-1.25, -0.5, -0.1, -2.25]; P.headX = 0.35; P.neck = 0.2; }
    if (this.emote === 'shrug') { P.L = [-0.2, 0.4, 0.5, -1.4]; P.R = [-0.2, -0.4, -0.5, -1.4]; P.headX = -0.05; }
    if (this.emote === 'point') { P.R = [-1.45, -0.2, -0.1, -0.1]; P.curl = 0.9; }
    // talking gestures
    if (talking && !this.emote && !seated && this.state !== 'phone' && this.state !== 'count') {
      P.L = [-0.3 + Math.sin(t * 2.3) * 0.15, 0.1, 0.18, -0.9 + Math.sin(t * 3.1) * 0.25];
      P.R = [-0.35 + Math.sin(t * 2.7 + 1) * 0.2, -0.1, -0.18, -1.0 + Math.sin(t * 2.2) * 0.3];
    }
    const rate = 7;
    const d = (k, v) => (this.cur[k] = damp(this.cur[k] ?? v, v, rate, dt));
    // breathing / idle sway
    const breathe = Math.sin(t * 1.6) * 0.5 + 0.5;
    const sway = seated ? 0 : Math.sin(t * 0.55) * 0.025;
    j.hips.position.y = d('hipsY', P.hipsY) + (this.emote === 'cheer' ? Math.abs(Math.sin(t * 10)) * 0.05 : 0);
    j.hips.rotation.x = d('hipsRx', P.hipsRx);
    j.hips.rotation.z = sway;
    j.spine.rotation.x = d('spine', P.spine) + breathe * 0.012;
    j.chest.rotation.x = d('chest', P.chest);
    j.chest.scale.set(1 + breathe * 0.012, 1, 1 + breathe * 0.02);
    j.neck.rotation.x = d('neck', P.neck);
    // head look-at
    let yaw = 0, pitch = 0;
    if (this.lookTarget) {
      const hp = new THREE.Vector3(); j.neck.getWorldPosition(hp);
      const local = this.lookTarget.clone().sub(hp);
      const ry = this.root.rotation.y;
      const lx = Math.cos(ry) * local.x - Math.sin(ry) * local.z;
      const lz = Math.sin(ry) * local.x + Math.cos(ry) * local.z;
      yaw = Math.atan2(lx, lz);
      pitch = -Math.atan2(local.y - 0.1, Math.hypot(lx, lz));
      if (Math.abs(yaw) > 1.9) { yaw = 0; pitch = 0; }
    }
    const idleYaw = Math.sin(t * 0.37) * 0.15 + Math.sin(t * 0.13) * 0.1;
    const wantYaw = this.lookTarget ? clamp(yaw, -1.05, 1.05) : idleYaw;
    const wantPitch = this.lookTarget ? clamp(pitch, -0.4, 0.45) : 0;
    j.head.rotation.y = d('headY', wantYaw * 0.8);
    j.neck.rotation.y = d('neckY', wantYaw * 0.2);
    j.head.rotation.x = d('headX', P.headX + wantPitch * 0.7 + (talking ? Math.sin(t * 7) * 0.03 : 0));
    j.head.rotation.z = d('headZ', talking ? Math.sin(t * 1.7) * 0.06 : Math.sin(t * 0.4) * 0.03);
    // eyes: track a bit beyond the head + saccades
    if (Math.random() < dt * 0.8) { this.gazeYaw = (Math.random() - 0.5) * 0.25; this.gazePitch = (Math.random() - 0.5) * 0.12; }
    const ey = clamp((this.lookTarget ? (yaw - j.head.rotation.y - j.neck.rotation.y) : 0) + this.gazeYaw, -0.45, 0.45);
    const ep = clamp((this.lookTarget ? (pitch - j.head.rotation.x * 0.5) * 0.5 : 0) + this.gazePitch, -0.3, 0.3);
    for (const e of j.eyes) { e.rotation.y = damp(e.rotation.y, ey, 18, dt); e.rotation.x = damp(e.rotation.x, ep, 18, dt); }
    // blink
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 1; this.blinkT = rand(2, 5.5); }
    this.blink = Math.max(0, this.blink - dt * 7);
    const lidOpen = -0.15 + (this.emote === 'facepalm' ? 0.4 : 0) + ep * 0.6;
    for (const l of j.lidsU) l.rotation.x = lerp(lidOpen, 1.05, Math.sin(this.blink * Math.PI));
    // brows
    const browUp = (talking ? Math.max(0, Math.sin(t * 3.3)) * 0.006 : 0) + (this.emote === 'cheer' ? 0.008 : 0) - (this.emote === 'facepalm' ? 0.004 : 0);
    j.brows.forEach((b) => { b.position.y = damp(b.position.y, browUp, 12, dt); });
    // mouth
    const open = talking ? clamp(0.25 + Math.sin(t * 17) * 0.35 + Math.sin(t * 9.3) * 0.25, 0, 1) : (this.emote === 'cheer' ? 0.9 : 0);
    const o = (this.cur.mouth = damp(this.cur.mouth ?? 0, open, 22, dt));
    j.lowLip.visible = o > 0.12;
    j.lowLip.position.y = -0.0055 - o * 0.007;
    j.inner.scale.y = 0.06 + o * 0.85; j.inner.position.y = -o * 0.0035;
    j.teeth.visible = o > 0.3;
    // arms
    const arm = (side, key, a, typing) => {
      side.sh.rotation.x = d(key + 'sx', a[0]); side.sh.rotation.y = d(key + 'sy', a[1]); side.sh.rotation.z = d(key + 'sz', a[2]);
      side.el.rotation.x = d(key + 'e', a[3]);
      if (typing) { side.wr.rotation.x = 0.15 + Math.sin(t * 13 + (key === 'L' ? 0 : 2)) * 0.12; side.el.rotation.x += Math.sin(t * 11 + (key === 'L' ? 1 : 0)) * 0.04; }
      else side.wr.rotation.x = damp(side.wr.rotation.x, this.state === 'phone' && key === 'R' ? 0.4 : 0, 8, dt);
      const curl = d(key + 'c', P.curl + (this.state === 'count' ? Math.sin(t * 9 + (key === 'L' ? 0 : 1.3)) * 0.25 : 0));
      side.fingers.forEach(([f1, f2], i) => { f1.rotation.x = curl * (0.9 + i * 0.05) + (typing ? Math.max(0, Math.sin(t * 14 + i * 1.7 + (key === 'L' ? 0 : 3))) * 0.35 : 0); f2.rotation.x = curl * 1.1; });
    };
    arm(j.L, 'L', P.L, this.state === 'type');
    arm(j.R, 'R', P.R, this.state === 'type');
    if (this.phoneMesh) this.phoneMesh.visible = this.state === 'phone';
    if (this.cashMesh) this.cashMesh.visible = this.state === 'count';
    // legs
    const leg = (side, key, a) => { side.hip.rotation.x = d(key + 'hx', a[0]); side.hip.rotation.y = d(key + 'hy', a[1]); side.hip.rotation.z = d(key + 'hz', a[2]); side.kn.rotation.x = d(key + 'k', a[3]); side.an.rotation.x = d(key + 'a', seated ? 0.05 : -a[0] - a[3] * 0.0); };
    leg(j.LL, 'LL', P.LL); leg(j.RL, 'RL', P.RL);
    // tapping foot when seated and idle
    if (seated && !talking) j.RL.an.rotation.x = 0.05 + Math.max(0, Math.sin(t * 6)) * 0.15;
  }
}

// ---------- the crew ----------
const CREW_SPECS = {
  chad: { name: 'Chad', role: 'Hype man', skin: 0xe2b08f, hair: 0x5a3a22, hairStyle: 'short', eyes: 0x3d6b4a, top: 0xc3283e, accent: 0xffc34a, pants: 0x3a4f75, shoes: 0xf4f4f0, hat: 'cap', hatColor: 0x1d1d22, chain: true, stubble: true, phone: true, logo: 'SEND IT', logoColor: '#ffe9a8', build: 1.06 },
  kev: { name: 'Kev', role: 'Coder', skin: 0xb98563, hair: 0x1a1412, hairStyle: 'curly', eyes: 0x3b2516, top: 0x3c4148, accent: 0x38e08c, pants: 0x262a33, shoes: 0x2b2b2b, glasses: true, headphones: true, build: 0.95 },
  mo: { name: 'Mo', role: 'Community manager', skin: 0x8a5a3c, hair: 0x120d0b, hairStyle: 'buzz', eyes: 0x24160e, top: 0x1f3b2e, accent: 0x9ad18b, pants: 0x4a4038, shoes: 0x6b4a32, beard: true, cash: true, watch: true, build: 1.0 },
};

// Procedural car meshes from side-profile silhouettes, with every visual upgrade (paint finish, rims,
// rim size, tint, spoilers, hoods, blower, underglow). Front of the car faces +Z.
import * as THREE from 'three';
import { CARS } from '../config.js';
import { mergeGeos } from '../util.js';
import * as T from '../engine/textures.js';

// Upper outline from rear-bottom over the roofline to front-bottom: [x as fraction of length, y metres]
const BODIES = {
  muscle: { L: 5.0, W: 1.95, R: 0.36, wb: [-1.52, 1.5], tw: 0.3, ride: 0.18,
    upper: [[-0.5, 0.34], [-0.5, 0.86], [-0.488, 0.97], [-0.3, 1.0], [-0.2, 1.0], [0.12, 0.99], [0.44, 0.94], [0.5, 0.86], [0.5, 0.44], [0.49, 0.32]],
    gh: [0.985, 1.37, -0.29, -0.13, 0.04, 0.16], doors: 2 },
  charger: { L: 5.05, W: 1.92, R: 0.36, wb: [-1.5, 1.55], tw: 0.28, ride: 0.18,
    upper: [[-0.5, 0.36], [-0.5, 0.86], [-0.48, 0.96], [-0.33, 0.99], [0.15, 0.99], [0.45, 0.93], [0.5, 0.84], [0.5, 0.44], [0.49, 0.33]],
    gh: [0.98, 1.43, -0.33, -0.17, 0.07, 0.19], doors: 4 },
  sedan: { L: 4.95, W: 1.88, R: 0.34, wb: [-1.45, 1.45], tw: 0.25, ride: 0.17,
    upper: [[-0.5, 0.37], [-0.5, 0.82], [-0.47, 0.93], [-0.34, 0.95], [0.15, 0.95], [0.45, 0.86], [0.5, 0.76], [0.5, 0.42], [0.49, 0.33]],
    gh: [0.94, 1.43, -0.34, -0.18, 0.08, 0.21], doors: 4 },
  suv: { L: 4.85, W: 2.0, R: 0.4, wb: [-1.45, 1.45], tw: 0.29, ride: 0.28,
    upper: [[-0.5, 0.48], [-0.5, 1.08], [-0.48, 1.17], [0.12, 1.17], [0.44, 1.08], [0.5, 0.96], [0.5, 0.52], [0.49, 0.44]],
    gh: [1.16, 1.75, -0.475, -0.445, 0.07, 0.24], doors: 4 },
  hatch: { L: 4.35, W: 1.8, R: 0.32, wb: [-1.3, 1.35], tw: 0.23, ride: 0.16,
    upper: [[-0.5, 0.37], [-0.5, 0.92], [-0.47, 0.99], [0.1, 0.99], [0.44, 0.87], [0.5, 0.74], [0.5, 0.42], [0.49, 0.33]],
    gh: [0.98, 1.45, -0.47, -0.4, 0.03, 0.2], doors: 4 },
  sport: { L: 4.7, W: 1.96, R: 0.35, wb: [-1.38, 1.42], tw: 0.3, ride: 0.13,
    upper: [[-0.5, 0.33], [-0.5, 0.82], [-0.47, 0.9], [-0.25, 0.92], [0.14, 0.9], [0.46, 0.74], [0.5, 0.62], [0.5, 0.36], [0.49, 0.27]],
    gh: [0.89, 1.3, -0.37, -0.14, 0.02, 0.2], doors: 2 },
  donk: { L: 5.45, W: 2.0, R: 0.36, wb: [-1.55, 1.58], tw: 0.27, ride: 0.2,
    upper: [[-0.5, 0.42], [-0.5, 0.94], [-0.48, 1.0], [-0.29, 1.0], [0.18, 1.0], [0.47, 0.98], [0.5, 0.92], [0.5, 0.45], [0.49, 0.38]],
    gh: [0.99, 1.5, -0.27, -0.18, 0.08, 0.16], doors: 4 },
  truck: { L: 5.6, W: 2.0, R: 0.42, wb: [-1.8, 1.7], tw: 0.29, ride: 0.3,
    upper: [[-0.5, 0.5], [-0.5, 1.14], [0.16, 1.14], [0.45, 1.1], [0.5, 1.0], [0.5, 0.52], [0.49, 0.46]],
    gh: [1.13, 1.88, -0.06, -0.05, 0.12, 0.25], doors: 4, bed: [-0.49, -0.075] },
};
export const BODY_DIMS = BODIES;

const RIM_SCALE = [1.0, 1.05, 1.13, 1.45];
const RIM_FRAC = [0.62, 0.7, 0.78, 0.86];

// ---------------------------------------------------------------- shared materials
const shared = {};
function sm(key, make) {
  return shared[key] || (shared[key] = make());
}
const TIRE = () => sm('tire', () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.88 }));
const TRIM = () => sm('trim', () => new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.55, metalness: 0.2 }));
const CHROME = () => sm('chrome', () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.04, metalness: 1 }));
const DARK = () => sm('dark', () => new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 }));
const CARBON = () => sm('carbon', () => new THREE.MeshPhysicalMaterial({ color: 0x1a1b1e, roughness: 0.35, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }));
const UNDER = () => sm('under', () => new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 }));
const GLASS = (tint) =>
  sm('glass' + tint, () => new THREE.MeshPhysicalMaterial({ color: [0x3a4a55, 0x1e2a32, 0x10161b, 0x050607][tint] ?? 0x1e2a32, roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }));
const RIM_MATS = {
  chrome: () => CHROME(),
  black: () => sm('rimBlack', () => new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.35, metalness: 0.6 })),
  gunmetal: () => sm('rimGun', () => new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.28, metalness: 0.9 })),
  silver: () => sm('rimSilver', () => new THREE.MeshStandardMaterial({ color: 0xc4c8cc, roughness: 0.22, metalness: 0.95 })),
  gold: () => sm('rimGold', () => new THREE.MeshStandardMaterial({ color: 0xd4a83a, roughness: 0.18, metalness: 1 })),
};
const CALIPER = (red) => sm('cal' + red, () => new THREE.MeshStandardMaterial({ color: red ? 0xd0101a : 0x3a3a3a, roughness: 0.4, metalness: 0.3 }));
const POLICE_DOOR = () =>
  sm('policeDoor', () => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f4f4';
    x.fillRect(0, 0, 512, 128);
    x.fillStyle = '#16307a';
    x.font = 'bold 74px Impact, "Arial Black", sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('POLICE', 256, 66);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 });
  });

export function paintMaterial(color, finish) {
  const c = new THREE.Color(color);
  const o = { color: c };
  switch (finish) {
    case 'metallic':
      Object.assign(o, { metalness: 0.65, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 });
      break;
    case 'matte':
      Object.assign(o, { metalness: 0.05, roughness: 0.78, clearcoat: 0 });
      break;
    case 'pearl':
      Object.assign(o, { metalness: 0.35, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.8, iridescenceIOR: 1.5, iridescenceThicknessRange: [200, 600] });
      break;
    case 'chrome':
      Object.assign(o, { metalness: 1, roughness: 0.07, clearcoat: 0.5, clearcoatRoughness: 0.02 });
      break;
    default:
      Object.assign(o, { metalness: 0.0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03 });
  }
  return new THREE.MeshPhysicalMaterial(o);
}

// ---------------------------------------------------------------- geometry
const geoCache = new Map();
function cg(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

/** Convert an XY side-profile shape into an extruded body centred on the car (front = +Z). */
function extrudeProfile(shape, width, bevel = 0.06, segs = 3) {
  const depth = Math.max(0.05, width - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: segs, curveSegments: 14 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function bodyShape(B) {
  const L = B.L;
  const s = new THREE.Shape();
  const up = B.upper;
  s.moveTo(up[0][0] * L, up[0][1]);
  for (let i = 1; i < up.length; i++) s.lineTo(up[i][0] * L, up[i][1]);
  // bottom edge from front to rear with wheel arches
  const yF = up[up.length - 1][1], yR = up[0][1];
  const r = B.R + 0.075;
  const wheelsZ = [B.wb[1], B.wb[0]]; // front first (we're travelling rearward)
  for (const wx of wheelsZ) {
    const yb = yR + ((yF - yR) * (wx / L + 0.5));
    const a0 = Math.asin(Math.max(-1, Math.min(1, (yb - B.R) / r)));
    s.lineTo(wx + r * Math.cos(a0), yb);
    s.absarc(wx, B.R, r, a0, Math.PI - a0, false);
  }
  s.lineTo(up[0][0] * L, yR);
  return s;
}

function profileY(B, frac) {
  // top surface height at a length fraction (searching the upper outline between rear and front)
  const up = B.upper;
  for (let i = 0; i < up.length - 1; i++) {
    const [x0, y0] = up[i], [x1, y1] = up[i + 1];
    if (x1 > x0 && frac >= x0 && frac <= x1) return y0 + ((y1 - y0) * (frac - x0)) / (x1 - x0);
  }
  return up[Math.floor(up.length / 2)][1];
}

function bodyGeometry(bodyId) {
  return cg('body_' + bodyId, () => {
    const B = BODIES[bodyId];
    return extrudeProfile(bodyShape(B), B.W, 0.07);
  });
}

function greenhouseGeometry(bodyId) {
  return cg('gh_' + bodyId, () => {
    const B = BODIES[bodyId];
    const [y0, y1, r0, r1, f1, f0] = B.gh;
    const L = B.L;
    const s = new THREE.Shape();
    s.moveTo(r0 * L, y0);
    s.lineTo(r1 * L, y1);
    s.lineTo(f1 * L, y1);
    s.lineTo(f0 * L, y0);
    s.lineTo(r0 * L, y0);
    return extrudeProfile(s, B.W * 0.84, 0.05, 2);
  });
}

function roofGeometry(bodyId) {
  return cg('roof_' + bodyId, () => {
    const B = BODIES[bodyId];
    const [y0, y1, r0, r1, f1, f0] = B.gh;
    const L = B.L;
    const t = 0.06;
    // interpolate the pillars a little below the top for a roof skin
    const k = t / (y1 - y0);
    const s = new THREE.Shape();
    s.moveTo((r1 + (r0 - r1) * k) * L - 0.02, y1 - t);
    s.lineTo(r1 * L - 0.01, y1 + 0.012);
    s.lineTo(f1 * L + 0.01, y1 + 0.012);
    s.lineTo((f1 + (f0 - f1) * k) * L + 0.02, y1 - t);
    return extrudeProfile(s, B.W * 0.86, 0.04, 2);
  });
}

function pillarGeometry(bodyId) {
  return cg('pillar_' + bodyId, () => {
    const B = BODIES[bodyId];
    const [y0, y1, r0, r1, f1, f0] = B.gh;
    const L = B.L;
    const parts = [];
    const w = B.W * 0.86;
    const mid = ((r0 + r1) / 2 + (f0 + f1) / 2) / 2;
    // B pillar
    parts.push(new THREE.BoxGeometry(w, y1 - y0, 0.09).translate(0, (y0 + y1) / 2, mid * L));
    if (B.doors === 4) parts.push(new THREE.BoxGeometry(w, y1 - y0, 0.07).translate(0, (y0 + y1) / 2, (mid * 0.5 + r0 * 0.25 + r1 * 0.25) * L));
    // A pillars (along windshield edges)
    for (const sx of [-1, 1]) {
      const ax = (f0 * L + f1 * L) / 2, ay = (y0 + y1) / 2;
      const len = Math.hypot((f0 - f1) * L, y1 - y0);
      const ang = Math.atan2(y1 - y0, (f0 - f1) * L);
      const p = new THREE.BoxGeometry(0.07, len, 0.07);
      p.rotateX(ang - Math.PI / 2);
      p.translate(sx * w * 0.47, ay, ax);
      parts.push(p);
      const cx = (r0 * L + r1 * L) / 2;
      const clen = Math.hypot((r1 - r0) * L, y1 - y0);
      const cang = Math.atan2(y1 - y0, (r1 - r0) * L);
      const c = new THREE.BoxGeometry(0.07, clen, 0.1);
      c.rotateX(-(cang - Math.PI / 2));
      c.translate(sx * w * 0.47, ay, cx);
      parts.push(c);
    }
    return mergeGeos(parts, { uv: true });
  });
}

/** Wheel: tyre + rim face + barrel. Outer face toward +X. */
function wheelGeometry(r, width, style, frac) {
  return cg(`wheel_${r.toFixed(3)}_${width}_${style}_${frac}`, () => {
    const ri = r * frac;
    const hw = width / 2;
    const tire = new THREE.LatheGeometry(
      [[ri * 0.98, -hw], [r * 0.93, -hw], [r * 0.99, -hw * 0.75], [r, -hw * 0.4], [r, hw * 0.4], [r * 0.99, hw * 0.75], [r * 0.93, hw], [ri * 0.98, hw]].map(([a, b]) => new THREE.Vector2(a, b)),
      28,
    ).rotateZ(-Math.PI / 2);
    const faceX = hw * 0.55;
    const parts = [];
    const add = (g) => parts.push(g);
    // lip
    add(new THREE.TorusGeometry(ri * 0.97, ri * 0.045, 6, 32).rotateY(Math.PI / 2).translate(faceX, 0, 0));
    // hub
    add(new THREE.CylinderGeometry(ri * 0.2, ri * 0.24, 0.06, 16).rotateZ(Math.PI / 2).translate(faceX - 0.01, 0, 0));
    const spoke = (n, w, depth, twist = 0, inner = 0.2, outer = 0.94, xOff = 0) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const len = ri * (outer - inner);
        const g = new THREE.BoxGeometry(depth, len, w);
        g.translate(0, ri * inner + len / 2, 0);
        g.rotateY(twist);
        g.rotateX(a);
        g.translate(faceX + xOff, 0, 0);
        add(g);
      }
    };
    switch (style) {
      case 'steelie':
        add(new THREE.CylinderGeometry(ri * 0.95, ri * 0.95, 0.03, 24).rotateZ(Math.PI / 2).translate(faceX - 0.02, 0, 0));
        break;
      case 'fivespoke':
        spoke(5, ri * 0.3, 0.05);
        break;
      case 'mesh':
        spoke(10, ri * 0.06, 0.035, 0.5);
        spoke(10, ri * 0.06, 0.035, -0.5);
        break;
      case 'turbine':
        spoke(16, ri * 0.11, 0.025, 0.7);
        break;
      case 'forged':
        spoke(12, ri * 0.08, 0.04, 0.15);
        break;
      case 'deepdish':
        add(new THREE.RingGeometry(ri * 0.62, ri * 0.97, 32).rotateY(Math.PI / 2).translate(faceX + 0.01, 0, 0));
        spoke(6, ri * 0.14, 0.05, 0, 0.2, 0.65, -0.03);
        break;
      case 'donk':
        add(new THREE.RingGeometry(ri * 0.82, ri * 0.97, 32).rotateY(Math.PI / 2).translate(faceX + 0.01, 0, 0));
        spoke(8, ri * 0.07, 0.03, 0.9, 0.18, 0.85);
        break;
      default:
        spoke(6, ri * 0.18, 0.045);
    }
    const rim = mergeGeos(parts);
    const barrel = new THREE.CylinderGeometry(ri * 0.96, ri * 0.96, width * 0.85, 24, 1, true).rotateZ(Math.PI / 2);
    const disc = new THREE.CircleGeometry(ri * 0.95, 24).rotateY(Math.PI / 2).translate(-hw * 0.2, 0, 0);
    return { tire, rim, barrel: mergeGeos([barrel, disc]) };
  });
}

// ---------------------------------------------------------------- model
export class CarModel {
  constructor(specId, upgrades, opts = {}) {
    this.specId = specId;
    this.spec = CARS[specId];
    this.bodyId = this.spec.body;
    this.B = BODIES[this.bodyId];
    this.root = new THREE.Group();
    this.opts = opts;
    this.lightState = { head: false, brake: false };
    this.build(upgrades);
  }

  get length() {
    return this.B.L;
  }
  get width() {
    return this.B.W;
  }

  add(parent, geometry, material, shadow = true) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    parent.add(m);
    return m;
  }

  dispose() {
    this.paint?.dispose();
    this.headMat?.dispose();
    this.tailMat?.dispose();
    this.plateMat?.map?.dispose();
    this.plateMat?.dispose();
  }

  build(up) {
    this.dispose();
    this.up = { ...up };
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    const B = this.B, L = B.L, W = B.W, spec = this.spec;
    const police = !!spec.police;
    this.paint = paintMaterial(up.color, up.finish);
    const paint = this.paint;
    this.headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2dc, emissiveIntensity: 0.4, roughness: 0.1, metalness: 0.3 });
    this.tailMat = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff1020, emissiveIntensity: 0.6, roughness: 0.2 });

    // ride height from rims + suspension
    const rs = up.rimSize || 0;
    const R = B.R * RIM_SCALE[rs];
    const lift = R - B.R + (rs === 3 ? 0.18 : 0);
    const drop = [0, 0.035, 0.06, 0.09][up.suspension || 0];
    this.wheelR = R;

    const pivot = (this.pivot = new THREE.Group());
    pivot.position.y = lift - drop;
    this.root.add(pivot);
    const body = (this.bodyGroup = new THREE.Group());
    pivot.add(body);

    this.add(body, bodyGeometry(this.bodyId), paint);
    this.add(body, greenhouseGeometry(this.bodyId), GLASS(up.tint ?? 1));
    this.add(body, roofGeometry(this.bodyId), paint);
    this.add(body, pillarGeometry(this.bodyId), paint);

    const yF = B.upper[B.upper.length - 1][1];
    const frontTop = Math.max(...B.upper.filter(([x]) => x >= 0.5).map(([, y]) => y));
    const rearTop = Math.max(...B.upper.filter(([x]) => x <= -0.5).map(([, y]) => y));
    const fz = L / 2 + 0.06, rz = -L / 2 - 0.06;

    // underbody + side skirts
    this.add(body, cg('under_' + this.bodyId, () => new THREE.BoxGeometry(W - 0.2, 0.12, L - 0.4).translate(0, Math.min(yF, B.upper[0][1]) + 0.02, 0)), UNDER(), false);
    // front fascia: grille + lower intake
    const hy = frontTop - 0.13;
    this.add(body, cg('grille_' + this.bodyId, () => new THREE.BoxGeometry(W * 0.5, 0.16, 0.05).translate(0, hy - 0.02, fz - 0.015)), TRIM(), false);
    this.add(body, cg('intake_' + this.bodyId, () => new THREE.BoxGeometry(W * 0.7, 0.12, 0.05).translate(0, yF + 0.1, fz - 0.02)), TRIM(), false);

    // headlights
    const hl = spec.headlight;
    const heads = [];
    if (hl === 'quad') {
      for (const sx of [-1, 1]) {
        for (const off of [0.2, 0.37]) {
          heads.push(new THREE.CylinderGeometry(0.072, 0.072, 0.05, 18).rotateX(Math.PI / 2).translate(sx * (W / 2 - off), hy, fz));
        }
      }
    } else if (hl === 'square') {
      for (const sx of [-1, 1]) heads.push(new THREE.BoxGeometry(0.36, 0.17, 0.05).translate(sx * (W / 2 - 0.3), hy, fz));
    } else {
      for (const sx of [-1, 1]) heads.push(new THREE.BoxGeometry(0.42, 0.09, 0.05).translate(sx * (W / 2 - 0.3), hy + 0.02, fz));
    }
    this.add(body, mergeGeos(heads), this.headMat, false);
    // taillights
    const ty = rearTop - 0.11;
    const tails = [];
    if (spec.taillight === 'bar') tails.push(new THREE.BoxGeometry(W - 0.25, 0.07, 0.05).translate(0, ty, rz));
    else if (spec.taillight === 'round') {
      for (const sx of [-1, 1]) for (const off of [0.25, 0.48]) tails.push(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 18).rotateX(Math.PI / 2).translate(sx * (W / 2 - off), ty, rz));
    } else for (const sx of [-1, 1]) tails.push(new THREE.BoxGeometry(0.44, 0.13, 0.05).translate(sx * (W / 2 - 0.3), ty, rz));
    this.add(body, mergeGeos(tails), this.tailMat, false);
    // rear plate + bumper trim
    this.plateMat = new THREE.MeshStandardMaterial({ map: T.plateTex(up.plate || 'BOOSTD'), roughness: 0.4 });
    const plate = this.add(body, cg('plate', () => new THREE.PlaneGeometry(0.52, 0.26)), this.plateMat, false);
    plate.position.set(0, ty - 0.24, rz - 0.005);
    plate.rotation.y = Math.PI;
    this.add(body, cg('rbump_' + this.bodyId, () => new THREE.BoxGeometry(W * 0.75, 0.1, 0.05).translate(0, B.upper[0][1] + 0.08, rz - 0.01)), TRIM(), false);
    // exhaust tips
    const tips = [];
    const quad = spec.sound.startsWith('v8') || spec.sound === 'v6tt';
    for (const sx of quad ? [-1, 1] : [1]) {
      for (const off of quad ? [0.3, 0.45] : [0.4]) tips.push(new THREE.CylinderGeometry(0.045, 0.05, 0.18, 12).rotateX(Math.PI / 2).translate(sx * (W / 2 - off), B.upper[0][1] + 0.06, rz + 0.02));
    }
    this.add(body, mergeGeos(tips), CHROME(), false);
    // mirrors
    const [gy0, , , , , gf0] = B.gh;
    for (const sx of [-1, 1]) {
      const m = this.add(body, cg('mirror', () => new THREE.BoxGeometry(0.18, 0.1, 0.14)), paint, false);
      m.position.set(sx * (W * 0.42 + 0.1), gy0 + 0.06, gf0 * L - 0.12);
    }
    // chrome beltline
    this.add(body, cg('belt_' + this.bodyId, () => {
      const [y0, , r0, , , f0] = B.gh;
      return new THREE.BoxGeometry(W * 0.86, 0.025, (f0 - r0) * L).translate(0, y0 + 0.01, ((f0 + r0) / 2) * L);
    }), police ? TRIM() : CHROME(), false);

    // truck bed (dark inset on top of the rear body)
    if (B.bed) {
      const [b0, b1] = B.bed;
      this.add(body, cg('bed', () => new THREE.BoxGeometry(W - 0.25, 0.04, (b1 - b0) * L).translate(0, B.upper[1][1] - 0.02, ((b0 + b1) / 2) * L)), DARK(), false);
    }

    // hood options
    const hoodA = B.gh[5] + 0.05, hoodB = 0.44;
    const hx = (hoodA + hoodB) / 2;
    const hY = profileY(B, hx);
    const slope = Math.atan2(profileY(B, hoodA) - profileY(B, hoodB), (hoodB - hoodA) * L);
    if (up.blower) {
      const bl = new THREE.Group();
      bl.position.set(0, hY, hx * L);
      body.add(bl);
      this.add(bl, cg('blower', () => new THREE.BoxGeometry(0.42, 0.22, 0.62).translate(0, 0.11, 0)), CHROME());
      this.add(bl, cg('blowerScoop', () => new THREE.BoxGeometry(0.5, 0.2, 0.42).translate(0, 0.32, 0.04)), TRIM());
      this.add(bl, cg('blowerMouth', () => new THREE.BoxGeometry(0.42, 0.12, 0.02).translate(0, 0.33, 0.26)), DARK(), false);
      this.add(bl, cg('blowerPulley', () => new THREE.CylinderGeometry(0.08, 0.08, 0.06, 14).rotateX(Math.PI / 2).translate(0, 0.08, 0.34)), CHROME(), false);
    } else if (up.hood === 'scoop') {
      const sc = this.add(body, cg('scoop_' + this.bodyId, () => new THREE.BoxGeometry(0.62, 0.07, 0.7)), paint);
      sc.position.set(0, hY + 0.03, hx * L);
      sc.rotation.x = slope;
      const mouth = this.add(body, cg('scoopM', () => new THREE.BoxGeometry(0.5, 0.05, 0.02)), DARK(), false);
      mouth.position.set(0, hY + 0.045, hx * L + 0.36);
    } else if (up.hood === 'carbon') {
      const c = this.add(body, cg('carbon_' + this.bodyId, () => new THREE.BoxGeometry(W * 0.78, 0.02, (hoodB - hoodA) * L)), CARBON());
      c.position.set(0, hY + 0.012, hx * L);
      c.rotation.x = slope;
      for (const sx of [-1, 1]) {
        const v = this.add(body, cg('vent', () => new THREE.BoxGeometry(0.22, 0.02, 0.28)), DARK(), false);
        v.position.set(sx * 0.4, hY + 0.022, hx * L + 0.1);
        v.rotation.x = slope;
      }
    }
    // spoilers
    const deckX = (B.gh[2] - 0.5) / 2 - 0.02;
    const deckY = profileY(B, Math.max(-0.48, deckX));
    if (up.spoiler === 'ducktail') {
      const d = this.add(body, cg('duck_' + this.bodyId, () => new THREE.BoxGeometry(W - 0.3, 0.06, 0.22)), paint);
      d.position.set(0, rearTop + 0.02, -L / 2 + 0.12);
      d.rotation.x = -0.35;
    } else if (up.spoiler === 'wing' || up.spoiler === 'gt') {
      const gt = up.spoiler === 'gt';
      const h = gt ? 0.38 : 0.22;
      const z = -L / 2 + (gt ? 0.25 : 0.3);
      const wm = gt ? CARBON() : paint;
      const wing = this.add(body, cg('wing' + gt + this.bodyId, () => new THREE.BoxGeometry(gt ? W + 0.02 : W - 0.25, 0.035, gt ? 0.36 : 0.26)), wm);
      wing.position.set(0, deckY + h, z);
      wing.rotation.x = -0.1;
      for (const sx of [-1, 1]) {
        const st = this.add(body, cg('stand' + gt, () => new THREE.BoxGeometry(0.04, h, 0.12)), gt ? TRIM() : paint, false);
        st.position.set(sx * (W / 2 - 0.45), deckY + h / 2, z);
        if (gt) {
          const ep = this.add(body, cg('endplate', () => new THREE.BoxGeometry(0.02, 0.18, 0.42)), CARBON(), false);
          ep.position.set(sx * (W / 2 + 0.02), deckY + h + 0.02, z);
        }
      }
    }

    // police livery + light bar
    if (police) {
      const len = (B.wb[1] - B.wb[0]) - 0.95;
      for (const sx of [-1, 1]) {
        const p = this.add(body, cg('pdoor', () => new THREE.PlaneGeometry(len, 0.42)), POLICE_DOOR(), false);
        p.position.set(sx * (W / 2 + 0.012), 0.66, (B.wb[0] + B.wb[1]) / 2 + 0.05);
        p.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      const bar = new THREE.Group();
      bar.position.set(0, B.gh[1] + 0.03, (B.gh[3] + B.gh[4]) / 2 * L);
      body.add(bar);
      this.add(bar, cg('lbBase', () => new THREE.BoxGeometry(1.2, 0.06, 0.28)), TRIM(), false);
      this.sirenR = new THREE.MeshStandardMaterial({ color: 0x300000, emissive: 0xff1020, emissiveIntensity: 0 });
      this.sirenB = new THREE.MeshStandardMaterial({ color: 0x000030, emissive: 0x1040ff, emissiveIntensity: 0 });
      const r = this.add(bar, cg('lbL', () => new THREE.BoxGeometry(0.55, 0.1, 0.24).translate(0.29, 0.08, 0)), this.sirenR, false);
      const b = this.add(bar, cg('lbR', () => new THREE.BoxGeometry(0.55, 0.1, 0.24).translate(-0.29, 0.08, 0)), this.sirenB, false);
      void r;
      void b;
      // push bar
      this.add(body, cg('pushbar', () => new THREE.BoxGeometry(W * 0.6, 0.35, 0.08).translate(0, yF + 0.28, L / 2 + 0.12)), TRIM());
    }

    // wheels
    this.wheels = [];
    const rimStyle = up.rims === 'stock' ? spec.rims || 'stock' : up.rims;
    const frac = rimStyle === 'donk' ? Math.max(RIM_FRAC[rs], 0.84) : RIM_FRAC[rs];
    const wg = wheelGeometry(R, B.tw, rimStyle, frac);
    const rimMat = up.rimColor === 'body' ? paint : (RIM_MATS[up.rimColor] || RIM_MATS.silver)();
    const tx = W / 2 - B.tw / 2 - 0.04;
    for (const [z, front] of [[B.wb[1], true], [B.wb[0], false]]) {
      for (const sx of [-1, 1]) {
        const w = new THREE.Group();
        w.position.set(sx * tx, R, z);
        const steer = new THREE.Group();
        w.add(steer);
        // brake caliper (doesn't spin)
        const cal = this.add(steer, cg('caliper', () => new THREE.BoxGeometry(0.06, 0.16, 0.12)), CALIPER((up.brakes || 0) >= 2), false);
        cal.position.set(sx * 0.02, R * frac * 0.45, -R * frac * 0.35);
        const spin = new THREE.Group();
        steer.add(spin);
        const face = new THREE.Group();
        face.rotation.y = sx > 0 ? 0 : Math.PI;
        spin.add(face);
        this.add(face, wg.tire, TIRE());
        this.add(face, wg.rim, rimMat, false);
        this.add(face, wg.barrel, DARK(), false);
        this.root.add(w);
        this.wheels.push({ group: w, steer, spin, front, sx });
      }
    }

    // ground FX: underglow, headlight beams, tail glow
    const glow = up.underglow;
    if (glow) {
      this.glowMat = new THREE.MeshBasicMaterial({ map: T.radial(), color: glow, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
      const g = new THREE.Mesh(cg('glowPlane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), this.glowMat);
      g.scale.set(W * 1.8, 1, L * 1.25);
      g.position.y = 0.035;
      g.renderOrder = 3;
      this.root.add(g);
      const strip = this.add(pivot, cg('glowStrip_' + this.bodyId, () => new THREE.BoxGeometry(W - 0.4, 0.02, L - 1.2)), new THREE.MeshBasicMaterial({ color: glow }), false);
      strip.position.y = Math.min(yF, B.upper[0][1]) - 0.05;
    }
    this.beamMat = new THREE.MeshBasicMaterial({ map: T.beam(), color: 0xfff0d0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(cg('beamPlane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), this.beamMat);
    beam.scale.set(7, 1, 16);
    beam.position.set(0, 0.04, L / 2 + 8);
    beam.rotation.y = Math.PI;
    beam.renderOrder = 3;
    this.root.add(beam);
    this.tailGlowMat = new THREE.MeshBasicMaterial({ map: T.radial(), color: 0xff1020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const tg = new THREE.Mesh(cg('glowPlane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), this.tailGlowMat);
    tg.scale.set(W * 1.4, 1, 2.2);
    tg.position.set(0, 0.04, -L / 2 - 0.6);
    tg.renderOrder = 3;
    this.root.add(tg);

    // nitro flames (hidden until boosting)
    this.flames = [];
    const flameMat = sm('flame', () => new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    for (const t of tips.slice(0, 2)) {
      t.computeBoundingBox();
      const c = new THREE.Vector3();
      t.boundingBox.getCenter(c);
      const f = new THREE.Mesh(cg('flameCone', () => new THREE.ConeGeometry(0.06, 0.5, 10).rotateX(-Math.PI / 2).translate(0, 0, -0.25)), flameMat);
      f.position.set(c.x, c.y, c.z - 0.1);
      f.visible = false;
      pivot.add(f);
      this.flames.push(f);
    }
    this.root.traverse((o) => (o.userData.car = this));
  }

  /** Visual update per frame. */
  animate(dt, { steer = 0, speed = 0, pitch = 0, roll = 0, braking = false, lights = 0, nitro = false, siren = false, t = 0 }) {
    const spinDelta = (speed * dt) / this.wheelR;
    for (const w of this.wheels) {
      if (w.front) w.steer.rotation.y = steer * 0.55;
      w.spin.rotation.x += spinDelta;
    }
    this.bodyGroup.rotation.x = pitch;
    this.bodyGroup.rotation.z = roll;
    this.headMat.emissiveIntensity = 0.4 + lights * 4;
    this.tailMat.emissiveIntensity = braking ? 5 : 0.6 + lights * 1.5;
    this.beamMat.opacity = lights * 0.55;
    this.tailGlowMat.opacity = (braking ? 0.5 : 0.12) * Math.max(lights, braking ? 0.4 : 0);
    if (this.glowMat) this.glowMat.opacity = 0.35 + lights * 0.6;
    for (const f of this.flames) {
      f.visible = nitro;
      if (nitro) f.scale.set(1, 1, 0.7 + Math.random() * 0.6);
    }
    if (this.sirenR) {
      const on = siren ? (Math.floor(t * 6) % 2 === 0 ? 1 : 0) : 0;
      this.sirenR.emissiveIntensity = siren ? on * 8 : 0;
      this.sirenB.emissiveIntensity = siren ? (1 - on) * 8 : 0;
    }
  }
}

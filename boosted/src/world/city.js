// Procedural city "San Bravo": road grid, districts, landmarks, props, colliders and the traffic graph.
import * as THREE from 'three';
import { WORLD, roadCoord } from '../config.js';
import { makeRng } from '../util.js';
import { GeoBuilder, rgb, QUV } from './geobuilder.js';
import { CollisionWorld } from './collision.js';
import * as T from '../engine/textures.js';

const { N, BLOCK, ROAD, SIDEWALK: SW, CURB } = WORLD;

// Map of districts, row = bz (north -> south), col = bx (west -> east)
//  I industrial  C commercial  D downtown  H houses  A apartments  P park  L parking lot
//  G your garage  X chop shop  E export docks  S body shop  O police  F gas station
const LAYOUT = [
  'IIXICDDD',
  'IIICCDDD',
  'HHCLCCDD',
  'HGHCPCOC',
  'HHHCCLCA',
  'AASCHHCA',
  'AACFHHCA',
  'EECCCHHC',
];

const SIDE = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

export const LOCATION_INFO = {
  garage: { name: 'The Spot (Your Garage)', short: 'G', color: '#33d6ff' },
  chop: { name: 'EZ Auto Parts (Chop Shop)', short: 'C', color: '#ffb000' },
  export: { name: 'Port Exports', short: '$', color: '#33ff99' },
  spray: { name: 'Fresh Coat Body Shop', short: 'S', color: '#ff55c8' },
  police: { name: 'Police Station', short: 'P', color: '#3a8bff' },
};

export class City {
  constructor(scene) {
    this.scene = scene;
    this.rng = makeRng(1337);
    this.col = new CollisionWorld(16);
    this.blocks = [];
    this.locations = [];
    this.parkingSpots = [];
    this.nightMats = [];
    this.g = {}; // GeoBuilders by material name
    this.inst = {}; // instance transforms by prop name
    this.group = new THREE.Group();
    scene.add(this.group);

    this.makeMaterials();
    this.buildGround();
    this.buildBlocks();
    this.buildRoadMarkings();
    this.buildStreetFurniture();
    this.buildPerimeter();
    this.flush();
    this.buildInstances();
  }

  // ------------------------------------------------------------------ helpers
  gb(name) {
    return this.g[name] || (this.g[name] = new GeoBuilder());
  }

  addInst(name, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, color = null) {
    (this.inst[name] || (this.inst[name] = [])).push({ x, y, z, ry, sx, sy, sz, color });
  }

  collider(minX, maxX, minZ, maxZ, h = 10, tag = 'building') {
    return this.col.add({ minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ), h, tag });
  }

  blockAt(x, z) {
    const P = WORLD.PITCH;
    const bx = Math.floor((x + WORLD.HALF) / P), bz = Math.floor((z + WORLD.HALF) / P);
    if (bx < 0 || bz < 0 || bx >= N || bz >= N) return null;
    const b = this.blocks[bz * N + bx];
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return null;
    return b;
  }

  groundHeight(x, z) {
    return this.blockAt(x, z) ? CURB : 0;
  }

  isOnRoad(x, z) {
    return !this.blockAt(x, z) && Math.abs(x) < WORLD.HALF + ROAD / 2 && Math.abs(z) < WORLD.HALF + ROAD / 2;
  }

  nodePos(i, j) {
    return [roadCoord(i), roadCoord(j)];
  }

  nearestNode(x, z) {
    const P = WORLD.PITCH;
    const i = Math.max(0, Math.min(N, Math.round((x + WORLD.HALF) / P)));
    const j = Math.max(0, Math.min(N, Math.round((z + WORLD.HALF) / P)));
    return [i, j];
  }

  // ------------------------------------------------------------------ materials
  makeMaterials() {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const fac = (f, extra = {}) => {
      const { map, emissive } = f();
      const { nightGlow = 1.3, ...rest } = extra;
      const m = std({ map, emissiveMap: emissive, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.8, ...rest });
      this.nightMats.push([m, nightGlow]);
      return m;
    };
    this.mats = {
      asphalt: std({ map: T.asphalt(), roughness: 0.92, color: 0xffffff }),
      sidewalk: std({ map: T.concrete(), roughness: 0.9, vertexColors: true }),
      grass: std({ map: T.grass(), roughness: 1, vertexColors: true }),
      dirt: std({ map: T.dirt(), roughness: 1 }),
      lot: std({ map: T.parkingLines(), roughness: 0.9 }),
      office: fac(T.FACADES.office, { roughness: 0.4, metalness: 0.35 }),
      glass: fac(T.FACADES.glass, { roughness: 0.18, metalness: 0.6 }),
      brick: fac(T.FACADES.brick, { roughness: 0.85 }),
      projects: fac(T.FACADES.projects, { roughness: 0.9 }),
      stucco: fac(T.FACADES.stucco, { roughness: 0.9 }),
      warehouse: fac(T.FACADES.warehouse, { roughness: 0.7, metalness: 0.3, nightGlow: 0.8 }),
      siding: fac(T.FACADES.siding, { roughness: 0.85, nightGlow: 1.1 }),
      store: fac(T.storefront, { roughness: 0.6, nightGlow: 1.6 }),
      roof: std({ map: T.roofTex(), roughness: 0.95, vertexColors: true }),
      shingles: std({ map: T.shingles(), roughness: 0.9, vertexColors: true }),
      trim: std({ color: 0xffffff, roughness: 0.7, vertexColors: true }),
      metal: std({ color: 0xffffff, roughness: 0.4, metalness: 0.7, vertexColors: true }),
      garageDoor: std({ map: T.garageDoor(), roughness: 0.6, metalness: 0.4 }),
      container: std({ map: T.containerTex(), roughness: 0.65, metalness: 0.3, vertexColors: true }),
      court: std({ map: T.courtTex(), roughness: 0.8 }),
      fence: std({ map: T.chainLink(), transparent: false, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.6 }),
      lineWhite: std({ color: 0xe8e8e0, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }),
      lineYellow: std({ color: 0xf0b622, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }),
      water: new THREE.MeshPhysicalMaterial({ color: 0x0b2733, roughness: 0.06, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 }),
    };
    const sa = T.signAtlas();
    this.signAtlas = sa;
    this.mats.signs = std({ map: sa.map, emissiveMap: sa.emissive, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.5 });
    this.nightMats.push([this.mats.signs, 2.4, 0.6]);
    this.mats.graffiti = std({ map: T.graffitiAtlas(), transparent: true, alphaTest: 0.05, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4 });
  }

  // ------------------------------------------------------------------ ground & blocks
  buildGround() {
    // harbor water south of the city; asphalt stops at the quay
    const wz0 = WORLD.HALF + ROAD / 2 + 14;
    const size = 2400, depth = 1200 + wz0;
    const geo = new THREE.PlaneGeometry(size, depth).rotateX(-Math.PI / 2);
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (size / 9), uv.getY(i) * (depth / 9));
    const ground = new THREE.Mesh(geo, this.mats.asphalt);
    ground.position.z = (wz0 - 1200) / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1200).rotateX(-Math.PI / 2), this.mats.water);
    water.position.set(0, -1.2, wz0 + 600);
    this.group.add(water);
    this.waterZ = wz0;
    // quay wall
    this.gb('sidewalk').box(-1200, 1200, -1.6, 0.02, wz0 - 0.6, wz0, { tileW: 6, tileH: 6, top: false });
  }

  buildBlocks() {
    const rng = this.rng;
    for (let bz = 0; bz < N; bz++) {
      for (let bx = 0; bx < N; bx++) {
        const type = LAYOUT[bz][bx];
        const minX = roadCoord(bx) + ROAD / 2, maxX = roadCoord(bx + 1) - ROAD / 2;
        const minZ = roadCoord(bz) + ROAD / 2, maxZ = roadCoord(bz + 1) - ROAD / 2;
        const b = { bx, bz, type, minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, ix0: minX + SW, ix1: maxX - SW, iz0: minZ + SW, iz1: maxZ - SW };
        this.blocks.push(b);
        // raised sidewalk slab
        const shade = 0.9 + rng() * 0.15;
        this.gb('sidewalk').box(minX, maxX, -0.2, CURB, minZ, maxZ, { tileW: 6, tileH: 6, topTile: 6, col: [shade, shade, shade * 0.98] });
        const fn = {
          I: this.industrial, C: this.commercial, D: this.downtown, H: this.houses, A: this.apartments, P: this.park, L: this.parkingLot,
          G: this.homeGarage, X: this.chopShop, E: this.docks, S: this.bodyShop, O: this.police, F: this.gasStation,
        }[type];
        fn.call(this, b, rng);
        this.blockTrees(b, rng);
      }
    }
  }

  /** Generic box building with optional storefront ground floor. */
  building(x0, x1, z0, z1, h, o = {}) {
    const rng = this.rng;
    const facade = o.facade || 'brick';
    const tiles = { office: [24, 28], glass: [24, 28], brick: [24, 25.6], projects: [24, 25.6], stucco: [24, 25.6], warehouse: [40, h], siding: [12, 7] }[facade];
    const col = o.col || [1, 1, 1];
    const base = CURB;
    let y = base;
    if (o.store) {
      this.gb('store').box(x0, x1, y, y + 4.5, z0, z1, { tileW: 12, tileH: 4.5, top: false, uOff: Math.floor(rng() * 2) / 2 });
      y += 4.5;
    }
    const uOff = Math.floor(rng() * 8) / 8, vOff = facade === 'warehouse' || facade === 'siding' ? 0 : Math.floor(rng() * 4) / 8;
    this.gb(facade).box(x0, x1, y, base + h, z0, z1, { tileW: tiles[0], tileH: tiles[1], uOff, vOff, top: false, col });
    // roof + parapet
    const rc = 0.75 + rng() * 0.3;
    this.gb('roof').flat(x0, x1, z0, z1, base + h, 8, [rc, rc, rc]);
    if (o.parapet !== false && h > 6) {
      const p = 0.35;
      const t = this.gb('trim');
      const pc = [0.55, 0.55, 0.56];
      t.box(x0, x1, base + h, base + h + 0.9, z0, z0 + p, { col: pc });
      t.box(x0, x1, base + h, base + h + 0.9, z1 - p, z1, { col: pc });
      t.box(x0, x0 + p, base + h, base + h + 0.9, z0, z1, { col: pc });
      t.box(x1 - p, x1, base + h, base + h + 0.9, z0, z1, { col: pc });
      // rooftop AC units / water tank
      const n = Math.floor((x1 - x0) * (z1 - z0) / 250);
      for (let i = 0; i < n; i++) {
        const ax = x0 + 2 + rng() * (x1 - x0 - 5), az = z0 + 2 + rng() * (z1 - z0 - 5);
        const s = 1 + rng() * 1.5;
        t.box(ax, ax + s * 1.6, base + h, base + h + s, az, az + s, { col: [0.7, 0.72, 0.74] });
      }
      if (h > 14 && rng() < 0.35) this.addInst('tank', x0 + (x1 - x0) * 0.7, base + h, z0 + (z1 - z0) * 0.3);
    }
    this.collider(x0, x1, z0, z1, h);
  }

  /** A neon sign mounted on a wall whose outward normal points toward `side`. */
  sign(text, x, y, z, side, w = 6, h = 2.2) {
    const idx = this.signAtlas.index(text);
    if (idx < 0) return;
    const { u0, u1, v0, v1 } = this.signAtlas.uv(idx);
    const [sx, sz] = SIDE[side];
    const dx = sz, dz = -sx; // left -> right as seen from outside
    const ox = x + sx * 0.18, oz = z + sz * 0.18;
    this.gb('signs').wall(ox - dx * w / 2, oz - dz * w / 2, ox + dx * w / 2, oz + dz * w / 2, y, y + h, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
    const bk = [0.08, 0.08, 0.09];
    if (sx) this.gb('trim').box(Math.min(x, x + sx * 0.15), Math.max(x, x + sx * 0.15), y - 0.1, y + h + 0.1, z - w / 2 - 0.1, z + w / 2 + 0.1, { col: bk });
    else this.gb('trim').box(x - w / 2 - 0.1, x + w / 2 + 0.1, y - 0.1, y + h + 0.1, Math.min(z, z + sz * 0.15), Math.max(z, z + sz * 0.15), { col: bk });
  }

  graffiti(x, y, z, side, w = 5) {
    const i = Math.floor(this.rng() * 16);
    const u0 = (i % 4) / 4, u1 = u0 + 0.25, v1 = 1 - Math.floor(i / 4) / 4, v0 = v1 - 0.25;
    const [sx, sz] = SIDE[side];
    const dx = sz, dz = -sx;
    const ox = x + sx * 0.06, oz = z + sz * 0.06;
    this.gb('graffiti').wall(ox - dx * w / 2, oz - dz * w / 2, ox + dx * w / 2, oz + dz * w / 2, y, y + w / 2, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
  }

  /** Register an enterable spot (marker at x,z) whose doors face `side`. */
  location(type, x, z, side, extra = {}) {
    const [sx, sz] = SIDE[side];
    const info = LOCATION_INFO[type];
    const loc = { type, name: info.name, short: info.short, color: info.color, x, z, r: 5.5, side, exitYaw: Math.atan2(sx, sz), ...extra };
    this.locations.push(loc);
    return loc;
  }

  fence(ax, az, bx, bz, h = 2.2, collide = true) {
    const len = Math.hypot(bx - ax, bz - az);
    this.gb('fence').wall(ax, az, bx, bz, CURB, CURB + h, [[0, 0], [len / 2, 0], [len / 2, h / 2], [0, h / 2]], undefined, true);
    const n = Math.max(1, Math.round(len / 3));
    for (let i = 0; i <= n; i++) this.addInst('post', ax + ((bx - ax) * i) / n, CURB, az + ((bz - az) * i) / n, 0, 1, h / 2.2, 1);
    if (collide) {
      const t = 0.15;
      this.collider(Math.min(ax, bx) - t, Math.max(ax, bx) + t, Math.min(az, bz) - t, Math.max(az, bz) + t, h, 'fence');
    }
  }

  parkRow(x0, z0, dx, dz, count, yaw, kind = 'lot', lines = true) {
    // dx,dz step between stalls; stall long axis along yaw
    for (let i = 0; i < count; i++) {
      const x = x0 + dx * i, z = z0 + dz * i;
      this.parkingSpots.push({ x, z, yaw, kind });
      if (lines) {
        const fx = Math.sin(yaw), fz = Math.cos(yaw);
        const rx = Math.cos(yaw), rz = -Math.sin(yaw);
        const sx = x + rx * 1.45, sz = z + rz * 1.45;
        // stripe along the stall length
        const ax = sx - fx * 2.6, az = sz - fz * 2.6, bx = sx + fx * 2.6, bz = sz + fz * 2.6;
        const w = 0.07;
        this.gb('lineWhite').quad([ax - rx * w, CURB + 0.03, az - rz * w], [bx - rx * w, CURB + 0.03, bz - rz * w], [bx + rx * w, CURB + 0.03, bz + rz * w], [ax + rx * w, CURB + 0.03, az + rz * w], [0, 1, 0]);
      }
    }
  }

  // ------------------------------------------------------------------ district builders
  houses(b, rng) {
    this.gb('grass').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 8);
    const colors = ['#e8e1d0', '#c9d6df', '#e3c9a8', '#b8c9a8', '#d9b8b8', '#a8b8c9', '#f0e6c8', '#c4b49a', '#9fb3a0', '#d7c4e0'];
    const perRow = Math.max(1, Math.round((b.ix1 - b.ix0) / 14));
    const lotW = (b.ix1 - b.ix0) / perRow;
    for (const side of ['n', 's']) {
      for (let i = 0; i < perRow; i++) {
        const lx0 = b.ix0 + i * lotW;
        const cxh = lx0 + lotW / 2 + (rng() - 0.5) * 0.8;
        const w = Math.min(8 + rng() * 1.5, lotW - 4.8), d = 9 + rng() * 2;
        const front = side === 's' ? b.iz1 - 7 : b.iz0 + 7; // setback from sidewalk
        const z0 = side === 's' ? front - d : front, z1 = side === 's' ? front : front + d;
        const x0 = cxh - w / 2 - 1.2, x1 = cxh + w / 2 - 1.2;
        const stories = rng() < 0.35 ? 2 : 1;
        const h = stories * 3.3;
        const col = rgb(rng.pick(colors));
        this.gb('siding').box(x0, x1, CURB, CURB + h, z0, z1, { tileW: 12, tileH: 7, top: false, col, uOff: Math.floor(rng() * 4) / 4 });
        this.gable(x0 - 0.4, x1 + 0.4, z0 - 0.4, z1 + 0.4, CURB + h, CURB + h + 2.2, rgb(rng.pick(['#6b4b3a', '#3d3f45', '#5a2e2a', '#2f3b33'])), col);
        this.collider(x0, x1, z0, z1, h + 2);
        // porch + door
        const fz = side === 's' ? z1 : z0, dir = side === 's' ? 1 : -1;
        const pcx = (x0 + x1) / 2 - 1.2;
        this.gb('trim').box(pcx - 1.6, pcx + 1.6, CURB, CURB + 0.4, Math.min(fz, fz + dir * 1.8), Math.max(fz, fz + dir * 1.8), { col: [0.6, 0.58, 0.55] });
        this.gb('trim').box(pcx - 0.55, pcx + 0.55, CURB + 0.4, CURB + 2.5, Math.min(fz, fz + dir * 0.05), Math.max(fz, fz + dir * 0.05), { col: rgb(rng.pick(['#5a2a1a', '#1d2a3a', '#2a2a2a', '#7a1a1a'])) });
        // driveway on the right of the house with maybe a car
        const dwx = x1 + 1.8;
        const dz0 = side === 's' ? z1 - 4 : b.minZ, dz1 = side === 's' ? b.maxZ : z0 + 4;
        this.gb('sidewalk').flat(dwx - 1.6, dwx + 1.6, dz0, dz1, CURB + 0.02, 6, [0.82, 0.82, 0.8]);
        const pz = side === 's' ? b.iz1 - 2.8 : b.iz0 + 2.8;
        this.parkingSpots.push({ x: dwx, z: pz, yaw: side === 's' ? Math.PI : 0, kind: 'driveway' });
        // front fence segments (skip driveway)
        if (rng() < 0.55) {
          const fzF = side === 's' ? b.iz1 : b.iz0;
          this.fence(lx0 + 0.3, fzF, dwx - 1.9, fzF, 1.1, false);
        }
        if (rng() < 0.4) this.addInst('trashcan', x0 - 0.8, CURB, fz + dir * 1.2);
      }
    }
    // utility poles along the block's west edge
    for (let z = b.minZ + 6; z < b.maxZ - 4; z += 22) this.addInst('utilpole', b.minX + 0.9, CURB, z);
  }

  gable(x0, x1, z0, z1, y0, y1, roofCol, wallCol) {
    const along = x1 - x0 > z1 - z0; // ridge along longer axis
    const r = this.gb('shingles');
    const w = this.gb('siding');
    if (along) {
      const zm = (z0 + z1) / 2;
      const L = x1 - x0, S = Math.hypot(zm - z0, y1 - y0);
      r.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, zm], [x0, y1, zm], norm([0, zm - z0, y1 - y0]), [[0, 0], [L / 4, 0], [L / 4, S / 4], [0, S / 4]], roofCol);
      r.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, zm], [x1, y1, zm], norm([0, zm - z0, -(y1 - y0)]), [[0, 0], [L / 4, 0], [L / 4, S / 4], [0, S / 4]], roofCol);
      w.tri([x0 + 0.4, y0, z0 + 0.4], [x0 + 0.4, y0, z1 - 0.4], [x0 + 0.4, y1, zm], [-1, 0, 0], [[0, 0], [0.3, 0], [0.15, 0.2]], wallCol);
      w.tri([x1 - 0.4, y0, z1 - 0.4], [x1 - 0.4, y0, z0 + 0.4], [x1 - 0.4, y1, zm], [1, 0, 0], [[0, 0], [0.3, 0], [0.15, 0.2]], wallCol);
    } else {
      const xm = (x0 + x1) / 2;
      const L = z1 - z0, S = Math.hypot(xm - x0, y1 - y0);
      r.quad([x1, y0, z1], [x1, y0, z0], [xm, y1, z0], [xm, y1, z1], norm([y1 - y0, xm - x0, 0]), [[0, 0], [L / 4, 0], [L / 4, S / 4], [0, S / 4]], roofCol);
      r.quad([x0, y0, z0], [x0, y0, z1], [xm, y1, z1], [xm, y1, z0], norm([-(y1 - y0), xm - x0, 0]), [[0, 0], [L / 4, 0], [L / 4, S / 4], [0, S / 4]], roofCol);
      w.tri([x0 + 0.4, y0, z1 - 0.4], [x1 - 0.4, y0, z1 - 0.4], [xm, y1, z1 - 0.4], [0, 0, 1], [[0, 0], [0.3, 0], [0.15, 0.2]], wallCol);
      w.tri([x1 - 0.4, y0, z0 + 0.4], [x0 + 0.4, y0, z0 + 0.4], [xm, y1, z0 + 0.4], [0, 0, -1], [[0, 0], [0.3, 0], [0.15, 0.2]], wallCol);
    }
  }

  commercial(b, rng) {
    this.gb('lot').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 9);
    const depth = 13;
    const facades = ['brick', 'stucco', 'brick', 'projects'];
    const tints = [[1, 1, 1], [0.9, 0.85, 0.8], [1, 0.9, 0.85], [0.85, 0.9, 1]];
    // shops along north and south edges, full width; east/west get a single shop each (corners)
    const open = rng() < 0.5 ? 'e' : 'w';
    for (const side of ['n', 's', 'e', 'w']) {
      const horiz = side === 'n' || side === 's';
      const a0 = horiz ? b.ix0 : b.iz0 + depth, a1 = horiz ? b.ix1 : b.iz1 - depth;
      if (!horiz && (side === open || rng() < 0.4)) continue; // alley / lot entrance
      let a = a0;
      while (a < a1 - 6) {
        const w = Math.min(a1 - a, 10 + rng() * 8);
        const h = rng() < 0.45 ? 4.5 : 4.5 + 3.2 * (1 + Math.floor(rng() * 3));
        const fac = rng.pick(facades);
        const col = rng.pick(tints);
        let x0, x1, z0, z1;
        if (side === 'n') (x0 = a), (x1 = a + w), (z0 = b.iz0), (z1 = b.iz0 + depth);
        if (side === 's') (x0 = a), (x1 = a + w), (z0 = b.iz1 - depth), (z1 = b.iz1);
        if (side === 'w') (x0 = b.ix0), (x1 = b.ix0 + depth), (z0 = a), (z1 = a + w);
        if (side === 'e') (x0 = b.ix1 - depth), (x1 = b.ix1), (z0 = a), (z1 = a + w);
        if (h <= 4.5) {
          this.gb('store').box(x0, x1, CURB, CURB + 4.5, z0, z1, { tileW: 12, tileH: 4.5, top: false });
          this.gb('roof').flat(x0, x1, z0, z1, CURB + 4.5, 8);
          this.gb('trim').box(x0, x1, CURB + 4.5, CURB + 5.1, z0, z1, { col: col.map((c) => c * 0.6), top: true });
          this.collider(x0, x1, z0, z1, 5);
        } else this.building(x0, x1, z0, z1, h, { facade: fac, store: true, col });
        // neon sign + awning on the street face
        const [sx, sz] = SIDE[side];
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        const fx = side === 'e' ? x1 : side === 'w' ? x0 : mx;
        const fz = side === 's' ? z1 : side === 'n' ? z0 : mz;
        const st = rng.pick(T.SIGN_TEXTS)[0];
        this.sign(st, fx, CURB + 3.4, fz, side, Math.min(w - 1, 6.5), 1.6);
        if (rng() < 0.6) {
          const aw = this.gb('trim');
          const ac = rgb(rng.pick(['#8a1c1c', '#1c4a8a', '#1c6b3a', '#c48a1c', '#2a2a2a']));
          const len = w - 1.5;
          if (horiz) aw.box(mx - len / 2, mx + len / 2, CURB + 2.7, CURB + 2.95, Math.min(fz, fz + sz * 1.6), Math.max(fz, fz + sz * 1.6), { col: ac });
          else aw.box(Math.min(fx, fx + sx * 1.6), Math.max(fx, fx + sx * 1.6), CURB + 2.7, CURB + 2.95, mz - len / 2, mz + len / 2, { col: ac });
        }
        if (rng() < 0.3) this.graffiti(side === 'e' ? x0 : side === 'w' ? x1 : mx, CURB + 1, side === 'n' ? z1 : side === 's' ? z0 : mz, side === 'n' ? 's' : side === 's' ? 'n' : side === 'e' ? 'w' : 'e', 4);
        a += w;
      }
    }
    // back lot parking + dumpsters
    const cx = b.cx, cz = b.cz;
    this.parkRow(cx - 12, cz - 3, 3, 0, 8, 0);
    this.addInst('dumpster', cx - 10, CURB, cz + 9, 0);
    this.addInst('dumpster', cx + 10, CURB, cz + 9, 0);
  }

  downtown(b, rng) {
    this.gb('sidewalk').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 6, [0.85, 0.85, 0.88]);
    const split = rng() < 0.5 ? 1 : 2;
    const pad = 2;
    const w = (b.ix1 - b.ix0) / split, d = (b.iz1 - b.iz0) / 2;
    for (let i = 0; i < split; i++) {
      for (let j = 0; j < 2; j++) {
        if (split === 1 && j === 1) continue;
        const x0 = b.ix0 + i * w + pad, x1 = b.ix0 + (i + 1) * w - pad;
        const z0 = b.iz0 + (split === 1 ? 0 : j * d) + pad, z1 = split === 1 ? b.iz1 - pad : b.iz0 + (j + 1) * d - pad;
        const h = 30 + rng() * 75;
        const fac = rng() < 0.5 ? 'glass' : 'office';
        const tint = rng.pick([[1, 1, 1], [0.85, 0.95, 1.1], [1.05, 1, 0.9], [0.8, 0.85, 0.9]]);
        this.building(x0, x1, z0, z1, h, { facade: fac, store: true, col: tint });
        // setback crown
        if (h > 50) {
          const s = 4;
          this.gb(fac).box(x0 + s, x1 - s, CURB + h, CURB + h + 8, z0 + s, z1 - s, { tileW: 24, tileH: 28, top: false, col: tint });
          this.gb('roof').flat(x0 + s, x1 - s, z0 + s, z1 - s, CURB + h + 8, 8);
          this.addInst('antenna', (x0 + x1) / 2, CURB + h + 8, (z0 + z1) / 2, 0, 1, 0.5 + rng(), 1);
        }
      }
    }
  }

  apartments(b, rng) {
    this.gb('grass').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 8);
    const floors = 4 + Math.floor(rng() * 4);
    const h = floors * 3.2;
    const tint = rng.pick([[1, 1, 1], [0.95, 0.85, 0.75], [0.85, 0.85, 0.9]]);
    // two slabs (north/south) — classic projects layout with a courtyard
    this.building(b.ix0 + 4, b.ix1 - 4, b.iz0 + 2, b.iz0 + 16, h, { facade: 'projects', col: tint });
    this.building(b.ix0 + 4, b.ix1 - 4, b.iz1 - 16, b.iz1 - 2, h, { facade: 'projects', col: tint });
    this.graffiti(b.cx - 10, CURB + 0.6, b.iz1 - 16, 'n', 6);
    this.graffiti(b.cx + 12, CURB + 0.6, b.iz0 + 16, 's', 6);
    if (b.ix1 - b.ix0 < 40) return; // narrow lot (shared block): no courtyard extras
    // courtyard: half court + benches
    this.gb('lot').flat(b.cx - 9, b.cx + 9, b.cz - 7, b.cz + 7, CURB + 0.02, 9);
    this.addInst('hoop', b.cx, CURB, b.cz - 6.4, 0);
    this.addInst('bench', b.cx - 14, CURB, b.cz, Math.PI / 2);
    this.addInst('bench', b.cx + 14, CURB, b.cz, -Math.PI / 2);
    // side parking
    this.parkRow(b.ix0 + 4, b.cz - 6, 0, 3, 5, Math.PI / 2);
    this.parkRow(b.ix1 - 4, b.cz - 6, 0, 3, 5, -Math.PI / 2);
  }

  industrial(b, rng) {
    this.gb('lot').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 9);
    const W = b.ix1 - b.ix0;
    const n = W > 50 && rng() < 0.5 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x0 = b.ix0 + 3 + i * 28, x1 = n === 1 ? b.ix1 - (W > 40 ? 12 : 3) : x0 + 24;
      const z0 = b.iz0 + 4, z1 = b.iz1 - 16;
      const h = 8 + rng() * 5;
      this.building(x0, x1, z0, z1, h, { facade: 'warehouse', col: rng.pick([[1, 1, 1], [0.8, 0.9, 1], [1, 0.9, 0.8], [0.85, 1, 0.85]]) });
      // roll-up door on the south face
      const dx = (x0 + x1) / 2;
      this.gb('garageDoor').wall(dx - 2.5, z1 + 0.05, dx + 2.5, z1 + 0.05, CURB, CURB + 4.2, [[0, 0], [1, 0], [1, 1], [0, 1]]);
      this.graffiti(dx + 6, CURB + 0.8, z1, 's', 5);
      this.graffiti(x0, CURB + 1, (z0 + z1) / 2, 'w', 5);
    }
    this.fence(b.ix0, b.iz1, b.cx - 6, b.iz1, 2.4);
    this.fence(b.cx + 6, b.iz1, b.ix1, b.iz1, 2.4);
    this.addInst('dumpster', b.cx + 8, CURB, b.iz1 - 12, 0);
    for (let i = 0; i < 4; i++) this.addInst('tires', b.ix1 - 3 - rng() * 4, CURB, b.iz1 - 4 - rng() * 6);
    this.parkRow(b.ix0 + 5, b.iz1 - 8, 3.2, 0, Math.min(4, Math.floor((W - 20) / 3.2)), 0, 'lot', false);
  }

  park(b, rng) {
    this.gb('grass').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 8);
    // full basketball court
    const g = this.gb('court');
    const cw = 15, cl = 28;
    g.quad([b.cx - cw / 2, CURB + 0.03, b.cz + cl / 2], [b.cx + cw / 2, CURB + 0.03, b.cz + cl / 2], [b.cx + cw / 2, CURB + 0.03, b.cz - cl / 2], [b.cx - cw / 2, CURB + 0.03, b.cz - cl / 2], [0, 1, 0], QUV);
    this.addInst('hoop', b.cx, CURB, b.cz - cl / 2 + 0.6, 0);
    this.addInst('hoop', b.cx, CURB, b.cz + cl / 2 - 0.6, Math.PI);
    this.fence(b.cx - cw / 2 - 1, b.cz - cl / 2 - 1, b.cx + cw / 2 + 1, b.cz - cl / 2 - 1, 3.5);
    this.fence(b.cx - cw / 2 - 1, b.cz + cl / 2 + 1, b.cx + cw / 2 + 1, b.cz + cl / 2 + 1, 3.5);
    // paths
    this.gb('sidewalk').flat(b.ix0, b.ix1, b.cz - 1.2 + 20, b.cz + 1.2 + 20, CURB + 0.02, 6);
    this.gb('sidewalk').flat(b.cx - 1.2 + 18, b.cx + 1.2 + 18, b.iz0, b.iz1, CURB + 0.02, 6);
    for (let i = 0; i < 6; i++) this.addInst('bench', b.cx - 20 + i * 8, CURB, b.cz + 22.5, Math.PI);
    for (let i = 0; i < 16; i++) {
      const x = b.ix0 + 3 + rng() * (b.ix1 - b.ix0 - 6), z = b.iz0 + 3 + rng() * (b.iz1 - b.iz0 - 6);
      if (Math.abs(x - b.cx) < cw / 2 + 3 && Math.abs(z - b.cz) < cl / 2 + 3) continue;
      this.tree(x, z, rng, 1.2);
    }
  }

  parkingLot(b, rng) {
    this.gb('lot').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 9);
    // 4 rows of stalls
    for (let r = 0; r < 4; r++) {
      const z = b.iz0 + 7 + r * 14;
      const yaw = r % 2 ? Math.PI : 0;
      this.parkRow(b.ix0 + 5, z, 2.9, 0, 17, yaw);
    }
    for (let i = 0; i < 4; i++) this.addInst('lotlight', b.ix0 + 10 + i * 13, CURB, b.cz);
    // little booth
    this.building(b.ix1 - 6, b.ix1 - 2, b.iz1 - 4, b.iz1 - 1, 3, { facade: 'stucco', parapet: false });
  }

  homeGarage(b, rng) {
    this.houses(sub(b, b.ix0, b.cx - 6), rng);
    this.gb('lot').flat(b.cx - 6, b.ix1, b.iz0, b.iz1, CURB + 0.012, 9);
    const x0 = b.cx + 2, x1 = b.ix1 - 2, z0 = b.cz - 4, z1 = b.cz + 12;
    this.building(x0, x1, z0, z1, 7, { facade: 'brick', col: [0.7, 0.7, 0.75] });
    this.gb('garageDoor').wall(x0 + 3, z1 + 0.05, x0 + 10, z1 + 0.05, CURB, CURB + 4.5);
    this.gb('garageDoor').wall(x0 + 13, z1 + 0.05, x0 + 20, z1 + 0.05, CURB, CURB + 4.5);
    this.sign('THE SPOT', (x0 + x1) / 2, CURB + 5, z1, 's', 9, 1.9);
    this.graffiti(x1, CURB + 1, (z0 + z1) / 2, 'e', 5);
    this.location('garage', x0 + 6.5, z1 + 5, 's');
    this.spawn = { x: x0 + 13, z: z1 + 11, yaw: Math.PI };
  }

  chopShop(b, rng) {
    this.industrial(sub(b, b.ix0, b.cx - 4), rng);
    this.gb('lot').flat(b.cx - 4, b.ix1, b.iz0, b.iz1, CURB + 0.012, 9);
    const x0 = b.cx, x1 = b.ix1 - 2, z0 = b.iz0 + 3, z1 = b.cz + 8;
    this.building(x0, x1, z0, z1, 9, { facade: 'warehouse', col: [0.75, 0.7, 0.6] });
    this.gb('garageDoor').wall(x0 + 6, z1 + 0.05, x0 + 14, z1 + 0.05, CURB, CURB + 5);
    this.sign('EZ AUTO PARTS', (x0 + x1) / 2, CURB + 6, z1, 's', 10, 2);
    // junk piles: crushed car cubes and tires
    for (let i = 0; i < 6; i++) {
      const c = rgb(rng.pick(['#7a2a1a', '#2a3a5a', '#4a4a4a', '#5a5a2a', '#6a6a70']));
      const bx = b.ix1 - 6 - (i % 3) * 2.2, bz = b.iz1 - 4 - Math.floor(i / 3) * 2.2;
      this.gb('metal').box(bx, bx + 2, CURB, CURB + 1.4 + (i % 2) * 1.4, bz, bz + 2, { col: c });
    }
    this.collider(b.ix1 - 10.6, b.ix1 - 4, b.iz1 - 6.4, b.iz1 - 2, 3);
    for (let i = 0; i < 6; i++) this.addInst('tires', b.cx + 2 + rng() * 4, CURB, b.iz1 - 3 - rng() * 6);
    this.fence(b.cx - 4, b.iz1, b.cx + 4, b.iz1, 2.4);
    this.location('chop', x0 + 10, z1 + 5, 's');
  }

  docks(b, rng) {
    this.gb('lot').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 9);
    const cols = ['#b5372a', '#2a5bb5', '#2f8a4a', '#d98a1c', '#6a6a70', '#8a2a6a', '#1c8a8a', '#e0c020'];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        if (rng() < 0.2) continue;
        const x0 = b.ix0 + 4 + c * 13.5, z0 = b.iz0 + 4 + r * 9;
        const stack = 1 + Math.floor(rng() * 3);
        for (let s = 0; s < stack; s++) {
          this.gb('container').box(x0, x0 + 12, CURB + s * 2.6, CURB + (s + 1) * 2.6, z0, z0 + 2.45, { tileW: 3, tileH: 2.6, col: rgb(rng.pick(cols)) });
        }
        this.collider(x0, x0 + 12, z0, z0 + 2.45, stack * 2.6);
      }
    }
    if (b.bx === 0) {
      // gantry crane
      const m = this.gb('metal');
      const yc = [0.85, 0.6, 0.1];
      const cx = b.cx, cz = b.iz1 - 10;
      for (const [lx, lz] of [[-9, -4], [9, -4], [-9, 4], [9, 4]]) {
        m.box(cx + lx - 0.5, cx + lx + 0.5, CURB, CURB + 28, cz + lz - 0.5, cz + lz + 0.5, { col: yc });
        this.collider(cx + lx - 0.5, cx + lx + 0.5, cz + lz - 0.5, cz + lz + 0.5, 28);
      }
      m.box(cx - 10, cx + 10, CURB + 26, CURB + 28, cz - 5, cz + 5, { col: yc });
      m.box(cx - 1.5, cx + 1.5, CURB + 26, CURB + 28, cz - 5, cz + 30, { col: yc });
    } else {
      this.location('export', b.cx, b.iz1 - 7, 's');
      this.sign('PORT EXPORTS', b.cx, CURB + 5, b.iz1 - 18, 's', 10, 2);
      this.building(b.cx - 8, b.cx + 8, b.iz1 - 26, b.iz1 - 18, 5, { facade: 'stucco', col: [0.9, 0.95, 1] });
    }
  }

  bodyShop(b, rng) {
    this.apartments(sub(b, b.ix0, b.cx - 2), rng);
    this.gb('lot').flat(b.cx - 2, b.ix1, b.iz0, b.iz1, CURB + 0.012, 9);
    const x0 = b.cx + 4, x1 = b.ix1 - 2, z0 = b.cz - 6, z1 = b.cz + 10;
    this.building(x0, x1, z0, z1, 6.5, { facade: 'stucco', col: [1, 0.85, 0.95] });
    this.gb('garageDoor').wall(x0 + 6, z1 + 0.05, x0 + 14, z1 + 0.05, CURB, CURB + 4.6);
    this.sign('FRESH COAT', (x0 + x1) / 2, CURB + 4.8, z1, 's', 8, 1.6);
    this.location('spray', x0 + 10, z1 + 5, 's');
  }

  police(b, rng) {
    this.gb('lot').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 9);
    const x0 = b.ix0 + 4, x1 = b.ix1 - 4, z0 = b.iz0 + 4, z1 = b.cz + 2;
    this.building(x0, x1, z0, z1, 10, { facade: 'office', col: [0.8, 0.85, 0.95] });
    this.sign('POLICE', b.cx, CURB + 6, z1, 's', 8, 2);
    this.addInst('flagpole', b.cx + 12, CURB, z1 + 6);
    this.parkRow(b.cx - 16, b.cz + 12, 3.2, 0, 8, 0, 'police');
    this.fence(b.ix0, b.iz1, b.cx - 7, b.iz1, 2.4);
    this.fence(b.cx + 7, b.iz1, b.ix1, b.iz1, 2.4);
    this.location('police', b.cx, b.iz1 - 2, 's', { passive: true });
  }

  gasStation(b, rng) {
    this.gb('lot').flat(b.ix0, b.ix1, b.iz0, b.iz1, CURB + 0.01, 9);
    // canopy
    const m = this.gb('trim');
    const cx = b.cx - 6, cz = b.cz + 6;
    m.box(cx - 12, cx + 12, CURB + 5, CURB + 6, cz - 7, cz + 7, { col: [0.92, 0.92, 0.95] });
    m.box(cx - 12, cx + 12, CURB + 5.7, CURB + 6.1, cz - 7.1, cz + 7.1, { col: [0.75, 0.08, 0.1] });
    for (const lx of [-8, 0, 8]) {
      m.box(cx + lx - 0.3, cx + lx + 0.3, CURB, CURB + 5, cz - 0.3, cz + 0.3, { col: [0.8, 0.8, 0.82] });
      m.box(cx + lx - 0.6, cx + lx + 0.6, CURB, CURB + 1.6, cz - 2.6, cz - 1.8, { col: [0.75, 0.1, 0.12] });
      m.box(cx + lx - 0.6, cx + lx + 0.6, CURB, CURB + 1.6, cz + 1.8, cz + 2.6, { col: [0.75, 0.1, 0.12] });
      this.collider(cx + lx - 0.6, cx + lx + 0.6, cz - 2.6, cz + 2.6, 2);
      this.addInst('canopylight', cx + lx, CURB + 4.95, cz);
    }
    this.building(b.ix0 + 4, b.ix0 + 22, b.iz0 + 3, b.iz0 + 15, 4.5, { facade: 'stucco', store: false, parapet: false });
    this.sign('PUMP N GO', b.ix0 + 13, CURB + 3, b.iz0 + 15, 's', 8, 1.5);
    this.parkRow(cx - 8, cz - 4.8, 8, 0, 3, Math.PI / 2, 'lot', false);
  }

  tree(x, z, rng, scale = 1) {
    const s = scale * (0.8 + rng() * 0.5);
    this.addInst('trunk', x, CURB, z, rng() * 6, s, s, s);
    const c = new THREE.Color().setHSL(0.22 + rng() * 0.08, 0.45 + rng() * 0.2, 0.18 + rng() * 0.1);
    this.addInst('foliage', x, CURB + 3.2 * s, z, rng() * 6, s * (1 + rng() * 0.3), s, s * (1 + rng() * 0.3), c);
    this.collider(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 4, 'tree');
  }

  blockTrees(b, rng) {
    if (!'HAPC'.includes(b.type)) return;
    // street trees along the sidewalk
    const inset = 1.3;
    for (let a = b.minX + 8; a < b.maxX - 6; a += 14 + rng() * 6) {
      if (rng() < 0.6) this.tree(a, b.minZ + inset, rng, 0.85);
      if (rng() < 0.6) this.tree(a, b.maxZ - inset, rng, 0.85);
    }
  }

  // ------------------------------------------------------------------ roads
  buildRoadMarkings() {
    const y = 0.015;
    const yel = this.gb('lineYellow'), wht = this.gb('lineWhite');
    const seg = (ax, az, bx, bz, off, w, g, dash = 0) => {
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      const fx = dx / L, fz = dz / L, rx = -fz, rz = fx;
      const step = dash ? dash * 2 : L;
      for (let s = 0; s < L - 0.01; s += step) {
        const e = Math.min(L, s + (dash || L));
        const p0x = ax + fx * s + rx * off, p0z = az + fz * s + rz * off;
        const p1x = ax + fx * e + rx * off, p1z = az + fz * e + rz * off;
        g.quad([p0x - rx * w, y, p0z - rz * w], [p0x + rx * w, y, p0z + rz * w], [p1x + rx * w, y, p1z + rz * w], [p1x - rx * w, y, p1z - rz * w], [0, 1, 0]);
      }
    };
    const H = ROAD / 2;
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j < N; j++) {
        // road along Z at x = roadCoord(i), between nodes j and j+1
        const x = roadCoord(i), z0 = roadCoord(j) + H + 3, z1 = roadCoord(j + 1) - H - 3;
        seg(x, z0, x, z1, 0.18, 0.08, yel);
        seg(x, z0, x, z1, -0.18, 0.08, yel);
        seg(x, z0, x, z1, H - 0.5, 0.08, wht);
        seg(x, z0, x, z1, -(H - 0.5), 0.08, wht);
        // road along X at z = roadCoord(i)
        const z = roadCoord(i), x0 = roadCoord(j) + H + 3, x1 = roadCoord(j + 1) - H - 3;
        seg(x0, z, x1, z, 0.18, 0.08, yel);
        seg(x0, z, x1, z, -0.18, 0.08, yel);
        seg(x0, z, x1, z, H - 0.5, 0.08, wht);
        seg(x0, z, x1, z, -(H - 0.5), 0.08, wht);
      }
    }
    // crosswalks + stop lines at every intersection approach
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const cx = roadCoord(i), cz = roadCoord(j);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ox = cx + dx * (H + 1.6), oz = cz + dz * (H + 1.6);
          if (Math.abs(ox) > WORLD.HALF + 1 || Math.abs(oz) > WORLD.HALF + 1) continue;
          const rx = -dz, rz = dx;
          for (let k = -H + 0.8; k < H - 0.5; k += 1.2) {
            const px = ox + rx * k, pz = oz + rz * k;
            const a = 1.4, w = 0.3;
            wht.quad([px - dx * a - rx * w, y, pz - dz * a - rz * w], [px - dx * a + rx * w, y, pz - dz * a + rz * w], [px + dx * a + rx * w, y, pz + dz * a + rz * w], [px + dx * a - rx * w, y, pz + dz * a - rz * w], [0, 1, 0]);
          }
        }
      }
    }
  }

  buildStreetFurniture() {
    const H = ROAD / 2;
    this.lightPoles = [];
    for (const b of this.blocks) {
      // street lights along each block edge, arm reaching over the road
      for (const [side, len] of [['n', b.maxX - b.minX], ['s', b.maxX - b.minX], ['e', b.maxZ - b.minZ], ['w', b.maxZ - b.minZ]]) {
        const [sx, sz] = SIDE[side];
        const count = 2;
        for (let k = 0; k < count; k++) {
          const t = (k + 0.5) / count;
          let x, z;
          if (side === 'n' || side === 's') (x = b.minX + len * t), (z = side === 's' ? b.maxZ - 0.5 : b.minZ + 0.5);
          else (z = b.minZ + len * t), (x = side === 'e' ? b.maxX - 0.5 : b.minX + 0.5);
          const yaw = Math.atan2(sx, sz);
          this.addInst('streetlight', x, CURB, z, yaw);
          this.lightPoles.push({ x: x + sx * 2.6, z: z + sz * 2.6 });
        }
      }
      // hydrants
      if (this.rng() < 0.7) this.addInst('hydrant', b.minX + 2, CURB, b.minZ + 2);
    }
    void H;
  }

  buildPerimeter() {
    const E = WORLD.HALF + ROAD / 2 + 0.6;
    const t = 0.7;
    const wall = this.gb('sidewalk');
    // jersey barriers on west/north/east, quay rail on south
    for (const [x0, x1, z0, z1] of [[-E - t, -E, -E, E], [E, E + t, -E, E], [-E, E, -E - t, -E], [-E, E, E, E + t]]) {
      wall.box(x0, x1, 0, 1.1, z0, z1, { tileW: 6, tileH: 6, col: [0.8, 0.8, 0.78] });
      this.collider(x0, x1, z0, z1, 1.1, 'wall');
    }
    // dirt/grass verge outside the walls
    const g = this.gb('grass');
    g.flat(-E - 400, -E - t, -E - 400, E + 14, 0.02, 8, [0.8, 0.8, 0.7]);
    g.flat(E + t, E + 400, -E - 400, E + 14, 0.02, 8, [0.8, 0.8, 0.7]);
    g.flat(-E - t, E + t, -E - 400, -E - t, 0.02, 8, [0.8, 0.8, 0.7]);
    // distant silhouettes so the horizon isn't empty
    const rng = makeRng(99);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 520 + rng() * 120;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (z > 360) continue; // ocean side
      const w = 20 + rng() * 30, h = 20 + rng() * 70;
      this.gb(rng() < 0.5 ? 'office' : 'glass').box(x - w / 2, x + w / 2, 0, h, z - w / 2, z + w / 2, { tileW: 24, tileH: 28, top: false, col: [0.6, 0.65, 0.7] });
    }
  }

  // ------------------------------------------------------------------ finalize
  flush() {
    const shadowCasters = new Set(['office', 'glass', 'brick', 'projects', 'stucco', 'warehouse', 'siding', 'store', 'shingles', 'trim', 'metal', 'container', 'garageDoor']);
    for (const [name, builder] of Object.entries(this.g)) {
      if (builder.empty) continue;
      const mesh = new THREE.Mesh(builder.build(), this.mats[name]);
      mesh.castShadow = shadowCasters.has(name);
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
    }
    this.g = {};
  }

  buildInstances() {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const poleMat = std({ color: 0x3a3d42, roughness: 0.5, metalness: 0.6 });
    this.lampMat = std({ color: 0xffffff, emissive: 0xffd9a0, emissiveIntensity: 0 });
    this.nightMats.push([this.lampMat, 6, 0.1]);
    const defs = {
      streetlight: [
        [new THREE.CylinderGeometry(0.09, 0.13, 7.5, 8).translate(0, 3.75, 0), poleMat],
        [new THREE.BoxGeometry(0.12, 0.12, 2.8).translate(0, 7.4, 1.35), poleMat],
        [new THREE.BoxGeometry(0.5, 0.18, 0.9).translate(0, 7.3, 2.6), this.lampMat],
      ],
      lotlight: [
        [new THREE.CylinderGeometry(0.12, 0.16, 9, 8).translate(0, 4.5, 0), poleMat],
        [new THREE.BoxGeometry(1.6, 0.25, 0.6).translate(0, 9, 0), this.lampMat],
      ],
      canopylight: [[new THREE.BoxGeometry(1.4, 0.06, 1.4), this.lampMat]],
      utilpole: [
        [new THREE.CylinderGeometry(0.14, 0.18, 10, 6).translate(0, 5, 0), std({ color: 0x4a3626, roughness: 1 })],
        [new THREE.BoxGeometry(2.4, 0.14, 0.14).translate(0, 9.2, 0), std({ color: 0x4a3626, roughness: 1 })],
      ],
      hydrant: [[new THREE.CylinderGeometry(0.16, 0.2, 0.75, 10).translate(0, 0.37, 0), std({ color: 0xc8241c, roughness: 0.5 })]],
      trashcan: [[new THREE.CylinderGeometry(0.3, 0.28, 0.95, 12).translate(0, 0.47, 0), std({ color: 0x2d4a2d, roughness: 0.6, metalness: 0.2 })]],
      dumpster: [[new THREE.BoxGeometry(1.9, 1.3, 1.2).translate(0, 0.65, 0), std({ color: 0x245a34, roughness: 0.55, metalness: 0.3 })]],
      tires: [[new THREE.TorusGeometry(0.33, 0.13, 8, 16).rotateX(Math.PI / 2).translate(0, 0.13, 0), std({ color: 0x151515, roughness: 0.9 })]],
      bench: [
        [new THREE.BoxGeometry(1.8, 0.08, 0.5).translate(0, 0.45, 0), std({ color: 0x6b4a2a, roughness: 0.9 })],
        [new THREE.BoxGeometry(1.8, 0.45, 0.06).translate(0, 0.7, -0.24), std({ color: 0x6b4a2a, roughness: 0.9 })],
      ],
      hoop: [
        [new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8).translate(0, 1.7, -0.9), poleMat],
        [new THREE.BoxGeometry(1.8, 1.05, 0.06).translate(0, 3.4, -0.6), std({ color: 0xf2f2f2, roughness: 0.4 })],
        [new THREE.TorusGeometry(0.23, 0.02, 6, 16).rotateX(Math.PI / 2).translate(0, 3.05, -0.3), std({ color: 0xff5a1f, roughness: 0.5 })],
      ],
      post: [[new THREE.CylinderGeometry(0.035, 0.035, 2.2, 6).translate(0, 1.1, 0), poleMat]],
      tank: [
        [new THREE.CylinderGeometry(2, 2, 3.2, 14).translate(0, 4.6, 0), std({ color: 0x6b4a33, roughness: 0.9 })],
        [new THREE.ConeGeometry(2.2, 1.4, 14).translate(0, 6.9, 0), std({ color: 0x3a2a20, roughness: 0.9 })],
        [new THREE.CylinderGeometry(0.1, 0.1, 3, 6).translate(1.3, 1.5, 1.3), poleMat],
        [new THREE.CylinderGeometry(0.1, 0.1, 3, 6).translate(-1.3, 1.5, -1.3), poleMat],
      ],
      antenna: [[new THREE.CylinderGeometry(0.15, 0.3, 14, 6).translate(0, 7, 0), poleMat]],
      flagpole: [
        [new THREE.CylinderGeometry(0.06, 0.08, 9, 8).translate(0, 4.5, 0), poleMat],
        [new THREE.BoxGeometry(0.02, 1.2, 2).translate(0, 8.2, 1), std({ color: 0x1c3a8a, roughness: 0.8, side: THREE.DoubleSide })],
      ],
      trunk: [[new THREE.CylinderGeometry(0.16, 0.24, 3.2, 7).translate(0, 1.6, 0), std({ color: 0x4a3828, roughness: 1 })]],
      foliage: [[new THREE.IcosahedronGeometry(1.9, 1).scale(1, 0.85, 1), std({ color: 0xffffff, roughness: 0.95, flatShading: true })]],
    };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (const [name, list] of Object.entries(this.inst)) {
      const parts = defs[name];
      if (!parts) continue;
      for (const [geo, mat] of parts) {
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((t, i) => {
          q.setFromEuler(e.set(0, t.ry, 0));
          m4.compose(p.set(t.x, t.y, t.z), q, s.set(t.sx, t.sy, t.sz));
          im.setMatrixAt(i, m4);
          if (t.color) im.setColorAt(i, t.color);
        });
        im.castShadow = name !== 'canopylight' && name !== 'post';
        im.receiveShadow = true;
        im.computeBoundingSphere();
        this.group.add(im);
      }
    }
    // pools of light under street lamps (visible at night)
    const poolGeo = new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2);
    this.poolMat = new THREE.MeshBasicMaterial({ map: T.radial(), color: 0xffc88a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
    const pools = new THREE.InstancedMesh(poolGeo, this.poolMat, this.lightPoles.length);
    this.lightPoles.forEach((lp, i) => {
      m4.makeTranslation(lp.x, 0.03, lp.z);
      pools.setMatrixAt(i, m4);
    });
    pools.renderOrder = 2;
    this.group.add(pools);
    this.inst = {};
  }

  /** Called each frame with night factor 0..1. */
  setNight(n) {
    for (const [m, max, min = 0] of this.nightMats) m.emissiveIntensity = min + (max - min) * n;
    this.poolMat.opacity = n * 0.55;
  }
}

/** A sub-rectangle of a block (x range only) with its own centre. */
function sub(b, ix0, ix1) {
  return { ...b, ix0, ix1, cx: (ix0 + ix1) / 2 };
}

function norm(v) {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

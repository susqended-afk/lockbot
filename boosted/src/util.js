import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const TAU = Math.PI * 2;

/** Shortest signed angle from a to b. */
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function dampAngle(a, b, lambda, dt) {
  return a + angleDiff(a, b) * (1 - Math.exp(-lambda * dt));
}

/** Small deterministic RNG (mulberry32) so the city is the same every run. */
export function makeRng(seed = 1) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rnd.range = (a, b) => a + (b - a) * rnd();
  rnd.int = (a, b) => Math.floor(a + (b - a + 1) * rnd());
  rnd.pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  rnd.chance = (p) => rnd() < p;
  return rnd;
}

export const rand = makeRng((Date.now() % 100000) + 7);

export function weightedPick(rng, entries) {
  // entries: [[item, weight], ...]
  let total = 0;
  for (const [, w] of entries) total += w;
  let r = rng() * total;
  for (const [item, w] of entries) {
    r -= w;
    if (r <= 0) return item;
  }
  return entries[entries.length - 1][0];
}

export const fmtMoney = (n) => '$' + Math.round(n).toLocaleString('en-US');

/**
 * Merge geometries that may differ in indexing / attribute sets.
 * Keeps position + normal (+ uv, + color when requested).
 */
export function mergeGeos(geos, { uv = true, color = false } = {}) {
  const prepared = [];
  for (let g of geos) {
    if (!g) continue;
    if (g.index) g = g.toNonIndexed();
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', g.getAttribute('position'));
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    out.setAttribute('normal', g.getAttribute('normal'));
    if (uv) {
      const a = g.getAttribute('uv');
      out.setAttribute('uv', a || new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    }
    if (color) {
      const a = g.getAttribute('color');
      if (a) out.setAttribute('color', a);
      else {
        const c = new Float32Array(g.getAttribute('position').count * 3).fill(1);
        out.setAttribute('color', new THREE.BufferAttribute(c, 3));
      }
    }
    prepared.push(out);
  }
  if (!prepared.length) return null;
  return mergeGeometries(prepared, false);
}

/** Paint every vertex of a geometry with one color (for vertex-colored merged meshes). */
export function tint(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Point-in-AABB on the ground plane. */
export const inBox = (x, z, b, pad = 0) => x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad;

export function hexToCss(hex) {
  return '#' + new THREE.Color(hex).getHexString();
}

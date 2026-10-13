// Accumulates triangles for one material so a whole district merges into a single draw call.
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();
const _c = new THREE.Color();

export class GeoBuilder {
  constructor() {
    this.p = [];
    this.n = [];
    this.u = [];
    this.c = [];
  }

  get empty() {
    return this.p.length === 0;
  }

  vert(x, y, z, nx, ny, nz, u, v, col) {
    this.p.push(x, y, z);
    this.n.push(nx, ny, nz);
    this.u.push(u, v);
    this.c.push(col[0], col[1], col[2]);
  }

  /** a,b,c,d are [x,y,z], counter-clockwise seen from the front. */
  quad(a, b, c, d, n, uv = QUV, col = WHITE) {
    this.vert(...a, ...n, ...uv[0], col);
    this.vert(...b, ...n, ...uv[1], col);
    this.vert(...c, ...n, ...uv[2], col);
    this.vert(...a, ...n, ...uv[0], col);
    this.vert(...c, ...n, ...uv[2], col);
    this.vert(...d, ...n, ...uv[3], col);
  }

  tri(a, b, c, n, uv, col = WHITE) {
    this.vert(...a, ...n, ...uv[0], col);
    this.vert(...b, ...n, ...uv[1], col);
    this.vert(...c, ...n, ...uv[2], col);
  }

  /**
   * Axis-aligned box. opts:
   *  tileW/tileH: metres per texture repeat on the sides, uOff/vOff offsets,
   *  topTile: metres per repeat on the top (world-aligned), top/bottom/sides flags, col.
   */
  box(x0, x1, y0, y1, z0, z1, o = {}) {
    const col = o.col || WHITE;
    const tw = o.tileW || 1, th = o.tileH || 1, uo = o.uOff || 0, vo = o.vOff || 0;
    if (o.sides !== false) {
      const faces = [
        [[x0, z1], [x1, z1], [0, 0, 1]],
        [[x1, z0], [x0, z0], [0, 0, -1]],
        [[x1, z1], [x1, z0], [1, 0, 0]],
        [[x0, z0], [x0, z1], [-1, 0, 0]],
      ];
      for (const [p0, p1, n] of faces) {
        const w = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        const u1 = uo + w / tw, v1 = vo + (y1 - y0) / th;
        this.quad([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], n, [[uo, vo], [u1, vo], [u1, v1], [uo, v1]], col);
      }
    }
    if (o.top !== false) {
      const t = o.topTile || tw;
      this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0],
        [[x0 / t, z1 / t], [x1 / t, z1 / t], [x1 / t, z0 / t], [x0 / t, z0 / t]], o.topCol || col);
    }
    if (o.bottom) {
      this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], QUV, col);
    }
  }

  /** Flat horizontal quad (world-aligned UVs). */
  flat(x0, x1, z0, z1, y, tile = 1, col = WHITE) {
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0],
      [[x0 / tile, z1 / tile], [x1 / tile, z1 / tile], [x1 / tile, z0 / tile], [x0 / tile, z0 / tile]], col);
  }

  /** Vertical quad from (ax,az) to (bx,bz); its normal is (-dz, 0, dx), e.g. a wall running +X faces +Z. */
  wall(ax, az, bx, bz, y0, y1, uv = QUV, col = WHITE, doubleSided = false) {
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz) || 1;
    const n = [-dz / len, 0, dx / len];
    this.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], n, uv, col);
    if (doubleSided) this.quad([bx, y0, bz], [ax, y0, az], [ax, y1, az], [bx, y1, bz], [-n[0], 0, -n[2]], [uv[1], uv[0], uv[3], uv[2]], col);
  }

  /** Append any BufferGeometry transformed by matrix. */
  geometry(geo, matrix, color = WHITE) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal'), uv = g.getAttribute('uv');
    _m3.getNormalMatrix(matrix);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
      _n.fromBufferAttribute(nor, i).applyMatrix3(_m3).normalize();
      this.p.push(_v.x, _v.y, _v.z);
      this.n.push(_n.x, _n.y, _n.z);
      if (uv) this.u.push(uv.getX(i), uv.getY(i));
      else this.u.push(0, 0);
      this.c.push(color[0], color[1], color[2]);
    }
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export const QUV = [[0, 0], [1, 0], [1, 1], [0, 1]];
export const WHITE = [1, 1, 1];
export const rgb = (hex) => {
  _c.set(hex);
  return [_c.r, _c.g, _c.b];
};

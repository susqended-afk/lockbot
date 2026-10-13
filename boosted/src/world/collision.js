// Static collision world: axis-aligned boxes on the ground plane, bucketed in a spatial hash.

export class CollisionWorld {
  constructor(cell = 16) {
    this.cell = cell;
    this.boxes = [];
    this.grid = new Map();
    this.stamp = 0;
  }

  key(ix, iz) {
    return ix * 73856093 ^ iz * 19349663;
  }

  /** box: {minX,maxX,minZ,maxZ,h} */
  add(box) {
    box.id = this.boxes.length;
    box.h = box.h ?? 10;
    box._s = 0;
    this.boxes.push(box);
    const c = this.cell;
    for (let ix = Math.floor(box.minX / c); ix <= Math.floor(box.maxX / c); ix++) {
      for (let iz = Math.floor(box.minZ / c); iz <= Math.floor(box.maxZ / c); iz++) {
        const k = this.key(ix, iz);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(box);
      }
    }
    return box;
  }

  /** All boxes overlapping a circle's bounding square. */
  query(x, z, r, out = []) {
    out.length = 0;
    const c = this.cell;
    const s = ++this.stamp;
    for (let ix = Math.floor((x - r) / c); ix <= Math.floor((x + r) / c); ix++) {
      for (let iz = Math.floor((z - r) / c); iz <= Math.floor((z + r) / c); iz++) {
        const list = this.grid.get(this.key(ix, iz));
        if (!list) continue;
        for (const b of list) {
          if (b._s === s) continue;
          b._s = s;
          if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) out.push(b);
        }
      }
    }
    return out;
  }

  /**
   * Push a circle out of any boxes. Returns {hit, nx, nz, depth} for the deepest contact (or null).
   */
  resolveCircle(p, r) {
    const boxes = this.query(p.x, p.z, r, this._q || (this._q = []));
    let best = null;
    for (const b of boxes) {
      const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      let dx = p.x - cx, dz = p.z - cz;
      let d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      let nx, nz, depth;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        nx = dx / d;
        nz = dz / d;
        depth = r - d;
      } else {
        // centre inside the box: push out along the shallowest axis
        const l = p.x - b.minX, rr = b.maxX - p.x, t = p.z - b.minZ, bt = b.maxZ - p.z;
        const m = Math.min(l, rr, t, bt);
        if (m === l) (nx = -1), (nz = 0), (depth = l + r);
        else if (m === rr) (nx = 1), (nz = 0), (depth = rr + r);
        else if (m === t) (nx = 0), (nz = -1), (depth = t + r);
        else (nx = 0), (nz = 1), (depth = bt + r);
      }
      p.x += nx * depth;
      p.z += nz * depth;
      if (!best || depth > best.depth) best = { nx, nz, depth, box: b };
    }
    return best;
  }

  /** Line of sight between two ground points (true if clear). */
  lineOfSight(ax, az, bx, bz, minH = 2) {
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    const steps = Math.ceil(len / (this.cell * 0.5));
    const s = ++this.stamp;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = ax + dx * t, z = az + dz * t;
      const list = this.grid.get(this.key(Math.floor(x / this.cell), Math.floor(z / this.cell)));
      if (!list) continue;
      for (const b of list) {
        if (b._s === s || b.h < minH) continue;
        b._s = s;
        if (segBox(ax, az, bx, bz, b)) return false;
      }
    }
    return true;
  }

  /** Ray-march along a segment and return the first fraction (0..1) that hits a box, for camera collision. */
  segmentFraction(ax, az, bx, bz, pad = 0.3) {
    let best = 1;
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    const boxes = this.query((ax + bx) / 2, (az + bz) / 2, len / 2 + pad, []);
    for (const b of boxes) {
      const t = slab(ax, az, dx, dz, b.minX - pad, b.maxX + pad, b.minZ - pad, b.maxZ + pad);
      if (t !== null && t < best) best = t;
    }
    return best;
  }
}

function slab(ax, az, dx, dz, minX, maxX, minZ, maxZ) {
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (ax < minX || ax > maxX) return null;
  } else {
    let t1 = (minX - ax) / dx, t2 = (maxX - ax) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (Math.abs(dz) < 1e-9) {
    if (az < minZ || az > maxZ) return null;
  } else {
    let t1 = (minZ - az) / dz, t2 = (maxZ - az) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

function segBox(ax, az, bx, bz, b) {
  return slab(ax, az, bx - ax, bz - az, b.minX, b.maxX, b.minZ, b.maxZ) !== null;
}

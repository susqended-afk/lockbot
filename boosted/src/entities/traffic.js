// Spawns/despawns parked cars, traffic and police around the player; drives AI; resolves car-car contacts.
import { WORLD, CARS, CIVILIAN_CARS, defaultUpgrades, roadCoord } from '../config.js';
import { Vehicle } from './vehicle.js';
import { angleDiff, clamp, weightedPick, rand } from '../util.js';

const { N, ROAD, LANE } = WORLD;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class VehicleManager {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.spots = game.city.parkingSpots.map((s, i) => ({ ...s, i, car: null, next: 0 }));
    this.trafficTarget = 22;
    this.spawnTimer = 0;
  }

  get traffic() {
    return this.list.filter((v) => v.role === 'traffic');
  }
  get cops() {
    return this.list.filter((v) => v.role === 'police');
  }

  pickSpec(forParking = false) {
    const bias = new Set((this.game.contracts?.list || []).map((c) => c.spec));
    const entries = CIVILIAN_CARS.map((k) => [k, CARS[k].rarity * (bias.has(k) ? (forParking ? 4 : 2) : 1)]);
    return weightedPick(rand, entries);
  }

  add(specId, opts, up) {
    const v = new Vehicle(this.game, specId, up || defaultUpgrades(specId, rand), opts);
    this.list.push(v);
    return v;
  }

  remove(v) {
    v.destroy();
    const i = this.list.indexOf(v);
    if (i >= 0) this.list.splice(i, 1);
    if (v.spot) {
      v.spot.car = null;
      v.spot = null;
    }
  }

  // ---------------------------------------------------------------- spawning
  update(dt) {
    const g = this.game;
    const p = g.player.focus;
    this.spawnTimer -= dt;
    // parked cars stream in/out
    for (const s of this.spots) {
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (!s.car && d < 115 && d > 25 && g.time >= s.next) {
        if (s.kind === 'police') {
          s.car = this.add('interceptor', { x: s.x, z: s.z, yaw: s.yaw, role: 'parked' });
        } else if (rand() < (s.kind === 'driveway' ? 0.45 : 0.55)) {
          s.car = this.add(this.pickSpec(true), { x: s.x, z: s.z, yaw: s.yaw, role: 'parked', health: 0.75 + rand() * 0.25 });
        } else {
          s.next = g.time + 60; // leave empty for a while
          continue;
        }
        s.car.spot = s;
        s.car.pos.y = 0.15;
      } else if (s.car && d > 140 && s.car.role === 'parked') {
        this.remove(s.car);
        s.next = g.time + 5;
      }
    }

    // traffic
    const traffic = this.list.filter((v) => v.role === 'traffic');
    for (const v of traffic) {
      if (v.pos.distanceTo(p) > 230) this.remove(v);
    }
    if (this.spawnTimer <= 0 && traffic.length < this.trafficTarget) {
      this.spawnTimer = 0.15;
      this.spawnTraffic(p);
    }

    // police
    const wanted = g.wanted.level;
    const cops = this.list.filter((v) => v.role === 'police');
    const want = wanted > 0 ? Math.min(7, 1 + wanted + (wanted >= 4 ? 1 : 0)) : 0;
    if (cops.filter((c) => c.pursuit).length < want && this.spawnTimer <= 0) {
      // recruit a nearby patrol first
      const patrol = cops.find((c) => !c.pursuit && c.pos.distanceTo(p) < 150);
      if (patrol) this.startPursuit(patrol);
      else this.spawnCop(p, true);
      this.spawnTimer = 0.6;
    }
    for (const c of cops) {
      if (c.pursuit && wanted === 0) {
        c.pursuit = false;
        c.siren = false;
        c.route = null;
      }
      if (!c.pursuit && c.pos.distanceTo(p) > 230) this.remove(c);
    }

    // abandoned / player-owned cars far away
    for (const v of this.list.slice()) {
      if (v.role === 'abandoned' && v.pos.distanceTo(p) > 260) {
        if (v.owned) g.onOwnedCarLost?.(v);
        this.remove(v);
      }
    }
  }

  spawnTraffic(p, police = false) {
    // pick a random road edge 70-200 m away
    for (let tries = 0; tries < 8; tries++) {
      const i = Math.floor(rand() * (N + 1)), j = Math.floor(rand() * (N + 1));
      const [dx, dz] = DIRS[Math.floor(rand() * 4)];
      const ni = i + dx, nj = j + dz;
      if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
      const t = 0.25 + rand() * 0.5;
      const ax = roadCoord(i), az = roadCoord(j), bx = roadCoord(ni), bz = roadCoord(nj);
      const x = ax + (bx - ax) * t - dz * LANE, z = az + (bz - az) * t + dx * LANE;
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < 70 || d > 200) continue;
      if (this.list.some((v) => Math.hypot(v.pos.x - x, v.pos.z - z) < 12)) continue;
      const isCop = police || rand() < 0.07;
      const spec = isCop ? 'interceptor' : this.pickSpec();
      const v = this.add(spec, { x, z, yaw: Math.atan2(dx, dz), role: isCop ? 'police' : 'traffic' });
      v.locked = true;
      v.route = { from: [i, j], to: [ni, nj], dir: [dx, dz], wps: [], k: 0 };
      this.planTurn(v);
      v.vel.set(dx * 9, dz * 9);
      return v;
    }
    return null;
  }

  spawnCop(p, pursuit) {
    const v = this.spawnTraffic(p, true);
    if (v && pursuit) this.startPursuit(v);
    return v;
  }

  startPursuit(c) {
    c.pursuit = true;
    c.siren = true;
    c.stuck = 0;
  }

  // ---------------------------------------------------------------- AI
  /** Append waypoints to go through the next intersection and on to the following one. */
  planTurn(v) {
    const r = v.route;
    const [i, j] = r.to;
    const [dx, dz] = r.dir;
    const opts = DIRS.filter(([ex, ez]) => !(ex === -dx && ez === -dz) && i + ex >= 0 && i + ex <= N && j + ez >= 0 && j + ez <= N);
    let nd;
    if (!opts.length) nd = [-dx, -dz];
    else {
      const straight = opts.find(([ex, ez]) => ex === dx && ez === dz);
      nd = straight && rand() < 0.55 ? straight : opts[Math.floor(rand() * opts.length)];
    }
    const cx = roadCoord(i), cz = roadCoord(j);
    const H = ROAD / 2 + 2;
    r.wps = [
      [cx - dz * LANE - dx * H, cz + dx * LANE - dz * H],
      [cx - nd[1] * LANE + nd[0] * H, cz + nd[0] * LANE + nd[1] * H],
    ];
    if (nd[0] !== dx || nd[1] !== dz) {
      // corner point for smoother turns
      const mx = (r.wps[0][0] + r.wps[1][0]) / 2, mz = (r.wps[0][1] + r.wps[1][1]) / 2;
      const kx = cx - dz * LANE - nd[1] * LANE, kz = cz + dx * LANE + nd[0] * LANE;
      r.wps.splice(1, 0, [(mx + kx) / 2, (mz + kz) / 2]);
    }
    r.k = 0;
    r.turning = nd[0] !== dx || nd[1] !== dz;
    r.next = { from: [i, j], to: [i + nd[0], j + nd[1]], dir: nd };
  }

  driveTraffic(v, dt) {
    const r = v.route;
    if (!r) return;
    const c = v.ctrl;
    let [tx, tz] = r.wps[r.k] || r.wps[r.wps.length - 1];
    if (Math.hypot(tx - v.pos.x, tz - v.pos.z) < 4.5) {
      r.k++;
      if (r.k >= r.wps.length) {
        Object.assign(r, r.next);
        this.planTurn(v);
      }
      [tx, tz] = r.wps[r.k];
    }
    const desired = Math.atan2(tx - v.pos.x, tz - v.pos.z);
    const err = angleDiff(v.yaw, desired);
    c.steer = clamp(-err * 2.4, -1, 1);
    let want = (v.cruise || 11.5) * (Math.abs(err) > 0.3 ? 0.55 : 1);
    if (r.turning && r.k === 0 && Math.hypot(tx - v.pos.x, tz - v.pos.z) < 18) want = Math.min(want, 6.5);
    const block = this.obstacleAhead(v, 15);
    if (block < 15) want = Math.min(want, Math.max(0, (block - 5) * 1.3));
    if (v.panic > 0) {
      v.panic -= dt;
      want *= 1.6;
    }
    if (block < 7) v.honk = (v.honk || 0) + dt;
    this.speedControl(v, want);
    c.handbrake = false;
  }

  speedControl(v, want) {
    const c = v.ctrl;
    if (v.vF < want - 0.5) {
      c.throttle = clamp((want - v.vF) / 4, 0.25, 1);
      c.brake = 0;
    } else if (v.vF > want + 1) {
      c.throttle = 0;
      c.brake = clamp((v.vF - want) / 4, 0.2, 1);
    } else {
      c.throttle = 0.15;
      c.brake = 0;
    }
  }

  /** Distance to the nearest car/person in a cone in front of v (or Infinity). */
  obstacleAhead(v, range) {
    const [fx, fz] = v.forward;
    let best = Infinity;
    const g = this.game;
    const test = (x, z, rad) => {
      const dx = x - v.pos.x, dz = z - v.pos.z;
      const f = dx * fx + dz * fz;
      if (f <= 0 || f > range) return;
      const lat = Math.abs(dx * fz - dz * fx);
      if (lat < 1.6 + rad) best = Math.min(best, f - v.L / 2);
    };
    for (const o of this.list) if (o !== v) test(o.pos.x, o.pos.z, o.W / 2);
    if (!g.player.inCar) test(g.player.pos.x, g.player.pos.z, 0.4);
    for (const ped of g.peds.list) if (!ped.down) test(ped.pos.x, ped.pos.z, 0.3);
    return best;
  }

  drivePolice(v, dt) {
    const g = this.game;
    const tgt = g.player.focus;
    const pv = g.player.inCar ? g.player.car.vel : { x: 0, y: 0 };
    const c = v.ctrl;
    const dist = Math.hypot(tgt.x - v.pos.x, tgt.z - v.pos.z);
    let tx, tz;
    const los = dist < 60 && g.city.col.lineOfSight(v.pos.x, v.pos.z, tgt.x, tgt.z, 1.5);
    if (los) {
      tx = tgt.x + pv.x * 0.5;
      tz = tgt.z + pv.y * 0.5;
      v.route = null;
    } else {
      // navigate the grid toward the player's nearest intersection
      if (!v.route || g.time > v.route.until || Math.hypot(v.route.x - v.pos.x, v.route.z - v.pos.z) < 7) {
        const [ci, cj] = g.city.nearestNode(v.pos.x, v.pos.z);
        const [pi, pj] = g.city.nearestNode(tgt.x, tgt.z);
        let ni = ci, nj = cj;
        const atNode = Math.hypot(roadCoord(ci) - v.pos.x, roadCoord(cj) - v.pos.z) < 9;
        if (atNode || (ci === pi && cj === pj)) {
          // step one node toward the player along the larger axis gap
          const di = Math.sign(pi - ci), dj = Math.sign(pj - cj);
          if (Math.abs(pi - ci) >= Math.abs(pj - cj) && di) ni += di;
          else if (dj) nj += dj;
          else if (di) ni += di;
        }
        v.route = { x: roadCoord(ni), z: roadCoord(nj), until: g.time + 3 };
      }
      tx = v.route.x;
      tz = v.route.z;
    }
    const desired = Math.atan2(tx - v.pos.x, tz - v.pos.z);
    let err = angleDiff(v.yaw, desired);
    // stuck recovery: reverse with opposite lock
    v.stuck = v.stuck || 0;
    if (v.reverseT > 0) {
      v.reverseT -= dt;
      c.throttle = 0;
      c.brake = 1;
      c.steer = clamp(err * 2, -1, 1);
      c.handbrake = false;
      return;
    }
    if (Math.abs(v.vF) < 1.2 && dist > 8) v.stuck += dt;
    else v.stuck = Math.max(0, v.stuck - dt);
    if (v.stuck > 1.6) {
      v.stuck = 0;
      v.reverseT = 1.1;
    }
    c.steer = clamp(-err * 2.8, -1, 1);
    const fast = v.top * (los ? 0.95 : 0.8);
    let want = Math.abs(err) > 0.9 ? 9 : fast;
    if (dist < 10 && Math.hypot(pv.x, pv.y) < 3) want = 3; // box the player in
    this.speedControl(v, want);
    c.handbrake = Math.abs(err) > 1.1 && v.vF > 12;
    if (Math.abs(err) > 2.4 && dist < 25) {
      c.throttle = 0;
      c.brake = 1; // target behind: back up and turn
    }
  }

  // ---------------------------------------------------------------- simulation
  step(dt) {
    for (const v of this.list) {
      if (v.role === 'traffic' && v.driver === 'npc') this.driveTraffic(v, dt);
      else if (v.role === 'police' && v.driver === 'cop') {
        if (v.pursuit) this.drivePolice(v, dt);
        else this.driveTraffic(v, dt);
      }
      v.step(dt);
    }
    this.collidePairs();
  }

  collidePairs() {
    const L = this.list;
    for (let a = 0; a < L.length; a++) {
      const A = L[a];
      for (let b = a + 1; b < L.length; b++) {
        const B = L[b];
        const dx = A.pos.x - B.pos.x, dz = A.pos.z - B.pos.z;
        const lim = (A.L + B.L) / 2;
        if (dx * dx + dz * dz > lim * lim) continue;
        this.collideCars(A, B);
      }
    }
  }

  collideCars(A, B) {
    const [afx, afz] = A.forward, [bfx, bfz] = B.forward;
    for (const sa of [1, -1]) {
      for (const sb of [1, -1]) {
        const ax = A.pos.x + afx * A.circleOff * sa, az = A.pos.z + afz * A.circleOff * sa;
        const bx = B.pos.x + bfx * B.circleOff * sb, bz = B.pos.z + bfz * B.circleOff * sb;
        let nx = ax - bx, nz = az - bz;
        const d = Math.hypot(nx, nz);
        const rr = A.r + B.r - 0.1;
        if (d >= rr || d < 1e-6) continue;
        nx /= d;
        nz /= d;
        const pen = rr - d;
        const ma = A.driver ? A.mass : A.mass * 1.5, mb = B.driver ? B.mass : B.mass * 1.5;
        const ka = mb / (ma + mb), kb = ma / (ma + mb);
        A.pos.x += nx * pen * ka;
        A.pos.z += nz * pen * ka;
        B.pos.x -= nx * pen * kb;
        B.pos.z -= nz * pen * kb;
        const vn = (A.vel.x - B.vel.x) * nx + (A.vel.y - B.vel.y) * nz;
        if (vn >= 0) continue;
        const j = (-(1 + 0.3) * vn) / (1 / ma + 1 / mb);
        const dva = j / ma, dvb = j / mb;
        A.vel.x += nx * dva;
        A.vel.y += nz * dva;
        B.vel.x -= nx * dvb;
        B.vel.y -= nz * dvb;
        const IA = (A.L * A.L + A.W * A.W) / 12, IB = (B.L * B.L + B.W * B.W) / 12;
        const rax = afx * A.circleOff * sa, raz = afz * A.circleOff * sa;
        const rbx = bfx * B.circleOff * sb, rbz = bfz * B.circleOff * sb;
        A.angVel = clamp(A.angVel + ((raz * nx - rax * nz) * dva) / IA * 0.5, -4, 4);
        B.angVel = clamp(B.angVel - ((rbz * nx - rbx * nz) * dvb) / IB * 0.5, -4, 4);
        A.damage(-vn * (mb / (ma + mb)) * 1.4);
        B.damage(-vn * (ma / (ma + mb)) * 1.4);
        this.game.onCarCrash?.(A, B, -vn);
      }
    }
  }

  updateVisuals(dt, night) {
    for (const v of this.list) {
      if (v.alarm > 0) v.alarm -= dt;
      v.updateVisual(dt, night);
    }
  }
}

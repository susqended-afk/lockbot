// Pedestrians walking the sidewalks around the player; they dodge, get knocked over, and flee.
import * as THREE from 'three';
import { CharacterModel } from './characterModel.js';
import { randomCharacter, WORLD } from '../config.js';
import { rand, dampAngle, angleDiff } from '../util.js';

class Ped {
  constructor(game, look) {
    this.game = game;
    this.model = new CharacterModel(look);
    game.scene.add(this.model.root);
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.speed = 1.4;
    this.down = 0;
    this.flee = 0;
    this.fleeFrom = null;
    this.vel = new THREE.Vector2();
    this.vy = 0;
    this.fallYaw = 0;
  }

  placeOnBlock(b, t) {
    this.block = b;
    const i = 1.7;
    this.ring = [
      [b.minX + i, b.minZ + i], [b.maxX - i, b.minZ + i], [b.maxX - i, b.maxZ - i], [b.minX + i, b.maxZ - i],
    ];
    this.dir = rand() < 0.5 ? 1 : -1;
    const k = Math.floor(t * 4) % 4;
    const a = this.ring[k], c = this.ring[(k + 1) % 4];
    const f = (t * 4) % 1;
    this.pos.set(a[0] + (c[0] - a[0]) * f, 0.15, a[1] + (c[1] - a[1]) * f);
    this.k = this.dir > 0 ? (k + 1) % 4 : k;
    this.down = 0;
    this.flee = 0;
    this.model.root.rotation.set(0, 0, 0);
  }

  update(dt) {
    const g = this.game;
    const m = this.model.root;
    if (this.down > 0) {
      this.down -= dt;
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.y * dt;
      this.vel.multiplyScalar(Math.exp(-3 * dt));
      this.vy -= 14 * dt;
      this.pos.y = Math.max(g.city.groundHeight(this.pos.x, this.pos.z), this.pos.y + this.vy * dt);
      const p = { x: this.pos.x, z: this.pos.z };
      g.city.col.resolveCircle(p, 0.3);
      this.pos.x = p.x;
      this.pos.z = p.z;
      m.position.copy(this.pos);
      m.rotation.set(-Math.PI / 2 * Math.min(1, (4 - this.down) * 3), this.fallYaw, 0, 'YXZ');
      m.position.y += 0.15;
      if (this.down <= 0) {
        m.rotation.set(0, 0, 0);
        this.flee = 6;
        this.fleeFrom = g.player.focus.clone();
      }
      this.model.update(dt, { speed: 0, knocked: true });
      return;
    }
    let tx, tz, speed;
    if (this.flee > 0) {
      this.flee -= dt;
      const away = Math.atan2(this.pos.x - this.fleeFrom.x, this.pos.z - this.fleeFrom.z);
      tx = this.pos.x + Math.sin(away) * 10;
      tz = this.pos.z + Math.cos(away) * 10;
      speed = 6.2;
    } else {
      const [wx, wz] = this.ring[this.k];
      if (Math.hypot(wx - this.pos.x, wz - this.pos.z) < 0.8) this.k = (this.k + this.dir + 4) % 4;
      [tx, tz] = this.ring[this.k];
      speed = this.speed;
    }
    const desired = Math.atan2(tx - this.pos.x, tz - this.pos.z);
    this.yaw = dampAngle(this.yaw, desired, 6, dt);
    this.pos.x += Math.sin(this.yaw) * speed * dt;
    this.pos.z += Math.cos(this.yaw) * speed * dt;
    const p = { x: this.pos.x, z: this.pos.z };
    g.city.col.resolveCircle(p, 0.3);
    this.pos.x = p.x;
    this.pos.z = p.z;
    this.pos.y = g.city.groundHeight(this.pos.x, this.pos.z);

    // threats: fast cars nearby -> dodge / get hit
    for (const v of g.vehicles.list) {
      const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z;
      if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue;
      const sp = v.speed;
      if (v.contains(this.pos.x, this.pos.z, 0.3) && sp > 3.5) {
        this.knockDown(v);
        return;
      }
      if (sp > 8 && v.contains(this.pos.x, this.pos.z, 2.5) && this.flee <= 0) {
        // dive out of the way, sideways relative to the car
        const side = angleDiff(v.yaw, Math.atan2(dx, dz)) > 0 ? 1 : -1;
        const lx = Math.cos(v.yaw) * side, lz = -Math.sin(v.yaw) * side;
        this.pos.x += lx * 2.2 * dt * 8;
        this.pos.z += lz * 2.2 * dt * 8;
      }
    }
    m.position.copy(this.pos);
    m.rotation.set(0, this.yaw, 0);
    this.model.update(dt, { speed });
  }

  knockDown(v) {
    this.down = 4;
    this.vel.set(v.vel.x * 0.6, v.vel.y * 0.6);
    this.vy = Math.min(6, v.speed * 0.25);
    this.fallYaw = v.yaw;
    this.game.audio.impact(0.5);
    this.game.onPedHit?.(this, v);
  }

  remove() {
    this.game.scene.remove(this.model.root);
  }
}

export class PedManager {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.max = 10;
  }

  /** Spawn a ped that just got pulled out of a car and runs away. */
  spawnFleeing(x, z, from) {
    const p = new Ped(this.game, randomCharacter(rand));
    const b = this.game.city.blockAt(x, z) || this.nearestBlock(x, z);
    p.placeOnBlock(b, rand());
    p.pos.set(x, 0, z);
    p.flee = 8;
    p.fleeFrom = from.clone();
    this.list.push(p);
  }

  nearestBlock(x, z) {
    let best = null, bd = Infinity;
    for (const b of this.game.city.blocks) {
      const d = Math.hypot(b.cx - x, b.cz - z);
      if (d < bd) (bd = d), (best = b);
    }
    return best;
  }

  update(dt) {
    const g = this.game;
    const p = g.player.focus;
    for (const ped of this.list.slice()) {
      if (ped.pos.distanceTo(p) > 110) {
        ped.remove();
        this.list.splice(this.list.indexOf(ped), 1);
      }
    }
    if (this.list.length < this.max) {
      // spawn on a block 35-90 m away
      const cands = g.city.blocks.filter((b) => {
        const d = Math.hypot(b.cx - p.x, b.cz - p.z);
        return d > 35 && d < 95 && b.type !== 'E' && b.type !== 'I';
      });
      if (cands.length) {
        const ped = new Ped(g, randomCharacter(rand));
        ped.placeOnBlock(cands[Math.floor(rand() * cands.length)], rand());
        ped.speed = 1.2 + rand() * 0.6;
        this.list.push(ped);
      }
    }
    for (const ped of this.list) ped.update(dt);
  }

  scare(x, z, radius = 25) {
    for (const ped of this.list) {
      if (ped.down > 0) continue;
      if (Math.hypot(ped.pos.x - x, ped.pos.z - z) < radius) {
        ped.flee = 6;
        ped.fleeFrom = new THREE.Vector3(x, 0, z);
      }
    }
  }
}

export const PED_WORLD = WORLD;

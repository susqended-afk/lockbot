// The player: on-foot movement, stealing/entering cars, and driving input.
import * as THREE from 'three';
import { CharacterModel } from './characterModel.js';
import { clamp, damp, dampAngle } from '../util.js';
import { CARS } from '../config.js';

export class Player {
  constructor(game, look) {
    this.game = game;
    this.model = new CharacterModel(look);
    game.scene.add(this.model.root);
    const sp = game.city.spawn;
    this.pos = new THREE.Vector3(sp.x, 0.15, sp.z);
    this.yaw = sp.yaw;
    this.vy = 0;
    this.speed = 0;
    this.vel = new THREE.Vector2();
    this.grounded = true;
    this.inCar = false;
    this.car = null;
    this.pick = null; // { car, t, dur }
    this.focus = new THREE.Vector3().copy(this.pos);
    this.prompt = null;
    this.knock = 0;
  }

  setLook(look) {
    this.model.build(look);
  }

  // ---------------------------------------------------------------- per-frame
  update(dt, input) {
    if (this.inCar) this.updateDriving(dt, input);
    else this.updateOnFoot(dt, input);
    if (this.inCar) this.focus.copy(this.car.pos);
    else this.focus.copy(this.pos);
  }

  updateOnFoot(dt, input) {
    const g = this.game;
    const cam = g.cam;
    this.prompt = null;
    let mx = input.moveX, my = input.moveY;
    if (this.pick || this.knock > 0) mx = my = 0;
    const len = Math.hypot(mx, my);
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    const rx = -fz, rz = fx; // camera right
    let dx = fx * my + rx * mx, dz = fz * my + rz * mx;
    if (len > 1) (dx /= len), (dz /= len);
    const sprint = input.sprint;
    const target = len > 0.1 ? (sprint ? 7.4 : 4.6) * Math.min(1, len) : 0;
    this.speed = damp(this.speed, target, 10, dt);
    if (len > 0.1) this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 12, dt);
    const ml = Math.hypot(dx, dz) || 1;
    this.vel.set((dx / ml) * this.speed, (dz / ml) * this.speed);
    if (this.knock > 0) {
      this.knock -= dt;
      this.vel.multiplyScalar(0);
    }
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.y * dt;

    // jump + gravity
    const ground = g.city.groundHeight(this.pos.x, this.pos.z);
    if (this.grounded && input.jump && !this.pick) {
      this.vy = 4.6;
      this.grounded = false;
    }
    this.vy -= 14 * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= ground) {
      this.pos.y = this.grounded ? damp(this.pos.y, ground, 20, dt) : ground;
      if (this.pos.y < ground) this.pos.y = ground;
      this.vy = 0;
      this.grounded = true;
    }

    // collisions: buildings, then cars
    const p = { x: this.pos.x, z: this.pos.z };
    g.city.col.resolveCircle(p, 0.35);
    this.pos.x = p.x;
    this.pos.z = p.z;
    for (const v of g.vehicles.list) {
      if (Math.abs(v.pos.x - this.pos.x) > 6 || Math.abs(v.pos.z - this.pos.z) > 6) continue;
      this.pushOutOfCar(v);
    }

    // interactions
    this.updateInteraction(dt, input);

    // model
    const m = this.model.root;
    m.position.copy(this.pos);
    m.rotation.set(0, this.yaw, 0);
    this.model.update(dt, { speed: this.speed, air: !this.grounded, action: this.pick ? 'pick' : null, knocked: this.knock > 0 });
  }

  pushOutOfCar(v) {
    const r = 0.35;
    const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z;
    const [fx, fz] = v.forward;
    const lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw);
    const f = dx * fx + dz * fz, l = dx * lx + dz * lz;
    const hf = v.L / 2 + r, hl = v.W / 2 + r;
    if (Math.abs(f) >= hf || Math.abs(l) >= hl) return;
    // hit by a moving car?
    if (v.speed > 5 && v.driver && v.driver !== 'player') {
      this.knock = 1.2;
      this.vy = 3;
      this.grounded = false;
      this.game.onPlayerHit?.(v);
    }
    const pf = hf - Math.abs(f), pl = hl - Math.abs(l);
    if (pf < pl) {
      const s = Math.sign(f) || 1;
      this.pos.x += fx * pf * s;
      this.pos.z += fz * pf * s;
    } else {
      const s = Math.sign(l) || 1;
      this.pos.x += lx * pl * s;
      this.pos.z += lz * pl * s;
    }
  }

  nearestCar() {
    let best = null, bd = 3.4;
    for (const v of this.game.vehicles.list) {
      if (v.dead) continue;
      const [x, z] = v.doorPos();
      const d = Math.hypot(x - this.pos.x, z - this.pos.z);
      const d2 = Math.hypot(v.pos.x - this.pos.x, v.pos.z - this.pos.z) - v.W / 2 - 0.5;
      const dd = Math.min(d, d2 + 0.6);
      if (dd < bd) {
        bd = dd;
        best = v;
      }
    }
    return best;
  }

  updateInteraction(dt, input) {
    const g = this.game;
    const v = this.pick ? this.pick.car : this.nearestCar();
    if (!v) {
      this.pick = null;
      return;
    }
    const police = !!v.spec.police;
    const name = `${v.spec.make} ${v.spec.name}`;
    if (v.driver === 'npc' || v.driver === 'cop') {
      if (v.speed > 4) return;
      this.prompt = { key: 'E', text: `Carjack ${name}${police ? ' — ★★★' : ''}` };
      if (input.interactHit) this.enterCar(v, 'carjack');
      return;
    }
    if (v.locked) {
      const dur = police ? 3.6 : 2.4;
      this.prompt = { key: 'Hold E', text: `Break into ${name}${police ? ' — police car!' : ''}`, progress: this.pick ? this.pick.t / dur : 0 };
      if (input.interactHeld) {
        if (!this.pick) {
          this.pick = { car: v, t: 0, dur };
          g.audio.beep(600, 0.05, 0.05);
        }
        // face the car while working the lock
        this.yaw = dampAngle(this.yaw, Math.atan2(v.pos.x - this.pos.x, v.pos.z - this.pos.z), 10, dt);
        this.pick.t += dt;
        if (Math.random() < dt * 6) g.audio.beep(2400 + Math.random() * 800, 0.02, 0.03, 'square');
        if (this.pick.t >= dur) {
          this.pick = null;
          v.locked = false;
          g.onBreakIn(v);
          this.enterCar(v, 'breakin');
        }
      } else this.pick = null;
      return;
    }
    this.prompt = { key: 'E', text: `Get in ${name}` };
    if (input.interactHit) this.enterCar(v, 'enter');
  }

  enterCar(v, how) {
    const g = this.game;
    if (how === 'carjack') g.onCarjack(v);
    if (v.spot) {
      v.spot.car = null;
      v.spot.next = g.time + 90;
      v.spot = null;
    }
    this.inCar = true;
    this.car = v;
    this.pick = null;
    v.driver = 'player';
    v.role = 'player';
    v.siren = false;
    v.pursuit = false;
    v.route = null;
    if (!v.owned && !v.stolen) {
      v.stolen = true;
      v.hot = true;
      g.stats.stolen++;
      g.onSteal?.(v);
    }
    // seat the character
    const s = this.model.look.height / 1.8;
    const B = v.model.B;
    const [, y1, r0, , , f0] = B.gh;
    // keep the head under the roof: hips sit ~0.9 m (scaled) below the roofline
    this.model.root.position.set(B.W * 0.2, y1 - 0.92 * s - 0.5 * s, ((r0 + f0) / 2) * B.L + 0.12);
    this.model.root.rotation.set(0, 0, 0);
    v.model.pivot.add(this.model.root);
    this.model.update(0, { seated: true });
    g.audio.unlock();
  }

  exitCar(force = false) {
    const g = this.game;
    const v = this.car;
    if (!v) return;
    if (!force && v.speed > 4) return;
    v.model.pivot.remove(this.model.root);
    g.scene.add(this.model.root);
    v.driver = null;
    v.role = 'abandoned';
    v.ctrl.throttle = v.ctrl.brake = v.ctrl.steer = 0;
    v.ctrl.nitro = false;
    // pick the free side
    const lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw);
    let placed = false;
    for (const s of [1, -1]) {
      const x = v.pos.x + lx * s * (v.W / 2 + 0.7), z = v.pos.z + lz * s * (v.W / 2 + 0.7);
      const p = { x, z };
      if (!g.city.col.resolveCircle(p, 0.35)) {
        this.pos.set(x, g.city.groundHeight(x, z), z);
        placed = true;
        break;
      }
    }
    if (!placed) {
      const [fx, fz] = v.forward;
      this.pos.set(v.pos.x - fx * (v.L / 2 + 1), v.pos.y, v.pos.z - fz * (v.L / 2 + 1));
    }
    this.yaw = v.yaw;
    this.inCar = false;
    this.car = null;
    this.speed = 0;
  }

  updateDriving(dt, input) {
    const v = this.car;
    const c = v.ctrl;
    this.prompt = null;
    c.throttle = input.throttle;
    c.brake = input.brake;
    c.steer = input.steer;
    c.handbrake = input.handbrake;
    c.nitro = input.sprint && v.nitroPower > 0;
    if (input.hit('KeyH')) this.game.audio.horn();
    if (input.interactHit && v.speed < 4) this.exitCar();
    this.pos.copy(v.pos);
    this.model.update(dt, { seated: true, steer: v.steerAngle / 0.6 });
  }

  /** Remove from any car without leaving a car behind (busted, chopped, stored). */
  detachFromCar(x, z, yaw) {
    if (this.car) {
      this.car.model.pivot.remove(this.model.root);
      this.game.scene.add(this.model.root);
    }
    this.inCar = false;
    this.car = null;
    this.pick = null;
    this.speed = 0;
    this.pos.set(x, this.game.city.groundHeight(x, z), z);
    this.yaw = yaw;
    this.focus.copy(this.pos);
  }

  get carName() {
    return this.car ? `${CARS[this.car.specId].make} ${CARS[this.car.specId].name}` : '';
  }
}

export const playerClamp = clamp;

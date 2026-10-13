// Arcade vehicle simulation shared by the player, traffic and police.
import * as THREE from 'three';
import { CARS, PERF } from '../config.js';
import { CarModel } from './carModel.js';
import { clamp, damp } from '../util.js';

let nextId = 1;

export class Vehicle {
  constructor(game, specId, up, { x = 0, z = 0, yaw = 0, role = 'parked', health = 1 } = {}) {
    this.id = nextId++;
    this.game = game;
    this.specId = specId;
    this.spec = CARS[specId];
    this.up = { ...up };
    this.model = new CarModel(specId, this.up);
    this.obj = this.model.root;
    game.scene.add(this.obj);
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = yaw;
    this.vel = new THREE.Vector2(0, 0);
    this.angVel = 0;
    this.vF = 0;
    this.vL = 0;
    this.steerAngle = 0;
    this.health = health;
    this.role = role; // parked | traffic | police | abandoned | player
    this.driver = role === 'traffic' ? 'npc' : role === 'police' ? 'cop' : null;
    this.locked = role === 'parked';
    this.hot = false; // stolen and not resprayed
    this.ctrl = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };
    this.nitroFuel = 1;
    this.slip = 0;
    this.pitch = 0;
    this.roll = 0;
    this.lastHit = 0;
    this.alarm = 0;
    this.siren = false;
    this.rpm = 900;
    this.dead = false;
    this.computeStats();
    this.sync();
  }

  get L() {
    return this.model.length;
  }
  get W() {
    return this.model.width;
  }
  get speed() {
    return this.vel.length();
  }
  get forward() {
    return [Math.sin(this.yaw), Math.cos(this.yaw)];
  }

  computeStats() {
    const s = this.spec, u = this.up;
    this.accel = s.accel * (1 + 0.13 * (u.engine || 0)) * (u.blower ? 1.18 : 1);
    this.top = s.top * (1 + 0.06 * (u.engine || 0)) * (u.blower ? 1.06 : 1);
    this.grip = s.grip * (1 + 0.1 * (u.tires || 0) + 0.05 * (u.suspension || 0));
    this.brakeForce = 15 * (1 + 0.18 * (u.brakes || 0));
    this.mass = s.mass + 120 * (u.armor || 0);
    this.armor = 1 - 0.2 * (u.armor || 0);
    this.nitroPower = [0, 7, 10, 14][u.nitro || 0];
    this.wheelbase = this.model.B.wb[1] - this.model.B.wb[0];
    this.r = this.W / 2 + 0.05;
    this.circleOff = this.L / 2 - this.W / 2;
  }

  /** Apply new upgrades (rebuilds the mesh). */
  setUpgrades(up) {
    this.up = { ...up };
    this.model.build(this.up);
    this.computeStats();
  }

  // ---------------------------------------------------------------- physics
  step(dt) {
    const c = this.ctrl;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const lx = Math.cos(this.yaw), lz = -Math.sin(this.yaw);
    let vF = this.vel.x * fx + this.vel.y * fz;
    let vL = this.vel.x * lx + this.vel.y * lz;
    const hasDriver = !!this.driver;
    const alive = this.health > 0;

    if (!hasDriver) {
      // parked: brakes on
      const k = Math.exp(-2.5 * dt);
      vF *= k;
      vL *= Math.exp(-6 * dt);
      this.angVel *= k;
      c.throttle = c.brake = c.steer = 0;
    } else {
      // steering
      const maxSteer = 0.6 / (1 + Math.abs(vF) / 22);
      this.steerAngle = damp(this.steerAngle, c.steer * maxSteer, 9, dt);
      // drive
      const nitro = c.nitro && this.nitroPower > 0 && this.nitroFuel > 0 && alive && vF > -1;
      this.nitroActive = nitro;
      if (nitro) this.nitroFuel = Math.max(0, this.nitroFuel - dt / (2.5 + this.up.nitro));
      else this.nitroFuel = Math.min(1, this.nitroFuel + dt * 0.06);
      const top = this.top * (nitro ? 1.22 : 1);
      if (c.throttle > 0 && alive) {
        if (vF < -0.5) vF += this.brakeForce * c.throttle * dt;
        else {
          const f = 1 - clamp(vF / top, 0, 1) ** 2;
          vF += (this.accel * c.throttle * f + (nitro ? this.nitroPower : 0)) * dt;
        }
      }
      if (c.brake > 0) {
        if (vF > 0.5) vF -= this.brakeForce * c.brake * dt;
        else if (alive) vF = Math.max(-11, vF - this.accel * 0.55 * c.brake * dt);
      }
      if (c.handbrake) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 5 * dt);
      // rolling resistance + drag
      if (!c.throttle && !c.brake) vF -= Math.sign(vF) * Math.min(Math.abs(vF), (0.6 + Math.abs(vF) * 0.04) * dt);
      vF -= vF * Math.abs(vF) * 0.00035 * dt;

      // yaw from bicycle model, blended toward target at a grip-limited rate
      const hb = c.handbrake ? 1 : 0;
      const target = (-vF * Math.tan(this.steerAngle)) / this.wheelbase * (1 + hb * 0.6);
      const yawGrip = c.handbrake ? 3 : 6 + this.grip * 0.6;
      this.angVel = damp(this.angVel, target, yawGrip, dt);
    }
    // lateral grip (low = sliding)
    const lateralGrip = c.handbrake ? this.grip * 0.18 : this.grip * (Math.abs(vL) > 6 ? 0.6 : 1);
    vL *= Math.exp(-lateralGrip * dt);
    this.slip = clamp(Math.abs(vL) / 6 + (c.handbrake && Math.abs(vF) > 6 ? 0.4 : 0) + (c.throttle > 0.9 && Math.abs(vF) < 6 && this.accel > 9 && hasDriver ? 0.6 : 0), 0, 1);

    this.yaw += this.angVel * dt;
    const nfx = Math.sin(this.yaw), nfz = Math.cos(this.yaw);
    const nlx = Math.cos(this.yaw), nlz = -Math.sin(this.yaw);
    const prevVF = this.vF;
    this.vel.set(nfx * vF + nlx * vL, nfz * vF + nlz * vL);
    this.vF = vF;
    this.vL = vL;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.y * dt;

    // body motion for visuals
    const aF = (vF - prevVF) / dt;
    this.pitch = damp(this.pitch, clamp(-aF * 0.0045, -0.05, 0.05), 6, dt);
    this.roll = damp(this.roll, clamp(vF * this.angVel * 0.006, -0.06, 0.06), 6, dt);

    // engine rpm (6-speed box) for audio
    const sp = Math.abs(vF), gears = 6, band = this.top / gears;
    const gear = Math.min(gears - 1, Math.floor(sp / band));
    const inGear = (sp - gear * band) / band;
    const target = 900 + (gear === 0 ? inGear * 5200 : 2600 + inGear * 3800);
    this.rpm = damp(this.rpm, hasDriver && alive ? (c.throttle > 0 && sp < 2 ? 2800 + c.throttle * 1800 : target) : 0, 8, dt);
    this.gear = gear + 1;

    this.collideStatic();
    // ground height (curbs)
    const gh = this.game.city.groundHeight(this.pos.x, this.pos.z);
    this.pos.y = damp(this.pos.y, gh, 14, dt);
  }

  collideStatic() {
    const col = this.game.city.col;
    const [fx, fz] = this.forward;
    for (const s of [1, -1]) {
      const p = { x: this.pos.x + fx * this.circleOff * s, z: this.pos.z + fz * this.circleOff * s };
      const ox = p.x, oz = p.z;
      const hit = col.resolveCircle(p, this.r);
      if (!hit) continue;
      this.pos.x += p.x - ox;
      this.pos.z += p.z - oz;
      this.impulse(hit.nx, hit.nz, fx * this.circleOff * s, fz * this.circleOff * s, 0.25, true);
    }
  }

  /** Bounce off a surface with normal n at offset (rx,rz) from centre. */
  impulse(nx, nz, rx, rz, e = 0.25, isStatic = false) {
    const vn = this.vel.x * nx + this.vel.y * nz;
    if (vn >= 0) return 0;
    const jn = -(1 + e) * vn;
    // friction along the wall
    const tx = -nz, tz = nx;
    const vt = this.vel.x * tx + this.vel.y * tz;
    const dvx = nx * jn - tx * vt * 0.25, dvz = nz * jn - tz * vt * 0.25;
    this.vel.x += dvx;
    this.vel.y += dvz;
    const I = (this.L * this.L + this.W * this.W) / 12;
    this.angVel += (rz * dvx - rx * dvz) / I * 0.6;
    this.angVel = clamp(this.angVel, -4, 4);
    if (isStatic) this.damage(-vn);
    return -vn;
  }

  damage(impactSpeed) {
    if (impactSpeed < 4) return;
    const now = this.game.time;
    const d = ((impactSpeed - 4) / 60) * this.armor;
    this.health = Math.max(0, this.health - d);
    if (now - this.lastHit > 0.15) {
      this.lastHit = now;
      this.game.onVehicleImpact?.(this, impactSpeed);
    }
  }

  sync() {
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
  }

  updateVisual(dt, lights) {
    this.sync();
    this.model.animate(dt, {
      steer: this.steerAngle / 0.6,
      speed: this.vF,
      pitch: this.pitch,
      roll: this.roll,
      braking: !!this.driver && this.ctrl.brake > 0 && this.vF > 0.5,
      lights: this.driver || this.alarm > 0 ? (this.alarm > 0 ? (Math.floor(this.game.time * 4) % 2) : lights) : 0,
      nitro: this.nitroActive && this.driver === 'player',
      siren: this.siren,
      t: this.game.time,
    });
  }

  /** Door position (driver side = car's left, +X local). */
  doorPos() {
    const lx = Math.cos(this.yaw), lz = -Math.sin(this.yaw);
    return [this.pos.x + lx * (this.W / 2 + 0.6), this.pos.z + lz * (this.W / 2 + 0.6)];
  }

  /** Is world point inside the car's footprint (with padding)? */
  contains(x, z, pad = 0) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    const [fx, fz] = this.forward;
    const f = dx * fx + dz * fz;
    const l = dx * Math.cos(this.yaw) - dz * Math.sin(this.yaw);
    return Math.abs(f) < this.L / 2 + pad && Math.abs(l) < this.W / 2 + pad;
  }

  destroy() {
    this.game.scene.remove(this.obj);
    this.model.dispose();
    this.removed = true;
  }
}

export const perfLabel = (k, lvl) => PERF[k].levels[lvl];

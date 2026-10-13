// Third-person orbit camera for on foot, chase camera for driving.
import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../util.js';

export class CameraRig {
  constructor(game) {
    this.game = game;
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1600);
    this.yaw = 0;
    this.pitch = 0.25;
    this.dist = 4.4;
    this.lookTimer = 0;
    this.shake = 0;
    this.target = new THREE.Vector3();
    this.fov = 62;
  }

  snapBehind(yaw) {
    this.yaw = yaw;
    this.pitch = 0.22;
  }

  update(dt, input) {
    const g = this.game;
    const p = g.player;
    const [dx, dy] = input.lookDelta();
    const moved = Math.abs(dx) + Math.abs(dy) > 0.0005;
    this.yaw -= dx;
    this.pitch = clamp(this.pitch + dy, -0.35, 1.2);
    if (moved) this.lookTimer = 1.6;
    else this.lookTimer -= dt;

    let tgt, dist, fovTarget = 62;
    if (p.inCar) {
      const v = p.car;
      const sp = Math.abs(v.vF);
      if (this.lookTimer <= 0) {
        // chase: follow heading, or velocity when sliding fast
        let desired = v.yaw;
        if (v.vF < -2) desired = v.yaw + Math.PI;
        this.yaw = dampAngle(this.yaw, desired, sp > 3 ? 3.2 : 1.2, dt);
        this.pitch = damp(this.pitch, 0.2, 2, dt);
      }
      tgt = new THREE.Vector3(v.pos.x, v.pos.y + 1.25 + (v.model.pivot.position.y || 0), v.pos.z);
      dist = v.L * 0.95 + 3.0 + Math.min(sp, 60) * 0.025;
      fovTarget = 62 + clamp(sp / 75, 0, 1) * 14 + (v.nitroActive ? 7 : 0);
      if (v.nitroActive) this.shake = Math.max(this.shake, 0.05);
    } else {
      tgt = new THREE.Vector3(p.pos.x, p.pos.y + 1.55, p.pos.z);
      // over-the-shoulder offset to the right
      const rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
      tgt.x += rx * 0.45;
      tgt.z += rz * 0.45;
      dist = 3.8;
    }
    this.target.lerp(tgt, 1 - Math.exp(-20 * dt));
    if (this.target.distanceTo(tgt) > 12) this.target.copy(tgt);
    this.dist = damp(this.dist, dist, 5, dt);
    this.fov = damp(this.fov, fovTarget, 4, dt);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let cx = this.target.x - fx * cp * this.dist;
    let cz = this.target.z - fz * cp * this.dist;
    let cy = this.target.y + sp * this.dist;
    // don't clip into buildings
    const t = g.city.col.segmentFraction(this.target.x, this.target.z, cx, cz, 0.4);
    if (t < 1) {
      const k = Math.max(0.15, t - 0.05);
      cx = this.target.x + (cx - this.target.x) * k;
      cz = this.target.z + (cz - this.target.z) * k;
      cy = this.target.y + (cy - this.target.y) * k;
    }
    cy = Math.max(cy, g.city.groundHeight(cx, cz) + 0.3);
    const cam = this.camera;
    cam.position.set(cx, cy, cz);
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shake;
      cam.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 0.6);
    }
    cam.lookAt(this.target);
    if (Math.abs(cam.fov - this.fov) > 0.05) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }

  /** Slow cinematic orbit for the title screen. */
  orbit(t, center, radius = 120, height = 55) {
    const a = t * 0.04;
    this.camera.position.set(center.x + Math.cos(a) * radius, height, center.z + Math.sin(a) * radius);
    this.camera.lookAt(center.x, 8, center.z);
    if (this.camera.fov !== 55) {
      this.camera.fov = 55;
      this.camera.updateProjectionMatrix();
    }
  }
}

// GPU point particles (tyre smoke, engine smoke, sparks) and skid-mark decals.
import * as THREE from 'three';

const vert = /* glsl */ `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
uniform float uScale;
varying float vAlpha; varying vec3 vColor;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = aAlpha; vColor = aColor;
  #include <fog_vertex>
}`;
const frag = /* glsl */ `
varying float vAlpha; varying vec3 vColor;
#include <fog_pars_fragment>
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

class PointPool {
  constructor(scene, max, additive) {
    this.max = max;
    this.n = 0;
    this.p = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.color = new Float32Array(max * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 400 } }]),
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  spawn(x, y, z, vx, vy, vz, life, size, grow, color, alpha = 1, drag = 1.5, gravity = 0) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push({ x, y, z, vx, vy, vz, life, max: life, size, grow, c: color, a: alpha, drag, gravity });
  }

  update(dt) {
    const out = [];
    for (const q of this.p) {
      q.life -= dt;
      if (q.life <= 0) continue;
      const k = Math.exp(-q.drag * dt);
      q.vx *= k;
      q.vz *= k;
      q.vy = q.vy * k - q.gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z += q.vz * dt;
      if (q.y < 0.05 && q.gravity) {
        q.y = 0.05;
        q.vy *= -0.3;
      }
      q.size += q.grow * dt;
      out.push(q);
    }
    this.p = out;
    let i = 0;
    for (const q of out) {
      const t = q.life / q.max;
      this.pos[i * 3] = q.x;
      this.pos[i * 3 + 1] = q.y;
      this.pos[i * 3 + 2] = q.z;
      this.size[i] = q.size;
      this.alpha[i] = q.a * Math.min(1, t * 2.5) * Math.min(1, (1 - t) * 8 + 0.2);
      this.color[i * 3] = q.c.r;
      this.color[i * 3 + 1] = q.c.g;
      this.color[i * 3 + 2] = q.c.b;
      i++;
    }
    this.geo.setDrawRange(0, i);
    for (const k of ['position', 'aSize', 'aAlpha', 'aColor']) this.geo.getAttribute(k).needsUpdate = true;
  }
}

export class Particles {
  constructor(scene) {
    this.smoke = new PointPool(scene, 700, false);
    this.sparks = new PointPool(scene, 300, true);
    this.cSmoke = new THREE.Color(0xd8d8d8);
    this.cDark = new THREE.Color(0x222222);
    this.cSpark = new THREE.Color(0xffaa33);
    this.cNos = new THREE.Color(0x5599ff);
    this.cDust = new THREE.Color(0x9a8a74);
  }

  tireSmoke(x, z, amount, night) {
    const c = this.cSmoke.clone().multiplyScalar(1 - night * 0.6);
    this.smoke.spawn(x, 0.25, z, (Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 1.5, 1.6 + Math.random(), 1.2, 3.2, c, 0.35 * amount, 1.2);
  }

  engineSmoke(x, y, z, heavy) {
    this.smoke.spawn(x, y, z, (Math.random() - 0.5) * 0.4, 1.4, (Math.random() - 0.5) * 0.4, 1.8, 0.6, 1.6, heavy ? this.cDark : this.cSmoke, heavy ? 0.55 : 0.3, 0.8);
  }

  sparkBurst(x, y, z, n = 12, strength = 1) {
    for (let i = 0; i < n; i++) {
      this.sparks.spawn(x, y, z, (Math.random() - 0.5) * 8 * strength, Math.random() * 5 * strength, (Math.random() - 0.5) * 8 * strength, 0.4 + Math.random() * 0.4, 0.18, -0.2, this.cSpark, 1, 0.5, 14);
    }
  }

  update(dt, scale) {
    this.smoke.mat.uniforms.uScale.value = scale;
    this.sparks.mat.uniforms.uScale.value = scale;
    this.smoke.update(dt);
    this.sparks.update(dt);
  }
}

export class SkidMarks {
  constructor(scene, max = 1200) {
    this.max = max;
    this.i = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 6 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    const m = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
    this.last = new Map();
  }

  /** key identifies a wheel; call with on=false to break the trail. */
  mark(key, x, y, z, rx, rz, on, w = 0.13) {
    const prev = this.last.get(key);
    if (!on) {
      this.last.delete(key);
      return;
    }
    if (prev && Math.hypot(prev[0] - x, prev[2] - z) < 0.35) return;
    if (prev && Math.hypot(prev[0] - x, prev[2] - z) < 3) {
      const o = this.i * 18;
      const yy = y + 0.02;
      const a = [prev[0] - rx * w, yy, prev[2] - rz * w], b = [prev[0] + rx * w, yy, prev[2] + rz * w];
      const c = [x + rx * w, yy, z + rz * w], d = [x - rx * w, yy, z - rz * w];
      // two tris (double sided not needed: viewed from above)
      const tri = [...a, ...c, ...b, ...a, ...d, ...c];
      // ensure upward winding
      this.pos.set(tri, o);
      this.i = (this.i + 1) % this.max;
      this.geo.getAttribute('position').needsUpdate = true;
      this.geo.setDrawRange(0, this.max * 6);
    }
    this.last.set(key, [x, y, z]);
  }
}

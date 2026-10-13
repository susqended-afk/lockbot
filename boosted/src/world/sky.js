// Time of day: sky dome, sun/moon, hemisphere light, fog, and an image-based-lighting env map for car paint reflections.
import * as THREE from 'three';
import { lerp, clamp } from '../util.js';

const NIGHT = { top: '#03050c', hor: '#101a30', bot: '#06080d', sun: '#8aa0d8', sunI: 0.45, hs: '#2a3656', hg: '#0d0d12', hI: 0.7, fog: '#0e1626', night: 1 };
const KEYS = [
  [0, NIGHT],
  [5.0, NIGHT],
  [6.3, { top: '#20305e', hor: '#e8896a', bot: '#2a2530', sun: '#ffa070', sunI: 1.4, hs: '#7b88b5', hg: '#3a2f2a', hI: 0.9, fog: '#a8857c', night: 0.4 }],
  [8.5, { top: '#2f6ec9', hor: '#b2cde8', bot: '#5c6670', sun: '#fff1dc', sunI: 3.0, hs: '#b7d3ff', hg: '#5a5146', hI: 1.15, fog: '#adc3db', night: 0 }],
  [15.5, { top: '#3471c4', hor: '#c4d3e2', bot: '#5c6670', sun: '#fff0d8', sunI: 3.0, hs: '#b7d3ff', hg: '#5a5146', hI: 1.1, fog: '#b6c6d6', night: 0 }],
  [18.0, { top: '#2b4080', hor: '#ff9152', bot: '#3a2c2a', sun: '#ff9a55', sunI: 2.3, hs: '#9095c4', hg: '#4a3a30', hI: 0.95, fog: '#c99272', night: 0.1 }],
  [19.3, { top: '#161d42', hor: '#b44a62', bot: '#1b1622', sun: '#ff6a5a', sunI: 0.8, hs: '#4f5488', hg: '#211a20', hI: 0.75, fog: '#54334c', night: 0.65 }],
  [20.6, NIGHT],
  [24, NIGHT],
];

const tmpA = new THREE.Color(), tmpB = new THREE.Color();

function sample(hour) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= hour) i++;
  const [h0, a] = KEYS[i];
  const [h1, b] = KEYS[i + 1];
  const t = clamp((hour - h0) / Math.max(0.0001, h1 - h0), 0, 1);
  const out = {};
  for (const k of Object.keys(a)) {
    if (typeof a[k] === 'number') out[k] = lerp(a[k], b[k], t);
    else out[k] = tmpA.set(a[k]).lerp(tmpB.set(b[k]), t).clone();
  }
  return out;
}

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const skyFrag = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uBot; uniform vec3 uSunDir; uniform vec3 uSun;
uniform float uStars; uniform float uSunSize; uniform float uGlow;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h > 0.0 ? mix(uHor, uTop, pow(clamp(h, 0.0, 1.0), 0.45)) : mix(uHor, uBot, pow(clamp(-h * 4.0, 0.0, 1.0), 0.6));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSun * (pow(sd, 5.0) * 0.22 + pow(sd, 60.0) * 0.5) * uGlow;
  col += uSun * smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.4, sd) * 8.0;
  if (uStars > 0.0 && h > 0.02) {
    vec3 p = floor(d * 380.0);
    float s = hash(p);
    col += vec3(0.9, 0.95, 1.0) * step(0.9975, s) * uStars * smoothstep(0.02, 0.3, h) * (0.5 + 0.5 * hash(p + 3.0));
  }
  // city light pollution glow on the horizon at night
  col += vec3(0.9, 0.5, 0.25) * uStars * 0.08 * exp(-abs(h) * 12.0);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Sky {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.hour = 18.6;
    this.mode = 'cycle';
    this.dayLength = 24 * 60; // real seconds per in-game day
    this.uniforms = {
      uTop: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uBot: { value: new THREE.Color() },
      uSun: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uStars: { value: 0 },
      uSunSize: { value: 0.0006 },
      uGlow: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const cam = this.sun.shadow.camera;
    cam.left = -70; cam.right = 70; cam.top = 70; cam.bottom = -70; cam.near = 1; cam.far = 420;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.mapSize.set(2048, 2048);
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xb7d3ff, 0x5a5146, 1);
    scene.add(this.hemi);

    scene.fog = new THREE.Fog(0x9fb4cc, 80, 420);

    // environment scene for reflections
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    const envMat = mat.clone();
    envMat.uniforms = this.uniforms;
    envMat.vertexShader = skyVert.replace('gl_Position = p.xyww;', 'gl_Position = p;');
    this.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), envMat));
    // bright panels standing in for street lights / signs / buildings in reflections
    this.envLights = new THREE.Group();
    const lm = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    const bm = new THREE.MeshBasicMaterial({ color: 0x15181d });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(5, 6 + (i % 5) * 3, 5), bm);
      b.position.set(Math.cos(a) * 32, 0, Math.sin(a) * 32);
      b.lookAt(0, 0, 0);
      this.envScene.add(b);
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), lm);
      l.position.set(Math.cos(a + 0.17) * 22, 7, Math.sin(a + 0.17) * 22);
      this.envLights.add(l);
    }
    this.envScene.add(this.envLights);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(39, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1b1c1f }));
    ground.position.y = -2;
    this.envScene.add(ground);
    this.envHour = -99;
    this.envRT = null;
    this.state = sample(this.hour);
    this.apply(true);
  }

  setShadowQuality(enabled, size) {
    this.sun.castShadow = enabled;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
  }

  get night() {
    return this.state.night;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'day') this.hour = 13;
    if (mode === 'dusk') this.hour = 18.6;
    if (mode === 'night') this.hour = 23;
    this.apply(true);
  }

  update(dt, focus) {
    if (this.mode === 'cycle') {
      this.hour = (this.hour + (dt * 24) / this.dayLength) % 24;
    }
    this.apply(false);
    this.dome.position.copy(focus);
    // keep the shadow frustum centred on the player, snapped to texels to avoid shimmer
    const texel = 140 / this.sun.shadow.mapSize.x;
    const fx = Math.round(focus.x / texel) * texel, fz = Math.round(focus.z / texel) * texel;
    this.sun.target.position.set(fx, 0, fz);
    this.sun.position.set(fx + this.lightDir.x * 200, this.lightDir.y * 200, fz + this.lightDir.z * 200);
  }

  apply(force) {
    const s = (this.state = sample(this.hour));
    const u = this.uniforms;
    u.uTop.value.copy(s.top);
    u.uHor.value.copy(s.hor);
    u.uBot.value.copy(s.bot);
    u.uSun.value.copy(s.sun);
    u.uStars.value = clamp((s.night - 0.4) / 0.6, 0, 1);
    const a = ((this.hour - 6) / 12) * Math.PI;
    const elev = Math.sin(a);
    const sunDir = new THREE.Vector3(Math.cos(a) * 0.85, Math.max(elev, -0.3) * 0.8, 0.5).normalize();
    u.uSunDir.value.copy(sunDir);
    u.uSunSize.value = elev > -0.05 ? 0.0007 : 0.0;
    u.uGlow.value = elev > -0.1 ? 1 : 0.15;
    // light: sun above horizon, otherwise moon
    this.lightDir = elev > 0.06 ? sunDir.clone() : new THREE.Vector3(-0.45, 0.75, -0.5).normalize();
    this.sun.color.copy(s.sun);
    this.sun.intensity = s.sunI;
    this.hemi.color.copy(s.hs);
    this.hemi.groundColor.copy(s.hg);
    this.hemi.intensity = s.hI;
    this.scene.fog.color.copy(s.fog);
    if (force || Math.abs(this.hour - this.envHour) > 0.2) this.rebuildEnv();
  }

  rebuildEnv() {
    this.envHour = this.hour;
    const n = this.state.night;
    this.envLights.visible = n > 0.3;
    const old = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 100);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = lerp(1.0, 0.55, n);
    if (old) old.dispose();
  }

  get clock() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
  }
}

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { setMaxAnisotropy } from './textures.js';

export const QUALITY = {
  low: { pixelRatio: 0.75, shadows: false, shadowSize: 1024, bloom: false, msaa: 0, viewDist: 260 },
  medium: { pixelRatio: 1, shadows: true, shadowSize: 1024, bloom: true, msaa: 2, viewDist: 340 },
  high: { pixelRatio: 1, shadows: true, shadowSize: 2048, bloom: true, msaa: 4, viewDist: 420 },
  ultra: { pixelRatio: 2, shadows: true, shadowSize: 4096, bloom: true, msaa: 4, viewDist: 520 },
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    setMaxAnisotropy(Math.min(8, r.capabilities.getMaxAnisotropy()));
    this.quality = 'high';
    this.composer = null;
    this.scene = null;
    this.camera = null;
    this.bloomStrength = 0.4;
    window.addEventListener('resize', () => this.resize());
  }

  setQuality(name) {
    this.quality = QUALITY[name] ? name : 'high';
    const q = QUALITY[this.quality];
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    if (this.composer) {
      this.composer.dispose();
      this.composer = null; // rebuilt on next render
    }
    this.resize();
  }

  get q() {
    return QUALITY[this.quality];
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2) * this.q.pixelRatio;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    if (this.composer) {
      this.composer.setPixelRatio(pr);
      this.composer.setSize(w, h);
    }
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  buildComposer(scene, camera) {
    const q = this.q;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q.msaa });
    const comp = new EffectComposer(this.renderer, rt);
    this.renderPass = new RenderPass(scene, camera);
    comp.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), this.bloomStrength, 0.45, 0.82);
    comp.addPass(this.bloom);
    comp.addPass(new OutputPass());
    this.composer = comp;
    this.resize();
  }

  render(scene, camera) {
    if (this.camera !== camera) {
      this.camera = camera;
      this.resize();
    }
    if (!this.q.bloom) {
      this.renderer.render(scene, camera);
      return;
    }
    if (!this.composer) this.buildComposer(scene, camera);
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.bloom.strength = this.bloomStrength;
    this.composer.render();
  }
}

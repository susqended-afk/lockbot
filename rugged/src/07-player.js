// ============================================================
// AUDIO — tiny WebAudio synth (no audio files)
// ============================================================
const AUDIO = {
  ctx: null, master: null, vol: 0.7,
  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
      // furnace / room tone
      const n = this.noiseBuf(4);
      const src = this.ctx.createBufferSource(); src.buffer = n; src.loop = true;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
      const g = this.ctx.createGain(); g.gain.value = 0.05;
      src.connect(lp); lp.connect(g); g.connect(this.master); src.start();
      const hum = this.ctx.createOscillator(); hum.frequency.value = 60; const hg = this.ctx.createGain(); hg.gain.value = 0.006;
      hum.connect(hg); hg.connect(this.master); hum.start();
      // PC fan whose volume follows distance to the desk
      const fan = this.ctx.createBufferSource(); fan.buffer = n; fan.loop = true;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
      this.fanGain = this.ctx.createGain(); this.fanGain.gain.value = 0.0;
      fan.connect(bp); bp.connect(this.fanGain); this.fanGain.connect(this.master); fan.start();
    } catch (e) { this.ctx = null; }
  },
  noiseBuf(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return b;
  },
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, freq = 1000, vol = 0.1, q = 1, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this._nb || (this._nb = this.noiseBuf(1));
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.05);
  },
  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'click': this.tone(1800, 0.03, 'square', 0.03); break;
      case 'type': this.noise(0.03, 3000, 0.05, 2); break;
      case 'notify': this.tone(880, 0.12, 'sine', 0.08); this.tone(1320, 0.18, 'sine', 0.07, 0, 0.09); break;
      case 'cash': [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.07, 0, i * 0.05)); this.noise(0.15, 6000, 0.05, 3); break;
      case 'buy': this.tone(523, 0.1, 'triangle', 0.08); this.tone(784, 0.2, 'triangle', 0.08, 0, 0.08); break;
      case 'error': this.tone(180, 0.25, 'sawtooth', 0.06, -60); break;
      case 'step': this.noise(0.07, 380 + Math.random() * 120, 0.09, 1.5); break;
      case 'can': this.noise(0.08, 5000, 0.12, 4); this.noise(0.4, 1800, 0.04, 1, 0.08); break;
      case 'rug': this.tone(220, 0.9, 'sawtooth', 0.09, -190); this.noise(0.8, 600, 0.12, 0.7); break;
      case 'launch': this.tone(300, 0.4, 'square', 0.04, 900); this.noise(0.4, 2500, 0.05, 1); break;
      case 'knock': for (let i = 0; i < 3; i++) this.noise(0.12, 160, 0.5, 1.2, i * 0.22); break;
      case 'sleep': this.tone(392, 0.6, 'sine', 0.06); this.tone(330, 0.8, 'sine', 0.06, 0, 0.3); break;
      case 'tweet': this.tone(2400, 0.06, 'sine', 0.05, 600); this.tone(2900, 0.08, 'sine', 0.04, -400, 0.07); break;
    }
  },
  updateFan(dist) { if (this.fanGain) this.fanGain.gain.value = clamp(0.05 / Math.max(0.6, dist), 0, 0.05); },
};

// ============================================================
// PLAYER — first person (pointer lock + WASD, or touch sticks)
// ============================================================
class Player {
  constructor(camera, dom, world) {
    this.cam = camera; this.dom = dom; this.W = world;
    this.pos = new THREE.Vector3(-0.6, 0, -1.4);
    this.yaw = Math.PI * 0.95; this.pitch = -0.08;
    this.eye = 1.63; this.bob = 0; this.stepAcc = 0;
    this.keys = {}; this.locked = false; this.enabled = true;
    this.touch = { move: new THREE.Vector2(), lookId: null, moveId: null, last: null, origin: null };
    this.sens = 1;
    this.target = null; // current interactable under the crosshair
    this.tween = null;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this._bind();
  }
  _bind() {
    addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      this.keys[e.code] = true;
      if (e.code === 'Tab') e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      emit('lockchange', { locked: this.locked });
    });
    addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.yaw -= e.movementX * 0.0022 * this.sens;
      this.pitch = clamp(this.pitch - e.movementY * 0.0022 * this.sens, -1.45, 1.45);
    });
  }
  lock() { if (this.isTouch) return; try { const p = this.dom.requestPointerLock?.(); p?.catch?.(() => {}); } catch (e) { /* not allowed here */ } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock?.(); }
  // touch sticks are wired by the UI layer
  touchStart(id, x, y, side) {
    if (side === 'left' && this.touch.moveId == null) { this.touch.moveId = id; this.touch.origin = { x, y }; this.touch.move.set(0, 0); return 'move'; }
    if (side === 'right' && this.touch.lookId == null) { this.touch.lookId = id; this.touch.last = { x, y }; return 'look'; }
    return null;
  }
  touchMove(id, x, y) {
    if (id === this.touch.moveId) {
      const dx = x - this.touch.origin.x, dy = y - this.touch.origin.y, R = 55;
      const l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
      this.touch.move.set((dx * k) / R, (dy * k) / R);
      return { dx: dx * k, dy: dy * k };
    }
    if (id === this.touch.lookId) {
      this.yaw -= (x - this.touch.last.x) * 0.0055 * this.sens;
      this.pitch = clamp(this.pitch - (y - this.touch.last.y) * 0.0055 * this.sens, -1.45, 1.45);
      this.touch.last = { x, y };
    }
    return null;
  }
  touchEnd(id) {
    if (id === this.touch.moveId) { this.touch.moveId = null; this.touch.move.set(0, 0); }
    if (id === this.touch.lookId) this.touch.lookId = null;
  }
  // smooth camera move (sitting at the PC etc.)
  tweenTo(pos, lookAt, dur = 0.6, done) {
    const from = { p: this.cam.position.clone(), q: this.cam.quaternion.clone() };
    const m = new THREE.Matrix4().lookAt(pos, lookAt, new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    this.tween = { from, to: { p: pos.clone(), q }, t: 0, dur, done };
  }
  collide(p) {
    const r = 0.28;
    const B = this.W.bounds || ROOM;
    p.x = clamp(p.x, B.x0 + r, B.x1 - r);
    p.z = clamp(p.z, B.z0 + r, B.z1 - r);
    const boxes = this.W.colliders.concat(this.W.dynColliders || []);
    for (let pass = 0; pass < 2; pass++) for (const b of boxes) {
      const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
        else { // inside: push out the shortest way
          const opts = [[b.x0 - r - p.x, 0], [b.x1 + r - p.x, 0], [0, b.z0 - r - p.z], [0, b.z1 + r - p.z]];
          opts.sort((a, b2) => Math.abs(a[0] + a[1]) - Math.abs(b2[0] + b2[1]));
          p.x += opts[0][0]; p.z += opts[0][1];
        }
      }
    }
    for (const n of PERSONS) {
      if (!n.root.visible) continue;
      const dx = p.x - n.root.position.x, dz = p.z - n.root.position.z, d = Math.hypot(dx, dz), rr = r + 0.25;
      if (d < rr && d > 1e-5) { p.x = n.root.position.x + (dx / d) * rr; p.z = n.root.position.z + (dz / d) * rr; }
    }
  }
  update(dt, interactables) {
    if (this.tween) {
      const tw = this.tween; tw.t += dt / tw.dur;
      const k = tw.t >= 1 ? 1 : 1 - Math.pow(1 - tw.t, 3);
      this.cam.position.lerpVectors(tw.from.p, tw.to.p, k);
      this.cam.quaternion.slerpQuaternions(tw.from.q, tw.to.q, k);
      if (tw.t >= 1) { this.tween = null; tw.done?.(); }
      return;
    }
    if (!this.enabled) return;
    const k = this.keys;
    let fx = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    let sx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    if (this.touch.moveId != null) { fx = -this.touch.move.y; sx = this.touch.move.x; }
    const run = k.ShiftLeft || k.ShiftRight || (this.touch.move.length() > 0.95);
    const speed = run ? 3.3 : 1.9;
    const mag = Math.hypot(fx, sx);
    if (mag > 1) { fx /= mag; sx /= mag; }
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const vx = (-sin * fx + cos * sx) * speed, vz = (-cos * fx - sin * sx) * speed;
    const moving = mag > 0.05;
    this.pos.x += vx * dt; this.pos.z += vz * dt;
    this.collide(this.pos);
    if (moving) {
      this.bob += dt * (run ? 11 : 7.5);
      this.stepAcc += dt * speed;
      if (this.stepAcc > 0.75) { this.stepAcc = 0; AUDIO.sfx('step'); }
    } else this.bob = damp(this.bob, Math.round(this.bob / Math.PI) * Math.PI, 6, dt);
    const by = Math.sin(this.bob * 2) * 0.025 * (moving ? 1 : 0), bx = Math.cos(this.bob) * 0.015 * (moving ? 1 : 0);
    this.cam.position.set(this.pos.x + cos * bx, this.eye + by, this.pos.z - sin * bx);
    this.cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    // pick an interactable under the crosshair
    const dir = new THREE.Vector3(); this.cam.getWorldDirection(dir);
    let best = null, bestScore = Infinity;
    for (const it of interactables) {
      if (it.enabled && !it.enabled()) continue;
      const to = it.pos.clone().sub(this.cam.position);
      const d = to.length();
      if (d > it.r + 0.4) continue;
      to.normalize();
      const ang = Math.acos(clamp(to.dot(dir), -1, 1));
      const lim = Math.atan2(it.size || 0.45, d) + 0.18;
      if (ang > lim) continue;
      const score = ang * 2 + d * 0.3;
      if (score < bestScore) { bestScore = score; best = it; }
    }
    this.target = best;
  }
  setStand(pos, yaw) { this.pos.copy(pos); this.yaw = yaw; this.pitch = -0.05; }
}

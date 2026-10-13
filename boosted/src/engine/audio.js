// Fully synthesized audio (WebAudio) — engine, blower whine, tires, sirens, alarm, impacts and a trap-beat radio.
// Swap in recorded samples later for a shipping build.

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = 0.8;
    this.musicVol = 0.5;
    this.radioOn = true;
  }

  /** Must be called from a user gesture. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.out = ctx.createGain();
    this.out.gain.value = this.master;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.out.connect(comp).connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.connect(this.out);
    this.music = ctx.createGain();
    this.music.gain.value = this.musicVol * 0.5;
    this.music.connect(this.out);

    this.noiseBuf = this.makeNoise(2);
    this.buildEngine();
    this.buildTires();
    this.buildSiren();
    this.buildAmbience();
    this.radio = new TrapRadio(ctx, this.music, this.noiseBuf);
    if (this.radioOn) this.radio.start();
  }

  setVolumes(master, music) {
    this.master = master;
    this.musicVol = music;
    if (!this.ctx) return;
    this.out.gain.setTargetAtTime(master, this.ctx.currentTime, 0.05);
    this.music.gain.setTargetAtTime(music * 0.5, this.ctx.currentTime, 0.05);
  }

  toggleRadio() {
    this.radioOn = !this.radioOn;
    if (!this.ctx) return this.radioOn;
    if (this.radioOn) this.radio.start();
    else this.radio.stop();
    return this.radioOn;
  }

  makeNoise(sec) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  noiseSource() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    return s;
  }

  // ------------------------------------------------------------ engine
  buildEngine() {
    const ctx = this.ctx;
    const e = (this.engine = {});
    e.gain = ctx.createGain();
    e.gain.gain.value = 0;
    e.filter = ctx.createBiquadFilter();
    e.filter.type = 'lowpass';
    e.filter.frequency.value = 800;
    e.filter.Q.value = 2;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 2.5);
    }
    shaper.curve = curve;
    e.o1 = ctx.createOscillator();
    e.o1.type = 'sawtooth';
    e.o2 = ctx.createOscillator();
    e.o2.type = 'square';
    e.o3 = ctx.createOscillator();
    e.o3.type = 'triangle';
    const g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
    g1.gain.value = 0.5;
    g2.gain.value = 0.35;
    g3.gain.value = 0.4;
    e.o1.connect(g1).connect(shaper);
    e.o2.connect(g2).connect(shaper);
    e.o3.connect(g3).connect(shaper);
    // lope: amplitude wobble for a V8 burble at idle
    e.lope = ctx.createGain();
    e.lope.gain.value = 1;
    e.lfo = ctx.createOscillator();
    e.lfo.frequency.value = 7;
    e.lfoAmt = ctx.createGain();
    e.lfoAmt.gain.value = 0.0;
    e.lfo.connect(e.lfoAmt).connect(e.lope.gain);
    shaper.connect(e.filter).connect(e.lope).connect(e.gain).connect(this.sfx);
    // supercharger whine
    e.whine = ctx.createOscillator();
    e.whine.type = 'sine';
    e.whineGain = ctx.createGain();
    e.whineGain.gain.value = 0;
    e.whine.connect(e.whineGain).connect(this.sfx);
    for (const o of [e.o1, e.o2, e.o3, e.lfo, e.whine]) o.start();
  }

  /** rpm 800..7000, load 0..1, profile from car spec, blower: bool */
  updateEngine(on, rpm, load, profile, blower, nitro) {
    if (!this.ctx) return;
    const e = this.engine, t = this.ctx.currentTime;
    const prof = PROFILES[profile] || PROFILES.v8;
    const f = (rpm / 60) * prof.cyl * 0.5 * prof.pitch;
    e.o1.frequency.setTargetAtTime(f, t, 0.03);
    e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    e.o3.frequency.setTargetAtTime(f * 1.01 * prof.harm, t, 0.03);
    e.filter.frequency.setTargetAtTime(300 + load * prof.bright + rpm * 0.25, t, 0.05);
    const idle = 1 - Math.min(1, (rpm - 800) / 2500);
    e.lfo.frequency.setTargetAtTime(rpm / 60 / 2, t, 0.05);
    e.lfoAmt.gain.setTargetAtTime(prof.lope * idle, t, 0.1);
    e.gain.gain.setTargetAtTime(on ? (0.12 + load * 0.16) * prof.vol : 0, t, 0.08);
    const whine = on && (blower || prof.whine) ? (0.012 + load * 0.035) * (rpm / 7000) * (blower ? 1.6 : 1) : 0;
    e.whine.frequency.setTargetAtTime(rpm * 0.42 + (nitro ? 300 : 0), t, 0.05);
    e.whineGain.gain.setTargetAtTime(whine, t, 0.05);
  }

  // ------------------------------------------------------------ tires
  buildTires() {
    const ctx = this.ctx;
    const n = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 6;
    this.tireGain = ctx.createGain();
    this.tireGain.gain.value = 0;
    n.connect(bp).connect(this.tireGain).connect(this.sfx);
    n.start();
  }

  updateTires(slip) {
    if (!this.ctx) return;
    this.tireGain.gain.setTargetAtTime(Math.min(0.22, slip * 0.22), this.ctx.currentTime, 0.05);
  }

  // ------------------------------------------------------------ siren
  buildSiren() {
    const ctx = this.ctx;
    this.siren = ctx.createOscillator();
    this.siren.type = 'square';
    this.siren.frequency.value = 900;
    const lfo = ctx.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.value = 0.35;
    const amt = ctx.createGain();
    amt.gain.value = 380;
    lfo.connect(amt).connect(this.siren.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    this.sirenGain = ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.siren.connect(lp).connect(this.sirenGain).connect(this.sfx);
    this.siren.start();
    lfo.start();
  }

  updateSiren(dist) {
    if (!this.ctx) return;
    const v = dist == null ? 0 : Math.max(0, 1 - dist / 160) * 0.07;
    this.sirenGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.2);
  }

  // ------------------------------------------------------------ ambience
  buildAmbience() {
    const ctx = this.ctx;
    const n = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    n.connect(lp).connect(g).connect(this.sfx);
    n.start();
  }

  // ------------------------------------------------------------ one-shots
  impact(strength = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600 + strength * 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.9, 0.2 + strength * 0.5), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    s.connect(lp).connect(g).connect(this.sfx);
    s.start(t, Math.random());
    s.stop(t + 0.4);
    // metal clank
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(180 + Math.random() * 120, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.25 * strength, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(og).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.3);
  }

  beep(freq = 880, dur = 0.08, vol = 0.15, type = 'square', when = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  click() {
    this.beep(1400, 0.03, 0.06, 'square');
  }

  cash() {
    [1046, 1318, 1568, 2093].forEach((f, i) => this.beep(f, 0.12, 0.1, 'triangle', i * 0.07));
  }

  alarm(seconds = 4) {
    for (let i = 0; i < seconds * 4; i++) this.beep(i % 2 ? 1250 : 980, 0.18, 0.09, 'square', i * 0.25);
  }

  horn() {
    this.beep(392, 0.35, 0.12, 'sawtooth');
    this.beep(494, 0.35, 0.1, 'sawtooth');
  }

  unlock() {
    this.beep(2000, 0.04, 0.08, 'square');
    this.beep(1500, 0.06, 0.08, 'square', 0.06);
  }

  wrench() {
    if (!this.ctx) return;
    for (let i = 0; i < 6; i++) {
      const t = this.ctx.currentTime + i * 0.13;
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(90, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(this.sfx);
      o.start(t);
      o.stop(t + 0.12);
    }
  }
}

const PROFILES = {
  v8sc: { cyl: 8, pitch: 1.0, harm: 2, bright: 2600, lope: 0.35, vol: 1.15, whine: true },
  v8: { cyl: 8, pitch: 1.0, harm: 2, bright: 2200, lope: 0.4, vol: 1.0 },
  v8big: { cyl: 8, pitch: 0.85, harm: 2, bright: 1800, lope: 0.55, vol: 1.1 },
  v8tt: { cyl: 8, pitch: 1.1, harm: 3, bright: 2400, lope: 0.15, vol: 0.9 },
  v6tt: { cyl: 6, pitch: 1.2, harm: 3, bright: 3000, lope: 0.1, vol: 0.9, whine: true },
  i4: { cyl: 4, pitch: 1.5, harm: 3, bright: 3000, lope: 0.05, vol: 0.7 },
};

// ------------------------------------------------------------------ radio
// A small procedural trap beat: 808 bass, kick, clap, rolling hats, minor bell melody.
class TrapRadio {
  constructor(ctx, out, noise) {
    this.ctx = ctx;
    this.out = out;
    this.noise = noise;
    this.bpm = 140;
    this.step = 0;
    this.timer = null;
    this.next = 0;
    this.bar = 0;
    // A minor-ish
    this.root = 55; // A1
    this.prog = [0, -4, -2, -7]; // i - VI - VII - v (semitones)
  }
  start() {
    if (this.timer) return;
    this.next = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }
  schedule() {
    const spb = 60 / this.bpm / 4; // 16th note
    while (this.next < this.ctx.currentTime + 0.12) {
      this.play(this.step, this.next, spb);
      this.next += spb;
      this.step = (this.step + 1) % 32;
      if (this.step === 0) this.bar = (this.bar + 1) % 4;
    }
  }
  play(s, t, spb) {
    const semi = this.prog[this.bar];
    // 808 + kick pattern (half-time trap over 2 bars of 16ths)
    const kicks = [0, 7, 10, 16, 22, 26];
    if (kicks.includes(s)) {
      this.kick(t);
      this.bass(t, this.root * Math.pow(2, semi / 12), spb * (s === 0 || s === 16 ? 6 : 3));
    }
    if (s === 8 || s === 24) this.clap(t);
    // hats: 8ths, with 32nd rolls at the end of the phrase
    if (s % 2 === 0) this.hat(t, 0.05);
    if (s >= 28) {
      this.hat(t + spb / 2, 0.035);
    }
    if (s === 14 || s === 30) {
      this.hat(t + spb / 3, 0.03);
      this.hat(t + (2 * spb) / 3, 0.03);
    }
    // bell melody (minor pentatonic) every 4th step
    if (s % 4 === 0) {
      const scale = [0, 3, 5, 7, 10, 12];
      const seed = (s * 7 + this.bar * 13) % scale.length;
      const n = 440 * Math.pow(2, (semi + scale[seed]) / 12);
      this.bell(t, n);
    }
  }
  env(g, t, a, d, v) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  kick(t) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = this.ctx.createGain();
    this.env(g, t, 0.002, 0.25, 0.9);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.3);
  }
  bass(t, f, dur) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const sh = this.ctx.createWaveShaper();
    const c = new Float32Array(256);
    for (let i = 0; i < 256; i++) c[i] = Math.tanh(((i / 255) * 2 - 1) * 2);
    sh.curve = c;
    const g = this.ctx.createGain();
    this.env(g, t, 0.005, dur, 0.55);
    o.connect(sh).connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  clap(t) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    this.env(g, t, 0.001, 0.18, 0.5);
    s.connect(bp).connect(g).connect(this.out);
    s.start(t, Math.random());
    s.stop(t + 0.2);
  }
  hat(t, v) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    this.env(g, t, 0.001, 0.04, v * 3);
    s.connect(hp).connect(g).connect(this.out);
    s.start(t, Math.random());
    s.stop(t + 0.06);
  }
  bell(t, f) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2.76;
    const g = this.ctx.createGain();
    this.env(g, t, 0.003, 0.6, 0.09);
    const g2 = this.ctx.createGain();
    this.env(g2, t, 0.003, 0.2, 0.03);
    o.connect(g).connect(this.out);
    o2.connect(g2).connect(this.out);
    o.start(t);
    o2.start(t);
    o.stop(t + 0.7);
    o2.stop(t + 0.3);
  }
}

// ============================================================
// MUSIC — a generative playlist, synthesized live with WebAudio
// (no audio files). Each track is a pattern function scheduled
// one 16th note at a time with a short lookahead.
// ============================================================
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const TRACKS = [
  {
    id: 'lofi', gain: 1.0, title: "Mom's Wifi", artist: 'lofi_dev', genre: 'Lo-fi', art: ['relieved_face', 205], bpm: 76, swing: 0.2, bars: 44, tone: 3000, crackle: true,
    prog: [{ r: 38, c: [50, 53, 57, 60, 64] }, { r: 43, c: [53, 59, 64, 69] }, { r: 36, c: [52, 55, 59, 62] }, { r: 45, c: [55, 60, 64, 67] }],
    scale: [62, 65, 67, 69, 72, 74, 77, 79],
    play(M, s, bar, t, st) {
      const c = this.prog[bar % 4], q = M.q;
      if (s === 0 || s === 10 || (s === 7 && st.r() < 0.35)) M.kick(t, 0.75);
      if (s === 4 || s === 12) M.snare(t, 0.4, 0.12);
      if (s % 2 === 0) M.hat(t, (s % 4 ? 0.14 : 0.09) * (0.6 + st.r() * 0.5));
      if (s === 14 && st.r() < 0.3) M.hat(t, 0.1, true);
      if (s === 0) M.keys(t, c.c, q * 7, 0.11, true);
      if (s === 10) M.keys(t, c.c.slice(1), q * 5, 0.08, true);
      if (s === 0) M.bass(t, c.r, q * 6, 0.42);
      if (s === 10) M.bass(t, c.r + (st.r() < 0.5 ? 7 : 12), q * 4, 0.34);
      const m = st.mel[bar % 8][s]; if (m) M.bell(t, m, 0.06);
    },
  },
  {
    id: 'synth', gain: 1.33, title: 'Green Candles', artist: 'MOONBOI 3000', genre: 'Synthwave', art: ['rocket', 290], bpm: 104, swing: 0, bars: 64, tone: 9000, delay: true,
    prog: [{ r: 45, c: [57, 60, 64] }, { r: 41, c: [57, 60, 65] }, { r: 48, c: [55, 60, 64] }, { r: 43, c: [55, 59, 62] }],
    scale: [69, 71, 72, 74, 76, 79, 81],
    play(M, s, bar, t, st) {
      const c = this.prog[bar % 4], q = M.q;
      if (s % 4 === 0) M.kick(t, 0.7);
      if (s === 4 || s === 12) M.snare(t, 0.38, 0.22, 0.45);
      if (s % 4 === 2) M.hat(t, 0.08);
      if (s % 2 === 0) M.bass(t, c.r - 12 + (s % 4 ? 12 : 0), q * 1.7, 0.3, 'saw');
      if (s === 0) M.pad(t, c.c.map((n) => n + 12), q * 16, 0.05);
      const arp = [0, 1, 2, 1, 0, 1, 2, 3][s % 8];
      M.pluck(t, (arp === 3 ? c.c[0] + 12 : c.c[arp]) + 12, q * 0.9, 0.045);
      if (bar % 8 >= 4) { const m = st.mel[bar % 4][s]; if (m) M.lead(t, m, q * 2, 0.05); }
    },
  },
  {
    id: 'trap', gain: 0.9, title: 'Rug Pull Anthem', artist: 'Lil Bagholder', genre: 'Trap', art: ['fire', 10], bpm: 140, swing: 0, bars: 72, tone: 12000,
    prog: [{ r: 37, c: [61, 64, 68] }, { r: 33, c: [57, 61, 64] }, { r: 40, c: [59, 64, 68] }, { r: 35, c: [59, 63, 66] }],
    scale: [73, 76, 78, 80, 83, 85],
    play(M, s, bar, t, st) {
      const c = this.prog[Math.floor(bar / 2) % 4], q = M.q;
      if (s === 0 || (s === 11 && bar % 2 === 0)) { M.kick(t, 0.6); M.b808(t, c.r, q * (s ? 4 : 9), 0.5); }
      if (s === 14 && bar % 2) M.b808(t, c.r + 7, q * 2, 0.4, c.r);
      if (s === 8) M.clap(t, 0.4);
      const roll = bar % 4 === 3 && s >= 12;
      if (roll) { M.hat(t, 0.09); M.hat(t + q / 2, 0.07); }
      else if (s % 2 === 0) M.hat(t, 0.1 * (s % 4 ? 0.7 : 1));
      if (s === 0 && bar % 2 === 0) M.pad(t, c.c, q * 32, 0.035);
      const m = st.mel[bar % 2][s]; if (m) M.bell(t, m, 0.07);
    },
  },
  {
    id: 'chip', gain: 1.75, title: 'Wen Lambo', artist: '8bit_ape', genre: 'Chiptune', art: ['robot', 160], bpm: 150, swing: 0, bars: 80, tone: 7000,
    prog: [{ r: 40, c: [64, 68, 71] }, { r: 37, c: [61, 64, 68] }, { r: 45, c: [57, 61, 64] }, { r: 47, c: [59, 63, 66] }],
    scale: [76, 78, 80, 83, 85, 88],
    play(M, s, bar, t, st) {
      const c = this.prog[bar % 4], q = M.q;
      if (s === 0 || s === 8) M.kick(t, 0.5, true);
      if (s === 4 || s === 12) M.snare(t, 0.26, 0.08);
      if (s % 2 === 1) M.hat(t, 0.05);
      if (s % 2 === 0) M.bass(t, c.r + (s % 4 ? 12 : 0), q * 1.6, 0.28, 'triangle');
      M.pluck(t, c.c[s % 3] + 12 * (Math.floor(s / 3) % 2), q * 0.8, 0.035, 'square');
      if (bar % 8 >= 2) { const m = st.mel[bar % 4][s]; if (m) M.lead(t, m, q * 1.8, 0.045); }
    },
  },
  {
    id: 'ambient', gain: 1.08, title: 'Exit Liquidity', artist: 'cold_wallet', genre: 'Ambient', art: ['full_moon_face', 235], bpm: 64, swing: 0, bars: 32, tone: 5000,
    prog: [{ r: 41, c: [53, 57, 60, 64] }, { r: 40, c: [52, 55, 59, 62] }, { r: 38, c: [50, 53, 57, 60] }, { r: 36, c: [48, 52, 55, 59] }],
    scale: [72, 74, 76, 79, 81, 84],
    play(M, s, bar, t, st) {
      const c = this.prog[bar % 4], q = M.q;
      if (s === 0) { M.pad(t, c.c.map((n) => n + 12), q * 17, 0.06); M.bass(t, c.r - 12, q * 14, 0.3); }
      if (s === 8 && bar % 2 === 1) M.kick(t, 0.25);
      const m = st.mel[bar % 8][s]; if (m) M.keys(t, [m], q * 6, 0.07, false);
    },
  },
  {
    id: 'house', gain: 1.55, title: 'Diamond Hands', artist: 'DJ WAGMI', genre: 'House', art: ['gem_stone', 190], bpm: 122, swing: 0.06, bars: 72, tone: 11000,
    prog: [{ r: 41, c: [56, 60, 63, 65] }, { r: 37, c: [56, 60, 61, 65] }, { r: 39, c: [55, 58, 63, 65] }, { r: 36, c: [55, 58, 60, 63] }],
    scale: [72, 75, 77, 79, 80, 84],
    play(M, s, bar, t, st) {
      const c = this.prog[bar % 4], q = M.q;
      if (s % 4 === 0) M.kick(t, 0.75);
      if (s === 4 || s === 12) M.clap(t, 0.32);
      if (s % 4 === 2) M.hat(t, 0.11, true);
      else if (s % 2 === 1) M.hat(t, 0.04);
      if (s % 4 === 2) M.bass(t, c.r - (s === 14 ? 0 : 12) + 12, q * 1.5, 0.3, 'saw');
      if ([3, 6, 10, 13].includes(s) && bar % 8 >= 2) M.keys(t, c.c.map((n) => n + 12), q * 0.9, 0.06, false, 2200);
      if (bar % 16 >= 8) { const m = st.mel[bar % 4][s]; if (m) M.pluck(t, m, q * 1.5, 0.04); }
    },
  },
];

const MUSIC = {
  ctx: null, on: false, idx: 0, vol: 0.5, shuffle: false, step: 0, bar: 0, nextT: 0, startT: 0, pausedAt: 0, timer: null, st: null,
  init() {
    if (this.ctx || !AUDIO.ctx) return !!this.ctx;
    const ac = this.ctx = AUDIO.ctx;
    this.out = ac.createGain(); this.out.gain.value = this.vol;
    this.comp = ac.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 3; this.comp.attack.value = 0.01; this.comp.release.value = 0.2;
    this.tone = ac.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = 12000; this.tone.Q.value = 0.4;
    this.bus = ac.createGain(); this.bus.gain.value = 0.9;
    this.bus.connect(this.tone); this.tone.connect(this.comp); this.comp.connect(this.out); this.out.connect(ac.destination);
    this.analyser = ac.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = 0.78; this.out.connect(this.analyser);
    this.fft = new Uint8Array(this.analyser.frequencyBinCount);
    // reverb from a generated impulse
    const len = ac.sampleRate * 2.6, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = ac.createConvolver(); this.rev.buffer = ir;
    this.revIn = ac.createGain(); this.revIn.gain.value = 0.32; this.revIn.connect(this.rev); this.rev.connect(this.tone);
    // tempo-synced echo for plucks
    this.dly = ac.createDelay(1.5); this.dlyFb = ac.createGain(); this.dlyFb.gain.value = 0.32; this.dlyIn = ac.createGain(); this.dlyIn.gain.value = 0;
    this.dlyIn.connect(this.dly); this.dly.connect(this.dlyFb); this.dlyFb.connect(this.dly); this.dly.connect(this.bus);
    const n = ac.sampleRate * 2; this.white = ac.createBuffer(1, n, ac.sampleRate);
    const wd = this.white.getChannelData(0); for (let i = 0; i < n; i++) wd[i] = Math.random() * 2 - 1;
    const real = new Float32Array(32), imag = new Float32Array(32);
    for (let k = 1; k < 32; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    this.pulse = ac.createPeriodicWave(real, imag);
    // vinyl crackle bed for the lo-fi track
    const cr = ac.createBufferSource(); cr.buffer = this.white; cr.loop = true;
    const cf = ac.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 2400; cf.Q.value = 0.6;
    this.crackle = ac.createGain(); this.crackle.gain.value = 0;
    cr.connect(cf); cf.connect(this.crackle); this.crackle.connect(this.out); cr.start();
    return true;
  },
  get track() { return TRACKS[this.idx]; },
  get q() { return 60 / this.track.bpm / 4; },
  length(i = this.idx) { const tr = TRACKS[i]; return tr.bars * 4 * 60 / tr.bpm; },
  elapsed() { if (!this.ctx) return 0; return this.on ? Math.max(0, this.ctx.currentTime - this.startT) : this.pausedAt; },
  setVolume(v) { this.vol = v; if (this.out) this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); },
  level() { if (!this.analyser || !this.on) return 0; this.analyser.getByteFrequencyData(this.fft); let s = 0; for (let i = 0; i < 12; i++) s += this.fft[i]; return s / (12 * 255); },
  play(i = this.idx, resumeAt = 0) {
    if (!this.init()) return;
    this.idx = (i + TRACKS.length) % TRACKS.length;
    const tr = this.track, ac = this.ctx;
    const rnd = mulberry32(hashStr(tr.id) + 7);
    const mel = (bars, density) => Array.from({ length: bars }, () => {
      const row = new Array(16).fill(0); let k = Math.floor(rnd() * tr.scale.length);
      for (let s = 0; s < 16; s += 2) if (rnd() < density) { k = clamp(k + Math.round((rnd() - 0.5) * 3), 0, tr.scale.length - 1); row[s] = tr.scale[k]; }
      return row;
    });
    this.st = { r: mulberry32(hashStr(tr.id + Date.now())), mel: mel(8, tr.id === 'ambient' ? 0.18 : tr.id === 'lofi' ? 0.22 : 0.42) };
    const totalSteps = Math.floor(resumeAt / this.q);
    this.step = totalSteps % 16; this.bar = Math.floor(totalSteps / 16);
    this.startT = ac.currentTime + 0.08 - resumeAt;
    this.nextT = ac.currentTime + 0.08;
    this.tone.frequency.setTargetAtTime(tr.tone, ac.currentTime, 0.2);
    this.bus.gain.setTargetAtTime(0.9 * (tr.gain || 1), ac.currentTime, 0.1);
    this.crackle.gain.setTargetAtTime(tr.crackle ? 0.012 : 0, ac.currentTime, 0.3);
    this.dlyIn.gain.value = tr.delay ? 0.35 : 0.12;
    this.dly.delayTime.value = this.q * 3;
    this.on = true;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
    emit('music', { track: tr });
  },
  pause() { if (!this.on) return; this.pausedAt = this.elapsed(); this.on = false; this.crackle?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); emit('music', {}); },
  toggle() { if (this.on) this.pause(); else this.play(this.idx, this.pausedAt); },
  next() { this.pausedAt = 0; this.play(this.shuffle ? (this.idx + 1 + Math.floor(Math.random() * (TRACKS.length - 1))) : this.idx + 1); },
  prev() { this.pausedAt = 0; this.play(this.elapsed() > 4 ? this.idx : this.idx - 1); },
  tick() {
    if (!this.on || !this.ctx) return;
    const ac = this.ctx, tr = this.track;
    if (this.elapsed() >= this.length()) { this.next(); return; }
    while (this.nextT < ac.currentTime + 0.14) {
      const swing = this.step % 2 === 1 ? tr.swing * this.q : 0;
      try { tr.play(this, this.step, this.bar, this.nextT + swing, this.st); } catch (e) { /* keep the clock running */ }
      if (tr.crackle && Math.random() < 0.12) this.pop(this.nextT + Math.random() * this.q);
      this.nextT += this.q;
      if (++this.step >= 16) { this.step = 0; this.bar++; }
    }
  },

  // ---------- instruments ----------
  _g(t, v, a, d, r, dur) { // gain envelope: attack, decay to v*sustain, release at end
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v * d), t + a + Math.max(0.01, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
    return g;
  },
  _o(type, f, t, end) { const o = this.ctx.createOscillator(); if (type === 'pulse') o.setPeriodicWave(this.pulse); else o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(end + 0.05); return o; },
  _noise(t, end) { const s = this.ctx.createBufferSource(); s.buffer = this.white; s.start(t, Math.random()); s.stop(end + 0.05); return s; },
  _f(type, f, q = 0.7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; },
  kick(t, v, chip) {
    const o = this._o('sine', chip ? 220 : 150, t, t + 0.4), g = this.ctx.createGain();
    o.frequency.exponentialRampToValueAtTime(chip ? 60 : 42, t + (chip ? 0.06 : 0.12));
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (chip ? 0.18 : 0.38));
    o.connect(g); g.connect(this.bus);
  },
  snare(t, v, len = 0.16, rev = 0.25) {
    const n = this._noise(t, t + len + 0.05), f = this._f('bandpass', 1900, 0.8), g = this.ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    n.connect(f); f.connect(g); g.connect(this.bus);
    const sr = this.ctx.createGain(); sr.gain.value = rev; g.connect(sr); sr.connect(this.revIn);
    const o = this._o('triangle', 190, t, t + 0.1), og = this.ctx.createGain();
    og.gain.setValueAtTime(v * 0.6, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(og); og.connect(this.bus);
  },
  clap(t, v) {
    const f = this._f('bandpass', 1400, 1.2), g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 3; i++) { g.gain.setValueAtTime(v, t + i * 0.011); g.gain.exponentialRampToValueAtTime(v * 0.2, t + i * 0.011 + 0.009); }
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    const n = this._noise(t, t + 0.25); n.connect(f); f.connect(g); g.connect(this.bus);
    const sr = this.ctx.createGain(); sr.gain.value = 0.3; g.connect(sr); sr.connect(this.revIn);
  },
  hat(t, v, open) {
    const n = this._noise(t, t + 0.3), f = this._f('highpass', 7200, 0.6), g = this.ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.22 : 0.04));
    n.connect(f); f.connect(g); g.connect(this.bus);
  },
  pop(t) {
    const n = this._noise(t, t + 0.01), g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05 * Math.random(), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.006);
    n.connect(g); g.connect(this.out);
  },
  bass(t, m, dur, v, type = 'sine') {
    const end = t + dur + 0.08;
    const o = this._o(type === 'saw' ? 'sawtooth' : type, mtof(m), t, end);
    const g = this._g(t, v, 0.008, 0.7, 0.06, dur);
    if (type === 'saw') { const f = this._f('lowpass', 420, 2); f.frequency.setValueAtTime(420, t); f.frequency.linearRampToValueAtTime(1100, t + 0.02); f.frequency.exponentialRampToValueAtTime(380, t + dur); o.connect(f); f.connect(g); }
    else { o.connect(g); if (type === 'sine') { const o2 = this._o('triangle', mtof(m), t, end), g2 = this.ctx.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(g); } }
    g.connect(this.bus);
  },
  b808(t, m, dur, v, from) {
    const end = t + dur + 0.1, o = this._o('sine', mtof(from ?? m), t, end);
    if (from != null) o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.09);
    const ws = this.ctx.createWaveShaper(); const cu = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cu[i] = Math.tanh(x * 2.2); } ws.curve = cu;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(v * 0.5, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(ws); ws.connect(g); g.connect(this.bus);
  },
  keys(t, notes, dur, v, warm, cutoff = 2600) {
    const end = t + dur + 0.5;
    const f = this._f('lowpass', cutoff, 0.5), g = this._g(t, v, 0.006, 0.45, 0.45, dur);
    for (const m of notes) {
      const det = warm ? (Math.random() - 0.5) * 9 : 0;
      const o = this._o('sine', mtof(m), t, end); o.detune.value = det; o.connect(f);
      const o2 = this._o('sine', mtof(m) * 2.002, t, end), g2 = this.ctx.createGain(); g2.gain.value = 0.22; o2.connect(g2); g2.connect(f);
    }
    f.connect(g); g.connect(this.bus);
    const sr = this.ctx.createGain(); sr.gain.value = 0.35; g.connect(sr); sr.connect(this.revIn);
  },
  pad(t, notes, dur, v) {
    const end = t + dur + 1.4;
    const f = this._f('lowpass', 1100, 0.6), g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.7); g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, end);
    for (const m of notes) for (const d of [-8, 7]) { const o = this._o('sawtooth', mtof(m), t, end); o.detune.value = d; o.connect(f); }
    f.connect(g); g.connect(this.bus);
    const sr = this.ctx.createGain(); sr.gain.value = 0.6; g.connect(sr); sr.connect(this.revIn);
  },
  pluck(t, m, dur, v, type = 'sawtooth') {
    const o = this._o(type, mtof(m), t, t + dur + 0.2), f = this._f('lowpass', 3200, 1), g = this.ctx.createGain();
    f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(700, t + dur);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    o.connect(f); f.connect(g); g.connect(this.bus); g.connect(this.dlyIn);
  },
  lead(t, m, dur, v) {
    const o = this._o('pulse', mtof(m), t, t + dur + 0.2), f = this._f('lowpass', 3400, 0.7), g = this._g(t, v, 0.01, 0.7, 0.12, dur);
    const lfo = this._o('sine', 5.5, t, t + dur + 0.2), lg = this.ctx.createGain(); lg.gain.value = 9; lfo.connect(lg); lg.connect(o.detune);
    o.connect(f); f.connect(g); g.connect(this.bus); g.connect(this.dlyIn);
  },
  bell(t, m, v) {
    const end = t + 1.6, g = this.ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, end);
    for (const [mul, a] of [[1, 1], [2.76, 0.28], [5.4, 0.1]]) { const o = this._o('sine', mtof(m) * mul, t, end), og = this.ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(g); }
    g.connect(this.bus);
    const sr = this.ctx.createGain(); sr.gain.value = 0.4; g.connect(sr); sr.connect(this.revIn);
  },
};

// album art: gradient sleeve with the track's 3D emoji
function drawAlbumArt(ctx, tr, S) {
  const [emo, hue] = tr.art;
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, `hsl(${hue},70%,58%)`); g.addColorStop(1, `hsl(${(hue + 50) % 360},65%,22%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  ctx.globalAlpha = 0.12; ctx.strokeStyle = '#fff'; ctx.lineWidth = S * 0.004;
  for (let i = 1; i < 9; i++) { ctx.beginPath(); ctx.arc(S * 0.5, S * 0.5, S * 0.06 * i, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
  const im = EMOJI[emo];
  if (im) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = S * 0.06; ctx.shadowOffsetY = S * 0.03; ctx.drawImage(im, S * 0.2, S * 0.17, S * 0.6, S * 0.6); ctx.restore(); }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, S * 0.82, S, S * 0.18);
  ctx.fillStyle = '#fff'; ctx.font = `800 ${S * 0.07}px Manrope, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(tr.title.toUpperCase(), S * 0.06, S * 0.91);
}

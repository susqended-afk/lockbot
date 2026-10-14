// Offline-renders 20s of each track and reports peak / RMS (dBFS).
import fs from 'fs'; import path from 'path'; import http from 'http';
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const root = new URL('..', import.meta.url).pathname;
const src = ['01-util.js', '07b-music.js'].map((f) => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const page = `<!doctype html><script>const EMOJI={};const emit=()=>{};const AUDIO={ctx:null};${src}
window.run = async () => {
  const outp = [];
  for (let i = 0; i < TRACKS.length; i++) {
    const sr = 44100, secs = 20;
    const oc = new OfflineAudioContext(2, sr * secs, sr);
    AUDIO.ctx = oc; MUSIC.ctx = null; MUSIC.on = false; MUSIC.init(); MUSIC.vol = 0.5; MUSIC.out.gain.value = 0.5;
    MUSIC.idx = i; const tr = TRACKS[i];
    const rnd = mulberry32(hashStr(tr.id) + 7);
    MUSIC.st = { r: mulberry32(1), mel: Array.from({ length: 8 }, () => { const row = new Array(16).fill(0); let k = 2; for (let s = 0; s < 16; s += 2) if (rnd() < 0.4) { k = clamp(k + Math.round((rnd() - 0.5) * 3), 0, tr.scale.length - 1); row[s] = tr.scale[k]; } return row; }) };
    MUSIC.tone.frequency.value = tr.tone; MUSIC.crackle.gain.value = tr.crackle ? 0.012 : 0; MUSIC.dlyIn.gain.value = tr.delay ? 0.35 : 0.12; MUSIC.dly.delayTime.value = MUSIC.q * 3;
    let t = 0.05, step = 0, bar = 0;
    while (t < secs - 2) { tr.play(MUSIC, step, bar, t + (step % 2 ? tr.swing * MUSIC.q : 0), MUSIC.st); t += MUSIC.q; if (++step >= 16) { step = 0; bar++; } }
    const buf = await oc.startRendering();
    let peak = 0, sum = 0; const d = buf.getChannelData(0);
    for (let k = 0; k < d.length; k++) { const a = Math.abs(d[k]); if (a > peak) peak = a; sum += d[k] * d[k]; }
    outp.push({ track: tr.title, peakDb: (20 * Math.log10(peak)).toFixed(1), rmsDb: (10 * Math.log10(sum / d.length)).toFixed(1) });
  }
  return outp;
};</script>`;
const server = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(page); }).listen(8768);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(); p.on('pageerror', (e) => console.log('err', e.message));
await p.goto('http://localhost:8768/');
console.table(await p.evaluate(() => window.run()));
await b.close(); server.close();

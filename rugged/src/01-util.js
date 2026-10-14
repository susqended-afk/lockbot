// ============================================================
// UTIL
// ============================================================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const logRand = (a, b) => Math.exp(rand(Math.log(a), Math.log(b)));
const damp = (cur, target, rate, dt) => lerp(cur, target, 1 - Math.exp(-rate * dt));

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Poisson sample for small lambdas
function poisson(lambda) {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss()));
  const L = Math.exp(-lambda); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function fakeAddr() {
  let s = '';
  for (let i = 0; i < 44; i++) s += B58[Math.floor(Math.random() * 58)];
  return s;
}
const shortAddr = (a) => a.slice(0, 4) + '…' + a.slice(-4);

function fmtUSD(n, opts = {}) {
  const neg = n < 0; n = Math.abs(n);
  let s;
  if (n >= 1e9) s = (n / 1e9).toFixed(2) + 'B';
  else if (n >= 1e6) s = (n / 1e6).toFixed(2) + 'M';
  else if (n >= 1e4 || (opts.compact && n >= 1e3)) s = (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K';
  else s = n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 2 : 0, minimumFractionDigits: n < 10 && n > 0 ? 2 : 0 });
  return (neg ? '-$' : '$') + s;
}
function fmtSOL(n) {
  const a = Math.abs(n);
  const d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : 3;
  return n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
}
function fmtNum(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}
// 0.0000412 -> "0.0₄412" (how memecoin screeners show tiny prices)
const SUBS = '₀₁₂₃₄₅₆₇₈₉';
function fmtPrice(p) {
  if (p <= 0) return '0';
  if (p >= 0.01) return p.toPrecision(4);
  const s = p.toExponential(3); // e.g. 4.123e-5
  const [m, e] = s.split('e');
  const zeros = -parseInt(e, 10) - 1;
  const digits = m.replace('.', '').slice(0, 4);
  const sub = String(zeros).split('').map((d) => SUBS[+d]).join('');
  return '0.0' + sub + digits;
}
function fmtPct(x, signed = true) {
  const s = (x * 100).toFixed(Math.abs(x) < 0.1 ? 1 : 0) + '%';
  return signed && x > 0 ? '+' + s : s;
}
function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

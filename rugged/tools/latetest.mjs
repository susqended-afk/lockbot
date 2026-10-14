import fs from 'fs'; import vm from 'vm';
const dir = new URL('../src/', import.meta.url);
const code = ['01-util.js', '02-market.js'].map((f) => fs.readFileSync(new URL(f, dir), 'utf8')).join('\n');
const ctx = { console, Math }; vm.createContext(ctx);
vm.runInContext(code + '\n;globalThis.API={launchPumpCoin,launchCustomCoin};', ctx);
const env = { sentiment: 1, sizeMult: 1 };
const powerFor = (f) => 0.15 + 0.3 * Math.pow(f / 1000, 0.45);
const sizeFor = (f) => 1 + Math.max(0, Math.log10(f / 1000)) * 0.3;
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
function run(lpSol, f, kolReach) {
  const c = ctx.API.launchCustomCoin({ name: 'y', ticker: 'Y', kind: 'dog', lpSol, lpPct: 0.9, lp: 'locked', lockSec: 120, memeScore: 1.1, metaMult: 1 }, env);
  const shills = [2, 25, 50, 80];
  for (let i = 0; i < 4000; i++) {
    if (shills.length && c.t >= shills[0]) { shills.shift(); c.shill(powerFor(f), sizeFor(f)); }
    if (kolReach && i === 50) c.queueKol({ handle: '@k', followers: 1e6, reach: kolReach, bag: 20 });
    c.tick(0.1, env);
    c._pp = Math.max(c._pp || 0, c.poolSol);
    if (c.canPull() && (c.poolSol < c._pp * 0.85 || c.t > 280)) break;
  }
  const sol = c.canPull() ? c.pullLiquidity() : 0;
  return c.close(150);
}
for (const [lp, f, k] of [[25, 10000, 0], [50, 100000, 0], [100, 100000, 3], [150, 1000000, 0], [250, 1000000, 4]]) {
  const rs = Array.from({ length: 80 }, () => run(lp, f, k));
  const p = rs.map((r) => r.profit);
  console.log(`LP ${lp} SOL @${f} kol${k}: profit p10 ${q(p,.1).toFixed(0)} p50 ${q(p,.5).toFixed(0)} p90 ${q(p,.9).toFixed(0)} SOL (= $${Math.round(q(p,.5)*150)}) victims ${q(rs.map(r=>r.victims),.5)} peak $${Math.round(q(rs.map(r=>r.peakMcapUsd),.5))}`);
}

import fs from 'fs'; import vm from 'vm';
const dir = new URL('../src/', import.meta.url);
const code = ['01-util.js', '02-market.js'].map((f) => fs.readFileSync(new URL(f, dir), 'utf8')).join('\n');
const ctx = { console, Math }; vm.createContext(ctx);
vm.runInContext(code + '\n;globalThis.API={launchPumpCoin};', ctx);
const env = { sentiment: 1, sizeMult: 1 };
const rand = (a, b) => a + Math.random() * (b - a);
const powerFor = (f) => 0.06 + 0.3 * Math.pow(f / 1000, 0.45);
const sizeFor = (f) => 1 + Math.max(0, Math.log10(f / 1000)) * 0.3;
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
function run(devBuy, f, tweets) {
  const c = ctx.API.launchPumpCoin({ name: 'x', ticker: 'X', kind: 'frog', devBuy, memeScore: 0.6 + Math.random() * 0.8, metaMult: Math.random() < 0.3 ? 1.75 : 1 }, env);
  const sh = tweets.slice();
  let decideAt = 3, sellAt = Infinity;
  for (let i = 0; i < 3000; i++) {
    if (sh.length && c.t >= sh[0]) { sh.shift(); c.shill(powerFor(f), sizeFor(f)); }
    c.tick(0.1, env);
    if (c.t >= sellAt) break;
    const mc = c.mcapSol();
    // a decent human glancing at the chart every ~3s, ~1.5s to click
    if (c.t >= decideAt) {
      decideAt += rand(2, 4);
      if (c.t > 8 && ((c.athMcap > 28 * 2 && mc < c.athMcap * 0.75) || (c.t > 50 && c.attnImp + c.attnTrend < 0.06) || c.t > 280)) sellAt = c.t + rand(1, 2.5);
    }
  }
  c.devSell(1, 'main');
  return c.close(150);
}
for (const [d, f, tw] of [[0.25, 40, []], [0.25, 40, [2, 20, 45]], [0.25, 500, [2, 20, 45]], [0.5, 2000, [2, 20, 45]], [1, 10000, [2, 20, 45]], [2, 50000, [2, 20, 45]]]) {
  const rs = Array.from({ length: 200 }, () => run(d, f, tw));
  const p = rs.map((r) => r.profit);
  console.log(`dev ${d} SOL, ${f} followers, ${tw.length} tweets: profit p10 ${q(p,.1).toFixed(2)} p50 ${q(p,.5).toFixed(2)} p90 ${q(p,.9).toFixed(2)} | win ${(100*p.filter(x=>x>0).length/p.length).toFixed(0)}% | peak p50 $${Math.round(q(rs.map(r=>r.peakMcapUsd),.5))} grad ${(100*rs.filter(r=>r.graduated).length/rs.length).toFixed(0)}%`);
}

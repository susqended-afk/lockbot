import fs from 'fs'; import vm from 'vm';
const dir = new URL('../src/', import.meta.url);
const code = ['01-util.js', '02-market.js'].map((f) => fs.readFileSync(new URL(f, dir), 'utf8')).join('\n');
const ctx = { console, Math }; vm.createContext(ctx);
vm.runInContext(code + '\n;globalThis.API={launchPumpCoin,launchCustomCoin};', ctx);
const env = { sentiment: 1, sizeMult: 1 };
for (let run = 0; run < 4; run++) {
  const c = ctx.API.launchPumpCoin({ name: 'x', ticker: 'X', kind: 'frog', devBuy: 1, memeScore: 1, metaMult: 1 }, env);
  let line = '';
  for (let i = 0; i < 2400; i++) {
    if (process.argv[2] === 'shill' && [20, 200, 450].includes(i)) c.shill(0.35);
    c.tick(0.1, env);
    if (i % 50 === 0) line += `${(c.mcapSol()*150/1000).toFixed(1)}k/${c.holderCount()}${c.panic>0.3?'!':''} `;
    if (!c.isLive()) { line += ' [' + c.phase + ' @' + c.t.toFixed(0) + ']'; break; }
  }
  console.log('run', run, 'devValue', c.quoteSell(c.dev.main.tokens).toFixed(2), '\n ', line);
}

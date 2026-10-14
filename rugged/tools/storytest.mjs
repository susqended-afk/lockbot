// Story + locations playtest: THREE_DIR=... node tools/storytest.mjs <outdir>
import fs from 'fs'; import path from 'path'; import http from 'http';
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const root = new URL('..', import.meta.url).pathname;
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const THREE_DIR = process.env.THREE_DIR;
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  fs.readFile(p.endsWith('/') ? p + 'index.html' : p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(p);
    res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary' }[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(8766);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.165.0/**', (r) => r.fulfill({ path: path.join(THREE_DIR, r.request().url().split('three@0.165.0/')[1]), contentType: 'application/javascript' }));
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
const shot = async (n) => { await page.screenshot({ path: path.join(out, n + '.png') }); console.log('shot', n); };
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const tick = (n) => ev((k) => { const r = window.__rug; for (let i = 0; i < k; i++) r.gameTick(0.1); }, n);
const look = async (x, z, yaw, pitch, n) => { await ev(([x, z, yaw, pitch]) => { const p = window.__rug.player(); p.pos.set(x, 0, z); p.yaw = yaw; p.pitch = pitch; }, [x, z, yaw, pitch]); await page.waitForTimeout(1300); await shot(n); };
const closeModal = async () => { await page.waitForSelector('#modal:not([hidden])', { timeout: 60000 }); await page.click('#modal [data-modal]'); await page.waitForTimeout(200); };
// pull the next story event into view and answer it
const drain = async () => { for (let i = 0; i < 6; i++) { const b = await page.$('#modal:not([hidden]) .choice:not([disabled]), #modal:not([hidden]) [data-modal]'); if (!b) break; await b.click(); await page.waitForTimeout(250); } };
const answer = async (choice, n) => {
  await ev(() => { const r = window.__rug; r.G.mode = 'walk'; r.G.paused = false; document.querySelector('#menu').hidden = true; r.presentEvents(); });
  await page.waitForSelector('.mbox.ev', { timeout: 10000 });
  await page.waitForTimeout(300);
  if (n) await shot(n);
  const title = await page.$eval('.mbox.ev h2', (e) => e.textContent);
  await page.click(`[data-choice="${choice}"]`);
  await page.waitForTimeout(300);
  const txt = await page.evaluate(() => { const m = document.querySelector('#modal:not([hidden]) .mbox:not(.ev) p'); return m ? m.textContent : null; });
  console.log(`event "${title}" -> ${choice}${txt ? ': ' + txt : ''}`);
  if (txt) await page.click('#modal [data-modal]');
  await page.waitForTimeout(200);
};
const move = async (id) => {
  await drain();
  const err = await ev((i) => window.__rug.buyItem(i), id);
  if (err) throw new Error('move failed: ' + err);
  await page.waitForFunction(() => /Welcome to/.test(document.querySelector('#modal')?.textContent || '') && !document.querySelector('#modal').hidden, null, { timeout: 120000 });
  await shot('move_' + id);
  await page.click('#modal [data-modal]');
  await page.waitForTimeout(300);
};

await page.goto('http://localhost:8766/index.html#debug');
await page.waitForSelector('#menu:not([hidden])', { timeout: 240000 });
await page.click('[data-m=newpick]');
await page.waitForTimeout(300);
await shot('00_modepick');
await page.click('[data-m=new][data-mode=story]');
await page.waitForTimeout(800);
await shot('01_chapter1_card');
await closeModal();
await page.waitForTimeout(600);
await shot('02_basement');

// ---- buy everything, move to the apartment ----
await ev(() => { const r = window.__rug; r.S.cash = 5e6; r.S.sol = 400; r.S.followers = 1200;
  for (const id of ['monitor2', 'monitor3', 'mechKeyboard', 'ringLight', 'gamingChair', 'gamingPC', 'neon', 'ledStrip', 'espresso', 'aquarium', 'vending', 'stream', 'chain', 'rolex', 'statue', 'toilet', 'lambo', 'couchTV', 'rug', 'posters', 'lavaLamp', 'arcade', 'serverRack', 'miningRig', 'bed', 'kev', 'mo', 'coldWallet']) { const e = r.buyItem(id); if (e) console.log(id, e); } });
await page.waitForTimeout(1500);
await look(0.4, 0.6, 0.35, -0.08, '03_basement_full');
await move('apartment');
await look(-1.2, 0.6, 0.25, -0.08, '04_apartment_desk');
await look(0.0, -0.8, Math.PI, -0.05, '05_apartment_window');
await look(1.6, 0.2, -1.25, -0.1, '06_apartment_kitchen_bed');
await look(-1.0, 0.0, 1.57, -0.06, '07_apartment_lounge');

// ---- chapter 2 events ----
await tick(1200);
console.log('queue', await ev(() => JSON.stringify(window.__rug.S.story.q)));
await answer('clap', '08_event_samurai');
await ev(() => { const r = window.__rug; r.queueEvent('phish', 1); });
await answer('connect', '09_event_phish');
await ev(() => { const r = window.__rug; r.queueEvent('summitInvite'); });
await answer('go', '10_event_summit');
await answer('honest', '11_summit_panel');
await answer('roast', '12_summit_party');
await ev(() => { const r = window.__rug; r.G.mode = 'walk'; r.G.paused = false; document.querySelector('#menu').hidden = true; r.presentEvents(); });
await page.waitForSelector('.mbox.ev', { timeout: 10000 });
await shot('13_summit_fan');
await page.click('.mbox.ev .choice:not([disabled])');
await page.waitForTimeout(400);
if (await page.$('#modal:not([hidden]) [data-modal]')) await page.click('#modal [data-modal]');
await page.waitForTimeout(1500);
await shot('14_back_from_summit');
await closeModal().catch(() => {});
console.log('done', await ev(() => JSON.stringify(window.__rug.S.done)), 'day', await ev(() => window.__rug.S.day));

// ---- hype house ----
await ev(() => { const r = window.__rug; r.S.followers = 12000; });
await move('hypehouse');
await ev(() => { const r = window.__rug; for (const id of ['zoe', 'dex']) { const e = r.buyItem(id); if (e) console.log(id, e); } });
await page.waitForTimeout(800);
await look(0.6, -1.6, 0, -0.05, '15_hype_desks');
await look(-1, -0.5, Math.PI - 0.2, -0.05, '16_hype_pool');
await look(-2.6, 1.2, 1.57, -0.06, '17_hype_lounge');
await look(3.5, -0.8, -1.2, -0.08, '18_hype_kitchen');
await drain(); await ev(() => { const r = window.__rug; r.S.story.q = []; r.startCeleb(); });
await answer('warn', '19_event_celeb');
await ev(() => { const r = window.__rug; const c = r.ECO.find((x) => x.celeb); if (c) { c.npc.rugAt = 0; } });
await drain(); await tick(80); await ev(() => { const q = window.__rug.S.story.q; window.__rug.S.story.q = q.filter(([t]) => t === 'celebAfter'); });
await answer('ok', '20_event_celeb_after');

// ---- penthouse ----
await ev(() => { const r = window.__rug; r.S.followers = 70000; });
await move('penthouse');
await look(0, 0.6, Math.PI, -0.05, '21_pent_desk');
await look(1.5, 1.0, -2.3, -0.05, '22_pent_corner');
await look(-2.5, 0, 1.57, -0.06, '23_pent_lounge');
await look(2.0, 0.0, 0, -0.05, '24_pent_kitchen');
await drain(); await tick(250); await ev(() => { const q = window.__rug.S.story.q; window.__rug.S.story.q = q.filter(([t]) => t === 'lastIntro'); });
await answer('ok', '25_event_lastcoin');
await ev(() => { const r = window.__rug; const e = r.launchCoin({ type: 'pump', name: 'Last Coin', ticker: 'LAST', kind: 'moon', devBuy: 2 }); if (e) console.log('launch', e); });
await ev(() => { const r = window.__rug; r.LIVE[0].t = 300; });
await tick(30);
await ev(() => { const r = window.__rug; r.G.mode = 'walk'; r.G.paused = false; document.querySelector('#menu').hidden = true; r.presentEvents(); });
await page.waitForSelector('.mbox.ev.finale', { timeout: 10000 });
await shot('26_finale');
await page.click('[data-choice=villain]');
await page.waitForSelector('.ending', { timeout: 10000 });
await page.waitForTimeout(500);
await shot('27_ending');
await page.click('[data-modal=sandbox]');
await page.waitForTimeout(800);
// ---- PC apps with story content ----
await ev(() => { const r = window.__rug; r.sitAtPC(); });
await page.waitForTimeout(1500);
for (const a of ['home', 'chirp', 'shop', 'trenches']) { await ev((x) => { const U = window.__rug.UI; U.app = x; if (x === 'shop') U.shopCat = 'Real estate'; U.renderPC(); }, a); await page.waitForTimeout(500); await shot('28_pc_' + a); }
// save/load round trip in the penthouse
await ev(() => { window.__rug.saveGame(); });
const ok = await ev(() => window.__rug.loadGame());
console.log('reload', ok, await ev(() => window.__rug.S.loc));
console.log('ERRORS', errors.length ? errors.slice(0, 20).join('\n') : 'none');
await browser.close(); server.close();

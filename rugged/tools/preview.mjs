// Renders preview shots of the scene with headless Chromium.
// usage: node tools/preview.mjs <outdir> [shot ...]
import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const root = new URL('..', import.meta.url).pathname;
const out = process.argv[2]; const shots = process.argv.slice(3);
const parts = ['00-imports.js', '01-util.js', '02-market.js', '03-textures.js', '05-world.js', '06-characters.js'].map((f) => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const preview = fs.readFileSync(path.join(root, 'tools', 'preview-main.js'), 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"}}</script>
</head><body><script type="module">${parts}\n${preview}</script></body></html>`;
const THREE_DIR = process.env.THREE_DIR;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[p]')) console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.route('https://cdn.jsdelivr.net/npm/three@0.165.0/**', (r) => {
  const rel = r.request().url().split('three@0.165.0/')[1];
  r.fulfill({ path: path.join(THREE_DIR, rel), contentType: 'application/javascript' });
});
await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
await page.setContent(html, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 240000 });
for (const s of shots) {
  await page.evaluate((s) => window.__shot(s), s);
  await page.screenshot({ path: path.join(out, s + '.png') });
  console.log('shot', s);
}
await browser.close();

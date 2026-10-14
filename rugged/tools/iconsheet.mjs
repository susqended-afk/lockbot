// Renders all coin logos to a PNG sheet for review.
import fs from 'fs'; import path from 'path'; import http from 'http';
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const root = new URL('..', import.meta.url).pathname;
const src = ['01-util.js', '02-market.js'].map((f) => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const tex = fs.readFileSync(path.join(root, 'src', '03-textures.js'), 'utf8');
const server = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(`<!doctype html><body style="margin:0;background:#0c1016"><canvas id=c width=960 height=576></canvas><script>const THREE={};${src}\n${tex}\nloadEmoji().then(()=>{const ctx=document.getElementById('c').getContext('2d');Object.keys(MEME_KINDS).forEach((k,i)=>{for(let j=0;j<2;j++){const cv=newCanvas(128);drawMemeIcon(cv.getContext('2d'),k,(i*47+j*120)%360,128,i*3+j+1);ctx.drawImage(cv,((i*2+j)%7)*136+8,Math.floor((i*2+j)/7)*136+8);}});window.done=1;});</script>`); return; }
  fs.readFile(path.join(root, req.url), (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': 'image/png' }); res.end(d); } });
}).listen(8766);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 960, height: 576 } });
p.on('pageerror', (e) => console.log('err', e.message));
await p.goto('http://localhost:8766/'); await p.waitForFunction(() => window.done === 1);
await p.screenshot({ path: process.argv[2] }); await b.close(); server.close();

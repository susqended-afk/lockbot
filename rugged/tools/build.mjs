// Build: node tools/build.mjs [artifactOut]
// Concatenates src/*.js (in filename order) into one module and writes
// index.html (full page). With an argument, also writes a body-only
// fragment for hosts that supply their own <html>/<head> skeleton.
import fs from 'fs'; import path from 'path';
const root = path.dirname(new URL('..', import.meta.url).pathname + 'x');
const src = path.join(root, 'src');
const parts = fs.readdirSync(src).filter((f) => f.endsWith('.js')).sort();
let js = parts.map((f) => `// ---- ${f} ----\n` + fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
if (js.includes('</script')) throw new Error('JS contains </script');
const head = fs.readFileSync(path.join(src, 'head.html'), 'utf8');
const body = fs.readFileSync(path.join(src, 'body.html'), 'utf8').replace('/*__GAME__*/', () => js);
const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n${head}</head>\n<body>\n${body}</body>\n</html>\n`;
fs.writeFileSync(path.join(root, 'index.html'), full);
console.log('wrote index.html', (full.length / 1024).toFixed(0) + 'KB', 'from', parts.length, 'parts');
if (process.argv[2]) { fs.writeFileSync(process.argv[2], head + body); console.log('wrote fragment', process.argv[2]); }

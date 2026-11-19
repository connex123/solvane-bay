// Serves game/ locally and loads ?selftest=1 (or another query) in headless Chrome; prints the page title
// (SELFTEST PASS / FAIL ...) and any console errors. Node standard library only. Usage: node tools/run-selftest.mjs [query]
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../game', import.meta.url)));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname, p = normalize(join(root, decodeURIComponent(path === '/' ? '/index.html' : path)));
  try { if (!p.startsWith(root) || !statSync(p).isFile()) throw 0; res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(res); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const query = process.argv[2] || '?selftest=1';
const flags = ['--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,800', '--virtual-time-budget=60000', '--enable-logging=stderr', '--v=0', '--dump-dom'];
const out = await new Promise((done) => { let o = '', e = ''; const ch = spawn('google-chrome', [...flags, `http://localhost:${server.address().port}/index.html${query}`]); ch.stdout.on('data', (d) => { o += d; }); ch.stderr.on('data', (d) => { e += d; }); ch.on('close', () => done({ o, e })); });
console.log((out.o.match(/<title>([^<]*)<\/title>/) || [, 'NO TITLE'])[1]);
const errs = out.e.split('\n').filter((l) => /CONSOLE_ERROR|Uncaught|BOOT_FAIL/.test(l) && !l.includes('chrome-extension://')).slice(0, 8); if (errs.length) console.log(errs.map((l) => l.slice(0, 500)).join('\n'));
server.close();

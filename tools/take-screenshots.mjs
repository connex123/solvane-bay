// Serves game/ on a local port and renders each staged scene listed in shots.json with headless Chromium (Playwright),
// then writes a JPEG of at most 250 KB per scene to screenshots/ (JPEG conversion uses python3 + PIL).
// Usage: node tools/take-screenshots.mjs [scene-name ...]   (no names: every entry in shots.json)
import { createServer } from 'node:http';
import { createReadStream, statSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright; try { playwright = require('playwright'); } catch { playwright = require(require.resolve('playwright', { paths: ['/usr/lib/node_modules', '/usr/local/lib/node_modules', process.cwd()] })); }
const root = resolve(fileURLToPath(new URL('../game', import.meta.url))), shots = resolve(fileURLToPath(new URL('../screenshots', import.meta.url)));
const list = JSON.parse(readFileSync(fileURLToPath(new URL('../shots.json', import.meta.url)), 'utf8'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname, p = normalize(join(root, decodeURIComponent(path === '/' ? '/index.html' : path)));
  try { if (!p.startsWith(root) || !statSync(p).isFile()) throw 0; res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(res); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r)); const port = server.address().port;
const want = process.argv.slice(2), todo = list.filter((s) => !want.length || want.some((w) => s.name.startsWith(w)));
const tmp = '/tmp/solvane-shots'; mkdirSync(shots, { recursive: true }); mkdirSync(tmp, { recursive: true });
const browser = await playwright.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
for (const s of todo) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }), errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || /CONSOLE_ERROR|BOOT_FAIL/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  const t0 = Date.now();
  await page.goto(`http://localhost:${port}/index.html${s.query}`);
  await page.waitForFunction(() => document.title === 'SHOT_READY' || document.title.startsWith('BOOT_FAIL'), null, { timeout: 240000 });
  await page.waitForTimeout(400);
  const base = s.name.replace(/\.(jpe?g|png)$/i, ''), png = `${tmp}/${base}.png`; await page.screenshot({ path: png });
  if (errs.length) console.log(`[${s.name}] console:\n  ` + errs.slice(0, 8).join('\n  '));
  await page.close();
  const py = `from PIL import Image; import os,sys
im=Image.open(sys.argv[1]).convert('RGB'); out=sys.argv[2]
for q in range(94,30,-2):
    im.save(out,'JPEG',quality=q,optimize=True,progressive=True,subsampling=0 if q>=88 else 2)
    if os.path.getsize(out)<250*1000: break
print(out, os.path.getsize(out), 'q', q)`;
  console.log(execFileSync('python3', ['-c', py, png, join(shots, s.name)], { encoding: 'utf8' }).trim(), `${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
await browser.close(); server.close();

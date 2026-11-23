// Serves game/ locally and loads ?selftest=1 (or another query) in headless Chromium via Playwright; prints the page
// title (SELFTEST PASS / FAIL ...) and any console errors. Usage: node tools/run-selftest.mjs [query]
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const playwright = createRequire(import.meta.url)('playwright');
const root = resolve(fileURLToPath(new URL('../game', import.meta.url)));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname, p = normalize(join(root, decodeURIComponent(path === '/' ? '/index.html' : path)));
  try { if (!p.startsWith(root) || !statSync(p).isFile()) throw 0; res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(res); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const query = process.argv[2] || '?selftest=1', errs = [];
const browser = await playwright.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => errs.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' || /CONSOLE_ERROR|BOOT_FAIL/.test(m.text())) errs.push(m.text()); });
await page.goto(`http://localhost:${server.address().port}/index.html${query}`);
try { await page.waitForFunction(() => /SELFTEST|SHOT_READY|BOOT_FAIL/.test(document.title), null, { timeout: 240000 }); } catch { /* reported below */ }
console.log(await page.title()); if (errs.length) console.log(errs.slice(0, 8).map((l) => l.slice(0, 500)).join('\n'));
await browser.close(); server.close();

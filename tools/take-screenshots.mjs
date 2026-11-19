// Serves game/ on a local port and shoots the four staged scenes with headless Chrome, then writes JPEGs < 250 KB
// to screenshots/. Node standard library only (JPEG conversion uses python3 + PIL). Usage: node tools/take-screenshots.mjs [scene...]
import { createServer } from 'node:http';
import { createReadStream, statSync, mkdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../game', import.meta.url))), shots = resolve(fileURLToPath(new URL('../screenshots', import.meta.url)));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname === '/' ? '/index.html' : new URL(req.url, 'http://x').pathname)));
  try { if (!p.startsWith(root) || !statSync(p).isFile()) throw 0; res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(res); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r)); const port = server.address().port;
const scenes = process.argv.slice(2).length ? process.argv.slice(2) : ['1-chase', '2-onfoot', '3-crew', '4-title'];
mkdirSync(shots, { recursive: true }); mkdirSync('/tmp/solvane-shots', { recursive: true });
const flags = ['--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--window-size=1280,800', '--virtual-time-budget=20000', '--enable-logging=stderr', '--v=0'];
for (const s of scenes) {
  const png = `/tmp/solvane-shots/${s}.png`;
  const r = await new Promise((done) => { let err = ''; const ch = spawn('google-chrome', [...flags, `--screenshot=${png}`, `http://localhost:${port}/index.html?shot=${s}&seed=1`]); ch.stderr.on('data', (d) => { err += d; }); ch.stdout.on('data', () => {}); const t = setTimeout(() => ch.kill(), 170000); ch.on('close', () => { clearTimeout(t); done({ stderr: err }); }); });
  const errs = (r.stderr || '').split('\n').filter((l) => /CONSOLE_ERROR|Uncaught|BOOT_FAIL/.test(l)).slice(0, 6); if (errs.length) console.log(`[${s}] console:\n  ` + errs.join('\n  '));
  const py = `from PIL import Image; import os,sys
im=Image.open(sys.argv[1]).convert('RGB').resize((1280,800)); out=sys.argv[2]
for q in range(95,30,-3):
    im.save(out,'JPEG',quality=q,optimize=True,progressive=True)
    if os.path.getsize(out)<250*1000: break
print(out, os.path.getsize(out), 'q', q)`;
  console.log(execFileSync('python3', ['-c', py, png, join(shots, `${s}.jpg`)], { encoding: 'utf8' }).trim());
}
server.close();

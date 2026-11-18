// Real play-test over the Chrome DevTools Protocol: serves game/, opens index.html in headless Chrome (normal mode),
// clicks New Game, walks, sprints, shoots, finds a parked car, presses F, drives, opens the map and pause menu, and prints a
// report (console errors, fps, what worked) from the read-only window.__solvane hook. Node standard library only.
// Usage: node tools/playtest.mjs   (exit code 1 when a check fails or the page logs errors)
import { createServer } from 'node:http';
import { createReadStream, statSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { extname, join, normalize, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../game', import.meta.url)));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname, p = normalize(join(root, decodeURIComponent(path === '/' ? '/index.html' : path)));
  try { if (!p.startsWith(root) || !statSync(p).isFile()) throw 0; res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(res); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port, dbg = 9300 + Math.floor(Math.random() * 500), profile = mkdtempSync(join(tmpdir(), 'solvane-pt-'));
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--remote-debugging-port=${dbg}`,
  `--user-data-dir=${profile}`, '--window-size=1280,800', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now(), log = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s] ${s}`);
const kill = setTimeout(() => { console.log('TIMEOUT'); finish(1); }, 150000);

let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ } }
if (!target) { console.log('could not reach Chrome DevTools'); finish(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map(), errors = [], warnings = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'warning') warnings.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon/.test(m.params.entry.url || '')) errors.push('log: ' + m.params.entry.text);
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const state = () => evaluate('window.__solvane && window.__solvane.state()');
const KEYS = { KeyW: ['w', 87], KeyA: ['a', 65], KeyS: ['s', 83], KeyD: ['d', 68], KeyF: ['f', 70], KeyM: ['m', 77], KeyE: ['e', 69], Escape: ['Escape', 27], ShiftLeft: ['Shift', 16], Digit2: ['2', 50] };
const key = (type, code) => send('Input.dispatchKeyEvent', { type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1], nativeVirtualKeyCode: KEYS[code][1] });
const hold = async (codes, ms) => { for (const c of codes) await key('keyDown', c); await sleep(ms); for (const c of codes.slice().reverse()) await key('keyUp', c); };
const tap = (code) => hold([code], 120);
const mouse = (type, x, y, button = 'left') => send('Input.dispatchMouseEvent', { type, x, y, button, buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
const click = async (x, y) => { await mouse('mouseMoved', x, y, 'none'); await mouse('mousePressed', x, y); await sleep(60); await mouse('mouseReleased', x, y); };
const waitFor = async (pred, ms = 4000) => { const end = Date.now() + ms; let q; do { q = await state(); if (q && pred(q)) return q; await sleep(150); } while (Date.now() < end); return q; };
const results = []; const check = (name, ok, info = '') => { results.push({ name, ok }); log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
let s; for (let i = 0; i < 120; i++) { await sleep(500); s = await state(); if (s?.screens?.includes('title')) break; }
check('boots to the title screen', !!s?.screens?.includes('title'), s ? `screens=${s.screens}` : 'no hook');

const btn = await evaluate(`(() => { const r = document.querySelector('[data-act="new"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
await click(btn[0], btn[1]); s = await waitFor((q) => q.mode === 'play' && !q.screens.length);
check('New Game starts play', s.mode === 'play' && !s.screens.length, `mode=${s.mode} mission=${s.mission?.title || '-'}`);

s = await waitFor((q) => q.fps >= 3.5, 15000); log(`warm-up done: ${s.fps} fps, adaptive quality level ${s.quality}`); // shader compiles + quality scaling
const holdSample = async (codes, ms) => { for (const c of codes) await key('keyDown', c); let top = 0; const end = Date.now() + ms; while (Date.now() < end) { await sleep(200); top = Math.max(top, (await state()).moveSpeed); } for (const c of codes) await key('keyUp', c); return top; };
const p0 = { x: s.x, z: s.z }; const walkSp = await holdSample(['KeyS'], 2000); s = await state(); const walk = Math.hypot(s.x - p0.x, s.z - p0.z);
check('S/W walks', walk > 1.5 && walkSp > 3, `moved ${walk.toFixed(1)} m at ${walkSp} m/s`);
const p1 = { x: s.x, z: s.z }; const sprintSp = await holdSample(['ShiftLeft', 'KeyW'], 2000); s = await state(); const sprint = Math.hypot(s.x - p1.x, s.z - p1.z);
check('Shift sprints', sprintSp > walkSp * 1.4, `${sprintSp} m/s vs ${walkSp} m/s walking (moved ${sprint.toFixed(1)} m)`);

await tap('Digit2'); const ammo0 = (await state()).ammo.pistol;
for (let k = 0; k < 3; k++) { await mouse('mousePressed', 640, 400); await sleep(150); await mouse('mouseReleased', 640, 400); await sleep(450); }
s = await state(); check('mouse fires the pistol (3 clicks)', s.ammo.pistol <= ammo0 - 2, `pistol ammo ${ammo0} -> ${s.ammo.pistol}, stars=${s.stars}, mode=${s.mode}, weapon=${s.weapon}, screens=${s.screens}`);
if (!s.screens.length && s.mode !== 'play') { await tap('Escape'); await sleep(300); }

// walk to the nearest parked car: pick the WASD combination closest to the bearing (camera-relative), re-evaluated every 150 ms
const DIRS = [[['KeyW'], 0], [['KeyW', 'KeyA'], Math.PI / 4], [['KeyA'], Math.PI / 2], [['KeyS', 'KeyA'], 3 * Math.PI / 4], [['KeyS'], Math.PI], [['KeyS', 'KeyD'], -3 * Math.PI / 4], [['KeyD'], -Math.PI / 2], [['KeyW', 'KeyD'], -Math.PI / 4]];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)); let held = [];
const setHeld = async (codes) => { for (const c of held) if (!codes.includes(c)) await key('keyUp', c); for (const c of codes) if (!held.includes(c)) await key('keyDown', c); held = codes; };
let reached = false; const tWalk = Date.now();
while (Date.now() - tWalk < 25000) {
  s = await state(); const n = s.nearCar; if (!n) break; const d = Math.hypot(n.dx, n.dz); if (d < 3.6) { reached = true; break; }
  const rel = wrap(Math.atan2(n.dx, n.dz) - s.camYaw); let best = DIRS[0]; for (const dd of DIRS) if (Math.abs(wrap(rel - dd[1])) < Math.abs(wrap(rel - best[1]))) best = dd;
  await setHeld(['ShiftLeft', ...best[0]]); await sleep(150);
}
await setHeld([]); await sleep(200);
check('reaches a parked car on foot', reached, `nearest ${s.nearCar?.kind} at ${Math.hypot(s.nearCar?.dx || 0, s.nearCar?.dz || 0).toFixed(1)} m`);
await tap('KeyF'); s = await waitFor((q) => q.playerMode === 'driving', 3000);
check('F steals the car', s.playerMode === 'driving', `mode=${s.playerMode} model=${s.car?.model || '-'}`);

const c0 = { x: s.x, z: s.z }; let top = 0;
const drive = async (codes, ms) => { await setHeld(codes); const end = Date.now() + ms; while (Date.now() < end) { await sleep(250); const q = await state(); top = Math.max(top, q.car?.kmh || 0); } };
await drive(['KeyW'], 3500); await drive(['KeyW', 'KeyA'], 900); await drive(['KeyW'], 1200); await drive(['KeyW', 'KeyD'], 900); await drive(['KeyW'], 1000); await setHeld([]);
s = await state(); const dist = Math.hypot(s.x - c0.x, s.z - c0.z);
check('W/A/D drives the car', s.playerMode === 'driving' && dist > 15 && top > 20, `moved ${dist.toFixed(0)} m, top ${top} km/h`);
await hold(['KeyS'], 1500);

await tap('KeyM'); s = await waitFor((q) => q.screens.includes('cityMap')); check('M opens the city map', s.screens.includes('cityMap') && s.mode === 'pause', `screens=${s.screens}`);
await tap('KeyM'); s = await waitFor((q) => q.mode === 'play'); check('M closes the map', s.mode === 'play' && !s.screens.length, `mode=${s.mode} screens=${s.screens}`);
await tap('Escape'); s = await waitFor((q) => q.mode === 'pause'); check('Esc pauses', s.mode === 'pause' && s.screens.includes('pause'), `mode=${s.mode} screens=${s.screens}`);
const rb = await evaluate(`(() => { const b = document.querySelector('#pause [data-act="resume"]'); if (!b) return null; const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
if (rb) await click(rb[0], rb[1]); s = await waitFor((q) => q.mode === 'play'); check('Resume returns to play', s.mode === 'play', `mode=${s.mode} screens=${s.screens}`);
await sleep(3000); s = await state();

console.log('\n=== SOLVANE BAY play-test report ===');
console.log(`checks: ${results.filter((r) => r.ok).length}/${results.length} passed${results.some((r) => !r.ok) ? '  (failed: ' + results.filter((r) => !r.ok).map((r) => r.name).join('; ') + ')' : ''}`);
console.log(`fps (last 3 s, headless SwiftShader software GL): ${s.fps} at adaptive quality level ${s.quality}`);
console.log(`world: ${s.cars} cars, ${s.peds} pedestrians, ${s.cops} police, wanted ${s.stars}*`);
console.log(`console errors: ${errors.length}${errors.length ? '\n  ' + [...new Set(errors)].slice(0, 12).join('\n  ') : ''}`);
if (warnings.length) console.log(`console warnings: ${warnings.length}\n  ` + [...new Set(warnings)].slice(0, 5).join('\n  '));
finish(errors.length || results.some((r) => !r.ok) ? 1 : 0);

function finish(code) { clearTimeout(kill); try { ws?.close(); } catch { /* closing */ } chrome.kill('SIGKILL'); server.close(); try { rmSync(profile, { recursive: true, force: true }); } catch { /* temp */ } process.exit(code); }

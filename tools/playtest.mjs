// Real play-test over the Chrome DevTools Protocol (Node standard library only; Node 24 global WebSocket).
// Serves game/, opens index.html in headless Chrome, clicks New Game, walks, sprints, shoots, steers to a car and steals it,
// drives, opens the map, pauses and resumes, and reads state back from the read-only window.__solvane hook.
// Prints a report: console errors, fps, and whether each step worked. Usage: node tools/playtest.mjs
import { createServer } from 'node:http';
import { createReadStream, statSync, mkdtempSync } from 'node:fs';
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
await new Promise((r) => server.listen(0, r)); const port = server.address().port, dport = 9300 + Math.floor(Math.random() * 500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--remote-debugging-port=${dport}`, '--window-size=1280,800',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'solvane-pt-'))}`, '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const killAll = () => { try { chrome.kill('SIGKILL'); } catch { /* gone */ } server.close(); };
const hardStop = setTimeout(() => { console.log('TIMEOUT: play-test exceeded 150 s'); killAll(); process.exit(2); }, 150000);

let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${dport}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ } }
if (!target) { console.log('could not reach Chrome DevTools'); killAll(); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0; const pending = new Map(), errors = [], warnings = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
  if (d.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split('\n')[0]);
  if (d.method === 'Runtime.consoleAPICalled') { const t = d.params.args.map((a) => a.value ?? a.description).join(' '); if (d.params.type === 'error') errors.push(t); else if (d.params.type === 'warning') warnings.push(t); }
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error' && !/favicon/.test(d.params.entry.url || '')) errors.push('log: ' + d.params.entry.text);
};
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;
const state = () => evalJs('window.__solvane && JSON.parse(JSON.stringify(window.__solvane))');
const KEYS = { KeyW: ['w', 87], KeyA: ['a', 65], KeyD: ['d', 68], KeyS: ['s', 83], KeyF: ['f', 70], KeyM: ['m', 77], KeyE: ['e', 69], Escape: ['Escape', 27], ShiftLeft: ['Shift', 16], ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39], Space: [' ', 32] };
const key = (code, type) => send('Input.dispatchKeyEvent', { type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1], nativeVirtualKeyCode: KEYS[code][1] });
const down = (c) => key(c, 'rawKeyDown'), up = (c) => key(c, 'keyUp');
const tap = async (c, ms = 120) => { await down(c); await sleep(ms); await up(c); };
const click = async (x, y) => { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await sleep(40); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
const clickSel = async (sel) => { const r = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.offsetParent === null) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`); if (r) await click(r[0], r[1]); return !!r; };
const report = []; const check = (name, ok, info = '') => { report.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); return ok; };
const t0 = Date.now();

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Page.navigate', { url: `http://localhost:${port}/index.html` });
let s; for (let i = 0; i < 120; i++) { await sleep(500); s = await state(); if (s?.screen === 'title') break; }
check('boots to the title screen', s?.screen === 'title', `${((Date.now() - t0) / 1000).toFixed(1)} s`);

// New Game: the click must start the game and must not fire the gun.
const ammo0 = s?.ammo?.pistol; await clickSel('[data-act=new]'); await sleep(1200); s = await state();
check('New Game starts play', s?.mode === 'play', `mode=${s?.mode}`);
check('menu click does not fire the gun', s?.ammo?.pistol === 60, `pistol ammo ${ammo0} -> ${s?.ammo?.pistol}`);
await tap('KeyE'); // dismiss the opening line

// Walk, then sprint; sim time must keep pace with wall time (no slow motion at low fps).
let a = await state(), w0 = Date.now(); await down('KeyW'); await sleep(2000); let b = await state();
const walked = Math.hypot(b.x - a.x, b.z - a.z), simRate = (b.simTime - a.simTime) / ((Date.now() - w0) / 1000);
await down('ShiftLeft'); await sleep(2000); const c = await state(); await up('ShiftLeft'); await up('KeyW');
const sprinted = Math.hypot(c.x - b.x, c.z - b.z);
check('W walks', walked > 3, `${walked.toFixed(1)} m in 2 s`);
check('Shift sprints faster', sprinted > walked * 1.2, `${sprinted.toFixed(1)} m in 2 s`);
check('simulation runs in real time', simRate > 0.85 && simRate < 1.15, `sim/wall = ${simRate.toFixed(2)} at ${c.fps} fps`);

// Shoot (clicks on the canvas), then confirm the police respond.
s = await state(); const ammoBefore = s.ammo.pistol; for (let i = 0; i < 6; i++) { await click(640, 400); await sleep(260); }
s = await state(); check('clicking shoots', s.ammo.pistol < ammoBefore, `pistol ammo ${ammoBefore} -> ${s.ammo.pistol}, ${s.stars} stars`);
let starsAfterShots = s.stars;
for (let i = 0; i < 16 && s.stars === 0; i++) { await click(640, 400); await sleep(300); s = await state(); }
starsAfterShots = s.stars; const under = await evalJs('(() => { const e = document.elementFromPoint(640, 400); return e.id || e.className || e.tagName; })()'); check('gunfire near people raises the wanted level', starsAfterShots > 0, `${starsAfterShots} stars, heat ${s.heat}, pistol ammo ${s.ammo.pistol}, element under cursor: ${under}`);
for (let i = 0; i < 16 && s.cops + s.copsOnFoot === 0; i++) { await sleep(500); s = await state(); }
check('police respond', s.cops + s.copsOnFoot > 0, `${s.cops} cruisers, ${s.copsOnFoot} officers on foot`);

// Steer to the nearest civilian car and steal it with F.
let entered = false;
for (let i = 0; i < 90 && !entered; i++) {
  s = await state(); if (!s.onFoot) { entered = true; break; }
  if (s.nearCar) { await tap('KeyF'); await sleep(400); continue; }
  const n = s.nearestCar; if (!n) break;
  let diff = Math.atan2(n.dx, n.dz) - s.camYaw; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > 0.25) { await up('KeyW'); const k = diff > 0 ? 'ArrowLeft' : 'ArrowRight'; await down(k); await sleep(Math.min(500, Math.abs(diff) / 1.8 * 1000)); await up(k); }
  else { await down('KeyW'); await sleep(Math.min(600, n.d * 120)); }
}
await up('KeyW'); s = await state();
check('F near a car enters/steals it', !s.onFoot, s.car ? `driving ${s.car}` : `nearest car ${s.nearestCar?.d} m`);

// Drive: throttle, steer left and right.
if (!s.onFoot) {
  const d0 = await state(); await down('KeyW'); await sleep(2500); await down('KeyA'); await sleep(700); await up('KeyA'); await down('KeyD'); await sleep(700); await up('KeyD'); await sleep(800);
  const d1 = await state(); await up('KeyW');
  check('driving moves the car', Math.hypot(d1.x - d0.x, d1.z - d0.z) > 15, `${Math.hypot(d1.x - d0.x, d1.z - d0.z).toFixed(0)} m, ${d1.speedKmh} km/h`);
  await down('KeyW'); await sleep(600); const n0 = await state(); await down('ShiftLeft'); await sleep(1200); const n1 = await state(); await up('ShiftLeft'); await up('KeyW');
  check('Shift in a car burns nitro', n1.nitro < n0.nitro - 0.15 || n1.boosting, `nitro ${n0.nitro} -> ${n1.nitro}`);
  check('car condition reads 0-100 %', n1.condition >= 0 && n1.condition <= 100, `${n1.condition}%`);
  await down('KeyS'); await sleep(1500); await up('KeyS');
}

// City map and pause menu; Resume by click must not fire.
await tap('KeyM'); await sleep(700); s = await state(); check('M opens the city map', s.screen === 'cityMap', `screen=${s.screen}`);
await tap('KeyM'); await sleep(700); s = await state(); check('M closes the map', s.mode === 'play' && !s.screen, `mode=${s.mode}`);
await tap('Escape'); await sleep(700); s = await state(); check('Esc pauses', s.mode === 'pause' && s.screen === 'pause', `screen=${s.screen}`);
const simP = s.simTime; await sleep(1200); s = await state(); check('pause freezes the world', s.simTime - simP < 0.6 || s.mode === 'pause', `mode=${s.mode}`);
const ammoR = JSON.stringify(s.ammo); await clickSel('[data-act=resume]'); await sleep(900); s = await state();
check('Resume returns to play without firing', s.mode === 'play' && JSON.stringify(s.ammo) === ammoR, `mode=${s.mode}`);

s = await state();
console.log('\nSOLVANE BAY play-test report');
console.log(report.join('\n'));
console.log(`fps samples (1.5 s windows): ${s.fpsHistory.join(', ')}  ·  Auto quality now: ${s.quality}  ·  frame ms: ${JSON.stringify(s.frameMs)}`);
console.log(`console errors: ${errors.length}${errors.length ? '\n  ' + [...new Set(errors)].slice(0, 10).join('\n  ') : ''}`);
if (warnings.length) console.log(`console warnings: ${[...new Set(warnings)].slice(0, 5).join(' | ')}`);
console.log(`total ${((Date.now() - t0) / 1000).toFixed(0)} s`);
clearTimeout(hardStop); ws.close(); killAll();
process.exit(report.some((l) => l.startsWith('FAIL')) || errors.length ? 1 : 0);

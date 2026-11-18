// Circular minimap that rotates with the player: pre-rendered road network, blocks, parks, beach and sea, a GPS route along
// the roads to the current objective, a north marker, icon blips (flashing police, objective star, shops) and a wanted rim.
import { G } from '../core/gameState.js';
import { N, RW, HALF, SEA_X, MAP_BOUNDS as B, lineCoord } from '../core/config.js';
import { blocks, nearestLine, districtAt } from '../world/cityLayout.js';
import { copCars } from '../police/policeDispatch.js';
import { missionTargets } from '../missions/missionRunner.js';
import { rig } from '../camera/cameraRig.js';

export const Q = 2; let bg;
export const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const hash = (i, j, k) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5; return s - Math.floor(s); };

// Static city layer in world units (Q pixels per metre).
export function mapBackground() {
  if (bg) return bg;
  bg = document.createElement('canvas'); bg.width = (B.x1 - B.x0) * Q; bg.height = (B.z1 - B.z0) * Q; const g = bg.getContext('2d'); g.scale(Q, Q); g.translate(-B.x0, -B.z0);
  const W = B.x1 - B.x0, H = B.z1 - B.z0, rect = (c, x, z, w, h) => { g.fillStyle = c; g.fillRect(x, z, w, h); };
  rect('#1f7fb8', B.x0, B.z0, W, H); // open sea
  const sh = g.createLinearGradient(SEA_X - 6, 0, SEA_X + 40, 0); sh.addColorStop(0, '#5cc8d8'); sh.addColorStop(1, '#1f7fb8'); rect(sh, SEA_X - 6, B.z0, 46, H); // shallows
  rect('#e9d59e', HALF + 8, B.z0, SEA_X - HALF - 8, H); // sand
  rect('#3c4a3e', B.x0, B.z0, HALF + 8 - B.x0, H); // scrubland around the city
  rect('#343a4e', -HALF - 8, -HALF - 8, 2 * HALF + 16, 2 * HALF + 16); // city ground
  for (const b of blocks) {
    const x0 = b.cx - 25, z0 = b.cz - 25;
    if (b.type === 'park') { rect('#4e9e56', x0, z0, 50, 50); g.fillStyle = '#3d8446'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x0 + 6 + hash(b.i, b.j, k) * 38, z0 + 6 + hash(b.j, b.i, k) * 38, 3.5, 0, 7); g.fill(); } continue; }
    rect('#4c5370', x0, z0, 50, 50); // sidewalk ring
    if (b.type === 'plaza') { rect('#9a86b8', x0 + 4, z0 + 4, 42, 42); rect('#7fd0e8', b.cx - 6, b.cz - 6, 12, 12); continue; }
    if (b.type === 'yard') { rect('#4c5262', x0 + 3, z0 + 3, 44, 44); for (let k = 0; k < 4; k++) rect(['#c0563a', '#3a7ab8', '#d8a83a', '#4a9a7a'][k], x0 + 7 + (k % 2) * 20, z0 + 8 + (k >> 1) * 18, 15, 6); continue; }
    rect('#363c54', x0 + 3, z0 + 3, 44, 44);
    for (let k = 0; k < 4; k++) { // building footprints in 2x2 lots
      const lx = x0 + 5 + (k % 2) * 21, lz = z0 + 5 + (k >> 1) * 21, w = 14 + hash(b.i, b.j, k) * 5, h = 14 + hash(b.j, b.i, k + 3) * 5;
      rect('#525a7a', lx, lz, w, h); rect('#646d92', lx + 1, lz + 1, w - 2, h - 4);
    }
  }
  const span = 2 * HALF + RW;
  for (const [c, w] of [['#161924', RW + 1.5], ['#c9d0e0', RW - 3]]) { g.fillStyle = c; for (let k = 0; k <= N; k++) { g.fillRect(-HALF - w / 2, lineCoord(k) - w / 2, 2 * HALF + w, w); g.fillRect(lineCoord(k) - w / 2, -HALF - w / 2, w, 2 * HALF + w); } }
  g.fillStyle = '#c9d0e0'; for (let k = 0; k <= N; k++) for (let m = 0; m <= N; m++) g.fillRect(lineCoord(k) - (RW - 3) / 2, lineCoord(m) - (RW - 3) / 2, RW - 3, RW - 3);
  g.fillStyle = '#e8c06088'; for (let k = 0; k <= N; k++) { g.fillRect(-HALF, lineCoord(k) - 0.5, span - RW, 1); g.fillRect(lineCoord(k) - 0.5, -HALF, 1, span - RW); }
  // Beach road and palms along the shore.
  rect('#161924', HALF + 14, B.z0, 8, H); rect('#c9d0e0', HALF + 15.5, B.z0, 5, H);
  g.fillStyle = '#3f9a4a'; for (let z = B.z0 + 10; z < B.z1; z += 22) { g.beginPath(); g.arc(HALF + 28, z, 2.6, 0, 7); g.fill(); }
  return bg;
}

// Icon blips shared by the minimap and the full-screen map.
function icon(g, kind, x, y, col, r) {
  g.save(); g.translate(x, y); g.lineWidth = 1.6; g.strokeStyle = '#0b0d16';
  if (kind === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r * 1.25; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fillStyle = col; g.fill(); g.stroke(); }
  else if (kind === 'cop') { g.fillStyle = col; g.beginPath(); g.roundRect(-r * 0.75, -r, r * 1.5, r * 2, r * 0.4); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.fillRect(-r * 0.5, -r * 0.35, r, r * 0.3); }
  else { g.fillStyle = col; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke(); const t = { shop: '$', garage: 'G', side: '!', start: 'M' }[kind]; if (t) { g.fillStyle = '#0b0d16'; g.font = `900 ${Math.round(r * 1.3)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, r * 0.08); } }
  g.restore();
}
export function drawBlips(g, toXY, scale, clampR) {
  const flash = Math.floor(G.time * 4) % 2;
  const put = (x, z, kind, col, r) => { let [px, py] = toXY(x, z); if (clampR) { const d = Math.hypot(px, py); if (d > clampR) { px *= clampR / d; py *= clampR / d; } } icon(g, kind, px, py, col, r * scale); };
  for (const m of G.markers) if (!m.hidden && !m.follow && m.kind !== 'obj') put(m.x, m.z, m.kind, hex(m.color), 6);
  for (const m of missionTargets()) put(m.x, m.z, m.label === '' ? 'dot' : 'star', hex(m.color), m.label === '' ? 4.5 : 7);
  for (const c of copCars()) put(c.x, c.z, 'cop', flash ? '#ff2a40' : '#3a6aff', 5);
  if (G.heli) put(G.heli.x, G.heli.z, 'dot', flash ? '#ff2a40' : '#4a7aff', 5);
}
// GPS target: the first mission objective, else the next story start marker.
export function gpsTarget() { return missionTargets().find((m) => m.label !== '') ?? missionTargets()[0] ?? G.markers.find((m) => m.kind === 'start' && !m.hidden); }
// Manhattan route along the grid: to the nearest road, along it to the target's cross street, then to the target.
export function gpsRoute(p, t) {
  const L = (v) => lineCoord(nearestLine(v)), inX = Math.abs(p.z - L(p.z)) < Math.abs(p.x - L(p.x));
  const cl = (v) => Math.max(-HALF, Math.min(HALF, v)), tx = cl(t.x), tz = cl(t.z);
  const pts = inX ? [[p.x, p.z], [cl(p.x), L(p.z)], [L(tx), L(p.z)], [L(tx), tz], [t.x, t.z]] : [[p.x, p.z], [L(p.x), cl(p.z)], [L(p.x), L(tz)], [tx, L(tz)], [t.x, t.z]];
  return pts;
}
export function drawMinimap(canvas) {
  const g = canvas.getContext('2d'), s = canvas.width, c = s / 2, p = G.p, k = 1.05, yaw = rig.yaw;
  const th = Math.PI - yaw; g.clearRect(0, 0, s, s); g.save(); g.beginPath(); g.arc(c, c, c, 0, 7); g.clip(); g.fillStyle = '#10142a'; g.fillRect(0, 0, s, s);
  g.translate(c, c); g.rotate(-th); g.scale(k, k); g.translate(-p.x, -p.z); const b = mapBackground(); g.drawImage(b, B.x0, B.z0, b.width / Q, b.height / Q);
  const t = gpsTarget();
  if (t) { const pts = gpsRoute(p, t); g.lineJoin = 'round'; g.lineCap = 'round'; for (const [col, w] of [['#3a1240', 7], [t.kind === 'start' ? '#ffd23c' : '#ff4fd8', 4]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z))); g.stroke(); } }
  g.restore();
  const toXY = (x, z) => { const dx = (x - p.x) * k, dz = (z - p.z) * k, a = -th; return [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)]; };
  g.save(); g.translate(c, c); drawBlips(g, toXY, 1, c - 10);
  // North marker on the rim.
  const [nx, ny] = toXY(p.x, p.z - 1), nl = Math.hypot(nx, ny) || 1, nr = c - 13; g.fillStyle = '#0b0d16e0'; g.beginPath(); g.arc(nx / nl * nr, ny / nl * nr, 9, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '900 12px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', nx / nl * nr, ny / nl * nr + 1);
  g.rotate(yaw - (p.car ? p.car.heading : p.mesh.rotation.y)); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -10); g.lineTo(8, 8); g.lineTo(0, 3); g.lineTo(-8, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
  const wrap = canvas.parentElement; wrap.classList.toggle('wanted', G.wanted.stars > 0);
  const lab = document.getElementById('mmDistrict'); if (lab) { const d = districtAt(p.x, p.z).toUpperCase(); if (lab.textContent !== d) lab.textContent = d; }
}

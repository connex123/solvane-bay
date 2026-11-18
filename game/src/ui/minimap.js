// Circular minimap that rotates with the view: pre-rendered city (roads, blocks, parks, beach, sea), GPS route to the
// current objective, north marker, icon blips (police, objective star, shops) and a red/blue rim pulse when wanted.
// Also exports the blip painter shared with the full-screen city map.
import { G } from '../core/gameState.js';
import { N, S, RW, HALF, SEA_X, MAP_BOUNDS as B, DISTRICTS, lineCoord, clamp } from '../core/config.js';
import { blocks } from '../world/cityLayout.js';
import { copCars } from '../police/policeDispatch.js';
import { missionTargets } from '../missions/missionRunner.js';

export const Q = 2; let bg;
export const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const BLOCK_TINT = { downtown: '#c9c2d6', neon: '#d8b8d4', marina: '#b8d0dc', docks: '#b4b4b0', beach: '#e6d6b8', hills: '#c8d4b8', old: '#dcc4b4' };

// Static city picture in world units (scaled by Q), drawn once.
export function mapBackground() {
  if (bg) return bg;
  bg = document.createElement('canvas'); bg.width = (B.x1 - B.x0) * Q; bg.height = (B.z1 - B.z0) * Q; const g = bg.getContext('2d'); g.scale(Q, Q); g.translate(-B.x0, -B.z0);
  const W = B.x1 - B.x0, H = B.z1 - B.z0;
  g.fillStyle = '#2f8fc0'; g.fillRect(B.x0, B.z0, W, H);                                         // sea
  g.fillStyle = '#3fa9d4'; g.fillRect(SEA_X - 6, B.z0, 22, H);                                     // shallows
  g.fillStyle = '#ecd9a0'; g.fillRect(HALF + 6, B.z0, SEA_X - HALF - 4, H);                        // beach sand
  g.fillStyle = '#f6ecc8'; g.fillRect(SEA_X - 8, B.z0, 3, H);                                      // surf line
  g.fillStyle = '#9fb88c'; g.fillRect(B.x0, B.z0, HALF + 6 - B.x0, H);                             // hinterland
  g.fillStyle = '#dad6cc'; g.fillRect(-HALF - 10, -HALF - 10, 2 * HALF + 20, 2 * HALF + 20);        // sidewalks
  for (const b of blocks) {
    const x0 = b.cx - S / 2 + RW / 2 + 2, z0 = b.cz - S / 2 + RW / 2 + 2, w = S - RW - 4;
    if (b.type === 'park') { g.fillStyle = '#7cc46e'; g.fillRect(x0, z0, w, w); g.fillStyle = '#5aa858'; for (let t = 0; t < 6; t++) { g.beginPath(); g.arc(x0 + 8 + (t * 13) % (w - 14), z0 + 9 + ((t * 23) % (w - 16)), 4, 0, 7); g.fill(); } continue; }
    if (b.type === 'plaza') { g.fillStyle = '#e8dcc4'; g.fillRect(x0, z0, w, w); g.fillStyle = '#7cc46e'; g.beginPath(); g.arc(b.cx, b.cz, 12, 0, 7); g.fill(); continue; }
    g.fillStyle = b.type === 'yard' ? '#b8b4a8' : '#e2ddd2'; g.fillRect(x0, z0, w, w);
    g.fillStyle = BLOCK_TINT[b.district] || '#ccc'; g.strokeStyle = '#0000001f'; g.lineWidth = 0.8;
    const n = b.type === 'yard' ? 2 : 3, gap = 3, cell = (w - gap * (n + 1)) / n;
    for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) if (b.type !== 'yard' || (a + c) % 2 === 0) {
      const bx = x0 + gap + a * (cell + gap), bz = z0 + gap + c * (cell + gap); g.fillRect(bx, bz, cell, cell); g.strokeRect(bx, bz, cell, cell);
    }
  }
  const roads = (w, col) => { g.fillStyle = col; for (let k = 0; k <= N; k++) { g.fillRect(-HALF - RW / 2 - w, lineCoord(k) - RW / 2 - w, 2 * HALF + RW + 2 * w, RW + 2 * w); g.fillRect(lineCoord(k) - RW / 2 - w, -HALF - RW / 2 - w, RW + 2 * w, 2 * HALF + RW + 2 * w); } };
  roads(1.6, '#6a7286'); roads(0, '#fbfaf6');                                                       // outlined light roads
  g.fillStyle = '#e8c868'; for (let k = 0; k <= N; k++) { g.fillRect(-HALF, lineCoord(k) - 0.6, 2 * HALF, 1.2); g.fillRect(lineCoord(k) - 0.6, -HALF, 1.2, 2 * HALF); }
  g.fillStyle = '#6a7286'; g.fillRect(HALF + RW / 2, lineCoord(4) - 4, SEA_X - HALF - RW / 2 - 10, 8); g.fillStyle = '#fbfaf6'; g.fillRect(HALF + RW / 2, lineCoord(4) - 3, SEA_X - HALF - RW / 2 - 10, 6);
  return bg;
}

// Grid route along the streets: snap both ends to the nearest road, then at most two turns.
const lineNear = (v) => lineCoord(clamp(Math.round((v + HALF) / S), 0, N));
function snapRoad(x, z) { const lx = lineNear(x), lz = lineNear(z); return Math.abs(x - lx) < Math.abs(z - lz) ? { x: lx, z: clamp(z, -HALF, HALF), v: true } : { x: clamp(x, -HALF, HALF), z: lz, v: false }; }
export function gpsRoute(fx, fz, tx, tz) {
  const a = snapRoad(fx, fz), b = snapRoad(tx, tz), pts = [[fx, fz], [a.x, a.z]];
  if (a.v && b.v) { if (a.x !== b.x) { const zc = lineNear((a.z + b.z) / 2); pts.push([a.x, zc], [b.x, zc]); } }
  else if (!a.v && !b.v) { if (a.z !== b.z) { const xc = lineNear((a.x + b.x) / 2); pts.push([xc, a.z], [xc, b.z]); } }
  else if (a.v) pts.push([a.x, b.z]); else pts.push([b.x, a.z]);
  pts.push([b.x, b.z], [tx, tz]); return pts;
}
export function currentObjective() { const t = missionTargets()[0]; if (t) return t; const w = G.waypoint; return w ? { x: w.x, z: w.z, color: 0xff4fd8 } : null; }

const ICON = {
  star(g, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); },
  car(g, r) { g.beginPath(); g.roundRect(-r * 0.55, -r, r * 1.1, r * 2, r * 0.35); },
  shop(g, r) { g.beginPath(); g.roundRect(-r, -r, r * 2, r * 2, r * 0.35); },
  dot(g, r) { g.beginPath(); g.arc(0, 0, r, 0, 7); },
  diamond(g, r) { g.beginPath(); g.moveTo(0, -r); g.lineTo(r, 0); g.lineTo(0, r); g.lineTo(-r, 0); g.closePath(); },
};
const GLYPH = { shop: '$', garage: 'R', side: '★' };
export function drawBlips(g, toXY, scale, clampR, rot = 0) {
  const cc = copCars(), flash = Math.floor(G.time * 4) % 2;
  const blip = (x, z, col, r, shape, glyph, ang = 0) => {
    let [px, py] = toXY(x, z); if (clampR) { const d = Math.hypot(px, py); if (d > clampR) { px *= clampR / d; py *= clampR / d; } }
    g.save(); g.translate(px, py); g.rotate(ang); ICON[shape](g, r); g.fillStyle = col; g.fill(); g.strokeStyle = '#000c'; g.lineWidth = 1.6; g.stroke();
    if (glyph) { g.rotate(-ang); g.fillStyle = '#fff'; g.font = `900 ${Math.round(r * 1.25)}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, 0, r * 0.08); }
    g.restore();
  };
  for (const m of G.markers) if (!m.hidden && !m.follow && m.kind !== 'obj') blip(m.x, m.z, hex(m.color), 6.5 * scale, m.kind === 'side' ? 'dot' : 'shop', m.label === 'STREET RACE' ? '⚑' : GLYPH[m.kind] || '');
  missionTargets().forEach((m, i) => blip(m.x, m.z, i === 0 && m.kind === 'obj' ? '#ffd23c' : hex(m.color), (m.kind === 'obj' ? 9 : 5) * scale, m.kind === 'obj' ? 'star' : 'diamond'));
  cc.forEach((c, i) => blip(c.x, c.z, (flash ^ (i & 1)) ? '#ff2a40' : '#2f6bff', 5 * scale, 'car', '', rot - c.heading + Math.PI / 2));
  if (G.heli) blip(G.heli.x, G.heli.z, flash ? '#ff2a40' : '#4a7aff', 6 * scale, 'diamond', 'H');
}

export function drawMinimap(canvas) {
  const g = canvas.getContext('2d'), s = canvas.width, c = s / 2, p = G.p, px = s / 190, k = px * (p.car ? 0.72 + 0.25 / (1 + Math.abs(p.car.speed) / 12) : 1.05);
  const cd = G.camera.getWorldDirection(new G.camera.position.constructor()), yaw = Math.atan2(cd.x, cd.z), th = Math.PI - yaw;
  const toXY = (x, z) => { const dx = (x - p.x) * k, dz = (z - p.z) * k, a = -th; return [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)]; };
  g.clearRect(0, 0, s, s); g.save(); g.beginPath(); g.arc(c, c, c, 0, 7); g.clip(); g.fillStyle = '#2f8fc0'; g.fillRect(0, 0, s, s);
  g.save(); g.translate(c, c); g.rotate(-th); g.scale(k, k); g.translate(-p.x, -p.z); const b = mapBackground(); g.drawImage(b, B.x0, B.z0, b.width / Q, b.height / Q); g.restore();
  g.save(); g.translate(c, c);
  const obj = currentObjective();
  if (obj) { // GPS line: dark casing under a bright route colour
    const pts = gpsRoute(p.x, p.z, obj.x, obj.z).map(([x, z]) => toXY(x, z));
    for (const [w, col] of [[7 * px, '#3a0a3acc'], [4 * px, obj.color === 0xff3a5c ? '#ff5a7a' : '#d64fff']]) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = col; g.stroke(); }
  }
  drawBlips(g, toXY, px, c - 12 * px, -th);
  g.rotate((p.car ? p.car.heading : p.yaw) - yaw); // player arrow
  g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 2.2 * px; g.beginPath(); g.moveTo(0, -11 * px); g.lineTo(8 * px, 8 * px); g.lineTo(0, 3.5 * px); g.lineTo(-8 * px, 8 * px); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.restore();
  // north marker on the rim (world -z is north)
  const [nx, ny] = toXY(p.x, p.z - 1e4), na = Math.atan2(ny, nx), nr = c - 13 * px, mx = c + Math.cos(na) * nr, my = c + Math.sin(na) * nr;
  g.fillStyle = '#16192a'; g.beginPath(); g.arc(mx, my, 10 * px, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5 * px; g.stroke();
  g.fillStyle = '#fff'; g.font = `900 ${12 * px}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', mx, my + 0.5 * px);
  // wanted rim: alternating red/blue pulse
  const st = G.wanted?.stars || 0;
  if (st > 0) { const ph = G.time * 5, a = 0.55 + 0.45 * Math.sin(ph * 2); g.lineWidth = 7 * px; for (let i = 0; i < 2; i++) { g.strokeStyle = (Math.floor(ph) + i) % 2 ? `rgba(255,40,64,${a})` : `rgba(47,107,255,${a})`; g.beginPath(); g.arc(c, c, c - 3.5 * px, Math.PI * i, Math.PI * (i + 1)); g.stroke(); } }
}

// Full-screen city map: districts, roads, mission markers, legend, story list, respect level and save slot panel.
import { G, levelFromXp } from '../core/gameState.js';
import { MAP_BOUNDS as B, DISTRICTS, HALF, SEA_X, N, RW, RESPECT_XP, lineCoord } from '../core/config.js';
import { blocks } from '../world/cityLayout.js';
import { hex, drawBlips } from './minimap.js';
import { MISSIONS, corner } from '../missions/storyMissions.js';
import { slotSummary } from '../save/saveGame.js';
import { packagePositions, SHOP, GARAGE, TAXI, RACE } from '../missions/sideActivities.js';

const V_NAMES = ['Harbor Rd', 'Coral Ave', 'Marlin St', 'Crown Blvd', 'Velvet Ave', 'Alder Way', 'Tupelo St', 'Cadia Ave', 'Hawke St', 'Palmetto Dr'];
const H_NAMES = ['North Quay', 'Dockside Ave', 'Neon Row', 'Sunset Blvd', 'Central Ave', 'Casa Vieja St', 'Ferry Rd', 'Rumble St', 'Bayview Ave', 'South Quay'];
const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const money = (n) => '$' + Number(n).toLocaleString('en-US');

function baseMap(g, X, Z, k) {
  const W = g.canvas.width, Hh = g.canvas.height, seaX = X(SEA_X), cw = X(HALF + 8);
  g.fillStyle = '#1b2a2a'; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 260; i++) { g.fillStyle = hash(i, 1) > 0.5 ? '#2f5e40' : '#24503a'; g.beginPath(); g.arc(hash(i, 2) * cw, hash(i, 3) * Hh, 6 + hash(i, 4) * 18, 0, 7); g.fill(); }
  // sea: gradient, wave rows and sparkles
  const sg = g.createLinearGradient(seaX, 0, W, 0); sg.addColorStop(0, '#35b6d2'); sg.addColorStop(0.35, '#1f87b8'); sg.addColorStop(1, '#0d3c70'); g.fillStyle = sg; g.fillRect(seaX, 0, W - seaX, Hh);
  g.lineWidth = 1.6; for (let r = 0; r < 52; r++) { const y0 = 8 + r * 14, ph = hash(r, 7) * 6; g.strokeStyle = `rgba(210,242,255,${0.12 + hash(r, 8) * 0.18})`; g.beginPath(); for (let x = seaX + 4; x <= W; x += 6) { const y = y0 + Math.sin(x * 0.07 + ph) * 3 + Math.sin(x * 0.19 + ph * 2) * 1.2; x === seaX + 4 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 60; i++) g.fillRect(seaX + 10 + hash(i, 9) * (W - seaX - 14), hash(i, 10) * Hh, 2, 1.2);
  // beach: sand with speckle, foam line, umbrellas and palms
  const sd = g.createLinearGradient(cw, 0, seaX, 0); sd.addColorStop(0, '#d8c48c'); sd.addColorStop(1, '#f2e4b8'); g.fillStyle = sd; g.fillRect(cw, 0, seaX - cw, Hh);
  for (let i = 0; i < 500; i++) { g.fillStyle = hash(i, 11) > 0.5 ? '#c9b377' : '#fff3cf'; g.fillRect(cw + hash(i, 12) * (seaX - cw), hash(i, 13) * Hh, 1.5, 1.5); }
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.beginPath(); for (let y = 0; y <= Hh; y += 4) { const x = seaX + Math.sin(y * 0.09) * 1.8; y ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  for (let i = 0; i < 24; i++) { const x = cw + 8 + hash(i, 14) * (seaX - cw - 26), y = Z(-HALF + 20) + hash(i, 15) * (Z(HALF) - Z(-HALF + 20)); g.fillStyle = ['#ff5a7a', '#2fc4b2', '#ffb02e', '#ffffff'][i % 4]; g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
  for (let i = 0; i < 14; i++) { const x = cw + 5 + hash(i, 16) * 12, y = Z(-HALF) + hash(i, 17) * (Z(HALF) - Z(-HALF)); g.fillStyle = '#2f8a50'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.fillStyle = '#6fd08a'; g.beginPath(); g.arc(x - 1, y - 1, 1.8, 0, 7); g.fill(); }
  // city base, district-tinted blocks, parks with trees
  g.fillStyle = '#2a3350'; g.fillRect(X(-HALF - 10), Z(-HALF - 10), (2 * HALF + 20) * k, (2 * HALF + 20) * k);
  for (const b of blocks) {
    const x = X(b.cx - 25), z = Z(b.cz - 25), w = 50 * k; rr(g, x, z, w, w, 5);
    g.fillStyle = b.type === 'park' ? '#3f9a5e' : b.type === 'plaza' ? '#8a7fc0' : '#4a5578'; g.fill();
    if (b.type !== 'park' && b.type !== 'plaza') { rr(g, x, z, w, w, 5); g.fillStyle = DISTRICTS[b.district].color + '58'; g.fill(); g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(x + w * 0.16, z + w * 0.16, w * 0.3, w * 0.24); g.fillRect(x + w * 0.54, z + w * 0.5, w * 0.28, w * 0.3); }
    if (b.type === 'park') for (let t = 0; t < 9; t++) { const tx = x + 6 + hash(b.i * 7 + t, b.j) * (w - 12), tz = z + 6 + hash(b.j * 5 + t, b.i + 3) * (w - 12); g.fillStyle = '#1b5a38'; g.beginPath(); g.arc(tx, tz, 4.4, 0, 7); g.fill(); g.fillStyle = '#5cc27f'; g.beginPath(); g.arc(tx - 1, tz - 1, 2.2, 0, 7); g.fill(); }
  }
  // roads: light lines (avenues thicker), dashed centre lines, names
  const rw = RW * k; g.lineCap = 'butt';
  for (let i = 0; i <= N; i++) { const c = lineCoord(i), av = i % 3 === 0;
    for (const vert of [true, false]) { const p0 = vert ? [X(c), Z(-HALF - 7)] : [X(-HALF - 7), Z(c)], p1 = vert ? [X(c), Z(HALF + 7)] : [X(HALF + 7), Z(c)];
      g.strokeStyle = av ? '#dfe6fa' : '#a9b4d4'; g.lineWidth = av ? rw : rw * 0.78; g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.stroke();
      g.strokeStyle = 'rgba(40,52,90,0.55)'; g.setLineDash([5, 6]); g.lineWidth = 1; g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.stroke(); g.setLineDash([]); } }
  g.font = '700 9px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#18223e';
  for (let i = 0; i <= N; i++) { const c = lineCoord(i), t = 0.25 + 0.5 * hash(i, 21);
    g.fillText(H_NAMES[i].toUpperCase(), X(-HALF + (2 * HALF) * (0.12 + 0.24 * ((i * 3) % 4))), Z(c));
    g.save(); g.translate(X(c), Z(-HALF + (2 * HALF) * (0.1 + 0.8 * t))); g.rotate(-Math.PI / 2); g.fillText(V_NAMES[i].toUpperCase(), 0, 0); g.restore(); }
  // marina piers with boats
  for (let q = 0; q < 4; q++) { const zc = lineCoord(0) + 40 + q * 64, x0 = X(SEA_X + 4 - 35), pw = 70 * k, py = Z(zc) - 3;
    g.fillStyle = '#8a6a44'; g.fillRect(x0, py, pw, 6); g.strokeStyle = '#5c432a'; g.lineWidth = 1; for (let x = x0; x < x0 + pw; x += 5) { g.beginPath(); g.moveTo(x, py); g.lineTo(x, py + 6); g.stroke(); }
    for (let b = 0; b < 4; b++) { const bx = X(SEA_X - 10 + b * 14) + 18, bz = Z(zc + (b % 2 ? 4.5 : -4.5)) + (b % 2 ? 4 : -4); g.fillStyle = ['#ffffff', '#f4a6a0', '#8fd3c8', '#f6e3b4'][b]; rr(g, bx - 6, bz - 2.5, 12, 5, 2.5); g.fill(); g.fillStyle = '#1b2a40'; g.fillRect(bx - 1, bz - 1, 3, 2); } }
}
function badge(g, x, y, col, glyph, label) {
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 8; g.fillStyle = col; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); g.shadowBlur = 0; g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#fff'; g.font = '800 12px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, x, y + 0.5);
  if (label) { g.font = '700 10px Segoe UI, Arial'; g.lineWidth = 3; g.strokeStyle = 'rgba(10,14,30,0.9)'; g.strokeText(label, x, y + 20); g.fillStyle = '#fff'; g.fillText(label, x, y + 20); } g.restore();
}
function infoCard(g, px, py, m, W, Hh) {
  const w = 236, h = 104, left = px > W * 0.55, cx = clampN(left ? px - w - 26 : px + 26, 8, W - w - 8), cy = clampN(py - h / 2, 8, Hh - h - 8);
  g.save(); g.strokeStyle = 'rgba(255,210,60,0.9)'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 15, 0, 7); g.stroke(); g.setLineDash([3, 3]); g.beginPath(); g.arc(px, py, 22, 0, 7); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.moveTo(px + (left ? -15 : 15), py); g.lineTo(left ? cx + w : cx, cy + h / 2); g.stroke();
  g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 18; rr(g, cx, cy, w, h, 10); g.fillStyle = 'rgba(14,12,32,0.94)'; g.fill(); g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#ffd23c'; rr(g, cx, cy, 5, h, 3); g.fill(); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffb347'; g.font = '800 10px Segoe UI, Arial'; g.fillText(`CHAPTER ${m.chapter} \u00b7 NEXT MISSION`, cx + 16, cy + 20);
  g.fillStyle = '#fff'; g.font = '800 15px Segoe UI, Arial'; g.fillText(m.title, cx + 16, cy + 41);
  g.fillStyle = '#c9c2e6'; g.font = '600 12px Segoe UI, Arial'; g.fillText('Contact: ' + m.giver[0].toUpperCase() + m.giver.slice(1), cx + 16, cy + 61);
  g.fillStyle = '#7ee0a0'; g.font = '800 12px Segoe UI, Arial'; g.fillText(`${money(m.reward.money)}  \u00b7  +${m.reward.xp} XP`, cx + 16, cy + 80);
  g.fillStyle = '#9d96c0'; g.font = '600 10px Segoe UI, Arial'; g.fillText('Walk into the gold marker to begin', cx + 16, cy + 96); g.restore();
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

export function drawCityMap() {
  const cv = document.getElementById('mapCanvas'), g = cv.getContext('2d'), p = G.p, k = Math.min(cv.width / (B.x1 - B.x0), cv.height / (B.z1 - B.z0));
  const X = (x) => (x - B.x0) * k, Z = (z) => (z - B.z0) * k; g.setLineDash([]); g.shadowBlur = 0; baseMap(g, X, Z, k);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 14px Segoe UI, Arial'; g.shadowColor = '#000'; g.shadowBlur = 7;
  const seen = {}; for (const b of blocks) (seen[b.district] ||= []).push(b);
  for (const id in seen) { const l = seen[id], cx = l.reduce((s, b) => s + b.cx, 0) / l.length, cz = l.reduce((s, b) => s + b.cz, 0) / l.length; g.fillStyle = DISTRICTS[id].color; g.fillText(DISTRICTS[id].name.toUpperCase(), X(cx), Z(cz) + 20); }
  g.font = 'italic 800 16px Segoe UI, Arial'; g.fillStyle = '#d6f3ff'; g.fillText('SOLVANE SEA', X(HALF + 112), Z(0)); g.font = '700 11px Segoe UI, Arial'; g.fillStyle = '#6a5426'; g.shadowBlur = 0; g.save(); g.translate(X(HALF + 29), Z(195)); g.rotate(-Math.PI / 2); g.fillText('PALMETTO BEACH', 0, 0); g.restore();
  for (const k2 of packagePositions()) if (!k2.got) { g.fillStyle = '#ffe14a'; g.fillRect(X(k2.x) - 2, Z(k2.z) - 2, 4, 4); }
  drawBlips(g, (x, z) => [X(x), Z(z)], 1.3, 0);
  const next1 = MISSIONS.find((m) => !G.completed.includes(m.id));
  badge(g, X(SHOP.x), Z(SHOP.z), '#2f86e8', '$', 'Calder Arms'); badge(g, X(GARAGE.x), Z(GARAGE.z), '#25a96f', 'R', 'Glow Coat'); badge(g, X(TAXI.x), Z(TAXI.z), '#e0a81c', 'T'); badge(g, X(RACE.x), Z(RACE.z), '#d93cb8', 'F');
  badge(g, X(lineCoord(1) + 90), Z(lineCoord(0) + 20), '#6a7a98', 'C', 'Port Cranes'); badge(g, X(SEA_X - 8), Z(lineCoord(0) + 104), '#1fa8c9', 'M', 'Marina Piers'); badge(g, X(corner(2, 6, 1, -1).x), Z(corner(2, 6, 1, -1).z), '#a43cd9', 'V', 'Club Velvet');
  if (next1) { const s0 = next1.start; badge(g, X(s0.x), Z(s0.z), '#f0b81c', '\u2605'); infoCard(g, X(s0.x), Z(s0.z), next1, cv.width, cv.height); }
  g.save(); g.translate(X(p.x), Z(p.z)); g.rotate(Math.PI - (p.car ? p.car.heading : p.yaw)); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.strokeRect(1, 1, cv.width - 2, cv.height - 2);
  const lv = levelFromXp(G.xp), next = RESPECT_XP[lv] ?? null, side = document.getElementById('mapSide');
  const rows = MISSIONS.map((m) => { const done = G.completed.includes(m.id), nx = m === next1; return `<div class="mrow ${done ? 'done' : nx ? 'next' : 'locked'}"><span class="st">${done ? '✓' : nx ? '!' : '🔒'}</span><span>CH ${m.chapter} · ${m.title}</span></div>`; }).join('');
  const leg = [['#ffd23c', 'Story mission'], ['#4fa8ff', 'Calder Arms shop'], ['#4fe0a0', 'Glow Coat Respray'], ['#f2c230', 'Taxi fares'], ['#ff4fd8', 'Street race'], ['#ffe14a', 'Hidden package'], ['#ff2a40', 'Police unit'], ['#ff3a5c', 'Target']].map(([c, t]) => `<div><i style="background:${c}"></i>${t}</div>`).join('');
  const sl = slotSummary();
  side.innerHTML = `<div class="card"><h3>STORY · NICO VARELA</h3>${rows}</div><div class="card"><h3>RESPECT LEVEL ${lv}</h3><div class="bar"><i style="width:${next ? Math.min(100, (G.xp - RESPECT_XP[lv - 1]) / (next - RESPECT_XP[lv - 1]) * 100) : 100}%"></i></div><div style="margin-top:6px;color:#bdb8d4">${G.xp} XP · ${lv >= 2 ? 'SMG ' : ''}${lv >= 3 ? 'Shotgun ' : ''}unlocked · Packages ${G.packages.length}/16</div></div><div class="card"><h3>LEGEND</h3><div class="leg">${leg}</div></div><div class="card"><h3>SAVE SLOT</h3><div class="slot${sl.used ? ' used' : ''}">${sl.text}</div><div class="slotbtns"><button data-slot="save">Save</button><button data-slot="load"${sl.used ? '' : ' disabled'}>Load</button></div></div>`;
  side.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => window.dispatchEvent(new CustomEvent('slot', { detail: b.dataset.slot }))));
}

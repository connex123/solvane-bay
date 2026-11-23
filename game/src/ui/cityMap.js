// Full-screen city map: districts and their holders, roads with names, landmarks, mission, shop and activity badges,
// the GPS route to the next chapter, a legend strip, and the career panel (ui/careerPanel.js) beside it.
import { G } from '../core/gameState.js';
import { MAP_BOUNDS as B, DISTRICTS, HALF, SEA_X, N, RW, lineCoord } from '../core/config.js';
import { blocks } from '../world/cityLayout.js';
import { drawBlips, gpsRoute } from './minimap.js';
import { MISSIONS, corner } from '../missions/storyMissions.js';
import { CAUSEWAY, LIGHTHOUSE, CROWN_TOWER, LAGOON } from '../world/landmarks.js';
import { LIFEGUARD_TOWERS } from '../world/beachLife.js';
import { packagePositions, SHOP, GARAGE, TAXI, RACE, RESPAWN } from '../missions/sideActivities.js';
import { WREN_GARAGE } from '../shop/garageShop.js';
import { SPEEDBOAT_BERTH } from '../world/marina.js';

const V_NAMES = ['Harbor Rd', 'Coral Ave', 'Marlin St', 'Crown Blvd', 'Velvet Ave', 'Alder Way', 'Tupelo St', 'Cadia Ave', 'Hawke St', 'Palmetto Dr'];
const H_NAMES = ['North Quay', 'Dockside Ave', 'Neon Row', 'Sunset Blvd', 'Central Ave', 'Casa Vieja St', 'Ferry Rd', 'Rumble St', 'Bayview Ave', 'South Quay'];
const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const money = (n) => '$' + Number(n).toLocaleString('en-US');

function baseMap(g, X, Z, k) {
  const W = g.canvas.width, Hh = g.canvas.height, seaX = X(SEA_X), cw = X(HALF + 8);
  g.fillStyle = '#e9dcb8'; g.fillRect(0, 0, W, Hh); // chart paper
  for (let i = 0; i < 260; i++) { g.fillStyle = hash(i, 1) > 0.5 ? '#2f5e40' : '#24503a'; g.beginPath(); g.arc(hash(i, 2) * cw, hash(i, 3) * Hh, 6 + hash(i, 4) * 18, 0, 7); g.fill(); }
  // sea: gradient, wave rows and sparkles
  const sg = g.createLinearGradient(seaX, 0, W, 0); sg.addColorStop(0, '#6fdcd2'); sg.addColorStop(0.35, '#2fa8b4'); sg.addColorStop(1, '#0f5a72'); g.fillStyle = sg; g.fillRect(seaX, 0, W - seaX, Hh);
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
    { const hc = HOLDERS[holderOf(b.district)].color; rr(g, x + 1.5, z + 1.5, w - 3, w - 3, 5); g.fillStyle = hc + '2e'; g.fill(); g.lineWidth = 3; g.strokeStyle = hc + 'd0'; g.stroke(); }
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
let occ = []; // screen rects already used by badges, the info card and the player arrow
// Nautical-chart layer: sounding contours off the Strand with depth figures, the lagoon basin, a compass rose and the
// landmarks drawn as chart symbols (Causeway with pylons and cable fans, lighthouse light-flare, Crown Tower crown).
function chartLayer(g, X, Z, k) {
  const W = g.canvas.width, Hh = g.canvas.height;
  g.save(); g.lineWidth = 1.4; g.font = 'italic 700 11px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [[14, 2], [34, 5], [62, 10], [98, 20], [126, 40]].forEach(([off, depth], i) => {
    g.strokeStyle = `rgba(232, 250, 246, ${0.55 - i * 0.07})`; g.setLineDash(i % 2 ? [6, 4] : []); g.beginPath();
    for (let y = 0; y <= Hh; y += 6) { const x = X(SEA_X + off) + Math.sin(y * 0.021 + i) * 6 * (1 + i * 0.4) + Math.sin(y * 0.007 + i * 2) * 9; y ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.setLineDash([]);
    for (let y = 60 + i * 37; y < Hh; y += 170) { const x = X(SEA_X + off) + Math.sin(y * 0.021 + i) * 6 * (1 + i * 0.4) + Math.sin(y * 0.007 + i * 2) * 9; g.fillStyle = '#0d5a6e'; g.fillRect(x - 8, y - 7, 16, 14); g.fillStyle = '#e8faf6'; g.fillText(String(depth), x, y); }
  });
  // lagoon basin with its own soundings
  const lx = X(LAGOON.x), lz = Z(LAGOON.z); g.fillStyle = '#2fd0c4'; g.fillRect(lx - 24 * k, lz - 24 * k, 48 * k, 48 * k);
  g.strokeStyle = 'rgba(232,250,246,0.8)'; for (const r of [16, 9]) { g.beginPath(); g.ellipse(lx, lz, r * k, r * k * 0.8, 0, 0, 7); g.stroke(); }
  // the Causeway: deck, pylons and cable fans
  const cz = Z(CAUSEWAY.z); g.strokeStyle = '#f4e8cc'; g.lineWidth = 7; g.beginPath(); g.moveTo(X(CAUSEWAY.x0), cz); g.lineTo(W, cz); g.stroke(); g.strokeStyle = '#ff6f59'; g.lineWidth = 3; g.stroke();
  for (const px of CAUSEWAY.pylons) { const x = X(px); g.fillStyle = '#ff6f59'; g.fillRect(x - 4, cz - 11, 8, 22); g.strokeStyle = 'rgba(244,232,204,0.8)'; g.lineWidth = 1; for (let i = 1; i <= 4; i++) for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x, cz); g.lineTo(x + d * i * 7, cz - 9); g.moveTo(x, cz); g.lineTo(x + d * i * 7, cz + 9); g.stroke(); } }
  // lighthouse light-flare
  const hx = X(LIGHTHOUSE.x), hz = Z(LIGHTHOUSE.z); g.fillStyle = 'rgba(255, 201, 60, 0.35)'; g.beginPath(); g.moveTo(hx, hz); g.arc(hx, hz, 30, -2.2, -1.0); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hz, 6, 0, 7); g.fill(); g.fillStyle = '#ff6f59'; g.beginPath(); g.arc(hx, hz, 3.5, 0, 7); g.fill();
  // Crown Tower: gold crown symbol on its block
  const tx = X(CROWN_TOWER.x), tz = Z(CROWN_TOWER.z); g.fillStyle = '#ffc93c'; g.strokeStyle = '#3a2a00'; g.lineWidth = 2; g.beginPath(); g.moveTo(tx - 11, tz + 7); g.lineTo(tx - 12, tz - 6); g.lineTo(tx - 5, tz); g.lineTo(tx, tz - 9); g.lineTo(tx + 5, tz); g.lineTo(tx + 12, tz - 6); g.lineTo(tx + 11, tz + 7); g.closePath(); g.fill(); g.stroke();
  for (const t of LIFEGUARD_TOWERS) { g.fillStyle = '#ff6f59'; g.fillRect(X(t.x) - 3, Z(t.z) - 3, 6, 6); }
  // compass rose over open water
  const cx = W - 70, cy = Hh - 80; g.translate(cx, cy); g.strokeStyle = 'rgba(244,232,204,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 40, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 30, 0, 7); g.stroke();
  for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.fillStyle = i % 2 ? '#f4e8cc' : '#ff6f59'; g.beginPath(); g.moveTo(0, i % 2 ? -26 : -44); g.lineTo(5, 0); g.lineTo(-5, 0); g.closePath(); g.fill(); }
  g.fillStyle = '#f4e8cc'; g.font = '800 14px Segoe UI, Arial'; g.fillText('N', 0, -54);
  g.restore();
}
function badge(g, x, y, col, glyph, label) {
  occ.push(label ? [x - 38, y - 13, 76, 40] : [x - 13, y - 13, 26, 26]);
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
  g.fillStyle = '#9d96c0'; g.font = '600 10px Segoe UI, Arial'; g.fillText('Walk into the gold marker to begin', cx + 16, cy + 96); g.restore(); occ.push([cx - 4, cy - 4, w + 8, h + 8]);
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const hits = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
// District names on dark pills, nudged around badges, the info card and the player so none is hidden.
function districtLabels(g, X, Z, W, H) {
  const seen = {}; for (const b of blocks) (seen[b.district] ||= []).push(b);
  g.save(); g.font = '800 14px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const id in seen) {
    const l = seen[id], cx = X(l.reduce((s, b) => s + b.cx, 0) / l.length), cy = Z(l.reduce((s, b) => s + b.cz, 0) / l.length) + 20, name = DISTRICTS[id].name.toUpperCase(), w = g.measureText(name).width + 18, h = 22;
    let best = null; for (const [dx, dy] of [[0, 0], [0, -34], [0, 34], [-50, 0], [50, 0], [0, -68], [0, 68], [-60, -34], [60, 34], [-60, 34], [60, -34]]) { const r = [clampN(cx + dx - w / 2, 4, W - w - 4), clampN(cy + dy - h / 2, 4, H - h - 4), w, h]; if (!occ.some((o) => hits(o, r))) { best = r; break; } }
    best ||= [cx - w / 2, cy - h / 2, w, h]; occ.push(best);
    rr(g, best[0], best[1], w, h, 11); g.fillStyle = 'rgba(12,10,28,0.72)'; g.fill(); g.strokeStyle = DISTRICTS[id].color + '99'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = DISTRICTS[id].color; g.fillText(name, best[0] + w / 2, best[1] + h / 2 + 0.5);
  }
  g.restore();
}

// GPS route from the player to the next mission along the roads: dark casing, glowing gold line, moving chevrons; reserved for labels.
function drawRoute(g, pts) {
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.shadowBlur = 0;
  path(); g.strokeStyle = 'rgba(58,18,64,0.9)'; g.lineWidth = 10; g.stroke();
  g.shadowColor = '#ffd23c'; g.shadowBlur = 16; path(); g.strokeStyle = '#ffd23c'; g.lineWidth = 5; g.stroke(); g.shadowBlur = 0;
  g.setLineDash([2, 14]); g.lineDashOffset = -(G.time || 0) * 30; path(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.5; g.stroke(); g.restore();
  for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 18); for (let j = 0; j <= n; j++) { const t = j / Math.max(1, n); occ.push([ax + (bx - ax) * t - 6, ay + (by - ay) * t - 6, 12, 12]); } }
}
import { HOLDERS, holderOf } from '../story/territoryControl.js';
import { fillCareerPanel } from './careerPanel.js';
export function drawCityMap() {
  const cv = document.getElementById('mapCanvas'), g = cv.getContext('2d'), p = G.p, k = Math.min(cv.width / (B.x1 - B.x0), cv.height / (B.z1 - B.z0));
  const X = (x) => (x - B.x0) * k, Z = (z) => (z - B.z0) * k; occ = []; g.setLineDash([]); g.shadowBlur = 0; baseMap(g, X, Z, k); chartLayer(g, X, Z, k);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 14px Segoe UI, Arial'; g.shadowColor = '#000'; g.shadowBlur = 7;
  const seen = {}; for (const b of blocks) (seen[b.district] ||= []).push(b);
  g.font = 'italic 800 16px Segoe UI, Arial'; g.fillStyle = '#d6f3ff'; g.fillText('SOLVANE SEA', X(HALF + 112), Z(0)); g.font = '700 11px Segoe UI, Arial'; g.fillStyle = '#6a5426'; g.shadowBlur = 0; g.save(); g.translate(X(HALF + 29), Z(195)); g.rotate(-Math.PI / 2); g.fillText('THE STRAND', 0, 0); g.restore();
  for (const k2 of packagePositions()) if (!k2.got) { g.save(); g.shadowBlur = 0; g.translate(X(k2.x), Z(k2.z)); g.rotate(Math.PI / 4); g.fillStyle = '#1a1406'; g.fillRect(-6, -6, 12, 12); g.fillStyle = '#ffe14a'; g.fillRect(-4.5, -4.5, 9, 9); g.restore(); } // hidden packages still out there
  drawBlips(g, (x, z) => [X(x), Z(z)], 1.3, 0);
  const next1 = MISSIONS.find((m) => !G.completed.includes(m.id));
  badge(g, X(SHOP.x), Z(SHOP.z), '#2f86e8', '$', 'Calder Arms'); badge(g, X(WREN_GARAGE.x), Z(WREN_GARAGE.z), '#ff8a3d', 'W', "Wren's Garage"); badge(g, X(RESPAWN.hospital.x), Z(RESPAWN.hospital.z), '#ff4f6a', '+'); badge(g, X(RESPAWN.police.x), Z(RESPAWN.police.z), '#3a6ad8', 'P', 'SBPD HQ'); badge(g, X(SPEEDBOAT_BERTH.x), Z(SPEEDBOAT_BERTH.z), '#1fa8c9', 'B'); badge(g, X(GARAGE.x), Z(GARAGE.z), '#25a96f', 'R', 'Glow Coat'); badge(g, X(TAXI.x), Z(TAXI.z), '#e0a81c', 'T'); badge(g, X(RACE.x), Z(RACE.z), '#d93cb8', 'F');
  badge(g, X(lineCoord(1) + 90), Z(lineCoord(0) + 20), '#6a7a98', 'C', 'Port Cranes'); badge(g, X(SEA_X - 8), Z(lineCoord(0) + 104), '#1fa8c9', 'M', 'Marina Piers'); badge(g, X(corner(2, 6, 1, -1).x), Z(corner(2, 6, 1, -1).z), '#a43cd9', 'V', 'Club Velvet');
  if (next1) drawRoute(g, gpsRoute(p, next1.start).map(([x, z]) => [X(x), Z(z)]));
  if (next1) { const s0 = next1.start; badge(g, X(s0.x), Z(s0.z), '#f0b81c', '\u2605'); infoCard(g, X(s0.x), Z(s0.z), next1, cv.width, cv.height); }
  g.save(); g.translate(X(p.x), Z(p.z)); g.rotate(Math.PI - (p.car ? p.car.heading : p.yaw)); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  occ.push([X(p.x) - 14, Z(p.z) - 14, 28, 28]); districtLabels(g, X, Z, cv.width, cv.height);
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.strokeRect(1, 1, cv.width - 2, cv.height - 2);
  const leg = [['#2fd6c4', 'Low Tide turf'], ['#e0463c', 'Crown turf'], ['#f0b81c', 'Story mission'], ['#2f86e8', 'Calder Arms'], ['#25a96f', 'Respray'], ['#e0a81c', 'Taxi fares'], ['#d93cb8', 'Street race'], ['#ffe14a', 'Hidden package'], ['#ff8a3d', 'Upgrades'], ['#ff4f6a', 'Hospital'], ['#ff2a40', 'Police']].map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('');
  document.getElementById('mapLegend').innerHTML = leg; fillCareerPanel(document.getElementById('mapSide'));
}

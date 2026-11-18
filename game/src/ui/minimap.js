// Circular rotating minimap plus the pre-rendered city background shared with the full-screen map.
import { G } from '../core/gameState.js';
import { N, S, RW, HALF, SEA_X, MAP_BOUNDS as B, DISTRICTS, lineCoord } from '../core/config.js';
import { blocks } from '../world/cityLayout.js';
import { copCars } from '../police/policeDispatch.js';
import { missionTargets } from '../missions/missionRunner.js';

export const Q = 1.5; let bg;
export const hex = (n) => '#' + n.toString(16).padStart(6, '0');
export function mapBackground() {
  if (bg) return bg;
  bg = document.createElement('canvas'); bg.width = (B.x1 - B.x0) * Q; bg.height = (B.z1 - B.z0) * Q; const g = bg.getContext('2d'); g.scale(Q, Q); g.translate(-B.x0, -B.z0);
  g.fillStyle = '#1b6a96'; g.fillRect(B.x0, B.z0, B.x1 - B.x0, B.z1 - B.z0); g.fillStyle = '#3a4258'; g.fillRect(B.x0, B.z0, SEA_X - B.x0 - 40, B.z1 - B.z0);
  g.fillStyle = '#d9c58f'; g.fillRect(HALF + 8, B.z0, SEA_X - HALF - 8, B.z1 - B.z0); g.fillStyle = '#2f3a2c'; g.fillRect(B.x0, B.z0, HALF + 8 - B.x0, B.z1 - B.z0); g.fillStyle = '#3a4258'; g.fillRect(-HALF - 8, -HALF - 8, 2 * HALF + 16, 2 * HALF + 16);
  for (const b of blocks) { g.fillStyle = b.type === 'park' ? '#3f8a4a' : b.type === 'plaza' ? '#8a7aa0' : DISTRICTS[b.district].color + '66'; g.fillRect(b.cx - 25, b.cz - 25, 50, 50); }
  g.fillStyle = '#7a84a4'; for (let k = 0; k <= N; k++) { g.fillRect(-HALF - RW / 2, lineCoord(k) - RW / 2 + 1, 2 * HALF + RW, RW - 2); g.fillRect(lineCoord(k) - RW / 2 + 1, -HALF - RW / 2, RW - 2, 2 * HALF + RW); }
  g.fillStyle = '#ffffff22'; for (let k = 0; k <= N; k += 3) { g.fillRect(-HALF, lineCoord(k) - 1, 2 * HALF, 2); g.fillRect(lineCoord(k) - 1, -HALF, 2, 2 * HALF); }
  return bg;
}
export function drawBlips(g, toXY, scale, clampR) {
  const cc = copCars(), flash = Math.floor(G.time * 4) % 2;
  const dot = (x, z, col, r) => { let [px, py] = toXY(x, z); if (clampR) { const d = Math.hypot(px, py); if (d > clampR) { px *= clampR / d; py *= clampR / d; } } g.fillStyle = col; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); g.strokeStyle = '#000a'; g.lineWidth = 1.5; g.stroke(); };
  for (const m of G.markers) if (!m.hidden && !m.follow && m.kind !== 'obj') dot(m.x, m.z, hex(m.color), 5 * scale);
  for (const m of missionTargets()) dot(m.x, m.z, hex(m.color), 6 * scale);
  for (const c of cc) dot(c.x, c.z, flash ? '#ff2a40' : '#3a6aff', 4.5 * scale);
  if (G.heli) dot(G.heli.x, G.heli.z, flash ? '#ff2a40' : '#4a7aff', 5 * scale);
}
export function drawMinimap(canvas) {
  const g = canvas.getContext('2d'), s = canvas.width, c = s / 2, p = G.p, k = 0.95, cd = G.camera.getWorldDirection(new G.camera.position.constructor()), yaw = Math.atan2(cd.x, cd.z);
  const th = Math.PI - yaw; g.clearRect(0, 0, s, s); g.save(); g.beginPath(); g.arc(c, c, c, 0, 7); g.clip(); g.fillStyle = '#10142a'; g.fillRect(0, 0, s, s);
  g.translate(c, c); g.rotate(-th); g.scale(k, k); g.translate(-p.x, -p.z); const b = mapBackground(); g.drawImage(b, B.x0, B.z0, b.width / Q, b.height / Q); g.restore();
  g.save(); g.translate(c, c); drawBlips(g, (x, z) => { const dx = (x - p.x) * k, dz = (z - p.z) * k, a = -th; return [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)]; }, 1, c - 8);
  g.rotate((p.car ? p.car.heading : p.yaw) - yaw); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -9); g.lineTo(7, 7); g.lineTo(0, 3); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
}

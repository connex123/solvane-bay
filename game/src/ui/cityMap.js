// Full-screen city map: districts, roads, mission markers, legend, story list, respect level and save slot panel.
import { G, levelFromXp } from '../core/gameState.js';
import { MAP_BOUNDS as B, DISTRICTS, HALF, RESPECT_XP, lineCoord } from '../core/config.js';
import { blocks } from '../world/cityLayout.js';
import { mapBackground, Q, hex, drawBlips } from './minimap.js';
import { MISSIONS } from '../missions/storyMissions.js';
import { slotSummary } from '../save/saveGame.js';
import { packagePositions } from '../missions/sideActivities.js';

export function drawCityMap() {
  const cv = document.getElementById('mapCanvas'), g = cv.getContext('2d'), p = G.p, bgc = mapBackground(), k = Math.min(cv.width / (B.x1 - B.x0), cv.height / (B.z1 - B.z0));
  g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = '#12182c'; g.fillRect(0, 0, cv.width, cv.height); g.save(); g.scale(k, k); g.translate(-B.x0, -B.z0); g.drawImage(bgc, B.x0, B.z0, bgc.width / Q, bgc.height / Q); g.restore();
  const X = (x) => (x - B.x0) * k, Z = (z) => (z - B.z0) * k;
  g.textAlign = 'center'; g.font = '800 15px Segoe UI, Arial'; g.shadowColor = '#000'; g.shadowBlur = 6;
  const seen = {}; for (const b of blocks) { const d = DISTRICTS[b.district]; (seen[b.district] ||= []).push(b); }
  for (const id in seen) { const l = seen[id], cx = l.reduce((s, b) => s + b.cx, 0) / l.length, cz = l.reduce((s, b) => s + b.cz, 0) / l.length; g.fillStyle = DISTRICTS[id].color; g.fillText(DISTRICTS[id].name.toUpperCase(), X(cx), Z(cz)); }
  g.fillStyle = '#9fd8ff'; g.fillText('SOLVANE SEA', X(HALF + 110), Z(0)); g.shadowBlur = 0;
  for (const k2 of packagePositions()) if (!k2.got) { g.fillStyle = '#ffe14a'; g.fillRect(X(k2.x) - 2, Z(k2.z) - 2, 4, 4); }
  drawBlips(g.canvas.getContext('2d') === g ? g : g, (x, z) => [X(x), Z(z)], 1.3, 0);
  g.save(); g.translate(X(p.x), Z(p.z)); g.rotate(Math.PI - (p.car ? p.car.heading : p.yaw)); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  const lv = levelFromXp(G.xp), next = RESPECT_XP[lv] ?? null, side = document.getElementById('mapSide'), next1 = MISSIONS.find((m) => !G.completed.includes(m.id));
  const rows = MISSIONS.map((m) => { const done = G.completed.includes(m.id), nx = m === next1; return `<div class="mrow ${done ? 'done' : nx ? 'next' : 'locked'}"><span class="st">${done ? '✓' : nx ? '!' : '🔒'}</span><span>CH ${m.chapter} · ${m.title}</span></div>`; }).join('');
  const leg = [['#ffd23c', 'Story mission'], ['#4fa8ff', 'Ammu-Bay shop'], ['#4fe0a0', 'Pay & Spray'], ['#f2c230', 'Taxi fares'], ['#ff4fd8', 'Street race'], ['#ffe14a', 'Hidden package'], ['#ff2a40', 'Police unit'], ['#ff3a5c', 'Target']].map(([c, t]) => `<div><i style="background:${c}"></i>${t}</div>`).join('');
  const sl = slotSummary();
  side.innerHTML = `<div class="card"><h3>STORY · NICO VARELA</h3>${rows}</div><div class="card"><h3>RESPECT LEVEL ${lv}</h3><div class="bar"><i style="width:${next ? Math.min(100, (G.xp - RESPECT_XP[lv - 1]) / (next - RESPECT_XP[lv - 1]) * 100) : 100}%"></i></div><div style="margin-top:6px;color:#bdb8d4">${G.xp} XP · ${lv >= 2 ? 'SMG ' : ''}${lv >= 3 ? 'Shotgun ' : ''}unlocked · Packages ${G.packages.length}/16</div></div><div class="card"><h3>LEGEND</h3><div class="leg">${leg}</div></div><div class="card"><h3>SAVE SLOT 1</h3><div class="slot">${sl.text}</div></div>`;
}

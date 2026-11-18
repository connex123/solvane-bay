// Behaviour for armed on-foot enemies: SBPD officers (when wanted) and gang members (when provoked or close).
import { G } from '../core/gameState.js';
import { wrapAngle } from '../core/config.js';
import { resolveCircle, rayBuildings } from '../world/collision.js';
import { animateWalk, setGun } from './characterModel.js';
import { fire } from '../combat/projectiles.js';

const GUN = { id: 'pistol', dmg: 12, range: 60, pellets: 1, spread: 0.05 };
export function updateHostile(a, dt) {
  const p = G.p, dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz);
  const active = a.kind === 'cop' ? G.wanted.stars > 0 : (a.aggro || d < 32);
  setGun(a.mesh, active && d < 45 ? 'pistol' : null);
  if (!active) { animateWalk(a.mesh, 0, 0, false); if (a.kind === 'cop' && G.wanted.stars === 0) a.idle = (a.idle || 0) + dt; return; }
  const want = a.kind === 'cop' ? (G.wanted.stars >= 3 ? 10 : 2.2) : 12;
  const yaw = Math.atan2(dx, dz); a.yaw += wrapAngle(yaw - a.yaw) * Math.min(1, dt * 8);
  let sp = 0; if (d > want) sp = a.kind === 'cop' ? 5.2 : 4;
  if (sp) { a.x += Math.sin(a.yaw) * sp * dt; a.z += Math.cos(a.yaw) * sp * dt; const r = resolveCircle(a.x, a.z, 0.5); if (r.hit) { a.x += r.dx; a.z += r.dz; } }
  a.phase += dt * sp * 2.2; animateWalk(a.mesh, a.phase, sp ? 0.7 : 0, d < 45);
  a.cd -= dt;
  if (a.cd <= 0 && d < 45 && !p.hidden) {
    const ox = a.x, oy = 1.4, oz = a.z, ty = 1.1, l = Math.hypot(dx, dz) || 1;
    if (rayBuildings(ox, oy, oz, dx / l, (ty - oy) / l, dz / l, d) >= d - 0.5) { fire(a, GUN, ox, oy, oz, dx / l, (ty - oy) / l, dz / l, { x: ox + Math.sin(a.yaw) * 0.6, y: 1.3, z: oz + Math.cos(a.yaw) * 0.6 }); a.cd = 0.7 + Math.random() * 0.8; }
    else a.cd = 0.3;
  }
}

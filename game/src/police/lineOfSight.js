// Police line of sight: a unit sees the player when within its sight range and no building blocks the ray between them.
// The wanted level only cools down while nobody has eyes on the player (the HUD shows IN SIGHT / SEARCHING).
import { G } from '../core/gameState.js';
import { rayBuildings } from '../world/collision.js';

export const SIGHT = { base: 70, perStar: 12, heli: 70, every: 0.2 };
let t = 0;
export function canSee(ox, oz, tx, tz, range) {
  const dx = tx - ox, dz = tz - oz, d = Math.hypot(dx, dz); if (d > range) return false; if (d < 4) return true;
  return rayBuildings(ox, 1.6, oz, dx / d, 0, dz / d, d) >= d - 0.6;
}
export function updateLineOfSight(dt) {
  const w = G.wanted; t -= dt; if (t > 0) return !!w.seen; t = SIGHT.every;
  if (w.stars <= 0) { w.seen = false; return false; }
  const p = G.p, tx = p.car ? p.car.x : p.x, tz = p.car ? p.car.z : p.z, range = SIGHT.base + w.stars * SIGHT.perStar;
  let seen = !!(G.heli && Math.hypot(G.heli.x - tx, G.heli.z - tz) < SIGHT.heli);
  if (!seen) for (const c of G.cars) if (c.kind === 'cop' && !c.dead && canSee(c.x, c.z, tx, tz, range)) { seen = true; break; }
  if (!seen) for (const a of G.actors) if (a.kind === 'cop' && !a.dead && canSee(a.x, a.z, tx, tz, range * 0.6)) { seen = true; break; }
  w.seen = seen; return seen;
}

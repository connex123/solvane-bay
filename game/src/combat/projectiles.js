// Hitscan shooting: rays against actors, cars, the player and buildings; tracers, flashes, melee and damage rules.
import { G } from '../core/gameState.js';
import { rayBuildings } from '../world/collision.js';
import { tracer, muzzleFlash, sparks } from './effects.js';
import { damageCar } from '../vehicles/carPhysics.js';
import { sfx } from '../audio/soundEngine.js';
import { rayBottles, hitBottle } from './gasBottles.js';

function rayCircle(ox, oy, oz, dx, dy, dz, cx, cy, cz, r, max) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz, t = lx * dx + ly * dy + lz * dz; if (t < 0 || t > max) return -1;
  const d2 = lx * lx + ly * ly + lz * lz - t * t; return d2 < r * r ? t - Math.sqrt(r * r - d2) * 0.5 : -1;
}
// shooter: 'player' | actor. origin/dir in world space. Returns hit distance.
export function fire(shooter, w, ox, oy, oz, dx, dy, dz, muzzle) {
  const own = shooter === 'player';
  if (muzzle) { muzzleFlash(muzzle.x, muzzle.y, muzzle.z); }
  sfx.shot(w.id);
  for (let k = 0; k < w.pellets; k++) {
    let ex = dx + (Math.random() - .5) * w.spread * 2, ey = dy + (Math.random() - .5) * w.spread * 2, ez = dz + (Math.random() - .5) * w.spread * 2; const l = Math.hypot(ex, ey, ez); ex /= l; ey /= l; ez /= l;
    let best = Math.min(w.range, rayBuildings(ox, oy, oz, ex, ey, ez, w.range)), hit = null;
    for (const a of G.actors) { if (a === shooter || a.dead) continue; const t = rayCircle(ox, oy, oz, ex, ey, ez, a.x, a.y + 0.95, a.z, 0.5, best); if (t >= 0 && t < best) { best = t; hit = a; } }
    for (const c of G.cars) { if (c.dead && !own) continue; const t = rayCircle(ox, oy, oz, ex, ey, ez, c.x, 0.9, c.z, c.type.wid * 0.85, best); if (t >= 0 && t < best) { best = t; hit = c; } }
    { const g = rayBottles(ox, oy, oz, ex, ey, ez, best); if (g.hit) { best = g.t; hit = g.hit; } }
    if (!own) { const p = G.p, t = rayCircle(ox, oy, oz, ex, ey, ez, p.x, p.y + 0.95, p.z, 0.55, best); if (t >= 0 && t < best) { best = t; hit = p; } }
    const hx = ox + ex * best, hy = oy + ey * best, hz = oz + ez * best;
    if (muzzle) tracer(muzzle.x, muzzle.y, muzzle.z, hx, hy, hz); else tracer(ox, oy, oz, hx, hy, hz);
    if (hit === G.p) G.hooks.hurtPlayer(w.dmg * 0.5);
    else if (hit && hit.isActor) G.hooks.hitActor(hit, w.dmg, own);
    else if (hit && hit.isBottle) { hitBottle(hit, w.dmg); sparks(hx, hy, hz, 4); }
    else if (hit) { damageCar(hit, w.dmg * 1.5); sparks(hx, hy, hz, 3); if (own && hit.driver === 'ai') G.hooks.crime('shootcar'); }
    else sparks(hx, hy, hz, 2);
  }
}
export function melee(p) {
  sfx.punch(); const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  for (const a of G.actors) { if (a.dead) continue; const rx = a.x - p.x, rz = a.z - p.z, d = Math.hypot(rx, rz); if (d < 2.4 && (rx * fx + rz * fz) / (d || 1) > 0.3) { G.hooks.hitActor(a, 14, true); a.x += fx * 0.4; a.z += fz * 0.4; return; } }
}

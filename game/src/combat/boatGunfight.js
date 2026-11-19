// Gunfights on the water: SBPD harbour launches put a bow gunner on the player's boat (bursts with tracers, bullet
// splashes in the sea, light hull damage) and Nico fires back over the stern at the nearest launch while the fire
// button is held with a gun out. Enough hits sink a launch (boats.js: sinkBoat -> fireball).
import { G } from '../core/gameState.js';
import { input } from '../core/input.js';
import { WEAPONS } from './weapons.js';
import { muzzleFlash, tracer, sparks, splash } from './effects.js';
import { damageBoat } from '../vehicles/boats.js';
import { sfx } from '../audio/soundEngine.js';

export const GUNFIGHT = { range: 55, burst: 0.8, pause: 1.5, rate: 0.12, spread: 3.2, hitR: 1.3, dmg: 1.5, returnRange: 60 };
const R = Math.random;

// one round from (ax, ay, az) at boat t: a hit sparks off the hull, a miss throws a plume of white water
export function boatShot(ax, ay, az, t, spread, dmg) {
  const ox = (R() - 0.5) * spread * 2, oz = (R() - 0.5) * spread * 2, hit = Math.hypot(ox, oz) < GUNFIGHT.hitR;
  const hx = t.x + ox, hz = t.z + oz, hy = hit ? 1.2 : 0.1; muzzleFlash(ax, ay, az); tracer(ax, ay, az, hx, hy, hz);
  if (hit) { sparks(hx, hy, hz, 4); damageBoat(t, dmg); } else splash(hx, hz);
  return hit;
}
function launchGunners(dt, me) {
  for (const b of G.boats) {
    if (b.dead || b.driver !== 'ai' || !b.type.police) continue;
    const d = Math.hypot(me.x - b.x, me.z - b.z); b.gunT = (b.gunT ?? R() * GUNFIGHT.pause) - dt;
    if (d > GUNFIGHT.range) continue;
    if (b.gunT < -GUNFIGHT.burst) b.gunT = GUNFIGHT.pause; // burst over: reload
    if (b.gunT > 0) continue;
    b.shotT = (b.shotT || 0) - dt; if (b.shotT > 0) continue; b.shotT = GUNFIGHT.rate;
    const sn = Math.sin(b.heading), cs = Math.cos(b.heading);
    boatShot(b.x + sn * 3.6, 1.9, b.z + cs * 3.6, me, GUNFIGHT.spread * (0.5 + d / GUNFIGHT.range), GUNFIGHT.dmg); if (R() < 0.3) sfx.shot('smg');
  }
}
function returnFire(dt, me) {
  const p = G.p, w = WEAPONS[p.weapon]; p.boatShotT = (p.boatShotT || 0) - dt;
  if (!input.left || !w || w.thrown || !w.pellets || !(p.ammo[w.id] > 0) || p.boatShotT > 0) return;
  let best = null, bd = GUNFIGHT.returnRange; for (const b of G.boats) if (!b.dead && b.driver === 'ai') { const d = Math.hypot(b.x - me.x, b.z - me.z); if (d < bd) { bd = d; best = b; } }
  if (!best) return; p.ammo[w.id]--; p.boatShotT = w.rate; sfx.shot(w.id);
  const dx = (best.x - me.x) / bd, dz = (best.z - me.z) / bd;
  for (let k = 0; k < w.pellets; k++) boatShot(me.x + dx * 1.2, 1.7, me.z + dz * 1.2, best, 1 + bd * w.spread * 3, w.dmg * 1.2);
}
export function updateBoatGunfight(dt) {
  const me = G.p.car; if (!me || !me.isBoat || me.dead || G.mode !== 'play') return;
  launchGunners(dt, me); returnFire(dt, me);
}

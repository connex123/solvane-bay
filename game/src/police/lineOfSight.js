// Can the police see Nico? A unit has eyes on him when he is within its sight range and no building cuts the
// line between them. Wanted heat only cools while nobody can see him (the HUD shows IN SIGHT / SEARCHING).
import { G } from '../core/gameState.js';
import { rayBuildings } from '../world/collision.js';

export const SIGHT = { base: 70, perStar: 12, heli: 70, every: 0.2 };

const EYE_HEIGHT = 1.6;
const POINT_BLANK = 4; // closer than this, walls do not matter
const FOOT_RANGE = 0.6; // officers on foot see this fraction of the vehicle range

let untilNextCheck = 0;

export function canSee(ox, oz, tx, tz, range) {
  const dx = tx - ox, dz = tz - oz;
  const gap = Math.hypot(dx, dz);
  if (gap > range) return false;
  if (gap < POINT_BLANK) return true;
  const clear = rayBuildings(ox, EYE_HEIGHT, oz, dx / gap, 0, dz / gap, gap);
  return clear >= gap - 0.6;
}

function anyWatcher(tx, tz, range) {
  const heli = G.heli;
  if (heli && Math.hypot(heli.x - tx, heli.z - tz) < SIGHT.heli) return true;
  const watching = (unit, r) => canSee(unit.x, unit.z, tx, tz, r);
  if (G.cars.some((car) => car.kind === 'cop' && !car.dead && watching(car, range))) return true;
  // harbour launches
  if ((G.boats || []).some((boat) => boat.type.police && boat.driver === 'ai' && !boat.dead && watching(boat, range))) return true;
  return G.actors.some((actor) => actor.kind === 'cop' && !actor.dead && watching(actor, range * FOOT_RANGE));
}

/** Re-check sight a few times a second; returns (and stores in G.wanted.seen) whether any unit sees the player. */
export function updateLineOfSight(dt) {
  const wanted = G.wanted;
  untilNextCheck -= dt;
  if (untilNextCheck > 0) return Boolean(wanted.seen);
  untilNextCheck = SIGHT.every;

  // Tamsin's BLACKOUT leaves every unit blind.
  if (wanted.stars <= 0 || G.blackoutT > 0) {
    wanted.seen = false;
    return false;
  }
  const player = G.p;
  const tx = player.car ? player.car.x : player.x;
  const tz = player.car ? player.car.z : player.z;
  const seen = anyWatcher(tx, tz, SIGHT.base + wanted.stars * SIGHT.perStar);
  wanted.seen = seen;
  return seen;
}

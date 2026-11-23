// Hitscan gunfire and melee. Each pellet is a ray tested against buildings, people, cars, gas bottles and
// (for enemy fire) the player; the nearest hit takes the damage and gets the matching tracer and sparks.
import { G } from '../core/gameState.js';
import { rayBuildings } from '../world/collision.js';
import { tracer, muzzleFlash, sparks } from './effects.js';
import { damageCar } from '../vehicles/carPhysics.js';
import { sfx } from '../audio/soundEngine.js';
import { rayBottles, hitBottle } from './gasBottles.js';

const BODY_HEIGHT = 0.95; // aim point above an actor's feet
const ACTOR_RADIUS = 0.5;
const PLAYER_RADIUS = 0.55;
const CAR_CENTRE_Y = 0.9;

// Distance along a unit ray to a sphere of radius r, or -1 when it misses or lies past maxT.
// The entry point is pulled halfway in, so hits read as landing on the body rather than its outer shell.
function raySphere(ray, cx, cy, cz, r, maxT) {
  const tx = cx - ray.ox, ty = cy - ray.oy, tz = cz - ray.oz;
  const along = tx * ray.dx + ty * ray.dy + tz * ray.dz;
  if (along < 0 || along > maxT) return -1;
  const offAxis2 = tx * tx + ty * ty + tz * tz - along * along;
  if (offAxis2 >= r * r) return -1;
  return along - Math.sqrt(r * r - offAxis2) * 0.5;
}

function jitter(spread) {
  return (Math.random() - 0.5) * spread * 2;
}

// Find the closest thing one pellet hits; returns { t, target } (target null for a wall or empty air).
function tracePellet(ray, shooter, weapon, byPlayer) {
  const nearest = { t: Math.min(weapon.range, rayBuildings(ray.ox, ray.oy, ray.oz, ray.dx, ray.dy, ray.dz, weapon.range)), target: null };
  const consider = (target, t) => {
    if (t >= 0 && t < nearest.t) { nearest.t = t; nearest.target = target; }
  };
  for (const actor of G.actors) {
    if (actor === shooter || actor.dead) continue;
    consider(actor, raySphere(ray, actor.x, actor.y + BODY_HEIGHT, actor.z, ACTOR_RADIUS, nearest.t));
  }
  for (const car of G.cars) {
    if (car.dead && !byPlayer) continue; // wrecks only soak the player's rounds
    consider(car, raySphere(ray, car.x, CAR_CENTRE_Y, car.z, car.type.wid * 0.85, nearest.t));
  }
  const bottle = rayBottles(ray.ox, ray.oy, ray.oz, ray.dx, ray.dy, ray.dz, nearest.t);
  if (bottle.hit) { nearest.t = bottle.t; nearest.target = bottle.hit; }
  if (!byPlayer) {
    const me = G.p;
    consider(me, raySphere(ray, me.x, me.y + BODY_HEIGHT, me.z, PLAYER_RADIUS, nearest.t));
  }
  return nearest;
}

function applyHit(target, weapon, byPlayer, hx, hy, hz) {
  if (!target) { sparks(hx, hy, hz, 2); return; }
  if (target === G.p) { G.hooks.hurtPlayer(weapon.dmg * 0.5); return; }
  if (target.isActor) { G.hooks.hitActor(target, weapon.dmg, byPlayer); return; }
  if (target.isBottle) { hitBottle(target, weapon.dmg); sparks(hx, hy, hz, 4); return; }
  damageCar(target, weapon.dmg * 1.5);
  sparks(hx, hy, hz, 3);
  if (byPlayer && target.driver === 'ai') G.hooks.crime('shootcar');
}

/**
 * Fire weapon w. shooter is 'player' or the firing actor; (ox,oy,oz) the ray origin, (dx,dy,dz) the aim
 * direction, and muzzle an optional {x,y,z} where the flash and tracer start.
 */
export function fire(shooter, w, ox, oy, oz, dx, dy, dz, muzzle) {
  const byPlayer = shooter === 'player';
  if (muzzle) muzzleFlash(muzzle.x, muzzle.y, muzzle.z);
  sfx.shot(w.id);
  const start = muzzle || { x: ox, y: oy, z: oz };
  for (let pellet = 0; pellet < w.pellets; pellet++) {
    let ax = dx + jitter(w.spread), ay = dy + jitter(w.spread), az = dz + jitter(w.spread);
    const len = Math.hypot(ax, ay, az);
    ax /= len; ay /= len; az /= len;
    const ray = { ox, oy, oz, dx: ax, dy: ay, dz: az };
    const { t, target } = tracePellet(ray, shooter, w, byPlayer);
    const hx = ox + ax * t, hy = oy + ay * t, hz = oz + az * t;
    tracer(start.x, start.y, start.z, hx, hy, hz);
    applyHit(target, w, byPlayer, hx, hy, hz);
  }
}

const PUNCH_REACH = 2.4;
const PUNCH_CONE = 0.3; // cosine: the target must be roughly in front

/** Punch the first living actor in reach in front of p, knocking them back a little. */
export function melee(p) {
  sfx.punch();
  const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  for (const actor of G.actors) {
    if (actor.dead) continue;
    const rx = actor.x - p.x, rz = actor.z - p.z;
    const gap = Math.hypot(rx, rz);
    if (gap >= PUNCH_REACH) continue;
    if ((rx * fx + rz * fz) / (gap || 1) <= PUNCH_CONE) continue;
    G.hooks.hitActor(actor, 14, true);
    actor.x += fx * 0.4;
    actor.z += fz * 0.4;
    return;
  }
}

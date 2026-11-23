// What armed people on foot do: SBPD officers come after Nico while he is wanted, gang members once provoked
// or when he wanders too close. They close to a preferred range, face him and shoot when they can see him.
import { G } from '../core/gameState.js';
import { wrapAngle } from '../core/config.js';
import { resolveCircle, rayBuildings } from '../world/collision.js';
import { animateWalk, setGun } from './characterModel.js';
import { fire } from '../combat/projectiles.js';

const SIDEARM = { id: 'pistol', dmg: 12, range: 60, pellets: 1, spread: 0.05 };
const GANG_NOTICE = 32; // gang members turn hostile inside this distance
const SHOOT_RANGE = 45;
const EYE_HEIGHT = 1.4;
const TARGET_HEIGHT = 1.1;

function isActive(actor, gap) {
  if (actor.kind === 'cop') return G.wanted.stars > 0;
  return Boolean(actor.aggro || gap < GANG_NOTICE);
}

function preferredRange(actor) {
  if (actor.kind !== 'cop') return 12;
  return G.wanted.stars >= 3 ? 10 : 2.2; // high heat: hang back and shoot; low heat: walk up to cuff
}

function advance(actor, speed, dt) {
  actor.x += Math.sin(actor.yaw) * speed * dt;
  actor.z += Math.cos(actor.yaw) * speed * dt;
  const push = resolveCircle(actor.x, actor.z, 0.5);
  if (push.hit) { actor.x += push.dx; actor.z += push.dz; }
}

function tryShoot(actor, dx, dz, gap) {
  const len = Math.hypot(dx, dz) || 1;
  const dirX = dx / len, dirY = (TARGET_HEIGHT - EYE_HEIGHT) / len, dirZ = dz / len;
  const clearTo = rayBuildings(actor.x, EYE_HEIGHT, actor.z, dirX, dirY, dirZ, gap);
  if (clearTo < gap - 0.5) {
    actor.cd = 0.3; // a wall is in the way: look again shortly
    return;
  }
  const muzzle = { x: actor.x + Math.sin(actor.yaw) * 0.6, y: 1.3, z: actor.z + Math.cos(actor.yaw) * 0.6 };
  fire(actor, SIDEARM, actor.x, EYE_HEIGHT, actor.z, dirX, dirY, dirZ, muzzle);
  actor.cd = 0.7 + Math.random() * 0.8;
}

export function updateHostile(a, dt) {
  const player = G.p;
  const dx = player.x - a.x, dz = player.z - a.z;
  const gap = Math.hypot(dx, dz);
  const active = isActive(a, gap);
  setGun(a.mesh, active && gap < SHOOT_RANGE ? 'pistol' : null);

  if (!active) {
    animateWalk(a.mesh, 0, 0, false);
    if (a.kind === 'cop' && G.wanted.stars === 0) a.idle = (a.idle || 0) + dt;
    return;
  }

  a.yaw += wrapAngle(Math.atan2(dx, dz) - a.yaw) * Math.min(1, dt * 8);
  const speed = gap > preferredRange(a) ? (a.kind === 'cop' ? 5.2 : 4) : 0;
  if (speed) advance(a, speed, dt);
  a.phase += dt * speed * 2.2;
  animateWalk(a.mesh, a.phase, speed ? 0.7 : 0, gap < SHOOT_RANGE);

  a.cd -= dt;
  if (a.cd <= 0 && gap < SHOOT_RANGE && !player.hidden) tryShoot(a, dx, dz, gap);
}

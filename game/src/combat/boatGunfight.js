// Shooting on the water. SBPD harbour launches carry a bow gunner who fires bursts at the player's boat
// (tracers, splashes in the sea, light hull damage); with a gun out and fire held, Nico shoots back over
// the stern at the nearest launch. Enough hits sink a launch (boats.js: damageBoat -> sinkBoat).
import { G } from '../core/gameState.js';
import { input } from '../core/input.js';
import { WEAPONS } from './weapons.js';
import { muzzleFlash, tracer, sparks, splash } from './effects.js';
import { damageBoat } from '../vehicles/boats.js';
import { sfx } from '../audio/soundEngine.js';

export const GUNFIGHT = { range: 55, burst: 0.8, pause: 1.5, rate: 0.12, spread: 3.2, hitR: 1.3, dmg: 1.5, returnRange: 60 };

const BOW_REACH = 3.6; // gunner position ahead of a launch's centre

/**
 * One round from (ax, ay, az) aimed at boat t. The round lands somewhere in a square of half-size `spread`
 * around the boat: inside the hit radius it sparks off the hull and deals dmg, otherwise it raises a splash.
 */
export function boatShot(ax, ay, az, t, spread, dmg) {
  const offX = (Math.random() - 0.5) * spread * 2;
  const offZ = (Math.random() - 0.5) * spread * 2;
  const struck = Math.hypot(offX, offZ) < GUNFIGHT.hitR;
  const px = t.x + offX, pz = t.z + offZ, py = struck ? 1.2 : 0.1;
  muzzleFlash(ax, ay, az);
  tracer(ax, ay, az, px, py, pz);
  if (struck) {
    sparks(px, py, pz, 4);
    damageBoat(t, dmg);
  } else {
    splash(px, pz);
  }
  return struck;
}

function isPoliceLaunch(boat) {
  return !boat.dead && boat.driver === 'ai' && boat.type.police;
}

// gunT counts down the pause between bursts and then on into the burst (negative values).
function launchesOpenFire(dt, target) {
  for (const boat of G.boats) {
    if (!isPoliceLaunch(boat)) continue;
    const range = Math.hypot(target.x - boat.x, target.z - boat.z);
    boat.gunT = (boat.gunT ?? Math.random() * GUNFIGHT.pause) - dt;
    if (range > GUNFIGHT.range) continue;
    if (boat.gunT < -GUNFIGHT.burst) boat.gunT = GUNFIGHT.pause; // burst finished: reload
    if (boat.gunT > 0) continue;
    boat.shotT = (boat.shotT || 0) - dt;
    if (boat.shotT > 0) continue;
    boat.shotT = GUNFIGHT.rate;
    const bowX = boat.x + Math.sin(boat.heading) * BOW_REACH;
    const bowZ = boat.z + Math.cos(boat.heading) * BOW_REACH;
    const spread = GUNFIGHT.spread * (0.5 + range / GUNFIGHT.range);
    boatShot(bowX, 1.9, bowZ, target, spread, GUNFIGHT.dmg);
    if (Math.random() < 0.3) sfx.shot('smg');
  }
}

function nearestHostileBoat(from) {
  let pick = null;
  let pickRange = GUNFIGHT.returnRange;
  for (const boat of G.boats) {
    if (boat.dead || boat.driver !== 'ai') continue;
    const range = Math.hypot(boat.x - from.x, boat.z - from.z);
    if (range < pickRange) { pick = boat; pickRange = range; }
  }
  return pick ? { boat: pick, range: pickRange } : null;
}

function playerReturnsFire(dt, ownBoat) {
  const player = G.p;
  const weapon = WEAPONS[player.weapon];
  player.boatShotT = (player.boatShotT || 0) - dt;
  if (!input.left || !weapon || weapon.thrown || !weapon.pellets) return;
  if (!(player.ammo[weapon.id] > 0) || player.boatShotT > 0) return;
  const found = nearestHostileBoat(ownBoat);
  if (!found) return;
  const { boat, range } = found;
  player.ammo[weapon.id]--;
  player.boatShotT = weapon.rate;
  sfx.shot(weapon.id);
  const ux = (boat.x - ownBoat.x) / range, uz = (boat.z - ownBoat.z) / range;
  const spread = 1 + range * weapon.spread * 3;
  for (let i = 0; i < weapon.pellets; i++) {
    boatShot(ownBoat.x + ux * 1.2, 1.7, ownBoat.z + uz * 1.2, boat, spread, weapon.dmg * 1.2);
  }
}

export function updateBoatGunfight(dt) {
  const ownBoat = G.p.car;
  if (!ownBoat || !ownBoat.isBoat || ownBoat.dead || G.mode !== 'play') return;
  launchesOpenFire(dt, ownBoat);
  playerReturnsFire(dt, ownBoat);
}

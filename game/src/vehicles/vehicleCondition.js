// How battered a car is: damage shown as a 0-100 % rating with a one-word status, and engine smoke or
// flames once the rating drops low enough.
import { smoke, particle } from '../combat/effects.js';

const SMOKE_BELOW = 0.45; // grey smoke starts here
const FIRE_BELOW = 0.2; // black smoke and flames below this

export function conditionPct(car) {
  const pct = Math.round((car.hp / car.maxHp) * 100);
  return pct < 0 ? 0 : pct;
}

export function conditionWord(pct) {
  if (pct > 75) return 'MINT';
  if (pct > 45) return 'DENTED';
  if (pct > 20) return 'SMOKING';
  return 'CRITICAL';
}

/** Puff smoke (and, when critical, flames) out of the engine bay at the front of the car. */
export function conditionEffects(car, dt) {
  if (car.dead) return;
  const health = car.hp / car.maxHp;
  if (health > SMOKE_BELOW) return;
  const critical = health < FIRE_BELOW;
  const reach = car.type.len * 0.35;
  const bayX = car.x + Math.sin(car.heading) * reach;
  const bayZ = car.z + Math.cos(car.heading) * reach;
  if (Math.random() < dt * (critical ? 14 : 6)) smoke(bayX, 1.1, bayZ, critical ? 0x151515 : 0x888888);
  if (critical && Math.random() < dt * 10) {
    particle({ x: bayX, y: 0.95, z: bayZ, vy: 1.6, life: 0.35, size: 0.8, grow: 1, color: 0xff7a2a, add: true });
  }
}

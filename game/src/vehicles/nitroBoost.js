// Nitro: hold Shift or N while driving to burn the tank for extra thrust and a higher top speed; it refills slowly when off.
import { G } from '../core/gameState.js';
import { particle } from '../combat/effects.js';

export const NITRO = { drain: 0.32, refill: 0.07, thrust: 16, overspeed: 1.22, minFire: 0.12 };
export function nitroLevel(car) { if (car.nitro === undefined) car.nitro = 1; return car.nitro; }
// Called from the player's drive step; `want` is the boost key state. Returns true while boosting.
export function updateNitro(car, dt, want) {
  nitroLevel(car);
  const sn = Math.sin(car.heading), cs = Math.cos(car.heading), fwd = sn * car.vx + cs * car.vz;
  if (want && !car.dead && fwd > 3 && (car.boosting ? car.nitro > 0 : car.nitro > NITRO.minFire)) {
    car.boosting = true; car.nitro = Math.max(0, car.nitro - NITRO.drain * dt);
    const push = fwd < car.type.max * NITRO.overspeed ? NITRO.thrust * dt : 0;
    car.vx += sn * push; car.vz += cs * push; G.fovKick = Math.min(1, (G.fovKick || 0) + dt * 3);
    if (Math.random() < dt * 30) { const b = car.type.len * 0.55; particle({ x: car.x - sn * b, y: 0.35, z: car.z - cs * b, vx: -car.vx * 0.2, vz: -car.vz * 0.2, vy: 0.4, life: 0.18, size: 0.9, color: 0x6fb8ff, add: true }); }
  } else { car.boosting = false; car.nitro = Math.min(1, car.nitro + NITRO.refill * dt); G.fovKick = Math.max(0, (G.fovKick || 0) - dt * 2); }
  return car.boosting;
}

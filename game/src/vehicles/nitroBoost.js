// Nitro boost: while Shift (or N) is held in a car, the tank burns for extra push and a raised top speed.
// Released, the tank creeps back up and the camera's FOV kick eases off.
import { G } from '../core/gameState.js';
import { particle } from '../combat/effects.js';

export const NITRO = {
  drain: 0.32, // tank fraction per second while burning
  refill: 0.07, // tank fraction per second while idle
  thrust: 16, // m/s^2 of extra push
  overspeed: 1.22, // boost may push past the car's top speed by this factor
  minFire: 0.12, // tank needed to light a fresh burn
};

/** Current tank (0..1); a car that never had one starts full. */
export function nitroLevel(car) {
  if (car.nitro === undefined) car.nitro = 1;
  return car.nitro;
}

function canBurn(car, forwardSpeed) {
  if (car.dead) return false;
  if (forwardSpeed <= -0.5) return false; // launch boost works from a standstill, never in reverse
  return car.boosting ? car.nitro > 0 : car.nitro > NITRO.minFire;
}

function exhaustFlame(car, sinH, cosH) {
  const back = car.type.len * 0.55;
  particle({
    x: car.x - sinH * back, y: 0.35, z: car.z - cosH * back,
    vx: -car.vx * 0.2, vy: 0.4, vz: -car.vz * 0.2,
    life: 0.18, size: 0.9, color: 0x6fb8ff, add: true,
  });
}

/** Run one drive step of nitro. `want` is the boost key; returns whether the car is boosting now. */
export function updateNitro(car, dt, want) {
  nitroLevel(car);
  const sinH = Math.sin(car.heading);
  const cosH = Math.cos(car.heading);
  const forwardSpeed = sinH * car.vx + cosH * car.vz;
  const kick = G.fovKick || 0;

  if (!want || !canBurn(car, forwardSpeed)) {
    car.boosting = false;
    car.nitro = Math.min(1, car.nitro + NITRO.refill * dt);
    G.fovKick = Math.max(0, kick - dt * 2);
    return false;
  }

  car.boosting = true;
  car.nitro = Math.max(0, car.nitro - NITRO.drain * (car.nitroMul || 1) * dt);
  const ceiling = car.type.max * NITRO.overspeed;
  if (forwardSpeed < ceiling) {
    const dv = NITRO.thrust * dt;
    car.vx += sinH * dv;
    car.vz += cosH * dv;
  }
  G.fovKick = Math.min(1, kick + dt * 3);
  if (Math.random() < dt * 30) exhaustFlame(car, sinH, cosH);
  return true;
}

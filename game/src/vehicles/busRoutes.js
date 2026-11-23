// Tide Bus line service: buses in the civilian traffic stream stop every couple of blocks (never inside a junction),
// riders step off onto the kerb and the people waiting walk over and board, then the bus pulls away. Cars behind
// queue up behind a stopped bus through the normal traffic following logic.
import { G } from '../core/gameState.js';
import { HALF, S } from '../core/config.js';
import { rnd } from '../core/random.js';
import { createActor, removeActor } from '../characters/pedestrianSystem.js';
import { randomStyle, animateWalk } from '../characters/characterModel.js';

const DWELL = 5.5, KERB = 3.4; // seconds at a stop; metres from the lane centre to the kerb where riders wait
export function assignBusRoute(car) { car.bus = { run: 0, nextStop: 30 + rnd() * 70, dwell: 0, riders: [] }; }
const nearJunction = (a) => { const k = (((a + HALF) % S) + S) % S; return k < 16 || k > S - 16; };
// The speed the bus may drive this frame: a braking curve into the next stop, zero while it dwells there.
export function busStopSpeed(c, dt) {
  const b = c.bus, n = c.nav, along = n.axis === 'x' ? c.x : c.z; b.run += n.spd * dt; stepRiders(c, dt);
  if (b.dwell > 0) { b.dwell -= dt; if (b.dwell <= 0) b.nextStop = b.run + 120 + rnd() * 80; return 0; }
  let left = b.nextStop - b.run;
  if (left < 18 && nearJunction(along + n.dir * Math.max(0, left))) { b.nextStop += 22; left += 22; } // never stop in a junction
  if (left <= 0.4) { b.dwell = DWELL; if (Math.hypot(c.x - G.p.x, c.z - G.p.z) < 120) riders(c); return 0; }
  return Math.max(1.5, Math.sqrt(2 * 2.6 * left));
}
// People at the stop: a couple step off and walk away along the kerb, a few waiting walk to the door and board.
function riders(c) {
  const fx = Math.sin(c.heading), fz = Math.cos(c.heading), kx = -fz, kz = fx, n = 1 + Math.floor(rnd() * 3); // kx,kz: toward the right-hand kerb
  for (let i = 0; i < n + 2; i++) {
    const boarding = i < n, along = (rnd() - 0.5) * 6, out = KERB + 0.6 + rnd() * 1.4;
    const a = createActor('ped', c.x + fx * along + kx * out, c.z + fz * along + kz * out, randomStyle(rnd)); a.rider = { bus: c, boarding, t: 0 };
    a.nav = { axis: Math.abs(fx) > 0.5 ? 'x' : 'z', dir: rnd() < 0.5 ? 1 : -1 }; // used once a scare sends them running
    c.bus.riders.push(a);
  }
}
function stepRiders(c, dt) {
  const list = c.bus.riders; if (!list.length) return;
  const fx = Math.sin(c.heading), fz = Math.cos(c.heading), door = { x: c.x + fx * 2.4 - fz * 1.4, z: c.z + fz * 2.4 + fx * 1.4 };
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i], r = a.rider; r.t += dt;
    if (a.dead || a.scared > 0 || r.t > 12 || !a.mesh.parent) { a.rider = null; list.splice(i, 1); if (!a.dead && !a.scared) removeActor(a); continue; }
    const tx = r.boarding ? door.x : a.x - fx * 3, tz = r.boarding ? door.z : a.z - fz * 3, dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
    if (r.boarding && (d < 0.6 || (c.bus.dwell <= 0 && r.t > 2))) { list.splice(i, 1); removeActor(a); continue; } // stepped aboard
    if (r.boarding && r.t < 1.2) { animateWalk(a.mesh, 0, 0, false); continue; } // a beat before they move
    const sp = 1.6 * dt; a.x += dx / (d || 1) * sp; a.z += dz / (d || 1) * sp; a.yaw = Math.atan2(dx, dz); a.phase += dt * 5; animateWalk(a.mesh, a.phase, 0.5, false);
  }
}

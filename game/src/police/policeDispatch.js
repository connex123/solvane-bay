// SBPD response: spawns patrol cars that pursue and ram, roadblocks at 3+ stars, officers on foot, and busting.
import { G, notify } from '../core/gameState.js';
import { clamp, wrapAngle, HALF, lineCoord } from '../core/config.js';
import { rnd } from '../core/random.js';
import { randomRoadPoint, nearestLine } from '../world/cityLayout.js';
import { blockedAt } from '../world/collision.js';
import { createCar, removeCar, stepCar } from '../vehicles/carPhysics.js';
import { createActor, removeActor } from '../characters/pedestrianSystem.js';
import { STYLES } from '../characters/characterModel.js';
import { createSpikeStrip } from './spikeStrip.js';

let callN = 11, spawnT = 0, blockT = 15;
export const copCars = () => G.cars.filter((c) => c.kind === 'cop' && !c.dead);
export function spawnCop(x, z, heading, ai = 'PURSUIT') {
  const c = createCar('interceptor', x, z, heading, 'cop'); c.driver = 'ai'; c.ai = ai; c.callsign = `SB-${callN++}`; c.stuck = 0; c.rev = 0; return c;
}
function copInput(c, dt, tx, tz) {
  const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz), i = c.input, fx = Math.sin(c.heading), fz = Math.cos(c.heading);
  let want = Math.atan2(dx, dz), diff = wrapAngle(want - c.heading);
  const L = blockedAt(c.x + Math.sin(c.heading + 0.5) * 7, c.z + Math.cos(c.heading + 0.5) * 7), R = blockedAt(c.x + Math.sin(c.heading - 0.5) * 7, c.z + Math.cos(c.heading - 0.5) * 7), F = blockedAt(c.x + fx * 8, c.z + fz * 8);
  if (F || L || R) diff = F ? (L && !R ? -0.9 : 0.9) : L ? -0.8 : 0.8;
  i.steer = clamp(diff * 2, -1, 1); i.hand = Math.abs(diff) > 1.1 && c.speed > 14 ? 1 : 0;
  i.throttle = Math.abs(diff) < 1.3 ? 1 : 0.35; i.brake = 0;
  if (d < 7 && G.p.car && Math.abs(G.p.car.speed) < 2) { i.throttle = 0; i.brake = 1; }
  c.ai = d < 16 && c.speed > 8 ? 'RAMMING' : d > 90 ? 'ARRIVING' : 'PURSUIT';
  if (Math.abs(c.speed) < 1.2 && d > 9) c.stuck += dt; else c.stuck = 0;
  if (c.stuck > 1.2) { c.rev = 1.1; c.stuck = 0; } if (c.rev > 0) { c.rev -= dt; i.throttle = 0; i.brake = 1; i.steer = -i.steer; }
}
export function updatePolice(dt) {
  const p = G.p, st = G.wanted.stars, tx = p.car ? p.car.x : p.x, tz = p.car ? p.car.z : p.z, cops = copCars();
  let minD = 999;
  for (const c of cops) {
    const d = Math.hypot(c.x - tx, c.z - tz); minD = Math.min(minD, d);
    if (c.ai === 'ROADBLOCK') { c.input.throttle = 0; c.input.brake = 1; c.rbT -= dt; if (c.rbT < 0 || d < 20) c.ai = 'PURSUIT'; }
    else if (st > 0) copInput(c, dt, tx, tz); else { c.input.throttle = 0.5; c.input.brake = 0; c.input.steer = 0; c.ai = 'STANDDOWN'; if (d > 70) removeCar(c); }
    if (st > 0 && d < 24 && !p.car && !c.deployed && Math.abs(c.speed) < 8) { c.deployed = true; for (let k = 0; k < 2; k++) createActor('cop', c.x + Math.cos(c.heading) * (k ? 2 : -2), c.z - Math.sin(c.heading) * (k ? 2 : -2), STYLES.cop, { yaw: 0 }); }
    if (st > 0 && d < 12 && p.car && Math.abs(p.car.speed) < 3) { c.deployed = true; if (!c.deployedP) { c.deployedP = true; for (let k = 0; k < 2; k++) createActor('cop', c.x + (k ? 2 : -2), c.z + 1, STYLES.cop); } }
  }
  for (const a of G.actors) if (a.kind === 'cop' && !a.dead) minD = Math.min(minD, Math.hypot(a.x - tx, a.z - tz));
  if (G.heli) minD = Math.min(minD, 30);
  const want = st === 0 ? 0 : Math.min(6, st + 1);
  spawnT -= dt;
  if (spawnT <= 0 && cops.length < want && G.mode === 'play') {
    // a spawn point at a junction is rejected: retry shortly instead of waiting out the whole interval
    spawnT = 0.4; const pt = randomRoadPoint(rnd, tx, tz, 110, 170), a = pt.axis === 'x' ? pt.x : pt.z;
    if ((a + HALF) % 64 > 16 && (a + HALF) % 64 < 48) { spawnT = 2.2; const dir = rnd() < .5 ? 1 : -1; spawnCop(pt.axis === 'x' ? a : lineCoord(pt.line) - dir * 3.5, pt.axis === 'x' ? lineCoord(pt.line) + dir * 3.5 : a, pt.axis === 'x' ? dir * Math.PI / 2 : dir > 0 ? 0 : Math.PI); }
  }
  blockT -= dt;
  if (st >= 3 && blockT <= 0 && G.mode === 'play') {
    blockT = 28; const sp = p.car ? p.car.speed : 0, hx = p.car ? Math.sin(p.car.heading) : 0, hz = p.car ? Math.cos(p.car.heading) : 1, ax = tx + hx * 110, az = tz + hz * 110;
    const horiz = Math.abs(hx) > Math.abs(hz), lc = horiz ? lineCoord(nearestLine(az)) : lineCoord(nearestLine(ax)), pos = horiz ? ax : az;
    if (Math.abs(lc) < HALF && Math.abs(pos) < HALF && (pos + HALF) % 64 > 14 && (pos + HALF) % 64 < 50) { for (const o of [-2.6, 2.6]) { const c = spawnCop(horiz ? pos : lc + o, horiz ? lc + o : pos, horiz ? 0 : Math.PI / 2, 'ROADBLOCK'); c.rbT = 40; c.heading += rnd.range(-0.2, 0.2); }
      const back = horiz ? -Math.sign(hx) * 7 : -Math.sign(hz) * 7; createSpikeStrip(horiz ? pos + back : lc, horiz ? lc : pos + back, horiz ? 0 : Math.PI / 2, 11); }
  }
  if (st === 0) for (const a of G.actors) if (a.kind === 'cop' && (a.idle || 0) > 8) removeActor(a);
  // busting
  const w = G.wanted; let near = false;
  if (st > 0) for (const a of G.actors) if (a.kind === 'cop' && !a.dead && Math.hypot(a.x - p.x, a.z - p.z) < 2.4 && (!p.car || Math.abs(p.car.speed) < 3)) near = true;
  w.bust = near ? w.bust + dt : Math.max(0, w.bust - dt); if (w.bust > 2.2) { w.bust = 0; G.hooks.playerDown('CUFFED'); }
  return minD;
}

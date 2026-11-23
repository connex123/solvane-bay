// Civilian traffic: cars follow lane centrelines, obey the signals, queue behind each other and pick turns at junctions.
import { G } from '../core/gameState.js';
import { N, S, HALF, LANE, lineCoord, CAR_COLORS, wrapAngle } from '../core/config.js';
import { rnd } from '../core/random.js';
import { randomRoadPoint } from '../world/cityLayout.js';
import { lightState } from '../world/roadNetwork.js';
import { CIVIL_TYPES, CAR_TYPES } from './vehicleModels.js';
import { createCar, removeCar, stepCar } from './carPhysics.js';
import { streetBudget, pickCivilType } from './trafficDensity.js';
import { assignBusRoute, busStopSpeed } from './busRoutes.js';

const nextIndex = (a, dir) => dir > 0 ? Math.floor((a + HALF) / S + 1e-6) + 1 : Math.ceil((a + HALF) / S - 1e-6) - 1;
const laneCross = (axis, line, dir) => axis === 'x' ? lineCoord(line) + dir * LANE : lineCoord(line) - dir * LANE;
export function placeTraffic(axis, line, a, dir, key, kind = 'traffic', tint) {
  const cross = laneCross(axis, line, dir), x = axis === 'x' ? a : cross, z = axis === 'x' ? cross : a;
  const car = createCar(key || pickCivilType(x, z), x, z, axis === 'x' ? dir * Math.PI / 2 : dir > 0 ? 0 : Math.PI, kind, tint ?? rnd.pick(CAR_COLORS));
  car.nav = { axis, line, dir, nextK: nextIndex(a, dir), spd: 0, cruise: rnd.range(10, 15) }; car.driver = 'ai'; if (car.type === CAR_TYPES.tidebus && kind === 'traffic') assignBusRoute(car); return car;
}
export function spawnTrafficNear(cx, cz, rMin, rMax) {
  const pt = randomRoadPoint(rnd, cx, cz, rMin, rMax), a = pt.axis === 'x' ? pt.x : pt.z, dir = rnd() < 0.5 ? 1 : -1;
  const k = (a + HALF) % S; if (k < 16 || k > S - 16) return null;
  const x = pt.axis === 'x' ? a : laneCross('z', pt.line, dir), z = pt.axis === 'x' ? laneCross('x', pt.line, dir) : a;
  if (G.cars.some((c) => Math.hypot(c.x - x, c.z - z) < 12)) return null;
  return placeTraffic(pt.axis, pt.line, a, dir);
}
export function populateParked(n) {
  for (let t = 0; t < n; t++) {
    const pt = randomRoadPoint(rnd, 0, 0, 0, 300), a = pt.axis === 'x' ? pt.x : pt.z, k = (a + HALF) % S; if (k < 14 || k > S - 14) continue;
    const side = rnd() < 0.5 ? 1 : -1, off = side * 5.4, dir = rnd() < 0.5 ? 1 : -1;
    const x = pt.axis === 'x' ? a : pt.x + off, z = pt.axis === 'x' ? pt.z + off : a;
    if (G.cars.some((c) => Math.hypot(c.x - x, c.z - z) < 7)) continue;
    createCar(rnd.pick(CIVIL_TYPES), x, z, pt.axis === 'x' ? dir * Math.PI / 2 : dir > 0 ? 0 : Math.PI, 'parked', rnd.pick(CAR_COLORS));
  }
}
function chooseTurn(c) {
  const n = c.nav, opts = [];
  if (n.nextK + n.dir >= 0 && n.nextK + n.dir <= N) opts.push(['s', 0.6]);
  for (const nd of [-1, 1]) if (n.line + nd >= 0 && n.line + nd <= N) opts.push(['t', 0.2, nd]);
  if (!opts.length) { n.dir = -n.dir; n.nextK = nextIndex(n.axis === 'x' ? c.x : c.z, n.dir); return; }
  let r = rnd() * opts.reduce((s, o) => s + o[1], 0), o = opts[0]; for (const q of opts) { r -= q[1]; if (r <= 0) { o = q; break; } }
  if (o[0] === 's') { n.nextK += n.dir; return; }
  const oldLine = n.line; n.axis = n.axis === 'x' ? 'z' : 'x'; n.line = n.nextK; n.dir = o[2]; n.nextK = oldLine + n.dir;
}
export function updateTraffic(dt) {
  const p = G.p;
  for (let ci = G.cars.length - 1; ci >= 0; ci--) {
    const c = G.cars[ci];
    if (c.kind === 'stalled') { c.input.throttle = 0; c.input.brake = 1; c.stallT = (c.stallT || 0) + dt; if (c.stallT > 9 && Math.hypot(c.x - p.x, c.z - p.z) > 40) removeCar(c); continue; }
    if (c.kind !== 'traffic' && c.kind !== 'target') continue;
    const n = c.nav, ax = n.axis, a = ax === 'x' ? c.x : c.z, target = lineCoord(n.nextK), d = (target - a) * n.dir, flee = c.kind === 'target';
    let want = flee ? 21 : n.cruise;
    if (!flee && d >= 12 && ax && lightState(ax) === 'red') want = Math.min(want, Math.sqrt(Math.max(0, 2 * 5 * (d - 12))));
    const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
    for (const o of G.cars) { if (o === c) continue; const rx = o.x - c.x, rz = o.z - c.z, f = rx * fx + rz * fz; if (f > 0.5 && f < 16 && Math.abs(rx * fz - rz * fx) < 2.3) want = Math.min(want, Math.max(0, (f - 5.2) * 1.4)); }
    if (c.bus) want = Math.min(want, busStopSpeed(c, dt));
    n.spd += Math.max(-14 * dt, Math.min(7 * dt, want - n.spd));
    const step = n.spd * dt;
    if (ax === 'x') c.x += n.dir * step; else c.z += n.dir * step;
    if (d <= 0.2) chooseTurn(c);
    const cross = laneCross(n.axis, n.line, n.dir);
    if (n.axis === 'x') c.z += (cross - c.z) * Math.min(1, dt * 3); else c.x += (cross - c.x) * Math.min(1, dt * 3);
    const th = n.axis === 'x' ? n.dir * Math.PI / 2 : n.dir > 0 ? 0 : Math.PI; c.heading += wrapAngle(th - c.heading) * Math.min(1, dt * 4);
    c.speed = n.spd; c.vx = Math.sin(c.heading) * n.spd; c.vz = Math.cos(c.heading) * n.spd;
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading;
    if (c.kind === 'traffic' && Math.hypot(c.x - p.x, c.z - p.z) > 240) removeCar(c);
  }
  const count = G.cars.filter((c) => c.kind === 'traffic').length;
  if (count < streetBudget(p.x, p.z).cars && G.mode === 'play') for (let k = 0; k < 2; k++) spawnTrafficNear(p.x, p.z, 70, 190);
}
export function releaseTrafficCar(car) { car.kind = 'parked'; car.driver = null; }

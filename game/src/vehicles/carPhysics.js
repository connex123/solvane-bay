// Car physics, arcade style: throttle, brakes, steering and handbrake drifts in the car's own frame,
// pushes against buildings and other cars, damage, wrecks that burn out, and blast damage around explosions.
import { G } from '../core/gameState.js';
import { clamp } from '../core/config.js';
import { CAR_TYPES, buildCarMesh, burntMat, burntLampMat } from './vehicleModels.js';
import { resolveCircle } from '../world/collision.js';
import { popup } from './driftScoring.js';
import { sparks, smoke, explosion, skidMark, addSiren, removeSiren, tyreSmoke, fire } from '../combat/effects.js';
import { sfx } from '../audio/soundEngine.js';
import { conditionEffects } from './vehicleCondition.js';
import { deckHeight, RAMP } from '../world/causewayDeck.js';

const BRAKE_DECEL = 32;       // m/s² while still rolling forward
const REVERSE_MAX = 11;       // m/s
const COAST_DECEL = 3.5;      // rolling resistance with no pedal down
const AIR_DRAG = 0.12;        // share of speed lost per second
const HANDBRAKE_DECEL = 9;
const HANDBRAKE_GRIP = 1.4;
const WRECK_BURN_TIME = 40;   // seconds before a wreck is cleared away
const CAR_RADIUS = 0.95;      // each car is three circles of this radius along its axis
const CAR_PROBES = [-1.5, 0, 1.5];

// Move a value toward zero by at most `step`.
const towardZero = (v, step) => v - Math.sign(v) * Math.min(Math.abs(v), step);
const isHeavy = (c) => !(c.kind === 'parked' || c.dead); // parked and dead cars give way easily

export function createCar(key, x, z, heading, kind = 'parked', tint) {
  const type = CAR_TYPES[key];
  const mesh = buildCarMesh(key, tint);
  const car = {
    key, type, mesh, x, z, heading, kind, tint,
    vx: 0, vz: 0, speed: 0, lat: 0, steerA: 0,
    hp: type.hp, maxHp: type.hp,
    input: { throttle: 0, brake: 0, steer: 0, hand: 0 },
    driver: null, dead: false, hitT: 0, fireT: 0,
    bar: mesh.userData.bar,
  };
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  G.scene.add(mesh);
  G.cars.push(car);
  if (type.police) addSiren(car, G.scene);
  return car;
}

export function removeCar(car) {
  car.mesh.removeFromParent();
  removeSiren(car);
  const at = G.cars.indexOf(car);
  if (at !== -1) G.cars.splice(at, 1);
}

export function damageCar(car, amt) {
  if (car.dead) return;
  const isPlayers = car.driver === 'player';
  if (isPlayers && G.resumeGrace > 0) return; // just back from a menu: nothing lands
  car.hp -= isPlayers ? amt * (car.armourMul || 1) : amt;
  car.hitT = 4;
  if (car.hp <= 0) wreck(car);
}

function charMesh(car) {
  const parts = car.mesh.userData;
  parts.bodyMesh.material = burntMat;
  for (const part of [parts.lightsMesh, parts.glassMesh]) if (part) part.material = burntLampMat;
}

export function wreck(car) {
  Object.assign(car, { dead: true, kind: 'wreck', hp: 0, wreckT: WRECK_BURN_TIME });
  charMesh(car);
  car.input.throttle = 0;
  car.input.brake = 1;
  explosion(car.x, 1, car.z);
  sfx.explosion();
  blast(car.x, car.z, 9, car);
  if (car.driver === 'player') { G.p.exitCarForced(); G.p.hp -= 45; }
}

// Damage everything within radius r of (x, z), falling off linearly to the edge.
export function blast(x, z, r, src) {
  const falloff = (tx, tz) => { const d = Math.hypot(tx - x, tz - z); return d < r ? 1 - d / r : 0; };
  for (const car of G.cars) {
    if (car === src || car.dead) continue;
    const f = falloff(car.x, car.z);
    if (f > 0) damageCar(car, 500 * f);
  }
  for (const actor of G.actors) {
    if (actor.dead) continue;
    const f = falloff(actor.x, actor.z);
    if (f > 0) G.hooks.hitActor(actor, 120 * f, true);
  }
  const p = G.p, f = falloff(p.x, p.z);
  if (f > 0 && !p.car) p.hp -= 60 * f;
  G.hooks.crime('explosion');
}

// Longitudinal speed after throttle, brakes, coasting, drag and handbrake.
function driveForward(car, fwd, dt) {
  const ctl = car.input, spec = car.type;
  const top = spec.max * (car.pmax || 1) * (car.kind === 'cop' ? 0.97 : 1) * (car.tyresBurst ? 0.55 : 1);
  if (ctl.throttle > 0) {
    const pull = clamp(1 - Math.max(0, fwd) / top, 0.05, 1); // power fades toward top speed
    const reverseBoost = fwd < 0 ? 2 : 1;                     // pressing on while rolling back bites harder
    fwd += spec.acc * (car.pacc || 1) * ctl.throttle * pull * reverseBoost * dt;
  }
  if (ctl.brake > 0) {
    fwd = fwd > 0.8 ? fwd - BRAKE_DECEL * ctl.brake * dt : Math.max(-REVERSE_MAX, fwd - spec.acc * 0.55 * ctl.brake * dt);
  }
  if (!ctl.throttle && !ctl.brake) fwd = towardZero(fwd, COAST_DECEL * dt);
  fwd -= fwd * AIR_DRAG * dt;
  if (ctl.hand) fwd = towardZero(fwd, HANDBRAKE_DECEL * dt);
  return fwd;
}

function leaveTyreMarks(car, fwd, side, dt) {
  const sliding = Math.abs(fwd) > 6 && (Math.abs(side) > 3.2 || (car.input.hand && Math.abs(fwd) > 8));
  if (!sliding) { car.skidding = false; return; }
  const sn = Math.sin(car.heading), cs = Math.cos(car.heading), rear = car.type.len * 0.32;
  for (const wheel of [-0.85, 0.85]) {
    const wx = car.x - sn * rear + cs * wheel, wz = car.z - cs * rear - sn * wheel;
    skidMark(wx, wz, car.heading);
    if (Math.random() < dt * 14) tyreSmoke(wx, wz);
  }
  if (car === G.p.car) car.skidding = true;
}

// Push the car out of buildings at its nose, middle and tail, bouncing off and taking damage on hard hits.
function hitBuildings(car) {
  const sn = Math.sin(car.heading), cs = Math.cos(car.heading), half = car.type.len * 0.32;
  for (const along of [-half, 0, half]) {
    const res = resolveCircle(car.x + sn * along, car.z + cs * along, car.type.wid / 2 + 0.15);
    if (!res.hit) continue;
    car.x += res.dx; car.z += res.dz;
    const into = car.vx * res.nx + car.vz * res.nz;
    if (into >= 0) continue;
    car.vx -= 1.3 * into * res.nx;
    car.vz -= 1.3 * into * res.nz;
    if (into >= -4) continue;
    const impact = -into;
    if (car.driver === 'player') { G.shake = Math.max(G.shake, Math.min(0.7, impact / 25)); sfx.crash(impact); }
    sparks(car.x + sn * along, 0.6, car.z + cs * along);
    if (car.kind !== 'wreck') damageCar(car, impact * 6);
  }
}

function burnWreck(car, dt) {
  car.wreckT -= dt;
  if (Math.random() < dt * 6) smoke(car.x, 1.6, car.z, 0x151515);
  if (car.wreckT > WRECK_BURN_TIME - 14 && Math.random() < dt * 14) fire(car.x, 1.1, car.z);
  if (car.wreckT < 0 && car !== G.p.car) removeCar(car);
}

function syncMesh(car, fwd) {
  const m = car.mesh;
  for (const wheel of m.userData.fw || []) wheel.rotation.y = car.steerA * 0.9;
  car.y = deckHeight(car.x, car.z);
  m.position.set(car.x, car.y + (car.airY || 0), car.z);
  m.rotation.order = 'YXZ';
  m.rotation.y = car.heading;
  const onRamp = car.y > 0 && car.x < RAMP.x1;
  m.rotation.x = onRamp ? -0.21 * Math.sin(car.heading) : 0;
  const bodyRoll = clamp(-0.012 * car.steerA * fwd, -0.08, 0.08);
  m.rotation.z = bodyRoll + (car.dead ? 0.05 : 0);
}

export function stepCar(car, dt) {
  const ctl = car.input, spec = car.type;
  if (car.dead) { ctl.throttle = 0; ctl.brake = 0.6; }

  // Split velocity into the car's forward and sideways axes.
  let sn = Math.sin(car.heading), cs = Math.cos(car.heading);
  let fwd = car.vx * sn + car.vz * cs;
  let side = car.vx * cs - car.vz * sn;

  fwd = driveForward(car, fwd, dt);
  const grip = (ctl.hand ? HANDBRAKE_GRIP : spec.grip) * (car.tyresBurst ? 0.5 : 1);
  side *= Math.exp(-grip * dt);

  // Steering: less lock at speed, the wheels ease toward it, the turn rate follows wheelbase and speed.
  const lock = ctl.steer * spec.steer / (1 + 0.05 * Math.abs(fwd));
  car.steerA += (lock - car.steerA) * Math.min(1, 9 * dt);
  car.heading += (car.steerA * fwd / (0.8 * spec.len)) * (ctl.hand ? 1.5 : 1) * dt;

  sn = Math.sin(car.heading); cs = Math.cos(car.heading);
  car.vx = fwd * sn + side * cs;
  car.vz = fwd * cs - side * sn;
  car.speed = fwd;
  car.lat = side;
  car.x += car.vx * dt;
  car.z += car.vz * dt;

  leaveTyreMarks(car, fwd, side, dt);
  hitBuildings(car);
  car.hitT = Math.max(0, car.hitT - dt);
  conditionEffects(car, dt);
  if (car.dead) burnWreck(car, dt);
  syncMesh(car, fwd);
}

// Closest pair of axis circles between two cars, or null when they do not touch.
function closestContact(A, B) {
  const reach = 2 * CAR_RADIUS;
  let hit = null;
  for (const oa of CAR_PROBES) {
    const ax = A.x + Math.sin(A.heading) * oa, az = A.z + Math.cos(A.heading) * oa;
    for (const ob of CAR_PROBES) {
      const bx = B.x + Math.sin(B.heading) * ob, bz = B.z + Math.cos(B.heading) * ob;
      const d = Math.hypot(bx - ax, bz - az);
      if (d >= reach || (hit && d >= hit.d)) continue;
      const n = d || 1;
      hit = { d, nx: (bx - ax) / n, nz: (bz - az) / n };
    }
  }
  return hit;
}

// The player's car struck another: crash feel, plus a ram bonus against police or a crime against civilians.
function playerRammed(other, closing, mx, mz) {
  sfx.crash(closing);
  G.shake = Math.max(G.shake, Math.min(0.6, closing / 25));
  if (other.kind !== 'cop') { G.hooks.crime('ram'); return; }
  other.rammed = true;
  if (closing > 6 && (other.paintT || 0) < G.time) {
    other.paintT = G.time + 3;
    sparks(mx, 0.7, mz, 18);
    popup('TRADE PAINT', 75, 'ram');
  }
}

function resolvePair(A, B) {
  const contact = closestContact(A, B);
  if (!contact) return;
  const { nx, nz } = contact;
  const wa = isHeavy(A) ? 1 : 0.2, wb = isHeavy(B) ? 1 : 0.2, total = wa + wb;
  const shareA = wb / total, shareB = wa / total; // the lighter car moves more

  const overlap = 2 * CAR_RADIUS - contact.d;
  A.x -= nx * overlap * shareA; A.z -= nz * overlap * shareA;
  B.x += nx * overlap * shareB; B.z += nz * overlap * shareB;

  const approach = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
  if (approach >= 0) return;
  const impulse = -1.25 * approach;
  A.vx -= nx * impulse * shareA; A.vz -= nz * impulse * shareA;
  B.vx += nx * impulse * shareB; B.vz += nz * impulse * shareB;

  const closing = -approach;
  if (closing <= 3) return;
  const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
  sparks(mx, 0.7, mz, 4);
  damageCar(A, closing * 9);
  damageCar(B, closing * 9);
  const mine = G.p.car;
  if (A === mine) playerRammed(B, closing, mx, mz);
  else if (B === mine) playerRammed(A, closing, mx, mz);
  for (const c of [A, B]) if (c.kind === 'traffic') c.kind = 'stalled';
}

export function carCollisions() {
  const list = G.cars;
  for (let i = 0; i < list.length; i++) {
    const A = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const B = list[j];
      // Cheap reject: far apart on either axis, or on different levels (deck vs street).
      if (Math.abs(B.x - A.x) > 5.5 || Math.abs(B.z - A.z) > 5.5) continue;
      if (Math.abs((A.y || 0) - (B.y || 0)) > 2.5) continue;
      resolvePair(A, B);
    }
  }
}

// Push a circle (an actor or the player on foot) out of a car's body, modelled as a capsule along its length.
export function circlePushCar(x, z, r, car) {
  const sn = Math.sin(car.heading), cs = Math.cos(car.heading), halfSpine = car.type.len / 2 - 0.6;
  const t = clamp((x - car.x) * sn + (z - car.z) * cs, -halfSpine, halfSpine);
  const ox = x - (car.x + sn * t), oz = z - (car.z + cs * t);
  const d = Math.hypot(ox, oz), limit = car.type.wid / 2 + r;
  if (d >= limit) return null;
  const n = d || 1, depth = limit - d;
  return { dx: (ox / n) * depth, dz: (oz / n) * depth, d };
}

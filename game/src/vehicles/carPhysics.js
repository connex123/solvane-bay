// Arcade car physics: acceleration, braking, steering, drift, building and car-to-car collisions, damage and wrecks.
import { G, notify } from '../core/gameState.js';
import { clamp, wrapAngle } from '../core/config.js';
import { CAR_TYPES, buildCarMesh, burntMat } from './vehicleModels.js';
import { resolveCircle } from '../world/collision.js';
import { sparks, smoke, explosion, skidMark, addSiren, removeSiren } from '../combat/effects.js';
import { sfx } from '../audio/soundEngine.js';
import { conditionEffects } from './vehicleCondition.js';

export function createCar(key, x, z, heading, kind = 'parked', tint) {
  const type = CAR_TYPES[key], mesh = buildCarMesh(key, tint);
  const car = { key, type, mesh, x, z, heading, vx: 0, vz: 0, speed: 0, steerA: 0, hp: type.hp, maxHp: type.hp, input: { throttle: 0, brake: 0, steer: 0, hand: 0 }, driver: null, kind, dead: false, hitT: 0, bar: mesh.userData.bar, fireT: 0, lat: 0, tint };
  mesh.position.set(x, 0, z); mesh.rotation.y = heading; G.scene.add(mesh); G.cars.push(car);
  if (type.police) addSiren(car, G.scene);
  return car;
}
export function removeCar(car) { car.mesh.removeFromParent(); removeSiren(car); const i = G.cars.indexOf(car); if (i >= 0) G.cars.splice(i, 1); }
export function damageCar(car, amt) {
  if (car.dead) return; car.hp -= amt; car.hitT = 4;
  if (car.hp <= 0) wreck(car);
}
export function wreck(car) {
  car.dead = true; car.kind = 'wreck'; car.hp = 0; car.mesh.userData.bodyMesh.material = burntMat; car.input.throttle = 0; car.input.brake = 1; car.wreckT = 40;
  explosion(car.x, 1, car.z); sfx.explosion(); blast(car.x, car.z, 9, car);
  if (car.driver === 'player') { G.p.exitCarForced(); G.p.hp -= 45; }
}
export function blast(x, z, r, src) {
  for (const c of G.cars) if (c !== src && !c.dead) { const d = Math.hypot(c.x - x, c.z - z); if (d < r) damageCar(c, 500 * (1 - d / r)); }
  for (const a of G.actors) if (!a.dead) { const d = Math.hypot(a.x - x, a.z - z); if (d < r) G.hooks.hitActor(a, 120 * (1 - d / r), true); }
  const p = G.p, d = Math.hypot(p.x - x, p.z - z); if (d < r && !p.car) p.hp -= 60 * (1 - d / r);
  G.hooks.crime('explosion');
}
export function stepCar(car, dt) {
  const i = car.input, t = car.type, sn = Math.sin(car.heading), cs = Math.cos(car.heading);
  let vF = car.vx * sn + car.vz * cs, vL = car.vx * cs - car.vz * sn;
  if (car.dead) { i.throttle = 0; i.brake = 0.6; }
  const mx = t.max * (car.kind === 'cop' ? 0.97 : 1);
  if (i.throttle > 0) vF += t.acc * i.throttle * dt * clamp(1 - Math.max(0, vF) / mx, 0.05, 1) * (vF < 0 ? 2 : 1);
  if (i.brake > 0) { if (vF > 0.8) vF -= 32 * i.brake * dt; else vF = Math.max(vF - t.acc * 0.55 * i.brake * dt, -11); }
  if (!i.throttle && !i.brake) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 3.5 * dt);
  vF *= 1 - 0.12 * dt;
  if (i.hand) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 9 * dt);
  const grip = i.hand ? 1.4 : t.grip; vL *= Math.exp(-grip * dt);
  const target = i.steer * t.steer / (1 + Math.abs(vF) * 0.05); car.steerA += (target - car.steerA) * Math.min(1, dt * 9);
  car.heading += car.steerA * vF / (t.len * 0.8) * (i.hand ? 1.5 : 1) * dt; if (car.dead) car.heading += 0;
  const s2 = Math.sin(car.heading), c2 = Math.cos(car.heading);
  car.vx = vF * s2 + vL * c2; car.vz = vF * c2 - vL * s2; car.speed = vF; car.lat = vL;
  car.x += car.vx * dt; car.z += car.vz * dt;
  if ((Math.abs(vL) > 3.2 || (i.hand && Math.abs(vF) > 8)) && Math.abs(vF) > 6) { for (const sg of [-1, 1]) skidMark(car.x - s2 * t.len * 0.32 + c2 * sg * 0.85, car.z - c2 * t.len * 0.32 - s2 * sg * 0.85, car.heading); if (car === G.p.car) car.skidding = true; }
  else car.skidding = false;
  for (const off of [-t.len * 0.32, 0, t.len * 0.32]) {
    const r = resolveCircle(car.x + s2 * off, car.z + c2 * off, t.wid / 2 + 0.15);
    if (r.hit) { car.x += r.dx; car.z += r.dz; const vn = car.vx * r.nx + car.vz * r.nz;
      if (vn < 0) { car.vx -= vn * 1.3 * r.nx; car.vz -= vn * 1.3 * r.nz; if (vn < -4) { if (car.driver === 'player') { G.shake = Math.max(G.shake, Math.min(0.7, -vn / 25)); sfx.crash(-vn); } sparks(car.x + s2 * off, 0.6, car.z + c2 * off); if (car.kind !== 'wreck') damageCar(car, -vn * 6); } } }
  }
  car.hitT = Math.max(0, car.hitT - dt);
  conditionEffects(car, dt);
  if (car.dead) { car.wreckT -= dt; if (Math.random() < dt * 6) smoke(car.x, 1.2, car.z, 0x151515); if (car.wreckT < 0 && car !== G.p.car) removeCar(car); }
  const m = car.mesh; m.position.set(car.x, 0, car.z); m.rotation.y = car.heading; m.rotation.z = clamp(-car.steerA * vF * 0.012, -0.08, 0.08) + (car.dead ? 0.05 : 0);
}
export function carCollisions() {
  const cs = G.cars;
  for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
    const A = cs[a], B = cs[b], dx = B.x - A.x, dz = B.z - A.z; if (Math.abs(dx) > 5.5 || Math.abs(dz) > 5.5) continue;
    // three circles per car along its axis
    let best = null;
    for (const ao of [-1.5, 0, 1.5]) for (const bo of [-1.5, 0, 1.5]) {
      const ax = A.x + Math.sin(A.heading) * ao, az = A.z + Math.cos(A.heading) * ao, bx = B.x + Math.sin(B.heading) * bo, bz = B.z + Math.cos(B.heading) * bo;
      const d = Math.hypot(bx - ax, bz - az); if (d < 1.9 && (!best || d < best.d)) best = { d, nx: (bx - ax) / (d || 1), nz: (bz - az) / (d || 1) };
    }
    if (!best) continue;
    const pen = 1.9 - best.d, wa = A.kind === 'parked' || A.dead ? 0.2 : 1, wb = B.kind === 'parked' || B.dead ? 0.2 : 1, tw = wa + wb;
    A.x -= best.nx * pen * wb / tw; A.z -= best.nz * pen * wb / tw; B.x += best.nx * pen * wa / tw; B.z += best.nz * pen * wa / tw;
    const rv = (B.vx - A.vx) * best.nx + (B.vz - A.vz) * best.nz;
    if (rv < 0) {
      const j = -rv * 1.25; A.vx -= best.nx * j * wb / tw; A.vz -= best.nz * j * wb / tw; B.vx += best.nx * j * wa / tw; B.vz += best.nz * j * wa / tw;
      if (-rv > 3) { const dmg = -rv * 9; sparks((A.x + B.x) / 2, 0.7, (A.z + B.z) / 2, 4); damageCar(A, dmg); damageCar(B, dmg);
        const pl = A === G.p.car ? B : B === G.p.car ? A : null; if (pl) { sfx.crash(-rv); G.shake = Math.max(G.shake, Math.min(0.6, -rv / 25)); if (pl.kind === 'cop') pl.rammed = true; else G.hooks.crime('ram'); }
        if (A.kind === 'traffic') A.kind = 'stalled'; if (B.kind === 'traffic') B.kind = 'stalled'; }
    }
  }
}
// Push a circle (an actor or the player on foot) out of any car body.
export function circlePushCar(x, z, r, car) {
  const sn = Math.sin(car.heading), cs = Math.cos(car.heading), rx = x - car.x, rz = z - car.z, along = clamp(rx * sn + rz * cs, -car.type.len / 2 + 0.6, car.type.len / 2 - 0.6);
  const px = car.x + sn * along, pz = car.z + cs * along, dx = x - px, dz = z - pz, d = Math.hypot(dx, dz), lim = car.type.wid / 2 + r;
  if (d < lim) { const n = d || 1; return { dx: dx / n * (lim - d), dz: dz / n * (lim - d), d }; } return null;
}

// Nico Varela: on-foot movement, shooting, entering/stealing/exiting cars, and driving input.
import { updateNitro } from '../vehicles/nitroBoost.js';
import { updateDriftScore } from '../vehicles/driftScoring.js';
import { G, notify } from '../core/gameState.js';
import { clamp, wrapAngle } from '../core/config.js';
import { rnd } from '../core/random.js';
import { input, down, pressed } from '../core/input.js';
import { buildCharacter, animateWalk, setGun, STYLES } from './characterModel.js';
import { resolveCircle, blockedAt } from '../world/collision.js';
import { circlePushCar } from '../vehicles/carPhysics.js';
import { createActor, scarePeds } from './pedestrianSystem.js';
import { randomStyle } from './characterModel.js';
import { WEAPONS } from '../combat/weapons.js';
import { fire, melee } from '../combat/projectiles.js';
import { throwMolotov } from '../combat/molotov.js';
import { updateWeaponWheel } from '../combat/weaponWheel.js';
import { sfx } from '../audio/soundEngine.js';
import { releaseTrafficCar } from '../vehicles/trafficSystem.js';
import { nearestBoat, enterBoat, exitBoat } from '../vehicles/boats.js';
import { surfaceHeight } from '../world/marina.js';
import { deckHeight } from '../world/causewayDeck.js';

export function createPlayer() {
  const mesh = buildCharacter(STYLES.nico); G.scene.add(mesh);
  const p = G.p = { x: 0, y: 0, z: 0, yaw: 0, hp: 100, armor: 0, car: null, weapon: 1, owned: { 0: true, 1: true }, ammo: { pistol: 60, smg: 0, shotgun: 0, molotov: 0 }, mesh, phase: 0, shootT: 0, aim: false, hidden: false, moving: 0, nearCar: null };
  p.exitCarForced = () => exitCar(true);
  return p;
}
export function nearestCar(p, r = 4.5) {
  let best = null, bd = r; for (const c of G.cars) { if (c.dead || c === p.car) continue; const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd) { bd = d; best = c; } } return best;
}
export function enterCar(car) {
  const p = G.p;
  if (car.driver === 'ai') {
    const o = createActor('ped', car.x + Math.cos(car.heading) * 2.3, car.z - Math.sin(car.heading) * 2.3, randomStyle(rnd)); o.nav = { axis: 'x', line: 0, side: 1, dir: rnd() < 0.5 ? 1 : -1 }; o.scared = 9; o.threat = { x: car.x, z: car.z - 5 };
    if (car.kind === 'traffic' || car.kind === 'cop') G.hooks.crime('steal'); if (car.kind === 'cop') G.hooks.crime('hitcop');
    releaseTrafficCar(car);
  }
  car.kind = 'player'; car.driver = 'player'; car.nav = null; p.car = car; p.hidden = true; p.mesh.visible = false; car.hitT = 0; sfx.click();
  if (car.mission) car.mission = true; if (G.hooks.onEnterCar) G.hooks.onEnterCar(car);
}
export function exitCar(forced) {
  const p = G.p, c = p.car; if (!c) return;
  c.kind = c.dead ? 'wreck' : 'parked'; c.driver = null; c.input.throttle = 0; c.input.brake = 0; c.input.hand = 0; p.car = null; p.hidden = false; p.mesh.visible = true; sfx.horn(false);
  for (const s of [-1, 1]) { const x = c.x - Math.cos(c.heading) * 2.3 * s, z = c.z + Math.sin(c.heading) * 2.3 * s; if (!blockedAt(x, z)) { p.x = x; p.z = z; break; } p.x = c.x; p.z = c.z; }
  p.yaw = c.heading; G.cam.yaw = c.heading + Math.PI; G.cam.pitch = 0.2;
}
export function selectWeapon(i) { const p = G.p; if (p.owned[i]) { p.weapon = i; setGun(p.mesh, i ? WEAPONS[i].id : null); sfx.click(); } }
export function updatePlayer(dt) {
  const p = G.p; p.shootT -= dt;
  updateWeaponWheel(); // while Tab is held the wheel takes the mouse
  for (let i = 0; i < WEAPONS.length; i++) if (pressed(`Digit${i + 1}`)) selectWeapon(i);
  if (input.wheel && !p.car) { let w = p.weapon; for (let k = 0; k < WEAPONS.length; k++) { w = (w + input.wheel + WEAPONS.length) % WEAPONS.length; if (p.owned[w]) break; } selectWeapon(w); }
  if (pressed('KeyF')) { if (p.car?.isBoat) { if (Math.abs(p.car.speed) < 7) exitBoat(); } else if (p.car) { if (Math.abs(p.car.speed) < 9) exitCar(); } else { const c = nearestCar(p), b = nearestBoat(p.x, p.z); if (b && (!c || Math.hypot(b.x - p.x, b.z - p.z) < Math.hypot(c.x - p.x, c.z - p.z))) enterBoat(b); else if (c) enterCar(c); } }
  p.nearCar = p.car ? null : nearestCar(p) || nearestBoat(p.x, p.z);
  if (p.car) drive(dt, p); else foot(dt, p);
  p.armor = Math.max(0, p.armor);
}
function drive(dt, p) {
  const c = p.car, i = c.input;
  i.throttle = down('KeyW') || down('ArrowUp') ? 1 : 0; i.brake = down('KeyS') || down('ArrowDown') ? 1 : 0; i.hand = down('Space') ? 1 : 0;
  i.steer = (down('KeyD') || down('ArrowRight') ? 1 : 0) - (down('KeyA') || down('ArrowLeft') ? 1 : 0);
  sfx.horn(down('KeyH')); if (down('KeyH')) scarePeds(c.x, c.z, 14);
  updateNitro(c, dt, down('ShiftLeft') || down('ShiftRight') || down('KeyN')); updateDriftScore(c, dt);
  p.x = c.x; p.z = c.z; p.yaw = c.heading; p.moving = 0;
  if (c.driver !== 'player') c.driver = 'player';
}
function foot(dt, p) {
  const sens = 0.0024 * G.settings.sens, cam = G.cam;
  cam.yaw -= input.dx * sens + ((down('ArrowLeft') ? 1 : 0) - (down('ArrowRight') ? 1 : 0)) * -0 ; cam.pitch = clamp(cam.pitch + input.dy * sens, -0.5, 0.9);
  if (down('ArrowLeft')) cam.yaw += 1.8 * dt; if (down('ArrowRight')) cam.yaw -= 1.8 * dt;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -fz, rz = fx;
  let mx = 0, mz = 0; const f = (down('KeyW') ? 1 : 0) - (down('KeyS') ? 1 : 0), s = (down('KeyD') ? 1 : 0) - (down('KeyA') ? 1 : 0);
  mx = fx * f + rx * s; mz = fz * f + rz * s; const l = Math.hypot(mx, mz);
  const aim = input.right || (input.left && p.weapon > 0); p.aim = aim;
  const sp = (down('ShiftLeft') ? 8.2 : 4.6) * (aim ? 0.6 : 1);
  if (l > 0.01) { mx /= l; mz /= l; p.x += mx * sp * dt; p.z += mz * sp * dt; p.moving = sp; if (!aim) p.yaw += wrapAngle(Math.atan2(mx, mz) - p.yaw) * Math.min(1, dt * 14); } else p.moving = 0;
  if (aim) p.yaw += wrapAngle(cam.yaw - p.yaw) * Math.min(1, dt * 18);
  const r = resolveCircle(p.x, p.z, 0.45); if (r.hit) { p.x += r.dx; p.z += r.dz; }
  for (const c of G.cars) { if (Math.abs(c.x - p.x) > 4 || Math.abs(c.z - p.z) > 4) continue; const q = circlePushCar(p.x, p.z, 0.45, c); if (q) { p.x += q.dx; p.z += q.dz; if (Math.abs(c.speed) > 7 && c.kind !== 'parked') { p.hp -= Math.abs(c.speed) * 1.2; } } }
  p.phase += dt * (p.moving ? p.moving * 1.4 : 0); animateWalk(p.mesh, p.phase, p.moving ? 0.8 : 0, aim && p.weapon > 0);
  setGun(p.mesh, p.weapon ? WEAPONS[p.weapon].id : null);
  p.y = Math.max(surfaceHeight(p.x, p.z), deckHeight(p.x, p.z)); p.mesh.position.set(p.x, p.y, p.z); p.mesh.rotation.y = p.yaw;
  const w = WEAPONS[p.weapon];
  // leftPressed survives until a simulation step reads it, so a quick click between slow frames still fires.
  if ((input.left || input.leftPressed) && p.shootT <= 0 && (w.auto || input.leftPressed || p.weapon === 0) && G.mode === 'play') {
    if (p.weapon === 0) { melee(p); p.shootT = w.rate; }
    else if (w.thrown) { if (p.ammo[w.id] > 0 && input.leftPressed) { p.ammo[w.id]--; p.shootT = w.rate; throwMolotov(p); } else if (input.leftPressed) notify('OUT OF MOLOTOVS', 'bad'); }
    else if (p.ammo[w.id] > 0) { shoot(p, w); }
    else if (input.leftPressed) { notify('OUT OF AMMO', 'bad'); }
  }
}
export function shoot(p, w) {
  p.ammo[w.id]--; p.shootT = w.rate; const cam = G.camera, d = new cam.position.constructor(); cam.getWorldDirection(d);
  const sn = Math.sin(p.yaw), cs = Math.cos(p.yaw), mz = { x: p.x + sn * 0.9 - cs * 0.3, y: 1.3, z: p.z + cs * 0.9 + sn * 0.3 };
  fire('player', w, cam.position.x + d.x * 3.2, cam.position.y + d.y * 3.2, cam.position.z + d.z * 3.2, d.x, d.y, d.z, mz);
  // Witnessed gunfire is a real crime: people nearby raise the heat, an officer in earshot calls it in at once.
  const near = (k, r) => G.actors.some((a) => a.kind === k && !a.dead && Math.hypot(a.x - p.x, a.z - p.z) < r) || (k === 'cop' && G.cars.some((c) => c.kind === 'cop' && !c.dead && Math.hypot(c.x - p.x, c.z - p.z) < r));
  G.hooks.crime(near('cop', 60) ? 'shotsCop' : near('ped', 45) ? 'shotsSeen' : 'shots'); scarePeds(p.x, p.z, 45); G.shake = Math.max(G.shake, w.id === 'shotgun' ? 0.35 : 0.1);
}

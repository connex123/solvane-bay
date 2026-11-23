// Shared staging helpers for the ?shot= scenes: clear the streets, set the story state, place cars, cops, people and
// AIR-1 at exact spots with the game's own constructors, frame the camera and render the final frame with the full HUD.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { createCar, removeCar } from '../vehicles/carPhysics.js';
import { placeTraffic } from '../vehicles/trafficSystem.js';
import { createActor, removeActor } from '../characters/pedestrianSystem.js';
import { animateWalk, randomStyle, setGun } from '../characters/characterModel.js';
import { spawnCop } from '../police/policeDispatch.js';
import { createHeli, placeCone } from '../police/helicopterUnit.js';
import { MISSIONS } from '../missions/storyMissions.js';
import { dlg } from '../story/dialogue.js';
import { rnd } from '../core/random.js';

// Empty the streets of the boot-time traffic and pedestrians so every scene starts from a known state.
export function clearStreets() {
  for (const c of G.cars.slice()) if (c.kind === 'traffic' || c.kind === 'parked') removeCar(c);
  for (const a of G.actors.slice()) removeActor(a);
}
// Story and player state for a scene: clock, cash, rep, chapters done, health, weapons.
export function setScene({ clock, money, xp, completed, hp = 100, armor = 0, weapon = 1, owned, ammo, crew, magic = 1, blaze }) {
  const p = G.p; clearStreets(); G.mode = 'play'; G.clock = clock; G.magicForce = magic; G.blazeForce = blaze; G.time = 30; G.money = money; G.xp = xp; G.radio = 1; G.radioShowT = 0;
  G.completed = completed; G.territory = null; G.crew = crew || { cd: {}, swaps: 1 }; G.shotCrisp = true; G.settings.hudCompact = false; document.getElementById('hud').classList.remove('hidden');
  p.hp = hp; p.armor = armor; p.weapon = weapon; p.owned = owned || { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }; p.ammo = ammo || { pistol: 84, smg: 210, shotgun: 24, molotov: 3 };
}
// A mission in progress at a given stage, with the stage's own objective text (or a replacement).
export function setMission(idx, stageIdx, text) {
  const def = MISSIONS[idx]; G.mission = { def, idx: stageIdx, stage: def.stages[stageIdx], timer: 0, total: def.stages.length, text: text || def.stages[stageIdx].text, enemies: [], car: null, collected: 0 };
}
const sync = (c) => { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; for (const w of c.mesh.userData.fw || []) w.rotation.y = (c.steerA || 0) * 0.9; return c; };
const moving = (c, speed) => { c.vx = Math.sin(c.heading) * speed; c.vz = Math.cos(c.heading) * speed; c.speed = speed; return c; };
// Any car at an exact spot (heading 0 faces +z, PI faces north/-z).
export function carAt(key, x, z, heading, { kind = 'parked', tint, speed = 0, steer = 0 } = {}) {
  const c = createCar(key, x, z, heading, kind, tint); c.steerA = steer; moving(c, speed); return sync(c);
}
// An SBPD cruiser from the real dispatcher (light bar, callsign), in a given pursuit state.
export function copAt(x, z, heading, { speed = 0, ai = 'PURSUIT', steer = 0 } = {}) {
  const c = spawnCop(x, z, heading, ai); c.steerA = steer; moving(c, speed); return sync(c);
}
// Civilian traffic in its lane on a road line (axis 'x' runs east-west, 'z' north-south; dir +1/-1 along the axis).
export function trafficAt(axis, line, along, dir, key, tint, speed = 11) {
  const c = placeTraffic(axis, line, along, dir, key, 'traffic', tint); c.nav.spd = speed; moving(c, speed); return sync(c);
}
// A person at a spot, facing yaw, mid-stride (walk phase), optionally running scared or holding a gun.
export function personAt(kind, x, z, yaw, { style, phase = rnd() * 6, stride = 0.5, run = false, gun, aim = false } = {}) {
  const a = createActor(kind, x, z, style || randomStyle(rnd)); a.yaw = yaw; if (run) a.scared = 6;
  if (gun) setGun(a.mesh, gun); animateWalk(a.mesh, phase, run ? 0.95 : stride, aim); a.mesh.position.set(x, 0, z); a.mesh.rotation.y = yaw; return a;
}
// A line of strollers along a sidewalk strip from (x0,z0) to (x1,z1), some walking each way, spread with jitter.
export function strollers(x0, z0, x1, z1, n, { jitter = 1.2, run = 0 } = {}) {
  const out = [], dx = x1 - x0, dz = z1 - z0, yaw = Math.atan2(dx, dz);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5 + (rnd() - 0.5) * 0.6) / n, back = rnd() < 0.5, sx = (rnd() - 0.5) * jitter, x = x0 + dx * t + Math.cos(yaw) * sx, z = z0 + dz * t - Math.sin(yaw) * sx;
    out.push(personAt('ped', x, z, back ? yaw + Math.PI : yaw, { phase: i * 1.7, run: rnd() < run }));
  }
  return out;
}
// AIR-1 hovering at a point, nose yaw and bank, its searchlight pool on a ground target.
export function heliAt(x, y, z, yaw, target, { pitch = 0.08, bank = 0.06 } = {}) {
  const h = createHeli(x, z); h.y = y; h.mesh.position.set(x, y, z); h.mesh.rotation.order = 'YXZ'; h.mesh.rotation.set(pitch, yaw, bank); h.rotor.rotation.y = 0.5;
  G.heli = h; G.shotLock = true; placeCone(h, target[0], target[1]); return h;
}
// The camera for the frame.
export function frame(pos, look, fov, roll = 0) { G.shotCam = { pos, look, fov, roll }; }
// A warm or cool point light to lift a subject out of shadow.
export function lamp(color, intensity, dist, x, y, z) { const l = new THREE.PointLight(color, intensity, dist, 1.4); l.position.set(x, y, z); G.scene.add(l); return l; }
// Finish a dialogue line instantly (no typewriter mid-word in a still frame).
export function lineTyped() { dlg.t = 99; }
// Render the final frames with the HUD (the last one is what the screenshot captures).
export function renderShot(api, frames = 2) {
  const gl = G.renderer.getContext();
  for (let i = 0; i < frames; i++) { G.hudRate = 1; api.updateHud(0.016); api.renderFrame(true); gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); }
  if (location.search.includes('nohud')) document.getElementById('hud').style.display = 'none';
}
// Hide the palms inside a bearing window seen from (cx, cz) so they frame a landmark instead of covering it.
export function thinPalms(cx, cz, b0, b1, minD) {
  const pp = G.palmProps; if (!pp) return; const m = new THREE.Matrix4().makeScale(0, 0, 0);
  pp.list.forEach((it, i) => { const dx = it.x - cx, dz = it.z - cz, b = Math.atan2(dx, -dz) * 180 / Math.PI; if (b > b0 && b < b1 && Math.hypot(dx, dz) > minD) pp.mesh.setMatrixAt(i, m); });
  pp.mesh.instanceMatrix.needsUpdate = true;
}
// Hide the palms within r metres of the camera so no frond fills the lens.
export function clearPalmsNear(cx, cz, r) {
  const pp = G.palmProps; if (!pp) return; const m = new THREE.Matrix4().makeScale(0, 0, 0);
  pp.list.forEach((it, i) => { if (Math.hypot(it.x - cx, it.z - cz) < r) pp.mesh.setMatrixAt(i, m); }); pp.mesh.instanceMatrix.needsUpdate = true;
}

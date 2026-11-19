// Deterministic staged scenes for ?shot=<name>, built from the real world, HUD and entities.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { LANE, lineCoord, HALF, N } from '../core/config.js';
import { createCar, wreck } from '../vehicles/carPhysics.js';
import { placeTraffic } from '../vehicles/trafficSystem.js';
import { enterCar, selectWeapon } from '../characters/playerController.js';
import { spawnPed, createActor } from '../characters/pedestrianSystem.js';
import { STYLES, setGun, animateWalk, randomStyle } from '../characters/characterModel.js';
import { spawnCop } from '../police/policeDispatch.js';
import { createHeli, placeCone } from '../police/helicopterUnit.js';
import { setStars } from '../police/wantedSystem.js';
import { MISSIONS, corner } from '../missions/storyMissions.js';
import { refreshStartMarker } from '../missions/missionRunner.js';
import { dlg, say } from '../story/dialogue.js';
import { muzzleFlash, tracer, sparks, smoke, particle, updateSirens, floatText, layoutFloaters, skidMark, updateEffects, explosion } from '../combat/effects.js';
import { rig } from '../camera/cameraRig.js';
import { removeCar } from '../vehicles/carPhysics.js';
import { removeActor } from '../characters/pedestrianSystem.js';
import { seedSave } from '../save/saveGame.js';
import { addMarker } from '../missions/markers.js';
import { rnd } from '../core/random.js';
import { createSpikeStrip } from '../police/spikeStrip.js';
import { updateLineOfSight } from '../police/lineOfSight.js';
import { popup } from '../vehicles/driftScoring.js';

function clearTraffic() { for (const c of G.cars.slice()) if (c.kind === 'traffic' || c.kind === 'parked') removeCar(c); for (const a of G.actors.slice()) removeActor(a); }
function fakeMission(idx, stageIdx, text, timer) {
  const def = MISSIONS[idx]; G.mission = { def, idx: stageIdx, stage: def.stages[stageIdx], timer, total: def.stages.length, text, enemies: [], car: null, collected: 0 };
}
function finish(api, frames = 2) { G.hudRate = 1; const gl0 = G.renderer.getContext();  for (let i = 0; i < frames; i++) { G.hudRate = 1; api.updateHud(0.016); api.renderFrame(true); gl0.finish(); gl0.readPixels(0, 0, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, new Uint8Array(4)); } { const px = new Uint8Array(4); gl0.readPixels(640, 700, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, px); const p2 = new Uint8Array(4); gl0.readPixels(640, 100, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, p2); document.body.dataset.px = px.join(',') + '/' + p2.join(','); } { const c = G.renderer.domElement, r = c.getBoundingClientRect(); document.body.dataset.sz = [c.width, c.height, r.x, r.y, r.width, r.height, innerWidth, innerHeight, devicePixelRatio, getComputedStyle(c).display, getComputedStyle(c).visibility].join(','); } document.body.dataset.cam = [G.camera.position.x, G.camera.position.y, G.camera.position.z, G.p.x, G.p.z, G.camera.fov].map((v) => v.toFixed(1)).join(',') + ' lost=' + G.renderer.getContext().isContextLost() + ' err=' + G.renderer.getContext().getError() + ' calls=' + G.renderer.info.render.calls + ' tris=' + G.renderer.info.render.triangles; if (location.search.includes('overlay')) api.showScreen('pause'); if (location.search.includes('nohud')) document.getElementById('hud').style.display = 'none'; }
function typed() { dlg.t = 99; }

// Cover: the VELOCE GT drifts sideways on nitro down the palm boulevard toward the sea and the sun, an SBPD cruiser
// ramming its rear quarter, two more chasing, a roadblock with a spike strip ahead and AIR-1's spotlight on the car.
function chase(api) {
  const p = G.p, z0 = lineCoord(3), zc = z0 + LANE, x0 = -8; clearTraffic(); G.mode = 'play'; G.clock = 17.45; G.money = 48250; G.xp = 760; G.radio = 1; api.showHud(true);
  const car = createCar('veloce', x0, zc, Math.PI / 2 + 0.55, 'parked', 0xd01020); enterCar(car); car.vx = 38; car.vz = -1.5; car.speed = 38; car.steerA = -0.5; car.input.throttle = 1;
  car.hp = car.maxHp * 0.68; car.nitro = 0.62; car.boosting = true; p.x = car.x; p.z = car.z; p.hp = 86; p.armor = 60; p.weapon = 2; p.owned = { 0: 1, 1: 1, 2: 1, 3: 1 }; p.ammo = { pistol: 84, smg: 210, shotgun: 24 };
  const cop = (x, z, h, v, ai) => { const c = spawnCop(x, z, h, ai); c.vx = Math.sin(h) * v; c.vz = Math.cos(h) * v; c.speed = v; c.ai = ai; c.heading = h; return c; };
  cop(x0 - 2.9, zc + 2.3, Math.PI / 2 + 0.38, 39, 'RAMMING'); cop(x0 + 0.5, zc - 5.4, Math.PI / 2 + 0.22, 37, 'PURSUIT'); cop(x0 - 16, zc + 0.6, Math.PI / 2 + 0.1, 36, 'PURSUIT');
  const rb = [cop(x0 + 33, z0 + 3.4, 0.32, 0, 'ROADBLOCK'), cop(x0 + 35, z0 - 3.2, -0.28, 0, 'ROADBLOCK')]; rb.forEach((c) => { c.rbT = 40; });
  createSpikeStrip(x0 + 27, z0, 0, 11);
  const tc = (key, x, dir, col, spd = 11) => { const c = placeTraffic('x', 3, x, dir, key, 'traffic', col); c.nav.spd = spd; return c; };
  tc('marlin', x0 + 3, -1, 0x2f7fd8, 14); tc('cadia', 58, -1, 0x2fb89a); tc('rumble', 92, -1, 0x8fd3c8); tc('pico', 120, 1, 0xff8a3d); tc('tupelo', 140, -1, 0xf6c21c); tc('hawke', 112, -1, 0xe9c46a); tc('pico', 76, -1, 0xc3a6e0);
  [[12, -1, -1], [26, -1, 1], [42, -1, -1], [6, 1, 1], [20, 1, -1], [40, 1, 1], [58, -1, -1], [-4, 1, -1], [76, 1, -1], [-2, -1, 1], [64, 1, 1], [2, 1, 1], [9, -1, -1], [15, 1, -1], [30, 1, 1], [48, 1, -1], [34, -1, 1]].forEach(([x, s, d], i) => { const a = spawnPed('x', 3, x, s, d); if (i % 2 === 0) { a.scared = 6; a.nav.dir = d; } animateWalk(a.mesh, i * 1.3, i % 2 ? 0.6 : 0.95, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  G.heli = createHeli(x0 + 30, zc + 1); G.heli.y = 15; G.heli.mesh.position.set(G.heli.x, 15, G.heli.z); G.heli.mesh.rotation.set(0.12, -Math.PI / 2 - 0.6, -0.16); G.heli.rotor.rotation.y = 0.7; placeCone(G.heli, car.x, car.z); G.shotLock = true;
  addMarker({ x: 150, z: zc, kind: 'obj', label: 'Safehouse', color: 0xffd23c, auto: false }); setStars(4); G.wanted.heat = 4.3; fakeMission(5, 3, 'Escape the SBPD, then reach the Alder Hills safehouse', 87);
  for (const c of G.cars) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; for (const w of c.mesh.userData.fw || []) w.rotation.y = c.steerA * 0.9; }
  updateSirens(0.1); updateLineOfSight(1);
  // the drift so far: an arc of twin skid marks behind the rear wheels, and tyre smoke rolling off them
  for (let k = 0; k < 60; k++) { const u = k / 60, x = x0 - 2 - u * 30, z = zc - 0.4 + u * u * 4.5, h = Math.PI / 2 + 0.44 * (1 - u) - 0.2 * u; for (const sg of [-1, 1]) skidMark(x + Math.cos(h) * sg * 0.85, z - Math.sin(h) * sg * 0.85, h); }
  const sn = Math.sin(car.heading), cs = Math.cos(car.heading), rx = car.x - sn * 1.45, rz = car.z - cs * 1.45;
  for (let k = 0; k < 14; k++) { const back = k * 0.3, sg = k % 2 ? 1 : -1; particle({ x: rx - back * 0.7 + sg * 0.4, y: 0.4 + k * 0.08, z: rz + 0.6 + back * 0.9 + sg * 0.5, life: 1.4, size: 1.0 + k * 0.22, color: 0xfff0f6, op: 0.6 - k * 0.03 }); }
  for (let k = 0; k < 6; k++) particle({ x: car.x - sn * 2.55 - k * 0.35, y: 0.33, z: car.z - cs * 2.55, life: 0.3, size: 0.8 - k * 0.08, color: 0x7fc8ff, add: true });
  // the ram: sparks where the cruiser's push bar meets the rear quarter
  const hx = x0 - 1.2, hz = zc + 1.0; sparks(hx, 0.7, hz, 34); sparks(hx, 0.55, hz, 18); particle({ x: hx, y: 0.75, z: hz, life: 1, size: 3, color: 0xffc070, add: true });
  G.money = 48000; api.updateHud(0.016); popup('DRIFT x3', 150, 'drift'); popup('NEAR MISS', 100, 'near');
  G.exposure = 1.12; G.shotCam = { pos: [x0 - 8.2, 2.85, zc - 2.0], look: [x0 + 40, 0.9, zc + 5], fov: 56, roll: 0.03 };
  const rim = new THREE.PointLight(0xffe0c0, 60, 14, 1.6); rim.position.set(car.x - 3.5, 3.2, car.z - 2.5); G.scene.add(rim);
  finish(api); }
// Daylight firefight on the Palmetto Beach road: Nico fires on SBPD officers behind their cruiser while a car they hit
// goes up in a fireball; beachgoers flee across the sand, the sea and the palms on the right.
function onfoot(api) {
  const p = G.p, X = HALF; clearTraffic(); G.mode = 'play'; G.clock = 16.2; G.magicForce = 0.5; G.time = 0.1; G.money = 3240; G.xp = 720; G.radio = 2; api.showHud(true); rig.mode = 'auto';
  p.owned = { 0: 1, 1: 1, 2: 1, 3: 1 }; p.ammo = { pistol: 60, smg: 118, shotgun: 16 }; p.hp = 72; p.armor = 45; G.camDistAim = 4.4; p.x = X - 1.2; p.z = 46; p.yaw = Math.PI + 0.12; p.aim = true; selectWeapon(2); G.cam.yaw = Math.PI - 0.22; G.cam.pitch = 0.1;
  animateWalk(p.mesh, 0.6, 0.0, true); p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; setGun(p.mesh, 'smg');
  // the SBPD cruiser slewed across the road, officers firing over and beside it
  const cr = spawnCop(X - 1.5, 27, Math.PI / 2 + 0.25, 'PURSUIT'); cr.speed = 0; cr.vx = cr.vz = 0; cr.deployed = true;
  const cr2 = spawnCop(X + 4.2, 19, Math.PI - 0.5, 'PURSUIT'); cr2.speed = 0; cr2.deployed = true;
  const cops = [[X - 3.6, 25.2], [X + 1.2, 25.0], [X + 3.4, 23.2]].map(([x, z], i) => { const a = createActor('cop', x, z, STYLES.cop, { yaw: 0 }); animateWalk(a.mesh, i * 2, 0.5, true); setGun(a.mesh, 'pistol'); a.mesh.position.set(x, 0, z); a.mesh.rotation.y = Math.atan2(p.x - x, p.z - z) + (i - 1) * 0.08; return a; });
  // the car that caught the stray rounds: a real wreck (burnt shell, fireball, blast) on the kerb behind the line
  const boom = createCar('rumble', X + 5.6, 35, -0.6, 'parked', 0xff8a3d); boom.mesh.position.set(boom.x, 0, boom.z); boom.mesh.rotation.y = boom.heading;
  const tc = (key, z, dir, col) => { const c = placeTraffic('z', N, z, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; c.nav.spd = 0; return c; };
  tc('tupelo', -30, 1, 0xf6c21c); tc('pico', -60, -1, 0xff4fd8); tc('marlin', 70, -1, 0x2f7fd8);
  [[40, 1, 1], [34, 1, 1], [30, -1, 1], [52, 1, 1], [20, 1, -1], [58, -1, 1], [44, -1, 1], [14, -1, -1], [62, 1, 1]].forEach(([z, s, d], i) => { const a = spawnPed('z', N, z, s, d); a.scared = 6; a.nav.dir = d; animateWalk(a.mesh, i * 1.7, 0.95, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  for (const [x, z, yw] of [[X + 14, 38, 0.6], [X + 18, 30, -0.4], [X + 22, 44, 0.9], [X + 12, 22, 0.2], [X + 26, 36, -0.8]]) { const a = createActor('ped', x, z, randomStyle(rnd), { yaw: yw }); a.scared = 6; animateWalk(a.mesh, x * 0.7, 0.95, false); a.mesh.position.set(x, 0, z); a.mesh.rotation.y = yw; }
  setStars(3); G.wanted.heat = 3.4; fakeMission(2, 1, 'Take out the Coral Kings (2 left)', 0); G.mission.def = { ...G.mission.def };
  for (const c of G.cars) { c.mesh.position.set(c.x, c.mesh.position.y, c.z); c.mesh.rotation.y = c.heading; }
  wreck(boom); layoutFloaters(5); for (let k = 0; k < 4; k++) updateEffects(0.04); explosion(boom.x, 1.0, boom.z); for (let k = 0; k < 3; k++) updateEffects(0.04);
  setStars(3); G.wanted.heat = 3.4; fakeMission(2, 1, 'Take out the Coral Kings (2 left)', 0); G.toasts.length = 0;
  for (const a of cops) { a.dead = false; a.hp = Math.max(a.hp || 0, 40); }
  G.cars.forEach((c) => { if (c !== boom) { c.dead = false; c.hp = Math.max(c.hp, 400); } });
  updateSirens(0.1); updateLineOfSight(1);
  const gx = p.x + Math.sin(p.yaw) * 1.1, gz = p.z + Math.cos(p.yaw) * 1.1; muzzleFlash(gx, 1.38, gz);
  cops.forEach((c, i) => { const fx = c.x + Math.sin(c.mesh.rotation.y) * 0.7, fz = c.z + Math.cos(c.mesh.rotation.y) * 0.7; muzzleFlash(fx, 1.38, fz); tracer(fx, 1.38, fz, p.x + 0.3 - i * 0.3, 1.2 + i * 0.2, p.z - 0.4); });
  tracer(gx, 1.38, gz, cops[0].x, 1.3, cops[0].z); sparks(cops[0].x, 1.3, cops[0].z, 6); tracer(gx, 1.38, gz, cops[1].x, 1.2, cops[1].z); sparks(cr.x + 0.5, 0.9, cr.z + 0.9, 10);
  G.shake = 0; G.toasts.push({ text: 'WANTED LEVEL 3', kind: 'wanted', t: 9 });
  G.exposure = 1.18; if (G.post) Object.assign(G.post.params, { bloom: 0.5, threshold: 1.05 });
  rig.mode = 'auto'; finish(api);
  floatText(cops[0].x, 1.5, cops[0].z, '-34', 'hit'); floatText(cops[1].x, 1.5, cops[1].z, '-18', 'hit'); layoutFloaters(0); }
function map(api) {
  const p = G.p; seedSave(({ v: 1, money: 3240, xp: 520, completed: ['m1', 'm2'], packages: [0, 3, 5, 9, 11], owned: {}, ammo: {}, clock: 17.6, play: 4320, place: 'Neon Row', at: '2026-11-18 17:35' })); clearTraffic(); G.mode = 'pause'; G.clock = 17.6; G.completed = ['m1', 'm2']; G.xp = 520; G.money = 9150; G.packages = [0, 3, 5, 9, 11]; p.x = 118; p.z = lineCoord(6) + 1.5; p.yaw = -Math.PI / 2;
  refreshStartMarker(); G.markers.forEach((m) => { m.mesh.visible = false; }); G.wanted.stars = 0; api.showHud(false); rig.mode = 'auto'; api.renderFrame(); api.showScreen('cityMap'); finish(api, 1); }
// Key art: low angle on the beach road at golden hour, the VELOCE GT and Nico in front, palms, skyline and marina behind.
function title(api) {
  clearTraffic(); seedSave({ v: 1, money: 3240, xp: 520, completed: ['m1', 'm2'], packages: [0, 1, 2, 3, 4, 5, 6, 7], owned: {}, ammo: {}, clock: 17.6, play: 4320, place: 'Palmetto Beach', at: '2026-11-18 17:35' });
  G.mode = 'title'; G.clock = 16.7; G.exposure = 1.45; G.time = 30; rig.mode = 'aerial'; G.wanted.stars = 0;
  const car = createCar('veloce', HALF - 3.4, 62.6, 0.35, 'parked', 0xd01020); car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  const p = G.p; p.x = HALF - 0.3; p.z = 66.2; p.yaw = 0.2; p.mesh.visible = true; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animateWalk(p.mesh, 0, 0, false);
  const tc = (key, z, dir, col) => { const c = placeTraffic('z', N, z, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; return c; };
  tc('tupelo', -10, 1, 0xf6c21c); tc('rumble', -60, -1, 0x8fd3c8); tc('pico', -120, 1, 0xff8a3d); tc('hawke', 6, -1, 0xf0f0f0);
  [[-4, 1, 1], [-22, 1, -1], [-40, -1, 1], [16, 1, 1], [-70, -1, -1]].forEach(([z, sd, d], i) => { const a = spawnPed('z', N, z, sd, d); animateWalk(a.mesh, i * 1.3, 0.6, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  // sunlit foreground: a warm low key from the sea side washes the near asphalt and kerb in late sun
  const key = new THREE.SpotLight(0xffc27e, 1400, 90, 0.5, 0.7, 1.6); key.position.set(HALF + 18, 16, 98); key.target.position.set(HALF - 9, 0, 70); G.scene.add(key, key.target);
  if (G.roadMat) G.roadMat.color.setRGB(1.45, 1.22, 1.0); if (G.post) G.post.params.vignette = 0.3;
  G.titleCam = { x: HALF - 2.2, y: 1.35, z: 71.5, tx: HALF - 6, ty: 3.4, tz: 30 };
  api.showHud(false); api.showScreen('title'); finish(api, 2); }

export async function runShot(name, api) {
  G.shot = name; ({ '1-chase': chase, '2-onfoot': onfoot, '3-map': map, '4-title': title }[name] || title)(api);
  if (name !== '3-map') {
    const c = G.renderer.domElement, img = new Image(); img.id = 'shotImg'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:0';
    img.src = c.toDataURL('image/jpeg', 0.93); await img.decode(); c.style.display = 'none'; document.body.insertBefore(img, document.getElementById('hud'));
  }
  document.title = 'SHOT_READY';
}

// Deterministic staged scenes for ?shot=<name>, built from the real world, HUD and entities.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { LANE, lineCoord, HALF, N } from '../core/config.js';
import { createCar } from '../vehicles/carPhysics.js';
import { placeTraffic } from '../vehicles/trafficSystem.js';
import { enterCar, selectWeapon } from '../characters/playerController.js';
import { spawnPed, createActor } from '../characters/pedestrianSystem.js';
import { STYLES, setGun, animateWalk } from '../characters/characterModel.js';
import { spawnCop } from '../police/policeDispatch.js';
import { createHeli, placeCone } from '../police/helicopterUnit.js';
import { setStars } from '../police/wantedSystem.js';
import { MISSIONS, corner } from '../missions/storyMissions.js';
import { refreshStartMarker } from '../missions/missionRunner.js';
import { dlg, say } from '../story/dialogue.js';
import { muzzleFlash, tracer, sparks, smoke, particle, updateSirens, floatText, layoutFloaters } from '../combat/effects.js';
import { rig } from '../camera/cameraRig.js';
import { removeCar } from '../vehicles/carPhysics.js';
import { removeActor } from '../characters/pedestrianSystem.js';
import { seedSave } from '../save/saveGame.js';
import { addMarker } from '../missions/markers.js';

function clearTraffic() { for (const c of G.cars.slice()) if (c.kind === 'traffic' || c.kind === 'parked') removeCar(c); for (const a of G.actors.slice()) removeActor(a); }
function fakeMission(idx, stageIdx, text, timer) {
  const def = MISSIONS[idx]; G.mission = { def, idx: stageIdx, stage: def.stages[stageIdx], timer, total: def.stages.length, text, enemies: [], car: null, collected: 0 };
}
function finish(api, frames = 2) { G.hudRate = 1; const gl0 = G.renderer.getContext();  for (let i = 0; i < frames; i++) { api.updateHud(0.016); api.renderFrame(true); gl0.finish(); gl0.readPixels(0, 0, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, new Uint8Array(4)); } { const px = new Uint8Array(4); gl0.readPixels(640, 700, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, px); const p2 = new Uint8Array(4); gl0.readPixels(640, 100, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, p2); document.body.dataset.px = px.join(',') + '/' + p2.join(','); } { const c = G.renderer.domElement, r = c.getBoundingClientRect(); document.body.dataset.sz = [c.width, c.height, r.x, r.y, r.width, r.height, innerWidth, innerHeight, devicePixelRatio, getComputedStyle(c).display, getComputedStyle(c).visibility].join(','); } document.body.dataset.cam = [G.camera.position.x, G.camera.position.y, G.camera.position.z, G.p.x, G.p.z, G.camera.fov].map((v) => v.toFixed(1)).join(',') + ' lost=' + G.renderer.getContext().isContextLost() + ' err=' + G.renderer.getContext().getError() + ' calls=' + G.renderer.info.render.calls + ' tris=' + G.renderer.info.render.triangles; if (location.search.includes('overlay')) api.showScreen('pause'); if (location.search.includes('nohud')) document.getElementById('hud').style.display = 'none'; }
function typed() { dlg.t = 99; }

// Cover: eastbound down the palm boulevard toward the sea and the setting sun, three SBPD cruisers closing in.
function chase(api) {
  const p = G.p, z0 = lineCoord(3); clearTraffic(); G.mode = 'play'; G.clock = 17.45; G.money = 48250; G.xp = 520; G.radio = 1; api.showHud(true);
  const car = createCar('veloce', -8, z0 + LANE, Math.PI / 2, 'parked', 0xd01020); enterCar(car); car.speed = 41.5; car.vx = 41.5; car.vz = 0; car.input.throttle = 1; p.x = car.x; p.z = car.z; p.hp = 86; p.armor = 60; p.weapon = 2; p.owned = { 0: 1, 1: 1, 2: 1, 3: 1 }; p.ammo = { pistol: 84, smg: 210, shotgun: 24 };
  const cop = (x, z, h, vx, ai) => { const c = spawnCop(x, z, h, ai); c.vx = vx; c.speed = Math.abs(vx); c.ai = ai; c.heading = h; return c; };
  cop(-8.9, z0 + LANE - 2.25, Math.PI / 2 + 0.1, 40.5, 'RAMMING'); cop(-7.4, z0 + LANE + 3.1, Math.PI / 2 - 0.12, 40, 'PURSUIT'); cop(16, z0 - 1.2, -Math.PI / 2 + 0.35, 30, 'PURSUIT');
  cop(64, z0 - LANE, -Math.PI / 2, 26, 'ARRIVING'); cop(104, z0 - LANE - 0.2, -Math.PI / 2, 24, 'ARRIVING');
  const tc = (key, x, dir, col) => { const c = placeTraffic('x', 3, x, dir, key, 'traffic', col); c.nav.spd = 11; return c; };
  tc('hawke', 30, 1, 0x222831); tc('tupelo', 82, 1, 0xf6c21c); tc('marlin', 24, -1, 0x2f7fd8); tc('cadia', 58, -1, 0x2fb89a); tc('rumble', 8, -1, 0x8fd3c8); tc('pico', 46, 1, 0xff8a3d); tc('marlin', 120, -1, 0xf0f0f0); tc('hawke', 36, -1, 0xe9c46a); tc('pico', 72, -1, 0xc3a6e0); tc('tupelo', 96, -1, 0xf6c21c);
  [[12, -1, -1], [26, -1, 1], [42, -1, -1], [6, 1, 1], [20, 1, -1], [40, 1, 1], [58, -1, -1], [-4, 1, -1], [76, 1, -1], [-2, -1, 1], [64, 1, 1], [2, 1, 1], [9, -1, -1], [15, 1, -1], [30, 1, 1]].forEach(([x, s, d], i) => { const a = spawnPed('x', 3, x, s, d); if (i % 3 === 0) { a.scared = 6; a.nav.dir = d; } animateWalk(a.mesh, i * 1.3, 0.6, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  G.heli = createHeli(40, z0 - 7); G.heli.y = 18; G.heli.mesh.position.set(G.heli.x, 18, G.heli.z); G.heli.mesh.rotation.set(0.1, -Math.PI / 2 - 0.4, -0.14); G.heli.rotor.rotation.y = 0.7; placeCone(G.heli, car.x + 1, car.z); G.shotLock = true;
  addMarker({ x: 150, z: z0 + LANE, kind: 'obj', label: 'Safehouse', color: 0xffd23c, auto: false }); setStars(4); G.wanted.heat = 4.3; fakeMission(5, 3, 'Escape the SBPD, then reach the Alder Hills safehouse', 87);
  say([{ who: 'sol', text: 'Left at the next light, Nico! I can hear that chopper from here. Stay off the brakes!' }]); typed();
  for (const c of G.cars) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; }
  updateSirens(0.1);
  car.mesh.rotation.z = -0.025; const cz = z0 + LANE - 1.1;
  smoke(-11.5, 1, cz - 0.6, 0x8a8580); smoke(-12.6, 1.3, cz - 0.9, 0x9a948c); sparks(-7.6, 0.7, cz, 34); sparks(-8.4, 0.55, cz, 18); sparks(-9.5, 0.4, cz - 0.4, 10);
  particle({ x: -7.8, y: 0.75, z: cz, life: 1, size: 3.2, color: 0xffc070, add: true });
  rig.mode = 'auto'; rig.yaw = Math.PI / 2; G.shotCam = { d: 8.6, h: 2.45, ly: 2.0, ahead: 30, fov: 58, roll: 0.035 };
  const rim = new THREE.PointLight(0xffe0c0, 60, 14, 1.6); rim.position.set(car.x - 3.5, 3.2, car.z - 2.5); G.scene.add(rim);
  finish(api); }
function onfoot(api) {
  const p = G.p, z0 = lineCoord(7); clearTraffic(); G.mode = 'play'; G.clock = 17.3; G.time = 0.1; G.money = 3240; G.xp = 720; G.radio = 2; api.showHud(true); rig.mode = 'auto';
  p.owned = { 0: 1, 1: 1, 2: 1, 3: 1 }; p.ammo = { pistol: 60, smg: 118, shotgun: 16 }; p.hp = 72; p.armor = 45; G.camDistAim = 4.3; p.x = -199; p.z = z0 + 0.4; p.yaw = Math.PI / 2 - 0.3; p.aim = true; selectWeapon(2); G.cam.yaw = Math.PI / 2 - 0.05; G.cam.pitch = 0.16;
  animateWalk(p.mesh, 0.6, 0.0, true); p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; setGun(p.mesh, 'smg');
  // two SBPD officers in uniform, in frame and returning fire
  const cops = [[-187.5, z0 + 2.5], [-184.5, z0 + 5.3]].map(([x, z], i) => { const a = createActor('cop', x, z, STYLES.cop, { yaw: -Math.PI / 2 }); animateWalk(a.mesh, i * 2, 0.5, true); setGun(a.mesh, 'pistol'); a.mesh.position.set(x, 0, z); a.mesh.rotation.y = -Math.PI / 2 + (i ? 0.12 : -0.06); return a; });
  // crashed patrol car with a live light bar, against the kerb
  const cr = spawnCop(-181, z0 - 4.9, -Math.PI / 2 + 0.85, 'PURSUIT'); cr.mesh.position.set(cr.x, 0, cr.z); cr.heading = -Math.PI / 2 + 0.85; cr.mesh.rotation.set(0.03, cr.heading, 0.07); cr.speed = 0; cr.vx = cr.vz = 0;
  const cc = spawnCop(-146, z0 + 3.4, -Math.PI / 2, 'ARRIVING'); cc.mesh.position.set(cc.x, 0, cc.z); cc.heading = -Math.PI / 2; cc.mesh.rotation.y = cc.heading;
  const stolen = createCar('cadia', -168, z0 + 6.3, Math.PI / 2 - 0.05, 'parked', 0x2fb89a); stolen.mesh.rotation.y = stolen.heading;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.3), new THREE.MeshLambertMaterial({ color: 0x2fb89a })); door.position.set(1.15, 0.85, 0.5); door.rotation.y = 0.9; stolen.mesh.add(door);
  const tc = (key, x, dir, col) => { const c = placeTraffic('x', 7, x, dir, key, 'traffic', col); c.nav.spd = 6; return c; };
  tc('marlin', -128, 1, 0xf2c230); tc('rumble', -118, -1, 0xff4fd8);
  [[-205, 1, 1], [-198, -1, -1], [-192, 1, 1], [-186, -1, 1], [-181, 1, -1], [-176, -1, 1], [-170, 1, 1], [-164, -1, -1], [-158, 1, 1], [-209, -1, 1], [-178, -1, -1], [-168, 1, -1]].forEach(([x, s, d], i) => { const a = spawnPed('x', 7, x, s, d); a.scared = 6; a.nav.dir = d; animateWalk(a.mesh, i * 1.7, 0.95, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  for (const [c, x, z] of [[0xff4fd8, -192, z0 - 9], [0x4fd8ff, -180, z0 + 9], [0xffa030, -168, z0 - 9], [0xff4fd8, -206, z0 + 9]]) { const L = new THREE.PointLight(c, 140, 42, 2); L.position.set(x, 5, z); G.scene.add(L); }
  setStars(3); G.wanted.heat = 3.2; fakeMission(2, 1, 'Take out the Coral Kings (2 left)', 0);
  for (const c of G.cars) { c.mesh.position.set(c.x, c.mesh.position.y, c.z); }
  updateSirens(0.1);
  const gx = p.x + Math.sin(p.yaw) * 1.1, gz = p.z + Math.cos(p.yaw) * 1.1; muzzleFlash(gx, 1.38, gz);
  cops.forEach((c, i) => { const fx = c.x - 0.7, fz = c.z; muzzleFlash(fx, 1.38, fz); tracer(fx, 1.38, fz, p.x + 0.3, 1.2 + i * 0.3, p.z - 0.2 + i * 0.2); sparks(c.x - 0.3, 1.1, c.z, 5); });
  tracer(gx, 1.38, gz, -187.9, 1.3, z0 + 2.4); sparks(-187.9, 1.3, z0 + 2.4, 6); tracer(gx, 1.38, gz, -184.9, 1.2, z0 + 5.2); sparks(-184.9, 1.1, z0 + 5.2, 4);
  sparks(-180, 0.9, z0 - 3.5, 10); sparks(-178.6, 0.6, z0 - 5.6, 6); smoke(-178.9, 1.4, z0 - 3.8, 0x555555); smoke(-178.6, 2.4, z0 - 3.6, 0x666666); smoke(-179, 3.4, z0 - 3.9, 0x777777);
  G.shake = 0; G.toasts.push({ text: 'WANTED LEVEL 3', kind: 'wanted', t: 9 });
  rig.mode = 'auto'; finish(api);
  floatText(cops[0].x, 1.5, cops[0].z, '-34', 'hit'); floatText(cops[1].x, 1.5, cops[1].z, '-18', 'hit'); layoutFloaters(0); }
function map(api) {
  const p = G.p; seedSave(({ v: 1, money: 3240, xp: 520, completed: ['m1', 'm2'], packages: [0, 3, 5, 9, 11], owned: {}, ammo: {}, clock: 17.6, play: 4320, place: 'Neon Row', at: '2026-11-18 17:35' })); clearTraffic(); G.mode = 'pause'; G.clock = 17.6; G.completed = ['m1', 'm2']; G.xp = 520; G.money = 9150; G.packages = [0, 3, 5, 9, 11]; p.x = 40; p.z = 20; p.yaw = 2.4;
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

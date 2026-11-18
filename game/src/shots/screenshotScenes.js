// Deterministic staged scenes for ?shot=<name> (built from the real world, HUD and entities) and the ?selftest=1 smoke test.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { LANE, lineCoord } from '../core/config.js';
import { input } from '../core/input.js';
import { createCar } from '../vehicles/carPhysics.js';
import { placeTraffic } from '../vehicles/trafficSystem.js';
import { enterCar, selectWeapon } from '../characters/playerController.js';
import { spawnPed, createActor } from '../characters/pedestrianSystem.js';
import { STYLES, setGun, animateWalk, randomStyle } from '../characters/characterModel.js';
import { spawnCop } from '../police/policeDispatch.js';
import { createHeli, placeCone } from '../police/helicopterUnit.js';
import { setStars, crime } from '../police/wantedSystem.js';
import { MISSIONS, corner } from '../missions/storyMissions.js';
import { startMission, refreshStartMarker } from '../missions/missionRunner.js';
import { dlg, say } from '../story/dialogue.js';
import { muzzleFlash, tracer, sparks, smoke, particle, updateSirens, floatText, layoutFloaters } from '../combat/effects.js';
import { rig } from '../camera/cameraRig.js';
import { seedSave } from '../save/saveGame.js';
import { addMarker } from '../missions/markers.js';
import { removeCar } from '../vehicles/carPhysics.js';
import { removeActor } from '../characters/pedestrianSystem.js';

function clearTraffic() { for (const c of G.cars.slice()) if (c.kind === 'traffic' || c.kind === 'parked') removeCar(c); for (const a of G.actors.slice()) removeActor(a); }
function fakeMission(idx, stageIdx, text, timer) {
  const def = MISSIONS[idx]; G.mission = { def, idx: stageIdx, stage: def.stages[stageIdx], timer, total: def.stages.length, text, enemies: [], car: null, collected: 0 };
}
function finish(api, frames = 2) { G.hudRate = 1; const gl0 = G.renderer.getContext();  for (let i = 0; i < frames; i++) { api.updateHud(0.016); api.renderFrame(true); gl0.finish(); gl0.readPixels(0, 0, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, new Uint8Array(4)); } { const px = new Uint8Array(4); gl0.readPixels(640, 700, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, px); const p2 = new Uint8Array(4); gl0.readPixels(640, 100, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, p2); document.body.dataset.px = px.join(',') + '/' + p2.join(','); } { const c = G.renderer.domElement, r = c.getBoundingClientRect(); document.body.dataset.sz = [c.width, c.height, r.x, r.y, r.width, r.height, innerWidth, innerHeight, devicePixelRatio, getComputedStyle(c).display, getComputedStyle(c).visibility].join(','); } document.body.dataset.cam = [G.camera.position.x, G.camera.position.y, G.camera.position.z, G.p.x, G.p.z, G.camera.fov].map((v) => v.toFixed(1)).join(',') + ' lost=' + G.renderer.getContext().isContextLost() + ' err=' + G.renderer.getContext().getError() + ' calls=' + G.renderer.info.render.calls + ' tris=' + G.renderer.info.render.triangles; if (location.search.includes('overlay')) api.showScreen('pause'); if (location.search.includes('nohud')) document.getElementById('hud').style.display = 'none'; }
function typed() { dlg.t = 99; }

function chase(api) {
  // East along the Palmetto boulevard at golden hour: the sea and the setting sun at the end of the street.
  const p = G.p, z0 = lineCoord(6), X = 128; clearTraffic(); G.mode = 'play'; G.clock = 17.45; G.money = 48250; G.xp = 520; G.radio = 1; api.showHud(true);
  const car = createCar('veloce', X, z0 + 1.75, Math.PI / 2, 'parked', 0xd80c2c); enterCar(car); car.speed = 41.5; car.vx = 41.5; car.vz = 0; car.input.throttle = 1; p.x = car.x; p.z = car.z; p.hp = 86; p.armor = 60; p.weapon = 2; p.owned = { 0: 1, 1: 1, 2: 1, 3: 1 }; p.ammo = { pistol: 84, smg: 210, shotgun: 24 };
  const cop = (x, z, h, vx, vz, ai) => { const c = spawnCop(x, z, h, ai); c.heading = h; c.vx = vx; c.vz = vz; c.speed = Math.hypot(vx, vz); c.ai = ai; return c; };
  cop(X - 1.7, z0 - 0.6, Math.PI / 2 + 0.13, 40.5, 3, 'RAMMING'); cop(X - 1.4, z0 + 5.5, Math.PI / 2 - 0.04, 40, 0, 'PURSUIT');
  cop(158.5, z0 + 10.5, Math.PI - 0.95, 9, -11, 'ARRIVING'); cop(236, z0 - 5.25, -Math.PI / 2, -24, 0, 'ARRIVING');
  const tc = (key, x, dir, col) => { const c = placeTraffic('x', 6, x, dir, key, 'traffic', col); c.nav.spd = 11; return c; };
  tc('surf', 262, 1, 0xf4f1ea); tc('pixie', 204, 1, 0x8fd3c8); tc('tupelo', 150, -1, 0xf2c230); tc('riviera', 188, -1, 0xff8a7a); tc('marlin', 228, -1, 0x2f7fd8); tc('hawke', 112, -1, 0x222831); tc('rumble', 256, 1, 0xff8a3d);
  [[140, 1, 1], [146, -1, -1], [152, 1, 1], [160, -1, 1], [170, 1, -1], [178, -1, -1], [186, 1, 1], [196, -1, 1], [134, -1, 1], [210, 1, -1], [122, 1, 1]].forEach(([x, s, d], i) => { const a = spawnPed('x', 6, x, s, d); if (i % 3 === 0) { a.scared = 6; a.nav.dir = d; } animateWalk(a.mesh, i * 1.3, 0.6, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  G.heli = createHeli(170, z0 - 7); G.heli.y = 21; G.heli.mesh.position.set(G.heli.x, 21, G.heli.z); G.heli.mesh.rotation.set(0.1, -Math.PI / 2 + 0.5, -0.16); G.heli.rotor.rotation.y = 0.7; placeCone(G.heli, car.x + 1.5, car.z); G.shotLock = true;
  setStars(4); G.wanted.heat = 4.3; fakeMission(5, 3, 'Escape the SBPD, then reach the Alder Hills safehouse', 87);
  say([{ who: 'sol', text: 'Left at the next light, Nico! I can hear that chopper from here. Stay off the brakes!' }]); typed();
  for (const c of G.cars) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; }
  car.mesh.rotation.z = -0.025; const ram = G.cars.find((c) => c.ai === 'RAMMING'); ram.mesh.rotation.z = 0.03;
  const sx = X - 0.6, sz = z0 + 0.6; sparks(sx, 0.45, sz, 14);
  const bm = addMarker({ x: X + 64, z: z0 + 10.5, kind: 'obj', label: 'SAFEHOUSE', auto: false }); bm.mesh.scale.set(0.8, 0.75, 0.8); bm.mesh.children[0].material = new THREE.MeshBasicMaterial({ color: 0xffb81c, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }); // objective beacon down the boulevard
  // golden rim + fill from behind the camera so the VELOCE GT reads as saturated glossy red against the low sun
  const rim = new THREE.DirectionalLight(0xffd2a8, 2.2); rim.position.set(X - 14, 6, z0 - 3); rim.target = car.mesh; G.scene.add(rim);
  const fill = new THREE.PointLight(0xff9a70, 30, 9, 2); fill.position.set(X - 4.5, 1.6, z0 + 2.6); G.scene.add(fill);
  const bm2 = car.mesh.userData.bodyMesh; if (bm2) { bm2.material = bm2.material.clone(); bm2.material.envMapIntensity = 0.3; bm2.material.metalness = 0.1; bm2.material.clearcoat = 0.55; bm2.material.color.setHex(0xe0081e); }
  if (G.post) { G.post.params.bloom.value = 0.4; G.post.threshold.value = 2.1; }
  [[X + 22, -1, 1], [X + 30, 1, -1], [X + 44, -1, -1], [X + 56, 1, 1]].forEach(([x, s, d], i) => { const a = spawnPed('x', 6, x, s, d); animateWalk(a.mesh, i * 1.9, 0.6, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  smoke(X - 2.6, 0.5, z0 + 2.4, 0x9a948c); smoke(X - 3.4, 0.7, z0 + 1.2, 0x8a847c); smoke(X - 5.5, 0.5, z0 - 0.4, 0x9a948c);
  rig.mode = 'auto'; rig.yaw = Math.PI / 2; rig.shot = { pos: [X - 8.2, 1.85, z0 + 2.3], look: [X + 30, 2.1, z0 + 1.0], fov: 58, roll: -0.035 };
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
function title(api) { // key art: low angle on the coast road at golden hour, Nico beside the VELOCE GT, sun going down over the sea
  clearTraffic(); seedSave(({ v: 1, money: 3240, xp: 520, completed: ['m1', 'm2'], packages: [0, 1, 2, 3, 4, 5, 6, 7], owned: {}, ammo: {}, clock: 17.6, at: '2026-11-18 17:35' }));
  G.mode = 'title'; G.clock = 16.9; G.time = 30; G.sunAz = -1.2; const p = G.p, X = lineCoord(9); // low sun over the camera's right shoulder
  const car = createCar('veloce', X + 5.2, 211.8, -2.3, 'parked', 0xe0081e); car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  p.x = X + 1.25; p.z = 216.4; p.yaw = -0.72; p.mesh.visible = true; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animateWalk(p.mesh, 0, 0, false);
  p.mesh.userData.armL.rotation.z = 0.12; p.mesh.userData.armR.rotation.set(-0.25, 0, -0.35);
  const tc = (key, z, col, h) => { const c = createCar(key, X + (h ? 3.5 : -3.5), z, h ? 0 : Math.PI, 'parked', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; };
  tc('riviera', 175, 0x8fd3c8, 0); tc('pixie', 140, 0xffe7a3, 1); tc('marlin', 110, 0x2f7fd8, 0);
  [[X - 9, 190], [X - 8.5, 160], [X + 8.5, 196], [X - 9, 132]].forEach(([x, z], i) => { const a = createActor('ped', x, z, randomStyle({ pick: (arr) => arr[(i * 3 + 1) % arr.length] }), { yaw: Math.PI }); animateWalk(a.mesh, i * 1.7, 0.6, false); a.mesh.position.set(x, 0.25, z); });
  rig.mode = 'auto'; rig.shot = { pos: [X - 1.4, 1.15, 220.4], look: [X + 4.6, 3.05, 196], fov: 50, roll: 0 };
  if (G.post) G.post.params.vig.value = 0.12; G.renderer.toneMappingExposure = 1.35;
  api.showHud(false); api.showScreen('title'); finish(api, 2); }

export async function runShot(name, api) {
  G.shot = name; ({ '1-chase': chase, '2-onfoot': onfoot, '3-map': map, '4-title': title }[name] || title)(api);
  if (name !== '3-map') {
    const c = G.renderer.domElement, img = new Image(); img.id = 'shotImg'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:0';
    img.src = c.toDataURL('image/jpeg', 0.93); await img.decode(); c.style.display = 'none'; document.body.insertBefore(img, document.getElementById('hud'));
  }
  document.title = 'SHOT_READY';
}
export async function runSelfTest(api) {
  try {
    seedSave(null); api.startGame(false); for (let i = 0; i < 90; i++) api.stepGame(0.016);
    const car = G.cars.find((c) => c.kind === 'parked'); G.p.x = car.x + 2; G.p.z = car.z; input.edge.add('KeyF'); api.stepGame(0.016); input.edge.clear();
    if (!G.p.car) throw new Error('could not enter car'); input.keys.add('KeyW'); const x0 = G.p.x, z0 = G.p.z;
    for (let i = 0; i < 360; i++) { if (i === 100) input.keys.add('KeyD'); if (i === 140) input.keys.delete('KeyD'); api.stepGame(0.016); }
    if (!(Math.hypot(G.p.x - x0, G.p.z - z0) > 20)) throw new Error('car did not drive');
    crime('killcop'); crime('killcop'); for (let i = 0; i < 600; i++) api.stepGame(0.016);
    if (G.cars.filter((c) => c.kind === 'cop').length < 1) throw new Error('no police spawned');
    input.keys.delete('KeyW'); startMission(MISSIONS[0]); for (let i = 0; i < 60; i++) api.stepGame(0.016); api.updateHud(0.016); api.renderFrame();
    if (!G.mission || Number.isNaN(G.p.x)) throw new Error('mission/NaN');
    // more systems: on-foot shooting, heli at 5 stars, steal-stage completion, map, radio, shop, flatlined
    input.edge.add('KeyF'); api.stepGame(0.016); input.edge.clear(); G.p.car = G.p.car; if (G.p.car) { G.p.car.speed = 0; G.p.car.vx = 0; G.p.car.vz = 0; input.edge.add('KeyF'); api.stepGame(0.016); input.edge.clear(); }
    G.p.weapon = 1; input.left = true; for (let i = 0; i < 120; i++) { input.leftPressed = i % 10 === 0; api.stepGame(0.016); } input.left = false;
    crime('killcop'); crime('killcop'); crime('killcop'); crime('explosion'); crime('explosion'); for (let i = 0; i < 400; i++) api.stepGame(0.016);
    api.showScreen('cityMap'); api.showScreen('shop'); api.showScreen('pause'); api.handlers.resume(); G.hooks.playerDown('FLATLINED'); for (let i = 0; i < 260; i++) api.stepGame(0.016);
    if (G.mode !== 'play') throw new Error('did not respawn: ' + G.mode); document.title = 'SELFTEST PASS';
  } catch (e) { console.error('CONSOLE_ERROR selftest ' + (e.stack || e)); document.title = 'SELFTEST FAIL ' + e.message; }
}

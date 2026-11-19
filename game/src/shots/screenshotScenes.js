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
import { muzzleFlash, tracer, sparks, smoke, particle, updateSirens, floatText, layoutFloaters, skidMark, updateEffects, explosion, fire } from '../combat/effects.js';
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
  // Staged on the Strand road heading north: the city on the left, the sea, the sand and the Causeway on the right.
  // Layout is authored along a local avenue (u forward, v to the right) and mapped onto the road: T(u, v) -> world x, z.
  const p = G.p, R = HALF, Z0 = 262, T = (u, v) => [R + v, Z0 - u], H = (h) => h + Math.PI / 2; clearTraffic(); G.mode = 'play'; G.clock = 17.45; G.money = 48250; G.xp = 760; G.radio = 1; api.showHud(true);
  const [cx, cz] = T(0, 0.5), car = createCar('veloce', cx, cz, H(Math.PI / 2 - 0.55), 'parked', 0xd01020); enterCar(car); car.vx = 1.5; car.vz = -38; car.speed = 38; car.steerA = 0.5; car.input.throttle = 1;
  car.hp = car.maxHp * 0.68; car.nitro = 0.62; car.boosting = true; p.x = car.x; p.z = car.z; p.hp = 86; p.armor = 60; p.weapon = 2; p.owned = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }; p.ammo = { pistol: 84, smg: 210, shotgun: 24, molotov: 3 };
  // same story moment as the Crew & Chapters shot: six chapters done (Dex has turned), chapter 7 in progress
  G.completed = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; G.territory = null; G.crew = { cd: { sol: 22 }, swaps: 1 };
  const cop = (u, v, h, sp, ai) => { const [x, z] = T(u, v), c = spawnCop(x, z, H(h), ai); c.vx = Math.sin(H(h)) * sp; c.vz = Math.cos(H(h)) * sp; c.speed = sp; c.ai = ai; c.heading = H(h); return c; };
  // one cruiser rams the left rear quarter, one closes on the right, a third trails behind
  cop(-1.4, -2.1, 1.12, 39, 'RAMMING'); cop(8, 4.7, Math.PI / 2 + 0.2, 37, 'PURSUIT'); cop(-18, -2.5, Math.PI / 2 - 0.12, 36, 'PURSUIT');
  const rb = [cop(36, 3.4, 0.32, 0, 'ROADBLOCK'), cop(38, -3.2, -0.28, 0, 'ROADBLOCK')]; rb.forEach((c) => { c.rbT = 40; });
  { const [x, z] = T(30, 0); createSpikeStrip(x, z, Math.PI / 2, 11); }
  const tc = (key, u, dir, col, spd = 11) => { const c = placeTraffic('z', N, Z0 - u, -dir, key, 'traffic', col); c.nav.spd = spd; return c; };
  tc('marlin', 56, -1, 0x2f7fd8, 14); tc('cadia', 74, -1, 0x2fb89a); tc('rumble', 100, -1, 0x8fd3c8); tc('pico', 128, 1, 0xff8a3d); tc('tupelo', 148, -1, 0xf6c21c); tc('hawke', 120, -1, 0xe9c46a); tc('pico', 88, -1, 0xc3a6e0);
  [[12, -1, -1], [26, -1, 1], [42, -1, -1], [6, 1, 1], [20, 1, -1], [40, 1, 1], [58, -1, -1], [-4, 1, -1], [76, 1, -1], [-2, -1, 1], [64, 1, 1], [2, 1, 1], [9, -1, -1], [15, 1, -1], [30, 1, 1], [48, 1, -1], [34, -1, 1]].forEach(([u, s, d], i) => { const a = spawnPed('z', N, Z0 - u, s, -d); if (i % 2 === 0) { a.scared = 6; a.nav.dir = -d; } animateWalk(a.mesh, i * 1.3, i % 2 ? 0.6 : 0.95, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  { const [x, z] = T(32, 4); G.heli = createHeli(x, z); } G.heli.y = 12.5; G.heli.mesh.position.set(G.heli.x, 12.5, G.heli.z); G.heli.mesh.rotation.set(0.08, H(0.35), -0.12); G.heli.rotor.rotation.y = 0.7; placeCone(G.heli, car.x, car.z); G.shotLock = true;
  { const [x, z] = T(158, 0.5); addMarker({ x, z, kind: 'obj', label: 'Marina gate', color: 0xffd23c, auto: false }); } setStars(4); G.wanted.heat = 4.3; fakeMission(6, 1, 'Shake Reyne\'s units before the marina gate', 0);
  for (const c of G.cars) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; for (const w of c.mesh.userData.fw || []) w.rotation.y = c.steerA * 0.9; }
  updateSirens(0.1); updateLineOfSight(1);
  // the drift so far: an arc of twin skid marks behind the rear wheels, and light sunlit tyre smoke rolling off them, kept low and to the side
  for (let k = 0; k < 60; k++) { const q = k / 60, u = -2 - q * 30, v = 0.4 - q * q * 4.5, h = Math.PI / 2 - 0.44 * (1 - q) + 0.2 * q; for (const sg of [-1, 1]) { const [x, z] = T(u + Math.cos(h) * sg * 0.85, v - Math.sin(h) * sg * 0.85); skidMark(x, z, H(h)); } }
  const sn = Math.sin(car.heading), cs = Math.cos(car.heading), rx = car.x - sn * 1.45, rz = car.z - cs * 1.45;
  for (let k = 0; k < 8; k++) { const back = k * 0.5, sg = k % 2 ? 1 : -1; particle({ x: rx - 1.0 - back * 0.55 + sg * 0.5, y: 0.3 + k * 0.05, z: rz + back + 0.3, life: 1.4, size: 0.9 + k * 0.18, color: 0xfff0e4, hdr: 1.45, op: 0.34 - k * 0.025, tex: 'puff' }); }
  for (let k = 0; k < 6; k++) particle({ x: car.x - sn * 2.55, y: 0.33, z: car.z - cs * 2.55 + k * 0.35, life: 0.3, size: 0.8 - k * 0.08, color: 0x7fc8ff, add: true, hdr: 1.6 });
  // the ram: sparks where the cruiser's push bar meets the rear quarter
  const [hx, hz] = T(-0.3, -0.95); sparks(hx, 0.7, hz, 34); sparks(hx, 0.55, hz, 18); particle({ x: hx, y: 0.75, z: hz, life: 1, size: 2.2, color: 0xffc070, add: true });
  G.money = 48000; api.updateHud(0.016); popup('DRIFT x3', 150, 'drift'); popup('NEAR MISS', 100, 'near');
  say({ who: 'sol', text: 'Dex sold us out! Spikes ahead: hit the nitro and thread the gap!' }); typed();
  // camera low behind the left rear, turned a little toward the sea so the Causeway pylons stand over the water
  const [px, pz] = T(-8.5, -1.3), [lx, lz] = T(40, 14); G.exposure = 1.1; G.shotCam = { pos: [px, 2.8, pz], look: [lx, -0.4, lz], fov: 46, roll: 0.03 };
  const rim = new THREE.PointLight(0xffe0c0, 60, 14, 1.6); { const [x, z] = T(-3.5, -1.5); rim.position.set(x, 3.2, z); } G.scene.add(rim);
  finish(api); }
// Daylight firefight on the Palmetto Beach road: Nico fires on SBPD officers behind their cruiser while a car they hit
// goes up in a fireball; beachgoers flee across the sand, the sea and the palms on the right.
function onfoot(api) {
  const p = G.p, X = HALF; clearTraffic(); G.mode = 'play'; G.clock = 16.2; G.magicForce = 0.5; G.time = 0.1; G.money = 3240; G.xp = 720; G.radio = 2; api.showHud(true); rig.mode = 'auto';
  p.owned = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }; p.ammo = { pistol: 60, smg: 118, shotgun: 16, molotov: 2 }; G.completed = ['m1', 'm2']; G.territory = null; G.crew = { cd: { wren: 12 } }; p.hp = 72; p.armor = 45; G.camDistAim = 4.4; p.x = X - 1.2; p.z = 46; p.yaw = Math.PI + 0.12; p.aim = true; selectWeapon(2); G.cam.yaw = Math.PI - 0.22; G.cam.pitch = 0.1;
  animateWalk(p.mesh, 0.6, 0.0, true); p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; setGun(p.mesh, 'smg');
  // the SBPD cruiser slewed across the road, officers firing over and beside it
  const cr = spawnCop(X - 2.5, 31, Math.PI / 2 + 0.25, 'PURSUIT'); cr.speed = 0; cr.vx = cr.vz = 0; cr.deployed = true;
  const cr2 = spawnCop(X + 2.6, 23, Math.PI - 0.5, 'PURSUIT'); cr2.speed = 0; cr2.deployed = true;
  const cops = [[X - 5.6, 29.0], [X + 0.2, 28.8], [X + 2.6, 26.6]].map(([x, z], i) => { const a = createActor('cop', x, z, STYLES.cop, { yaw: 0 }); animateWalk(a.mesh, i * 2, 0.5, true); setGun(a.mesh, 'pistol'); a.mesh.position.set(x, 0, z); a.mesh.rotation.y = Math.atan2(p.x - x, p.z - z) + (i - 1) * 0.08; return a; });
  // the car that caught the stray rounds: a real wreck (burnt shell, fireball, blast) on the kerb behind the line
  const boom = createCar('rumble', X + 5.6, 35, -0.6, 'parked', 0xff8a3d); boom.mesh.position.set(boom.x, 0, boom.z); boom.mesh.rotation.y = boom.heading;
  const tc = (key, z, dir, col) => { const c = placeTraffic('z', N, z, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; c.nav.spd = 0; return c; };
  tc('tupelo', -30, 1, 0xf6c21c); tc('pico', -60, -1, 0xff4fd8); tc('marlin', 70, -1, 0x2f7fd8);
  [[40, 1, 1], [34, 1, 1], [30, -1, 1], [52, 1, 1], [20, 1, -1], [58, -1, 1], [44, -1, 1], [14, -1, -1], [62, 1, 1]].forEach(([z, s, d], i) => { const a = spawnPed('z', N, z, s, d); a.scared = 6; a.nav.dir = d; animateWalk(a.mesh, i * 1.7, 0.95, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  for (const [x, z, yw] of [[X + 14, 38, 0.6], [X + 18, 30, -0.4], [X + 22, 44, 0.9], [X + 12, 22, 0.2], [X + 26, 36, -0.8]]) { const a = createActor('ped', x, z, randomStyle(rnd), { yaw: yw }); a.scared = 6; animateWalk(a.mesh, x * 0.7, 0.95, false); a.mesh.position.set(x, 0, z); a.mesh.rotation.y = yw; }
  setStars(3); G.wanted.heat = 3.4; fakeMission(2, 1, 'Take out the Coral Kings (2 left)', 0); G.mission.def = { ...G.mission.def };
  for (const c of G.cars) { c.mesh.position.set(c.x, c.mesh.position.y, c.z); c.mesh.rotation.y = c.heading; }
  wreck(boom); layoutFloaters(5); for (let k = 0; k < 6; k++) { fire(boom.x, 1.1, boom.z); fire(boom.x, 1.1, boom.z); updateEffects(0.05); }
  setStars(3); G.wanted.heat = 3.4; fakeMission(2, 1, 'Take out the Coral Kings (2 left)', 0); G.toasts.length = 0;
  for (const a of cops) { a.dead = false; a.hp = Math.max(a.hp || 0, 40); }
  G.cars.forEach((c) => { if (c !== boom) { c.dead = false; c.hp = Math.max(c.hp, 400); } });
  updateSirens(0.1); updateLineOfSight(1);
  const gx = p.x + Math.sin(p.yaw) * 1.1, gz = p.z + Math.cos(p.yaw) * 1.1; muzzleFlash(gx, 1.38, gz);
  cops.forEach((c, i) => { const fx = c.x + Math.sin(c.mesh.rotation.y) * 0.7, fz = c.z + Math.cos(c.mesh.rotation.y) * 0.7; muzzleFlash(fx, 1.38, fz); tracer(fx, 1.38, fz, p.x + 0.3 - i * 0.3, 1.2 + i * 0.2, p.z - 0.4); });
  tracer(gx, 1.38, gz, cops[0].x, 1.3, cops[0].z); sparks(cops[0].x, 1.3, cops[0].z, 6); tracer(gx, 1.38, gz, cops[1].x, 1.2, cops[1].z); sparks(cr.x + 0.5, 0.9, cr.z + 0.9, 10);
  G.shake = 0;
  G.exposure = 1.18; if (G.post) Object.assign(G.post.params, { bloom: 0.5, threshold: 1.05 });
  rig.mode = 'auto'; finish(api);
  floatText(cops[0].x, 1.5, cops[0].z, '-34', 'hit'); floatText(cops[1].x, 1.5, cops[1].z, '-18', 'hit'); layoutFloaters(0); }
// Crew & Chapters screen opened from a ride on The Strand: six chapters done, Dex has turned, Sol's HOT SWAP cooling down.
function crewScreen(api) {
  const p = G.p, done = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; clearTraffic(); G.mode = 'pause'; G.clock = 17.1; G.magicForce = 0.6; G.completed = done; G.territory = null; G.xp = 2200; G.money = 21400; G.crew = { cd: { sol: 18 }, swaps: 1 }; G.wanted.stars = 0;
  const car = createCar('veloce', HALF - 3.4, 40, 0.1, 'parked', 0xd01020); car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  p.x = HALF - 1; p.z = 30; p.yaw = 0.3; G.cam.yaw = Math.PI + 0.5; G.cam.pitch = 0.12; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animateWalk(p.mesh, 0, 0, false);
  const tc = (key, z, dir, col) => { const c = placeTraffic('z', N, z, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; return c; };
  tc('tupelo', 70, 1, 0xf6c21c); tc('pico', 110, -1, 0xff8a3d);
  refreshStartMarker(); G.markers.forEach((m) => { if (m.mesh) m.mesh.visible = false; }); api.showHud(false); rig.mode = 'auto'; G.exposure = 1.2;
  for (let i = 0; i < 3; i++) api.renderFrame(true); api.showScreen('crew'); finish(api, 1); }
// Key art: low angle on the beach road at golden hour, the VELOCE GT and Nico in front, palms, skyline and marina behind.
function title(api) {
  clearTraffic(); seedSave({ v: 1, money: 3240, xp: 520, completed: ['m1', 'm2'], packages: [0, 1, 2, 3, 4, 5, 6, 7], owned: {}, ammo: {}, clock: 17.6, play: 4320, place: 'Palmetto Beach', at: '2026-11-18 17:35' });
  G.mode = 'title'; G.clock = 16.7; G.magicForce = 0.7; G.exposure = 1.4; G.time = 30; rig.mode = 'aerial'; G.wanted.stars = 0;
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
  G.shot = name; ({ '1-chase': chase, '2-onfoot': onfoot, '3-crew': crewScreen, '4-title': title }[name] || title)(api);
  {
    const c = G.renderer.domElement, img = new Image(); img.id = 'shotImg'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:0';
    img.src = c.toDataURL('image/jpeg', 0.93); await img.decode(); c.style.display = 'none'; document.body.insertBefore(img, document.getElementById('hud'));
  }
  document.title = 'SHOT_READY';
}

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
import { stageMoto } from '../vehicles/motoTaxis.js';

function clearTraffic() { for (const c of G.cars.slice()) if (c.kind === 'traffic' || c.kind === 'parked') removeCar(c); for (const a of G.actors.slice()) removeActor(a); }
function fakeMission(idx, stageIdx, text, timer) {
  const def = MISSIONS[idx]; G.mission = { def, idx: stageIdx, stage: def.stages[stageIdx], timer, total: def.stages.length, text, enemies: [], car: null, collected: 0 };
}
function finish(api, frames = 2) { G.hudRate = 1; const gl0 = G.renderer.getContext();  for (let i = 0; i < frames; i++) { G.hudRate = 1; api.updateHud(0.016); api.renderFrame(true); gl0.finish(); gl0.readPixels(0, 0, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, new Uint8Array(4)); } { const px = new Uint8Array(4); gl0.readPixels(640, 700, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, px); const p2 = new Uint8Array(4); gl0.readPixels(640, 100, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, p2); document.body.dataset.px = px.join(',') + '/' + p2.join(','); } { const c = G.renderer.domElement, r = c.getBoundingClientRect(); document.body.dataset.sz = [c.width, c.height, r.x, r.y, r.width, r.height, innerWidth, innerHeight, devicePixelRatio, getComputedStyle(c).display, getComputedStyle(c).visibility].join(','); } document.body.dataset.cam = [G.camera.position.x, G.camera.position.y, G.camera.position.z, G.p.x, G.p.z, G.camera.fov].map((v) => v.toFixed(1)).join(',') + ' lost=' + G.renderer.getContext().isContextLost() + ' err=' + G.renderer.getContext().getError() + ' calls=' + G.renderer.info.render.calls + ' tris=' + G.renderer.info.render.triangles; if (location.search.includes('overlay')) api.showScreen('pause'); if (location.search.includes('nohud')) document.getElementById('hud').style.display = 'none'; }
function typed() { dlg.t = 99; }

// Cover: golden hour on the Strand. The VELOCE GT drifts nose-left on nitro past the beach, an SBPD cruiser ramming its
// right rear quarter, one alongside and one trailing, AIR-1 overhead with its searchlight, both Causeway pylons over the sea.
// Hide the palms inside a bearing window seen from (cx, cz) so they frame a landmark instead of covering it.
function thinPalms(cx, cz, b0, b1, minD) {
  const pp = G.palmProps; if (!pp) return; const m = new THREE.Matrix4().makeScale(0, 0, 0);
  pp.list.forEach((it, i) => { const dx = it.x - cx, dz = it.z - cz, b = Math.atan2(dx, -dz) * 180 / Math.PI; if (b > b0 && b < b1 && Math.hypot(dx, dz) > minD) pp.mesh.setMatrixAt(i, m); });
  pp.mesh.instanceMatrix.needsUpdate = true;
}
function chase(api) {
  // Laid out along a local avenue (u forward = north, v to the right = toward the sea) and mapped onto the Strand road.
  const p = G.p, R = HALF, Z0 = 262, T = (u, v) => [R + v, Z0 - u], H = (h) => h + Math.PI / 2; clearTraffic(); G.mode = 'play'; G.clock = 16.95; G.magicForce = 0.85; G.money = 48250; G.xp = 760; G.radio = 1; G.shotCrisp = true; api.showHud(true);
  const DRIFT = 0.62, [cx, cz] = T(0, 1.4), car = createCar('veloce', cx, cz, H(Math.PI / 2 + DRIFT), 'parked', 0xd01020); enterCar(car); car.vx = 2.5; car.vz = -38; car.speed = 38; car.steerA = -0.45; car.input.throttle = 1;
  car.hp = car.maxHp * 0.68; car.nitro = 0.62; car.boosting = true; p.x = car.x; p.z = car.z; p.hp = 86; p.armor = 60; p.weapon = 2; p.owned = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }; p.ammo = { pistol: 84, smg: 210, shotgun: 24, molotov: 3 };
  // same story moment as the Crew & Chapters shot: six chapters done (Dex has turned), chapter 7 in progress
  G.completed = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; G.territory = null; G.crew = { cd: { sol: 22 }, swaps: 1 };
  const cop = (u, v, h, sp, ai) => { const [x, z] = T(u, v), c = spawnCop(x, z, H(h), ai); c.vx = Math.sin(H(h)) * sp; c.vz = Math.cos(H(h)) * sp; c.speed = sp; c.ai = ai; c.heading = H(h); return c; };
  // one cruiser rams the right rear quarter, two more run ahead on the right to box the car in
  cop(-2.6, 3.4, Math.PI / 2 + 0.3, 39, 'RAMMING'); cop(12, 3.6, Math.PI / 2 - 0.12, 37, 'PURSUIT'); cop(24, 1.6, Math.PI / 2 + 0.08, 36, 'PURSUIT');
  const rb = [cop(40, 3.4, 0.32, 0, 'ROADBLOCK'), cop(42, -3.2, -0.28, 0, 'ROADBLOCK')]; rb.forEach((c) => { c.rbT = 40; });
  { const [x, z] = T(34, 0); createSpikeStrip(x, z, Math.PI / 2, 11); }
  const tc = (key, u, dir, col, spd = 11) => { const c = placeTraffic('z', N, Z0 - u, -dir, key, 'traffic', col); c.nav.spd = spd; return c; };
  tc('tidebus', 24, 1); tc('marlin', 60, -1, 0x2f7fd8, 14); stageMoto(0, 'z', N, Z0 - 16, 1, 2.2, 0.8); stageMoto(1, 'z', N, Z0 - 48, -1, 5.0, 2.2); stageMoto(2, 'z', N, Z0 - 70, 1, 4.2, 1.0); tc('rumble', 100, -1, 0x8fd3c8); tc('pico', 128, 1, 0xff8a3d); tc('tupelo', 84, 1, 0xf6c21c); tc('hawke', 120, -1, 0xe9c46a);
  [[12, -1, -1], [26, -1, 1], [42, -1, -1], [6, 1, 1], [20, 1, -1], [40, 1, 1], [58, -1, -1], [-2, -1, 1], [9, -1, -1], [15, 1, -1], [30, 1, 1], [34, -1, 1]].forEach(([u, s, d], i) => { const a = spawnPed('z', N, Z0 - u, s, -d); if (i % 2 === 0) { a.scared = 6; a.nav.dir = -d; } animateWalk(a.mesh, i * 1.3, i % 2 ? 0.6 : 0.95, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  // beach-goers on the sand turning to watch
  for (const [u, v, yw] of [[14, 16, -1.2], [22, 22, -1.6], [30, 14, -0.9], [18, 28, -1.9], [40, 24, -1.4], [8, 20, -1.0], [48, 32, -1.7]]) { const [x, z] = T(u, v), a = createActor('ped', x, z, randomStyle(rnd), { yaw: yw }); animateWalk(a.mesh, x * 0.7, u % 3 ? 0 : 0.6, false); a.mesh.position.set(x, 0, z); a.mesh.rotation.y = yw; }
  // camera low beside and behind the left rear, looking north-east so the car crosses the frame against the sea and the Causeway
  const [px, pz] = T(-7.4, -3.2), [lx, lz] = T(20, 14.6), camY = 3.1;
  thinPalms(px, pz, 10, 62, 10);
  // AIR-1 side-on in open sky between the city and the first pylon, its searchlight on the car
  { const b = 25 * Math.PI / 180, d = 36, hx = px + Math.sin(b) * d, hz = pz - Math.cos(b) * d; G.heli = createHeli(hx, hz); G.heli.y = 11.5; G.heli.mesh.position.set(hx, 11.5, hz);
    G.heli.mesh.rotation.order = 'YXZ'; G.heli.mesh.rotation.set(0.14, Math.PI - (b + 1.35), 0.16); G.heli.rotor.rotation.y = 0.5; placeCone(G.heli, car.x, car.z); } G.shotLock = true;
  { const [x, z] = T(158, 0.5); addMarker({ x, z, kind: 'obj', label: 'Marina gate', color: 0xffd23c, auto: false }); } setStars(4); G.wanted.heat = 4.3; fakeMission(6, 1, 'Shake Reyne\'s units before the marina gate', 0);
  for (const c of G.cars) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; for (const w of c.mesh.userData.fw || []) w.rotation.y = c.steerA * 0.9; }
  updateSirens(0.1); updateLineOfSight(1);
  // the drift so far: twin skid marks curving in from the right behind the rear wheels; tyre smoke rolls off away from the camera
  for (let k = 0; k < 60; k++) { const q = k / 60, u = -2 - q * 30, v = 1.4 + q * q * 3.5, h = Math.PI / 2 + DRIFT * (1 - q) - 0.15 * q; for (const sg of [-1, 1]) { const [x, z] = T(u + Math.cos(h) * sg * 0.85, v - Math.sin(h) * sg * 0.85); skidMark(x, z, H(h)); } }
  const sn = Math.sin(car.heading), cs = Math.cos(car.heading), rx = car.x - sn * 1.45, rz = car.z - cs * 1.45;
  for (let k = 0; k < 8; k++) { const back = k * 0.55; particle({ x: rx + 1.2 + back * 0.5, y: 0.3 + k * 0.06, z: rz + 0.8 + back, life: 1.4, size: 0.8 + k * 0.2, color: 0xfff0e4, hdr: 1.3, op: 0.3 - k * 0.025, tex: 'puff' }); }
  for (let k = 0; k < 6; k++) particle({ x: car.x - sn * 2.55, y: 0.33, z: car.z - cs * 2.55 + k * 0.35, life: 0.3, size: 0.8 - k * 0.08, color: 0x7fc8ff, add: true, hdr: 1.6 });
  // the ram: sparks where the cruiser's push bar meets the right rear quarter
  { const hx = rx + 0.9, hz = rz + 0.4; sparks(hx, 0.7, hz, 30); sparks(hx, 0.55, hz, 16); particle({ x: hx, y: 0.75, z: hz, life: 1, size: 1.8, color: 0xffc070, add: true }); }
  G.money = 48000; api.updateHud(0.016); popup('DRIFT x3', 150, 'drift'); popup('NEAR MISS', 100, 'near');
  say({ who: 'sol', text: 'Dex sold us out! Spikes ahead: hit the nitro and thread the gap!' }); typed();
  G.exposure = 1.05; if (G.post) Object.assign(G.post.params, { bloom: 0.3, threshold: 1.25, vignette: 0.3 });
  G.shotCam = { pos: [px, camY, pz], look: [lx, 0.9, lz], fov: 54, roll: 0.025 };
  const rim = new THREE.PointLight(0xffe0c0, 50, 14, 1.6); { const [x, z] = T(-3, -2); rim.position.set(x, 3.2, z); } G.scene.add(rim);
  finish(api); }
// Chapter 2, Collection Day: the Crown envelope stop at the Old Town lagoon market goes loud. Nico fires across the
// turquoise water at SBPD officers on Brandt's payroll on the boardwalk, a car burns at the corner, stallholders run,
// and Crown Tower's gold crest stands over Old Town behind them.
function onfoot(api) {
  const p = G.p, LX = -256, LZ = 192; clearTraffic(); G.mode = 'play'; G.clock = 16.3; G.magicForce = 0.55; G.time = 0.1; G.money = 3240; G.xp = 320; G.radio = 2; G.shotCrisp = true; api.showHud(true); rig.mode = 'auto';
  p.owned = { 0: 1, 1: 1, 2: 1 }; p.ammo = { pistol: 60, smg: 118 }; G.completed = ['m1']; G.territory = null; G.crew = { cd: {} }; p.hp = 72; p.armor = 45; G.camDistAim = 3.4;
  const camYaw = Math.PI - 0.7; p.x = LX - 6; p.z = LZ + 27; p.yaw = Math.PI - 0.36; p.aim = true; selectWeapon(2); G.cam.yaw = camYaw; G.cam.pitch = -0.02;
  animateWalk(p.mesh, 0.6, 0.0, true); p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; setGun(p.mesh, 'smg');
  // a cruiser slewed across the corner road beyond the market, its officers firing from the boardwalk and its door
  const cr = spawnCop(LX + 30, LZ - 6, Math.PI / 2 + 0.5, 'PURSUIT'); cr.speed = 0; cr.vx = cr.vz = 0; cr.deployed = true;
  const DECK = 1.8, cops = [[LX + 2, LZ + 15, DECK], [LX + 16, LZ + 9, DECK], [LX + 28, LZ - 1.5, 0]].map(([x, z, y], i) => { const a = createActor('cop', x, z, STYLES.cop, { yaw: 0 }); animateWalk(a.mesh, i * 2, 0.5, true); setGun(a.mesh, 'pistol'); a.mesh.position.set(x, y, z); a.y = y; a.mesh.rotation.y = Math.atan2(p.x - x, p.z - z) + (i - 1) * 0.08; return a; });
  // the car that caught the stray rounds burns at the north-east corner
  const boom = createCar('rumble', LX + 28.5, LZ + 8, 0.9, 'parked', 0xff8a3d); boom.mesh.position.set(boom.x, 0, boom.z); boom.mesh.rotation.y = boom.heading;
  const tc = (axis, line, t, dir, key, col) => { const c = placeTraffic(axis, line, t, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; c.nav.spd = 0; return c; };
  tc('z', 1, LZ + 60, 1, 'tidebus'); tc('x', 7, LX + 70, -1, 'pico', 0xff4fd8); tc('x', 8, LX + 40, 1, 'tupelo', 0xf6c21c);
  // stallholders and shoppers running off the boardwalks, passers-by fleeing along the sidewalks
  for (const [x, z, yw, y] of [[LX - 4, LZ - 2.5, -2.4, 1.65], [LX - 12, LZ - 2.2, -1.9, 1.65], [LX + 0.4, LZ - 8, 3.0, 1.65], [LX - 14, LZ + 8.5, -2.8, DECK], [LX - 12, LZ + 4.5, -2.2, DECK], [LX + 12, LZ + 8, 2.6, DECK], [LX - 16, LZ + 27, -1.6, 0], [LX + 6, LZ + 27.5, 1.7, 0], [LX + 10, LZ + 28, 1.5, 0]]) {
    const a = createActor('ped', x, z, randomStyle(rnd), { yaw: yw }); a.scared = 6; animateWalk(a.mesh, x * 0.7 + z, 0.95, false); a.mesh.position.set(x, y, z); a.y = y; a.mesh.rotation.y = yw; }
  [[LZ - 20, 1, 1], [LZ - 6, -1, -1], [LZ + 14, 1, 1], [LZ + 2, 1, -1]].forEach(([z, s, d], i) => { const a = spawnPed('z', 1, z, s, d); a.scared = 6; a.nav.dir = d; animateWalk(a.mesh, i * 1.7, 0.95, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  setStars(2); G.wanted.heat = 2.4; fakeMission(1, 0, 'Collect the four Crown envelopes (2/4)', 0); G.mission.collected = 2;
  for (const c of G.cars) { c.mesh.position.set(c.x, c.mesh.position.y, c.z); c.mesh.rotation.y = c.heading; }
  // the wreck has been burning a few seconds: the fireball has rolled away, flames and a lit smoke column remain
  wreck(boom); layoutFloaters(5); for (let k = 0; k < 30; k++) { fire(boom.x, 1.1, boom.z); if (k % 2) fire(boom.x + 0.6, 1.0, boom.z - 0.4); updateEffects(0.05); }
  setStars(2); G.wanted.heat = 2.4; fakeMission(1, 0, 'Collect the four Crown envelopes (2/4)', 0); G.mission.collected = 2; G.toasts.length = 0;
  for (const a of cops) { a.dead = false; a.hp = Math.max(a.hp || 0, 40); }
  G.cars.forEach((c) => { if (c !== boom) { c.dead = false; c.hp = Math.max(c.hp, 400); } });
  updateSirens(0.1); updateLineOfSight(1);
  const gx = p.x + Math.sin(p.yaw) * 1.1, gz = p.z + Math.cos(p.yaw) * 1.1; muzzleFlash(gx, 1.38, gz); thinPalms(p.x - 3.2, p.z + 6.4, 28, 75, 6);
  cops.forEach((c, i) => { const fx = c.x + Math.sin(c.mesh.rotation.y) * 0.7, fz = c.z + Math.cos(c.mesh.rotation.y) * 0.7, fy = c.y + 1.38; muzzleFlash(fx, fy, fz); });
  tracer(gx, 1.38, gz, cops[0].x, DECK + 1.3, cops[0].z); sparks(cops[0].x, DECK + 1.3, cops[0].z, 6); tracer(gx, 1.38, gz, cops[1].x, DECK + 1.2, cops[1].z); sparks(cr.x - 0.5, 0.9, cr.z + 0.9, 10);
  G.shake = 0; G.exposure = 1.12; if (G.post) Object.assign(G.post.params, { bloom: 0.35, threshold: 1.2, vignette: 0.35 });
  // camera low behind Nico's right, Nico full-length on the left third, the market and Crown Tower's crest ahead
  { const b = Math.PI / 180 * 26.6, f = Math.PI / 180 * 40.6, cx = p.x - Math.sin(b) * 7, cz = p.z + Math.cos(b) * 7; G.shotCam = { pos: [cx, 3.4, cz], look: [cx + Math.sin(f) * 40, 3.4 + 40 * Math.tan(0.052), cz - Math.cos(f) * 40], fov: 60 }; }
  rig.mode = 'auto'; finish(api);
  floatText(cops[0].x, DECK + 1.5, cops[0].z, '-34', 'hit'); floatText(cops[1].x, DECK + 1.5, cops[1].z, '-18', 'hit'); layoutFloaters(0); }
// Crew & Chapters screen opened from a ride on The Strand: six chapters done, Dex has turned, Sol's HOT SWAP cooling down.
function crewScreen(api) {
  const p = G.p, done = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; clearTraffic(); G.mode = 'pause'; G.clock = 17.1; G.magicForce = 0.6; G.completed = done; G.territory = null; G.xp = 2200; G.money = 21400; G.crew = { cd: { sol: 18 }, swaps: 1 }; G.wanted.stars = 0;
  const car = createCar('veloce', HALF - 3.4, 40, 0.1, 'parked', 0xd01020); car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  p.x = HALF - 1; p.z = 30; p.yaw = 0.3; G.cam.yaw = Math.PI + 0.5; G.cam.pitch = 0.12; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animateWalk(p.mesh, 0, 0, false);
  const tc = (key, z, dir, col) => { const c = placeTraffic('z', N, z, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; return c; };
  tc('tupelo', 70, 1, 0xf6c21c); tc('pico', 110, -1, 0xff8a3d);
  refreshStartMarker(); G.markers.forEach((m) => { if (m.mesh) m.mesh.visible = false; }); api.showHud(false); rig.mode = 'auto'; G.exposure = 1.2;
  // behind the panels: the Strand at golden hour, the sand, the sea and both Causeway pylons
  G.shotCrisp = true; G.shotCam = { pos: [HALF - 4, 9, 78], look: [HALF + 60, 24, -40], fov: 62 }; thinPalms(HALF - 4, 78, 15, 60, 6);
  for (let i = 0; i < 3; i++) api.renderFrame(true); api.showScreen('crew'); finish(api, 1); }
// Key art: low on the Strand at golden hour looking north-east, the VELOCE GT and Nico in front, the sea gold under the
// low sun and both coral Causeway pylons with their cable fans standing over it.
function title(api) {
  clearTraffic(); seedSave({ v: 1, money: 3240, xp: 520, completed: ['m1', 'm2'], packages: [0, 1, 2, 3, 4, 5, 6, 7], owned: {}, ammo: {}, clock: 17.6, play: 4320, place: 'Palmetto Beach', at: '2026-11-18 17:35' });
  G.mode = 'title'; G.clock = 16.75; G.magicForce = 0.8; G.exposure = 1.3; G.time = 30; rig.mode = 'aerial'; G.wanted.stars = 0; G.shotCrisp = true;
  const C = { x: HALF - 3, z: 112 }, at = (deg, d) => [C.x + Math.sin(deg * Math.PI / 180) * d, C.z - Math.cos(deg * Math.PI / 180) * d];
  const [vx, vz] = at(25, 10), car = createCar('veloce', vx, vz, -0.75, 'parked', 0xd01020); car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  const [nx, nz] = at(41, 5.6), p = G.p; p.x = nx; p.z = nz; p.yaw = -0.35; p.mesh.visible = true; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animateWalk(p.mesh, 0, 0, false);
  const tc = (key, z, dir, col) => { const c = placeTraffic('z', N, z, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; return c; };
  tc('tidebus', 70, 1); tc('rumble', 40, -1, 0x8fd3c8); tc('pico', -10, 1, 0xff8a3d); tc('hawke', 20, -1, 0xf0f0f0);
  [[88, 1, 1], [72, 1, -1], [60, -1, 1], [50, 1, 1], [30, -1, -1]].forEach(([z, sd, d], i) => { const a = spawnPed('z', N, z, sd, d); animateWalk(a.mesh, i * 1.3, 0.6, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  thinPalms(C.x, C.z, 16, 72, 10);
  // sunlit foreground: a warm low key from the sea side washes the near asphalt, the car and Nico in late sun
  const key = new THREE.SpotLight(0xffc27e, 1200, 90, 0.5, 0.7, 1.6); key.position.set(HALF + 18, 16, 128); key.target.position.set(HALF - 1, 0, 102); G.scene.add(key, key.target);
  if (G.roadMat) G.roadMat.color.setRGB(1.45, 1.22, 1.0); if (G.post) G.post.params.vignette = 0.3;
  { const [tx, tz] = at(27, 40); G.titleCam = { x: C.x, y: 1.5, z: C.z, tx, ty: 6.6, tz }; }
  api.showHud(false); api.showScreen('title'); finish(api, 2); }

export async function runShot(name, api) {
  G.shot = name; ({ '1-chase': chase, '2-onfoot': onfoot, '3-crew': crewScreen, '4-title': title }[name] || title)(api);
  {
    const c = G.renderer.domElement, img = new Image(); img.id = 'shotImg'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:0';
    img.src = c.toDataURL('image/jpeg', 0.93); await img.decode(); c.style.display = 'none'; document.body.insertBefore(img, document.getElementById('hud'));
  }
  document.title = 'SHOT_READY';
}

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
import { muzzleFlash, tracer, sparks, smoke, particle, splash, updateSirens, floatText, layoutFloaters, skidMark, updateEffects, explosion, fire } from '../combat/effects.js';
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
import { createBoat, enterBoat, updateBoats, sinkBoat } from '../vehicles/boats.js';
import { boatShot } from '../combat/boatGunfight.js';
import { mooredSpeedboat } from '../missions/ledgerHeist.js';
import { DROP, MARINA_GATE, YACHT } from '../world/marina.js';

function clearTraffic() { for (const c of G.cars.slice()) if (c.kind === 'traffic' || c.kind === 'parked') removeCar(c); for (const a of G.actors.slice()) removeActor(a); }
function fakeMission(idx, stageIdx, text, timer) {
  const def = MISSIONS[idx]; G.mission = { def, idx: stageIdx, stage: def.stages[stageIdx], timer, total: def.stages.length, text, enemies: [], car: null, collected: 0 };
}
function finish(api, frames = 2) { G.hudRate = 1; const gl0 = G.renderer.getContext();  for (let i = 0; i < frames; i++) { G.hudRate = 1; api.updateHud(0.016); api.renderFrame(true); gl0.finish(); gl0.readPixels(0, 0, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, new Uint8Array(4)); } { const px = new Uint8Array(4); gl0.readPixels(640, 700, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, px); const p2 = new Uint8Array(4); gl0.readPixels(640, 100, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, p2); document.body.dataset.px = px.join(',') + '/' + p2.join(','); } { const c = G.renderer.domElement, r = c.getBoundingClientRect(); document.body.dataset.sz = [c.width, c.height, r.x, r.y, r.width, r.height, innerWidth, innerHeight, devicePixelRatio, getComputedStyle(c).display, getComputedStyle(c).visibility].join(','); } document.body.dataset.cam = [G.camera.position.x, G.camera.position.y, G.camera.position.z, G.p.x, G.p.z, G.camera.fov].map((v) => v.toFixed(1)).join(',') + ' lost=' + G.renderer.getContext().isContextLost() + ' err=' + G.renderer.getContext().getError() + ' calls=' + G.renderer.info.render.calls + ' tris=' + G.renderer.info.render.triangles; if (location.search.includes('overlay')) api.showScreen('pause'); if (location.search.includes('nohud')) document.getElementById('hud').style.display = 'none'; }
function typed() { dlg.t = 99; }

// Hide the palms inside a bearing window seen from (cx, cz) so they frame a landmark instead of covering it.
function thinPalms(cx, cz, b0, b1, minD) {
  const pp = G.palmProps; if (!pp) return; const m = new THREE.Matrix4().makeScale(0, 0, 0);
  pp.list.forEach((it, i) => { const dx = it.x - cx, dz = it.z - cz, b = Math.atan2(dx, -dz) * 180 / Math.PI; if (b > b0 && b < b1 && Math.hypot(dx, dz) > minD) pp.mesh.setMatrixAt(i, m); });
  pp.mesh.instanceMatrix.needsUpdate = true;
}
// Cover: the blaze on the Crown Heights palm boulevard. The VELOCE GT drifts nose-left on nitro straight at the low sun and
// the coral Causeway pylon, an SBPD cruiser sideswiping its left front in a spray of sparks, another chasing on the right,
// a third wrecked and burning on the kerb, AIR-1 low overhead with its searchlight on the car.
// Staging numbers in the avenue's frame: u metres east (forward), v metres south (to the right of the camera).
const COVER = { clock: 17.62, drift: 0.62, car: [0, 1.75], cam: [-8.0, 1.5, 1.75], look: [40, 0.9, 2.75], fov: 45, roll: 0.035,
  rammer: [3.4, -2.5, -0.62], second: [9, 4.8, -0.05], burner: [22, 6.4, 0.9], heli: [22, -3.0, 9.8], spot: [7, -1.2], roadblock: 166 };
function chase(api) {
  const p = G.p, C = COVER, X0 = 112, ZA = lineCoord(3), T = (u, v) => [X0 + u, ZA + v], H = (d) => Math.PI / 2 + d; clearTraffic();
  G.mode = 'play'; G.clock = C.clock; G.magicForce = 1; G.time = 12; G.money = 48250; G.xp = 760; G.radio = 1; G.shotCrisp = true; api.showHud(true);
  const [cx, cz] = T(C.car[0], C.car[1]), car = createCar('veloce', cx, cz, H(C.drift), 'parked', 0xd01020); enterCar(car); car.vx = 41; car.vz = -2; car.speed = 41; car.steerA = 0.4; car.input.throttle = 1;
  car.hp = car.maxHp * 0.68; car.nitro = 0.58; car.boosting = true; p.x = car.x; p.z = car.z; p.hp = 86; p.armor = 60; p.weapon = 2; p.owned = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }; p.ammo = { pistol: 84, smg: 210, shotgun: 24, molotov: 3 };
  // same story moment as the Crew & Chapters shot: six chapters done (Dex has turned), chapter 7 in progress
  G.completed = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; G.territory = null; G.crew = { cd: { sol: 22 }, swaps: 1 };
  const cop = ([u, v, d], sp, ai) => { const [x, z] = T(u, v), c = spawnCop(x, z, H(d), ai); c.vx = Math.sin(H(d)) * sp; c.vz = Math.cos(H(d)) * sp; c.speed = sp; c.ai = ai; return c; };
  const rammer = cop(C.rammer, 40, 'RAMMING'); cop(C.second, 39, 'PURSUIT'); const burner = cop(C.burner, 0, 'PURSUIT');
  for (const v of [-4.2, 4.2]) cop([C.roadblock, v, v > 0 ? 2.2 : -2.2], 0, 'ROADBLOCK').rbT = 40; // the roadblock waiting where the boulevard meets the Strand
  const tc = (key, u, dir, col, spd = 11) => { const [x, z] = T(u, 0), c = placeTraffic('x', 3, x, dir, key, 'traffic', col); c.nav.spd = spd; return c; };
  tc('tidebus', 70, -1); tc('pico', 120, -1, 0xff8a3d); tc('tupelo', 150, 1, 0xf6c21c); stageMoto(0, 'x', 3, X0 + 52, -1, 3.0, 0.8);
  for (const c of G.cars) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; for (const w of c.mesh.userData.fw || []) w.rotation.y = c.steerA * 0.9; }
  // the third cruiser lost it on the kerb: wrecked, nose up on the palm planter, and it just went up (the real wreck + explosion)
  burner.mesh.rotation.z = 0.22; burner.mesh.position.y = 0.35; wreck(burner);
  for (let i = 0; i < 9; i++) { G.time += 1 / 60; updateEffects(1 / 60); if (i % 3 === 0) fire(burner.x, 1.2, burner.z); }
  for (let i = 0; i < 4; i++) fire(burner.x, 1.4, burner.z);
  // AIR-1 low over the boulevard, nose swinging toward the camera, searchlight on the road beside the car
  { const [hx, hz] = T(C.heli[0], C.heli[1]); G.heli = createHeli(hx, hz); G.heli.y = C.heli[2]; G.heli.mesh.position.set(hx, C.heli[2], hz);
    G.heli.mesh.rotation.order = 'YXZ'; G.heli.mesh.rotation.set(0.12, Math.PI / 2 + 0.75, 0.18); G.heli.rotor.rotation.y = 0.5; const [sx, sz] = T(C.spot[0], C.spot[1]); placeCone(G.heli, sx, sz); } G.shotLock = true;
  { const { x, z } = MARINA_GATE; addMarker({ x, z, kind: 'obj', label: 'Marina gate', color: 0xffd23c, auto: false }); } setStars(4); G.wanted.heat = 4.3; fakeMission(6, 1, MISSIONS[6].stages[1].text, 0);
  updateSirens(0.1); updateLineOfSight(1);
  // the drift so far: twin skid marks behind the rear wheels; thick tyre smoke rolling back off them
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading), rx = car.x - fx * 1.45, rz = car.z - fz * 1.45;
  for (let k = 0; k < 50; k++) { const q = k / 50, [x, z] = T(C.car[0] - 1.6 - q * 34, C.car[1] + q * q * 2.5); for (const sg of [-1, 1]) skidMark(x - Math.sin(C.drift * (1 - q)) * sg * 0.4, z + sg * 0.85, H(C.drift * (1 - q))); }
  for (let k = 0; k < 16; k++) { const b = k * 0.55; for (const sg of [-1, 1]) particle({ x: rx - b * 0.9 + sg * fz * 0.9, y: 0.4 + k * 0.07, z: rz + sg * -fx * 0.9 + b * (0.35 + sg * 0.15), life: 1.5, size: 1.2 + k * 0.32, color: 0xfff2e6, hdr: 1.25, op: 0.5 - k * 0.026, tex: 'puff' }); }
  // nitro: blue-white exhaust flame
  for (let k = 0; k < 6; k++) particle({ x: car.x - fx * (2.5 + k * 0.3), y: 0.36, z: car.z - fz * (2.5 + k * 0.3), life: 0.3, size: 0.85 - k * 0.09, color: 0x7fc8ff, add: true, hdr: 1.8 });
  // the sideswipe: sparks where the cruiser's push bar grinds the left front wing (stepped a few frames so they streak out)
  { const hx = (car.x + fx * 1.4 + rammer.x) / 2, hz = (car.z + fz * 1.4 + rammer.z) / 2; sparks(hx, 0.7, hz, 34); for (let i = 0; i < 3; i++) { G.time += 1 / 60; updateEffects(1 / 60); sparks(hx, 0.7, hz, 14); }
    particle({ x: hx, y: 0.75, z: hz, life: 1, size: 2.2, color: 0xffc070, add: true, hdr: 1.6 }); }
  G.money = 47995; api.updateHud(0.016); popup('DRIFT x4', 180, 'drift'); popup('TRADE PAINT', 75, 'ram');
  say({ who: 'sol', text: 'Dex sold us out! Cut down to the Strand and floor it for the marina gate!' }); typed();
  G.exposure = 1.08; if (G.post) Object.assign(G.post.params, { bloom: 0.5, threshold: 1.05, vignette: 0.42 });
  const [px, pz] = T(C.cam[0], C.cam[1]), [lx, lz] = T(C.look[0], C.look[1]); G.shotCam = { pos: [px, C.cam[2], pz], look: [lx, C.look[2], lz], fov: C.fov, roll: C.roll };
  const rim = new THREE.PointLight(0xffb070, 140, 12, 1.4); { const [x, z] = T(0.5, -2.6); rim.position.set(x, 2.4, z); } G.scene.add(rim);
  finish(api); }
// Chapter 7, The Ledger: Nico runs the stolen ledger out of Marina Cala in the Skipjack speedboat, banking hard with a
// white wake curling back past Brandt's yacht, the CROWN JEWEL, and an SBPD harbour launch on his tail.
// The boats are driven by the real boat physics and pursuit AI for a few seconds so the wake and spray are genuine.
function boatRun(api) {
  const p = G.p; clearTraffic(); G.mode = 'play'; G.clock = 17.2; G.magicForce = 0.7; G.time = 5; G.money = 31650; G.xp = 1900; G.radio = 1; G.shotCrisp = true; api.showHud(true); rig.mode = 'auto';
  G.completed = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; G.territory = null; G.crew = { cd: { wren: 12 }, swaps: 1 };
  p.hp = 78; p.armor = 40; p.weapon = 2; p.owned = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }; p.ammo = { pistol: 72, smg: 180, shotgun: 18, molotov: 2 };
  const S = SHOT2, b = mooredSpeedboat(); b.x = S.start[0]; b.z = S.start[1]; b.heading = S.start[2]; b.vx = Math.sin(b.heading) * S.v0; b.vz = Math.cos(b.heading) * S.v0; enterBoat(b); b.input.throttle = 1;
  const launches = S.launches.map(([x, z, h]) => { const l = createBoat('patrol', x, z, h, 'ai'); l.driver = 'ai'; l.vx = Math.sin(h) * 26; l.vz = Math.cos(h) * 26; return l; });
  for (let i = 0; i < S.steps; i++) { b.input.steer = i > S.turnAt ? S.steer : 0; b.input.hand = i > S.turnAt ? 1 : 0; G.time += 1 / 60; updateBoats(1 / 60); updateEffects(1 / 60); }
  p.x = b.x; p.z = b.z; setStars(3); G.wanted.heat = 3.2; fakeMission(6, 6, 'Outrun the harbour launches: run the ledger to Sol at the Point Wren light', 0);
  addMarker({ x: DROP.x, z: DROP.z, kind: 'obj', label: 'Point Wren light', color: 0xffd23c, auto: false });
  say({ who: 'sol', text: 'Harbour launches off your stern! Hug the Causeway pylons, they turn like bathtubs.' }); typed();
  // the lead launch closes in on Nico's stern quarter; a few more real steps lay its own wake while Nico straightens up
  const fwd = () => [Math.sin(b.heading), Math.cos(b.heading), Math.cos(b.heading), -Math.sin(b.heading)], c = S.cam;
  { const l = launches[0], [fx, fz, rx, rz] = fwd(), [bk, sd] = S.lead; l.x = b.x - fx * bk + rx * sd; l.z = b.z - fz * bk + rz * sd; l.heading = b.heading + 0.15; l.vx = Math.sin(l.heading) * 29; l.vz = Math.cos(l.heading) * 29; l.trail = []; }
  b.input.steer = 0; b.input.hand = 0; for (let i = 0; i < S.settle; i++) { G.time += 1 / 60; updateBoats(1 / 60); updateEffects(1 / 60); } p.x = b.x; p.z = b.z;
  // the gunfight (combat/boatGunfight.js): Nico's rounds have just holed the second launch's fuel tank and it goes up beside
  // the wake; the lead launch's bow gunner walks a burst across the water at the Skipjack while Nico fires back over the stern
  { const l = launches[1], [fx, fz, rx, rz] = fwd(), [bk, sd] = S.blast; l.x = b.x - fx * bk + rx * sd; l.z = b.z - fz * bk + rz * sd; l.heading = b.heading - 0.5; l.mesh.position.set(l.x, 0, l.z); l.mesh.rotation.y = l.heading; l.trail = []; sinkBoat(l); }
  const lead = launches[0], bow = () => [lead.x + Math.sin(lead.heading) * 3.6, 1.9, lead.z + Math.cos(lead.heading) * 3.6];
  for (let i = 0; i < 12; i++) { G.time += 1 / 60; updateEffects(1 / 60); if (i % 3 === 0) { boatShot(...bow(), b, 3.2, 0); { const a = Math.random() * 6.283, r = 4.5 + Math.random() * 4; splash(b.x + Math.cos(a) * r, b.z + Math.sin(a) * r); } } }
  for (let k = 0; k < 2; k++) { boatShot(...bow(), b, 2.4, 0); boatShot(b.x, 1.7, b.z, lead, 2, 0); }
  // camera ahead of the bow and off to one side, looking back past the boat toward the yacht at Marina Cala
  { const [fx, fz, rx, rz] = fwd(); G.shotCam = { pos: [b.x + fx * c.f + rx * c.r, c.h, b.z + fz * c.f + rz * c.r], look: [b.x + (YACHT.x - b.x) * c.k + rx * c.lr, c.ly, b.z + (YACHT.z - b.z) * c.k + rz * c.lr], fov: c.fov, roll: c.roll }; }
  G.exposure = 1.1; if (G.post) Object.assign(G.post.params, { bloom: 0.3, threshold: 1.25, vignette: 0.3 });
  finish(api); }
// staging numbers for the boat run (start x, z, heading, speed; steps of 1/60 s; when the hard turn starts; camera offsets in the boat's frame)
const SHOT2 = { start: [414, -204, 0.6], v0: 26, steps: 100, turnAt: 70, steer: -0.6, launches: [[409, -226, 0.5], [426, -236, 0.4]],
  lead: [12, 7], blast: [12, -6.5], settle: 30, cam: { f: 7.4, r: 3.4, h: 2.7, k: 0.1, lr: 4.2,  ly: 2.0, fov: 56, roll: -0.02 } };
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
  G.mode = 'title'; G.clock = 17.5; G.magicForce = 1; G.exposure = 1.15; G.time = 30; rig.mode = 'aerial'; G.wanted.stars = 0; G.shotCrisp = true;
  const C = { x: HALF - 3, z: -30 }, at = (deg, d) => [C.x + Math.sin(deg * Math.PI / 180) * d, C.z - Math.cos(deg * Math.PI / 180) * d];
  const [vx, vz] = at(58, 10), car = createCar('veloce', vx, vz, 0.15, 'parked', 0xd01020); car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  const [nx, nz] = at(67, 6.4), p = G.p; p.x = nx; p.z = nz; p.yaw = -1.25; p.mesh.visible = true; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animateWalk(p.mesh, 0, 0, false);
  const tc = (key, z, dir, col) => { const c = placeTraffic('z', N, z, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; return c; };
  tc('tidebus', -60, 1); tc('rumble', -10, -1, 0x8fd3c8); tc('pico', 40, 1, 0xff8a3d); tc('hawke', 10, -1, 0xf0f0f0);
  [[-52, 1, 1], [-64, 1, -1], [-40, -1, 1], [-12, 1, 1], [0, -1, -1]].forEach(([z, sd, d], i) => { const a = spawnPed('z', N, z, sd, d); animateWalk(a.mesh, i * 1.3, 0.6, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  thinPalms(C.x, C.z, 40, 100, 8);
  // sunlit foreground: a warm low key from the sea side washes the near asphalt, the car and Nico in late sun
  const key = new THREE.SpotLight(0xffc27e, 1200, 90, 0.5, 0.7, 1.6); key.position.set(HALF + 20, 14, -18); key.target.position.set(HALF + 2, 0, -36); G.scene.add(key, key.target);
  const fill = new THREE.PointLight(0xffc89a, 26, 14, 1.5); fill.position.set(C.x + 1.5, 2.6, C.z + 1.5); G.scene.add(fill); // warm bounce on Nico's face and the car's flank
  if (G.roadMat) G.roadMat.color.setRGB(1.45, 1.22, 1.0); if (G.post) G.post.params.vignette = 0.3;
  { const [tx, tz] = at(62, 40); G.titleCam = { x: C.x, y: 1.5, z: C.z, tx, ty: 7.4, tz }; }
  api.showHud(false); api.showScreen('title'); finish(api, 2); }

export async function runShot(name, api) {
  G.shot = name; ({ '1-chase': chase, '2-boat': boatRun, '3-crew': crewScreen, '4-title': title }[name] || title)(api);
  {
    const c = G.renderer.domElement, img = new Image(); img.id = 'shotImg'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:0';
    img.src = c.toDataURL('image/jpeg', 0.93); await img.decode(); c.style.display = 'none'; document.body.insertBefore(img, document.getElementById('hud'));
  }
  document.title = 'SHOT_READY';
}

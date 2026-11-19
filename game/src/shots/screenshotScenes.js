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
import { fire as shootRay } from '../combat/projectiles.js';
import { WEAPONS } from '../combat/weapons.js';
import { BOTTLES, updateGasBottles } from '../combat/gasBottles.js';
import { MARKET_ROAD, KINGS_SPOTS } from '../missions/storyMissions.js';
import { WORKSHOP } from '../world/wrenGarage.js';
import { WREN_GARAGE } from '../shop/garageShop.js';

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
// Cover: the blaze on The Strand. The VELOCE GT drifts nose-left on nitro up the beach road, an SBPD cruiser sideswiping its
// left front in a spray of sparks, another chasing ahead on the right, a third wrecked and burning on the kerb, AIR-1 low
// overhead in profile with its nose searchlight on the road. The camera looks north-north-east past the car so the coral
// Causeway pylon and both of its cable fans stand clear over the sea against the blazing sky (beach palms in that window hidden).
// Staging numbers in the Strand's frame: u metres north (forward), v metres east (to the right of the camera).
// Planned by projecting the key points: car centre-left low (x 350-890), pylon top at x~800 y~70 between the HUD columns,
// AIR-1 at x~500 y~130 left of the pylon, the cone and its pool on the road left of the car's nose.
const COVER = { clock: 17.62, drift: 0.66, at: [286.5, 192], cam: [-6.57, -0.9, 1.1], look: [32.4, 8.1, 3.6], fov: 46, roll: 0.03,
  rammer: [5.2, -2.3, -0.4], second: [22, 6.5, 0.1], burner: [30, -6, 0.9], heli: [20, 0.5, 9], spot: [18, -4], roadblock: 92, paint: 0xf22a1c };
function chase(api) {
  const p = G.p, C = COVER, [XS, ZS] = C.at, T = (u, v) => [XS + v, ZS - u], H = (d) => Math.PI + d; clearTraffic();
  G.mode = 'play'; G.clock = C.clock; G.magicForce = 1; G.time = 12; G.money = 48250; G.xp = 760; G.radio = 1; G.shotCrisp = true; api.showHud(true);
  const [cx, cz] = T(0, 0), car = createCar('veloce', cx, cz, H(C.drift), 'parked', C.paint); enterCar(car); car.vx = -2; car.vz = -41; car.speed = 41; car.steerA = 0.4; car.input.throttle = 1;
  car.hp = car.maxHp * 0.68; car.nitro = 0.58; car.boosting = true; p.x = car.x; p.z = car.z; p.hp = 86; p.armor = 60; p.weapon = 2; p.owned = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }; p.ammo = { pistol: 84, smg: 210, shotgun: 24, molotov: 3 };
  // chapter 7 in progress: six chapters done (Dex has turned)
  G.completed = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; G.territory = null; G.crew = { cd: { sol: 22 }, swaps: 1 };
  const cop = ([u, v, d], sp, ai) => { const [x, z] = T(u, v), c = spawnCop(x, z, H(d), ai); c.vx = Math.sin(H(d)) * sp; c.vz = Math.cos(H(d)) * sp; c.speed = sp; c.ai = ai; return c; };
  const rammer = cop(C.rammer, 40, 'RAMMING'); cop(C.second, 39, 'PURSUIT'); const burner = cop(C.burner, 0, 'PURSUIT');
  for (const v of [-3.2, 5.2]) cop([C.roadblock, v, v > 1 ? 2.2 : -2.2], 0, 'ROADBLOCK').rbT = 40; // the roadblock waiting at the next junction up the Strand
  const tc = (key, u, dir, col, spd = 11) => { const c = placeTraffic('z', N, ZS - u, dir, key, 'traffic', col); c.nav.spd = spd; return c; };
  tc('tidebus', 72, 1); tc('pico', 120, -1, 0xff8a3d); tc('tupelo', 150, 1, 0xf6c21c); stageMoto(0, 'z', N, ZS - 52, -1, 3.0, 0.8);
  for (const c of G.cars) { c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; for (const w of c.mesh.userData.fw || []) w.rotation.y = c.steerA * 0.9; }
  // the third cruiser lost it on the kerb: wrecked, nose up on the palm planter, and it just went up (the real wreck + explosion)
  burner.mesh.rotation.z = 0.22; burner.mesh.position.y = 0.35; wreck(burner);
  for (let i = 0; i < 9; i++) { G.time += 1 / 60; updateEffects(1 / 60); if (i % 3 === 0) fire(burner.x, 1.2, burner.z); }
  for (let i = 0; i < 10; i++) fire(burner.x, 1.4 + i * 0.25, burner.z);
  // AIR-1 low over the Strand in near profile, nose to the left and a little toward the camera, searchlight on the road ahead of the car
  { const [hx, hz] = T(C.heli[0], C.heli[1]); G.heli = createHeli(hx, hz); G.heli.y = C.heli[2]; G.heli.mesh.position.set(hx, C.heli[2], hz);
    G.heli.mesh.rotation.order = 'YXZ'; G.heli.mesh.rotation.set(0.1, -1.22, 0.08); G.heli.rotor.rotation.y = 0.5; const [sx, sz] = T(C.spot[0], C.spot[1]); placeCone(G.heli, sx, sz); } G.shotLock = true;
  { const { x, z } = MARINA_GATE; addMarker({ x, z, kind: 'obj', label: 'Marina gate', color: 0xffd23c, auto: false }); } setStars(4); G.wanted.heat = 4.3; fakeMission(6, 1, MISSIONS[6].stages[1].text, 0);
  updateSirens(0.1); updateLineOfSight(1);
  // the drift so far: twin skid marks behind the rear wheels; thick tyre smoke rolling back off them
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading), rx = car.x - fx * 1.45, rz = car.z - fz * 1.45;
  for (let k = 0; k < 50; k++) { const q = k / 50; for (const sg of [-1, 1]) { const [sx, sz] = T(-1.6 - q * 34 - Math.sin(C.drift * (1 - q)) * sg * 0.4, q * q * 2.5 + sg * 0.85); skidMark(sx, sz, H(C.drift * (1 - q))); } }
  for (let k = 0; k < 6; k++) { const b = k * 0.55; for (const sg of [-1, 1]) particle({ x: rx - b * 0.9 + sg * fz * 0.9, y: 0.4 + k * 0.07, z: rz + sg * -fx * 0.9 + b * (0.35 + sg * 0.15), life: 1.5, size: 1.1 + k * 0.3, color: 0xfff2e6, hdr: 1.1, op: 0.26 - k * 0.03, tex: 'puff' }); } // kept short of the lens
  // nitro: blue-white exhaust flame
  for (let k = 0; k < 7; k++) particle({ x: car.x - fx * (2.45 + k * 0.32), y: 0.38, z: car.z - fz * (2.45 + k * 0.32), life: 0.3, size: 1.05 - k * 0.1, color: k < 2 ? 0xe8f6ff : 0x7fc8ff, add: true, hdr: 2.4 });
  // the sideswipe: sparks where the cruiser's push bar grinds the left front wing (stepped a few frames so they streak out)
  { const hx = (car.x + fx * 1.4 + rammer.x) / 2, hz = (car.z + fz * 1.4 + rammer.z) / 2; sparks(hx, 0.7, hz, 40); for (let i = 0; i < 3; i++) { G.time += 1 / 60; updateEffects(1 / 60); sparks(hx, 0.7, hz, 18); }
    particle({ x: hx, y: 0.75, z: hz, life: 1, size: 1.2, color: 0xffc070, add: true, hdr: 1.6 }); }
  G.money = 47995; api.updateHud(0.016); popup('DRIFT x4', 180, 'drift'); popup('TRADE PAINT', 75, 'ram');
  say({ who: 'sol', text: 'Dex sold us out! Stay on the Strand and floor it for the marina gate!' }); typed();
  G.exposure = 1.05; if (G.post) Object.assign(G.post.params, { bloom: 0.32, threshold: 1.3, vignette: 0.38 }); // crisp: bloom only on the hot spots
  const [px, pz] = T(C.cam[0], C.cam[1]), [lx, lz] = T(C.look[0], C.look[1]); G.shotCam = { pos: [px, C.cam[2], pz], look: [lx, C.look[2], lz], fov: C.fov, roll: C.roll };
  const rim = new THREE.PointLight(0xffb070, 160, 12, 1.4); { const [x, z] = T(0.5, -2.6); rim.position.set(x, 2.4, z); } G.scene.add(rim);
  // warm bounce off the sunlit asphalt onto the tail and right flank, so the paint reads glossy coral instead of backlit dark
  const fill = new THREE.PointLight(0xffc89a, 35, 13, 1.3); { const [x, z] = T(-4.2, 3.6); fill.position.set(x, 2.6, z); } G.scene.add(fill);
  { const [x, z] = T(C.cam[0], C.cam[1]); thinPalms(x, z, 6, 48, 3); thinPalms(x, z, -14, 2, 14); } // beach and kerb palms would cover the pylon, its fans and AIR-1
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
  p.x = b.x; p.z = b.z; setStars(4); G.wanted.heat = 4.2; fakeMission(6, 6, 'Outrun the harbour launches: run the ledger to Sol at the Point Wren light', 0);
  addMarker({ x: DROP.x, z: DROP.z, kind: 'obj', label: 'Point Wren light', color: 0xffd23c, auto: false });
  say({ who: 'sol', text: 'Harbour launches off your stern! Hug the Causeway pylons, they turn like bathtubs.' }); typed();
  // the lead launch closes in on Nico's stern quarter; a few more real steps lay its own wake while Nico straightens up
  const fwd = () => [Math.sin(b.heading), Math.cos(b.heading), Math.cos(b.heading), -Math.sin(b.heading)], c = S.cam;
  { const l = launches[0], [fx, fz, rx, rz] = fwd(), [bk, sd] = S.lead; l.x = b.x - fx * bk + rx * sd; l.z = b.z - fz * bk + rz * sd; l.heading = b.heading + 0.15; l.vx = Math.sin(l.heading) * 29; l.vz = Math.cos(l.heading) * 29; l.trail = []; }
  b.input.steer = 0; b.input.hand = 0; for (let i = 0; i < S.settle; i++) { G.time += 1 / 60; updateBoats(1 / 60); updateEffects(1 / 60); } p.x = b.x; p.z = b.z;
  // the gunfight (combat/boatGunfight.js): Nico's rounds have just holed the second launch's fuel tank and it goes up beside
  // the wake; the lead launch's bow gunner walks a burst across the water at the Skipjack while Nico fires back over the stern
  { const l = launches[1], [fx, fz, rx, rz] = fwd(), [bk, sd] = S.blast; l.x = b.x - fx * bk + rx * sd; l.z = b.z - fz * bk + rz * sd; l.heading = b.heading - 0.5; l.mesh.position.set(l.x, 0, l.z); l.mesh.rotation.y = l.heading; l.trail = []; sinkBoat(l); }
  for (let i = 0; i < 8; i++) { G.time += 1 / 60; updateEffects(1 / 60); fire(launches[1].x, 1.3 + i * 0.2, launches[1].z); } // the fuel fire roaring up
  const lead = launches[0], bow = () => [lead.x + Math.sin(lead.heading) * 3.6, 1.9, lead.z + Math.cos(lead.heading) * 3.6];
  for (let i = 0; i < 12; i++) { G.time += 1 / 60; updateEffects(1 / 60); if (i % 3 === 0) { boatShot(...bow(), b, 3.2, 0); { const a = Math.random() * 6.283, r = 4.5 + Math.random() * 4; splash(b.x + Math.cos(a) * r, b.z + Math.sin(a) * r); } } }
  { const dx = lead.x - b.x, dz = lead.z - b.z, d = Math.hypot(dx, dz); // Nico's return fire leaves the gun muzzle, held out over the stern toward the launch
    for (let k = 0; k < 2; k++) { boatShot(...bow(), b, 2.4, 0); if (k) boatShot(b.x + dx / d * 1.3, 1.65, b.z + dz / d * 1.3, lead, 2, 0); } }
  // camera ahead of the bow and off to one side, looking back past the boat toward the yacht at Marina Cala
  { const [fx, fz, rx, rz] = fwd(); G.shotCam = { pos: [b.x + fx * c.f + rx * c.r, c.h, b.z + fz * c.f + rz * c.r], look: [b.x + (YACHT.x - b.x) * c.k + rx * c.lr, c.ly, b.z + (YACHT.z - b.z) * c.k + rz * c.lr], fov: c.fov, roll: c.roll }; }
  updateLineOfSight(1); G.exposure = 1.1; if (G.post) Object.assign(G.post.params, { bloom: 0.34, threshold: 1.2, vignette: 0.3 });
  finish(api); }
// Chapter 3, Coral Kings Don't Share: the gunfight on the road along the Old Town lagoon market. Nico fires the SMG from
// the tail of the car he skidded in (parked beside his line of fire so the rounds really reach the cage); his rounds just touched off the gas cage at the market's south landing, and the
// fireball is rolling up over the Coral Kings bunched by the stalls while the others shoot back. Crown Tower stands over
// the stilt market and the lagoon in the low sun. Camera low behind Nico's right shoulder looking east-north-east.
const SHOT3 = { clock: 17.35, cam: [-268, 2.8, 229.8], look: [-248, 3.5, 211.5], fov: 54, nico: [-263.4, 223.6], cover: [-262.0, 225.6, 2.07], ride: [-246.5, 228.6, Math.PI / 2 - 0.3],
  cops: [{ at: [-231, 222.4, -Math.PI / 2 + 0.12], sp: 9, ai: 'PURSUIT' }, { at: [-225.5, 211.5, -2.35], sp: 6, ai: 'PURSUIT' }, { at: [-222, 120, Math.PI], sp: 24, ai: 'ARRIVING' }] };
function marketFight(api) {
  const p = G.p, S = SHOT3; clearTraffic(); G.mode = 'play'; G.clock = S.clock; G.magicForce = 1; G.time = 40; G.money = 6420; G.xp = 380; G.radio = 1; G.shotCrisp = true; api.showHud(true); rig.mode = 'auto';
  G.completed = ['m1', 'm2']; G.territory = null; G.crew = { cd: { wren: 0 }, swaps: 0 };
  p.hp = 64; p.armor = 25; p.owned = { 0: 1, 1: 1, 2: 1 }; p.ammo = { pistol: 46, smg: 142 }; selectWeapon(2);
  const park = (key, [x, z, h], col) => { const c = createCar(key, x, z, h, 'parked', col); c.mesh.position.set(x, 0, z); c.mesh.rotation.y = h; return c; };
  park('pico', S.cover, 0x2fb89a); park('rumble', S.ride, 0xe0409a); // Nico's cover, and the Kings' pink ride
  // the chapter's real kill stage with its four Coral Kings at their spots on the market road
  const M = MISSIONS[2]; fakeMission(2, 1, '', 0); G.mission.enemies = KINGS_SPOTS.map(({ x, z }) => { const a = createActor('gang', x, z, STYLES.coral, {}); a.hp = 70; a.aggro = true; return a; });
  const kings = G.mission.enemies, cage = BOTTLES.reduce((b, o) => (Math.hypot(o.x - MARKET_ROAD.x, o.z - MARKET_ROAD.z) < Math.hypot(b.x - MARKET_ROAD.x, b.z - MARKET_ROAD.z) ? o : b));
  kings.forEach((a, i) => { a.yaw = Math.atan2(S.nico[0] - a.x, S.nico[1] - a.z) + (i - 1.5) * 0.08; a.mesh.position.set(a.x, 0, a.z); a.mesh.rotation.y = a.yaw; setGun(a.mesh, 'pistol'); animateWalk(a.mesh, i, 0, true); });
  // Nico leaning out past the tail of his car, SMG up at the gas cage
  [p.x, p.z] = S.nico; p.y = 0; p.yaw = Math.atan2(cage.x - p.x, cage.z - p.z); p.mesh.visible = true; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animateWalk(p.mesh, 0, 0, true);
  const muzzle = () => ({ x: p.x + Math.sin(p.yaw) * 0.9 + Math.cos(p.yaw) * 0.2, y: 1.35, z: p.z + Math.cos(p.yaw) * 0.9 - Math.sin(p.yaw) * 0.2 });
  const burst = (tx, ty, tz) => { const m = muzzle(), dx = tx - m.x, dy = ty - m.y, dz = tz - m.z, l = Math.hypot(dx, dy, dz); shootRay('player', { ...WEAPONS[2], spread: 0.004 }, m.x, m.y, m.z, dx / l, dy / l, dz / l, m); };
  const step = (n, each) => { for (let i = 0; i < n; i++) { G.time += 1 / 60; updateEffects(1 / 60); updateGasBottles(1 / 60); each?.(i); } };
  // the burst that holes the cage, the cage going up (combat/gasBottles.js: real blast damage), the fireball rolling up
  for (let k = 0; k < 8 && cage.live; k++) { burst(cage.x, cage.y, cage.z); step(4); }
  step(14, (i) => { if (i % 5 === 0) burst(kings[2].x, 1.2, kings[2].z); });
  // the Kings still standing fire back: muzzle flashes and tracers, rounds sparking off Nico's car
  kings.filter((a) => !a.dead).forEach((a) => { const ox = a.x + Math.sin(a.yaw) * 0.6, oz = a.z + Math.cos(a.yaw) * 0.6, dx = p.x - a.x, dz = p.z - a.z, l = Math.hypot(dx, dz);
    shootRay(a, { id: 'pistol', dmg: 0, range: 60, pellets: 1, spread: 0.02 }, ox, 1.4, oz, dx / l, -0.012, dz / l, { x: ox, y: 1.3, z: oz }); });
  step(2); burst(kings[1].x, 1.3, kings[1].z);
  G.mission.text = `${M.stages[1].text} (${kings.filter((a) => !a.dead).length} left)`;
  // the blast brought SBPD: a cruiser braking in along the market road, one skidding out of the cross street behind the
  // Kings, a third still on its way down from Crown Heights (the real dispatch's units, light bars running)
  for (const { at: [x, z, h], sp, ai } of S.cops) { const c = spawnCop(x, z, h, ai); c.vx = Math.sin(h) * sp; c.vz = Math.cos(h) * sp; c.speed = sp; c.steerA = ai === 'PURSUIT' ? -0.5 : 0; c.mesh.position.set(x, 0, z); c.mesh.rotation.y = h; for (const w of c.mesh.userData.fw || []) w.rotation.y = c.steerA * 0.9; }
  { const c = G.cars.find((k) => k.kind === 'cop' && k.ai === 'PURSUIT'); if (c) for (let k = 0; k < 24; k++) for (const sg of [-1, 1]) skidMark(c.x - Math.sin(c.heading) * (1.4 + k * 0.4) + Math.cos(c.heading) * sg * 0.85 + k * k * 0.004, c.z - Math.cos(c.heading) * (1.4 + k * 0.4) - Math.sin(c.heading) * sg * 0.85, c.heading + k * 0.01); }
  setStars(3); G.wanted.heat = 3.3; updateSirens(0.1); updateLineOfSight(1);
  say({ who: 'wren', text: 'Told you they cook on bottled gas. Now SBPD heard it too: drop the last Kings and get out of Old Town!' }); typed();
  G.shotCam = { pos: S.cam, look: S.look, fov: S.fov, roll: -0.02 }; G.exposure = 1.12; if (G.post) Object.assign(G.post.params, { bloom: 0.36, threshold: 1.2, vignette: 0.3 });
  { const [x, , z] = S.cam; thinPalms(x, z, 30, 95, 4); }
  // the low sun is behind the towers: a broad warm bounce from the sunlit lagoon and road lifts the facades and stalls out of silhouette
  { const b = new THREE.DirectionalLight(0xffd2a8, 0.85); b.position.set(S.cam[0] - 40, 30, S.cam[2] + 30); b.target.position.set(S.look[0], 0, S.look[2]); G.scene.add(b, b.target); }
  { const glow = new THREE.PointLight(0xffa860, 120, 22, 1.3); glow.position.set(-248, 5, 216); G.scene.add(glow); } // the festoon strings and the fire washing the kerb
  // warm low sun bounce off the road onto Nico's back and the tail of his car, so he reads as a figure, not a cut-out
  { const fill = new THREE.PointLight(0xffb27a, 140, 11, 1.3); fill.position.set(p.x - 2.4, 2.8, p.z + 3.4); G.scene.add(fill); }
  finish(api); }
// Chapter 7, between stealing Brandt's Veloce and the marina gate: Nico detours into Wren's garage at Point Wren. The car
// rolls onto the lift, the garage screen docks on the right with the tune so far (engine 2, armour 1, nitro 1) as stat
// bars, the next upgrades with their prices and the respray swatches; the avenue glows outside the open front.
function garage(api) {
  const p = G.p; clearTraffic(); G.mode = 'play'; G.clock = 17.45; G.magicForce = 1; G.time = 20; G.money = 18450; G.xp = 1500; G.radio = 1; G.shotCrisp = true; G.wanted.stars = 0;
  G.completed = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; G.territory = null; G.crew = { cd: {}, swaps: 1 }; G.garage = { engine: 2, armour: 1, nitro: 1, color: null };
  p.hp = 100; p.armor = 50; p.owned = { 0: 1, 1: 1, 2: 1, 3: 1 }; p.ammo = { pistol: 90, smg: 160, shotgun: 16 };
  const car = createCar('veloce', WREN_GARAGE.x, WREN_GARAGE.z + 2, Math.PI, 'parked', 0xd01020); enterCar(car); fakeMission(6, 1, MISSIONS[6].stages[1].text, 0);
  { const { x, z } = MARINA_GATE; addMarker({ x, z, kind: 'obj', label: 'Marina gate', color: 0xffd23c, auto: false }); }
  // the avenue outside: traffic both ways and people on the far sidewalk
  const tc = (key, x, dir, col) => { const c = placeTraffic('x', 3, x, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; return c; };
  tc('tidebus', WORKSHOP.x1 + 16, -1); tc('pico', WORKSHOP.x1 + 2, 1, 0xff8a3d); tc('tupelo', WORKSHOP.x1 + 34, 1, 0xf6c21c); tc('hawke', WORKSHOP.x1 + 52, -1, 0x2fd6c4);
  [[WORKSHOP.x1 + 6, 1, 1], [WORKSHOP.x1 + 11, 1, -1], [WORKSHOP.x1 + 22, 1, 1], [WORKSHOP.x1 + 30, -1, -1]].forEach(([x, sd, d], i) => { const a = spawnPed('x', 3, x, sd, d); animateWalk(a.mesh, i * 1.7, 0.6, false); });
  api.showHud(true); G.hooks.openGarage(); G.exposure = 1.2; if (G.post) Object.assign(G.post.params, { bloom: 0.4, threshold: 1.15, vignette: 0.22 });
  finish(api); }
// staging numbers for the boat run (start x, z, heading, speed; steps of 1/60 s; when the hard turn starts; camera offsets in the boat's frame)
const SHOT2 = { start: [414, -204, 0.6], v0: 26, steps: 100, turnAt: 70, steer: -0.6, launches: [[409, -226, 0.5], [426, -236, 0.4], [398, -246, 0.55]],
  lead: [12, 7], blast: [12, -6.5], settle: 30, cam: { f: 6.7, r: 3.1, h: 2.6, k: 0.1, lr: 4.2,  ly: 2.0, fov: 54, roll: -0.02 } };
// Crew & Chapters screen opened from a ride on The Strand: six chapters done, Dex has turned, Sol's HOT SWAP cooling down.
function crewScreen(api) {
  const p = G.p, done = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; clearTraffic(); G.mode = 'pause'; G.clock = 17.1; G.magicForce = 0.6; G.completed = done; G.territory = null; G.xp = 2200; G.money = 21400; G.crew = { cd: { sol: 18 }, swaps: 1 }; G.wanted.stars = 0;
  const car = createCar('veloce', HALF - 3.4, 40, 0.1, 'parked', 0xd01020); car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  p.x = HALF - 1; p.z = 30; p.yaw = 0.3; G.cam.yaw = Math.PI + 0.5; G.cam.pitch = 0.12; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animateWalk(p.mesh, 0, 0, false);
  const tc = (key, z, dir, col) => { const c = placeTraffic('z', N, z, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; return c; };
  tc('tupelo', 70, 1, 0xf6c21c); tc('pico', 110, -1, 0xff8a3d);
  refreshStartMarker(); G.markers.forEach((m) => { if (m.mesh) m.mesh.visible = false; }); api.showHud(false); rig.mode = 'auto'; G.exposure = 1.45;
  // behind the panels: the Strand at golden hour, the sand, the sea and both Causeway pylons
  G.shotCrisp = true; G.shotCam = { pos: [HALF - 4, 9, 78], look: [HALF + 74, 22, -10], fov: 62 }; // turned toward the low sun: the sea and sand glow gold thinPalms(HALF - 4, 78, 15, 60, 6);
  for (let i = 0; i < 3; i++) api.renderFrame(true); api.showScreen('crew'); finish(api, 1); }
// Key art: low on the Strand at golden hour looking north-east, the VELOCE GT and Nico in front, the sea gold under the
// low sun and both coral Causeway pylons with their cable fans standing over it. Camera placed so the sun disc sits in
// the open sky between the near pylon and the far one, just above the deck.
function title(api) {
  clearTraffic(); seedSave({ v: 1, money: 3240, xp: 520, completed: ['m1', 'm2'], packages: [0, 1, 2, 3, 4, 5, 6, 7], owned: {}, ammo: {}, clock: 17.6, play: 4320, place: 'Palmetto Beach', at: '2026-11-18 17:35' });
  G.mode = 'title'; G.clock = 17.0; G.magicForce = 1; G.exposure = 1.22; G.time = 30; rig.mode = 'aerial'; G.wanted.stars = 0; G.shotCrisp = true;
  const C = { x: HALF - 3, z: -10 }, at = (deg, d) => [C.x + Math.sin(deg * Math.PI / 180) * d, C.z - Math.cos(deg * Math.PI / 180) * d];
  const [vx, vz] = at(58, 10), car = createCar('veloce', vx, vz, 0.15, 'parked', COVER.paint); car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  const [nx, nz] = at(67, 6.4), p = G.p; p.x = nx; p.z = nz; p.yaw = -1.25; p.mesh.visible = true; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; animateWalk(p.mesh, 0, 0, false);
  const tc = (key, z, dir, col) => { const c = placeTraffic('z', N, z, dir, key, 'traffic', col); c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading; return c; };
  tc('tidebus', -40, 1); tc('rumble', 10, -1, 0x8fd3c8); tc('pico', 60, 1, 0xff8a3d); tc('hawke', 30, -1, 0xf0f0f0); // z offsets follow C.z + 30
  [[-52, 1, 1], [-64, 1, -1], [-40, -1, 1], [-12, 1, 1], [0, -1, -1]].forEach(([z, sd, d], i) => { const a = spawnPed('z', N, z + C.z + 30, sd, d); animateWalk(a.mesh, i * 1.3, 0.6, false); a.mesh.position.y = 0.25; a.y = 0.25; });
  thinPalms(C.x, C.z, 40, 100, 8);
  // sunlit foreground: a warm low key from the sea side washes the near asphalt, the car and Nico in late sun
  const key = new THREE.SpotLight(0xffc27e, 1200, 90, 0.5, 0.7, 1.6); key.position.set(HALF + 20, 14, -18); key.target.position.set(HALF + 2, 0, -36); G.scene.add(key, key.target);
  const fill = new THREE.PointLight(0xffc89a, 75, 16, 1.4); fill.position.set(C.x + 1.2, 3.0, C.z + 0.8); G.scene.add(fill); // warm bounce on Nico's face and the car's flank
  { const [rx, rz] = at(72, 9.5), rim = new THREE.PointLight(0xffa25a, 70, 7, 1.6); rim.position.set(rx, 2.2, rz); G.scene.add(rim); } // sun-side rim on Nico's shoulders
  { const [gx, gz] = at(50, 7), glow = new THREE.PointLight(0xffb070, 90, 12, 1.5); glow.position.set(gx, 1.2, gz); G.scene.add(glow); } // low warm fill on the road and sand
  if (G.roadMat) G.roadMat.color.setRGB(1.45, 1.22, 1.0); if (G.post) Object.assign(G.post.params, { vignette: 0.16, bloom: 0.5 });
  { const [tx, tz] = at(62, 40); G.titleCam = { x: C.x, y: 1.5, z: C.z, tx, ty: 7.4, tz }; }
  api.showHud(false); api.showScreen('title'); finish(api, 2); }

export async function runShot(name, api) {
  G.shot = name; ({ '1-chase': chase, '2-boat': boatRun, '3-market': marketFight, '4-garage': garage, '3-crew': crewScreen, '4-title': title }[name] || title)(api);
  {
    const c = G.renderer.domElement, img = new Image(); img.id = 'shotImg'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:0';
    img.src = c.toDataURL('image/jpeg', 0.93); await img.decode(); c.style.display = 'none'; document.body.insertBefore(img, document.getElementById('hud'));
  }
  document.title = 'SHOT_READY';
}

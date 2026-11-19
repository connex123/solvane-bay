// ?selftest=1 smoke test: drives the real systems headlessly (enter a car, drive, wanted level and police, mission, shooting,
// helicopter, menus, death and respawn, the chapter 7 yacht and boat run, the chapter 8 Causeway roadblock) and sets the page title to SELFTEST PASS or SELFTEST FAIL.
import { G } from '../core/gameState.js';
import { input } from '../core/input.js';
import { crime } from '../police/wantedSystem.js';
import { MISSIONS } from '../missions/storyMissions.js';
import { startMission } from '../missions/missionRunner.js';
import { lineCoord, LANE } from '../core/config.js';
import { damageCar } from '../vehicles/carPhysics.js';
import { conditionPct } from '../vehicles/vehicleCondition.js';
import { setStars } from '../police/wantedSystem.js';
import { updateLineOfSight } from '../police/lineOfSight.js';
import { ACTS, galaLabel } from '../story/chapterArc.js';
import { shares, holderOf } from '../story/territoryControl.js';
import { isRecruited, useAbility, cooldownLeft } from '../crew/crewAbilities.js';
import { grantMolotovs, activeFirePools } from '../combat/molotov.js';
import { wheel } from '../combat/weaponWheel.js';
import { buyUpgrade, garageLevel } from '../shop/garageShop.js';
import { saveGame, readSave, applySave } from '../save/saveGame.js';
import { setPieceChecks } from './setPieceTest.js';

// Chapters, territory, crew abilities, molotov, weapon wheel, garage and save/load, driven through the real systems.
async function storyDepthChecks(api) {
  const fail = (m) => { throw new Error(m); }, p = G.p, sh0 = shares().tide;
  for (let k = 0; G.mission && k < 10; k++) { G.mission.stageDone = true; api.stepGame(0.016); }
  if (!G.completed.includes('m1')) fail('chapter 1 did not complete');
  if (document.getElementById('chapterCard').classList.contains('hidden') || !document.getElementById('chapterCard').textContent.includes('CHAPTER 1 COMPLETE')) fail('no chapter card');
  if (holderOf('hills') !== 'tide' || !(shares().tide > sh0)) fail('territory did not flip');
  if (!isRecruited('wren') || isRecruited('sol')) fail('crew recruitment');
  if (MISSIONS.length !== 8 || ACTS.length !== 3) fail('arc size');
  if (galaLabel(1) !== 'GALA IN 6 DAYS') fail('gala countdown');
  // PATCH UP
  const car = G.cars.find((c) => c.kind === 'parked' && !c.dead); p.x = car.x + 2; p.z = car.z; input.edge.add('KeyF'); api.stepGame(0.016); input.edge.clear();
  if (!p.car) fail('no car for patch up'); p.car.hp = p.car.maxHp * 0.3; input.edge.add('KeyC'); api.stepGame(0.016); input.edge.clear();
  if (p.car.hp !== p.car.maxHp || !(cooldownLeft('wren') > 0)) fail('PATCH UP');
  // HOT SWAP and BLACKOUT after chapters 4 and 5
  G.completed = ['m1', 'm2', 'm3', 'm4', 'm5']; G.territory = null; const n = G.cars.length; if (!useAbility('sol') || G.cars.length !== n + 1) fail('HOT SWAP');
  setStars(3); if (!useAbility('tamsin') || updateLineOfSight(1) !== false || !(G.blackoutT > 0)) fail('BLACKOUT');
  setStars(0); for (let i = 0; i < 700; i++) api.stepGame(0.016); if (G.blackoutT > 0) fail('blackout did not end: ' + G.mode + ' ' + G.blackoutT);
  // garage upgrade applies to the driven car
  G.money = 20000; if (!buyUpgrade('engine') || garageLevel('engine') !== 1 || !(p.car.pacc > 1)) fail('garage');
  // molotov: thrown on foot, burns a pool
  p.car.speed = 0; p.car.vx = p.car.vz = 0; input.edge.add('KeyF'); api.stepGame(0.016); input.edge.clear(); if (p.car) fail('could not exit');
  grantMolotovs(3); p.weapon = 4; input.leftPressed = true; let pool = false; for (let i = 0; i < 120 && !pool; i++) { api.stepGame(0.016); input.leftPressed = false; pool = activeFirePools() > 0; }
  if (!pool || p.ammo.molotov !== 2) fail('molotov');
  // weapon wheel: hold Tab, tap 2, release
  input.keys.add('Tab'); api.stepGame(0.016); input.edge.add('Digit2'); api.stepGame(0.016); input.edge.clear(); if (!wheel.open) fail('wheel did not open'); input.keys.delete('Tab'); api.stepGame(0.016);
  if (wheel.open || p.weapon !== 1) fail('wheel select');
  // save round-trip
  saveGame(); const s = readSave(); if (!s.territory || s.territory.hills !== 'tide' || !s.garage || s.garage.engine !== 1 || !s.crew || s.ammo.molotov !== 2) fail('save fields ' + JSON.stringify([s.territory, s.garage, s.crew, s.ammo]));
  G.territory = null; G.garage = null; applySave(s); if (holderOf('beach') !== 'tide' || garageLevel('engine') !== 1) fail('load');
  api.showScreen('crew'); if (!document.getElementById('crewBody').textContent.includes('CREW & CHAPTERS')) fail('crew screen'); api.showScreen('garage'); api.handlers.closeShop();
  api.updateHud(0.016); if (document.querySelectorAll('#wbar .wt').length !== 5 || document.querySelectorAll('#crewStack .crewc').length !== 3) fail('HUD weapon bar / crew stack');
  G.completed = ['m1']; G.territory = null;
}
export async function runSelfTest(api) {
  try {
    api.startGame(false); for (let i = 0; i < 90; i++) api.stepGame(0.016);
    const car = G.cars.find((c) => c.kind === 'parked'); G.p.x = car.x + 2; G.p.z = car.z; input.edge.add('KeyF'); api.stepGame(0.016); input.edge.clear();
    if (!G.p.car) throw new Error('could not enter car'); input.keys.add('KeyW'); const x0 = G.p.x, z0 = G.p.z;
    for (let i = 0; i < 360; i++) { if (i === 100) input.keys.add('KeyD'); if (i === 140) input.keys.delete('KeyD'); api.stepGame(0.016); }
    if (!(Math.hypot(G.p.x - x0, G.p.z - z0) > 20)) throw new Error('car did not drive');
    { const c = G.p.car, n0 = c.nitro ?? 1; c.x = -20; c.z = lineCoord(3) + LANE; c.heading = Math.PI / 2; c.steerA = 0; c.vx = Math.sin(c.heading) * 20; c.vz = Math.cos(c.heading) * 20; input.keys.add('ShiftLeft'); for (let i = 0; i < 40; i++) api.stepGame(0.016); input.keys.delete('ShiftLeft');
      if (!(c.nitro < n0 - 0.1)) throw new Error('nitro did not burn'); const hp = c.hp; damageCar(c, 100); if (!(conditionPct(c) < Math.round(hp / c.maxHp * 100))) throw new Error('condition did not drop'); }
    crime('killcop'); crime('killcop'); for (let i = 0; i < 600; i++) api.stepGame(0.016);
    if (G.cars.filter((c) => c.kind === 'cop').length < 1) throw new Error('no police spawned');
    input.keys.delete('KeyW'); startMission(MISSIONS[0]); for (let i = 0; i < 60; i++) api.stepGame(0.016); api.updateHud(0.016); api.renderFrame();
    if (!G.mission || Number.isNaN(G.p.x)) throw new Error('mission/NaN');
    await storyDepthChecks(api);
    await setPieceChecks(api);
    // more systems: on-foot shooting, heli at 5 stars, steal-stage completion, map, radio, shop, flatlined
    input.edge.add('KeyF'); api.stepGame(0.016); input.edge.clear(); G.p.car = G.p.car; if (G.p.car) { G.p.car.speed = 0; G.p.car.vx = 0; G.p.car.vz = 0; input.edge.add('KeyF'); api.stepGame(0.016); input.edge.clear(); }
    G.p.weapon = 1; input.left = true; for (let i = 0; i < 120; i++) { input.leftPressed = i % 10 === 0; api.stepGame(0.016); } input.left = false;
    crime('killcop'); crime('killcop'); crime('killcop'); crime('explosion'); crime('explosion'); for (let i = 0; i < 400; i++) api.stepGame(0.016);
    api.showScreen('cityMap'); api.showScreen('shop'); api.showScreen('pause'); api.handlers.resume(); G.hooks.playerDown('FLATLINED'); for (let i = 0; i < 260; i++) api.stepGame(0.016);
    if (G.mode !== 'play') throw new Error('did not respawn: ' + G.mode); document.title = 'SELFTEST PASS';
  } catch (e) { console.error('CONSOLE_ERROR selftest ' + (e.stack || e)); document.title = 'SELFTEST FAIL ' + e.message; }
}

// ?selftest=1 smoke test: drives the real systems headlessly (enter a car, drive, wanted level and police, mission, shooting,
// helicopter, menus, death and respawn) and sets the page title to SELFTEST PASS or SELFTEST FAIL.
import { G } from '../core/gameState.js';
import { input } from '../core/input.js';
import { crime } from '../police/wantedSystem.js';
import { MISSIONS } from '../missions/storyMissions.js';
import { startMission } from '../missions/missionRunner.js';

export async function runSelfTest(api) {
  try {
    api.startGame(false); for (let i = 0; i < 90; i++) api.stepGame(0.016);
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

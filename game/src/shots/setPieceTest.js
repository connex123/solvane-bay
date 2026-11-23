// Selftest for the two finale set pieces, driven through the real systems: chapter 7 (board the CROWN JEWEL on foot,
// clear the deck, crack the safe, enter / drive / leave the speedboat, chapter card) and chapter 8 (the Causeway
// roadblock: deck height, wall, spikes, AIR-1, ramming the weak point, reaching the Gala, chapter card).
import { G } from '../core/gameState.js';
import { input } from '../core/input.js';
import { MISSIONS } from '../missions/storyMissions.js';
import { startMission } from '../missions/missionRunner.js';
import { SEA_X } from '../core/config.js';
import { YACHT, GANGWAY, SAFE, SPEEDBOAT_BERTH, DROP, surfaceHeight } from '../world/marina.js';
import { WALL_X, FINISH_X, CZ, RAMP_FOOT } from '../missions/causewayRoadblock.js';
import { CAUSEWAY } from '../world/landmarks.js';

const press = (api, k) => { input.edge.add(k); api.stepGame(0.016); input.edge.clear(); };
const steps = (api, n, until) => { for (let i = 0; i < n; i++) { api.stepGame(0.016); if (until && until()) return true; } return false; };
const card = (n) => { const c = document.getElementById('chapterCard'); return !c.classList.contains('hidden') && c.textContent.includes(`CHAPTER ${n} COMPLETE`); };
const stageIs = (i) => G.mission && G.mission.idx === i;
export async function setPieceChecks(api) {
  const fail = (m) => { throw new Error('set piece: ' + m); }, p = G.p;
  if (p.car) { p.car.speed = p.car.vx = p.car.vz = 0; press(api, 'KeyF'); }
  G.mission = null; G.completed = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']; G.territory = null; G.wanted.stars = 0;
  // ---- chapter 7: steal the Veloce, reach the gate, then board the yacht on foot
  startMission(MISSIONS[6]); const M = G.mission; p.x = M.car.x + 2.2; p.z = M.car.z; press(api, 'KeyF'); steps(api, 2);
  if (!stageIs(1)) fail('ch7 steal stage');
  M.stageDone = true; steps(api, 2); p.car.speed = p.car.vx = p.car.vz = 0; press(api, 'KeyF'); if (p.car || !stageIs(2)) fail('ch7 on foot at the marina');
  p.x = GANGWAY.x; p.z = GANGWAY.z; if (!steps(api, 60, () => stageIs(3))) fail('ch7 boarding the yacht');
  p.x = YACHT.x - 12; p.z = YACHT.z + 0.5; steps(api, 2); if (!(Math.abs(p.y - YACHT.deckY) < 0.01) || !(surfaceHeight(p.x, p.z) > 1)) fail('not standing on the yacht deck: ' + p.y);
  const guards = M.enemies; if (guards.length !== 4 || !guards.every((a) => Math.abs(a.y - YACHT.deckY) < 0.3)) fail('deck guards');
  guards.forEach((a) => { a.hp = 0; a.dead = true; }); if (!steps(api, 10, () => stageIs(4))) fail('ch7 deck not cleared');
  p.x = SAFE.x - 1.2; p.z = SAFE.z; if (!steps(api, 30, () => stageIs(5))) fail('ch7 safe / ledger');
  // ---- the speedboat: enter at the pier, drive on water, launches give chase
  p.x = SPEEDBOAT_BERTH.x; p.z = SPEEDBOAT_BERTH.z + 3; press(api, 'KeyF'); if (!p.car?.isBoat) fail('could not enter the speedboat');
  if (!steps(api, 5, () => stageIs(6))) fail('ch7 boat stage'); const boat = p.car, launches = G.boats.filter((b) => b.key === 'patrol');
  if (launches.length < 2) fail('no harbour launches');
  const bx = boat.x, bz = boat.z, l0 = launches.map((l) => [l.x, l.z]); input.keys.add('KeyW'); input.keys.add('KeyD');
  for (let i = 0; i < 150; i++) { if (i === 40) input.keys.delete('KeyD'); api.stepGame(0.016); } input.keys.delete('KeyW');
  if (!(Math.hypot(boat.x - bx, boat.z - bz) > 20) || !(boat.x > SEA_X)) fail(`boat did not drive on water ${boat.x.toFixed(1)},${boat.z.toFixed(1)}`);
  if (!launches.every((l, i) => Math.hypot(l.x - l0[i][0], l.z - l0[i][1]) > 10)) fail('launches did not chase');
  boat.speed = boat.vx = boat.vz = 0; press(api, 'KeyF'); if (!p.car) fail('stepped off a boat in open water');
  // the run ends at the light jetty: chapter complete, then step ashore there
  boat.x = DROP.x; boat.z = DROP.z + 1; if (!steps(api, 30, () => !G.mission)) fail('ch7 drop point');
  if (!G.completed.includes('m7') || !card(7)) fail('chapter 7 card');
  boat.speed = boat.vx = boat.vz = 0; press(api, 'KeyF'); if (p.car || !(surfaceHeight(p.x, p.z) > 0.3)) fail('could not step onto the jetty');
  if (G.boats.some((b) => b.key === 'patrol')) fail('launches not cleared');
  // ---- chapter 8: the van, the on-ramp, the roadblock
  startMission(MISSIONS[7]); const M8 = G.mission; p.x = M8.car.x + 2.2; p.z = M8.car.z; press(api, 'KeyF'); steps(api, 2); if (!stageIs(1) || p.car !== M8.car) fail('ch8 van');
  const van = p.car; van.x = RAMP_FOOT.x; van.z = RAMP_FOOT.z; van.heading = Math.PI / 2; if (!steps(api, 10, () => stageIs(2))) fail('ch8 on-ramp');
  const wall = G.cars.filter((c) => c.kind === 'roadblock'); if (wall.length < 4 || (G.spikes || []).length < 2) fail('roadblock wall / spikes');
  steps(api, 30); if (!G.heli) fail('AIR-1 not overhead, stars ' + G.wanted.stars + ' heat ' + G.wanted.heat + ' mode ' + G.mode); if (!(Math.abs(wall[0].y - CAUSEWAY.deckY) < 0.01)) fail('wall not on the deck');
  van.x = WALL_X - 34; van.z = CZ + 2.9; van.heading = Math.PI / 2; van.steerA = 0; van.vx = 30; van.vz = 0; input.keys.add('KeyW');
  steps(api, 6); if (!(Math.abs(van.y - CAUSEWAY.deckY) < 0.01)) fail('van not on the Causeway deck: ' + van.y);
  if (!steps(api, 200, () => M8.block?.broken)) fail('roadblock did not break');
  if (!steps(api, 600, () => !G.mission)) fail(`did not reach the Gala (van at ${van.x.toFixed(0)} of ${FINISH_X})`);
  input.keys.delete('KeyW'); if (!G.completed.includes('m8') || !card(8)) fail('chapter 8 card');
  if (G.cars.some((c) => c.kind === 'roadblock')) fail('roadblock not cleared');
  van.speed = van.vx = van.vz = 0; press(api, 'KeyF');
  G.mission = null; G.completed = ['m1']; G.territory = null; G.wanted.stars = 0;
}

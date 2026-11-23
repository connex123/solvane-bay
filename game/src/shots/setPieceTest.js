// Self-test for the two finale set pieces, played through the real game systems.
//   Chapter 7: steal the car, walk aboard the CROWN JEWEL, clear the deck guards, crack the safe, take the
//              speedboat out with harbour launches chasing, deliver at the light jetty and step ashore.
//   Chapter 8: the broadcast van up the on-ramp, the roadblock wall and spikes on the deck, AIR-1 overhead,
//              ramming the weak point, reaching the Gala stage.
// Each chapter must end with its chapter-complete card.
import { G } from '../core/gameState.js';
import { input } from '../core/input.js';
import { MISSIONS } from '../missions/storyMissions.js';
import { startMission } from '../missions/missionRunner.js';
import { SEA_X } from '../core/config.js';
import { YACHT, GANGWAY, SAFE, SPEEDBOAT_BERTH, DROP, surfaceHeight } from '../world/marina.js';
import { WALL_X, FINISH_X, CZ, RAMP_FOOT } from '../missions/causewayRoadblock.js';
import { CAUSEWAY } from '../world/landmarks.js';

const STEP = 0.016;

function fail(why) {
  throw new Error('set piece: ' + why);
}

// Press a key for exactly one simulation step.
function tap(api, code) {
  input.edge.add(code);
  api.stepGame(STEP);
  input.edge.clear();
}

// Step up to `count` times; with `until`, stop early and report true once it holds.
function run(api, count, until) {
  for (let i = 0; i < count; i++) {
    api.stepGame(STEP);
    if (until && until()) return true;
  }
  return false;
}

const atStage = (index) => Boolean(G.mission) && G.mission.idx === index;

function chapterCardShows(n) {
  const el = document.getElementById('chapterCard');
  return !el.classList.contains('hidden') && el.textContent.includes(`CHAPTER ${n} COMPLETE`);
}

function stopDead(vehicle) {
  vehicle.speed = 0;
  vehicle.vx = 0;
  vehicle.vz = 0;
}

function setStory(completed) {
  G.mission = null;
  G.completed = completed;
  G.territory = null;
  G.wanted.stars = 0;
}

// Start a mission and get into its car (the car to steal or the van).
function startAndBoard(api, def) {
  startMission(def);
  const mission = G.mission;
  G.p.x = mission.car.x + 2.2;
  G.p.z = mission.car.z;
  tap(api, 'KeyF');
  run(api, 2);
  return mission;
}

function chapterSevenOnFoot(api) {
  const p = G.p;
  const mission = startAndBoard(api, MISSIONS[6]);
  if (!atStage(1)) fail('ch7 steal stage');
  mission.stageDone = true; // skip the drive to the marina gate
  run(api, 2);
  stopDead(p.car);
  tap(api, 'KeyF');
  if (p.car || !atStage(2)) fail('ch7 on foot at the marina');

  p.x = GANGWAY.x;
  p.z = GANGWAY.z;
  if (!run(api, 60, () => atStage(3))) fail('ch7 boarding the yacht');
  p.x = YACHT.x - 12;
  p.z = YACHT.z + 0.5;
  run(api, 2);
  const onDeck = Math.abs(p.y - YACHT.deckY) < 0.01 && surfaceHeight(p.x, p.z) > 1;
  if (!onDeck) fail('not standing on the yacht deck: ' + p.y);

  const guards = mission.enemies;
  const guardsOnDeck = guards.length === 4 && guards.every((guard) => Math.abs(guard.y - YACHT.deckY) < 0.3);
  if (!guardsOnDeck) fail('deck guards');
  for (const guard of guards) { guard.hp = 0; guard.dead = true; }
  if (!run(api, 10, () => atStage(4))) fail('ch7 deck not cleared');
  p.x = SAFE.x - 1.2;
  p.z = SAFE.z;
  if (!run(api, 30, () => atStage(5))) fail('ch7 safe / ledger');
}

function chapterSevenAtSea(api) {
  const p = G.p;
  p.x = SPEEDBOAT_BERTH.x;
  p.z = SPEEDBOAT_BERTH.z + 3;
  tap(api, 'KeyF');
  if (!p.car?.isBoat) fail('could not enter the speedboat');
  if (!run(api, 5, () => atStage(6))) fail('ch7 boat stage');
  const boat = p.car;
  const launches = G.boats.filter((b) => b.key === 'patrol');
  if (launches.length < 2) fail('no harbour launches');

  // full throttle with a right turn for the first 40 steps
  const from = { x: boat.x, z: boat.z };
  const launchFrom = launches.map((launch) => ({ x: launch.x, z: launch.z }));
  input.keys.add('KeyW');
  input.keys.add('KeyD');
  for (let i = 0; i < 150; i++) {
    if (i === 40) input.keys.delete('KeyD');
    api.stepGame(STEP);
  }
  input.keys.delete('KeyW');
  const travelled = Math.hypot(boat.x - from.x, boat.z - from.z);
  if (!(travelled > 20) || !(boat.x > SEA_X)) fail(`boat did not drive on water ${boat.x.toFixed(1)},${boat.z.toFixed(1)}`);
  const allChased = launches.every((launch, i) => Math.hypot(launch.x - launchFrom[i].x, launch.z - launchFrom[i].z) > 10);
  if (!allChased) fail('launches did not chase');

  stopDead(boat);
  tap(api, 'KeyF');
  if (!p.car) fail('stepped off a boat in open water');

  // the run ends at the light jetty: chapter complete, then step ashore onto it
  boat.x = DROP.x;
  boat.z = DROP.z + 1;
  if (!run(api, 30, () => !G.mission)) fail('ch7 drop point');
  if (!G.completed.includes('m7') || !chapterCardShows(7)) fail('chapter 7 card');
  stopDead(boat);
  tap(api, 'KeyF');
  if (p.car || !(surfaceHeight(p.x, p.z) > 0.3)) fail('could not step onto the jetty');
  if (G.boats.some((b) => b.key === 'patrol')) fail('launches not cleared');
}

function chapterEight(api) {
  const p = G.p;
  const mission = startAndBoard(api, MISSIONS[7]);
  if (!atStage(1) || p.car !== mission.car) fail('ch8 van');
  const van = p.car;
  van.x = RAMP_FOOT.x;
  van.z = RAMP_FOOT.z;
  van.heading = Math.PI / 2;
  if (!run(api, 10, () => atStage(2))) fail('ch8 on-ramp');

  const wall = G.cars.filter((car) => car.kind === 'roadblock');
  if (wall.length < 4 || (G.spikes || []).length < 2) fail('roadblock wall / spikes');
  run(api, 30);
  if (!G.heli) fail(`AIR-1 not overhead, stars ${G.wanted.stars} heat ${G.wanted.heat} mode ${G.mode}`);
  if (!(Math.abs(wall[0].y - CAUSEWAY.deckY) < 0.01)) fail('wall not on the deck');

  // line the van up on the weak point's lane at speed and keep the throttle down
  Object.assign(van, { x: WALL_X - 34, z: CZ + 2.9, heading: Math.PI / 2, steerA: 0, vx: 30, vz: 0 });
  input.keys.add('KeyW');
  run(api, 6);
  if (!(Math.abs(van.y - CAUSEWAY.deckY) < 0.01)) fail('van not on the Causeway deck: ' + van.y);
  if (!run(api, 200, () => mission.block?.broken)) fail('roadblock did not break');
  if (!run(api, 600, () => !G.mission)) fail(`did not reach the Gala (van at ${van.x.toFixed(0)} of ${FINISH_X})`);
  input.keys.delete('KeyW');
  if (!G.completed.includes('m8') || !chapterCardShows(8)) fail('chapter 8 card');
  if (G.cars.some((car) => car.kind === 'roadblock')) fail('roadblock not cleared');
  stopDead(van);
  tap(api, 'KeyF');
}

export async function setPieceChecks(api) {
  const p = G.p;
  if (p.car) {
    stopDead(p.car);
    tap(api, 'KeyF');
  }
  setStory(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);
  chapterSevenOnFoot(api);
  chapterSevenAtSea(api);
  chapterEight(api);
  setStory(['m1']);
}

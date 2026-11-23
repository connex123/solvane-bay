// Chapter 8 set piece, CAUSEWAY GALA. A wall of SBPD cruisers blocks the Causeway deck behind spike strips with
// light bars flashing, AIR-1 sweeps its searchlight across the lanes, and Captain Reyne's own car sits on Nico's
// bumper. One cruiser in the wall is the weak point: hit it fast and it goes flying. storyMissions.js runs this
// through the stage hooks (begin / tick / end).
import { G, notify } from '../core/gameState.js';
import { addMarker, removeMarker } from './markers.js';
import { createCar, removeCar, wreck } from '../vehicles/carPhysics.js';
import { createSpikeStrip, removeSpikeStrip } from '../police/spikeStrip.js';
import { placeCone } from '../police/helicopterUnit.js';
import { setStars } from '../police/wantedSystem.js';
import { CAUSEWAY } from '../world/landmarks.js';
import { RAMP } from '../world/causewayDeck.js';
import { sparks, explosion } from '../combat/effects.js';
import { sfx } from '../audio/soundEngine.js';
import { say } from '../story/dialogue.js';
import { lineCoord } from '../core/config.js';

export const WALL_X = CAUSEWAY.x0 + 110;
export const FINISH_X = CAUSEWAY.pylons[1] + 40;
export const CZ = CAUSEWAY.z;
export const RAMP_FOOT = { x: RAMP.x0 + 4, z: CZ };

// The wall: four cruisers across the deck and two behind, as [ahead, across, heading, heavy].
// The light one at +2.9 across is the weak point.
const WALL_LAYOUT = [
  [0, -7.6, 0.25, true],
  [0, -2.9, -0.2, true],
  [0, 2.9, 0.15, false],
  [0, 7.6, -0.25, true],
  [7, -5, 1.2, true],
  [7, 6, 1.9, true],
];
const HEAVY_HP = 2200;
const WEAK_HP = 140;
const FLING_GRAVITY = 22;
const SHOVED = 1.6; // metres the weak car must be pushed off its spot to count as broken through

function wallCar([ahead, across, heading, heavy]) {
  const car = createCar('interceptor', WALL_X + ahead, CZ + across, heading, heavy ? 'roadblock' : 'parked');
  car.hx = car.x; // the spot a heavy cruiser is pinned to
  car.hz = car.z;
  car.hh = heading;
  car.heavy = heavy;
  car.callsign = 'BLOCK';
  car.hp = car.maxHp = heavy ? HEAVY_HP : WEAK_HP;
  if (!heavy) car.weak = true;
  return car;
}

export function buildRoadblock(st) {
  st.wall = WALL_LAYOUT.map(wallCar);
  st.weak = st.wall.find((car) => car.weak);
  st.spikes = [createSpikeStrip(WALL_X - 10, CZ - 4.9, 0, 10.6), createSpikeStrip(WALL_X - 10, CZ + 7.8, 0, 4.6)];
  for (const strip of st.spikes) {
    strip.mesh.position.y = CAUSEWAY.deckY;
    strip.t = 600; // stays for the whole chapter
  }
  st.weakMarker = addMarker({ follow: st.weak, x: st.weak.x, z: st.weak.z, color: 0xffd23c, r: 0, label: 'WEAK POINT' });
}

// Throw a cruiser into the air, spinning, pushed along the bridge.
function fling(car, dir) {
  const lift = 11 + Math.random() * 3;
  const spinSign = Math.random() < 0.5 ? -1 : 1;
  car.fly = { vy: lift, spin: spinSign * (4 + Math.random() * 3) };
  car.airY = 0.01;
  car.spinA = 0;
  car.kind = 'parked';
  car.vx += dir * 6;
  sparks(car.x, CAUSEWAY.deckY + 1, car.z, 16);
}

function flightStep(car, dt) {
  car.fly.vy -= FLING_GRAVITY * dt;
  car.airY = Math.max(0, car.airY + car.fly.vy * dt);
  car.spinA += car.fly.spin * dt;
  car.mesh.position.y = (car.y || 0) + car.airY;
  car.mesh.rotation.z = car.spinA;
  car.mesh.rotation.x = car.spinA * 0.4;
  if (car.airY > 0 || car.fly.vy >= 0) return;
  car.fly = null; // landed
  car.airY = 0;
  if (!car.dead) wreck(car);
}

function breakThrough(st) {
  st.broken = true;
  const weak = st.weak;
  const ram = G.p.car;
  const ramSpeed = ram ? Math.hypot(ram.vx, ram.vz) : 0;
  if (!weak.fly && !weak.dead) fling(weak, 1);
  const neighbour = st.wall[3]; // a hard enough hit takes the next cruiser with it
  if (ramSpeed > 16 && !neighbour.fly) {
    neighbour.heavy = false;
    fling(neighbour, 1);
  }
  explosion(weak.x, CAUSEWAY.deckY + 1, weak.z);
  sfx.explosion();
  G.shake = Math.max(G.shake, 0.7);
  notify('ROADBLOCK BROKEN', 'good');
  removeMarker(st.weakMarker);
}

// AIR-1 drops low over the deck and sweeps its searchlight lane to lane just ahead of the van.
function sweepSearchlight(dt) {
  const heli = G.heli;
  if (!heli) return;
  heli.y += (34 - heli.y) * Math.min(1, dt);
  const t = G.time;
  const ahead = G.p.car ? G.p.car.x : G.p.x;
  placeCone(heli, ahead + 14 + Math.sin(t * 0.9) * 10, CZ + Math.sin(t * 1.7) * 8.5, CAUSEWAY.deckY);
}

export function tickRoadblock(st, dt) {
  for (const car of st.wall) {
    if (car.heavy && !car.fly && !car.dead) {
      // heavy cruisers do not budge
      car.x = car.hx;
      car.z = car.hz;
      car.heading = car.hh;
      car.vx = 0;
      car.vz = 0;
    }
    if (car.fly) flightStep(car, dt);
  }
  const weak = st.weak;
  if (!st.broken && weak && (Math.hypot(weak.x - weak.hx, weak.z - weak.hz) > SHOVED || weak.dead)) breakThrough(st);
  sweepSearchlight(dt);
}

export function clearRoadblock(st) {
  for (const car of st.wall || []) {
    if (G.cars.includes(car) && car !== G.p.car) removeCar(car);
  }
  for (const strip of st.spikes || []) removeSpikeStrip(strip);
  removeMarker(st.weakMarker);
  st.wall = [];
  st.spikes = [];
}

const RADIO_LINES = [
  { who: 'tamsin', text: 'TIDE FM, 88.1, live from a moving van. Page one: Captain Hollis Reyne, forty thousand a month.' },
  { who: 'sol', text: 'Wall of cruisers mid-span! The one on the right is a rookie car, light as a biscuit tin. Hit it hard.' },
  { who: 'tamsin', text: 'Page two: the harbour commissioner. Keep driving, Nico, I have thirty-eight more.' },
];

function spawnReyne() {
  const reyne = createCar('hawke', RAMP.x0 - 50, lineCoord(3) + 3.5, Math.PI / 2, 'cop', 0x1a1f2a);
  Object.assign(reyne, { driver: 'ai', ai: 'PURSUIT', callsign: 'REYNE', stuck: 0, rev: 0 });
  reyne.hp = reyne.maxHp = 900;
  return reyne;
}

function objectiveText(M, inVan) {
  if (!inVan) return 'Get back in the broadcast van';
  if (M.block.broken) return 'Through! Reach the Gala stage at the far pylon';
  return 'Break the roadblock: ram the WEAK POINT (Shift nitro, X blackout)';
}

export const roadblockStage = {
  begin(M) {
    M.block = {};
    buildRoadblock(M.block);
    setStars(4);
    M.reyne = spawnReyne();
    M.reyneMarker = addMarker({ follow: M.reyne, x: M.reyne.x, z: M.reyne.z, color: 0x3a6cff, r: 0, label: 'REYNE' });
    M.finish = addMarker({ x: FINISH_X, z: CZ, color: 0xffd23c, r: 0, label: 'GALA' });
    say(RADIO_LINES);
  },
  tick(M, dt) {
    if (M.car?.dead) return 'the broadcast van was destroyed';
    tickRoadblock(M.block, dt);
    // Reyne has every unit on the bridge: the heat cannot drop below four stars here
    G.wanted.heat = Math.max(G.wanted.heat, 4.5);
    if (G.wanted.stars < 4) G.wanted.stars = 4;
    const van = G.p.car;
    const inVan = van === M.car;
    M.text = objectiveText(M, inVan);
    return inVan && van.x > FINISH_X;
  },
  end(M, failed) {
    clearRoadblock(M.block || {});
    removeMarker(M.reyneMarker);
    removeMarker(M.finish);
    if (M.reyne && G.cars.includes(M.reyne)) removeCar(M.reyne);
    if (!failed) setStars(0);
  },
};

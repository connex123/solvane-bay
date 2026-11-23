// Crew abilities, each unlocked by the chapter that recruits that member and each on its own cooldown:
// Sol's HOT SWAP (Z) leaves a fresh car at the kerb, Tamsin's BLACKOUT (X) blinds the SBPD for 10 s,
// and Wren's PATCH UP (C) repairs the car Nico is driving.
import { G, notify } from '../core/gameState.js';
import { pressed } from '../core/input.js';
import { createCar, removeCar } from '../vehicles/carPhysics.js';
import { blockedAt } from '../world/collision.js';
import { sfx } from '../audio/soundEngine.js';
import { ARC } from '../story/chapterArc.js';

export const CREW = [
  {
    id: 'sol', ability: 'HOT SWAP', key: 'KeyZ', keyLabel: 'Z', cd: 45,
    desc: 'Sol leaves a fresh, fuelled car at the kerb beside you.',
  },
  {
    id: 'tamsin', ability: 'BLACKOUT', key: 'KeyX', keyLabel: 'X', cd: 75,
    desc: 'Tamsin drops the grid: for 10 s the SBPD and AIR-1 lose sight of you.',
  },
  {
    id: 'wren', ability: 'PATCH UP', key: 'KeyC', keyLabel: 'C', cd: 40,
    desc: 'Wren talks you through it: the car you are in is repaired on the spot.',
  },
];

export const BLACKOUT_TIME = 10;

const SWAP_MODELS = ['veloce', 'rumble', 'hawke'];
const SOL_ORANGE = 0xff8a3d;
// Kerb offsets tried in turn, to the right then the left of the current heading.
const KERB_OFFSETS = [4.2, -4.2, 6, -6, 8, -8];

function crewState() {
  if (!G.crew) G.crew = { cd: {}, swaps: 0 };
  return G.crew;
}

/** The chapter id whose completion recruits this member. */
export function recruitChapter(id) {
  return Object.keys(ARC).find((chapterId) => ARC[chapterId].recruits === id);
}

export function isRecruited(id) {
  return (G.completed || []).includes(recruitChapter(id));
}

export function cooldownLeft(id) {
  return crewState().cd[id] || 0;
}

export function blackoutLeft() {
  return Math.max(0, G.blackoutT || 0);
}

let lastDelivery = null; // Sol's previous car, cleared away when she brings the next

function spotIsFree(x, z) {
  if (blockedAt(x, z)) return false;
  return !G.cars.some((car) => Math.hypot(car.x - x, car.z - z) < 3.2);
}

function hotSwap() {
  const player = G.p;
  const from = player.car || { x: player.x, z: player.z, heading: player.yaw };
  const heading = from.heading;
  const sideX = Math.cos(heading), sideZ = -Math.sin(heading);
  for (const offset of KERB_OFFSETS) {
    const x = from.x + sideX * offset;
    const z = from.z + sideZ * offset;
    if (!spotIsFree(x, z)) continue;
    const old = lastDelivery;
    if (old && old !== player.car && !old.dead && G.cars.includes(old)) removeCar(old);
    const state = crewState();
    const model = SWAP_MODELS[state.swaps % SWAP_MODELS.length];
    state.swaps += 1;
    lastDelivery = createCar(model, x, z, heading, 'parked', SOL_ORANGE);
    lastDelivery.nitro = 1;
    notify(`SOL: ${lastDelivery.type.name} at the kerb. Keys are in it.`, 'good');
    return true;
  }
  notify('SOL: No room to stop here. Find some open road.', 'bad');
  return false;
}

function blackout() {
  G.blackoutT = BLACKOUT_TIME;
  G.wanted.seen = false;
  notify('TAMSIN: Grid is down. Ten seconds. Move.', 'good');
  return true;
}

function patchUp() {
  const car = G.p.car;
  if (!car) {
    notify('WREN: Get in a car first, kid.', 'bad');
    return false;
  }
  if (car.hp >= car.maxHp) {
    notify('WREN: She is already perfect.', '');
    return false;
  }
  car.hp = car.maxHp;
  car.hitT = 0;
  notify(`WREN: ${car.type.name} patched up. Try not to kiss any more walls.`, 'good');
  return true;
}

const ACTIONS = { sol: hotSwap, tamsin: blackout, wren: patchUp };

/** Trigger a member's ability if it is recruited, ready and the game is in play. Returns whether it fired. */
export function useAbility(id) {
  const member = CREW.find((entry) => entry.id === id);
  const state = crewState();
  if (!member || !isRecruited(id)) return false;
  if ((state.cd[id] || 0) > 0 || G.mode !== 'play') return false;
  if (!ACTIONS[id]()) return false;
  state.cd[id] = member.cd;
  sfx.pickup();
  return true;
}

export function updateCrew(dt) {
  const state = crewState();
  for (const member of CREW) {
    if (state.cd[member.id] > 0) state.cd[member.id] = Math.max(0, state.cd[member.id] - dt);
    if (pressed(member.key)) useAbility(member.id);
  }
  if (G.blackoutT > 0) {
    G.blackoutT -= dt;
    if (G.blackoutT <= 0) notify('TAMSIN: Power is back. So are their eyes.', '');
  }
}

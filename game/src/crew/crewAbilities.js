// Crew abilities, unlocked when a story chapter recruits the member: Sol's HOT SWAP (Z) drops a fresh car at the kerb,
// Tamsin's BLACKOUT (X) blinds the SBPD for 10 s, Wren's PATCH UP (C) repairs the car Nico is driving. Each has a cooldown.
import { G, notify } from '../core/gameState.js';
import { pressed } from '../core/input.js';
import { createCar, removeCar } from '../vehicles/carPhysics.js';
import { blockedAt } from '../world/collision.js';
import { sfx } from '../audio/soundEngine.js';
import { ARC } from '../story/chapterArc.js';

export const CREW = [
  { id: 'sol', ability: 'HOT SWAP', key: 'KeyZ', keyLabel: 'Z', cd: 45, desc: 'Sol leaves a fresh, fuelled car at the kerb beside you.' },
  { id: 'tamsin', ability: 'BLACKOUT', key: 'KeyX', keyLabel: 'X', cd: 75, desc: 'Tamsin drops the grid: for 10 s the SBPD and AIR-1 lose sight of you.' },
  { id: 'wren', ability: 'PATCH UP', key: 'KeyC', keyLabel: 'C', cd: 40, desc: 'Wren talks you through it: the car you are in is repaired on the spot.' },
];
export const BLACKOUT_TIME = 10;
const SWAP_CARS = ['veloce', 'rumble', 'hawke'];
const state = () => (G.crew ||= { cd: {}, swaps: 0 });
export const recruitChapter = (id) => Object.keys(ARC).find((m) => ARC[m].recruits === id);
export const isRecruited = (id) => (G.completed || []).includes(recruitChapter(id));
export const cooldownLeft = (id) => state().cd[id] || 0;
export const blackoutLeft = () => Math.max(0, G.blackoutT || 0);
let delivered = null;

function hotSwap() {
  const p = G.p, src = p.car || { x: p.x, z: p.z, heading: p.yaw }, h = src.heading, sx = Math.cos(h), sz = -Math.sin(h);
  for (const off of [4.2, -4.2, 6, -6, 8, -8]) {
    const x = src.x + sx * off, z = src.z + sz * off;
    if (blockedAt(x, z) || G.cars.some((c) => Math.hypot(c.x - x, c.z - z) < 3.2)) continue;
    if (delivered && delivered !== p.car && !delivered.dead && G.cars.includes(delivered)) removeCar(delivered);
    const st = state(); delivered = createCar(SWAP_CARS[st.swaps++ % SWAP_CARS.length], x, z, h, 'parked', 0xff8a3d); delivered.nitro = 1;
    notify(`SOL: ${delivered.type.name} at the kerb. Keys are in it.`, 'good'); return true;
  }
  notify('SOL: No room to stop here. Find some open road.', 'bad'); return false;
}
function blackout() { G.blackoutT = BLACKOUT_TIME; G.wanted.seen = false; notify('TAMSIN: Grid is down. Ten seconds. Move.', 'good'); return true; }
function patchUp() {
  const c = G.p.car; if (!c) { notify('WREN: Get in a car first, kid.', 'bad'); return false; }
  if (c.hp >= c.maxHp) { notify('WREN: She is already perfect.', ''); return false; }
  c.hp = c.maxHp; c.hitT = 0; notify(`WREN: ${c.type.name} patched up. Try not to kiss any more walls.`, 'good'); return true;
}
const USE = { sol: hotSwap, tamsin: blackout, wren: patchUp };
export function useAbility(id) {
  const c = CREW.find((q) => q.id === id), st = state();
  if (!c || !isRecruited(id) || (st.cd[id] || 0) > 0 || G.mode !== 'play') return false;
  if (USE[id]()) { st.cd[id] = c.cd; sfx.pickup(); return true; }
  return false;
}
export function updateCrew(dt) {
  const st = state(); for (const c of CREW) { if (st.cd[c.id] > 0) st.cd[c.id] = Math.max(0, st.cd[c.id] - dt); if (pressed(c.key)) useAbility(c.id); }
  if (G.blackoutT > 0) { G.blackoutT -= dt; if (G.blackoutT <= 0) notify('TAMSIN: Power is back. So are their eyes.', ''); }
}

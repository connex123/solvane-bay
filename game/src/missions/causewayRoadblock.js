// Chapter 8 set piece, CAUSEWAY GALA: a wall of SBPD cruisers across the Causeway deck with spike strips and flashing
// bars, AIR-1 sweeping its searchlight over the deck, Captain Reyne's own car on Nico's bumper. One cruiser in the
// wall is the weak point: ram it fast and it goes flying. Stage hooks (begin / tick / end) used by storyMissions.js.
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

export const WALL_X = CAUSEWAY.x0 + 110, FINISH_X = CAUSEWAY.pylons[1] + 40, CZ = CAUSEWAY.z;
export const RAMP_FOOT = { x: RAMP.x0 + 4, z: CZ };
// the wall: four heavy cruisers across the deck (the weak one at +2.9) and two behind
const WALL = [[0, -7.6, 0.25, 1], [0, -2.9, -0.2, 1], [0, 2.9, 0.15, 0], [0, 7.6, -0.25, 1], [7, -5, 1.2, 1], [7, 6, 1.9, 1]];
export function buildRoadblock(st) {
  st.wall = WALL.map(([dx, dz, h, heavy]) => { const c = createCar('interceptor', WALL_X + dx, CZ + dz, h, heavy ? 'roadblock' : 'parked'); c.hx = c.x; c.hz = c.z; c.hh = h; c.heavy = !!heavy; c.callsign = 'BLOCK'; if (heavy) c.hp = c.maxHp = 2200; else { c.hp = c.maxHp = 140; c.weak = true; } return c; });
  st.weak = st.wall.find((c) => c.weak);
  st.spikes = [createSpikeStrip(WALL_X - 10, CZ - 4.9, 0, 10.6), createSpikeStrip(WALL_X - 10, CZ + 7.8, 0, 4.6)];
  for (const s of st.spikes) { s.mesh.position.y = CAUSEWAY.deckY; s.t = 600; }
  st.weakMarker = addMarker({ follow: st.weak, x: st.weak.x, z: st.weak.z, color: 0xffd23c, r: 0, label: 'WEAK POINT' });
}
function fling(c, dir) { c.fly = { vy: 11 + Math.random() * 3, spin: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 3) }; c.airY = 0.01; c.spinA = 0; c.kind = 'parked'; c.vx += dir * 6; sparks(c.x, CAUSEWAY.deckY + 1, c.z, 16); }
export function tickRoadblock(st, dt) {
  for (const c of st.wall) {
    if (c.heavy && !c.fly && !c.dead) { c.x = c.hx; c.z = c.hz; c.heading = c.hh; c.vx = c.vz = 0; }
    if (c.fly) { c.fly.vy -= 22 * dt; c.airY = Math.max(0, c.airY + c.fly.vy * dt); c.spinA += c.fly.spin * dt; c.mesh.position.y = (c.y || 0) + c.airY; c.mesh.rotation.z = c.spinA; c.mesh.rotation.x = c.spinA * 0.4;
      if (c.airY <= 0 && c.fly.vy < 0) { c.fly = null; c.airY = 0; if (!c.dead) wreck(c); } }
  }
  const w = st.weak;
  if (!st.broken && w && (Math.hypot(w.x - w.hx, w.z - w.hz) > 1.6 || w.dead)) {
    st.broken = true; const pc = G.p.car, sp = pc ? Math.hypot(pc.vx, pc.vz) : 0;
    if (!w.fly && !w.dead) fling(w, 1); const n = st.wall[3]; if (sp > 16 && !n.fly) { n.heavy = false; fling(n, 1); }
    explosion(w.x, CAUSEWAY.deckY + 1, w.z); sfx.explosion(); G.shake = Math.max(G.shake, 0.7); notify('ROADBLOCK BROKEN', 'good'); removeMarker(st.weakMarker);
  }
  // AIR-1 low over the deck, the searchlight sweeping lane to lane ahead of the van
  const h = G.heli; if (h) { h.y += (34 - h.y) * Math.min(1, dt); const t = G.time, px = G.p.car ? G.p.car.x : G.p.x; placeCone(h, px + 14 + Math.sin(t * 0.9) * 10, CZ + Math.sin(t * 1.7) * 8.5, CAUSEWAY.deckY); }
}
export function clearRoadblock(st) {
  for (const c of st.wall || []) if (G.cars.includes(c) && c !== G.p.car) removeCar(c); for (const s of st.spikes || []) removeSpikeStrip(s);
  removeMarker(st.weakMarker); st.wall = []; st.spikes = [];
}
export const roadblockStage = {
  begin(M) {
    const st = M.block = {}; buildRoadblock(st); setStars(4);
    const r = M.reyne = createCar('hawke', RAMP.x0 - 50, lineCoord(3) + 3.5, Math.PI / 2, 'cop', 0x1a1f2a); r.driver = 'ai'; r.ai = 'PURSUIT'; r.callsign = 'REYNE'; r.stuck = 0; r.rev = 0; r.hp = r.maxHp = 900;
    M.reyneMarker = addMarker({ follow: r, x: r.x, z: r.z, color: 0x3a6cff, r: 0, label: 'REYNE' });
    M.finish = addMarker({ x: FINISH_X, z: CZ, color: 0xffd23c, r: 0, label: 'GALA' });
    say([{ who: 'tamsin', text: 'TIDE FM, 88.1, live from a moving van. Page one: Captain Hollis Reyne, forty thousand a month.' }, { who: 'sol', text: 'Wall of cruisers mid-span! The one on the right is a rookie car, light as a biscuit tin. Hit it hard.' }, { who: 'tamsin', text: 'Page two: the harbour commissioner. Keep driving, Nico, I have thirty-eight more.' }]);
  },
  tick(M, dt) {
    if (M.car?.dead) return 'the broadcast van was destroyed';
    tickRoadblock(M.block, dt); const pc = G.p.car; G.wanted.heat = Math.max(G.wanted.heat, 4.5); if (G.wanted.stars < 4) G.wanted.stars = 4; // Reyne has every unit on the bridge
    M.text = pc !== M.car ? 'Get back in the broadcast van' : M.block.broken ? 'Through! Reach the Gala stage at the far pylon' : 'Break the roadblock: ram the WEAK POINT (Shift nitro, X blackout)';
    return pc === M.car && pc.x > FINISH_X;
  },
  end(M, failed) {
    clearRoadblock(M.block || {}); removeMarker(M.reyneMarker); removeMarker(M.finish);
    if (M.reyne && G.cars.includes(M.reyne)) removeCar(M.reyne);
    if (!failed) setStars(0);
  },
};

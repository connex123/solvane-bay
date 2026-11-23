// Street life that is not just walking: small groups chatting on the sidewalks outside the shops, friends on the
// sand by the water and joggers on the beach promenade, kept around the player within the district's budget. The
// groups idle in place (weight shifts, turning to whoever is talking) until gunfire, a crash or a wanted chase
// scares them, then they scatter as ordinary fleeing pedestrians.
import { G } from '../core/gameState.js';
import { HALF, lineCoord, wrapAngle } from '../core/config.js';
import { rnd } from '../core/random.js';
import { randomRoadPoint } from '../world/cityLayout.js';
import { createActor, removeActor } from './pedestrianSystem.js';
import { randomStyle, animateWalk } from './characterModel.js';
import { streetBudget } from '../vehicles/trafficDensity.js';

const groups = []; let spawnT = 0;
const SIDEWALK = 9.7, BEACH_X0 = HALF + 13, BEACH_X1 = HALF + 40, PROMENADE = HALF + 9.4;
// A group of 2-4 standing in a loose circle, each facing the middle.
export function spawnGroup(cx, cz, size = 2 + Math.floor(rnd() * 3), axis = 'x') {
  const members = [], r = 0.55 + size * 0.12, a0 = rnd() * 6.28;
  for (let k = 0; k < size; k++) {
    const ang = a0 + (k / size) * Math.PI * 2, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
    const a = createActor('ped', x, z, randomStyle(rnd)); a.yaw = Math.atan2(cx - x, cz - z); a.loiter = { phase: rnd() * 6, talk: rnd() * 3 };
    a.nav = { axis, dir: rnd() < 0.5 ? 1 : -1 }; animateWalk(a.mesh, 0, 0, false); members.push(a);
  }
  const g = { x: cx, z: cz, members, speaker: 0, t: 0 }; groups.push(g); return g;
}
// A jogger on the beach promenade: an ordinary pedestrian with a running pace.
export function spawnJogger(z, dir) { const a = createActor('ped', PROMENADE + (rnd() - 0.5), z, randomStyle(rnd)); a.nav = { axis: 'z', dir }; a.pace = 3.3 + rnd() * 0.8; return a; }
function spawnNear(p) {
  if (p.x > HALF - 40 && rnd() < 0.45) { // by the beach: friends on the sand, or a jogger
    const z = p.z + (rnd() - 0.5) * 180; if (Math.abs(z) > HALF) return;
    if (rnd() < 0.35) spawnJogger(z, rnd() < 0.5 ? 1 : -1); else spawnGroup(BEACH_X0 + rnd() * (BEACH_X1 - BEACH_X0), z, 2 + Math.floor(rnd() * 3), 'z');
    return;
  }
  const pt = randomRoadPoint(rnd, p.x, p.z, 35, 110), side = rnd() < 0.5 ? 1 : -1, along = (pt.axis === 'x' ? pt.x : pt.z);
  const k = ((along + HALF) % 64 + 64) % 64; if (k < 12 || k > 52) return; // not on a corner
  const cross = lineCoord(pt.line) + side * SIDEWALK, x = pt.axis === 'x' ? along : cross, z = pt.axis === 'x' ? cross : along;
  if (groups.some((g) => Math.hypot(g.x - x, g.z - z) < 14)) return;
  spawnGroup(x, z, 2 + Math.floor(rnd() * 3), pt.axis);
}
export function updateStreetCrowds(dt) {
  const p = G.p;
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]; g.members = g.members.filter((a) => a.loiter && a.mesh.parent && !a.dead);
    const d = Math.hypot(g.x - p.x, g.z - p.z);
    if (!g.members.length || d > 160) { for (const a of g.members) removeActor(a); groups.splice(i, 1); continue; }
    if (d > 90) continue; // idle animation only where it can be seen
    g.t -= dt; if (g.t < 0) { g.t = 2 + rnd() * 3; g.speaker = Math.floor(rnd() * g.members.length); }
    g.members.forEach((a, k) => {
      const L = a.loiter; L.phase += dt * (k === g.speaker ? 2.4 : 0.9);
      animateWalk(a.mesh, L.phase, k === g.speaker ? 0.12 : 0.05, false); // the talker gestures, the others shift their weight
      const s = g.members[g.speaker]; if (s && s !== a) a.yaw += wrapAngle(Math.atan2(s.x - a.x, s.z - a.z) - a.yaw) * Math.min(1, dt * 1.5);
    });
  }
  spawnT -= dt; if (spawnT > 0 || G.mode !== 'play') return; spawnT = 0.7;
  if (groups.length < streetBudget(p.x, p.z).groups) spawnNear(p);
}
export const crowdGroups = () => groups;

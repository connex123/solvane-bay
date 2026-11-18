// All on-foot non-player characters ("actors"): civilians on sidewalks, plus the dispatcher for cops and gang members.
import * as THREE from 'three';
import { G, notify } from '../core/gameState.js';
import { HALF, lineCoord } from '../core/config.js';
import { rnd } from '../core/random.js';
import { buildCharacter, animateWalk, setGun, STYLES, randomStyle } from './characterModel.js';
import { circlePushCar } from '../vehicles/carPhysics.js';
import { updateHostile } from './hostileAI.js';
import { randomRoadPoint } from '../world/cityLayout.js';

export function createActor(kind, x, z, style, extra = {}) {
  const mesh = buildCharacter(style); mesh.position.set(x, 0, z); G.scene.add(mesh);
  const a = { isActor: true, kind, x, y: 0, z, yaw: 0, hp: kind === 'ped' ? 40 : kind === 'cop' ? 70 : 90, mesh, dead: false, deadT: 0, phase: Math.random() * 6, scared: 0, cd: 1 + Math.random(), ...extra };
  G.actors.push(a); return a;
}
export function removeActor(a) { a.mesh.removeFromParent(); const i = G.actors.indexOf(a); if (i >= 0) G.actors.splice(i, 1); }
export function spawnPed(axis, line, t, side, dir) {
  const cross = lineCoord(line) + side * 8.9, a = createActor('ped', axis === 'x' ? t : cross, axis === 'x' ? cross : t, randomStyle(rnd));
  a.nav = { axis, line, side, dir }; return a;
}
export function spawnPedsNear(cx, cz, rMin, rMax) {
  const pt = randomRoadPoint(rnd, cx, cz, rMin, rMax), t = pt.axis === 'x' ? pt.x : pt.z; return spawnPed(pt.axis, pt.line, t, rnd() < 0.5 ? 1 : -1, rnd() < 0.5 ? 1 : -1);
}
export function scarePeds(x, z, r = 35) { for (const a of G.actors) if (a.kind === 'ped' && !a.dead && Math.hypot(a.x - x, a.z - z) < r) { a.scared = 6; a.threat = { x, z }; } }
export function hitActor(a, dmg, byPlayer) {
  if (a.dead) return; a.hp -= dmg; a.scared = 6; if (byPlayer) { a.threat = { x: G.p.x, z: G.p.z }; a.aggro = true; }
  if (a.kind === 'ped' && byPlayer) G.hooks.crime('hitped');
  if (a.kind === 'cop' && byPlayer) G.hooks.crime('hitcop');
  if (a.hp <= 0) {
    a.dead = true; a.mesh.rotation.x = -Math.PI / 2; a.mesh.position.y = 0.2; a.mesh.userData.gun.visible = false;
    if (byPlayer) { G.hooks.crime(a.kind === 'ped' ? 'killped' : a.kind === 'cop' ? 'killcop' : 'killgang'); if (a.kind === 'gang') { G.money += 40; } }
  }
}
export function updateActors(dt) {
  const p = G.p;
  for (let i = G.actors.length - 1; i >= 0; i--) {
    const a = G.actors[i];
    if (a.dead) { a.deadT += dt; if (a.deadT > 14 || (a.kind !== 'ped' && a.deadT > 25)) removeActor(a); continue; }
    if (a.kind === 'ped') pedAI(a, dt); else updateHostile(a, dt);
    for (const c of G.cars) {
      if (Math.abs(c.x - a.x) > 4 || Math.abs(c.z - a.z) > 4) continue;
      const r = circlePushCar(a.x, a.z, 0.4, c);
      if (r) { if (Math.abs(c.speed) > 5 && !c.dead) { hitActor(a, Math.abs(c.speed) * 9, c === p.car); if (c === p.car && a.kind === 'ped') G.hooks.crime('runover'); } a.x += r.dx; a.z += r.dz; }
    }
    a.mesh.position.set(a.x, a.y, a.z); a.mesh.rotation.y = a.yaw;
  }
}
function pedAI(a, dt) {
  const n = a.nav; if (!n) return;
  if (a.scared > 0) { a.scared -= dt; if (a.threat) { const ta = n.axis === 'x' ? a.threat.x - a.x : a.threat.z - a.z; if (Math.abs(ta) > 0.5) n.dir = ta > 0 ? -1 : 1; } }
  const sp = a.scared > 0 ? 6.2 : 1.5, v = n.dir * sp * dt;
  if (n.axis === 'x') { a.x += v; if (Math.abs(a.x) > HALF) n.dir = -n.dir; } else { a.z += v; if (Math.abs(a.z) > HALF) n.dir = -n.dir; }
  a.yaw = n.axis === 'x' ? n.dir * Math.PI / 2 : n.dir > 0 ? 0 : Math.PI;
  a.phase += dt * sp * 3; animateWalk(a.mesh, a.phase, a.scared > 0 ? 0.9 : 0.5, false);
  if (a.scared <= 0 && Math.random() < dt * 0.05) n.dir = -n.dir;
  if (Math.hypot(a.x - G.p.x, a.z - G.p.z) > 190) removeActor(a);
}
export function maintainPeds() {
  const c = G.actors.filter((a) => a.kind === 'ped' && !a.dead).length;
  if (c < 26 && G.mode === 'play') for (let k = 0; k < 2; k++) spawnPedsNear(G.p.x, G.p.z, 30, 130);
}
export { STYLES, setGun, animateWalk };

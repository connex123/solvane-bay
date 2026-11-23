// Screenshot 2: an on-foot firefight at a junction of the beach district in the afternoon (chapter 3, Coral Kings Don't
// Share). Nico fires the SMG down the street at the Coral Kings dug in behind Brandt's black Hawke, a car they shot up
// burns between them, people run from both sidewalks, traffic has stopped dead, and SBPD cruisers roll in from the far
// junction and the cross street. Full HUD: chapter objective, three stars, SBPD list, weapon bar, minimap with police blips.
import { G } from '../core/gameState.js';
import { lineCoord } from '../core/config.js';
import { STYLES, setGun, animateWalk } from '../characters/characterModel.js';
import { setStars } from '../police/wantedSystem.js';
import { updateSirens, updateEffects, fire } from '../combat/effects.js';
import { updateLineOfSight } from '../police/lineOfSight.js';
import { fire as shootRay } from '../combat/projectiles.js';
import { WEAPONS } from '../combat/weapons.js';
import { wreck } from '../vehicles/carPhysics.js';
import { stageScooter } from '../vehicles/deliveryScooters.js';
import { setScene, setMission, carAt, copAt, trafficAt, personAt, strollers, frame, lamp, renderShot, clearPalmsNear } from './sceneStaging.js';

const JX = lineCoord(8), JZ = lineCoord(6), EAST = Math.PI / 2, WEST = -Math.PI / 2, NORTH = Math.PI, SOUTH = 0; // the junction
export const FIGHT = { clock: 15.6, cam: [JX + 6.2, 3.7, JZ + 5.6], look: [JX - 26, 0.4, JZ - 1.5], fov: 55, nico: [JX + 0.6, JZ + 3.4] };
export function streetFight(api) {
  const p = G.p, F = FIGHT;
  setScene({ clock: F.clock, money: 6420, xp: 540, completed: ['m1', 'm2'], hp: 72, armor: 45, weapon: 2, magic: 0.4, blaze: 0.35, owned: { 0: 1, 1: 1, 2: 1, 3: 1 }, ammo: { pistol: 84, smg: 210, shotgun: 24, molotov: 0 }, crew: { cd: { wren: 0 }, swaps: 0 } });
  setMission(2, 1, 'Run the Coral Kings off Bayview Ave (4 left)');
  // Brandt's crew behind their Hawke, half-way down the block, guns up
  const hawke = carAt('hawke', JX - 17, JZ - 1.5, EAST + 0.4, { tint: 0x15151a });
  const gang = [[JX - 15.5, JZ - 4.6], [JX - 18.5, JZ + 6.4], [JX - 14, JZ + 6.0], [JX - 20, JZ - 3.2]].map(([x, z], i) => {
    const a = personAt('gang', x, z, Math.atan2(F.nico[0] - x, F.nico[1] - z), { style: STYLES.coral, gun: i === 2 ? 'smg' : 'pistol', aim: true, stride: 0 }); a.hp = 90; a.aggro = true; return a;
  });
  G.mission.enemies = gang;
  // the sedan they shot up burns in the middle of the street
  const burner = carAt('marlin', JX - 7.5, JZ + 4.4, WEST + 0.7, { tint: 0x2f7fd8 }); wreck(burner);
  for (let i = 0; i < 130; i++) { G.time += 1 / 60; updateEffects(1 / 60); if (i > 84 && i % 3 === 0) fire(burner.x + (i % 3 - 1) * 0.7, 1.1 + (i % 2) * 0.4, burner.z + ((i >> 2) % 3 - 1) * 0.5); } // two seconds on: the fireball has burned down to a roaring car fire
  // Nico at the corner, SMG up, firing down the street
  p.x = F.nico[0]; p.z = F.nico[1]; p.yaw = Math.atan2(gang[0].x - p.x, gang[0].z - p.z) + 0.05; p.aim = true; p.mesh.visible = true; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; setGun(p.mesh, 'smg'); animateWalk(p.mesh, 0, 0, true);
  const muzzle = (a, yaw) => ({ x: a.x + Math.sin(yaw) * 0.9 + Math.cos(yaw) * 0.2, y: 1.35, z: a.z + Math.cos(yaw) * 0.9 - Math.sin(yaw) * 0.2 });
  const burst = (from, yaw, to, w, who) => { const m = muzzle(from, yaw), dx = to.x - m.x, dy = 1.2 - m.y, dz = to.z - m.z, l = Math.hypot(dx, dy, dz); shootRay(who, { ...w, dmg: 0, spread: 0.01 }, m.x, m.y, m.z, dx / l, dy / l, dz / l, m); };
  for (let k = 0; k < 2; k++) { burst(p, p.yaw, gang[k], WEAPONS[2], 'player'); for (let i = 0; i < 4; i++) { G.time += 1 / 60; updateEffects(1 / 60); } }
  for (const a of gang.slice(0, 3)) burst(a, a.yaw, { x: p.x + 1.5, z: p.z - 0.5 }, { id: 'pistol', range: Math.hypot(p.x - a.x, p.z - a.z) - 2, pellets: 1 }, a); // near misses that fall short of Nico
  burst(p, p.yaw, gang[2], WEAPONS[2], 'player'); // the round leaving the muzzle now
  // SBPD rolling in: one from the far junction, one braking out of the cross street, an officer out with a pistol
  copAt(JX - 38, JZ + 3.5, EAST, { speed: 12, ai: 'ARRIVING' });
  copAt(JX - 10.5, JZ - 6.5, SOUTH + 1.05, { speed: 8, ai: 'PURSUIT', steer: 0.45 });
  personAt('cop', JX - 7.5, JZ - 11.5, Math.atan2(-2, 1), { style: STYLES.cop, gun: 'pistol', aim: true, stride: 0 });
  // traffic stopped dead around the junction
  trafficAt('x', 6, JX - 46, 1, 'tupelo', undefined, 0); trafficAt('x', 6, JX - 58, -1, 'calder', 0x8e5ad8, 0); trafficAt('x', 6, JX - 70, 1, 'pico', 0xff8a3d, 0);
  trafficAt('z', 8, JZ - 40, -1, 'tidebus', undefined, 0); trafficAt('z', 8, JZ + 26, -1, 'rumble', 0x8fd3c8, 0); trafficAt('x', 6, JX + 20, -1, 'marlin', 0xe83a5c, 0);
  stageScooter(0, 'x', 6, JX - 36, 1, 3.6, 1.2);
  // people running from the gunfire down both sidewalks and across the street, more frozen further back
  const run = (x, z, yaw, i) => personAt('ped', x, z, yaw, { run: true, phase: i * 1.9 });
  [[JX - 16, JZ + 9.3], [JX - 10, JZ + 8.6], [JX - 5, JZ + 9.6], [JX - 19, JZ + 8.8]].forEach(([x, z], i) => run(x, z, EAST + 0.15, i));
  [[JX - 19, JZ - 9.1], [JX - 4.5, JZ - 8.7], [JX - 24, JZ - 9.4]].forEach(([x, z], i) => run(x, z, EAST - 0.2, i + 4));
  [[JX - 3, JZ - 6], [JX - 1, JZ + 11.5], [JX - 4, JZ + 9.6], [JX - 2.2, JZ + 8.4]].forEach(([x, z], i) => run(x, z, i === 0 ? NORTH + 0.4 : i === 1 ? SOUTH : EAST + 0.5, i + 8));
  strollers(JX - 34, JZ + 9.2, JX - 70, JZ + 9.2, 6); strollers(JX - 34, JZ - 9.2, JX - 70, JZ - 9.2, 5); strollers(JX + 9.2, JZ - 14, JX + 9.2, JZ - 50, 5);
  setStars(3); G.wanted.heat = 3.4; updateSirens(0.1); updateLineOfSight(1);
  G.exposure = 1.14; if (G.post) Object.assign(G.post.params, { bloom: 0.16, threshold: 1.6, vignette: 0.12 });
  lamp(0xffd2a8, 90, 10, p.x + 2, 3, p.z + 2); // warm bounce on Nico's back
  frame(F.cam, F.look, F.fov); clearPalmsNear(F.cam[0], F.cam[2], 9);
  renderShot(api);
}

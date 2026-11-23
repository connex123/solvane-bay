// Screenshot 2: an on-foot firefight where Bayview Ave meets The Strand, in the golden afternoon (chapter 3, Coral
// Kings Don't Share). Seen from high on the beach side: Nico at the corner fires the SMG down the avenue at the Coral
// Kings dug in behind Brandt's black Hawke; the sedan they shot up has just gone up in a fireball between them; people
// run across the junction, Strand traffic has stopped or swerved, and SBPD cruisers close in from both ways along the
// Strand and from the far end of the avenue, officers out with pistols. Full HUD: chapter objective, three stars,
// SBPD list, weapon bar, minimap with police blips.
import { G } from '../core/gameState.js';
import { lineCoord, LANE, N } from '../core/config.js';
import { STYLES, setGun, animateWalk } from '../characters/characterModel.js';
import { setStars } from '../police/wantedSystem.js';
import { updateSirens, updateEffects, fire } from '../combat/effects.js';
import { updateLineOfSight } from '../police/lineOfSight.js';
import { fire as shootRay } from '../combat/projectiles.js';
import { WEAPONS } from '../combat/weapons.js';
import { wreck } from '../vehicles/carPhysics.js';
import { setScene, setMission, carAt, copAt, trafficAt, personAt, strollers, frame, lamp, renderShot, clearPalmsNear } from './sceneStaging.js';

const JX = lineCoord(N), JZ = lineCoord(6), EAST = Math.PI / 2, WEST = -Math.PI / 2, NORTH = Math.PI, SOUTH = 0; // the Strand x Bayview junction
export const FIGHT = { clock: 15.4, cam: [JX + 6, 8.5, JZ + 3.5], look: [JX - 24, 0.5, JZ + 0.5], fov: 48, nico: [JX - 9, JZ - 1.2] };
const tick = (n) => { for (let i = 0; i < n; i++) { G.time += 1 / 60; updateEffects(1 / 60); } };
export function streetFight(api) {
  const p = G.p, F = FIGHT;
  setScene({ clock: F.clock, money: 6420, xp: 540, completed: ['m1', 'm2'], hp: 72, armor: 45, weapon: 2, magic: 0.4, blaze: 0.35, owned: { 0: 1, 1: 1, 2: 1, 3: 1 }, ammo: { pistol: 84, smg: 210, shotgun: 24, molotov: 0 }, crew: { cd: { wren: 0 }, swaps: 0 } });
  setMission(2, 1, 'Run the Coral Kings off Bayview Ave (4 left)');
  // Brandt's crew dug in down the avenue behind their Hawke and the burning sedan, guns up at Nico
  carAt('hawke', JX - 24.5, JZ - 1, NORTH + 0.5, { tint: 0x15151a });
  const gang = [[JX - 19.5, JZ + 1.4], [JX - 22.5, JZ - 4.2], [JX - 26.5, JZ - 2.2], [JX - 19.5, JZ + 8.4]].map(([x, z], i) => {
    const a = personAt('gang', x, z, Math.atan2(F.nico[0] - x, F.nico[1] - z), { style: STYLES.coral, gun: i === 1 ? 'smg' : 'pistol', aim: true, stride: 0 }); a.hp = 90; a.aggro = true; return a;
  });
  G.mission.enemies = gang;
  // the sedan they shot up has just gone up between the two sides
  const burner = carAt('marlin', JX - 17, JZ + 4.6, WEST + 0.6, { tint: 0x2f7fd8 }); wreck(burner);
  for (let i = 0; i < 11; i++) { tick(1); if (i % 2 === 0) fire(burner.x + (i % 3 - 1) * 0.7, 1.1, burner.z + ((i >> 1) % 3 - 1) * 0.5); }
  // Nico at the corner, SMG up, firing down the avenue
  p.x = F.nico[0]; p.z = F.nico[1]; p.yaw = Math.atan2(gang[0].x - p.x, gang[0].z - p.z) + 0.04; p.aim = true; p.mesh.visible = true; p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw; setGun(p.mesh, 'smg'); animateWalk(p.mesh, 0, 0, true);
  const muzzle = (a, yaw) => ({ x: a.x + Math.sin(yaw) * 0.9 + Math.cos(yaw) * 0.2, y: 1.35, z: a.z + Math.cos(yaw) * 0.9 - Math.sin(yaw) * 0.2 });
  const burst = (from, yaw, to, w, who) => { const m = muzzle(from, yaw), dx = to.x - m.x, dy = 1.2 - m.y, dz = to.z - m.z, l = Math.hypot(dx, dy, dz); shootRay(who, { ...w, dmg: 0, spread: 0.01 }, m.x, m.y, m.z, dx / l, dy / l, dz / l, m); };
  burst(p, p.yaw, gang[0], WEAPONS[2], 'player'); tick(2); burst(p, p.yaw, gang[3], WEAPONS[2], 'player'); tick(2);
  for (const a of gang.slice(0, 3)) burst(a, a.yaw, { x: p.x - 1.2, z: p.z - 0.8 }, { id: 'pistol', range: Math.hypot(p.x - a.x, p.z - a.z) - 2.5, pellets: 1 }, a); // near misses that fall short of Nico
  burst(p, p.yaw, gang[1], WEAPONS[2], 'player'); // the round leaving the muzzle now
  // SBPD closing in: one swung in off the Strand behind Nico, one braking in behind the gang, one more down the avenue
  copAt(JX - 13, JZ - 5.8, WEST + 0.35, { speed: 3, ai: 'PURSUIT', steer: 0.5 });
  copAt(JX - 36, JZ - 3.5, EAST - 0.5, { speed: 7, ai: 'PURSUIT', steer: -0.4 });
  copAt(JX - 50, JZ + 3.5, EAST, { speed: 12, ai: 'ARRIVING' });
  personAt('cop', JX - 15.5, JZ - 8.2, Math.atan2(-6, 7), { style: STYLES.cop, gun: 'pistol', aim: true, stride: 0 });
  personAt('cop', JX - 33, JZ - 7, Math.atan2(8, 5), { style: STYLES.cop, gun: 'pistol', aim: true, stride: 0 });
  // traffic stopped dead along the avenue and the Strand, one car swerving away from the junction
  trafficAt('x', 6, JX - 46, 1, 'tupelo', 0xf6c21c, 0); trafficAt('x', 6, JX - 62, -1, 'tidebus', undefined, 0); trafficAt('x', 6, JX - 72, 1, 'pico', 0xff8a3d, 0);
  trafficAt('z', N, JZ - 26, 1, 'calder', 0x2fb89a, 0); trafficAt('z', N, JZ + 22, -1, 'marlin', 0xe83a5c, 0);
  carAt('rumble', JX - 2, JZ + 11, NORTH + 0.8, { kind: 'traffic', tint: 0xf0f0f0, speed: 6, steer: 0.5 });
  // people running from the gunfire across the junction and along both sidewalks
  const run = (x, z, yaw, i) => personAt('ped', x, z, yaw, { run: true, phase: i * 1.9 });
  [[JX - 10, JZ + 9.4], [JX - 6, JZ + 10.2], [JX - 13, JZ + 9], [JX - 3, JZ + 6]].forEach(([x, z], i) => run(x, z, EAST + 0.5, i));
  [[JX - 12, JZ - 9.2], [JX - 15, JZ - 8.6], [JX - 2, JZ - 9]].forEach(([x, z], i) => run(x, z, EAST - 0.4, i + 4));
  [[JX - 31, JZ + 9.3], [JX - 34, JZ - 9.2], [JX - 7, JZ + 4.5], [JX - 6.5, JZ + 1.6], [JX - 11.5, JZ + 6.6]].forEach(([x, z], i) => run(x, z, i >= 2 ? EAST + 0.7 - i * 0.1 : WEST, i + 8));
  [[JX - 21, JZ - 9.6], [JX - 24, JZ - 9], [JX - 9.5, JZ - 10], [JX - 17, JZ + 9.8], [JX - 23, JZ + 10.2]].forEach(([x, z], i) => run(x, z, i < 3 ? EAST - 0.3 : WEST + 0.3, i + 13));
  strollers(JX - 40, JZ + 9.2, JX - 80, JZ + 9.2, 6); strollers(JX - 40, JZ - 9.2, JX - 80, JZ - 9.2, 6);
  setStars(3); G.wanted.heat = 3.4; updateSirens(0.1); updateLineOfSight(1);
  G.exposure = 1.18; if (G.post) Object.assign(G.post.params, { bloom: 0.15, threshold: 1.6, vignette: 0.1 });
  lamp(0xffd2a8, 70, 10, p.x + 2, 4, p.z + 2); lamp(0xffa050, 120, 14, burner.x - 1.5, 2.5, burner.z - 2); // the fire lights the crew crouched behind it
  frame(F.cam, F.look, F.fov); clearPalmsNear(F.cam[0], F.cam[2], 12);
  renderShot(api);
}

// Screenshot 4: a different place and hour, the sea off Marina Cala at sunset (chapter 7, The Ledger). Nico runs the
// stolen ledger south in the Skipjack speedboat with three SBPD harbour launches in his wake and AIR-1 overhead with its
// searchlight on him, past Brandt's yacht, the marina piers, the palm shore and the downtown skyline, under the Causeway pylon.
// The boats are driven by the real boat physics for a few seconds so the wakes are genuine. Full HUD with the boat gauge.
import { G } from '../core/gameState.js';
import { HALF, N } from '../core/config.js';
import { setStars } from '../police/wantedSystem.js';
import { addMarker } from '../missions/markers.js';
import { DROP } from '../world/marina.js';
import { updateSirens, updateEffects } from '../combat/effects.js';
import { updateLineOfSight } from '../police/lineOfSight.js';
import { createBoat, enterBoat, updateBoats } from '../vehicles/boats.js';
import { boatShot } from '../combat/boatGunfight.js';
import { mooredSpeedboat } from '../missions/ledgerHeist.js';
import { setScene, setMission, trafficAt, strollers, heliAt, frame, renderShot } from './sceneStaging.js';

export const MARINA = { clock: 17.4, start: [418, -232, 0.12], speed: 27, steps: 110, launches: [[410, -262, 0.2], [426, -268, 0.05], [400, -276, 0.3]],
  cam: [466, 19, -246], look: [404, 0, -168], fov: 58 };
export function marinaChase(api) {
  const p = G.p, M = MARINA;
  setScene({ clock: M.clock, money: 31650, xp: 1900, completed: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'], hp: 78, armor: 40, weapon: 2, magic: 1, blaze: 0.9, crew: { cd: { wren: 12 }, swaps: 1 } });
  const b = mooredSpeedboat(); b.x = M.start[0]; b.z = M.start[1]; b.heading = M.start[2]; b.vx = Math.sin(b.heading) * M.speed; b.vz = Math.cos(b.heading) * M.speed; enterBoat(b); b.input.throttle = 1;
  const launches = M.launches.map(([x, z, h]) => { const l = createBoat('patrol', x, z, h, 'ai'); l.driver = 'ai'; l.vx = Math.sin(h) * 26; l.vz = Math.cos(h) * 26; return l; });
  for (let i = 0; i < M.steps; i++) { b.input.steer = i > 70 ? -0.35 : 0; G.time += 1 / 60; updateBoats(1 / 60); updateEffects(1 / 60); }
  p.x = b.x; p.z = b.z;
  // the lead launch's bow gunner walks a burst across the water toward the Skipjack
  const lead = launches[0]; for (let k = 0; k < 2; k++) boatShot(lead.x + Math.sin(lead.heading) * 3.6, 1.9, lead.z + Math.cos(lead.heading) * 3.6, b, 3, 0);
  for (let i = 0; i < 4; i++) { G.time += 1 / 60; updateEffects(1 / 60); }
  heliAt(b.x + 24, 16.5, b.z - 42, -2.2, [b.x, b.z]).cone.material.opacity = 0.09;
  // evening traffic on the Strand and people on the promenade and the sand
  trafficAt('z', N, -150, -1, 'tidebus'); trafficAt('z', N, -190, 1, 'rumble', 0xff8a3d); trafficAt('z', N, -120, 1, 'tupelo'); trafficAt('z', N, -230, -1, 'hawke', 0xf0f0f0); trafficAt('z', N, -95, -1, 'calder', 0x2fb89a);
  strollers(HALF + 9.4, -100, HALF + 9.4, -240, 10); strollers(HALF + 20, -110, HALF + 30, -230, 9, { jitter: 8 });
  addMarker({ x: DROP.x, z: DROP.z, kind: 'obj', label: 'Point Wren light', color: 0xffd23c, auto: false });
  setStars(4); G.wanted.heat = 4.2; setMission(6, 6); updateSirens(0.1); updateLineOfSight(1);
  G.exposure = 1.25; if (G.post) Object.assign(G.post.params, { bloom: 0.2, threshold: 1.5, vignette: 0.14 });
  frame(M.cam, M.look, M.fov);
  renderShot(api);
}

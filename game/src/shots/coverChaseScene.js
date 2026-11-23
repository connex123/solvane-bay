// Cover shot: a four-star SBPD chase north up The Strand, the palm boulevard by the beach, in the afternoon sun.
// Nico's coral Veloce GT runs the northbound lane through civilian traffic with cruisers on its bumper and quarter,
// AIR-1 low overhead with its searchlight on the car, a roadblock waiting at the next junction, people on both
// sidewalks and the beach, the sea and the Causeway beyond. Full HUD: mission card, SBPD list, stars, minimap, weapons.
import { G } from '../core/gameState.js';
import { HALF, LANE, N } from '../core/config.js';
import { enterCar } from '../characters/playerController.js';
import { setStars } from '../police/wantedSystem.js';
import { addMarker } from '../missions/markers.js';
import { MARINA_GATE } from '../world/marina.js';
import { updateSirens, particle, skidMark } from '../combat/effects.js';
import { updateLineOfSight } from '../police/lineOfSight.js';
import { stageMoto } from '../vehicles/motoTaxis.js';
import { setScene, setMission, carAt, copAt, trafficAt, strollers, personAt, heliAt, frame, lamp, renderShot, clearPalmsNear, thinPalms } from './sceneStaging.js';

const NB = HALF + LANE, SB = HALF - LANE, NORTH = Math.PI, SOUTH = 0; // the Strand's northbound and southbound lanes
export const COVER = { clock: 14.8, car: [NB - 0.4, 146], cam: [HALF + 3.2, 10.5, 171], look: [HALF - 1.2, 0, 128], fov: 54, roll: 0 };
export function coverChase(api) {
  const p = G.p, C = COVER;
  setScene({ clock: C.clock, money: 48250, xp: 760, completed: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'], hp: 86, armor: 60, weapon: 2, magic: 0.4, blaze: 0.35, crew: { cd: { sol: 22 }, swaps: 1 } });
  const car = carAt('veloce', C.car[0], C.car[1], NORTH + 0.06, { speed: 38, steer: 0.15, tint: 0xf22a1c }); enterCar(car); car.boosting = true; car.input.throttle = 1; car.hp = car.maxHp * 0.7; p.x = car.x; p.z = car.z;
  // SBPD: one on the bumper, one on the right quarter, one further back, and a roadblock across the next junction
  copAt(SB + 1.0, 149.5, NORTH - 0.16, { speed: 38, ai: 'RAMMING', steer: -0.25 });
  copAt(NB + 0.9, 155, NORTH + 0.08, { speed: 37, ai: 'PURSUIT', steer: 0.15 });
  copAt(SB + 0.2, 160.5, NORTH - 0.04, { speed: 36, ai: 'PURSUIT' });
  copAt(SB + 1, 100, NORTH + 1.25, { ai: 'ROADBLOCK' }).rbT = 40; copAt(NB + 0.5, 101, NORTH - 1.3, { ai: 'ROADBLOCK' }).rbT = 40;
  // civilian traffic both ways up the Strand and on the cross street
  trafficAt('z', N, 128, -1, 'tupelo', 0xf6c21c, 8); trafficAt('z', N, 112, -1, 'calder', 0x2fb89a, 6); trafficAt('z', N, 70, -1, 'tidebus', undefined, 9);
  trafficAt('z', N, 136, 1, 'pico', 0xff8a3d, 10); trafficAt('z', N, 120, 1, 'hawke', 0xf0f0f0, 10); trafficAt('z', N, 84, 1, 'marlin', 0x2f7fd8, 10); trafficAt('z', N, 50, 1, 'rumble', 0x8fd3c8, 10);
  stageMoto(0, 'z', N, 140, -1, LANE * 0.4, 0.8); stageMoto(1, 'z', N, 104, 1, LANE * 0.5, 2.1);
  // people on the city sidewalk, the beach promenade and the sand; a few near the chase turn and run
  strollers(HALF - 9.4, 168, HALF - 9.4, 96, 12); strollers(HALF + 9.4, 168, HALF + 9.4, 96, 10, { run: 0.3 });
  strollers(HALF + 16, 165, HALF + 22, 90, 8, { jitter: 6 });
  personAt('ped', HALF + 8.6, 148, 1.6, { run: true }); personAt('ped', HALF + 9.8, 144, 1.4, { run: true });
  // AIR-1 low over the boulevard ahead-left, searchlight on the Veloce
  heliAt(HALF - 6, 17, 132, 0.5, [car.x, car.z]).cone.material.opacity = 0.09; // daylight: a faint beam, the pool on the road does the work
  { const { x, z } = MARINA_GATE; addMarker({ x, z, kind: 'obj', label: 'Marina gate', color: 0xffd23c, auto: false }); }
  setStars(4); G.wanted.heat = 4.3; setMission(6, 1); updateSirens(0.1); updateLineOfSight(1);
  // skid marks from the swerve through traffic and a thin nitro flame
  for (let k = 0; k < 30; k++) for (const sg of [-1, 1]) skidMark(car.x + sg * 0.85 + Math.sin(k * 0.12) * 0.6, car.z + 2 + k * 0.8, NORTH + 0.06);
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading); for (let k = 0; k < 3; k++) particle({ x: car.x - fx * (2.45 + k * 0.3), y: 0.38, z: car.z - fz * (2.45 + k * 0.3), life: 0.3, size: 0.5 - k * 0.1, color: k < 2 ? 0xe8f6ff : 0x7fc8ff, add: true, hdr: 1.6 });
  G.exposure = 1.12; if (G.post) Object.assign(G.post.params, { bloom: 0.14, threshold: 1.7, vignette: 0.12 });
  lamp(0xfff0dc, 60, 14, car.x + 3, 4, car.z + 3);
  frame(C.cam, C.look, C.fov, C.roll); clearPalmsNear(C.cam[0], C.cam[2], 16);
  renderShot(api);
}

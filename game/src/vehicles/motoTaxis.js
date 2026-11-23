// Moto-taxis: small teal motorbikes with a helmeted rider (and often a passenger) weaving along the lanes near the
// player, faster than the cars (movement shared with the delivery scooters in vehicles/laneRiders.js).
import { LANE } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { createRiderFleet } from './laneRiders.js';

const COUNT = 12; let fleet = null;
const HELMETS = [0xe8604c, 0xf6c21c, 0xfff4e0, 0x2fb8a8], SHIRTS = [0xf6e3b4, 0x3a8fd0, 0xe8604c, 0x8fd3c8, 0xffffff];
function bikeGeometry(i) {
  const B = newBuf(), helmet = HELMETS[i % 4], shirt = SHIRTS[i % 5];
  pushBox(B, 0, 0, 0.72, 0.16, 0.62, 0.62, 0x1c2226); pushBox(B, 0, 0, -0.72, 0.18, 0.62, 0.62, 0x1c2226); // wheels
  pushBox(B, 0, 0.42, 0, 0.36, 0.38, 1.3, 0x16808a); pushBox(B, 0, 0.62, 0.62, 0.42, 0.36, 0.34, 0x16808a); pushBox(B, 0, 0.8, 0.12, 0.34, 0.12, 0.9, 0x23292e); // body, nose, seat
  pushBox(B, 0, 0.98, 0.8, 0.9, 0.06, 0.06, 0x30363a); pushBox(B, 0, 0.66, 0.84, 0.3, 0.16, 0.06, 0xfff2c0); // bars, headlamp
  pushBox(B, 0, 0.86, 0.2, 0.44, 0.62, 0.3, shirt); pushBox(B, 0, 1.46, 0.24, 0.3, 0.3, 0.32, helmet); pushBox(B, 0, 1.47, 0.42, 0.24, 0.12, 0.04, 0x1a2a30); // rider, helmet, visor
  for (const s of [-1, 1]) { pushBox(B, s * 0.2, 0.5, 0.35, 0.12, 0.42, 0.14, 0x2a3440); pushBox(B, s * 0.24, 1.12, 0.48, 0.1, 0.1, 0.5, shirt); } // legs, arms
  if (i % 3 !== 2) { pushBox(B, 0, 0.86, -0.32, 0.42, 0.56, 0.28, SHIRTS[(i + 2) % 5]); pushBox(B, 0, 1.4, -0.32, 0.28, 0.28, 0.3, HELMETS[(i + 1) % 4]); } // passenger
  return toGeometry(B);
}
export function initMotoTaxis(scene) { fleet = createRiderFleet(scene, COUNT, bikeGeometry, { speed: [13, 19] }); fleet.update(0); }
export function updateMotoTaxis(dt) { fleet?.update(dt); }
// Staged scenes put a bike at an exact spot on an avenue.
export function stageMoto(i, axis, line, t, dir, lane = LANE, phase = 0) { fleet.stage(i, axis, line, t, dir, lane, phase); }

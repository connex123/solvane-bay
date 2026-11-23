// Delivery scooters: step-through scooters with a big insulated box on the back in the colours of the city's food
// and parcel couriers, riding the right-hand lanes and pulling in to the kerb every few blocks for a drop-off.
import { LANE } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { createRiderFleet } from './laneRiders.js';

const COUNT = 8; let fleet = null;
const BOXES = [0xff6f59, 0x2fd6c4, 0xffc93c, 0x8e5ad8], BODIES = [0xfff4e6, 0x9ec9e8, 0xf4a6a0, 0x2a3440], JACKETS = [0xff6f59, 0x1fa8a0, 0xf2c230, 0x8e5ad8];
function scooterGeometry(i) {
  const B = newBuf(), box = BOXES[i % 4], body = BODIES[(i + 1) % 4], jacket = JACKETS[i % 4];
  pushBox(B, 0, 0, 0.62, 0.14, 0.48, 0.48, 0x1c2226); pushBox(B, 0, 0, -0.58, 0.16, 0.48, 0.48, 0x1c2226); // small wheels
  pushBox(B, 0, 0.3, -0.25, 0.5, 0.42, 0.95, body); pushBox(B, 0, 0.22, 0.25, 0.42, 0.14, 0.5, body); // rear body, floorboard
  pushBox(B, 0, 0.3, 0.62, 0.36, 0.8, 0.2, body); pushBox(B, 0, 1.1, 0.66, 0.7, 0.06, 0.06, 0x30363a); pushBox(B, 0, 0.92, 0.72, 0.2, 0.14, 0.06, 0xfff2c0); // leg shield, bars, lamp
  pushBox(B, 0, 0.72, -0.18, 0.36, 0.1, 0.62, 0x23292e); // seat
  pushBox(B, 0, 0.82, -0.72, 0.62, 0.6, 0.56, box); pushBox(B, 0, 1.42, -0.72, 0.64, 0.04, 0.58, 0xffffff); // delivery box and lid
  pushBox(B, 0, 0.8, -0.12, 0.44, 0.6, 0.3, jacket); pushBox(B, 0, 1.4, -0.1, 0.3, 0.3, 0.32, 0xfff4e0); pushBox(B, 0, 1.42, 0.08, 0.24, 0.12, 0.04, 0x1a2a30); // rider, helmet, visor
  for (const s of [-1, 1]) { pushBox(B, s * 0.17, 0.36, 0.25, 0.12, 0.42, 0.14, 0x2a3440); pushBox(B, s * 0.22, 1.06, 0.3, 0.1, 0.1, 0.5, jacket); } // legs, arms
  return toGeometry(B);
}
export function initDeliveryScooters(scene) { fleet = createRiderFleet(scene, COUNT, scooterGeometry, { speed: [10, 14], weave: 0.6, stopEvery: 140, stopFor: 5 }); fleet.update(0); }
export function updateDeliveryScooters(dt) { fleet?.update(dt); }
export function stageScooter(i, axis, line, t, dir, lane = LANE, phase = 0) { fleet.stage(i, axis, line, t, dir, lane, phase); }

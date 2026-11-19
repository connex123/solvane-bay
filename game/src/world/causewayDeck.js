// The drivable Causeway: an on-ramp from the end of the Crown Heights avenue up onto the deck, kerb walls that keep
// cars on it, and the deck height under any point so cars, the player and the camera ride up there.
import * as THREE from 'three';
import { HALF } from '../core/config.js';
import { addBox } from './collision.js';
import { CAUSEWAY } from './landmarks.js';

export const RAMP = { x0: HALF + 6, x1: CAUSEWAY.x0, half: 10.2 };
export const DECK_END = CAUSEWAY.x0 + 700; // where the kerb walls stop (well past the Gala stage)
export function deckHeight(x, z) {
  if (Math.abs(z - CAUSEWAY.z) > RAMP.half + 0.4 || x < RAMP.x0 || x > CAUSEWAY.x0 + 1400) return 0;
  return x < RAMP.x1 ? (x - RAMP.x0) / (RAMP.x1 - RAMP.x0) * CAUSEWAY.deckY : CAUSEWAY.deckY;
}
export function buildCausewayRamp(scene) {
  const len = RAMP.x1 - RAMP.x0, rise = CAUSEWAY.deckY, ang = Math.atan2(rise, len), slope = Math.hypot(len, rise), z = CAUSEWAY.z;
  const g = new THREE.Group(); g.position.set((RAMP.x0 + RAMP.x1) / 2, rise / 2, z); g.rotation.z = ang; scene.add(g);
  const box = (w, h, d, y, zz, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c })); m.position.set(0, y, zz); m.receiveShadow = true; g.add(m); };
  box(slope, 1.6, 22, -0.82, 0, 0xd8d2c8); box(slope, 0.1, 21, 0.0, 0, 0x50565e);
  for (const s of [-1, 1]) { box(slope, 1.1, 0.3, 0.55, s * 10.4, 0xf6ead2); box(slope, 0.5, 0.32, -1.2, s * 11.1, 0xe8604c); }
  for (let k = 1; k < 4; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(3, rise * k / 4, 10), new THREE.MeshLambertMaterial({ color: 0xcfc6b6 })); m.position.set(RAMP.x0 + len * k / 4, rise * k / 8 - 0.6, z); scene.add(m); }
  // kerb walls along both sides of ramp and deck: cars on the Causeway stay on it
  for (const s of [-1, 1]) addBox({ x0: RAMP.x0 + 2, x1: DECK_END, z0: z + s * RAMP.half + (s > 0 ? 0 : -1.2), z1: z + s * RAMP.half + (s > 0 ? 1.2 : 0) });
}

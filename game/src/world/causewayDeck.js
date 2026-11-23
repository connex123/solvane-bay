// Driving onto the Causeway: a ramp climbs from the end of the Crown Heights avenue to the bridge deck, kerb walls
// keep cars on it, and deckHeight() tells cars, the player and the camera how high the road is at any point.
import * as THREE from 'three';
import { HALF } from '../core/config.js';
import { addBox } from './collision.js';
import { CAUSEWAY } from './landmarks.js';

export const RAMP = { x0: HALF + 6, x1: CAUSEWAY.x0, half: 10.2 };
export const DECK_END = CAUSEWAY.x0 + 700; // the kerb walls end here, well past the Gala stage
const DECK_FAR = CAUSEWAY.x0 + 1400; // beyond this there is no deck to stand on

/** Road height at (x, z): rising along the ramp, level on the deck, 0 everywhere else. */
export function deckHeight(x, z) {
  const offDeck = Math.abs(z - CAUSEWAY.z) > RAMP.half + 0.4;
  if (offDeck || x < RAMP.x0 || x > DECK_FAR) return 0;
  if (x >= RAMP.x1) return CAUSEWAY.deckY;
  return ((x - RAMP.x0) / (RAMP.x1 - RAMP.x0)) * CAUSEWAY.deckY;
}

export function buildCausewayRamp(scene) {
  const run = RAMP.x1 - RAMP.x0;
  const rise = CAUSEWAY.deckY;
  const z = CAUSEWAY.z;
  const slopeLength = Math.hypot(run, rise);

  // The ramp is a tilted group: boxes inside it are laid out flat and the group supplies the incline.
  const incline = new THREE.Group();
  incline.position.set((RAMP.x0 + RAMP.x1) / 2, rise / 2, z);
  incline.rotation.z = Math.atan2(rise, run);
  scene.add(incline);
  const slab = (height, width, y, side, color) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(slopeLength, height, width), new THREE.MeshLambertMaterial({ color }));
    mesh.position.set(0, y, side);
    mesh.receiveShadow = true;
    incline.add(mesh);
  };
  slab(1.6, 22, -0.82, 0, 0xd8d2c8); // concrete body
  slab(0.1, 21, 0.0, 0, 0x50565e); // asphalt
  for (const side of [-1, 1]) {
    slab(1.1, 0.3, 0.55, side * 10.4, 0xf6ead2); // parapet
    slab(0.5, 0.32, -1.2, side * 11.1, 0xe8604c); // coral fascia
  }

  // three piers under the ramp, rising with it
  for (let k = 1; k <= 3; k++) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(3, (rise * k) / 4, 10), new THREE.MeshLambertMaterial({ color: 0xcfc6b6 }));
    pier.position.set(RAMP.x0 + (run * k) / 4, (rise * k) / 8 - 0.6, z);
    scene.add(pier);
  }

  // kerb walls down both sides of ramp and deck keep Causeway traffic on the bridge
  const wallStart = RAMP.x0 + 2;
  addBox({ x0: wallStart, x1: DECK_END, z0: z - RAMP.half - 1.2, z1: z - RAMP.half });
  addBox({ x0: wallStart, x1: DECK_END, z0: z + RAMP.half, z1: z + RAMP.half + 1.2 });
}

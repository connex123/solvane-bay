// Life on the Strand: striped lifeguard towers on stilts, beach-goers on towels, sitting under umbrellas and standing
// at the waterline, beach umbrellas and a volleyball net. One merged mesh, placed from the seeded world rng.
import * as THREE from 'three';
import { HALF, SEA_X } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';

const SKIN = [0xf2c8a0, 0xd9a07a, 0xa86e48, 0x7a4a2e, 0xe8b890], SUITS = [0xe8604c, 0x2fb8a8, 0xf6c21c, 0x3a8fd0, 0xffffff, 0xff8aa8];
const TOWELS = [0xe8604c, 0xfff4e0, 0x2fb8a8, 0xf6c21c, 0x8fd3c8];
export const LIFEGUARD_TOWERS = [{ x: HALF + 31, z: 196 }, { x: HALF + 31, z: -6 }, { x: HALF + 31, z: -214 }];

function tower(B, x, z) {
  for (const sx of [-1.4, 1.4]) for (const sz of [-1.4, 1.4]) pushBox(B, x + sx, 0, z + sz, 0.28, 3.2, 0.28, 0xfff4e0); // stilts
  pushBox(B, x, 3.1, z, 4, 0.3, 4, 0xd8c8a6); pushBox(B, x, 3.4, z, 3.4, 2.1, 3.4, 0x2fb8a8); // deck, cabin
  for (let k = 0; k < 4; k++) pushBox(B, x, 3.6 + k * 0.5, z - 1.72, 3.42, 0.25, 0.04, k % 2 ? 0xfff4e0 : 0xe8604c); // striped front
  pushBox(B, x, 3.9, z - 1.73, 2.4, 0.9, 0.06, 0x1f4a54); pushBox(B, x, 5.5, z, 4.2, 0.3, 4.2, 0xe8604c); // window, roof
  for (let k = 0; k < 6; k++) pushBox(B, x - 2.4 - k * 0.45, 2.9 - k * 0.55, z, 0.45, 0.12, 1.2, 0xb08a5a); // ramp
  pushBox(B, x + 1.6, 5.8, z + 1.6, 0.08, 2.6, 0.08, 0xeeeeee); pushBox(B, x + 2.1, 7.6, z + 1.6, 1, 0.6, 0.04, 0xe8604c); // flagpole, flag
}
function person(B, rng, x, z, pose) {
  const skin = rng.pick(SKIN), suit = rng.pick(SUITS);
  if (pose === 'lying') { pushBox(B, x, 0.02, z, 1.0, 0.04, 2.0, rng.pick(TOWELS)); pushBox(B, x, 0.06, z - 0.2, 0.4, 0.2, 1.3, skin); pushBox(B, x, 0.08, z - 0.05, 0.42, 0.2, 0.5, suit); pushBox(B, x, 0.06, z + 0.62, 0.24, 0.22, 0.26, skin); return; }
  if (pose === 'sitting') { pushBox(B, x, 0.02, z, 0.9, 0.04, 1.8, rng.pick(TOWELS)); pushBox(B, x, 0.06, z + 0.4, 0.38, 0.2, 0.8, skin); pushBox(B, x, 0.1, z - 0.25, 0.42, 0.62, 0.3, suit); pushBox(B, x, 0.74, z - 0.25, 0.24, 0.26, 0.24, skin); return; }
  pushBox(B, x - 0.1, 0, z, 0.14, 0.85, 0.16, skin); pushBox(B, x + 0.1, 0, z, 0.14, 0.85, 0.16, skin); pushBox(B, x, 0.8, z, 0.42, 0.34, 0.24, suit);
  pushBox(B, x, 1.14, z, 0.38, 0.4, 0.22, rng() < 0.5 ? skin : suit); pushBox(B, x, 1.56, z, 0.24, 0.26, 0.24, skin); pushBox(B, x, 1.8, z, 0.26, 0.08, 0.26, rng.pick([0x3a2a1a, 0xf6e3b4, 0x1a1a1a]));
}
export function buildBeachLife(scene, rng) {
  const B = newBuf();
  for (const t of LIFEGUARD_TOWERS) tower(B, t.x, t.z);
  for (let k = 0; k < 70; k++) {
    const z = rng.range(-HALF + 10, HALF + 20), r = rng(), pose = r < 0.4 ? 'lying' : r < 0.7 ? 'sitting' : 'standing';
    const x = pose === 'standing' && rng() < 0.6 ? SEA_X - rng.range(1, 6) : HALF + rng.range(12, 40);
    if (LIFEGUARD_TOWERS.some((t) => Math.abs(t.z - z) < 6 && Math.abs(t.x - x) < 6)) continue;
    person(B, rng, x, z, pose);
    if (pose !== 'standing' && rng() < 0.45) { const c = rng.pick(TOWELS); pushBox(B, x + 1.0, 0, z - 0.6, 0.1, 2.3, 0.1, 0xeeeeee); for (let s = 0; s < 4; s++) pushBox(B, x + 1.0, 2.2 + (s % 2) * 0.06, z - 0.6, 2.8 - s * 0.6, 0.18, 2.8 - s * 0.6, s % 2 ? 0xfff4e0 : c); }
  }
  // volleyball net with a game on
  const vz = 120, vx = HALF + 26; for (const s of [-4.5, 4.5]) pushBox(B, vx, 0, vz + s, 0.12, 2.5, 0.12, 0xeeeeee); pushBox(B, vx, 1.6, vz, 0.04, 0.8, 9, 0xfff8ec);
  const m = new THREE.Mesh(toGeometry(B), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
}

// People and furniture on the Strand: striped lifeguard towers on stilts, beach-goers lying on towels, sitting, or
// standing at the waterline, umbrellas over some of them, and a volleyball net. Everything is one merged mesh laid
// out from the seeded world rng.
import * as THREE from 'three';
import { HALF, SEA_X } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';

const SKIN_TONES = [0xf2c8a0, 0xd9a07a, 0xa86e48, 0x7a4a2e, 0xe8b890];
const SWIMWEAR = [0xe8604c, 0x2fb8a8, 0xf6c21c, 0x3a8fd0, 0xffffff, 0xff8aa8];
const TOWEL_COLOURS = [0xe8604c, 0xfff4e0, 0x2fb8a8, 0xf6c21c, 0x8fd3c8];
const HAIR_COLOURS = [0x3a2a1a, 0xf6e3b4, 0x1a1a1a];
const CREAM = 0xfff4e0;
const CORAL = 0xe8604c;
const POLE = 0xeeeeee;

export const LIFEGUARD_TOWERS = [{ x: HALF + 31, z: 196 }, { x: HALF + 31, z: -6 }, { x: HALF + 31, z: -214 }];

function lifeguardTower(buf, x, z) {
  for (const sx of [-1.4, 1.4]) {
    for (const sz of [-1.4, 1.4]) pushBox(buf, x + sx, 0, z + sz, 0.28, 3.2, 0.28, CREAM); // stilts
  }
  pushBox(buf, x, 3.1, z, 4, 0.3, 4, 0xd8c8a6); // deck
  pushBox(buf, x, 3.4, z, 3.4, 2.1, 3.4, 0x2fb8a8); // cabin
  for (let band = 0; band < 4; band++) {
    pushBox(buf, x, 3.6 + band * 0.5, z - 1.72, 3.42, 0.25, 0.04, band % 2 ? CREAM : CORAL); // striped front
  }
  pushBox(buf, x, 3.9, z - 1.73, 2.4, 0.9, 0.06, 0x1f4a54); // window
  pushBox(buf, x, 5.5, z, 4.2, 0.3, 4.2, CORAL); // roof
  for (let tread = 0; tread < 6; tread++) {
    pushBox(buf, x - 2.4 - tread * 0.45, 2.9 - tread * 0.55, z, 0.45, 0.12, 1.2, 0xb08a5a); // ramp down to the sand
  }
  pushBox(buf, x + 1.6, 5.8, z + 1.6, 0.08, 2.6, 0.08, POLE); // flagpole
  pushBox(buf, x + 2.1, 7.6, z + 1.6, 1, 0.6, 0.04, CORAL); // flag
}

function sunbather(buf, rng, x, z, skin, suit) {
  pushBox(buf, x, 0.02, z, 1.0, 0.04, 2.0, rng.pick(TOWEL_COLOURS));
  pushBox(buf, x, 0.06, z - 0.2, 0.4, 0.2, 1.3, skin); // body
  pushBox(buf, x, 0.08, z - 0.05, 0.42, 0.2, 0.5, suit);
  pushBox(buf, x, 0.06, z + 0.62, 0.24, 0.22, 0.26, skin); // head
}

function sitter(buf, rng, x, z, skin, suit) {
  pushBox(buf, x, 0.02, z, 0.9, 0.04, 1.8, rng.pick(TOWEL_COLOURS));
  pushBox(buf, x, 0.06, z + 0.4, 0.38, 0.2, 0.8, skin); // legs out in front
  pushBox(buf, x, 0.1, z - 0.25, 0.42, 0.62, 0.3, suit); // torso
  pushBox(buf, x, 0.74, z - 0.25, 0.24, 0.26, 0.24, skin); // head
}

function stander(buf, rng, x, z, skin, suit) {
  pushBox(buf, x - 0.1, 0, z, 0.14, 0.85, 0.16, skin);
  pushBox(buf, x + 0.1, 0, z, 0.14, 0.85, 0.16, skin);
  pushBox(buf, x, 0.8, z, 0.42, 0.34, 0.24, suit); // hips
  pushBox(buf, x, 1.14, z, 0.38, 0.4, 0.22, rng() < 0.5 ? skin : suit); // bare chest or a top
  pushBox(buf, x, 1.56, z, 0.24, 0.26, 0.24, skin); // head
  pushBox(buf, x, 1.8, z, 0.26, 0.08, 0.26, rng.pick(HAIR_COLOURS));
}

const POSES = { lying: sunbather, sitting: sitter, standing: stander };

function beachGoer(buf, rng, x, z, pose) {
  const skin = rng.pick(SKIN_TONES);
  const suit = rng.pick(SWIMWEAR);
  POSES[pose](buf, rng, x, z, skin, suit);
}

// A pole with four stacked canopy tiers, alternating cream and the umbrella colour.
function umbrella(buf, x, z, colour) {
  pushBox(buf, x, 0, z, 0.1, 2.3, 0.1, POLE);
  for (let tier = 0; tier < 4; tier++) {
    const size = 2.8 - tier * 0.6;
    pushBox(buf, x, 2.2 + (tier % 2) * 0.06, z, size, 0.18, size, tier % 2 ? CREAM : colour);
  }
}

function pickPose(roll) {
  if (roll < 0.4) return 'lying';
  if (roll < 0.7) return 'sitting';
  return 'standing';
}

const nearTower = (x, z) => LIFEGUARD_TOWERS.some((t) => Math.abs(t.z - z) < 6 && Math.abs(t.x - x) < 6);

export function buildBeachLife(scene, rng) {
  const buf = newBuf();
  for (const t of LIFEGUARD_TOWERS) lifeguardTower(buf, t.x, t.z);

  for (let n = 0; n < 70; n++) {
    const z = rng.range(-HALF + 10, HALF + 20);
    const pose = pickPose(rng());
    // most of the standing crowd is at the waterline; everyone else is up the beach
    const atWater = pose === 'standing' && rng() < 0.6;
    const x = atWater ? SEA_X - rng.range(1, 6) : HALF + rng.range(12, 40);
    if (nearTower(x, z)) continue;
    beachGoer(buf, rng, x, z, pose);
    if (pose !== 'standing' && rng() < 0.45) umbrella(buf, x + 1.0, z - 0.6, rng.pick(TOWEL_COLOURS));
  }

  // a volleyball net with a game on
  const netX = HALF + 26, netZ = 120;
  for (const end of [-4.5, 4.5]) pushBox(buf, netX, 0, netZ + end, 0.12, 2.5, 0.12, POLE);
  pushBox(buf, netX, 1.6, netZ, 0.04, 0.8, 9, 0xfff8ec);

  const mesh = new THREE.Mesh(toGeometry(buf), new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// The built city: sidewalks and kerbs round every block, parks, the plaza fountain, container yards on the docks,
// pastel art-deco stucco buildings (plinths, cornices, pilasters, stepped crowns, balconies, awnings, rooftop AC
// units and water tanks) and glass towers downtown. Merged into a handful of static meshes plus instanced extras.
import * as THREE from 'three';
import { STUCCO, GLASS } from '../core/config.js';
import { newBuf, pushBox, toGeometry, inst } from '../core/geometryUtils.js';
import { addBox } from './collision.js';
import { blocks } from './cityLayout.js';
import { G } from '../core/gameState.js';
import { tileTex } from './textureFactory.js';

// Per district: lots across, lots deep, min and max building height.
const DISTRICT_LOTS = {
  downtown: [2, 2, 36, 110],
  neon: [2, 2, 12, 24],
  marina: [2, 2, 8, 16],
  beach: [2, 2, 8, 14],
  old: [2, 2, 8, 20],
  hills: [2, 2, 6, 10],
};
const TRIM_WHITES = [0xffffff, 0xfff6e8, 0xf4fbff];
const AWNING_COLOURS = [0xff5a7a, 0x2fc4b2, 0xffb02e, 0x7a5cff, 0xff7a3d];
const CONTAINER_COLOURS = [0xd9503f, 0x2f7fd8, 0xf2c230, 0x3fa56a, 0xe8e8e8, 0xff8a3d];
const PAVEMENT_TOP = 0.25;
const BLOCK_SPAN = 45; // buildable width of a block
const PLOT_GAP = 0.5; // half the alley between neighbouring lots
const LEDGE_WHITE = 0xf4f6f8;

const darken = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

/** Every building lot placed: { x, z, top, w, d, district, block } (rooftop props and billboards use these). */
export const lots = [];

// One merged buffer per material: stucco, tower glass, detail trim, sidewalks, greenery.
function makeBuffers() {
  return { stucco: newBuf(), glass: newBuf(), detail: newBuf(), sidewalk: newBuf(), green: newBuf() };
}

function sidewalk(buf, block) {
  pushBox(buf.sidewalk, block.cx, 0, block.cz, 50, 0.25, 50, 0xd6ccbc);
  const kerbs = [[-24.8, 0, 0.45, 50], [24.8, 0, 0.45, 50], [0, -24.8, 50, 0.45], [0, 24.8, 50, 0.45]];
  for (const [dx, dz, w, d] of kerbs) pushBox(buf.sidewalk, block.cx + dx, 0, block.cz + dz, w, 0.3, d, 0xf3efe6);
}

function park(buf, block) {
  pushBox(buf.green, block.cx, PAVEMENT_TOP, block.cz, 44, 0.08, 44, 0x6fae5a); // lawn
  pushBox(buf.green, block.cx + 8, 0.33, block.cz - 6, 14, 0.05, 11, 0x4a9fc0); // pond
}

function plaza(buf, block) {
  pushBox(buf.sidewalk, block.cx, PAVEMENT_TOP, block.cz, 36, 0.1, 36, 0xeadcc4); // paving
  pushBox(buf.sidewalk, block.cx, 0.35, block.cz, 9, 0.7, 9, 0xb9d6e2); // fountain basin
  pushBox(buf.green, block.cx, 1.05, block.cz, 7, 0.1, 7, 0x4ab6d8); // water
}

function containerYard(buf, block, rng) {
  for (let n = 0; n < 14; n++) {
    const x = block.cx + rng.range(-19, 19);
    const z = block.cz + rng.range(-19, 19);
    const stack = rng.int(1, 3);
    const colour = rng.pick(CONTAINER_COLOURS);
    for (let level = 0; level < stack; level++) pushBox(buf.stucco, x, PAVEMENT_TOP + level * 2.6, z, 12, 2.6, 2.8, colour);
    addBox({ x0: x - 6, x1: x + 6, z0: z - 1.4, z1: z + 1.4, h: stack * 2.6 + 0.25 });
  }
  // the warehouse
  pushBox(buf.stucco, block.cx + 12, PAVEMENT_TOP, block.cz - 12, 18, 9, 14, 0xc9ccd2, true, rng());
  addBox({ x0: block.cx + 3, x1: block.cx + 21, z0: block.cz - 19, z1: block.cz - 5, h: 9 });
}

// Lot footprint inside the block, leaving alleys between neighbours but none at the block edge.
function lotBounds(block, a, c, across, deep) {
  const cellW = BLOCK_SPAN / across, cellD = BLOCK_SPAN / deep;
  const left = block.cx - BLOCK_SPAN / 2, back = block.cz - BLOCK_SPAN / 2;
  return {
    x0: left + a * cellW + (a > 0 ? PLOT_GAP : 0),
    x1: left + (a + 1) * cellW - (a < across - 1 ? PLOT_GAP : 0),
    z0: back + c * cellD + (c > 0 ? PLOT_GAP : 0),
    z1: back + (c + 1) * cellD - (c < deep - 1 ? PLOT_GAP : 0),
  };
}

// Glass tower: stone podium, glass shaft with two ledges, a setback, an optional crown and a spire.
function glassTower(buf, lot, h, colour, uo, rng) {
  const { cx, cz, w, d } = lot;
  let top = h + PAVEMENT_TOP;
  pushBox(buf.stucco, cx, PAVEMENT_TOP, cz, w + 0.6, 6, d + 0.6, 0xf2ece2, true, uo);
  pushBox(buf.glass, cx, 6.25, cz, w, h - 6, d, colour, true, uo);
  for (const at of [0.35, 0.7]) pushBox(buf.detail, cx, PAVEMENT_TOP + h * at, cz, w + 0.5, 0.6, d + 0.5, LEDGE_WHITE);
  const setback = rng.range(0.62, 0.8);
  pushBox(buf.glass, cx, top, cz, w * setback, h * 0.18, d * setback, colour, true, uo);
  top += h * 0.18;
  pushBox(buf.detail, cx, top, cz, w * setback + 0.4, 0.8, d * setback + 0.4, LEDGE_WHITE);
  top += 0.8;
  if (rng() < 0.6) {
    pushBox(buf.glass, cx, top, cz, w * setback * 0.6, 6, d * setback * 0.6, colour, true, uo);
    top += 6;
  }
  pushBox(buf.detail, cx, top, cz, 0.6, 12, 0.6, 0xdfe3ea);
  return top;
}

// Street-facing sides of a lot as [fx, fz] outward directions.
function streetFaces(a, c, across, deep) {
  const faces = [];
  if (a === 0) faces.push([-1, 0]);
  if (a === across - 1) faces.push([1, 0]);
  if (c === 0) faces.push([0, -1]);
  if (c === deep - 1) faces.push([0, 1]);
  return faces;
}

function balconies(buf, lot, h, trim, faces) {
  const { x0, x1, z0, z1, cx, cz, w, d } = lot;
  for (const [fx, fz] of faces) {
    for (let y = 4.25; y < h - 2; y += 4) {
      for (const along of [-0.25, 0.25]) {
        const bx = fx ? (fx < 0 ? x0 - 0.6 : x1 + 0.6) : cx + along * w;
        const bz = fz ? (fz < 0 ? z0 - 0.6 : z1 + 0.6) : cz + along * d;
        pushBox(buf.detail, bx, y, bz, fx ? 1.2 : 3.6, 0.22, fx ? 3.6 : 1.2, trim); // slab
        pushBox(buf.detail, bx + fx * 0.55, y + 0.22, bz + fz * 0.55, fx ? 0.08 : 3.6, 0.95, fx ? 3.6 : 0.08, 0xf8f8f8); // railing
      }
    }
  }
}

// Stucco building: plinth, walls, cornice, corner pilasters, maybe a stepped crown, balconies, AC units, a tank.
function stuccoBuilding(buf, lot, h, colour, trim, uo, faces, district, tanks, rng) {
  const { x0, x1, z0, z1, cx, cz, w, d } = lot;
  let top = h + PAVEMENT_TOP;
  pushBox(buf.detail, cx, PAVEMENT_TOP, cz, w + 0.5, 1.1, d + 0.5, darken(colour, 0.72)); // plinth
  pushBox(buf.stucco, cx, PAVEMENT_TOP, cz, w, h, d, colour, true, uo);
  pushBox(buf.detail, cx, top, cz, w + 0.9, 0.7, d + 0.9, trim); // cornice
  top += 0.7;
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    pushBox(buf.detail, px, PAVEMENT_TOP, pz, 0.9, h + 1.4, 0.9, trim); // deco pilasters
  }
  if (rng() < 0.55) { // stepped crown
    pushBox(buf.detail, cx, top, cz, w * 0.42, 2.2, 0.8, trim);
    pushBox(buf.detail, cx, top + 2.2, cz, w * 0.22, 1.4, 0.8, trim);
  }
  if (h >= 10 && district !== 'hills') balconies(buf, lot, h, trim, faces);
  const acUnits = rng.int(1, 3);
  for (let n = 0; n < acUnits; n++) {
    const ax = cx + rng.range(-w * 0.3, w * 0.3);
    const az = cz + rng.range(-d * 0.3, d * 0.3);
    pushBox(buf.detail, ax, top, az, 2.2, 1.3, 1.6, 0xc4c8ce);
    pushBox(buf.detail, ax, top + 1.3, az, 1.2, 0.15, 1.2, 0x55595f);
  }
  if (rng() < 0.4) {
    const x = cx + rng.range(-w * 0.25, w * 0.25);
    const z = cz + rng.range(-d * 0.25, d * 0.25);
    const ry = rng() * 6;
    tanks.push({ x, y: top, z, ry, s: rng.range(0.8, 1.1) });
  }
  return top;
}

// Striped shop awnings at street level on the outer faces of the lot.
function awnings(buf, lot, a, c, across, deep, rng) {
  const { x0, x1, z0, z1, cx, cz, w, d } = lot;
  const colour = rng.pick(AWNING_COLOURS);
  if (a === 0) pushBox(buf.detail, x0 - 1.0, 3.2, cz, 2.4, 0.3, d * 0.7, colour);
  if (a === across - 1) pushBox(buf.detail, x1 + 1.0, 3.2, cz, 2.4, 0.3, d * 0.7, colour);
  if (c === 0) pushBox(buf.detail, cx, 3.2, z0 - 1.0, w * 0.7, 0.3, 2.4, colour);
  if (c === deep - 1) pushBox(buf.detail, cx, 3.2, z1 + 1.0, w * 0.7, 0.3, 2.4, colour);
}

function buildingsOnBlock(buf, block, tanks, rng) {
  const [across, deep, hMin, hMax] = DISTRICT_LOTS[block.district];
  const downtown = block.district === 'downtown';
  for (let a = 0; a < across; a++) {
    for (let c = 0; c < deep; c++) {
      const bounds = lotBounds(block, a, c, across, deep);
      let h = Math.round(rng.range(hMin, hMax) / 2) * 2;
      if (downtown && a + c === 1) h *= 0.8; // stagger the downtown skyline
      const tower = downtown && h > 40;
      const colour = rng.pick(tower ? GLASS : STUCCO);
      const trim = rng.pick(TRIM_WHITES);
      const lot = {
        ...bounds,
        cx: (bounds.x0 + bounds.x1) / 2, cz: (bounds.z0 + bounds.z1) / 2,
        w: bounds.x1 - bounds.x0, d: bounds.z1 - bounds.z0,
      };
      const uo = rng();
      addBox({ x0: bounds.x0, x1: bounds.x1, z0: bounds.z0, z1: bounds.z1, h: h + PAVEMENT_TOP });
      const faces = streetFaces(a, c, across, deep);
      const top = tower
        ? glassTower(buf, lot, h, colour, uo, rng)
        : stuccoBuilding(buf, lot, h, colour, trim, uo, faces, block.district, tanks, rng);
      lots.push({ x: lot.cx, z: lot.cz, top, w: lot.w, d: lot.d, district: block.district, block });
      if (!tower && !downtown) awnings(buf, lot, a, c, across, deep, rng);
    }
  }
}

function addMergedMeshes(scene, buf, tex) {
  const stuccoMat = new THREE.MeshLambertMaterial({
    vertexColors: true, map: tex.facade.map, emissiveMap: tex.facade.em, emissive: 0xffd9a0, emissiveIntensity: 0.6,
  });
  const glassMat = new THREE.MeshPhongMaterial({
    vertexColors: true, map: tex.facade.glass, emissiveMap: tex.facade.glassEm, emissive: 0xffd9a0, emissiveIntensity: 0.6,
    specular: 0xffe0c0, shininess: 90,
  });
  G.buildingMat = stuccoMat;
  G.glassMat = glassMat;
  const plain = () => new THREE.MeshLambertMaterial({ vertexColors: true });
  const layers = [
    [buf.stucco, stuccoMat, true],
    [buf.glass, glassMat, true],
    [buf.detail, plain(), true],
    [buf.sidewalk, plain(), false],
    [buf.green, plain(), false],
  ];
  for (const [data, material, castsShadow] of layers) {
    if (!data.p.length) continue;
    const mesh = new THREE.Mesh(toGeometry(data), material);
    mesh.castShadow = castsShadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

function addPavingTiles(scene, walks) {
  const texture = tileTex();
  texture.repeat.set(12, 12);
  const square = new THREE.PlaneGeometry(49.2, 49.2).rotateX(-Math.PI / 2);
  square.translate(0, 0.27, 0);
  const tiles = inst(square, new THREE.MeshLambertMaterial({ map: texture }), walks);
  tiles.receiveShadow = true;
  scene.add(tiles);
}

function addWaterTanks(scene, tanks) {
  const barrel = new THREE.CylinderGeometry(1.3, 1.3, 2.6, 10).translate(0, 2.9, 0);
  const cap = new THREE.ConeGeometry(1.45, 0.9, 10).translate(0, 4.6, 0);
  const stand = new THREE.BoxGeometry(2.2, 1.6, 2.2).translate(0, 0.8, 0);
  scene.add(
    inst(barrel, new THREE.MeshLambertMaterial({ color: 0xb08a66 }), tanks),
    inst(cap, new THREE.MeshLambertMaterial({ color: 0x7a5a44 }), tanks),
    inst(stand, new THREE.MeshLambertMaterial({ color: 0x5a5e66 }), tanks),
  );
}

export function buildCity(scene, tex, rng) {
  const buf = makeBuffers();
  lots.length = 0;
  const tanks = [];
  const walks = [];
  for (const block of blocks) {
    if (block.type === 'lagoon') continue; // water, stilts and stalls come from world/landmarks.js
    sidewalk(buf, block);
    walks.push({ x: block.cx, z: block.cz });
    if (block.type === 'tower') continue; // Crown Tower and its podium are built in world/landmarks.js
    if (block.type === 'park') park(buf, block);
    else if (block.type === 'plaza') plaza(buf, block);
    else if (block.type === 'yard') containerYard(buf, block, rng);
    else buildingsOnBlock(buf, block, tanks, rng);
  }
  addMergedMeshes(scene, buf, tex);
  addPavingTiles(scene, walks);
  addWaterTanks(scene, tanks);
}

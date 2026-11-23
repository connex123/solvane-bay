// Street furniture and dressing: curved palms along the boulevards, street lamps, bus stops, benches, hydrants,
// park trees, neon shop signs with coloured light pools in Neon Row, and rooftop billboards for the city's own
// made-up brands. Anything repeated is an InstancedMesh.
import * as THREE from 'three';
import { N, S, HALF, lineCoord } from '../core/config.js';
import { inst } from '../core/geometryUtils.js';
import { blocks } from './cityLayout.js';
import { lots } from './buildingFactory.js';
import { signTexture, glowTex, adTexture } from './textureFactory.js';
import { G } from '../core/gameState.js';

const NEON_SIGNS = [
  ['CLUB VELVET', '#ff4fd8'], ['TACOS 24H', '#ffb02e'], ['SUNSET BAR', '#ff6a5c'], ['KARAOKE', '#4fd8ff'],
  ['LA LUNA', '#b48cff'], ['PIZZA', '#7dff9a'], ['HOTEL BAY', '#ff4f7a'], ['SOLVANE LIVE', '#4fd8ff'],
];
const BILLBOARDS = [
  ['SUNSET FM', 'The sound of the coast · 94.3', '#ff9a3c', '#c2386a'],
  ['CORAL CAFE', 'Cold brew on the boardwalk', '#3fd0c0', '#1d6f9a'],
  ['VELOCE GT', 'Born on the bay road', '#ff4f6a', '#4a1240'],
  ['VISIT THE BAY', 'Sun. Sand. Solvane.', '#6ab8ff', '#ff8a5c'],
  ['NEON PULSE', 'Late nights · 101.1 FM', '#b04fff', '#ff4fd8'],
  ['GLOW COAT', 'Respray in 60 seconds', '#ffd23c', '#ff6a3c'],
];
const BILLBOARD_DISTRICTS = new Set(['downtown', 'neon', 'beach', 'old']);
const TAU = Math.PI * 2;

// ---- palm model: a gently curved, tapering trunk with growth rings and two layers of drooping fronds ----
const CROWN = { x: 1.3, y: 9.2 }; // where the trunk ends, relative to its base

class VertexSoup {
  constructor() { this.positions = []; this.colours = []; this.indices = []; }
  get count() { return this.positions.length / 3; }
  vertex(x, y, z, r, g, b) { this.positions.push(x, y, z); this.colours.push(r, g, b); }
  faces(...ids) { this.indices.push(...ids); }
  toGeometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colours, 3));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}

function palmTrunk(soup) {
  const rings = 10, sides = 6;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const bend = CROWN.x * t * t;
    const height = CROWN.y * t;
    const radius = 0.34 - 0.16 * t;
    const band = i % 2 ? 0.82 : 1; // alternate darker growth rings
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * TAU;
      soup.vertex(bend + Math.cos(a) * radius, height, Math.sin(a) * radius, 0.62 * band, 0.48 * band, 0.34 * band);
    }
  }
  const stride = sides + 1;
  for (let i = 0; i < rings; i++) {
    for (let k = 0; k < sides; k++) {
      const lower = i * stride + k, upper = lower + stride;
      soup.faces(lower, upper, lower + 1, lower + 1, upper, upper + 1);
    }
  }
}

// One frond: a spine with a leaf edge either side, arching up then drooping, widest near the middle.
function palmFrond(soup, heading, length, lift, droop, width) {
  const cosH = Math.cos(heading), sinH = Math.sin(heading);
  const steps = 7;
  const first = soup.count;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const reach = length * t;
    const y = CROWN.y + lift * t - droop * t * t;
    const halfWidth = width * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.04;
    const shade = 0.75 + t * 0.4; // tips catch more light
    for (const edge of [-1, 1]) {
      soup.vertex(CROWN.x + cosH * reach - sinH * halfWidth * edge, y - halfWidth * 0.35, sinH * reach + cosH * halfWidth * edge,
        0.2 * shade, 0.55 * shade, 0.22 * shade);
    }
    soup.vertex(CROWN.x + cosH * reach, y + 0.08, sinH * reach, 0.28 * shade, 0.62 * shade, 0.26 * shade); // raised spine
  }
  for (let i = 0; i < steps; i++) {
    const v = first + i * 3; // [left, right, spine] per step
    soup.faces(v, v + 3, v + 2, v + 2, v + 3, v + 5, v + 2, v + 5, v + 1, v + 1, v + 5, v + 4);
  }
}

function coconuts(soup) {
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU;
    const first = soup.count;
    soup.vertex(CROWN.x + Math.cos(a) * 0.35, CROWN.y - 0.2, Math.sin(a) * 0.35, 0.45, 0.32, 0.12);
    soup.vertex(CROWN.x + Math.cos(a) * 0.5, CROWN.y - 0.6, Math.sin(a) * 0.5, 0.4, 0.28, 0.1);
    soup.vertex(CROWN.x + Math.cos(a + 0.6) * 0.3, CROWN.y - 0.55, Math.sin(a + 0.6) * 0.3, 0.42, 0.3, 0.1);
    soup.faces(first, first + 1, first + 2);
  }
}

function palmGeometry() {
  const soup = new VertexSoup();
  palmTrunk(soup);
  for (let k = 0; k < 9; k++) palmFrond(soup, (k / 9) * TAU + 0.2, 4.6, 1.0, 3.2, 0.62); // long outer fronds
  for (let k = 0; k < 6; k++) palmFrond(soup, (k / 6) * TAU + 0.6, 3.0, 1.5, 1.6, 0.48); // short upper fronds
  coconuts(soup);
  return soup.toGeometry();
}

const boxAt = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

// ---- placement ----

// Palms and lamps along every street. Every third line is a boulevard with palms on both kerbs; other streets
// alternate palm and lamp stretches, with lamps on one side only.
function lineSideItems(rng, palms, lamps) {
  for (let line = 0; line <= N; line++) {
    const boulevard = line % 3 === 0;
    const spacing = boulevard ? 10 : 21;
    for (let t = -HALF + 14; t < HALF; t += spacing) {
      const intoBlock = (t + HALF) % S;
      if (intoBlock < 10 || intoBlock > S - 10) continue; // keep clear of the junctions
      const oddStretch = Math.floor(t / 21) % 2;
      for (const side of [-1, 1]) {
        const target = boulevard || oddStretch ? palms : lamps;
        const placed = boulevard || side === (oddStretch ? 1 : -1) || target === palms;
        if (!placed) continue;
        const offset = lineCoord(line) + side * 7.9;
        target.push({ x: t, z: offset, ry: rng() * 6, s: 0.9 + rng() * 0.3, side });
        target.push({ x: offset, z: t, ry: rng() * 6, s: 0.9 + rng() * 0.3, side, flip: true });
      }
    }
  }
  // turn lamps to reach over the road and give palms a slight lean toward it
  for (const item of [...lamps, ...palms]) {
    if (!item.side) continue;
    const facing = item.flip ? (item.side > 0 ? Math.PI : 0) : (item.side * Math.PI) / 2;
    item.ry = facing + (item.ry - 3) * 0.08;
  }
}

function greenery(rng, palms, trees) {
  for (const block of blocks) {
    if (block.type === 'park') {
      for (let n = 0; n < 14; n++) {
        const list = rng() < 0.5 ? palms : trees;
        list.push({ x: block.cx + rng.range(-20, 20), z: block.cz + rng.range(-20, 20), ry: rng() * 6, s: 1 + rng() * 0.5 });
      }
    }
    if (block.district === 'beach' || block.type === 'plaza') {
      for (let n = 0; n < 4; n++) palms.push({ x: block.cx + rng.range(-20, 20), z: block.cz + rng.range(-20, 20), ry: rng() * 6, s: 1 });
    }
  }
  for (let n = 0; n < 40; n++) palms.push({ x: HALF + rng.range(12, 34), z: rng.range(-HALF, HALF), ry: rng() * 6, s: 1.1 }); // the Strand
}

// One roll per block side: a bus stop, a bench, a hydrant, or nothing.
function pavementFurniture(rng) {
  const stops = [], benches = [], hydrants = [];
  const sides = [[0, -23.2, 0], [0, 23.2, Math.PI], [-23.2, 0, Math.PI / 2], [23.2, 0, -Math.PI / 2]];
  for (const block of blocks) {
    for (const [dx, dz, ry] of sides) {
      const roll = rng();
      const x = block.cx + dx + (dz ? rng.range(-14, 14) : 0);
      const z = block.cz + dz + (dx ? rng.range(-14, 14) : 0);
      if (roll < 0.14) stops.push({ x, z, ry });
      else if (roll < 0.4) benches.push({ x, z, ry });
      else if (roll < 0.6) hydrants.push({ x: block.cx + dx * 0.98 + (dz ? 18 : 0), z: block.cz + dz * 0.98 + (dx ? 18 : 0) });
    }
  }
  return { stops, benches, hydrants };
}

function addFurnitureMeshes(scene, { stops, benches, hydrants }) {
  const shelterTeal = () => lambert(0x2fb8a8);
  const wood = () => lambert(0xc08a5a);
  const hydrantRed = () => lambert(0xe0302a);
  scene.add(
    inst(boxAt(4, 0.15, 1.8, 0, 2.6, 0), lambert(0xf2f2f2), stops), // shelter roof
    inst(boxAt(4, 2.3, 0.08, 0, 1.4, -0.85), lambert(0xbfe6ff, { transparent: true, opacity: 0.45 }), stops), // glass back
    inst(boxAt(0.12, 2.6, 0.12, -1.9, 1.3, -0.8), shelterTeal(), stops),
    inst(boxAt(0.12, 2.6, 0.12, 1.9, 1.3, -0.8), shelterTeal(), stops),
    inst(boxAt(1.3, 2.1, 0.1, 2.6, 1.3, -0.2), new THREE.MeshBasicMaterial({ map: adTexture('CORAL CAFE', 'Cold brew', '#3fd0c0', '#1d6f9a') }), stops),
    inst(boxAt(2.6, 0.12, 0.6, 0, 0.75, 0), wood(), benches), // seat
    inst(boxAt(2.6, 0.6, 0.1, 0, 1.05, -0.3), wood(), benches), // back
    inst(boxAt(0.1, 0.7, 0.5, -1.1, 0.4, 0), lambert(0x33363c), benches), // end frame
    inst(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 8).translate(0, 0.65, 0), hydrantRed(), hydrants),
    inst(new THREE.SphereGeometry(0.2, 8, 6).translate(0, 1.08, 0), hydrantRed(), hydrants),
  );
}

function addTrees(scene, trees) {
  const trunk = inst(new THREE.CylinderGeometry(0.25, 0.35, 3, 6).translate(0, 1.5, 0), lambert(0x6a4a3a), trees);
  const crown = inst(new THREE.IcosahedronGeometry(2.6, 0).translate(0, 4.6, 0), lambert(0x4f9a3f, { flatShading: true }), trees);
  scene.add(trunk, crown);
  // buildings placed later may clear trees off their footprint
  G.treeProps = [{ mesh: trunk, list: trees }, { mesh: crown, list: trees }];
}

function addLamps(scene, lamps) {
  const post = new THREE.CylinderGeometry(0.09, 0.15, 7, 8).translate(0, 3.5, 0);
  const arm = boxAt(1.8, 0.12, 0.12, 0.85, 7, 0);
  const lantern = boxAt(0.9, 0.18, 0.4, 1.6, 6.9, 0);
  G.lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 }); // the sky rig pushes it to HDR after dusk
  scene.add(inst(post, lambert(0x2f3440), lamps), inst(arm, lambert(0x2f3440), lamps), inst(lantern, G.lampMat, lamps));
}

// Three neon signs per Neon Row building block, each with a coloured light pool on the pavement; the first also
// gets a double-sided blade sign readable from both directions along the street.
function neonRow(scene, rng, quad) {
  const signMats = NEON_SIGNS.map(([text, colour]) => {
    const material = new THREE.MeshBasicMaterial({ map: signTexture(text, colour) });
    material.color.setScalar(1.7);
    return material;
  });
  const poolGeometry = new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2);
  const glow = glowTex();
  for (const block of blocks) {
    if (block.district !== 'neon' || block.type !== 'buildings') continue;
    for (let n = 0; n < 3; n++) {
      const wall = rng.int(0, 3); // 0: west, 1: east, 2: north, 3: south
      const along = rng.range(-12, 12);
      const pick = rng.int(0, signMats.length - 1);
      const sign = new THREE.Mesh(quad, signMats[pick]);
      sign.scale.set(8, 2.6, 1);
      const y = rng.range(5, 9);
      if (wall < 2) {
        sign.position.set(block.cx + (wall ? 22.7 : -22.7), y, block.cz + along);
        sign.rotation.y = wall ? Math.PI / 2 : -Math.PI / 2;
      } else {
        sign.position.set(block.cx + along, y, block.cz + (wall === 3 ? 22.7 : -22.7));
        sign.rotation.y = wall === 3 ? 0 : Math.PI;
      }
      scene.add(sign);

      const outX = wall < 2 ? (wall ? 1 : -1) : 0;
      const outZ = wall < 2 ? 0 : (wall === 3 ? 1 : -1);
      const pool = new THREE.Mesh(poolGeometry, new THREE.MeshBasicMaterial({
        map: glow, color: new THREE.Color(NEON_SIGNS[pick][1]), transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      pool.position.set(sign.position.x + outX * 10, 0.07, sign.position.z + outZ * 10);
      scene.add(pool);

      if (n !== 0) continue;
      for (const flip of [0, Math.PI]) {
        const blade = new THREE.Mesh(quad, signMats[pick]);
        const nudge = flip ? 0.03 : -0.03; // back-to-back faces, a hair apart
        blade.scale.set(4, 1.4, 1);
        blade.position.set(sign.position.x + outX * 3.4 + (outX ? 0 : nudge), 4.4, sign.position.z + outZ * 3.4 + (outZ ? 0 : nudge));
        blade.rotation.y = (outX ? 0 : Math.PI / 2) + flip;
        scene.add(blade);
      }
    }
  }
}

function rooftopBillboards(scene, rng, quad) {
  const boardMats = BILLBOARDS.map(([title, tag, c1, c2]) => new THREE.MeshBasicMaterial({ map: adTexture(title, tag, c1, c2), side: THREE.DoubleSide }));
  let placed = 0;
  for (const lot of lots) {
    if (!BILLBOARD_DISTRICTS.has(lot.district) || rng() > 0.16) continue;
    const board = new THREE.Mesh(quad, boardMats[placed % boardMats.length]);
    placed += 1;
    board.scale.set(14, 6.5, 1);
    board.position.set(lot.x, lot.top + 5, lot.z);
    board.rotation.y = rng.pick([0, Math.PI / 2]) + rng.range(-0.2, 0.2);
    scene.add(board);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), lambert(0x555a66));
    post.position.set(lot.x, lot.top + 1.5, lot.z);
    scene.add(post);
  }
}

export function buildProps(scene, rng) {
  const palms = [], lamps = [], trees = [];
  lineSideItems(rng, palms, lamps);
  greenery(rng, palms, trees);
  const palmMesh = inst(palmGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), palms);
  palmMesh.castShadow = true;
  scene.add(palmMesh);
  G.palmProps = { mesh: palmMesh, list: palms }; // staged shots may thin palms that hide a landmark

  addFurnitureMeshes(scene, pavementFurniture(rng));
  addTrees(scene, trees);
  addLamps(scene, lamps);

  const quad = new THREE.PlaneGeometry(1, 1);
  neonRow(scene, rng, quad);
  rooftopBillboards(scene, rng, quad);
}

// The land and water around the city: a grass ground plane, the sand strip with umbrellas and lifeguard huts,
// the scrolling sea, port cranes on the docks, and layered coastal hills on the horizon. (The marina is marina.js.)
import * as THREE from 'three';
import { HALF, SEA_X, lineCoord } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { G } from '../core/gameState.js';
import { sandTex, waterTex } from './textureFactory.js';

const flat = (w, d) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
const UMBRELLA_COLOURS = [0xff5a7a, 0x2fc4b2, 0xffb02e, 0xffffff];
const CRANE_ORANGE = 0xe8a030;
const POLE = 0xeeeeee;

let seaTexture = null;

function groundAndSand(scene) {
  const ground = new THREE.Mesh(flat(4000, 4000), new THREE.MeshLambertMaterial({ color: 0x9aa56c }));
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  const grain = sandTex();
  grain.repeat.set(30, 120);
  const sand = new THREE.Mesh(flat(SEA_X - HALF + 6, 2000), new THREE.MeshLambertMaterial({ map: grain }));
  G.sandMat = sand.material;
  sand.position.set((SEA_X + HALF - 6) / 2, 0.0, 0);
  sand.receiveShadow = true;
  scene.add(sand);
}

function sea(scene) {
  seaTexture = waterTex();
  seaTexture.repeat.set(40, 40);
  const material = new THREE.MeshPhongMaterial({
    map: seaTexture, color: 0x9fe0f0, emissiveMap: seaTexture, emissive: 0x6a9cb4, shininess: 90, specular: 0xffb090,
  });
  const water = new THREE.Mesh(flat(2400, 2400), material);
  water.position.set(SEA_X + 1200, 0.03, 0);
  G.seaMat = material;
  scene.add(water);
}

function beachUmbrella(buf, x, z, colour) {
  pushBox(buf, x, 0, z, 0.12, 2.4, 0.12, POLE);
  pushBox(buf, x, 2.3, z, 2.8, 0.3, 2.8, colour);
}

function scatteredUmbrellas(buf, rng) {
  for (let n = 0; n < 26; n++) {
    const x = HALF + rng.range(10, 36);
    const z = rng.range(-HALF + 20, HALF);
    beachUmbrella(buf, x, z, rng.pick(UMBRELLA_COLOURS));
    pushBox(buf, x + 2.2, 0.05, z, 0.9, 0.12, 2.0, 0xffe9c0); // towel
  }
}

function portCranes(buf) {
  const z = lineCoord(0) + 20;
  for (let n = 0; n < 3; n++) {
    const x = lineCoord(1) + n * 90;
    for (const leg of [-8, 8]) pushBox(buf, x + leg, 0, z, 1.2, 30, 1.2, CRANE_ORANGE);
    pushBox(buf, x, 28, z, 20, 1.5, 1.5, CRANE_ORANGE); // gantry
    pushBox(buf, x, 26, z + 14, 1.5, 1.5, 28, CRANE_ORANGE); // boom out over the water
  }
}

// Lifeguard huts near the Strand road: teal hut on stilts, coral roof, a ramp, a flag.
function lifeguardHut(buf, z) {
  const x = HALF + 25;
  for (const dx of [-1.1, 1.1]) {
    for (const dz of [-1.1, 1.1]) pushBox(buf, x + dx, 0, z + dz, 0.25, 2.6, 0.25, 0xf6ead2);
  }
  pushBox(buf, x, 2.6, z, 3.2, 0.2, 3.2, 0xf6ead2); // platform
  pushBox(buf, x, 2.8, z, 2.4, 1.9, 2.4, 0x2fb8a8); // hut
  pushBox(buf, x - 1.21, 3.3, z, 0.02, 0.9, 1.7, 0x17404a); // window
  pushBox(buf, x, 4.7, z, 3.0, 0.3, 3.0, 0xe8604c); // roof
  pushBox(buf, x - 1.25, 3.1, z, 0.03, 0.5, 0.5, 0xffffff); // sign
  pushBox(buf, x + 2.8, 0, z, 3.2, 0.15, 1.0, 0xc8a070); // ramp
  pushBox(buf, x, 5.0, z, 0.08, 2.4, 0.08, 0xffffff); // flagpole
  pushBox(buf, x + 0.5, 6.6, z, 1.0, 0.6, 0.05, 0xe8604c); // flag
}

// A hand-placed cluster of double-canopy umbrellas with towels at the north end of the Strand.
const CLUSTER = [
  [14, 246, 0xff5a7a], [19, 240, 0x2fc4b2], [12, 236, 0xffb02e], [30, 250, 0xffffff],
  [21, 222, 0xff5a7a], [15, 214, 0x2fc4b2], [32, 238, 0xffb02e], [11, 204, 0xff5a7a],
];

function umbrellaCluster(buf) {
  for (const [dx, z, colour] of CLUSTER) {
    const x = HALF + dx;
    beachUmbrella(buf, x, z, colour);
    pushBox(buf, x + 0.4, 2.6, z, 1.6, 0.2, 1.6, colour); // upper canopy
    pushBox(buf, x + 2.0, 0.05, z - 0.6, 0.9, 0.12, 2.0, z % 2 ? 0x2fb8a8 : 0xffe9c0);
    pushBox(buf, x - 1.9, 0.05, z + 0.4, 0.9, 0.12, 2.0, 0xe8604c);
  }
}

// Coastal hill layers, far to near: [radius, peak height, ridge colour, base colour]. Teal ridges into warm haze.
const HILL_LAYERS = [
  [860, 330, 0x9cc8c4, 0xf2cdb0],
  [740, 250, 0x72aeb0, 0xdcb8a0],
  [650, 175, 0x3f8890, 0xa8b4a4],
  [590, 105, 0x2f7a62, 0x7fa58c],
];
const RIDGE_SEGMENTS = 160;

// A curtain of quads around the city whose top edge is a smooth ridgeline (a sum of three sines).
function hillCurtain(radius, peak, ridgeHex, baseHex, rng) {
  const ridge = new THREE.Color(ridgeHex);
  const base = new THREE.Color(baseHex);
  const phase = [rng() * 6, rng() * 6, rng() * 6];
  const positions = [];
  const colours = [];
  const indices = [];
  for (let i = 0; i <= RIDGE_SEGMENTS; i++) {
    const u = i / RIDGE_SEGMENTS;
    const angle = Math.PI * (0.32 + 1.36 * u);
    const taper = Math.pow(Math.sin(u * Math.PI), 0.6); // the curtain fades out at both ends
    const shape = 0.55 + 0.25 * Math.sin(angle * 3 + phase[0]) + 0.14 * Math.sin(angle * 7 + phase[1]) + 0.06 * Math.sin(angle * 13 + phase[2]);
    const top = Math.max(6, peak * shape * taper);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    positions.push(x, -4, z, x, top, z);
    colours.push(base.r, base.g, base.b, ridge.r, ridge.g, ridge.b);
    if (i < RIDGE_SEGMENTS) {
      const v = i * 2;
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  return geometry;
}

function distantHills(scene, rng) {
  if (!G.hillMats) G.hillMats = [];
  HILL_LAYERS.forEach(([radius, peak, ridgeHex, baseHex], layer) => {
    const geometry = hillCurtain(radius, peak, ridgeHex, baseHex, rng);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false });
    G.hillMats.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = layer - 5; // far layers draw first
    scene.add(mesh);
  });
}

export function buildBeachAndSea(scene, rng) {
  groundAndSand(scene);
  sea(scene);

  const buf = newBuf();
  // Burn the draws the old pier boats used to take, so everything seeded after this keeps its layout.
  for (let n = 0; n < 16; n++) rng();
  scatteredUmbrellas(buf, rng);
  portCranes(buf);
  for (const z of [232, 96, -30]) lifeguardHut(buf, z);
  umbrellaCluster(buf);
  const props = new THREE.Mesh(toGeometry(buf), new THREE.MeshLambertMaterial({ vertexColors: true }));
  props.castShadow = true;
  scene.add(props);

  distantHills(scene, rng);
}

/** Drift the sea texture so the water looks alive. */
export function animateSea(t) {
  if (!seaTexture) return;
  seaTexture.offset.x = t * 0.004;
  seaTexture.offset.y = t * 0.002;
}

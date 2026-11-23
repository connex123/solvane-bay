// Marina Cala: the boardwalk, pier nine with its finger piers, Viktor Brandt's three-deck yacht the CROWN JEWEL
// (coral and cream), the speedboat berth, and the jetty by the Point Wren light where the ledger changes hands.
// It also answers two questions for players, guards and boats: how high is the deck underfoot here, and which
// water is blocked.
import * as THREE from 'three';
import { SEA_X } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { G } from '../core/gameState.js';
import { addBox } from './collision.js';
import { CAUSEWAY, LIGHTHOUSE } from './landmarks.js';

const CORAL = 0xe8604c;
const CREAM = 0xf6ead2;
const TEAK = 0xc8925e;
const TINTED_GLASS = 0x1d4a58;
const PLANKS = 0x9a7650;
const PILING = 0x6a5038;
const RAIL_WHITE = 0xffffff;

const PIER_Z = -190;
const DECK_TOP = 0.55;

// The yacht lies along the south side of pier nine with its bow out to sea (+x).
export const YACHT = { x: SEA_X + 44, z: PIER_Z + 7.2, len: 36, wid: 9, deckY: 1.15, name: 'CROWN JEWEL' };
export const MARINA_GATE = { x: SEA_X - 9, z: PIER_Z };
export const GANGWAY = { x: YACHT.x - 13, z: PIER_Z + 2.4 };
export const SAFE = { x: YACHT.x - 9.5, z: YACHT.z };
export const GUARD_SPOTS = [
  { x: YACHT.x - 15, z: YACHT.z - 2.2 },
  { x: YACHT.x - 12, z: YACHT.z + 2.4 },
  { x: YACHT.x - 7.5, z: YACHT.z - 2.6 },
  { x: YACHT.x - 16, z: YACHT.z + 1.8 },
];
export const SPEEDBOAT_BERTH = { x: SEA_X + 60, z: PIER_Z - 4.6, h: Math.PI / 2 };
export const DROP = { x: LIGHTHOUSE.x - 24, z: LIGHTHOUSE.z - 22 };

const area = (x0, x1, z0, z1, top = DECK_TOP) => ({ x0, x1, z0, z1, top });

// Walkable timber, in this order: boardwalk, pier nine, two finger piers, the light jetty.
const TIMBER = [
  area(SEA_X - 4, SEA_X + 4, -262, -118),
  area(SEA_X, SEA_X + 72, PIER_Z - 2, PIER_Z + 2),
  area(SEA_X, SEA_X + 40, -232, -229),
  area(SEA_X, SEA_X + 40, -152, -149),
  area(DROP.x - 2, DROP.x + 16, DROP.z + 5, DROP.z + 9),
];
const YACHT_DECK = area(YACHT.x - YACHT.len / 2, YACHT.x + YACHT.len / 2 - 3, YACHT.z - YACHT.wid / 2, YACHT.z + YACHT.wid / 2, YACHT.deckY);
const WALKABLE = [...TIMBER, YACHT_DECK];

const inside = (r, x, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;

/** Height of the highest walkable surface at (x, z), 0 on the ground or in the water. */
export function surfaceHeight(x, z) {
  let height = 0;
  for (const deck of WALKABLE) {
    if (inside(deck, x, z)) height = Math.max(height, deck.top);
  }
  return height;
}

/** Nearest spot within r on a pier or jetty (0.8 m in from the edge), for stepping off a boat; null if none. */
export function dockSpotNear(x, z, r = 6) {
  let spot = null;
  let bestDist = r;
  for (const deck of TIMBER) {
    const px = Math.min(Math.max(x, deck.x0 + 0.8), deck.x1 - 0.8);
    const pz = Math.min(Math.max(z, deck.z0 + 0.8), deck.z1 - 0.8);
    const dist = Math.hypot(px - x, pz - z);
    if (dist < bestDist) {
      bestDist = dist;
      spot = { x: px, z: pz };
    }
  }
  return spot;
}

// What boats bump into: the shore, the piers (a little padded), the yacht, the Causeway abutment, its piers and
// its pylon footings, plus the lighthouse rock as a circle.
const WATER_RECTS = [
  { x0: -1e4, x1: SEA_X + 1.5, z0: -1e4, z1: 1e4 },
  ...TIMBER.slice(1).map((d) => ({ x0: d.x0, x1: d.x1, z0: d.z0 - 0.4, z1: d.z1 + 0.4 })),
  { x0: YACHT.x - YACHT.len / 2, x1: YACHT.x + YACHT.len / 2 + 2, z0: YACHT.z - YACHT.wid / 2, z1: YACHT.z + YACHT.wid / 2 },
  { x0: CAUSEWAY.x0 - 7, x1: CAUSEWAY.x0 + 3, z0: CAUSEWAY.z - 13, z1: CAUSEWAY.z + 13 },
];
for (let px = CAUSEWAY.x0 + 50; px < CAUSEWAY.x0 + 1400; px += 70) {
  const clearOfPylons = CAUSEWAY.pylons.every((pylon) => Math.abs(pylon - px) > 30);
  if (clearOfPylons) WATER_RECTS.push({ x0: px - 2, x1: px + 2, z0: CAUSEWAY.z - 7, z1: CAUSEWAY.z + 7 });
}
for (const pylon of CAUSEWAY.pylons) WATER_RECTS.push({ x0: pylon - 8, x1: pylon + 8, z0: CAUSEWAY.z - 18, z1: CAUSEWAY.z + 18 });
const WATER_ROCKS = [{ x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, r: 11 }];

// A circle whose centre is inside a rectangle leaves through the nearest side (earlier sides win ties).
function exitThroughNearestSide(rect, x, z, r) {
  const sides = [[x - rect.x0, -1, 0], [rect.x1 - x, 1, 0], [z - rect.z0, 0, -1], [rect.z1 - z, 0, 1]];
  let nearest = sides[0];
  for (const side of sides) if (side[0] < nearest[0]) nearest = side;
  const [depth, nx, nz] = nearest;
  return { dx: nx * (depth + r), dz: nz * (depth + r), nx, nz };
}

/** Push a boat (circle x, z, r) out of the first obstacle it overlaps: { dx, dz, nx, nz }, or null when clear. */
export function waterBlock(x, z, r) {
  for (const rect of WATER_RECTS) {
    const ox = x - Math.min(Math.max(x, rect.x0), rect.x1);
    const oz = z - Math.min(Math.max(z, rect.z0), rect.z1);
    const gap = Math.hypot(ox, oz);
    if (gap >= r) continue;
    if (gap <= 1e-4) return exitThroughNearestSide(rect, x, z, r);
    const depth = r - gap;
    return { dx: (ox / gap) * depth, dz: (oz / gap) * depth, nx: ox / gap, nz: oz / gap };
  }
  for (const rock of WATER_ROCKS) {
    const ox = x - rock.x, oz = z - rock.z;
    const gap = Math.hypot(ox, oz) || 1;
    if (gap >= rock.r + r) continue;
    const depth = rock.r + r - gap;
    return { dx: (ox / gap) * depth, dz: (oz / gap) * depth, nx: ox / gap, nz: oz / gap };
  }
  return null;
}

function nameplateTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f6ead2';
  g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#c8402e';
  g.font = 'bold 60px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Hull in three steps tapering to the bow, the coral boot stripe, teak deck, and a white rail round it.
function yachtHull(buf) {
  const { x, z, len, wid, deckY } = YACHT;
  const stern = x - len / 2;
  const bow = x + len / 2;
  pushBox(buf, x - 3, -1.3, z, len - 6, deckY + 1.3, wid, CREAM);
  pushBox(buf, bow - 4.5, -1.1, z, 3, deckY + 1.1 + 0.2, wid * 0.72, CREAM);
  pushBox(buf, bow - 1.5, -0.8, z, 3, deckY + 0.8 + 0.45, wid * 0.4, CREAM);
  pushBox(buf, x - 3, -0.7, z, len - 5.8, 1.1, wid + 0.12, CORAL);
  pushBox(buf, bow - 4.5, -0.5, z, 3.1, 1.0, wid * 0.72 + 0.12, CORAL);
  pushBox(buf, x - 3, deckY - 0.02, z, len - 6.4, 0.08, wid - 0.4, TEAK);
  for (const side of [-1, 1]) {
    const railZ = z + side * (wid / 2 - 0.1);
    pushBox(buf, x - 4, deckY, railZ, len - 8, 0.95, 0.08, RAIL_WHITE);
    for (let post = 0; post < 9; post++) pushBox(buf, stern + 2 + post * 3.4, deckY, railZ, 0.08, 0.95, 0.08, RAIL_WHITE);
  }
  pushBox(buf, stern + 0.6, deckY, z, 0.08, 0.95, wid - 0.4, RAIL_WHITE); // transom rail
}

// Salon deck, bridge deck, flybridge and radar arch, each with a band of tinted windows.
function yachtSuperstructure(buf) {
  const { x, z, wid, deckY } = YACHT;
  pushBox(buf, x + 3, deckY, z, 20, 2.5, wid - 1.6, CREAM);
  pushBox(buf, x + 3, deckY + 0.95, z, 20.1, 1.05, wid - 1.5, TINTED_GLASS);
  pushBox(buf, x + 4.5, deckY + 2.5, z, 21.5, 0.4, wid - 0.8, CORAL);
  pushBox(buf, x + 5, deckY + 2.75, z, 14, 2.1, wid - 2.4, CREAM);
  pushBox(buf, x + 5, deckY + 3.4, z, 14.1, 0.95, wid - 2.3, TINTED_GLASS);
  pushBox(buf, x + 6, deckY + 4.85, z, 16, 0.22, wid - 1.8, CORAL);
  pushBox(buf, x + 4, deckY + 5.07, z, 7, 1.0, wid - 3.4, CREAM);
  pushBox(buf, x + 4, deckY + 6.07, z, 7.6, 0.18, wid - 3, CORAL);
  for (const side of [-1, 1]) pushBox(buf, x + 1.5, deckY + 5.07, z + side * 2.2, 0.3, 3, 0.3, RAIL_WHITE); // arch legs
  pushBox(buf, x + 1.5, deckY + 8, z, 0.5, 0.3, 4.7, RAIL_WHITE); // arch top
  pushBox(buf, x + 1.5, deckY + 8.3, z, 1.6, 0.25, 0.25, 0x333a40); // radar
}

// Aft: swim platform, two deck loungers, the safe by the salon door, and the gangway to the pier.
function yachtAft(buf) {
  const { z, len, wid, deckY } = YACHT;
  const stern = YACHT.x - len / 2;
  pushBox(buf, stern - 1, -0.15, z, 2, 0.35, wid - 1, TEAK);
  for (const side of [-1, 1]) pushBox(buf, stern + 4, deckY, z + side * 2.4, 2.2, 0.4, 0.9, 0x2fc4b2);
  pushBox(buf, SAFE.x, deckY, SAFE.z, 0.9, 1.1, 0.9, 0x30343a);
  pushBox(buf, SAFE.x - 0.46, deckY + 0.35, SAFE.z, 0.04, 0.3, 0.3, 0xe8b84a); // dial
  pushBox(buf, GANGWAY.x, DECK_TOP, GANGWAY.z + 0.8, 1.2, 0.12, 3.2, 0xdcdcdc);
}

function yachtNameplates(scene) {
  const { x, z, len, wid, deckY } = YACHT;
  const transom = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.3), new THREE.MeshBasicMaterial({ map: nameplateTexture(YACHT.name) }));
  transom.position.set(x - len / 2 - 0.02, deckY - 0.6, z);
  transom.rotation.y = -Math.PI / 2;
  scene.add(transom);
  for (const side of [-1, 1]) {
    const flank = transom.clone();
    flank.scale.setScalar(0.8);
    flank.position.set(x + 6, deckY - 0.5, z + side * (wid / 2 + 0.07));
    flank.rotation.y = side > 0 ? 0 : Math.PI;
    scene.add(flank);
  }
}

function buildYacht(scene, buf) {
  yachtHull(buf);
  yachtSuperstructure(buf);
  yachtAft(buf);
  const { x, z, wid } = YACHT;
  addBox({ x0: x - 7, x1: x + 13, z0: z - wid / 2 + 0.8, z1: z + wid / 2 - 0.8 }); // the salon is solid
  yachtNameplates(scene);
}

function timberDecks(buf) {
  for (const deck of TIMBER) {
    pushBox(buf, (deck.x0 + deck.x1) / 2, -0.6, (deck.z0 + deck.z1) / 2, deck.x1 - deck.x0, DECK_TOP + 0.6, deck.z1 - deck.z0, PLANKS);
    for (let px = deck.x0 + 2; px < deck.x1; px += 8) {
      for (const pz of [deck.z0, deck.z1]) pushBox(buf, px, -0.6, pz, 0.4, DECK_TOP + 1.3, 0.4, PILING);
    }
  }
}

function marinaGate(buf) {
  for (const side of [-1, 1]) pushBox(buf, MARINA_GATE.x, 0, MARINA_GATE.z + side * 7, 0.9, 6, 0.9, CREAM);
  pushBox(buf, MARINA_GATE.x, 6, MARINA_GATE.z, 1.2, 1.2, 15, CORAL);
}

// Small cruisers on the finger piers; every other one is a sailboat with a mast.
const HULL_PAINTS = [0xffffff, 0xf4a6a0, 0x8fd3c8, 0xf6e3b4];
function mooredBoats(buf) {
  for (const pierZ of [-230.5, -150.5]) {
    const paintShift = pierZ > -200 ? 1 : 0;
    for (let n = 0; n < 4; n++) {
      const bz = pierZ + (n % 2 ? 5 : -5);
      const bx = SEA_X + 7 + n * 9;
      pushBox(buf, bx, -0.3, bz, 7, 1.4, 2.8, HULL_PAINTS[(n + paintShift) % 4]);
      pushBox(buf, bx - 0.8, 1.1, bz, 2.6, 1.0, 2.0, 0xf8f8f8); // cabin
      if (n % 2) pushBox(buf, bx + 0.8, 1.1, bz, 0.18, 8, 0.18, 0xdddddd); // mast
    }
  }
}

export function buildMarina(scene) {
  const buf = newBuf();
  timberDecks(buf);
  marinaGate(buf);
  mooredBoats(buf);
  buildYacht(scene, buf);
  const mesh = new THREE.Mesh(toGeometry(buf), new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/** Keep people near the marina standing on the deck under them (the player's height is set in playerController). */
export function updateMarina() {
  for (const actor of G.actors) {
    if (Math.abs(actor.x - YACHT.x) > 80 || Math.abs(actor.z - PIER_Z) > 80) continue;
    const height = surfaceHeight(actor.x, actor.z);
    if (actor.dead) {
      actor.mesh.position.y = height + 0.2;
    } else {
      actor.y = height;
      actor.mesh.position.y = height;
    }
  }
}

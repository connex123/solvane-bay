// Cooking-gas bottles stacked on the lagoon market stalls. Enough damage turns a cluster into a fireball that
// hurts everything nearby and leaves flames on the deck for a few seconds; the supplier restocks it later.
import * as THREE from 'three';
import { explosion, fire as flames } from './effects.js';
import { blast } from '../vehicles/carPhysics.js';
import { sfx } from '../audio/soundEngine.js';

export const BOTTLES = [];

const CLUSTER_HP = 30;
const HIT_RADIUS = 0.55;
const BURN_SECONDS = 6;
const RESTOCK_SECONDS = 120;
const CHAIN_RANGE = 7; // neighbours this close are left one spark from going up too

// Three bottles per cluster, offsets from the cluster origin on the deck.
const LAYOUT = [[-0.26, 0], [0.26, 0.05], [0, -0.38]];

let parts = null;
function sharedParts() {
  if (!parts) {
    parts = {
      body: new THREE.CylinderGeometry(0.2, 0.22, 0.75, 10),
      valve: new THREE.CylinderGeometry(0.09, 0.12, 0.14, 8),
      paint: new THREE.MeshLambertMaterial({ color: 0xe8402c, emissive: 0x401008 }),
      collar: new THREE.MeshLambertMaterial({ color: 0xfff4e0 }),
    };
  }
  return parts;
}

function clusterMesh(x, y, z) {
  const kit = sharedParts();
  const group = new THREE.Group();
  group.position.set(x, y, z);
  for (const [ox, oz] of LAYOUT) {
    const body = new THREE.Mesh(kit.body, kit.paint);
    body.position.set(ox, 0.375, oz);
    const valve = new THREE.Mesh(kit.valve, kit.collar);
    valve.position.set(ox, 0.82, oz);
    group.add(body, valve);
  }
  return group;
}

/** Place one cluster at each [x, y, z] spot (the stall deck corners from world/landmarks.js). */
export function buildGasBottles(scene, spots) {
  for (const [x, y, z] of spots) {
    const mesh = clusterMesh(x, y, z);
    scene.add(mesh);
    BOTTLES.push({ isBottle: true, x, y: y + 0.4, z, hp: CLUSTER_HP, mesh, live: true, burnT: 0, restockT: 0 });
  }
}

/** Nearest live cluster a unit ray meets within max: { t, hit } with t = -1 and hit = null for a miss. */
export function rayBottles(ox, oy, oz, dx, dy, dz, max) {
  const result = { t: -1, hit: null };
  for (const cluster of BOTTLES) {
    if (!cluster.live) continue;
    const vx = cluster.x - ox, vy = cluster.y - oy, vz = cluster.z - oz;
    const along = vx * dx + vy * dy + vz * dz;
    if (along < 0 || along > max) continue;
    const miss2 = vx * vx + vy * vy + vz * vz - along * along;
    if (miss2 >= HIT_RADIUS * HIT_RADIUS) continue;
    if (result.t < 0 || along < result.t) { result.t = along; result.hit = cluster; }
  }
  return result;
}

export function hitBottle(b, dmg) {
  if (!b.live) return;
  b.hp -= dmg;
  if (b.hp <= 0) detonate(b);
}

export function detonate(b) {
  b.live = false;
  b.mesh.visible = false;
  b.burnT = BURN_SECONDS;
  b.restockT = RESTOCK_SECONDS;
  explosion(b.x, b.y, b.z);
  sfx.explosion();
  blast(b.x, b.z, 8, null);
  for (const other of BOTTLES) {
    if (other.live && Math.hypot(other.x - b.x, other.z - b.z) < CHAIN_RANGE) other.hp = Math.min(other.hp, 1);
  }
}

export function updateGasBottles(dt) {
  for (const cluster of BOTTLES) {
    if (cluster.burnT > 0) {
      cluster.burnT -= dt;
      if (Math.random() < dt * 14) flames(cluster.x, cluster.y, cluster.z);
    }
    if (cluster.live) continue;
    cluster.restockT -= dt;
    if (cluster.restockT <= 0) {
      cluster.live = true;
      cluster.hp = CLUSTER_HP;
      cluster.mesh.visible = true;
    }
  }
}

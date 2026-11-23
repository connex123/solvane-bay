// Stingers. SBPD roadblocks lay a spike strip across the road; a car that rolls over it bursts its tyres
// (less grip and a lower top speed from then on).
import * as THREE from 'three';
import { G, notify } from '../core/gameState.js';
import { sparks } from '../combat/effects.js';
import { damageCar } from '../vehicles/carPhysics.js';

const SPIKE_PITCH = 0.32; // metres between spike pairs
const STRIP_LIFE = 45; // seconds before a strip is picked up
const CATCH_HALF_WIDTH = 1.6; // how far either side of the strip a wheel still catches it

let kit = null;
function strapKit() {
  if (!kit) {
    kit = {
      base: new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.6, metalness: 0.5 }),
      spike: new THREE.MeshStandardMaterial({ color: 0xd8dce4, roughness: 0.25, metalness: 0.9 }),
      cap: new THREE.MeshLambertMaterial({ color: 0xffc21c, emissive: 0x402800 }),
    };
  }
  return kit;
}

function spikeRows(len, material) {
  const pairs = Math.floor(len / SPIKE_PITCH);
  const mesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.045, 0.17, 5), material, pairs * 2);
  const pose = new THREE.Object3D();
  let index = 0;
  for (let pair = 0; pair < pairs; pair++) {
    for (const right of [false, true]) {
      // the two rows lean outwards and are staggered along the strip
      const along = -len / 2 + 0.16 + pair * SPIKE_PITCH + (right ? 0.12 : 0);
      pose.position.set(right ? 0.08 : -0.08, 0.14, along);
      pose.rotation.set(0, 0, right ? -0.35 : 0.35);
      pose.updateMatrix();
      mesh.setMatrixAt(index++, pose.matrix);
    }
  }
  return mesh;
}

/** Lay a strip `len` metres long centred on (x, z), running along heading `ang` (car-heading convention). */
export function createSpikeStrip(x, z, ang, len = 7) {
  const mats = strapKit();
  const group = new THREE.Group();
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, len), mats.base);
  strap.position.y = 0.03;
  group.add(strap, spikeRows(len, mats.spike));
  for (const end of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.4), mats.cap);
    cap.position.set(0, 0.06, end * (len / 2 + 0.15));
    group.add(cap);
  }
  group.position.set(x, 0, z);
  group.rotation.y = ang;
  G.scene.add(group);

  const strip = { x, z, ang, len, mesh: group, t: STRIP_LIFE };
  if (!G.spikes) G.spikes = [];
  G.spikes.push(strip);
  return strip;
}

export function removeSpikeStrip(s) {
  s.mesh.removeFromParent();
  G.spikes = (G.spikes || []).filter((other) => other !== s);
}

function crosses(car, strip) {
  const ux = Math.sin(strip.ang), uz = Math.cos(strip.ang);
  const rx = car.x - strip.x, rz = car.z - strip.z;
  const along = rx * ux + rz * uz;
  const across = rx * uz - rz * ux;
  return Math.abs(along) < strip.len / 2 + 0.6 && Math.abs(across) < CATCH_HALF_WIDTH;
}

function shred(car) {
  car.tyresBurst = true;
  damageCar(car, 60);
  sparks(car.x, 0.3, car.z, 12);
  if (car !== G.p.car) return;
  notify('TYRES SHREDDED', 'bad');
  G.shake = Math.max(G.shake, 0.4);
}

/** Burst the tyres of moving cars that cross a strip; strips expire with time or once the heat is gone. */
export function updateSpikes(dt) {
  const strips = (G.spikes || []).slice();
  for (const strip of strips) {
    strip.t -= dt;
    const heatGone = G.wanted.stars === 0 && !G.shotLock;
    if (strip.t < 0 || heatGone) { removeSpikeStrip(strip); continue; }
    for (const car of G.cars) {
      if (car.dead || car.tyresBurst || car.kind === 'cop') continue;
      if (Math.abs(car.speed) < 2) continue;
      if (crosses(car, strip)) shred(car);
    }
  }
}

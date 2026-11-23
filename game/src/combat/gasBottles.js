// Cooking-gas bottles on the lagoon market stalls: shoot a cluster and it goes up in a fireball
// that hurts everyone close, then burns on the deck for a few seconds. The stall's supplier restocks it a while later.
import * as THREE from 'three';
import { explosion, fire as flames } from './effects.js';
import { blast } from '../vehicles/carPhysics.js';
import { sfx } from '../audio/soundEngine.js';

export const BOTTLES = [];
const HP = 30, RADIUS = 0.55, BURN = 6, RESTOCK = 120;
// one cluster of three bottles at the street-side corner of each stall deck (positions from world/landmarks.js)
export function buildGasBottles(scene, spots) {
  const geo = new THREE.CylinderGeometry(0.2, 0.22, 0.75, 10), cap = new THREE.CylinderGeometry(0.09, 0.12, 0.14, 8);
  const red = new THREE.MeshLambertMaterial({ color: 0xe8402c, emissive: 0x401008 }), band = new THREE.MeshLambertMaterial({ color: 0xfff4e0 });
  for (const [x, y, z] of spots) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    [[-0.26, 0], [0.26, 0.05], [0, -0.38]].forEach(([dx, dz]) => { const b = new THREE.Mesh(geo, red); b.position.set(dx, 0.375, dz); const c = new THREE.Mesh(cap, band); c.position.set(dx, 0.82, dz); g.add(b, c); });
    scene.add(g); BOTTLES.push({ isBottle: true, x, y: y + 0.4, z, hp: HP, mesh: g, live: true, burnT: 0, restockT: 0 });
  }
}
// distance along the ray to the nearest live cluster within max, or -1
export function rayBottles(ox, oy, oz, dx, dy, dz, max) {
  let best = -1, hit = null;
  for (const b of BOTTLES) { if (!b.live) continue; const lx = b.x - ox, ly = b.y - oy, lz = b.z - oz, t = lx * dx + ly * dy + lz * dz; if (t < 0 || t > max) continue;
    if (lx * lx + ly * ly + lz * lz - t * t < RADIUS * RADIUS && (best < 0 || t < best)) { best = t; hit = b; } }
  return { t: best, hit };
}
export function hitBottle(b, dmg) { if (!b.live) return; b.hp -= dmg; if (b.hp <= 0) detonate(b); }
export function detonate(b) {
  b.live = false; b.mesh.visible = false; b.burnT = BURN; b.restockT = RESTOCK;
  explosion(b.x, b.y, b.z); sfx.explosion(); blast(b.x, b.z, 8, null);
  for (const o of BOTTLES) if (o.live && Math.hypot(o.x - b.x, o.z - b.z) < 7) o.hp = Math.min(o.hp, 1); // neighbours are one spark from going too
}
export function updateGasBottles(dt) {
  for (const b of BOTTLES) {
    if (b.burnT > 0) { b.burnT -= dt; if (Math.random() < dt * 14) flames(b.x, b.y, b.z); }
    if (!b.live && (b.restockT -= dt) <= 0) { b.live = true; b.hp = HP; b.mesh.visible = true; }
  }
}

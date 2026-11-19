// Spike strips: SBPD roadblocks lay a strip across the road; driving over it shreds the tyres (lower grip and top speed).
import * as THREE from 'three';
import { G, notify } from '../core/gameState.js';
import { sparks } from '../combat/effects.js';
import { damageCar } from '../vehicles/carPhysics.js';

let mats = null;
function materials() {
  return mats || (mats = { base: new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: 0.6, metalness: 0.5 }), spike: new THREE.MeshStandardMaterial({ color: 0xd8dce4, roughness: 0.25, metalness: 0.9 }), cap: new THREE.MeshLambertMaterial({ color: 0xffc21c, emissive: 0x402800 }) });
}
// A strip `len` metres long centred on (x, z), laid along direction `ang` (radians, same convention as car headings).
export function createSpikeStrip(x, z, ang, len = 7) {
  const m = materials(), g = new THREE.Group(), n = Math.floor(len / 0.32);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, len), m.base); base.position.y = 0.03; g.add(base);
  const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.045, 0.17, 5), m.spike, n * 2), d = new THREE.Object3D();
  for (let i = 0; i < n * 2; i++) { d.position.set(i % 2 ? 0.08 : -0.08, 0.14, -len / 2 + 0.16 + Math.floor(i / 2) * 0.32 + (i % 2) * 0.12); d.rotation.set(0, 0, i % 2 ? -0.35 : 0.35); d.updateMatrix(); spikes.setMatrixAt(i, d.matrix); }
  g.add(spikes);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.4), m.cap); c.position.set(0, 0.06, s * (len / 2 + 0.15)); g.add(c); }
  g.position.set(x, 0, z); g.rotation.y = ang; G.scene.add(g);
  const strip = { x, z, ang, len, mesh: g, t: 45 }; (G.spikes = G.spikes || []).push(strip); return strip;
}
export function removeSpikeStrip(s) { s.mesh.removeFromParent(); G.spikes = (G.spikes || []).filter((q) => q !== s); }
// Burst the tyres of any moving car whose wheels cross a strip; strips expire after a while or when the heat is gone.
export function updateSpikes(dt) {
  for (const s of (G.spikes || []).slice()) {
    s.t -= dt; if (s.t < 0 || (G.wanted.stars === 0 && !G.shotLock)) { removeSpikeStrip(s); continue; }
    const ax = Math.sin(s.ang), az = Math.cos(s.ang);
    for (const c of G.cars) {
      if (c.dead || c.tyresBurst || c.kind === 'cop' || Math.abs(c.speed) < 2) continue;
      const rx = c.x - s.x, rz = c.z - s.z, along = rx * ax + rz * az, across = rx * az - rz * ax;
      if (Math.abs(along) < s.len / 2 + 0.6 && Math.abs(across) < 1.6) {
        c.tyresBurst = true; damageCar(c, 60); sparks(c.x, 0.3, c.z, 12);
        if (c === G.p.car) { notify('TYRES SHREDDED', 'bad'); G.shake = Math.max(G.shake, 0.4); }
      }
    }
  }
}

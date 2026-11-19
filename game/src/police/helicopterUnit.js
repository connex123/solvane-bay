// SBPD air support at 4+ stars: a low-poly helicopter that circles the player and sweeps a searchlight cone.
import * as THREE from 'three';
import { G } from '../core/gameState.js';

export function createHeli(x, z) {
  const g = new THREE.Group(), body = new THREE.MeshLambertMaterial({ color: 0xf2f4ee, emissive: 0x5e6a68 }) /* white SBPD air unit livery: reads against a bright sky */, glass = new THREE.MeshLambertMaterial({ color: 0x1f5a6c });
  const cab = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), body); cab.scale.set(1, 0.9, 1.5); g.add(cab);
  const win = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), glass); win.position.set(0, 0.25, 0.9); win.scale.set(1, 0.8, 1); g.add(win);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 4.5), body); tail.position.set(0, 0.2, -3.8); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.8), body); fin.position.set(0, 0.8, -5.8); g.add(fin);
  const rotor = new THREE.Group(); const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.06, 0.35), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.55 }));
  const b2 = blade.clone(); b2.rotation.y = Math.PI / 2; rotor.add(blade, b2); rotor.position.y = 1.55; g.add(rotor);
  // landing skids on struts, a tail rotor and a faint spinning rotor disc so the silhouette reads as a helicopter at any size
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a3438 });
  for (const sx of [-1, 1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 4.4), dark); sk.position.set(sx * 1.15, -1.75, 0.1); g.add(sk);
    for (const sz of [-0.8, 0.9]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.12), dark); st.position.set(sx * 0.95, -1.4, sz); st.rotation.z = sx * 0.35; g.add(st); } }
  const tr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.22), dark); tr.position.set(0.22, 0.9, -5.9); g.add(tr);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.5, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x30393c, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })); disc.position.y = 1.5; g.add(disc);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.25, 1.2), new THREE.MeshBasicMaterial({ color: 0xff3040 })); stripe.position.set(0, -0.3, 0); g.add(stripe);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  // the pool of searchlight on the ground under the cone
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe4f6ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  cone.add(spot); spot.position.y = -0.5; spot.scale.set(0.95, 1, 0.95);
  G.scene.add(g, cone);
  return { x, z, y: 40, ang: Math.random() * 6, mesh: g, rotor, cone };
}
export function updateHeli(dt) {
  const st = G.wanted.stars, p = G.p, tx = p.car ? p.car.x : p.x, tz = p.car ? p.car.z : p.z;
  if (st >= 4 && !G.heli) G.heli = createHeli(tx + 120, tz + 60);
  const h = G.heli; if (!h) return;
  if (st < 4 && !G.shotLock) { h.y += dt * 8; if (h.y > 150 || G.wanted.stars === 0) { h.mesh.removeFromParent(); h.cone.removeFromParent(); G.heli = null; return; } }
  h.ang += dt * 0.35; const px = tx + Math.cos(h.ang) * 28 + (p.car ? p.car.vx * 1.2 : 0), pz = tz + Math.sin(h.ang) * 28 + (p.car ? p.car.vz * 1.2 : 0);
  const k = Math.min(1, dt * 1.2); const ox = h.x, oz = h.z; h.x += (px - h.x) * k; h.z += (pz - h.z) * k;
  h.mesh.position.set(h.x, h.y, h.z); h.mesh.rotation.y = Math.atan2(h.x - ox, h.z - oz) || h.mesh.rotation.y; h.mesh.rotation.z = 0.12; h.rotor.rotation.y += dt * 40;
  placeCone(h, tx, tz);
}
export function placeCone(h, tx, tz, ty = 0) {
  const v = new THREE.Vector3(tx - h.x, ty - h.y, tz - h.z), len = v.length(); h.cone.position.set(h.x + v.x / 2, h.y + v.y / 2, h.z + v.z / 2);
  h.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().multiplyScalar(-1).normalize()); h.cone.scale.set(5, len, 5);
}

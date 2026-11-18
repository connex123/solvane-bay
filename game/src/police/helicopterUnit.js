// SBPD air support at 4+ stars: a low-poly helicopter that circles the player and sweeps a searchlight cone.
import * as THREE from 'three';
import { G } from '../core/gameState.js';

export function createHeli(x, z) { // SBPD air unit: navy/white airframe, tinted canopy, skids, blurred rotor disc, HDR beacon + searchlight
  const g = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: 0x14254a, metalness: 0.4, roughness: 0.35 }), white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, metalness: 0.2, roughness: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1622, metalness: 0.3, roughness: 0.05, clearcoat: 1 }), dark = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.6 });
  const cab = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), body); cab.scale.set(1, 0.95, 1.8); g.add(cab);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.42, 16, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), white); belly.scale.set(1, 0.95, 1.8); g.add(belly);
  const win = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), glass); win.position.set(0, 0.05, 1.15); win.scale.set(1.02, 0.95, 1.1); win.rotation.x = 0.5; g.add(win);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, 5, 10), body); tail.rotation.x = Math.PI / 2 - 0.06; tail.position.set(0, 0.35, -4.2); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.9), white); fin.position.set(0, 1.0, -6.4); fin.rotation.x = -0.35; g.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), body); stab.position.set(0, 0.45, -5.6); g.add(stab);
  for (const sx of [-1, 1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.6), dark); sk.position.set(sx * 1.1, -1.55, 0.1); g.add(sk); for (const sz of [-0.8, 0.9]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.07), dark); st.position.set(sx * 0.95, -1.25, sz); st.rotation.z = sx * 0.3; g.add(st); } }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.18, 2.2), new THREE.MeshStandardMaterial({ color: 0x19c2b0 })); stripe.position.set(0, -0.35, 0.2); g.add(stripe);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.5, 8), dark); mast.position.y = 1.45; g.add(mast);
  const rotor = new THREE.Group(); const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.05, 0.3), new THREE.MeshBasicMaterial({ color: 0x15171c, transparent: true, opacity: 0.75 }));
  const b2 = blade.clone(); b2.rotation.y = Math.PI / 2; const disc = new THREE.Mesh(new THREE.CircleGeometry(5.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x20242c, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  rotor.add(blade, b2, disc); rotor.position.y = 1.72; g.add(rotor);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.3, 0.3) })); beacon.position.set(0, 1.2, -6.8); g.add(beacon);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.3, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 4.6) })); lamp.position.set(0.7, -1.2, 1.4); g.add(lamp);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
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
export function placeCone(h, tx, tz) {
  const v = new THREE.Vector3(tx - h.x, -h.y, tz - h.z), len = v.length(); h.cone.position.set(h.x + v.x / 2, h.y + v.y / 2, h.z + v.z / 2);
  h.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().multiplyScalar(-1).normalize()); h.cone.scale.set(5, len, 5);
}

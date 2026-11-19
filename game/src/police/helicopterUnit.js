// SBPD air support at 4+ stars: AIR-1, a light police helicopter that circles the player and sweeps a nose searchlight.
import * as THREE from 'three';
import { G } from '../core/gameState.js';

// Built so the silhouette reads as a helicopter even as a thumbnail: slim cabin with a glass canopy, a long tapered tail
// boom ending in a swept fin and a tail rotor, landing skids, a pale spinning main-rotor disc, SBPD white with a teal belt
// and a coral tail band, and a searchlight under the nose (the cone and its ground pool start from that lamp).
const NOSE_LAMP = new THREE.Vector3(0, -0.82, 1.5);
export function createHeli(x, z) {
  const g = new THREE.Group(), M = (o) => new THREE.MeshLambertMaterial(o);
  const body = M({ color: 0xf4f6f0, emissive: 0x7e8886 }), glass = M({ color: 0x2a7f96, emissive: 0x123848 }), dark = M({ color: 0x262e32 });
  const teal = M({ color: 0x18c8b8, emissive: 0x0c6a62 }), coral = M({ color: 0xff5a48, emissive: 0x80241c });
  const add = (geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  // cabin: a slim egg stretched front to back, the canopy a glass bubble over its front half
  add(new THREE.SphereGeometry(1, 14, 10), body, 0, 0, 0.2).scale.set(0.95, 0.98, 2.0);
  add(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.36).rotateX(1.05), glass, 0, 0.02, 0.2).scale.set(0.98, 1.0, 2.03);
  // teal belt around the cabin and the engine hump on top
  add(new THREE.CylinderGeometry(1, 1, 0.3, 20, 1, true), teal, 0, -0.18, 0.2).scale.set(0.95, 1, 1.98);
  add(new THREE.BoxGeometry(0.9, 0.5, 1.6), body, 0, 0.98, -0.45);
  // tail boom: tapered, long, with a coral band, a swept vertical fin, a small stabiliser and a two-blade tail rotor
  add(new THREE.CylinderGeometry(0.13, 0.36, 5.4, 10).rotateX(Math.PI / 2), body, 0, 0.35, -4.2);
  add(new THREE.CylinderGeometry(0.27, 0.31, 0.5, 10, 1, true).rotateX(Math.PI / 2), coral, 0, 0.35, -3.0);
  add(new THREE.BoxGeometry(0.1, 1.5, 0.75), body, 0, 0.95, -6.75, -0.45);
  add(new THREE.BoxGeometry(0.11, 0.4, 0.76), coral, 0, 1.45, -7.0, -0.45);
  add(new THREE.BoxGeometry(1.6, 0.07, 0.45), body, 0, 0.35, -6.1);
  const tailRotor = new THREE.Group(); tailRotor.position.set(0.2, 0.95, -6.85); g.add(tailRotor);
  for (const r of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 0.16), dark); b.rotation.x = r; tailRotor.add(b); }
  const tDisc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 18).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd8dee0, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })); tailRotor.add(tDisc);
  // landing skids on struts, the tubes turned up at the front
  for (const sx of [-1, 1]) { add(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 6).rotateX(Math.PI / 2), dark, sx * 1.05, -1.5, 0.1);
    add(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6).rotateX(Math.PI / 2), dark, sx * 1.05, -1.36, 2.12, -0.5);
    for (const sz of [-0.7, 0.9]) add(new THREE.BoxGeometry(0.09, 0.8, 0.1), dark, sx * 0.86, -1.15, sz, 0, 0, sx * 0.5); }
  // main rotor: mast, two dark blades and a pale blur disc with a darker rim so the spinning rotor reads as a disc
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), dark, 0, 1.38, -0.2);
  const rotor = new THREE.Group(); rotor.position.set(0, 1.62, -0.2); g.add(rotor);
  for (const r of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.06, 0.32), new THREE.MeshBasicMaterial({ color: 0x1c2224, transparent: true, opacity: 0.7 })); b.rotation.y = r; rotor.add(b); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe6eef0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })); disc.position.set(0, 1.6, -0.2); g.add(disc);
  const rim = new THREE.Mesh(new THREE.RingGeometry(4.85, 5.2, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a4548, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })); rim.position.set(0, 1.61, -0.2); g.add(rim);
  // the searchlight lamp under the nose (HDR white so it blooms) and red/green running lights
  add(new THREE.CylinderGeometry(0.22, 0.28, 0.3, 12), dark, NOSE_LAMP.x, NOSE_LAMP.y + 0.15, NOSE_LAMP.z);
  add(new THREE.CircleGeometry(0.22, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.4, 3.8) }), NOSE_LAMP.x, NOSE_LAMP.y - 0.01, NOSE_LAMP.z);
  add(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.2) }), -0.8, 0.35, -6.1);
  add(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 3, 0.6) }), 0.8, 0.35, -6.1);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  // the cool pool of searchlight on the ground under the cone
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.9, 2.3) /* HDR: blooms under the warm grade */, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  cone.add(spot); spot.position.y = -0.5; spot.scale.set(0.95, 1, 0.95);
  G.scene.add(g, cone);
  return { x, z, y: 40, ang: Math.random() * 6, mesh: g, rotor, tailRotor, cone };
}
export function updateHeli(dt) {
  const st = G.wanted.stars, p = G.p, tx = p.car ? p.car.x : p.x, tz = p.car ? p.car.z : p.z;
  if (st >= 4 && !G.heli) G.heli = createHeli(tx + 120, tz + 60);
  const h = G.heli; if (!h) return;
  if (st < 4 && !G.shotLock) { h.y += dt * 8; if (h.y > 150 || G.wanted.stars === 0) { h.mesh.removeFromParent(); h.cone.removeFromParent(); G.heli = null; return; } }
  h.ang += dt * 0.35; const px = tx + Math.cos(h.ang) * 28 + (p.car ? p.car.vx * 1.2 : 0), pz = tz + Math.sin(h.ang) * 28 + (p.car ? p.car.vz * 1.2 : 0);
  const k = Math.min(1, dt * 1.2); const ox = h.x, oz = h.z; h.x += (px - h.x) * k; h.z += (pz - h.z) * k;
  h.mesh.position.set(h.x, h.y, h.z); h.mesh.rotation.y = Math.atan2(h.x - ox, h.z - oz) || h.mesh.rotation.y; h.mesh.rotation.z = 0.12; h.rotor.rotation.y += dt * 40; h.tailRotor.rotation.x += dt * 60;
  placeCone(h, tx, tz);
}
// The cone runs from the nose lamp (in world space) down to the target; its base carries the ground pool.
export function placeCone(h, tx, tz, ty = 0) {
  h.mesh.updateMatrixWorld(); const o = h.mesh.localToWorld(NOSE_LAMP.clone());
  const v = new THREE.Vector3(tx - o.x, ty - o.y, tz - o.z), len = v.length(); h.cone.position.set(o.x + v.x / 2, o.y + v.y / 2, o.z + v.z / 2);
  h.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().multiplyScalar(-1).normalize()); h.cone.scale.set(5, len, 5);
}

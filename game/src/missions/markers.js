// World markers (mission starts, objectives, shops, pickups): glowing beacons, minimap blips and interaction prompts.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { pressed } from '../core/input.js';

const cols = {}; const geo = new THREE.CylinderGeometry(2.4, 2.4, 34, 14, 1, true); geo.translate(0, 17, 0); const ring = new THREE.TorusGeometry(2.6, 0.18, 6, 24); ring.rotateX(Math.PI / 2);
const mats = (c) => cols[c] || (cols[c] = [new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), new THREE.MeshBasicMaterial({ color: c })]);
export function addMarker(o) {
  const m = { r: 4, color: 0xffd23c, kind: 'obj', label: '', auto: true, ...o }; const [a, b] = mats(m.color);
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, a), new THREE.Mesh(ring, b)); g.position.set(m.x, 0.3, m.z); G.scene.add(g); m.mesh = g; G.markers.push(m); return m;
}
export function removeMarker(m) { if (!m) return; m.mesh.removeFromParent(); const i = G.markers.indexOf(m); if (i >= 0) G.markers.splice(i, 1); }
export function updateMarkers(dt) {
  const p = G.p; G.prompt = '';
  for (const m of G.markers.slice()) {
    if (m.follow) { m.x = m.follow.x; m.z = m.follow.z; }
    m.mesh.position.set(m.x, 0.3, m.z); m.mesh.rotation.y += dt;
    if (m.hidden) { m.mesh.visible = false; continue; } m.mesh.visible = true;
    const d = Math.hypot(m.x - p.x, m.z - p.z); m.cool = Math.max(0, (m.cool || 0) - dt);
    if (d < m.r && (!m.needCar || p.car) && (!m.needFoot || !p.car)) {
      if (m.auto) { if (m.cool <= 0) { m.cool = m.cooldown || 2; m.onEnter?.(m); } }
      else { G.prompt = m.prompt || m.label; if (pressed('KeyE')) m.onInteract?.(m); }
    }
  }
}

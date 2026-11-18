// Camera: chase cam behind cars (speed-based FOV), over-the-shoulder on foot, aerial orbit for the title, screen shake.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { input } from '../core/input.js';
import { clamp, wrapAngle } from '../core/config.js';
import { rayBuildings } from '../world/collision.js';

export const rig = { yaw: Math.PI, pos: new THREE.Vector3(), look: new THREE.Vector3(), aerial: { x: 0, y: 150, z: 0, tx: 0, ty: 0, tz: 0 }, mode: 'auto', fov: 60 };
const tmp = new THREE.Vector3();
export function updateCamera(dt, snap = false) {
  const cam = G.camera, p = G.p, k = snap ? 1 : 1 - Math.exp(-dt * 7);
  let pos, look, fov = 60;
  if (rig.shot) { const s = rig.shot; cam.position.set(...s.pos); cam.up.set(0, 1, 0); cam.lookAt(...s.look); cam.rotateZ(s.roll || 0); cam.fov = s.fov || 60; cam.updateProjectionMatrix(); return; } // staged screenshot camera
  if (rig.mode === 'aerial') {
    const a = rig.aerial; pos = tmp.set(a.x, a.y, a.z); look = new THREE.Vector3(a.tx, a.ty, a.tz); fov = 50; cam.position.copy(pos); cam.lookAt(look); cam.fov = fov; cam.updateProjectionMatrix(); return;
  }
  if (p.car) {
    const c = p.car, sp = Math.abs(c.speed), vel = Math.hypot(c.vx, c.vz);
    const target = sp > 6 ? Math.atan2(c.vx, c.vz) * 0.35 + c.heading * 0.65 : c.heading; rig.yaw += wrapAngle(target - rig.yaw) * (snap ? 1 : Math.min(1, dt * 4.5));
    const dist = 6.6 + c.type.len * 0.25 + Math.min(1.5, vel * 0.03), fx = Math.sin(rig.yaw), fz = Math.cos(rig.yaw);
    pos = new THREE.Vector3(c.x - fx * dist, 3.4 + Math.min(1.3, vel * 0.03), c.z - fz * dist); look = new THREE.Vector3(c.x + fx * 5, 1.3, c.z + fz * 5);
    fov = 58 + Math.min(14, vel * 0.34);
  } else {
    const y = G.cam.yaw, pi = G.cam.pitch, aim = p.aim, dist0 = aim ? (G.camDistAim || 2.6) : 3.8, cp = Math.cos(pi), fx = Math.sin(y) * cp, fy = -Math.sin(pi), fz = Math.cos(y) * cp;
    const rx = -Math.cos(y), rz = Math.sin(y), tx = p.x + rx * (aim ? 0.9 : 0.5), ty = 1.6, tz = p.z + rz * (aim ? 0.9 : 0.5);
    const t = rayBuildings(tx, ty, tz, -fx, -fy, -fz, dist0 + 0.4), dist = Math.max(0.8, Math.min(dist0, t - 0.4));
    pos = new THREE.Vector3(tx - fx * dist, Math.max(0.5, ty - fy * dist), tz - fz * dist); look = new THREE.Vector3(tx + fx * 10, ty + fy * 10, tz + fz * 10);
    rig.yaw = y; fov = aim ? 52 : 60;
  }
  cam.position.lerp(pos, snap ? 1 : p.car ? 1 - Math.exp(-dt * 14) : k * 1.4 > 1 ? 1 : k * 1.4);
  if (G.shake > 0) cam.position.add(tmp.set((Math.random() - .5) * G.shake * 0.5, (Math.random() - .5) * G.shake * 0.4, (Math.random() - .5) * G.shake * 0.5));
  rig.look.lerp(look, snap ? 1 : 1 - Math.exp(-dt * 12)); cam.lookAt(rig.look);
  cam.fov += (fov - cam.fov) * (snap ? 1 : Math.min(1, dt * 3)); cam.updateProjectionMatrix();
}

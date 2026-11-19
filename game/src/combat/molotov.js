// The MOLOTOV: a thrown bottle on a ballistic arc that bursts into a burning pool where it lands. The pool burns
// people standing in it and sets cars alight; a burning car keeps losing health until it explodes.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { blockedAt } from '../world/collision.js';
import { damageCar } from '../vehicles/carPhysics.js';
import { fire, smoke, particle } from './effects.js';
import { sfx } from '../audio/soundEngine.js';

export const MOLOTOV = { speed: 17, lift: 5.5, gravity: 18, poolR: 3.6, poolTime: 7, carBurn: 8, burnDps: 85, poolCarDps: 140 };
const bottles = [], pools = [];
let geo = null, mat = null, glow = null;
function bottleMesh() {
  geo ||= new THREE.CylinderGeometry(0.07, 0.09, 0.32, 8); mat ||= new THREE.MeshStandardMaterial({ color: 0x6a8a3a, roughness: 0.3, emissive: 0xff6a20, emissiveIntensity: 0.25 });
  const m = new THREE.Mesh(geo, mat); G.scene.add(m); return m;
}
// Throws from Nico's hand along the camera's aim, with an upward lob.
export function throwMolotov(p) {
  const d = new THREE.Vector3(); G.camera.getWorldDirection(d); const h = Math.hypot(d.x, d.z) || 1;
  const b = { x: p.x + Math.sin(p.yaw) * 0.6, y: 1.7, z: p.z + Math.cos(p.yaw) * 0.6, vx: (d.x / h) * MOLOTOV.speed, vy: MOLOTOV.lift + d.y * 10, vz: (d.z / h) * MOLOTOV.speed, mesh: bottleMesh(), t: 0 };
  bottles.push(b); sfx.punch(); return b;
}
function ignite(x, z) {
  pools.push({ x, z, t: MOLOTOV.poolTime, tick: 0 }); sfx.shot('shotgun'); G.shake = Math.max(G.shake, 0.2);
  for (let k = 0; k < 10; k++) fire(x + (Math.random() - 0.5) * 3, 0.3, z + (Math.random() - 0.5) * 3);
  particle({ x, y: 0.6, z, life: 0.4, size: 5, color: 0xffa040, add: true, hdr: 2 });
  G.hooks.crime('shootcar');
}
export const activeFirePools = () => pools.length;
export function updateMolotovs(dt) {
  for (let i = bottles.length - 1; i >= 0; i--) {
    const b = bottles[i]; b.t += dt; b.vy -= MOLOTOV.gravity * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.mesh.position.set(b.x, b.y, b.z); b.mesh.rotation.x += dt * 12; b.mesh.rotation.z += dt * 7; if (Math.random() < 0.5) fire(b.x, b.y + 0.2, b.z);
    const car = G.cars.find((c) => !c.dead && c !== G.p.car && Math.hypot(c.x - b.x, c.z - b.z) < c.type.wid && b.y < 1.6);
    if (b.y <= 0.05 || car || blockedAt(b.x, b.z) || b.t > 4) { if (car) car.burnT = MOLOTOV.carBurn; ignite(b.x, b.z); b.mesh.removeFromParent(); bottles.splice(i, 1); }
  }
  for (let i = pools.length - 1; i >= 0; i--) {
    const q = pools[i]; q.t -= dt; q.tick -= dt; const r = MOLOTOV.poolR * Math.min(1, q.t / 1.5 + 0.3);
    if (Math.random() < dt * 40) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * r; fire(q.x + Math.cos(a) * d, 0.15, q.z + Math.sin(a) * d); }
    if (Math.random() < dt * 4) smoke(q.x, 1.5, q.z, 0x2a2420);
    for (const c of G.cars) if (!c.dead && Math.hypot(c.x - q.x, c.z - q.z) < r + c.type.wid * 0.6) { c.burnT = MOLOTOV.carBurn; damageCar(c, MOLOTOV.poolCarDps * dt); }
    if (q.tick <= 0) {
      q.tick = 0.25; for (const a of G.actors) if (!a.dead && Math.hypot(a.x - q.x, a.z - q.z) < r) G.hooks.hitActor(a, 12, true);
      const p = G.p; if (!p.car && Math.hypot(p.x - q.x, p.z - q.z) < r) G.hooks.hurtPlayer(5);
    }
    if (q.t <= 0) pools.splice(i, 1);
  }
  for (const c of G.cars) if (c.burnT > 0) { if (c.dead) { c.burnT = 0; continue; } c.burnT -= dt; damageCar(c, MOLOTOV.burnDps * dt); if (Math.random() < dt * 25) fire(c.x + (Math.random() - 0.5) * 1.6, 1.1, c.z + (Math.random() - 0.5) * 1.6); }
  // one shared warm light over the newest fire
  if (!glow) { glow = new THREE.PointLight(0xff7a30, 0, 16, 1.8); G.scene.add(glow); }
  const last = pools[pools.length - 1]; glow.intensity = last ? 30 + Math.random() * 12 : 0; if (last) glow.position.set(last.x, 1.6, last.z);
}
// Chapter 3's reward: three bottles from the Coral Kings' stash and the slot to throw them from.
export function grantMolotovs(n = 3) { const p = G.p; p.owned[4] = true; p.ammo.molotov = Math.min(10, (p.ammo.molotov || 0) + n); }

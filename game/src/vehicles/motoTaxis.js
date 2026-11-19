// Moto-taxis: small teal motorbikes with a helmeted rider (and often a passenger) weaving along the lanes near the
// player, faster than the cars. Ambient street life: they ride straight down an avenue and re-enter near the player.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { HALF, LANE, lineCoord } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { randomRoadPoint } from '../world/cityLayout.js';
import { rnd } from '../core/random.js';

const COUNT = 8, bikes = [];
const HELMETS = [0xe8604c, 0xf6c21c, 0xfff4e0, 0x2fb8a8], SHIRTS = [0xf6e3b4, 0x3a8fd0, 0xe8604c, 0x8fd3c8, 0xffffff];
function bikeGeometry(i) {
  const B = newBuf(), helmet = HELMETS[i % 4], shirt = SHIRTS[i % 5];
  pushBox(B, 0, 0, 0.72, 0.16, 0.62, 0.62, 0x1c2226); pushBox(B, 0, 0, -0.72, 0.18, 0.62, 0.62, 0x1c2226); // wheels
  pushBox(B, 0, 0.42, 0, 0.36, 0.38, 1.3, 0x16808a); pushBox(B, 0, 0.62, 0.62, 0.42, 0.36, 0.34, 0x16808a); pushBox(B, 0, 0.8, 0.12, 0.34, 0.12, 0.9, 0x23292e); // body, nose, seat
  pushBox(B, 0, 0.98, 0.8, 0.9, 0.06, 0.06, 0x30363a); pushBox(B, 0, 0.66, 0.84, 0.3, 0.16, 0.06, 0xfff2c0); // bars, headlamp
  pushBox(B, 0, 0.86, 0.2, 0.44, 0.62, 0.3, shirt); pushBox(B, 0, 1.46, 0.24, 0.3, 0.3, 0.32, helmet); pushBox(B, 0, 1.47, 0.42, 0.24, 0.12, 0.04, 0x1a2a30); // rider, helmet, visor
  for (const s of [-1, 1]) { pushBox(B, s * 0.2, 0.5, 0.35, 0.12, 0.42, 0.14, 0x2a3440); pushBox(B, s * 0.24, 1.12, 0.48, 0.1, 0.1, 0.5, shirt); } // legs, arms
  if (i % 3 !== 2) { pushBox(B, 0, 0.86, -0.32, 0.42, 0.56, 0.28, SHIRTS[(i + 2) % 5]); pushBox(B, 0, 1.4, -0.32, 0.28, 0.28, 0.3, HELMETS[(i + 1) % 4]); } // passenger
  return toGeometry(B);
}
function place(b, near) {
  const pt = randomRoadPoint(rnd, near.x, near.z, 40, 150); b.axis = pt.axis; b.line = pt.line; b.t = pt.axis === 'x' ? pt.x : pt.z;
  b.dir = rnd() < 0.5 ? 1 : -1; b.speed = 13 + rnd() * 6; b.phase = rnd() * 6; b.lane = LANE * (0.45 + rnd() * 0.9);
}
export function initMotoTaxis(scene) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (let i = 0; i < COUNT; i++) { const m = new THREE.Mesh(bikeGeometry(i), mat); m.castShadow = true; scene.add(m); const b = { mesh: m }; place(b, { x: 0, z: 0 }); bikes.push(b); }
  updateMotoTaxis(0);
}
export function updateMotoTaxis(dt) {
  const p = G.p;
  for (const b of bikes) {
    b.t += b.dir * b.speed * dt; b.phase += dt * 1.3;
    if (Math.abs(b.t) > HALF + 10 || (dt > 0 && Math.hypot((b.axis === 'x' ? b.t : lineCoord(b.line)) - p.x, (b.axis === 'x' ? lineCoord(b.line) : b.t) - p.z) > 220)) place(b, p);
    // right-hand lanes, weaving between them
    const weave = Math.sin(b.phase) * 1.1, cross = lineCoord(b.line) + (b.axis === 'x' ? b.dir : -b.dir) * (b.lane + weave);
    const x = b.axis === 'x' ? b.t : cross, z = b.axis === 'x' ? cross : b.t, yaw = (b.axis === 'x' ? b.dir * Math.PI / 2 : b.dir > 0 ? 0 : Math.PI) - Math.cos(b.phase) * 0.18 * b.dir;
    b.mesh.position.set(x, 0.3, z); b.mesh.rotation.set(0, yaw, Math.cos(b.phase) * 0.16 * (b.axis === 'x' ? 1 : -1));
  }
}
// Staged scenes put a bike at an exact spot on an avenue.
export function stageMoto(i, axis, line, t, dir, lane = LANE, phase = 0) { const b = bikes[i]; Object.assign(b, { axis, line, t, dir, lane, phase }); updateMotoTaxis(0); }

// Boats: the Skipjack speedboat and SBPD harbour patrol launches. Water-only arcade physics (thrust, drag, slide,
// buoyancy bob and bow lift), a white wake ribbon and bow spray, boat-to-boat ramming, pursuit AI, and stepping
// aboard or ashore at a dock. Boats share the car interface (x, z, heading, speed, input, type, hp) so the camera,
// HUD and markers treat a boat the player drives like any vehicle.
import * as THREE from 'three';
import { G, notify } from '../core/gameState.js';
import { clamp, wrapAngle } from '../core/config.js';
import { particle, sparks, explosion } from '../combat/effects.js';
import { sfx } from '../audio/soundEngine.js';
import { waterBlock, dockSpotNear } from '../world/marina.js';
import { buildCharacter, STYLES } from '../characters/characterModel.js';

export const BOAT_TYPES = {
  skipjack: { name: 'Skipjack 28', len: 7.6, wid: 2.7, max: 36, acc: 15, turn: 1.35, hp: 420, hull: 0xfaf6ee, stripe: 0xe8604c, deck: 0x2fb8a8 },
  patrol: { name: 'SBPD Harbour Launch', len: 9, wid: 3.1, max: 31, acc: 13, turn: 1.05, hp: 380, hull: 0xf4f6f8, stripe: 0x1d4fa0, deck: 0x2a3440, police: true },
};
G.boats = G.boats || [];
const WAKE_N = 44;
let launchN = 1;
let wakeMat = null;

function hullShape(len, wid) {
  const s = new THREE.Shape(), h = len / 2, w = wid / 2;
  s.moveTo(-w, -h); s.lineTo(w, -h); s.lineTo(w, h * 0.25); s.quadraticCurveTo(w * 0.9, h * 0.8, 0, h); s.quadraticCurveTo(-w * 0.9, h * 0.8, -w, h * 0.25); s.closePath(); return s;
}
function boatMesh(key) {
  const t = BOAT_TYPES[key], g = new THREE.Group(), L = (c) => new THREE.MeshLambertMaterial({ color: c });
  const ex = (sh, depth, y, mat, sc = 1) => { const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); geo.rotateX(Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.y = y + depth; m.scale.set(sc, 1, sc); g.add(m); return m; };
  ex(hullShape(t.len, t.wid), 1.0, -0.45, L(t.hull)).castShadow = true;
  ex(hullShape(t.len, t.wid), 0.22, 0.12, L(t.stripe), 1.02);
  ex(hullShape(t.len * 0.92, t.wid * 0.86), 0.06, 0.55, L(t.deck));
  const box = (w, h, d, x, y, z, c, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? L(c) : c); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  box(0.7, 0.9, 0.9, 0, 0.6, -t.len / 2 - 0.2, 0x22262c); // outboard
  if (t.police) {
    box(t.wid * 0.7, 1.4, 2.6, 0, 1.3, -0.2, 0xf2f2f2); box(t.wid * 0.72, 0.5, 2.62, 0, 1.6, -0.2, 0x1f4f5c);
    const red = new THREE.MeshBasicMaterial({ color: 0xff2030 }), blue = new THREE.MeshBasicMaterial({ color: 0x2060ff });
    g.userData.lights = [box(0.7, 0.3, 0.4, -0.45, 2.15, -0.2, red), box(0.7, 0.3, 0.4, 0.45, 2.15, -0.2, blue)];
  } else {
    box(t.wid * 0.8, 0.7, 0.12, 0, 1.0, 0.6, new THREE.MeshLambertMaterial({ color: 0x9fd8e8, transparent: true, opacity: 0.55 }), -0.5);
    box(1.0, 0.5, 0.9, 0, 0.8, -0.8, 0xf6ead2); box(t.wid * 0.84, 0.35, 1.1, 0, 0.75, -2.4, 0xf6ead2);
    const d = buildCharacter(STYLES.nico); d.scale.setScalar(0.92); d.position.set(0, 0.2, -0.3); d.visible = false; g.add(d); g.userData.driver = d;
  }
  return g;
}
function wakeMesh() {
  wakeMat ||= new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(WAKE_N * 2 * 3), col = new Float32Array(WAKE_N * 2 * 4), idx = [];
  for (let i = 0; i < WAKE_N - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, wakeMat); m.frustumCulled = false; G.scene.add(m); return m;
}
export function createBoat(key, x, z, heading, kind = 'moored') {
  const type = BOAT_TYPES[key], mesh = boatMesh(key);
  const b = { isBoat: true, key, type, mesh, x, z, y: 0, heading, vx: 0, vz: 0, speed: 0, lat: 0, steerA: 0, hp: type.hp, maxHp: type.hp, input: { throttle: 0, brake: 0, steer: 0, hand: 0 }, driver: null, kind, dead: false, hitT: 0, ph: Math.random() * 6, trail: [], trailT: 0, wake: wakeMesh() };
  if (type.police) { b.callsign = `HARBOUR-${launchN++}`; b.ai = 'PURSUIT'; }
  mesh.position.set(x, 0, z); mesh.rotation.y = heading; G.scene.add(mesh); G.boats.push(b); return b;
}
export function removeBoat(b) { b.mesh.removeFromParent(); b.wake.removeFromParent(); b.wake.geometry.dispose(); G.boats = G.boats.filter((q) => q !== b); }
export function sinkBoat(b) { if (b.dead) return; b.dead = true; b.hp = 0; explosion(b.x, 1, b.z); sfx.explosion(); b.sinkT = 4; if (b === G.p.car) exitBoat(true); }
export function damageBoat(b, amt) { if (b.dead) return; b.hp -= amt; b.hitT = 3; if (b.hp <= 0) sinkBoat(b); }

export function nearestBoat(x, z, r = 5.5) { let best = null, bd = r; for (const b of G.boats) { if (b.dead || b.driver === 'ai') continue; const d = Math.hypot(b.x - x, b.z - z); if (d < bd) { bd = d; best = b; } } return best; }
export function enterBoat(b) {
  const p = G.p; b.kind = 'player'; b.driver = 'player'; p.car = b; p.hidden = true; p.mesh.visible = false; if (b.mesh.userData.driver) b.mesh.userData.driver.visible = true; sfx.click();
}
// Step ashore: only at a pier or jetty (or forced when the boat goes down, landing on the nearest dock)
export function exitBoat(forced) {
  const p = G.p, b = p.car; if (!b?.isBoat) return false;
  const spot = dockSpotNear(b.x, b.z, forced ? 1e4 : 6.5); if (!spot) { notify('No dock here: steer alongside a pier to step off', 'bad'); return false; }
  b.kind = b.dead ? 'wreck' : 'moored'; b.driver = null; b.input.throttle = b.input.brake = b.input.steer = 0; if (b.mesh.userData.driver) b.mesh.userData.driver.visible = false;
  p.car = null; p.hidden = false; p.mesh.visible = true; p.x = spot.x; p.z = spot.z; p.yaw = b.heading; G.cam.yaw = b.heading + Math.PI; G.cam.pitch = 0.2; sfx.click(); return true;
}
// SBPD launch AI: aim at where the target will be, full throttle, ram when close
function patrolInput(b, dt) {
  const t = G.p.car?.isBoat ? G.p.car : null, i = b.input; if (!t) { i.throttle = 0.2; i.steer = 0.3; return; }
  const lead = clamp(Math.hypot(t.x - b.x, t.z - b.z) / 30, 0, 1.2), tx = t.x + t.vx * lead, tz = t.z + t.vz * lead;
  const diff = wrapAngle(Math.atan2(tx - b.x, tz - b.z) - b.heading); i.steer = clamp(diff * 2.2, -1, 1); i.throttle = Math.abs(diff) < 1.4 ? 1 : 0.5;
  const ahead = waterBlock(b.x + Math.sin(b.heading) * 9, b.z + Math.cos(b.heading) * 9, 2); if (ahead) i.steer = ahead.nx * Math.cos(b.heading) - ahead.nz * Math.sin(b.heading) > 0 ? 1 : -1;
  const d = Math.hypot(t.x - b.x, t.z - b.z); b.pmax = d > 60 ? 1.15 : 1; b.ai = d < 16 ? 'RAMMING' : 'PURSUIT'; // catch-up so the chase stays close
}
export function stepBoat(b, dt) {
  const t = b.type, i = b.input, sn = Math.sin(b.heading), cs = Math.cos(b.heading);
  let vF = b.vx * sn + b.vz * cs, vL = b.vx * cs - b.vz * sn;
  if (b.dead) { b.sinkT -= dt; b.mesh.position.y -= dt * 0.6; b.mesh.rotation.z += dt * 0.1; if (Math.random() < dt * 8) particle({ x: b.x, y: 1, z: b.z, vy: 2.5, life: 1.6, size: 1.6, grow: 3, color: 0x2a2a2a, op: 0.6, tex: 'puff' }); if (b.sinkT < 0 && b !== G.p.car) removeBoat(b); return; }
  if (b.driver === 'ai') patrolInput(b, dt);
  const mx = t.max * (b.pmax || 1);
  if (i.throttle > 0) vF += t.acc * i.throttle * dt * clamp(1 - Math.max(0, vF) / mx, 0.04, 1);
  if (i.brake > 0) vF = Math.max(vF - t.acc * 0.9 * i.brake * dt, -7);
  vF *= 1 - (i.throttle ? 0.05 : 0.55) * dt; vL *= Math.exp(-(i.hand ? 0.7 : 2.0) * dt);
  b.steerA += (i.steer - b.steerA) * Math.min(1, dt * 5);
  const turn = b.steerA * t.turn * clamp(Math.abs(vF) / 9, 0, 1) * Math.sign(vF) * (i.hand ? 1.35 : 1); b.heading += turn * dt;
  vL -= turn * vF * 0.06 * dt * 10; // the stern slides out in a hard turn
  const s2 = Math.sin(b.heading), c2 = Math.cos(b.heading);
  b.vx = vF * s2 + vL * c2; b.vz = vF * c2 - vL * s2; b.speed = vF; b.lat = vL; b.x += b.vx * dt; b.z += b.vz * dt;
  for (const off of [t.len * 0.35, -t.len * 0.3]) {
    const hit = waterBlock(b.x + s2 * off, b.z + c2 * off, t.wid / 2 + 0.2); if (!hit) continue;
    b.x += hit.dx; b.z += hit.dz; const vn = b.vx * hit.nx + b.vz * hit.nz;
    if (vn < 0) { b.vx -= vn * 1.4 * hit.nx; b.vz -= vn * 1.4 * hit.nz; if (vn < -5) { sparks(b.x + s2 * off, 0.8, b.z + c2 * off, 5); damageBoat(b, -vn * 4); if (b === G.p.car) { G.shake = Math.max(G.shake, 0.4); sfx.crash(-vn); } } }
  }
  b.hitT = Math.max(0, b.hitT - dt);
  // buoyancy bob, bow lift with speed, roll into turns
  const tt = G.time + b.ph, sp = Math.abs(vF), m = b.mesh;
  m.position.set(b.x, 0.12 + Math.sin(tt * 2.1) * 0.1 + Math.min(0.35, sp * 0.012), b.z); m.rotation.order = 'YXZ'; m.rotation.y = b.heading;
  m.rotation.x = -Math.min(0.14, sp * 0.0045) + Math.sin(tt * 1.6) * 0.025; m.rotation.z = clamp(b.steerA * sp * 0.012, -0.22, 0.22) + Math.sin(tt * 1.3) * 0.02;
  if (m.userData.lights) { const on = Math.sin(G.time * 14) > 0; m.userData.lights[0].visible = on; m.userData.lights[1].visible = !on; }
  // bow spray and stern foam
  if (sp > 8 && Math.random() < dt * (sp * 0.9)) for (const sg of [-1, 1]) particle({ x: b.x + s2 * t.len * 0.32 + c2 * sg * t.wid * 0.5, y: 0.5, z: b.z + c2 * t.len * 0.32 - s2 * sg * t.wid * 0.5, vx: c2 * sg * 3 + b.vx * 0.3, vy: 2.5 + Math.random() * 2, vz: -s2 * sg * 3 + b.vz * 0.3, g: 9, life: 0.6, size: 0.7, grow: 1.4, color: 0xffffff, hdr: 1.4, op: 0.9 });
  if (sp > 5 && Math.random() < dt * sp * 0.6) particle({ x: b.x - s2 * t.len * 0.55, y: 0.35, z: b.z - c2 * t.len * 0.55, vx: (Math.random() - .5) * 2, vy: 1.2, vz: (Math.random() - .5) * 2, g: 4, life: 0.8, size: 1.0, grow: 1.8, color: 0xffffff, hdr: 1.3, op: 0.8 });
  updateWake(b, dt, sp);
}
// the wake: a ribbon of stern positions that widens and fades with age
function updateWake(b, dt, sp) {
  b.trailT -= dt; const sn = Math.sin(b.heading), cs = Math.cos(b.heading);
  if (b.trailT <= 0) { b.trailT = 0.07; b.trail.unshift({ x: b.x - sn * b.type.len * 0.5, z: b.z - cs * b.type.len * 0.5, sn, cs, a: Math.min(1, sp / 14) }); if (b.trail.length > WAKE_N) b.trail.length = WAKE_N; }
  else if (b.trail.length) { const h = b.trail[0]; h.x = b.x - sn * b.type.len * 0.5; h.z = b.z - cs * b.type.len * 0.5; h.sn = sn; h.cs = cs; h.a = Math.min(1, sp / 14); }
  const pos = b.wake.geometry.attributes.position.array, col = b.wake.geometry.attributes.color.array;
  for (let k = 0; k < WAKE_N; k++) {
    const q = b.trail[Math.min(k, b.trail.length - 1)] || { x: b.x, z: b.z, sn, cs, a: 0 }, u = k / (WAKE_N - 1), w = b.type.wid * 0.45 + u * 9, al = k < b.trail.length ? q.a * (1 - u) * 0.85 : 0;
    for (let s = 0; s < 2; s++) { const sg = s ? 1 : -1, o = (k * 2 + s); pos[o * 3] = q.x + q.cs * sg * w; pos[o * 3 + 1] = 0.09; pos[o * 3 + 2] = q.z - q.sn * sg * w; col[o * 4] = col[o * 4 + 1] = col[o * 4 + 2] = 1.5; col[o * 4 + 3] = Math.min(1, al * 1.2); }
  }
  b.wake.geometry.attributes.position.needsUpdate = true; b.wake.geometry.attributes.color.needsUpdate = true;
}
function boatCollisions() {
  const bs = G.boats;
  for (let a = 0; a < bs.length; a++) for (let c = a + 1; c < bs.length; c++) {
    const A = bs[a], B = bs[c]; if (A.dead || B.dead) continue; const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz), lim = (A.type.len + B.type.len) * 0.3; if (d >= lim || d < 1e-3) continue;
    const nx = dx / d, nz = dz / d, pen = lim - d; A.x -= nx * pen / 2; A.z -= nz * pen / 2; B.x += nx * pen / 2; B.z += nz * pen / 2;
    const rv = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz; if (rv >= 0) continue; const j = -rv * 0.65;
    A.vx -= nx * j; A.vz -= nz * j; B.vx += nx * j; B.vz += nz * j;
    if (-rv > 4) { sparks((A.x + B.x) / 2, 1, (A.z + B.z) / 2, 6); damageBoat(A, -rv * 5); damageBoat(B, -rv * 5); if (A === G.p.car || B === G.p.car) { G.shake = Math.max(G.shake, 0.45); sfx.crash(-rv); } }
  }
}
export function updateBoats(dt) { for (const b of G.boats.slice()) stepBoat(b, dt); boatCollisions(); }
export function clearBoats() { for (const b of G.boats.slice()) if (b !== G.p.car) removeBoat(b); }

// Boats: the Skipjack speedboat and the SBPD harbour launches. Arcade water physics (thrust, drag, sideways slide,
// a buoyant bob and bow lift), a white wake ribbon and bow spray, boat-on-boat ramming, the launches' pursuit AI,
// and stepping aboard or ashore at a dock. A boat carries the same fields as a car (x, z, heading, speed, input,
// type, hp), so the camera, HUD and markers treat the one Nico drives like any other vehicle.
import * as THREE from 'three';
import { G, notify } from '../core/gameState.js';
import { clamp, wrapAngle } from '../core/config.js';
import { particle, sparks, explosion, fire } from '../combat/effects.js';
import { sfx } from '../audio/soundEngine.js';
import { waterBlock, dockSpotNear } from '../world/marina.js';
import { buildCharacter, STYLES } from '../characters/characterModel.js';

export const BOAT_TYPES = {
  skipjack: { name: 'Skipjack 28', len: 7.6, wid: 2.7, max: 36, acc: 15, turn: 1.35, hp: 420, hull: 0xfaf6ee, stripe: 0xe8604c, deck: 0x2fb8a8 },
  patrol: { name: 'SBPD Harbour Launch', len: 9, wid: 3.1, max: 31, acc: 13, turn: 1.05, hp: 380, hull: 0xf4f6f8, stripe: 0x1d4fa0, deck: 0x2a3440, police: true },
};

if (!G.boats) G.boats = [];

const WAKE_POINTS = 44; // stern samples in the wake ribbon
const WAKE_SAMPLE = 0.07; // seconds between samples
const SINK_SECONDS = 4;
let nextLaunchNumber = 1;
let wakeMaterial = null;

// ---- model ----

// Deck plan: square stern, straight sides, curving in to a pointed bow at +z.
function deckOutline(len, wid) {
  const halfL = len / 2, halfW = wid / 2;
  const outline = new THREE.Shape();
  outline.moveTo(-halfW, -halfL);
  outline.lineTo(halfW, -halfL);
  outline.lineTo(halfW, halfL * 0.25);
  outline.quadraticCurveTo(halfW * 0.9, halfL * 0.8, 0, halfL);
  outline.quadraticCurveTo(-halfW * 0.9, halfL * 0.8, -halfW, halfL * 0.25);
  outline.closePath();
  return outline;
}

function buildBoatModel(key) {
  const spec = BOAT_TYPES[key];
  const root = new THREE.Group();
  const paint = (colour) => new THREE.MeshLambertMaterial({ color: colour });

  // the deck outline extruded `thick` deep and laid flat (it hangs down from y + thick, so it spans y..y + thick)
  const slab = (outline, thick, y, material, spread = 1) => {
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: thick, bevelEnabled: false });
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y + thick;
    mesh.scale.set(spread, 1, spread);
    root.add(mesh);
    return mesh;
  };
  const block = (w, h, d, x, y, z, look, tilt = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof look === 'number' ? paint(look) : look);
    mesh.position.set(x, y, z);
    mesh.rotation.x = tilt;
    root.add(mesh);
    return mesh;
  };

  slab(deckOutline(spec.len, spec.wid), 1.0, -0.45, paint(spec.hull)).castShadow = true; // hull
  slab(deckOutline(spec.len, spec.wid), 0.22, 0.12, paint(spec.stripe), 1.02); // rub stripe
  slab(deckOutline(spec.len * 0.92, spec.wid * 0.86), 0.06, 0.55, paint(spec.deck)); // deck
  block(0.7, 0.9, 0.9, 0, 0.6, -spec.len / 2 - 0.2, 0x22262c); // outboard

  if (spec.police) {
    block(spec.wid * 0.7, 1.4, 2.6, 0, 1.3, -0.2, 0xf2f2f2); // wheelhouse
    block(spec.wid * 0.72, 0.5, 2.62, 0, 1.6, -0.2, 0x1f4f5c); // its windows
    root.userData.lights = [
      block(0.7, 0.3, 0.4, -0.45, 2.15, -0.2, new THREE.MeshBasicMaterial({ color: 0xff2030 })),
      block(0.7, 0.3, 0.4, 0.45, 2.15, -0.2, new THREE.MeshBasicMaterial({ color: 0x2060ff })),
    ];
    return root;
  }
  block(spec.wid * 0.8, 0.7, 0.12, 0, 1.0, 0.6, new THREE.MeshLambertMaterial({ color: 0x9fd8e8, transparent: true, opacity: 0.55 }), -0.5); // windscreen
  block(1.0, 0.5, 0.9, 0, 0.8, -0.8, 0xf6ead2); // helm console
  block(spec.wid * 0.84, 0.35, 1.1, 0, 0.75, -2.4, 0xf6ead2); // stern bench
  const helmsman = buildCharacter(STYLES.nico); // shown only while Nico drives
  helmsman.scale.setScalar(0.92);
  helmsman.position.set(0, 0.2, -0.3);
  helmsman.visible = false;
  root.add(helmsman);
  root.userData.driver = helmsman;
  return root;
}

// The wake: a triangle strip with two vertices per stern sample, coloured per vertex (RGBA) so it can fade out.
function buildWake() {
  if (!wakeMaterial) {
    wakeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WAKE_POINTS * 2 * 3), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(WAKE_POINTS * 2 * 4), 4));
  const strip = [];
  for (let i = 0; i < WAKE_POINTS - 1; i++) {
    const v = i * 2;
    strip.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
  }
  geometry.setIndex(strip);
  const mesh = new THREE.Mesh(geometry, wakeMaterial);
  mesh.frustumCulled = false;
  G.scene.add(mesh);
  return mesh;
}

// ---- lifecycle ----

export function createBoat(key, x, z, heading, kind = 'moored') {
  const type = BOAT_TYPES[key];
  const mesh = buildBoatModel(key);
  const boat = {
    isBoat: true, key, type, mesh,
    x, z, y: 0, heading, vx: 0, vz: 0, speed: 0, lat: 0, steerA: 0,
    hp: type.hp, maxHp: type.hp,
    input: { throttle: 0, brake: 0, steer: 0, hand: 0 },
    driver: null, kind, dead: false, hitT: 0,
    ph: Math.random() * 6, // bob phase, so moored boats do not bob in step
    trail: [], trailT: 0, wake: buildWake(),
  };
  if (type.police) {
    boat.callsign = `HL-${nextLaunchNumber++}`; // short enough for the SBPD RESPONSE row
    boat.ai = 'PURSUIT';
  }
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  G.scene.add(mesh);
  G.boats.push(boat);
  return boat;
}

export function removeBoat(b) {
  b.mesh.removeFromParent();
  b.wake.removeFromParent();
  b.wake.geometry.dispose();
  G.boats = G.boats.filter((other) => other !== b);
}

export function sinkBoat(b) {
  if (b.dead) return;
  b.dead = true;
  b.hp = 0;
  explosion(b.x, 1, b.z);
  sfx.explosion();
  b.sinkT = SINK_SECONDS;
  if (b === G.p.car) exitBoat(true);
}

export function damageBoat(b, amt) {
  if (b.dead) return;
  b.hp -= amt;
  b.hitT = 3;
  if (b.hp <= 0) sinkBoat(b);
}

// ---- boarding ----

/** Closest boat within r that Nico could take (not sunk, not crewed by the police). */
export function nearestBoat(x, z, r = 5.5) {
  let pick = null;
  let pickDist = r;
  for (const boat of G.boats) {
    if (boat.dead || boat.driver === 'ai') continue;
    const dist = Math.hypot(boat.x - x, boat.z - z);
    if (dist < pickDist) { pickDist = dist; pick = boat; }
  }
  return pick;
}

export function enterBoat(b) {
  const player = G.p;
  b.kind = 'player';
  b.driver = 'player';
  player.car = b;
  player.hidden = true;
  player.mesh.visible = false;
  if (b.mesh.userData.driver) b.mesh.userData.driver.visible = true;
  sfx.click();
}

/** Step ashore, only beside a pier or jetty (or, forced when the boat goes down, onto the nearest dock). */
export function exitBoat(forced) {
  const player = G.p;
  const boat = player.car;
  if (!boat?.isBoat) return false;
  const spot = dockSpotNear(boat.x, boat.z, forced ? 1e4 : 6.5);
  if (!spot) {
    notify('No dock here: steer alongside a pier to step off', 'bad');
    return false;
  }
  boat.kind = boat.dead ? 'wreck' : 'moored';
  boat.driver = null;
  boat.input.throttle = 0;
  boat.input.brake = 0;
  boat.input.steer = 0;
  if (boat.mesh.userData.driver) boat.mesh.userData.driver.visible = false;
  player.car = null;
  player.hidden = false;
  player.mesh.visible = true;
  player.x = spot.x;
  player.z = spot.z;
  player.yaw = boat.heading;
  G.cam.yaw = boat.heading + Math.PI;
  G.cam.pitch = 0.2;
  sfx.click();
  return true;
}

// ---- AI ----

// SBPD launch: steer for where the target will be, full throttle when roughly facing it, swerve off obstacles,
// a catch-up boost when far behind, and ram when close.
function launchHelm(boat) {
  const target = G.p.car?.isBoat ? G.p.car : null;
  const helm = boat.input;
  if (!target) {
    helm.throttle = 0.2; // idle circling
    helm.steer = 0.3;
    return;
  }
  const lead = clamp(Math.hypot(target.x - boat.x, target.z - boat.z) / 30, 0, 1.2);
  const aimX = target.x + target.vx * lead;
  const aimZ = target.z + target.vz * lead;
  const offCourse = wrapAngle(Math.atan2(aimX - boat.x, aimZ - boat.z) - boat.heading);
  helm.steer = clamp(offCourse * 2.2, -1, 1);
  helm.throttle = Math.abs(offCourse) < 1.4 ? 1 : 0.5;
  const sinH = Math.sin(boat.heading), cosH = Math.cos(boat.heading);
  const ahead = waterBlock(boat.x + sinH * 9, boat.z + cosH * 9, 2);
  if (ahead) helm.steer = ahead.nx * cosH - ahead.nz * sinH > 0 ? 1 : -1;
  const gap = Math.hypot(target.x - boat.x, target.z - boat.z);
  boat.pmax = gap > 60 ? 1.15 : 1;
  boat.ai = gap < 16 ? 'RAMMING' : 'PURSUIT';
}

// ---- physics ----

function sinkStep(boat, dt) {
  boat.sinkT -= dt;
  boat.mesh.position.y -= dt * 0.6;
  boat.mesh.rotation.z += dt * 0.1;
  if (Math.random() < dt * 8) {
    particle({ x: boat.x, y: 1, z: boat.z, vy: 2.5, life: 1.6, size: 1.6, grow: 3, color: 0x2a2a2a, op: 0.6, tex: 'puff' });
  }
  if (boat.sinkT > 1.5 && Math.random() < dt * 14) fire(boat.x, 1.2, boat.z); // the holed fuel tank burns on the water
  if (boat.sinkT < 0 && boat !== G.p.car) removeBoat(boat);
}

// Bow and stern probes against piers, the shore and the Causeway: push out, bounce, and take damage on a hard hit.
function bumpObstacles(boat, sinH, cosH) {
  const spec = boat.type;
  for (const reach of [spec.len * 0.35, -spec.len * 0.3]) {
    const px = boat.x + sinH * reach, pz = boat.z + cosH * reach;
    const hit = waterBlock(px, pz, spec.wid / 2 + 0.2);
    if (!hit) continue;
    boat.x += hit.dx;
    boat.z += hit.dz;
    const into = boat.vx * hit.nx + boat.vz * hit.nz;
    if (into >= 0) continue;
    boat.vx -= into * 1.4 * hit.nx;
    boat.vz -= into * 1.4 * hit.nz;
    if (into >= -5) continue;
    sparks(boat.x + sinH * reach, 0.8, boat.z + cosH * reach, 5); // where the probe sits after the push-out
    damageBoat(boat, -into * 4);
    if (boat === G.p.car) {
      G.shake = Math.max(G.shake, 0.4);
      sfx.crash(-into);
    }
  }
}

// Buoyant bob, bow lift with speed, a roll into turns, and the police light flash.
function poseModel(boat, speed) {
  const phase = G.time + boat.ph;
  const model = boat.mesh;
  model.position.set(boat.x, 0.12 + Math.sin(phase * 2.1) * 0.1 + Math.min(0.35, speed * 0.012), boat.z);
  model.rotation.order = 'YXZ';
  model.rotation.y = boat.heading;
  model.rotation.x = -Math.min(0.14, speed * 0.0045) + Math.sin(phase * 1.6) * 0.025;
  model.rotation.z = clamp(boat.steerA * speed * 0.012, -0.22, 0.22) + Math.sin(phase * 1.3) * 0.02;
  const lights = model.userData.lights;
  if (lights) {
    const redPhase = Math.sin(G.time * 14) > 0;
    lights[0].visible = redPhase;
    lights[1].visible = !redPhase;
  }
}

function sprayAndFoam(boat, dt, speed, sinH, cosH) {
  const spec = boat.type;
  if (speed > 8 && Math.random() < dt * (speed * 0.9)) {
    for (const side of [-1, 1]) {
      particle({
        x: boat.x + sinH * spec.len * 0.32 + cosH * side * spec.wid * 0.5, y: 0.5,
        z: boat.z + cosH * spec.len * 0.32 - sinH * side * spec.wid * 0.5,
        vx: cosH * side * 3 + boat.vx * 0.3, vy: 2.5 + Math.random() * 2, vz: -sinH * side * 3 + boat.vz * 0.3,
        g: 9, life: 0.6, size: 0.7, grow: 1.4, color: 0xffffff, hdr: 1.4, op: 0.9,
      });
    }
  }
  if (speed > 5 && Math.random() < dt * speed * 0.6) {
    particle({
      x: boat.x - sinH * spec.len * 0.55, y: 0.35, z: boat.z - cosH * spec.len * 0.55,
      vx: (Math.random() - 0.5) * 2, vy: 1.2, vz: (Math.random() - 0.5) * 2,
      g: 4, life: 0.8, size: 1.0, grow: 1.8, color: 0xffffff, hdr: 1.3, op: 0.8,
    });
  }
}

export function stepBoat(b, dt) {
  if (b.dead) { sinkStep(b, dt); return; }
  const spec = b.type;
  const helm = b.input;
  const sin0 = Math.sin(b.heading), cos0 = Math.cos(b.heading);
  let forward = b.vx * sin0 + b.vz * cos0;
  let sideways = b.vx * cos0 - b.vz * sin0;
  if (b.driver === 'ai') launchHelm(b);

  const topSpeed = spec.max * (b.pmax || 1);
  if (helm.throttle > 0) forward += spec.acc * helm.throttle * dt * clamp(1 - Math.max(0, forward) / topSpeed, 0.04, 1);
  if (helm.brake > 0) forward = Math.max(forward - spec.acc * 0.9 * helm.brake * dt, -7);
  forward *= 1 - (helm.throttle ? 0.05 : 0.55) * dt; // water drag, much stronger off the throttle
  sideways *= Math.exp(-(helm.hand ? 0.7 : 2.0) * dt);

  b.steerA += (helm.steer - b.steerA) * Math.min(1, dt * 5);
  const yawRate = b.steerA * spec.turn * clamp(Math.abs(forward) / 9, 0, 1) * Math.sign(forward) * (helm.hand ? 1.35 : 1);
  b.heading += yawRate * dt;
  sideways -= yawRate * forward * 0.06 * dt * 10; // the stern slides out in a hard turn

  const sinH = Math.sin(b.heading), cosH = Math.cos(b.heading);
  b.vx = forward * sinH + sideways * cosH;
  b.vz = forward * cosH - sideways * sinH;
  b.speed = forward;
  b.lat = sideways;
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  bumpObstacles(b, sinH, cosH);
  b.hitT = Math.max(0, b.hitT - dt);

  const speed = Math.abs(forward);
  poseModel(b, speed);
  sprayAndFoam(b, dt, speed, sinH, cosH);
  updateWake(b, dt, speed);
}

// ---- wake ----

function sternSample(boat, sinH, cosH, speed) {
  return {
    x: boat.x - sinH * boat.type.len * 0.5,
    z: boat.z - cosH * boat.type.len * 0.5,
    sn: sinH, cs: cosH,
    a: Math.min(1, speed / 14),
  };
}

// A ribbon through recent stern positions that widens and fades with age; the newest sample tracks the stern.
function updateWake(boat, dt, speed) {
  boat.trailT -= dt;
  const sinH = Math.sin(boat.heading), cosH = Math.cos(boat.heading);
  if (boat.trailT <= 0) {
    boat.trailT = WAKE_SAMPLE;
    boat.trail.unshift(sternSample(boat, sinH, cosH, speed));
    if (boat.trail.length > WAKE_POINTS) boat.trail.length = WAKE_POINTS;
  } else if (boat.trail.length) {
    Object.assign(boat.trail[0], sternSample(boat, sinH, cosH, speed));
  }

  const attrs = boat.wake.geometry.attributes;
  const pos = attrs.position.array;
  const col = attrs.color.array;
  const count = boat.trail.length;
  for (let k = 0; k < WAKE_POINTS; k++) {
    const sample = boat.trail[Math.min(k, count - 1)] || { x: boat.x, z: boat.z, sn: sinH, cs: cosH, a: 0 };
    const age = k / (WAKE_POINTS - 1);
    const halfWidth = boat.type.wid * 0.45 + age * 9;
    const alpha = k < count ? sample.a * (1 - age) * 0.85 : 0;
    for (const [s, side] of [[0, -1], [1, 1]]) {
      const v = k * 2 + s;
      pos[v * 3] = sample.x + sample.cs * side * halfWidth;
      pos[v * 3 + 1] = 0.09;
      pos[v * 3 + 2] = sample.z - sample.sn * side * halfWidth;
      col[v * 4] = 1.5; // HDR white foam
      col[v * 4 + 1] = 1.5;
      col[v * 4 + 2] = 1.5;
      col[v * 4 + 3] = Math.min(1, alpha * 1.2);
    }
  }
  attrs.position.needsUpdate = true;
  attrs.color.needsUpdate = true;
}

// ---- boat-on-boat ----

function collidePair(a, b) {
  if (a.dead || b.dead) return;
  const dx = b.x - a.x, dz = b.z - a.z;
  const gap = Math.hypot(dx, dz);
  const reach = (a.type.len + b.type.len) * 0.3;
  if (gap >= reach || gap < 1e-3) return;
  const nx = dx / gap, nz = dz / gap;
  const half = (reach - gap) / 2;
  a.x -= nx * half;
  a.z -= nz * half;
  b.x += nx * half;
  b.z += nz * half;
  const closing = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (closing >= 0) return;
  const impulse = -closing * 0.65;
  a.vx -= nx * impulse;
  a.vz -= nz * impulse;
  b.vx += nx * impulse;
  b.vz += nz * impulse;
  if (-closing <= 4) return;
  sparks((a.x + b.x) / 2, 1, (a.z + b.z) / 2, 6);
  damageBoat(a, -closing * 5);
  damageBoat(b, -closing * 5);
  if (a === G.p.car || b === G.p.car) {
    G.shake = Math.max(G.shake, 0.45);
    sfx.crash(-closing);
  }
}

function boatCollisions() {
  const fleet = G.boats;
  for (let i = 0; i < fleet.length; i++) {
    for (let j = i + 1; j < fleet.length; j++) collidePair(fleet[i], fleet[j]);
  }
}

export function updateBoats(dt) {
  for (const boat of [...G.boats]) stepBoat(boat, dt);
  boatCollisions();
}

export function clearBoats() {
  for (const boat of [...G.boats]) {
    if (boat !== G.p.car) removeBoat(boat);
  }
}

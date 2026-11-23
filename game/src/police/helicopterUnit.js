// AIR-1, the SBPD helicopter that joins the chase at 4+ stars: it circles the player and sweeps a nose searchlight.
import * as THREE from 'three';
import { G } from '../core/gameState.js';

// The model is shaped to read as a helicopter even at thumbnail size: a slim egg cabin with a glass canopy,
// a long tapered tail boom with a swept fin and tail rotor, skids, a pale spinning rotor disc, SBPD white with
// a teal belt and a coral tail band, and a searchlight under the nose where the light cone starts.
const NOSE_LAMP = new THREE.Vector3(0, -0.82, 1.5);
const UP = new THREE.Vector3(0, 1, 0);
const HALF_TURN = Math.PI / 2;

const ORBIT_RADIUS = 28;
const ORBIT_RATE = 0.35; // rad/s around the target
const CRUISE_HEIGHT = 40;
const CLIMB_AWAY = 8; // m/s climb when the heat drops
const GONE_HEIGHT = 150;

function paints() {
  const lambert = (color, emissive) => new THREE.MeshLambertMaterial(emissive === undefined ? { color } : { color, emissive });
  const hdr = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
  const veil = (color, opacity, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, ...extra });
  return {
    hull: lambert(0xf4f6f0, 0x7e8886),
    canopy: lambert(0x2a7f96, 0x123848),
    metal: lambert(0x262e32),
    belt: lambert(0x18c8b8, 0x0c6a62),
    band: lambert(0xff5a48, 0x80241c),
    lamp: hdr(3, 3.4, 3.8),
    portLight: hdr(3, 0.2, 0.2),
    starboardLight: hdr(0.2, 3, 0.6),
    tailBlur: veil(0xd8dee0, 0.3),
    rotorBlur: veil(0xe6eef0, 0.2),
    rotorRim: veil(0x3a4548, 0.35),
    blade: new THREE.MeshBasicMaterial({ color: 0x1c2224, transparent: true, opacity: 0.7 }),
  };
}

// Body parts: [geometry builder, paint, position, rotation (x, y, z) or null, scale or null].
const BODY_PARTS = [
  // cabin egg and the canopy bubble over its front half
  [() => new THREE.SphereGeometry(1, 14, 10), 'hull', [0, 0, 0.2], null, [0.95, 0.98, 2.0]],
  [() => new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.36).rotateX(1.05), 'canopy', [0, 0.02, 0.2], null, [0.98, 1.0, 2.03]],
  // teal belt and the engine hump
  [() => new THREE.CylinderGeometry(1, 1, 0.3, 20, 1, true), 'belt', [0, -0.18, 0.2], null, [0.95, 1, 1.98]],
  [() => new THREE.BoxGeometry(0.9, 0.5, 1.6), 'hull', [0, 0.98, -0.45]],
  // tail boom with its coral band, the swept fin and its coral tip, and the stabiliser
  [() => new THREE.CylinderGeometry(0.13, 0.36, 5.4, 10).rotateX(HALF_TURN), 'hull', [0, 0.35, -4.2]],
  [() => new THREE.CylinderGeometry(0.27, 0.31, 0.5, 10, 1, true).rotateX(HALF_TURN), 'band', [0, 0.35, -3.0]],
  [() => new THREE.BoxGeometry(0.1, 1.5, 0.75), 'hull', [0, 0.95, -6.75], [-0.45, 0, 0]],
  [() => new THREE.BoxGeometry(0.11, 0.4, 0.76), 'band', [0, 1.45, -7.0], [-0.45, 0, 0]],
  [() => new THREE.BoxGeometry(1.6, 0.07, 0.45), 'hull', [0, 0.35, -6.1]],
  // rotor mast
  [() => new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), 'metal', [0, 1.38, -0.2]],
  // searchlight housing and its glowing lens, then the tail running lights
  [() => new THREE.CylinderGeometry(0.22, 0.28, 0.3, 12), 'metal', [NOSE_LAMP.x, NOSE_LAMP.y + 0.15, NOSE_LAMP.z]],
  [() => new THREE.CircleGeometry(0.22, 12).rotateX(HALF_TURN), 'lamp', [NOSE_LAMP.x, NOSE_LAMP.y - 0.01, NOSE_LAMP.z]],
  [() => new THREE.SphereGeometry(0.1, 6, 4), 'portLight', [-0.8, 0.35, -6.1]],
  [() => new THREE.SphereGeometry(0.1, 6, 4), 'starboardLight', [0.8, 0.35, -6.1]],
];

function attach(parent, geometry, material, pos, rot, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  parent.add(mesh);
  return mesh;
}

function addSkids(root, paint) {
  for (const side of [-1, 1]) {
    attach(root, new THREE.CylinderGeometry(0.08, 0.08, 3.6, 6).rotateX(HALF_TURN), paint.metal, [side * 1.05, -1.5, 0.1]);
    // the tube turns up at the front
    attach(root, new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6).rotateX(HALF_TURN), paint.metal, [side * 1.05, -1.36, 2.12], [-0.5, 0, 0]);
    for (const strutZ of [-0.7, 0.9]) {
      attach(root, new THREE.BoxGeometry(0.09, 0.8, 0.1), paint.metal, [side * 0.86, -1.15, strutZ], [0, 0, side * 0.5]);
    }
  }
}

function buildTailRotor(root, paint) {
  const hub = new THREE.Group();
  hub.position.set(0.2, 0.95, -6.85);
  root.add(hub);
  for (const spin of [0, HALF_TURN]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 0.16), paint.metal);
    blade.rotation.x = spin;
    hub.add(blade);
  }
  hub.add(new THREE.Mesh(new THREE.CircleGeometry(0.85, 18).rotateY(HALF_TURN), paint.tailBlur));
  return hub;
}

function buildMainRotor(root, paint) {
  const hub = new THREE.Group();
  hub.position.set(0, 1.62, -0.2);
  root.add(hub);
  for (const spin of [0, HALF_TURN]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.06, 0.32), paint.blade);
    blade.rotation.y = spin;
    hub.add(blade);
  }
  // the blur disc with a darker rim, so the spinning rotor reads as a disc (both fixed to the airframe)
  attach(root, new THREE.CircleGeometry(5.2, 40).rotateX(-HALF_TURN), paint.rotorBlur, [0, 1.6, -0.2]);
  attach(root, new THREE.RingGeometry(4.85, 5.2, 48).rotateX(-HALF_TURN), paint.rotorRim, [0, 1.61, -0.2]);
  return hub;
}

function buildSearchBeam() {
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(1, 1, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  // the cool pool of light on the ground at the cone's base (HDR colour so it blooms through the warm grade)
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28).rotateX(-HALF_TURN),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.4, 1.9, 2.3), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    }),
  );
  pool.position.y = -0.5;
  pool.scale.set(0.95, 1, 0.95);
  beam.add(pool);
  return beam;
}

export function createHeli(x, z) {
  const paint = paints();
  const airframe = new THREE.Group();
  for (const [makeGeometry, paintKey, pos, rot, scale] of BODY_PARTS) {
    attach(airframe, makeGeometry(), paint[paintKey], pos, rot, scale);
  }
  const tailRotor = buildTailRotor(airframe, paint);
  addSkids(airframe, paint);
  const rotor = buildMainRotor(airframe, paint);
  const cone = buildSearchBeam();
  G.scene.add(airframe, cone);
  return { x, z, y: CRUISE_HEIGHT, ang: Math.random() * 6, mesh: airframe, rotor, tailRotor, cone };
}

function despawn(heli) {
  heli.mesh.removeFromParent();
  heli.cone.removeFromParent();
  G.heli = null;
}

export function updateHeli(dt) {
  const stars = G.wanted.stars;
  const player = G.p;
  const car = player.car;
  const targetX = car ? car.x : player.x;
  const targetZ = car ? car.z : player.z;
  if (stars >= 4 && !G.heli) G.heli = createHeli(targetX + 120, targetZ + 60);
  const heli = G.heli;
  if (!heli) return;

  // Heat below four stars: climb out of the chase, leaving for good when high enough or the heat is gone.
  if (stars < 4 && !G.shotLock) {
    heli.y += dt * CLIMB_AWAY;
    if (heli.y > GONE_HEIGHT || G.wanted.stars === 0) { despawn(heli); return; }
  }

  // Orbit the target, leading a moving car a little.
  heli.ang += dt * ORBIT_RATE;
  const aimX = targetX + Math.cos(heli.ang) * ORBIT_RADIUS + (car ? car.vx * 1.2 : 0);
  const aimZ = targetZ + Math.sin(heli.ang) * ORBIT_RADIUS + (car ? car.vz * 1.2 : 0);
  const ease = Math.min(1, dt * 1.2);
  const prevX = heli.x, prevZ = heli.z;
  heli.x += (aimX - heli.x) * ease;
  heli.z += (aimZ - heli.z) * ease;

  const body = heli.mesh;
  body.position.set(heli.x, heli.y, heli.z);
  body.rotation.y = Math.atan2(heli.x - prevX, heli.z - prevZ) || body.rotation.y; // nose along the flight path
  body.rotation.z = 0.12;
  heli.rotor.rotation.y += dt * 40;
  heli.tailRotor.rotation.x += dt * 60;
  placeCone(heli, targetX, targetZ);
}

/** Stretch the searchlight cone from the nose lamp (in world space) down to the target point. */
export function placeCone(h, tx, tz, ty = 0) {
  h.mesh.updateMatrixWorld();
  const lamp = h.mesh.localToWorld(NOSE_LAMP.clone());
  const reach = new THREE.Vector3(tx - lamp.x, ty - lamp.y, tz - lamp.z);
  const length = reach.length();
  h.cone.position.copy(lamp).addScaledVector(reach, 0.5);
  // the cone's apex points +Y; turn it so the apex sits at the lamp and the base on the ground
  h.cone.quaternion.setFromUnitVectors(UP, reach.clone().negate().normalize());
  h.cone.scale.set(5, length, 5);
}

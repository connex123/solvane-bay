// Camera rig: works out where the camera wants to be this frame (title fly-over, chase cam behind a car,
// shoulder cam on foot, staged shot or garage framing), then eases the real camera toward it with screen shake.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { wrapAngle } from '../core/config.js';
import { rayBuildings } from '../world/collision.js';

export const rig = {
  yaw: Math.PI,
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  aerial: { x: 0, y: 150, z: 0, tx: 0, ty: 0, tz: 0 },
  mode: 'auto',
  fov: 60,
};

// The frame the rig is aiming for; filled by one of the framing functions below.
const want = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60 };
const jitter = new THREE.Vector3();

// Exponential ease: the share of the remaining gap to close this frame at a given rate per second.
const ease = (rate, dt) => 1 - Math.exp(-rate * dt);

const CHASE = { baseDist: 6.6, perLen: 0.25, speedDist: 0.03, maxSpeedDist: 1.5, height: 3.4, speedLift: 0.03, maxLift: 1.3, lookAhead: 5, lookHeight: 1.3, yawRate: 4.5 };
const SHOULDER = { dist: 3.8, side: 0.5, aimSide: 0.9, eye: 1.6, minDist: 0.8, wallGap: 0.4, floor: 0.5 };

function placeAerial(cam) {
  const a = rig.aerial;
  cam.position.set(a.x, a.y, a.z);
  cam.lookAt(a.tx, a.ty, a.tz);
  cam.fov = 50;
  cam.updateProjectionMatrix();
}

function frameChase(car, dt, snap) {
  const speed = Math.hypot(car.vx, car.vz);
  // Above walking pace the camera leans a little toward where the car is actually travelling (shows drifts).
  const aimYaw = Math.abs(car.speed) > 6 ? 0.65 * car.heading + 0.35 * Math.atan2(car.vx, car.vz) : car.heading;
  rig.yaw += wrapAngle(aimYaw - rig.yaw) * (snap ? 1 : Math.min(1, CHASE.yawRate * dt));

  const dirX = Math.sin(rig.yaw), dirZ = Math.cos(rig.yaw), ground = car.y || 0;
  const back = CHASE.baseDist + car.type.len * CHASE.perLen + Math.min(CHASE.maxSpeedDist, speed * CHASE.speedDist);
  const up = CHASE.height + Math.min(CHASE.maxLift, speed * CHASE.speedLift);
  want.pos.set(car.x - dirX * back, ground + up, car.z - dirZ * back);
  want.look.set(car.x + dirX * CHASE.lookAhead, ground + CHASE.lookHeight, car.z + dirZ * CHASE.lookAhead);
  want.fov = 58 + Math.min(14, speed * 0.34) + 8 * (G.fovKick || 0);

  const shot = G.shotCam;
  if (!shot) return;
  if (shot.pos) {
    want.pos.set(...shot.pos); want.look.set(...shot.look);
  } else {
    const side = shot.side || 0;
    want.pos.set(car.x - dirX * shot.d - dirZ * side, shot.h, car.z - dirZ * shot.d + dirX * side);
    want.look.set(car.x + dirX * shot.ahead, shot.ly, car.z + dirZ * shot.ahead);
  }
  want.fov = shot.fov;
}

function frameOnFoot(p) {
  const { yaw, pitch } = G.cam, aiming = !!p.aim;
  const flat = Math.cos(pitch);
  const fwd = { x: Math.sin(yaw) * flat, y: -Math.sin(pitch), z: Math.cos(yaw) * flat };
  const side = aiming ? SHOULDER.aimSide : SHOULDER.side;
  // Pivot sits over the right shoulder.
  const px = p.x - Math.cos(yaw) * side, py = SHOULDER.eye + (p.y || 0), pz = p.z + Math.sin(yaw) * side;
  const reach = aiming ? (G.camDistAim || 2.6) : SHOULDER.dist;
  const wall = rayBuildings(px, py, pz, -fwd.x, -fwd.y, -fwd.z, reach + SHOULDER.wallGap);
  const back = Math.max(SHOULDER.minDist, Math.min(reach, wall - SHOULDER.wallGap));

  want.pos.set(px - fwd.x * back, Math.max(SHOULDER.floor, py - fwd.y * back), pz - fwd.z * back);
  want.look.set(px + fwd.x * 10, py + fwd.y * 10, pz + fwd.z * 10);
  want.fov = aiming ? 52 : 60;
  rig.yaw = yaw;

  const shot = G.shotCam; // staged on-foot shots frame the scene explicitly
  if (shot?.pos) { want.pos.set(...shot.pos); want.look.set(...shot.look); want.fov = shot.fov; }
}

export function updateCamera(dt, snap = false) {
  const cam = G.camera, p = G.p;
  if (rig.mode === 'aerial') { placeAerial(cam); return; }

  if (p.car) frameChase(p.car, dt, snap);
  else frameOnFoot(p);

  // Wren's garage: hold a fixed view of the car on the lift while the shop is open.
  const garage = G.mode === 'pause' && G.garageCam;
  if (garage) { want.pos.set(...garage.pos); want.look.set(...garage.look); want.fov = garage.fov; snap = true; }

  const follow = snap ? 1 : p.car ? ease(14, dt) : Math.min(1, 1.4 * ease(7, dt));
  cam.position.lerp(want.pos, follow);
  if (G.shake > 0) {
    const s = G.shake;
    cam.position.add(jitter.set((Math.random() - 0.5) * s * 0.5, (Math.random() - 0.5) * s * 0.4, (Math.random() - 0.5) * s * 0.5));
  }
  rig.pos.copy(cam.position);

  rig.look.lerp(want.look, snap ? 1 : ease(12, dt));
  cam.lookAt(rig.look);
  if (G.shotCam?.roll) cam.rotateZ(G.shotCam.roll);

  cam.fov += (want.fov - cam.fov) * (snap ? 1 : Math.min(1, 3 * dt));
  rig.fov = cam.fov;
  cam.updateProjectionMatrix();
}

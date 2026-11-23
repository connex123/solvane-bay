// Molotov cocktails. A thrown bottle follows a ballistic lob and bursts into a pool of fire where it lands
// (ground, wall or car). The pool scorches anyone standing in it and sets cars alight; a burning car keeps
// losing health until it blows.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { blockedAt } from '../world/collision.js';
import { damageCar } from '../vehicles/carPhysics.js';
import { fire, smoke, particle } from './effects.js';
import { sfx } from '../audio/soundEngine.js';

export const MOLOTOV = {
  speed: 17, // m/s of throw along the aim
  lift: 5.5, // extra upward m/s for the lob
  gravity: 18,
  poolR: 3.6, // burning pool radius (m)
  poolTime: 7, // seconds a pool burns
  carBurn: 8, // seconds a car keeps burning once lit
  burnDps: 85, // damage per second to a burning car
  poolCarDps: 140, // damage per second to a car standing in a pool
};

const MAX_FLIGHT = 4; // seconds before a bottle bursts wherever it is
const POOL_TICK = 0.25; // seconds between pool damage ticks on people
const MAX_CARRIED = 10;

const inFlight = [];
const pools = [];
let bottleLook = null;
let glow = null; // a single warm light parked over the newest pool

function spawnBottleMesh() {
  if (!bottleLook) {
    bottleLook = {
      geometry: new THREE.CylinderGeometry(0.07, 0.09, 0.32, 8),
      material: new THREE.MeshStandardMaterial({ color: 0x6a8a3a, roughness: 0.3, emissive: 0xff6a20, emissiveIntensity: 0.25 }),
    };
  }
  const mesh = new THREE.Mesh(bottleLook.geometry, bottleLook.material);
  G.scene.add(mesh);
  return mesh;
}

/** Lob a bottle from Nico's hand along the camera's aim. */
export function throwMolotov(p) {
  const aim = new THREE.Vector3();
  G.camera.getWorldDirection(aim);
  const flat = Math.hypot(aim.x, aim.z) || 1;
  const bottle = {
    x: p.x + Math.sin(p.yaw) * 0.6, y: 1.7, z: p.z + Math.cos(p.yaw) * 0.6,
    vx: (aim.x / flat) * MOLOTOV.speed,
    vy: MOLOTOV.lift + aim.y * 10,
    vz: (aim.z / flat) * MOLOTOV.speed,
    mesh: spawnBottleMesh(),
    t: 0,
  };
  inFlight.push(bottle);
  sfx.punch();
  return bottle;
}

const scatter = (span) => (Math.random() - 0.5) * span;

function ignite(x, z) {
  pools.push({ x, z, t: MOLOTOV.poolTime, tick: 0 });
  sfx.shot('shotgun');
  G.shake = Math.max(G.shake, 0.2);
  for (let i = 0; i < 10; i++) fire(x + scatter(3), 0.3, z + scatter(3));
  particle({ x, y: 0.6, z, life: 0.4, size: 5, color: 0xffa040, add: true, hdr: 2 });
  G.hooks.crime('shootcar');
}

export const activeFirePools = () => pools.length;

function carStruckBy(bottle) {
  if (bottle.y >= 1.6) return undefined;
  return G.cars.find((car) => !car.dead && car !== G.p.car && Math.hypot(car.x - bottle.x, car.z - bottle.z) < car.type.wid);
}

function flyBottles(dt) {
  for (let i = inFlight.length - 1; i >= 0; i--) {
    const bottle = inFlight[i];
    bottle.t += dt;
    bottle.vy -= MOLOTOV.gravity * dt;
    bottle.x += bottle.vx * dt;
    bottle.y += bottle.vy * dt;
    bottle.z += bottle.vz * dt;
    bottle.mesh.position.set(bottle.x, bottle.y, bottle.z);
    bottle.mesh.rotation.x += dt * 12;
    bottle.mesh.rotation.z += dt * 7;
    if (Math.random() < 0.5) fire(bottle.x, bottle.y + 0.2, bottle.z); // the lit rag

    const car = carStruckBy(bottle);
    const landed = bottle.y <= 0.05 || car || blockedAt(bottle.x, bottle.z) || bottle.t > MAX_FLIGHT;
    if (!landed) continue;
    if (car) car.burnT = MOLOTOV.carBurn;
    ignite(bottle.x, bottle.z);
    bottle.mesh.removeFromParent();
    inFlight.splice(i, 1);
  }
}

function burnPools(dt) {
  for (let i = pools.length - 1; i >= 0; i--) {
    const pool = pools[i];
    pool.t -= dt;
    pool.tick -= dt;
    const radius = MOLOTOV.poolR * Math.min(1, pool.t / 1.5 + 0.3); // shrinks as it dies down
    if (Math.random() < dt * 40) {
      const angle = Math.random() * 6.283;
      const reach = Math.sqrt(Math.random()) * radius;
      fire(pool.x + Math.cos(angle) * reach, 0.15, pool.z + Math.sin(angle) * reach);
    }
    if (Math.random() < dt * 4) smoke(pool.x, 1.5, pool.z, 0x2a2420);

    for (const car of G.cars) {
      if (car.dead) continue;
      if (Math.hypot(car.x - pool.x, car.z - pool.z) >= radius + car.type.wid * 0.6) continue;
      car.burnT = MOLOTOV.carBurn;
      damageCar(car, MOLOTOV.poolCarDps * dt);
    }

    if (pool.tick <= 0) {
      pool.tick = POOL_TICK;
      for (const actor of G.actors) {
        if (!actor.dead && Math.hypot(actor.x - pool.x, actor.z - pool.z) < radius) G.hooks.hitActor(actor, 12, true);
      }
      const me = G.p;
      if (!me.car && Math.hypot(me.x - pool.x, me.z - pool.z) < radius) G.hooks.hurtPlayer(5);
    }
    if (pool.t <= 0) pools.splice(i, 1);
  }
}

function burnCars(dt) {
  for (const car of G.cars) {
    if (!(car.burnT > 0)) continue;
    if (car.dead) { car.burnT = 0; continue; }
    car.burnT -= dt;
    damageCar(car, MOLOTOV.burnDps * dt);
    if (Math.random() < dt * 25) fire(car.x + scatter(1.6), 1.1, car.z + scatter(1.6));
  }
}

function placeGlow() {
  if (!glow) return;
  const newest = pools[pools.length - 1];
  if (!newest) { glow.intensity = 0; return; }
  glow.intensity = 30 + Math.random() * 12;
  glow.position.set(newest.x, 1.6, newest.z);
}

export function updateMolotovs(dt) {
  flyBottles(dt);
  burnPools(dt);
  burnCars(dt);
  placeGlow();
}

// The glow light is created at boot and parked underground: adding a light mid-game would change every
// shader's light count and force a full recompile.
export function initMolotovGlow(scene) {
  glow = new THREE.PointLight(0xff7a30, 0, 16, 1.8);
  glow.position.set(0, -50, 0);
  scene.add(glow);
}

/** Chapter 3's reward: bottles from the Coral Kings' stash and the slot to throw them from. */
export function grantMolotovs(n = 3) {
  const p = G.p;
  p.owned[4] = true;
  p.ammo.molotov = Math.min(MAX_CARRIED, (p.ammo.molotov || 0) + n);
}

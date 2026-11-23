// The street grid: textured asphalt strips along every grid line, a darker square at each junction with zebra
// crossings on all four arms, and the two-phase traffic-light timing.
import * as THREE from 'three';
import { N, S, RW, HALF, lineCoord } from '../core/config.js';
import { asphaltTex } from './textureFactory.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { G } from '../core/gameState.js';

const ROAD_Y = 0.02;
const JUNCTION_GREY = 0x4a4a54;
const PAINT = 0xf2f0e8;
const STRIPE_SPACING = 1.1;
const CROSSING_OFFSET = 8.4; // from the junction centre to the zebra

function laneStrips(scene) {
  const length = N * S + RW;
  const texture = asphaltTex(true);
  texture.repeat.set(length / 16, 1);
  const material = new THREE.MeshLambertMaterial({ map: texture, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  G.roadMat = material;
  const strip = new THREE.PlaneGeometry(length, RW).rotateX(-Math.PI / 2);
  for (let k = 0; k <= N; k++) {
    const eastWest = new THREE.Mesh(strip, material);
    eastWest.position.set(0, ROAD_Y, lineCoord(k));
    const northSouth = new THREE.Mesh(strip, material);
    northSouth.rotation.y = Math.PI / 2;
    northSouth.position.set(lineCoord(k), ROAD_Y, 0);
    for (const road of [eastWest, northSouth]) {
      road.receiveShadow = true;
      scene.add(road);
    }
  }
}

function junction(buf, x, z) {
  pushBox(buf, x, 0, z, RW, 0.05, RW, JUNCTION_GREY);
  for (let stripe = -5; stripe <= 5; stripe++) {
    const along = stripe * STRIPE_SPACING;
    for (const side of [-1, 1]) {
      pushBox(buf, x + along, 0.04, z + side * CROSSING_OFFSET, 0.55, 0.03, 2.4, PAINT); // across the north-south arm
      pushBox(buf, x + side * CROSSING_OFFSET, 0.04, z + along, 2.4, 0.03, 0.55, PAINT); // across the east-west arm
    }
  }
}

export function buildRoads(scene) {
  laneStrips(scene);
  const buf = newBuf();
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) junction(buf, lineCoord(i), lineCoord(j));
  }
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const junctions = new THREE.Mesh(toGeometry(buf), material);
  junctions.receiveShadow = true;
  scene.add(junctions);
}

const CYCLE = 18; // seconds for both phases
const PHASE = CYCLE / 2;
const GREEN_FOR = 7.5; // the rest of each phase is all-red

/** 'green' while traffic along `axis` ('x' or 'z') may cross, otherwise 'red'. */
export function lightState(axis) {
  const t = G.time % CYCLE;
  const greenAxis = t < PHASE ? 'x' : 'z';
  return greenAxis === axis && t % PHASE < GREEN_FOR ? 'green' : 'red';
}

export function inCity(x, z) {
  const edge = HALF + RW;
  return Math.abs(x) <= edge && Math.abs(z) <= edge;
}

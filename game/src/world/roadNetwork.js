// Roads: textured lane strips, intersection squares with zebra crosswalks, and the traffic-light phase.
import * as THREE from 'three';
import { N, S, RW, HALF, lineCoord } from '../core/config.js';
import { asphaltTex } from './textureFactory.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { G } from '../core/gameState.js';

export function buildRoads(scene) {
  const len = N * S + RW, tex = asphaltTex(true); tex.repeat.set(len / 16, 1);
  const mat = new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); G.roadMat = mat;
  const geo = new THREE.PlaneGeometry(len, RW); geo.rotateX(-Math.PI / 2);
  for (let k = 0; k <= N; k++) {
    const a = new THREE.Mesh(geo, mat); a.position.set(0, 0.02, lineCoord(k)); a.receiveShadow = true; scene.add(a);
    const b = new THREE.Mesh(geo, mat); b.rotation.y = Math.PI / 2; b.position.set(lineCoord(k), 0.02, 0); b.receiveShadow = true; scene.add(b);
  }
  const buf = newBuf();
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = lineCoord(i), z = lineCoord(j);
    pushBox(buf, x, 0, z, RW, 0.05, RW, 0x4a4a54);
    for (let s = -5; s <= 5; s++) for (const sg of [-1, 1]) {
      pushBox(buf, x + s * 1.1, 0.04, z + sg * 8.4, 0.55, 0.03, 2.4, 0xf2f0e8); // crosswalk over the z-road
      pushBox(buf, x + sg * 8.4, 0.04, z + s * 1.1, 2.4, 0.03, 0.55, 0xf2f0e8); // crosswalk over the x-road
    }
  }
  const m = new THREE.Mesh(toGeometry(buf), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; scene.add(m);
}
// 'green' for the axis currently allowed to cross; a short all-red gap between phases.
export function lightState(axis) {
  const t = G.time % 18, ph = t < 9 ? 'x' : 'z', into = t % 9;
  return ph === axis && into < 7.5 ? 'green' : 'red';
}
export const inCity = (x, z) => Math.abs(x) <= HALF + RW && Math.abs(z) <= HALF + RW;

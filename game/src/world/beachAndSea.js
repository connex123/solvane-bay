// Ground, beach strip with umbrellas, animated sea, marina piers with boats, distant hills and port cranes.
import * as THREE from 'three';
import { HALF, SEA_X, lineCoord } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { sandTex, waterTex } from './textureFactory.js';

let water;
export function buildBeachAndSea(scene, rng) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x9aa56c }));
  ground.position.y = -0.05; ground.receiveShadow = true; scene.add(ground);
  const st = sandTex(); st.repeat.set(30, 120);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(SEA_X - HALF + 6, 2000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: st }));
  sand.position.set((SEA_X + HALF - 6) / 2, 0.0, 0); sand.receiveShadow = true; scene.add(sand);
  const wt = waterTex(); wt.repeat.set(40, 40); water = wt;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ map: wt, color: 0xbfe8ff, shininess: 90, specular: 0xffb090 }));
  sea.position.set(SEA_X + 1200, -0.2, 0); scene.add(sea);
  const B = newBuf(); // piers, boats, umbrellas, huts, cranes
  for (let k = 0; k < 4; k++) {
    const z = lineCoord(0) + 40 + k * 64; pushBox(B, SEA_X + 4, -0.1, z, 70, 0.6, 4, 0x9a7650);
    for (let b = 0; b < 4; b++) { const bz = z + (b % 2 ? 4.5 : -4.5), bx = SEA_X - 10 + b * 14, c = rng.pick([0xffffff, 0xf4a6a0, 0x8fd3c8, 0xf6e3b4]);
      pushBox(B, bx, 0, bz, 9, 1.3, 3, c); pushBox(B, bx - 1, 1.3, bz, 3, 1.1, 2, 0xf8f8f8); pushBox(B, bx + 1, 1.3, bz, 0.2, 7, 0.2, 0xdddddd); }
  }
  for (let k = 0; k < 26; k++) { const x = HALF + rng.range(10, 36), z = rng.range(-HALF + 20, HALF); const c = rng.pick([0xff5a7a, 0x2fc4b2, 0xffb02e, 0xffffff]);
    pushBox(B, x, 0, z, 0.12, 2.4, 0.12, 0xeeeeee); pushBox(B, x, 2.3, z, 2.8, 0.3, 2.8, c); pushBox(B, x + 2.2, 0.05, z, 0.9, 0.12, 2.0, 0xffe9c0); }
  pushBox(B, HALF + 22, 0, lineCoord(6) + 10, 5, 3, 5, 0xf2f0e8); pushBox(B, HALF + 22, 3, lineCoord(6) + 10, 6, 0.4, 6, 0xff5a7a);
  for (let k = 0; k < 3; k++) { const x = lineCoord(1) + k * 90, z = lineCoord(0) + 20;
    for (const dx of [-8, 8]) pushBox(B, x + dx, 0, z, 1.2, 30, 1.2, 0xe8a030); pushBox(B, x, 28, z, 20, 1.5, 1.5, 0xe8a030); pushBox(B, x, 26, z + 14, 1.5, 1.5, 28, 0xe8a030); }
  const m = new THREE.Mesh(toGeometry(B), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; scene.add(m);
  const hm = new THREE.MeshLambertMaterial({ color: 0x6a4f86, flatShading: true });
  for (let k = 0; k < 14; k++) { const a = Math.PI * (0.55 + k * 0.1), r = 650 + rng() * 150; const c = new THREE.Mesh(new THREE.ConeGeometry(rng.range(90, 170), rng.range(110, 220), 5), hm); c.position.set(Math.cos(a) * r, 40, Math.sin(a) * r); scene.add(c); }
}
export function animateSea(t) { if (water) { water.offset.x = t * 0.004; water.offset.y = t * 0.002; } }

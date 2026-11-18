// Buildings, sidewalks, parks, plazas and container yards: pastel art-deco stucco blocks, glass towers downtown,
// balconies, awnings, rooftop AC units, water tanks and signs; all merged into a handful of static meshes.
import * as THREE from 'three';
import { STUCCO, GLASS } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { addBox } from './collision.js';
import { blocks } from './cityLayout.js';
import { G } from '../core/gameState.js';
import { tileTex } from './textureFactory.js';
import { inst } from '../core/geometryUtils.js';

const PARAMS = { downtown: [2, 2, 36, 110], neon: [2, 2, 12, 24], marina: [2, 2, 8, 16], beach: [2, 2, 8, 14], old: [2, 2, 8, 20], hills: [2, 2, 6, 10] };
const TRIM = [0xffffff, 0xfff6e8, 0xf4fbff];
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
const AWN = [0xff5a7a, 0x2fc4b2, 0xffb02e, 0x7a5cff, 0xff7a3d];
export const lots = [];

export function buildCity(scene, tex, rng) {
  const B = newBuf(), T = newBuf(), D = newBuf(), SL = newBuf(), GR = newBuf(); lots.length = 0; const tanks = [], walks = [];
  for (const b of blocks) {
    pushBox(SL, b.cx, 0, b.cz, 50, 0.25, 50, 0xd6ccbc); walks.push({ x: b.cx, z: b.cz });
    for (const [dx, dz, w, d] of [[-24.8, 0, 0.45, 50], [24.8, 0, 0.45, 50], [0, -24.8, 50, 0.45], [0, 24.8, 50, 0.45]]) pushBox(SL, b.cx + dx, 0, b.cz + dz, w, 0.3, d, 0xf3efe6); // kerbs
    if (b.type === 'park') { pushBox(GR, b.cx, 0.25, b.cz, 44, 0.08, 44, 0x6fae5a); pushBox(GR, b.cx + 8, 0.33, b.cz - 6, 14, 0.05, 11, 0x4a9fc0); continue; }
    if (b.type === 'plaza') { pushBox(SL, b.cx, 0.25, b.cz, 36, 0.1, 36, 0xeadcc4); pushBox(SL, b.cx, 0.35, b.cz, 9, 0.7, 9, 0xb9d6e2); pushBox(GR, b.cx, 1.05, b.cz, 7, 0.1, 7, 0x4ab6d8); continue; }
    if (b.type === 'yard') {
      for (let k = 0; k < 14; k++) { const x = b.cx + rng.range(-19, 19), z = b.cz + rng.range(-19, 19); const st = rng.int(1, 3);
        const c = rng.pick([0xd9503f, 0x2f7fd8, 0xf2c230, 0x3fa56a, 0xe8e8e8, 0xff8a3d]);
        for (let s = 0; s < st; s++) pushBox(B, x, 0.25 + s * 2.6, z, 12, 2.6, 2.8, c);
        addBox({ x0: x - 6, x1: x + 6, z0: z - 1.4, z1: z + 1.4, h: st * 2.6 + .25 }); }
      pushBox(B, b.cx + 12, 0.25, b.cz - 12, 18, 9, 14, 0xc9ccd2, true, rng()); addBox({ x0: b.cx + 3, x1: b.cx + 21, z0: b.cz - 19, z1: b.cz - 5, h: 9 });
      continue;
    }
    const [nx, nz, hmin, hmax] = PARAMS[b.district]; const cw = 45 / nx, cd = 45 / nz;
    for (let a = 0; a < nx; a++) for (let c = 0; c < nz; c++) {
      const x0 = b.cx - 22.5 + a * cw + (a > 0 ? 0.5 : 0), x1 = b.cx - 22.5 + (a + 1) * cw - (a < nx - 1 ? 0.5 : 0);
      const z0 = b.cz - 22.5 + c * cd + (c > 0 ? 0.5 : 0), z1 = b.cz - 22.5 + (c + 1) * cd - (c < nz - 1 ? 0.5 : 0);
      let h = Math.round(rng.range(hmin, hmax) / 2) * 2; if (b.district === 'downtown' && a + c === 1) h *= 0.8;
      const tower = b.district === 'downtown' && h > 40, col = tower ? rng.pick(GLASS) : rng.pick(STUCCO), trim = rng.pick(TRIM);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, uo = rng();
      addBox({ x0, x1, z0, z1, h: h + 0.25 });
      let top = h + 0.25;
      if (tower) { // glass tower: podium, setbacks, crown and spire
        pushBox(D, cx, 0.25, cz, w + 0.6, 6, d + 0.6, 0xe8e4dc);
        pushBox(T, cx, 6.25, cz, w, h - 6, d, col, true, uo);
        for (const f of [0.35, 0.7]) pushBox(D, cx, 0.25 + h * f, cz, w + 0.5, 0.6, d + 0.5, 0xf4f6f8);
        const s1 = rng.range(0.62, 0.8); pushBox(T, cx, top, cz, w * s1, h * 0.18, d * s1, col, true, uo); top += h * 0.18;
        pushBox(D, cx, top, cz, w * s1 + 0.4, 0.8, d * s1 + 0.4, 0xf4f6f8); top += 0.8;
        if (rng() < 0.6) { pushBox(T, cx, top, cz, w * s1 * 0.6, 6, d * s1 * 0.6, col, true, uo); top += 6; }
        pushBox(D, cx, top, cz, 0.6, 12, 0.6, 0xdfe3ea);
      } else {
        pushBox(D, cx, 0.25, cz, w + 0.5, 1.1, d + 0.5, shade(col, 0.72)); // plinth
        pushBox(B, cx, 0.25, cz, w, h, d, col, true, uo);
        pushBox(D, cx, top, cz, w + 0.9, 0.7, d + 0.9, trim); top += 0.7; // cornice
        for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) pushBox(D, px, 0.25, pz, 0.9, h + 1.4, 0.9, trim); // deco pilasters
        if (rng() < 0.55) { pushBox(D, cx, top, cz, w * 0.42, 2.2, 0.8, trim); pushBox(D, cx, top + 2.2, cz, w * 0.22, 1.4, 0.8, trim); } // stepped crown
        if (h >= 10 && b.district !== 'hills') { // balconies with railings on street faces
          const faces = []; if (a === 0) faces.push([-1, 0]); if (a === nx - 1) faces.push([1, 0]); if (c === 0) faces.push([0, -1]); if (c === nz - 1) faces.push([0, 1]);
          for (const [fx, fz] of faces) for (let y = 4.25; y < h - 2; y += 4) for (const o of [-0.25, 0.25]) {
            const bx = fx ? (fx < 0 ? x0 - 0.6 : x1 + 0.6) : cx + o * w, bz = fz ? (fz < 0 ? z0 - 0.6 : z1 + 0.6) : cz + o * d;
            pushBox(D, bx, y, bz, fx ? 1.2 : 3.6, 0.22, fx ? 3.6 : 1.2, trim);
            pushBox(D, bx + fx * 0.55, y + 0.22, bz + fz * 0.55, fx ? 0.08 : 3.6, 0.95, fx ? 3.6 : 0.08, 0xf8f8f8);
          }
        }
        for (let k = 0, n = rng.int(1, 3); k < n; k++) { const ax = cx + rng.range(-w * 0.3, w * 0.3), az = cz + rng.range(-d * 0.3, d * 0.3); pushBox(D, ax, top, az, 2.2, 1.3, 1.6, 0xc4c8ce); pushBox(D, ax, top + 1.3, az, 1.2, 0.15, 1.2, 0x55595f); }
        if (rng() < 0.4) tanks.push({ x: cx + rng.range(-w * 0.25, w * 0.25), y: top, z: cz + rng.range(-d * 0.25, d * 0.25), ry: rng() * 6, s: rng.range(0.8, 1.1) });
      }
      lots.push({ x: cx, z: cz, top, w, d, district: b.district, block: b });
      if (!tower && b.district !== 'downtown') { // striped street-level awnings on the outer faces
        const ac = rng.pick(AWN);
        if (a === 0) pushBox(D, x0 - 1.0, 3.2, cz, 2.4, 0.3, d * 0.7, ac);
        if (a === nx - 1) pushBox(D, x1 + 1.0, 3.2, cz, 2.4, 0.3, d * 0.7, ac);
        if (c === 0) pushBox(D, cx, 3.2, z0 - 1.0, w * 0.7, 0.3, 2.4, ac);
        if (c === nz - 1) pushBox(D, cx, 3.2, z1 + 1.0, w * 0.7, 0.3, 2.4, ac);
      }
    }
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex.facade.map, emissiveMap: tex.facade.em, emissive: 0xffd9a0, emissiveIntensity: 0.6 });
  const gmat = new THREE.MeshPhongMaterial({ vertexColors: true, map: tex.facade.glass, emissiveMap: tex.facade.glassEm, emissive: 0xffd9a0, emissiveIntensity: 0.6, specular: 0xffe0c0, shininess: 90 });
  G.buildingMat = mat; G.glassMat = gmat;
  for (const [buf, m, cast] of [[B, mat, true], [T, gmat, true], [D, new THREE.MeshLambertMaterial({ vertexColors: true }), true], [SL, new THREE.MeshLambertMaterial({ vertexColors: true }), false], [GR, new THREE.MeshLambertMaterial({ vertexColors: true }), false]]) {
    if (!buf.p.length) continue; const mesh = new THREE.Mesh(toGeometry(buf), m); mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh);
  }
  const tt = tileTex(); tt.repeat.set(12, 12); const tg = new THREE.PlaneGeometry(49.2, 49.2).rotateX(-Math.PI / 2); tg.translate(0, 0.27, 0);
  const tiles = inst(tg, new THREE.MeshLambertMaterial({ map: tt }), walks); tiles.receiveShadow = true; scene.add(tiles);
  const tank = new THREE.CylinderGeometry(1.3, 1.3, 2.6, 10); tank.translate(0, 2.9, 0); const roof = new THREE.ConeGeometry(1.45, 0.9, 10); roof.translate(0, 4.6, 0);
  const legs = new THREE.BoxGeometry(2.2, 1.6, 2.2); legs.translate(0, 0.8, 0);
  scene.add(inst(tank, new THREE.MeshLambertMaterial({ color: 0xb08a66 }), tanks), inst(roof, new THREE.MeshLambertMaterial({ color: 0x7a5a44 }), tanks), inst(legs, new THREE.MeshLambertMaterial({ color: 0x5a5e66, wireframe: false }), tanks));
}

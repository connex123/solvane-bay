// Buildings, sidewalks, parks, plazas and container yards: all merged into three static meshes.
import * as THREE from 'three';
import { STUCCO, GLASS } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { addBox } from './collision.js';
import { blocks } from './cityLayout.js';
import { G } from '../core/gameState.js';

const PARAMS = { downtown: [2, 2, 28, 90], neon: [2, 2, 14, 26], marina: [2, 2, 6, 12], beach: [2, 2, 8, 18], old: [2, 2, 8, 18], hills: [2, 2, 6, 10] };
const AWN = [0xff5a7a, 0x2fc4b2, 0xffb02e, 0x7a5cff, 0xff7a3d];
export const lots = [];

export function buildCity(scene, tex, rng) {
  const B = newBuf(), SL = newBuf(), GR = newBuf(); lots.length = 0;
  for (const b of blocks) {
    pushBox(SL, b.cx, 0, b.cz, 50, 0.25, 50, 0xd6ccbc);
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
      const col = b.district === 'downtown' && h > 40 ? rng.pick(GLASS) : rng.pick(STUCCO);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, uo = rng();
      pushBox(B, cx, 0.25, cz, w, h, d, col, true, uo); addBox({ x0, x1, z0, z1, h: h + 0.25 });
      let top = h + 0.25;
      if (h > 40) { pushBox(B, cx, top, cz, w * 0.7, h * 0.2, d * 0.7, col, true, uo); top += h * 0.2; pushBox(B, cx, top, cz, 0.5, 8, 0.5, 0x888890); }
      else pushBox(B, cx + rng.range(-3, 3), top, cz + rng.range(-3, 3), 4, 1.6, 4, 0xb8b8c0);
      lots.push({ x: cx, z: cz, top, w, d, district: b.district, block: b });
      if (b.district !== 'downtown' && b.district !== 'marina') { // street-level awnings on the outer faces
        const ac = rng.pick(AWN);
        if (a === 0) pushBox(B, x0 - 0.6, 3.2, cz, 1.6, 0.25, d * 0.8, ac);
        if (a === nx - 1) pushBox(B, x1 + 0.6, 3.2, cz, 1.6, 0.25, d * 0.8, ac);
        if (c === 0) pushBox(B, cx, 3.2, z0 - 0.6, w * 0.8, 0.25, 1.6, ac);
        if (c === nz - 1) pushBox(B, cx, 3.2, z1 + 0.6, w * 0.8, 0.25, 1.6, ac);
      }
    }
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex.facade.map, emissiveMap: tex.facade.em, emissive: 0xffd9a0, emissiveIntensity: 0.6 });
  G.buildingMat = mat;
  for (const [buf, m] of [[B, mat], [SL, new THREE.MeshLambertMaterial({ vertexColors: true })], [GR, new THREE.MeshLambertMaterial({ vertexColors: true })]]) {
    const mesh = new THREE.Mesh(toGeometry(buf), m); mesh.castShadow = buf === B; mesh.receiveShadow = true; scene.add(mesh);
  }
}

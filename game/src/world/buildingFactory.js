// Buildings, sidewalks, parks, plazas and container yards, merged into a handful of static meshes.
// Pastel art-deco stucco (tinted only on the wall mask, so window glass keeps its sky reflection) with plinths, cornices,
// corner pilasters, stepped crowns, balconies aligned to the window bays, striped awnings and rooftop clutter;
// glass curtain-wall towers on stucco podiums downtown; low-rise near the beach.
import * as THREE from 'three';
import { STUCCO, GLASS } from '../core/config.js';
import { newBuf, pushBox, toGeometry, inst } from '../core/geometryUtils.js';
import { addBox } from './collision.js';
import { blocks } from './cityLayout.js';
import { G } from '../core/gameState.js';
import { sidewalkTex } from './textureFactory.js';

const PARAMS = { downtown: [30, 112], neon: [12, 26], marina: [6, 12], beach: [6, 14], old: [8, 18], hills: [6, 10] };
const AWN = [0xff5a7a, 0x2fc4b2, 0xffb02e, 0x3f8fe0, 0xff7a3d, 0x2fb89a];
const TRIM = [0xffffff, 0xfff6e6, 0xffffff, 0x2fb8a8, 0xff8a7a];
export const lots = [];
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

function maskedLambert(params) { // vertex colour applied only where the alphaMap (wall mask) is white
  const m = new THREE.MeshLambertMaterial(params);
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', '#ifdef USE_ALPHAMAP\n float wallM = texture2D( alphaMap, vAlphaMapUv ).g; diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vColor, wallM );\n#else\n diffuseColor.rgb *= vColor;\n#endif')
      .replace('#include <alphamap_fragment>', '');
  };
  return m;
}

export function buildCity(scene, tex, rng) {
  const B = newBuf(), GL = newBuf(), SL = newBuf(), GR = newBuf(), tanks = [], walks = []; lots.length = 0;
  for (const b of blocks) {
    pushBox(SL, b.cx, 0, b.cz, 50, 0.25, 50, 0xe9e4da); walks.push({ x: b.cx, z: b.cz, y: 0.256 });
    if (b.type === 'park') { pushBox(GR, b.cx, 0.25, b.cz, 44, 0.08, 44, 0x7cc06a); pushBox(GR, b.cx + 8, 0.33, b.cz - 6, 14, 0.05, 11, 0x4ab6d8); continue; }
    if (b.type === 'plaza') { pushBox(SL, b.cx, 0.25, b.cz, 36, 0.1, 36, 0xf3e6cc); pushBox(SL, b.cx, 0.35, b.cz, 9, 0.7, 9, 0xffffff); pushBox(GR, b.cx, 1.05, b.cz, 7, 0.1, 7, 0x4ac6e8); continue; }
    if (b.type === 'yard') {
      for (let k = 0; k < 14; k++) { const x = b.cx + rng.range(-19, 19), z = b.cz + rng.range(-19, 19); const st = rng.int(1, 3);
        const c = rng.pick([0xd9503f, 0x2f7fd8, 0xf2c230, 0x3fa56a, 0xe8e8e8, 0xff8a3d]);
        for (let s = 0; s < st; s++) pushBox(B, x, 0.25 + s * 2.6, z, 12, 2.6, 2.8, shade(c, 1 - s * 0.06));
        addBox({ x0: x - 6, x1: x + 6, z0: z - 1.4, z1: z + 1.4, h: st * 2.6 + .25 }); }
      pushBox(B, b.cx + 12, 0.25, b.cz - 12, 18, 9, 14, 0xc9ccd2, true, 0); addBox({ x0: b.cx + 3, x1: b.cx + 21, z0: b.cz - 19, z1: b.cz - 5, h: 9 });
      continue;
    }
    const [hmin, hmax] = PARAMS[b.district], cw = 22.5;
    for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) {
      const x0 = b.cx - 22.5 + a * cw + (a > 0 ? 0.5 : 0), x1 = b.cx - 22.5 + (a + 1) * cw - (a < 1 ? 0.5 : 0);
      const z0 = b.cz - 22.5 + c * cw + (c > 0 ? 0.5 : 0), z1 = b.cz - 22.5 + (c + 1) * cw - (c < 1 ? 0.5 : 0);
      let h = Math.round(rng.range(hmin, hmax) / 4) * 4; if (b.district === 'downtown' && a + c === 1) h = Math.round(h * 0.6 / 4) * 4;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, tower = b.district === 'downtown' && h > 40;
      const col = rng.pick(STUCCO), trim = rng.pick(TRIM);
      lots.push({ x: cx, z: cz, top: h + 0.25, w, d, district: b.district, block: b });
      const out = [a === 0 ? 'x0' : 'x1', c === 0 ? 'z0' : 'z1']; // street-facing faces of this lot
      if (tower) {
        const pod = 8, gcol = rng.pick(GLASS);
        pushBox(B, cx, 0.25, cz, w, pod, d, col, true, 0); pushBox(B, cx, pod + 0.25, cz, w + 0.4, 0.6, d + 0.4, trim);
        const tw = w * 0.82, td = d * 0.82, th = h - pod; pushBox(GL, cx, pod + 0.85, cz, tw, th, td, gcol, true, rng() * 4);
        for (let y = pod + 16.85; y < pod + th - 4; y += 16) pushBox(B, cx, y - 0.25, cz, tw + 0.3, 0.5, td + 0.3, 0xeef2f6);
        let top = pod + 0.85 + th; pushBox(B, cx, top, cz, tw + 0.5, 1.2, td + 0.5, 0xeef2f6);
        if (rng() < 0.6) { pushBox(GL, cx, top + 1.2, cz, tw * 0.62, h * 0.12, td * 0.62, gcol, true, 0.3); top += 1.2 + h * 0.12; pushBox(B, cx, top, cz, tw * 0.64, 0.8, td * 0.64, 0xeef2f6); top += 0.8; }
        pushBox(B, cx, top, cz, 0.6, 10, 0.6, 0xc8ccd4); (G.beacons ||= []).push([cx, top + 10.2, cz]);
        addBox({ x0, x1, z0, z1, h: top }); Object.assign(lots[lots.length - 1], { top, tower: true });
        continue;
      }
      pushBox(B, cx, 0.25, cz, w, h, d, col, true, 0); addBox({ x0, x1, z0, z1, h: h + 0.25 });
      pushBox(B, cx, 0.25, cz, w + 0.3, 1.0, d + 0.3, shade(col, 0.72)); // plinth
      pushBox(B, cx, h - 0.35, cz, w + 0.7, 0.8, d + 0.7, trim); pushBox(B, cx, h + 0.45, cz, w - 0.2, 0.9, d - 0.2, col); // cornice + parapet
      if (h >= 12) pushBox(B, cx, 4.05, cz, w + 0.35, 0.35, d + 0.35, trim); // first-floor deco band
      for (const sx of [x0, x1]) for (const sz of [z0, z1]) pushBox(B, sx, 0.25, sz, 0.9, h + 0.6, 0.9, trim); // corner pilasters
      let top = h + 1.35;
      if (rng() < 0.45) { // stepped art-deco crown on the street corner
        const kx = a === 0 ? x0 + 4 : x1 - 4, kz = c === 0 ? z0 + 4 : z1 - 4;
        pushBox(B, kx, top - 0.9, kz, 6, 4, 6, col); pushBox(B, kx, top + 3.1, kz, 6.4, 0.4, 6.4, trim); pushBox(B, kx, top + 3.5, kz, 3.6, 2.4, 3.6, trim); pushBox(B, kx, top + 5.9, kz, 0.3, 3.5, 0.3, 0xdddddd);
      }
      // balconies under every other window bay, floors 1+, on the street faces
      if (b.district !== 'downtown' && rng() < 0.7) {
        const floors = Math.floor(h / 4), rail = trim === 0x2fb8a8 || trim === 0xff8a7a ? trim : 0xffffff, ph = rng.int(0, 1);
        for (const f of out) for (let fl = 1; fl < floors; fl++) {
          const y = 0.25 + fl * 4 + 0.45, along = f[0] === 'x' ? d : w;
          for (let k = ph; k * 4 + 3.2 < along; k += 2) {
            const u = k * 4 + 2;
            if (f === 'x0' || f === 'x1') { const sx = f === 'x0' ? x0 - 0.6 : x1 + 0.6, s2 = f === 'x0' ? -1 : 1; pushBox(B, sx, y, z0 + u, 1.2, 0.2, 2.8, 0xf4f0ea); pushBox(B, sx + s2 * 0.55, y + 0.2, z0 + u, 0.1, 0.9, 2.8, rail); }
            else { const sz = f === 'z0' ? z0 - 0.6 : z1 + 0.6, s2 = f === 'z0' ? -1 : 1; pushBox(B, x0 + u, y, sz, 2.8, 0.2, 1.2, 0xf4f0ea); pushBox(B, x0 + u, y + 0.2, sz + s2 * 0.55, 2.8, 0.9, 0.1, rail); }
          }
        }
      }
      // striped street-level awnings
      if (b.district !== 'marina') {
        const ac = rng.pick(AWN), ac2 = 0xfffaf0, n = 8;
        for (const f of out) for (let s = 0; s < n; s++) {
          const cc = s % 2 ? ac2 : ac;
          if (f[0] === 'x') { const sx = f === 'x0' ? x0 - 1.0 : x1 + 1.0, len = d * 0.8 / n; pushBox(B, sx, 3.0, cz - d * 0.4 + (s + 0.5) * len, 2.0, 0.22, len, cc); }
          else { const sz = f === 'z0' ? z0 - 1.0 : z1 + 1.0, len = w * 0.8 / n; pushBox(B, cx - w * 0.4 + (s + 0.5) * len, 3.0, sz, len, 0.22, 2.0, cc); }
        }
      }
      // rooftop clutter: AC units and a water tank
      for (let k = rng.int(1, 3); k > 0; k--) { const ax = cx + rng.range(-w * 0.3, w * 0.3), az = cz + rng.range(-d * 0.3, d * 0.3); pushBox(B, ax, h + 0.25, az, 2.2, 1.3, 1.6, 0xd4d6da); pushBox(B, ax, h + 1.55, az, 1.4, 0.15, 1.0, 0x8a8e96); }
      if (rng() < 0.5 && h < 22) { const tx = cx + rng.range(-w * 0.25, w * 0.25), tz = cz + rng.range(-d * 0.25, d * 0.25); for (const o of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) pushBox(B, tx + o[0], h + 0.25, tz + o[1], 0.2, 2.2, 0.2, 0x6a6058); tanks.push({ x: tx, y: h + 2.45, z: tz, ry: rng() * 6, s: 1 }); }
      lots[lots.length - 1].top = Math.max(top, h + 1.35);
    }
  }
  const f = tex.facade;
  const mat = maskedLambert({ vertexColors: true, map: f.map, alphaMap: f.mask, emissiveMap: f.em, emissive: 0xffd9a0, emissiveIntensity: 0.4 });
  const gmat = new THREE.MeshPhongMaterial({ vertexColors: true, map: f.glass, emissiveMap: f.glassEm, emissive: 0xffe8c8, emissiveIntensity: 0.3, specular: 0xffe0c0, shininess: 70 });
  G.buildingMat = mat; G.glassMat = gmat;
  const swt = sidewalkTex(); swt.repeat.set(12.5, 12.5);
  for (const [buf, m, cast] of [[B, mat, true], [GL, gmat, true], [SL, new THREE.MeshLambertMaterial({ vertexColors: true }), false], [GR, new THREE.MeshLambertMaterial({ vertexColors: true }), false]]) {
    const mesh = new THREE.Mesh(toGeometry(buf), m); mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh);
  }
  const wg = new THREE.PlaneGeometry(49.6, 49.6).rotateX(-Math.PI / 2), wm = inst(wg, new THREE.MeshLambertMaterial({ map: swt, polygonOffset: true, polygonOffsetFactor: -1 }), walks); wm.receiveShadow = true; scene.add(wm);
  const tg = new THREE.CylinderGeometry(1.25, 1.25, 2.6, 12); tg.translate(0, 1.3, 0); const cap = new THREE.ConeGeometry(1.35, 0.9, 12); cap.translate(0, 3.05, 0);
  const tm = inst(tg, new THREE.MeshLambertMaterial({ color: 0xa88e72 }), tanks), cm = inst(cap, new THREE.MeshLambertMaterial({ color: 0x7a6a5a }), tanks); tm.castShadow = cm.castShadow = true; scene.add(tm, cm);
  if (G.beacons?.length) { const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3030).multiplyScalar(4) }); scene.add(inst(new THREE.SphereGeometry(0.45, 8, 6), bm, G.beacons.map(([x, y, z]) => ({ x, y, z })))); }
}

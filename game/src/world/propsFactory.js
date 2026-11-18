// Street dressing: tall curved-trunk palms with layered fronds lining every boulevard (instanced), street lamps, bus stops,
// benches, hydrants and bins (merged), park trees, glowing neon shop signs and rooftop billboards with our own brands.
import * as THREE from 'three';
import { N, S, HALF, lineCoord } from '../core/config.js';
import { inst, newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { blocks } from './cityLayout.js';
import { lots } from './buildingFactory.js';
import { signTexture, glowTex, adTexture } from './textureFactory.js';
import { G } from '../core/gameState.js';

const NEON = [['CLUB VELVET', '#ff4fd8'], ['TACOS 24H', '#ffb02e'], ['SUNSET BAR', '#ff6a5c'], ['KARAOKE', '#4fd8ff'], ['LA LUNA', '#b48cff'], ['PIZZA', '#7dff9a'], ['HOTEL BAY', '#ff4f7a'], ['SOLVANE LIVE', '#4fd8ff']];
const ADS = [['SUNSET FM 94.3', 'THE SOUND OF THE COAST', '#ff7a3c', '#ffcf6a'], ['CORAL CAFE', 'COLD BREW · OCEAN VIEW', '#18b8a8', '#8ff0d8'], ['VELOCE GT', 'BORN ON THE BOULEVARD', '#e8304f', '#ff9a6a'],
  ['VISIT THE BAY', 'SUN 340 DAYS A YEAR', '#2f7fd8', '#9fd8ff'], ['NEON PULSE 101', 'ALL NIGHT. EVERY NIGHT.', '#a02fd8', '#ff6ad8'], ['GLOW COAT', 'RESPRAY IN 5 MINUTES', '#ff9a1a', '#ffe36a']];

// One palm: a tapered, ringed trunk curving along a quadratic arc, a crown knob and two layers of drooping, folded fronds.
function palmGeo(H, lean, seed) {
  const P = [], C = [], I = []; let s = seed; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const v = (x, y, z, c) => { P.push(x, y, z); C.push(c.r, c.g, c.b); return P.length / 3 - 1; };
  const bark = new THREE.Color(0xa08a6c), bark2 = new THREE.Color(0x7c6a54), SEG = 12, RAD = 7;
  const ctr = (t) => [lean * t * t, H * t];
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG, [cx, cy] = ctr(t), r = (0.34 * (1 - t) + 0.19 * t) * (i % 2 ? 1.08 : 1), col = i % 2 ? bark : bark2;
    for (let k = 0; k < RAD; k++) { const a = k / RAD * Math.PI * 2; v(cx + Math.cos(a) * r, cy, Math.sin(a) * r, col); }
    if (i) for (let k = 0; k < RAD; k++) { const a0 = (i - 1) * RAD + k, a1 = (i - 1) * RAD + (k + 1) % RAD, b0 = a0 + RAD, b1 = a1 + RAD; I.push(a0, b0, a1, a1, b0, b1); }
  }
  const [tx, ty] = ctr(1), dark = new THREE.Color(0x2f6a2c), mid = new THREE.Color(0x4f9a3a), tip = new THREE.Color(0x9ccf5a), knob = new THREE.Color(0x6a7a3a);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; I.push(v(tx, ty + 0.5, 0, knob), v(tx + Math.cos(a) * 0.45, ty - 0.3, Math.sin(a) * 0.45, knob), v(tx + Math.cos(a + 1.05) * 0.45, ty - 0.3, Math.sin(a + 1.05) * 0.45, knob)); }
  const F = 13, L = 6;
  for (let k = 0; k < F; k++) {
    const upper = k % 2 === 0, az = k / F * Math.PI * 2 + rr() * 0.3, len = (upper ? 3.6 : 4.4) * (0.9 + rr() * 0.2), rise = upper ? 1.3 : 0.5, droop = upper ? 0.5 : 0.75;
    const dx = Math.cos(az), dz = Math.sin(az), px = -dz, pz = dx; let prev = null;
    for (let j = 0; j <= L; j++) {
      const t = j / L, along = len * t, y = ty + 0.2 + rise * t * len * 0.35 - droop * t * t * len, w = 0.85 * Math.sin(Math.PI * Math.pow(t, 0.7)) + 0.05, fold = 0.25 * w;
      const col = mid.clone().lerp(t < 0.5 ? dark : tip, Math.abs(t - 0.5) * 1.4), cxp = tx + dx * along, czp = dz * along;
      const row = [v(cxp - px * w, y - fold, czp - pz * w, col), v(cxp, y, czp, col), v(cxp + px * w, y - fold, czp + pz * w, col)];
      if (prev) I.push(prev[0], row[0], prev[1], prev[1], row[0], row[1], prev[1], row[1], prev[2], prev[2], row[1], row[2]);
      prev = row;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
}

export function buildProps(scene, rng) {
  const palms = [], lamps = [], trees = [], F = newBuf();
  for (let l = 0; l <= N; l++) {
    const boulevard = l % 3 === 0, line = lineCoord(l);
    for (let t = -HALF + 12; t < HALF; t += boulevard ? 10 : 7) {
      const k = (t + HALF) % S; if (k < 11 || k > S - 11) continue;
      const step = Math.round((t + HALF) / 7);
      for (const side of [-1, 1]) {
        const o = side * 7.8; let it = null;
        if (boulevard) it = palms; else if (step % 3 === 0) it = side > 0 ? palms : lamps; else if (step % 3 === 1 && side < 0) it = palms;
        if (!it) continue;
        const ry = it === lamps ? (side > 0 ? Math.PI : 0) : rng() * 6, s = 0.92 + rng() * 0.22;
        it.push({ x: t, z: line + o, ry: it === lamps ? ry : ry, s, side }); it.push({ x: line + o, z: t, ry: it === lamps ? ry + Math.PI / 2 : ry, s, side, flip: true });
      }
      if (boulevard && Math.round((t + HALF) / 10) % 3 === 1) for (const side of [-1, 1]) { lamps.push({ x: t + 5, z: line + side * 7.8, ry: side > 0 ? Math.PI : 0 }); lamps.push({ x: line + side * 7.8, z: t + 5, ry: (side > 0 ? Math.PI : 0) + Math.PI / 2 }); }
    }
  }
  // furniture: hydrants at corners, bus stops + benches + bins mid-block along boulevards
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const b = blocks[j * N + i]; if (!b || b.type === 'yard') continue;
    for (const [sx, sz] of [[-1, -1], [1, 1]]) { const x = b.cx + sx * 23.6, z = b.cz + sz * 23.6; pushBox(F, x, 0.25, z, 0.32, 0.65, 0.32, 0xd8302a); pushBox(F, x, 0.9, z, 0.22, 0.12, 0.22, 0xf0d040); }
    if (j % 3 === 2 || j % 3 === 0) { const z = b.cz + (j % 3 === 2 ? 23.4 : -23.4), x = b.cx + 6, fz = j % 3 === 2 ? 1 : -1; // shelter faces the road
      pushBox(F, x, 0.25, z + fz * 0.6, 4.2, 0.12, 1.6, 0xdfe6ec); pushBox(F, x, 2.6, z, 4.6, 0.12, 2.0, 0xf2f4f6); for (const ox of [-2.1, 2.1]) pushBox(F, x + ox, 0.25, z - fz * 0.7, 0.1, 2.4, 0.1, 0x5a6270);
      pushBox(F, x, 0.35, z - fz * 0.8, 4.2, 2.2, 0.06, 0x9fd0e8); pushBox(F, x, 0.7, z - fz * 0.2, 3.0, 0.1, 0.6, 0xc87a40); pushBox(F, x + 2.6, 0.25, z - fz * 0.5, 0.06, 2.2, 1.3, 0xff7a5c);
      pushBox(F, b.cx - 8, 0.25, z, 1.8, 0.45, 0.6, 0x8a5a3a); pushBox(F, b.cx - 8, 0.7, z - fz * 0.28, 1.8, 0.5, 0.08, 0x8a5a3a); pushBox(F, b.cx - 11, 0.25, z, 0.6, 1.0, 0.6, 0x2f8a6a); }
  }
  for (const b of blocks) {
    if (b.type === 'park') for (let k = 0; k < 14; k++) (rng() < 0.5 ? palms : trees).push({ x: b.cx + rng.range(-20, 20), z: b.cz + rng.range(-20, 20), ry: rng() * 6, s: 1 + rng() * 0.4 });
    if (b.type === 'plaza') for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; palms.push({ x: b.cx + Math.cos(a) * 14, z: b.cz + Math.sin(a) * 14, ry: rng() * 6, s: 1.1 }); }
  }
  for (let k = 0; k < 46; k++) { const z = rng.range(-HALF, HALF); if (Math.abs(((z + HALF) % S + S) % S - S / 2) > S / 2 - 12) continue; palms.push({ x: HALF + rng.range(14, 36), z, ry: rng() * 6, s: 1.1 + rng() * 0.2 }); }
  const pmat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const variants = [palmGeo(10.5, 1.2, 3), palmGeo(12, -1.6, 5), palmGeo(9, 0.6, 9)];
  variants.forEach((g, vi) => { const m = inst(g, pmat, palms.filter((_, i) => i % 3 === vi)); m.castShadow = true; scene.add(m); });
  const tt = new THREE.CylinderGeometry(0.25, 0.35, 3, 6); tt.translate(0, 1.5, 0); const cn = new THREE.IcosahedronGeometry(2.6, 1); cn.translate(0, 4.6, 0);
  scene.add(inst(tt, new THREE.MeshLambertMaterial({ color: 0x6a4a3a }), trees), inst(cn, new THREE.MeshLambertMaterial({ color: 0x5aa84a, flatShading: true }), trees));
  // street lamps: tapered pole, curved-over arm and an emissive head (HDR so it blooms after sunset)
  const lp = new THREE.CylinderGeometry(0.08, 0.15, 7.5, 6); lp.translate(0, 3.75, 0); const arm = new THREE.BoxGeometry(0.1, 0.1, 1.8); arm.translate(0, 7.45, 0.85);
  const head = new THREE.BoxGeometry(0.42, 0.16, 0.9); head.translate(0, 7.36, 1.65); const lampMat = G.lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.95, 0.75) });
  const pm = new THREE.MeshLambertMaterial({ color: 0x3e4652 }); const lm1 = inst(lp, pm, lamps), lm2 = inst(arm, pm, lamps); lm1.castShadow = true; scene.add(lm1, lm2, inst(head, lampMat, lamps));
  const fm = new THREE.Mesh(toGeometry(F), new THREE.MeshLambertMaterial({ vertexColors: true })); fm.castShadow = true; fm.receiveShadow = true; scene.add(fm);
  // neon shop signs on facades in Neon Row (HDR so they bloom), billboards on rooftops
  const mats = NEON.map(([t, c]) => new THREE.MeshBasicMaterial({ map: signTexture(t, c), color: new THREE.Color(1.7, 1.7, 1.7) }));
  const bmats = ADS.map(([t, tag, a, b]) => new THREE.MeshBasicMaterial({ map: adTexture(t, tag, a, b), side: THREE.DoubleSide, color: new THREE.Color(0.95, 0.95, 0.95) }));
  const pg = new THREE.PlaneGeometry(1, 1), poolGeo = new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2), glowMap = glowTex();
  for (const b of blocks) {
    if (b.district !== 'neon' || b.type !== 'buildings') continue;
    for (let k = 0; k < 3; k++) {
      const side = rng.int(0, 3), off = rng.range(-12, 12), ni = rng.int(0, mats.length - 1), m = new THREE.Mesh(pg, mats[ni]);
      m.scale.set(8, 2.6, 1); const y = rng.range(5, 9);
      if (side < 2) { m.position.set(b.cx + (side ? 22.8 : -22.8), y, b.cz + off); m.rotation.y = side ? Math.PI / 2 : -Math.PI / 2; } else { m.position.set(b.cx + off, y, b.cz + (side === 3 ? 22.8 : -22.8)); m.rotation.y = side === 3 ? 0 : Math.PI; }
      scene.add(m);
      const nx = side < 2 ? (side ? 1 : -1) : 0, nz = side < 2 ? 0 : (side === 3 ? 1 : -1), col = new THREE.Color(NEON[ni][1]);
      const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: glowMap, color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.position.set(m.position.x + nx * 10, 0.07, m.position.z + nz * 10); scene.add(pool);
      if (k === 0) for (const flip of [0, Math.PI]) { const bl = new THREE.Mesh(pg, mats[ni]), o = flip ? 0.03 : -0.03; bl.scale.set(4, 1.4, 1); bl.position.set(m.position.x + nx * 3.4 + (nx ? 0 : o), 4.6, m.position.z + nz * 3.4 + (nz ? 0 : o)); bl.rotation.y = (nx ? 0 : Math.PI / 2) + flip; scene.add(bl); }
    }
  }
  let n = 0; const legMat = new THREE.MeshLambertMaterial({ color: 0x555a66 }), frame = new THREE.BoxGeometry(14.6, 7.1, 0.4), leg = new THREE.BoxGeometry(0.5, 4, 0.5);
  for (const l of lots) {
    if (l.tower || !['downtown', 'neon', 'beach', 'old', 'marina'].includes(l.district) || rng() > 0.22) continue;
    const g = new THREE.Group(); g.position.set(l.x, l.top, l.z); g.rotation.y = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]) + rng.range(-.25, .25);
    const m = new THREE.Mesh(pg, bmats[n++ % bmats.length]); m.scale.set(14, 6.5, 1); m.position.set(0, 7.3, 0.22);
    const fr = new THREE.Mesh(frame, legMat); fr.position.set(0, 7.3, 0); fr.castShadow = true;
    for (const x of [-4, 4]) { const lg = new THREE.Mesh(leg, legMat); lg.position.set(x, 2, 0); g.add(lg); }
    g.add(m, fr); scene.add(g);
  }
}

// Street dressing: curved-trunk palm boulevards, lamps, bus stops, hydrants, benches, park trees, neon shop signs
// and rooftop billboards with our own ads. Everything repeated is an InstancedMesh.
import * as THREE from 'three';
import { N, S, HALF, lineCoord } from '../core/config.js';
import { inst } from '../core/geometryUtils.js';
import { blocks } from './cityLayout.js';
import { lots } from './buildingFactory.js';
import { signTexture, glowTex, adTexture } from './textureFactory.js';
import { G } from '../core/gameState.js';

const NEON = [['CLUB VELVET', '#ff4fd8'], ['TACOS 24H', '#ffb02e'], ['SUNSET BAR', '#ff6a5c'], ['KARAOKE', '#4fd8ff'], ['LA LUNA', '#b48cff'], ['PIZZA', '#7dff9a'], ['HOTEL BAY', '#ff4f7a'], ['SOLVANE LIVE', '#4fd8ff']];
const BOARDS = [['SUNSET FM', 'The sound of the coast · 94.3', '#ff9a3c', '#c2386a'], ['CORAL CAFE', 'Cold brew on the boardwalk', '#3fd0c0', '#1d6f9a'], ['VELOCE GT', 'Born on the bay road', '#ff4f6a', '#4a1240'], ['VISIT THE BAY', 'Sun. Sand. Solvane.', '#6ab8ff', '#ff8a5c'], ['NEON PULSE', 'Late nights · 101.1 FM', '#b04fff', '#ff4fd8'], ['GLOW COAT', 'Respray in 60 seconds', '#ffd23c', '#ff6a3c']];

// Palm: a gently curved, tapering trunk with growth rings, and two layers of drooping fronds (vertex coloured).
const TOP = { x: 1.3, y: 9.2 };
function palmGeo() {
  const p = [], c = [], idx = [], col = (r, g, b) => c.push(r, g, b);
  const seg = 10, rad = 6;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, x = TOP.x * t * t, y = TOP.y * t, r = 0.34 - 0.16 * t, ring = i % 2 ? 0.82 : 1;
    for (let k = 0; k <= rad; k++) { const a = k / rad * Math.PI * 2; p.push(x + Math.cos(a) * r, y, Math.sin(a) * r); col(0.62 * ring, 0.48 * ring, 0.34 * ring); }
  }
  for (let i = 0; i < seg; i++) for (let k = 0; k < rad; k++) { const a = i * (rad + 1) + k, b = a + rad + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const frond = (ang, len, lift, droop, w) => {
    const ca = Math.cos(ang), sa = Math.sin(ang), n = 7, base = p.length / 3;
    for (let i = 0; i <= n; i++) {
      const t = i / n, d = len * t, y = TOP.y + lift * t - droop * t * t, hw = w * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.04, tip = 0.75 + t * 0.4;
      for (const s of [-1, 1]) { p.push(TOP.x + ca * d - sa * hw * s, y - hw * 0.35, sa * d + ca * hw * s); col(0.2 * tip, 0.55 * tip, 0.22 * tip); }
      p.push(TOP.x + ca * d, y + 0.08, sa * d); col(0.28 * tip, 0.62 * tip, 0.26 * tip);
    }
    for (let i = 0; i < n; i++) { const a = base + i * 3; idx.push(a, a + 3, a + 2, a + 2, a + 3, a + 5, a + 2, a + 5, a + 1, a + 1, a + 5, a + 4); }
  };
  for (let k = 0; k < 9; k++) frond(k / 9 * Math.PI * 2 + 0.2, 4.6, 1.0, 3.2, 0.62);
  for (let k = 0; k < 6; k++) frond(k / 6 * Math.PI * 2 + 0.6, 3.0, 1.5, 1.6, 0.48);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2, base = p.length / 3; // coconuts cluster
    p.push(TOP.x + Math.cos(a) * 0.35, TOP.y - 0.2, Math.sin(a) * 0.35, TOP.x + Math.cos(a) * 0.5, TOP.y - 0.6, Math.sin(a) * 0.5, TOP.x + Math.cos(a + 0.6) * 0.3, TOP.y - 0.55, Math.sin(a + 0.6) * 0.3);
    col(0.45, 0.32, 0.12); col(0.4, 0.28, 0.1); col(0.42, 0.3, 0.1); idx.push(base, base + 1, base + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
export function buildProps(scene, rng) {
  const palms = [], lamps = [], trees = [];
  for (let l = 0; l <= N; l++) {
    const boulevard = l % 3 === 0;
    for (let t = -HALF + 14; t < HALF; t += boulevard ? 10 : 21) {
      const k = (t + HALF) % S; if (k < 10 || k > S - 10) continue;
      for (const side of [-1, 1]) {
        const o = side * 7.9, it = boulevard || (Math.floor(t / 21) % 2) ? palms : lamps;
        if (boulevard || side === (Math.floor(t / 21) % 2 ? 1 : -1) || it === palms) { it.push({ x: t, z: lineCoord(l) + o, ry: rng() * 6, s: 0.9 + rng() * 0.3, side }); it.push({ x: lineCoord(l) + o, z: t, ry: rng() * 6, s: 0.9 + rng() * 0.3, side, flip: true }); }
      }
    }
  }
  for (const l of [...lamps, ...palms]) if (l.side) l.ry = (l.flip ? (l.side > 0 ? Math.PI : 0) : l.side * Math.PI / 2) + (l.ry - 3) * 0.08; // lean / reach over the road
  for (const b of blocks) {
    if (b.type === 'park') for (let k = 0; k < 14; k++) (rng() < 0.5 ? palms : trees).push({ x: b.cx + rng.range(-20, 20), z: b.cz + rng.range(-20, 20), ry: rng() * 6, s: 1 + rng() * 0.5 });
    if (b.district === 'beach' || b.type === 'plaza') for (let k = 0; k < 4; k++) palms.push({ x: b.cx + rng.range(-20, 20), z: b.cz + rng.range(-20, 20), ry: rng() * 6, s: 1 });
  }
  for (let k = 0; k < 40; k++) palms.push({ x: HALF + rng.range(12, 34), z: rng.range(-HALF, HALF), ry: rng() * 6, s: 1.1 });
  const pg0 = inst(palmGeo(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), palms); pg0.castShadow = true; scene.add(pg0); G.palmProps = { mesh: pg0, list: palms }; // staged shots may thin palms that block a landmark
  // bus stops, benches and hydrants along the sidewalks
  const stops = [], benches = [], hyd = [];
  for (const b of blocks) for (const [dx, dz, ry] of [[0, -23.2, 0], [0, 23.2, Math.PI], [-23.2, 0, Math.PI / 2], [23.2, 0, -Math.PI / 2]]) {
    const r = rng(); const x = b.cx + dx + (dz ? rng.range(-14, 14) : 0), z = b.cz + dz + (dx ? rng.range(-14, 14) : 0);
    if (r < 0.14) stops.push({ x, z, ry }); else if (r < 0.4) benches.push({ x, z, ry }); else if (r < 0.6) hyd.push({ x: b.cx + dx * 0.98 + (dz ? 18 : 0), z: b.cz + dz * 0.98 + (dx ? 18 : 0) });
  }
  const glassM = new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.45 });
  scene.add(inst(box(4, 0.15, 1.8, 0, 2.6, 0), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }), stops), inst(box(4, 2.3, 0.08, 0, 1.4, -0.85), glassM, stops),
    inst(box(0.12, 2.6, 0.12, -1.9, 1.3, -0.8), new THREE.MeshLambertMaterial({ color: 0x2fb8a8 }), stops), inst(box(0.12, 2.6, 0.12, 1.9, 1.3, -0.8), new THREE.MeshLambertMaterial({ color: 0x2fb8a8 }), stops),
    inst(box(1.3, 2.1, 0.1, 2.6, 1.3, -0.2), new THREE.MeshBasicMaterial({ map: adTexture('CORAL CAFE', 'Cold brew', '#3fd0c0', '#1d6f9a') }), stops),
    inst(box(2.6, 0.12, 0.6, 0, 0.75, 0), new THREE.MeshLambertMaterial({ color: 0xc08a5a }), benches), inst(box(2.6, 0.6, 0.1, 0, 1.05, -0.3), new THREE.MeshLambertMaterial({ color: 0xc08a5a }), benches),
    inst(box(0.1, 0.7, 0.5, -1.1, 0.4, 0), new THREE.MeshLambertMaterial({ color: 0x33363c }), benches),
    inst(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 8).translate(0, 0.65, 0), new THREE.MeshLambertMaterial({ color: 0xe0302a }), hyd), inst(new THREE.SphereGeometry(0.2, 8, 6).translate(0, 1.08, 0), new THREE.MeshLambertMaterial({ color: 0xe0302a }), hyd));
  const tt = new THREE.CylinderGeometry(0.25, 0.35, 3, 6); tt.translate(0, 1.5, 0); const cn = new THREE.IcosahedronGeometry(2.6, 0); cn.translate(0, 4.6, 0);
  scene.add(inst(tt, new THREE.MeshLambertMaterial({ color: 0x6a4a3a }), trees), inst(cn, new THREE.MeshLambertMaterial({ color: 0x4f9a3f, flatShading: true }), trees));
  const pole = new THREE.CylinderGeometry(0.09, 0.15, 7, 8); pole.translate(0, 3.5, 0); const arm = box(1.8, 0.12, 0.12, 0.85, 7, 0);
  const head = box(0.9, 0.18, 0.4, 1.6, 6.9, 0); G.lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  scene.add(inst(pole, new THREE.MeshLambertMaterial({ color: 0x2f3440 }), lamps), inst(arm, new THREE.MeshLambertMaterial({ color: 0x2f3440 }), lamps), inst(head, G.lampMat, lamps));
  // neon shop signs on facades in Neon Row, billboards on rooftops
  const mats = NEON.map(([t, c]) => { const m = new THREE.MeshBasicMaterial({ map: signTexture(t, c) }); m.color.setScalar(1.7); return m; });
  const bmats = BOARDS.map(([t, tag, c1, c2]) => new THREE.MeshBasicMaterial({ map: adTexture(t, tag, c1, c2), side: THREE.DoubleSide }));
  const pg = new THREE.PlaneGeometry(1, 1), poolGeo = new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2), glowMap = glowTex();
  for (const b of blocks) {
    if (b.district !== 'neon' || b.type !== 'buildings') continue;
    for (let k = 0; k < 3; k++) {
      const side = rng.int(0, 3), off = rng.range(-12, 12), ni = rng.int(0, mats.length - 1), m = new THREE.Mesh(pg, mats[ni]);
      m.scale.set(8, 2.6, 1); const y = rng.range(5, 9);
      if (side < 2) { m.position.set(b.cx + (side ? 22.7 : -22.7), y, b.cz + off); m.rotation.y = side ? Math.PI / 2 : -Math.PI / 2; } else { m.position.set(b.cx + off, y, b.cz + (side === 3 ? 22.7 : -22.7)); m.rotation.y = side === 3 ? 0 : Math.PI; }
      scene.add(m);
      // coloured neon light pool on the street and a double-sided blade sign (readable from both directions)
      const nx = side < 2 ? (side ? 1 : -1) : 0, nz = side < 2 ? 0 : (side === 3 ? 1 : -1), col = new THREE.Color(NEON[ni][1]);
      const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ map: glowMap, color: col, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.position.set(m.position.x + nx * 10, 0.07, m.position.z + nz * 10); scene.add(pool);
      if (k === 0) for (const flip of [0, Math.PI]) { const bl = new THREE.Mesh(pg, mats[ni]), o = flip ? 0.03 : -0.03; bl.scale.set(4, 1.4, 1); bl.position.set(m.position.x + nx * 3.4 + (nx ? 0 : o), 4.4, m.position.z + nz * 3.4 + (nz ? 0 : o)); bl.rotation.y = (nx ? 0 : Math.PI / 2) + flip; scene.add(bl); }
    }
  }
  let n = 0;
  for (const l of lots) {
    if (!['downtown', 'neon', 'beach', 'old'].includes(l.district) || rng() > 0.16) continue;
    const m = new THREE.Mesh(pg, bmats[n++ % bmats.length]); m.scale.set(14, 6.5, 1); m.position.set(l.x, l.top + 5, l.z); m.rotation.y = rng.pick([0, Math.PI / 2]) + rng.range(-.2, .2); scene.add(m);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), new THREE.MeshLambertMaterial({ color: 0x555a66 })); leg.position.set(l.x, l.top + 1.5, l.z); scene.add(leg);
  }
}

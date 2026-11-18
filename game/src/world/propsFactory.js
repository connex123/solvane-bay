// Street dressing: palm boulevards, lamps, park trees, neon shop signs and rooftop billboards.
import * as THREE from 'three';
import { N, S, HALF, lineCoord } from '../core/config.js';
import { inst } from '../core/geometryUtils.js';
import { blocks } from './cityLayout.js';
import { lots } from './buildingFactory.js';
import { signTexture } from './textureFactory.js';

const NEON = [['CLUB VELVET', '#ff4fd8'], ['TACOS 24H', '#ffb02e'], ['SUNSET BAR', '#ff6a5c'], ['KARAOKE', '#4fd8ff'], ['LA LUNA', '#b48cff'], ['PIZZA', '#7dff9a'], ['HOTEL BAY', '#ff4f7a'], ['SOLVANE LIVE', '#4fd8ff']];
const BOARDS = [['SUNSET FM 94.3', '#ff9a3c'], ['CORAL CAFE', '#4fe0c0'], ['VELOCE GT', '#ff4f6a'], ['VISIT THE BAY', '#6ab8ff'], ['NEON PULSE 101', '#ff4fd8']];

function palmGeo() {
  const p = [], idx = [];
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const base = p.length / 3;
    const pt = (u, v, w) => p.push(c * w - s * u, v, s * w + c * u);
    pt(0, 0, 0); pt(-0.6, -0.4, 1.7); pt(0.6, -0.4, 1.7); pt(0, -1.3, 3.5);
    idx.push(base, base + 1, base + 3, base, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function buildProps(scene, rng) {
  const palms = [], lamps = [], trees = [];
  for (let l = 0; l <= N; l++) {
    const boulevard = l % 3 === 0;
    for (let t = -HALF + 14; t < HALF; t += boulevard ? 11 : 21) {
      const k = (t + HALF) % S; if (k < 10 || k > S - 10) continue;
      for (const side of [-1, 1]) {
        const o = side * 7.9, it = boulevard ? palms : lamps;
        if (boulevard || side === (Math.floor(t / 21) % 2 ? 1 : -1)) { it.push({ x: t, z: lineCoord(l) + o, ry: rng() * 6, s: 0.9 + rng() * 0.3, side }); it.push({ x: lineCoord(l) + o, z: t, ry: rng() * 6, s: 0.9 + rng() * 0.3, side, flip: true }); }
      }
    }
  }
  for (const b of blocks) {
    if (b.type === 'park') for (let k = 0; k < 14; k++) (rng() < 0.5 ? palms : trees).push({ x: b.cx + rng.range(-20, 20), z: b.cz + rng.range(-20, 20), ry: rng() * 6, s: 1 + rng() * 0.5 });
    if (b.district === 'beach' || b.type === 'plaza') for (let k = 0; k < 4; k++) palms.push({ x: b.cx + rng.range(-20, 20), z: b.cz + rng.range(-20, 20), ry: rng() * 6, s: 1 });
  }
  for (let k = 0; k < 40; k++) palms.push({ x: HALF + rng.range(12, 34), z: rng.range(-HALF, HALF), ry: rng() * 6, s: 1.1 });
  const trunk = new THREE.CylinderGeometry(0.17, 0.3, 7, 6); trunk.translate(0, 3.5, 0);
  const fr = palmGeo(); fr.translate(0, 7, 0);
  const g1 = inst(trunk, new THREE.MeshLambertMaterial({ color: 0x8a6a4a }), palms); g1.castShadow = true;
  const g2 = inst(fr, new THREE.MeshLambertMaterial({ color: 0x3f9a4a, side: THREE.DoubleSide }), palms); g2.castShadow = true;
  scene.add(g1, g2);
  const tt = new THREE.CylinderGeometry(0.25, 0.35, 3, 6); tt.translate(0, 1.5, 0); const cn = new THREE.IcosahedronGeometry(2.6, 0); cn.translate(0, 4.6, 0);
  scene.add(inst(tt, new THREE.MeshLambertMaterial({ color: 0x6a4a3a }), trees), inst(cn, new THREE.MeshLambertMaterial({ color: 0x4f9a3f, flatShading: true }), trees));
  const pole = new THREE.CylinderGeometry(0.1, 0.14, 6.5, 6); pole.translate(0, 3.25, 0);
  const head = new THREE.BoxGeometry(1.4, 0.25, 0.5); head.translate(0, 6.6, 0);
  scene.add(inst(pole, new THREE.MeshLambertMaterial({ color: 0x40444c }), lamps), inst(head, new THREE.MeshBasicMaterial({ color: 0xffe2a8 }), lamps));
  // neon shop signs on facades in Neon Row, billboards on rooftops
  const mats = NEON.map(([t, c]) => new THREE.MeshBasicMaterial({ map: signTexture(t, c) }));
  const bmats = BOARDS.map(([t, c]) => new THREE.MeshBasicMaterial({ map: signTexture(t, c, '#10131f', 512, 256), side: THREE.DoubleSide }));
  const pg = new THREE.PlaneGeometry(1, 1);
  for (const b of blocks) {
    if (b.district !== 'neon' || b.type !== 'buildings') continue;
    for (let k = 0; k < 3; k++) {
      const side = rng.int(0, 3), off = rng.range(-12, 12), m = new THREE.Mesh(pg, mats[rng.int(0, mats.length - 1)]);
      m.scale.set(8, 2.6, 1); const y = rng.range(5, 9);
      if (side < 2) { m.position.set(b.cx + (side ? 22.7 : -22.7), y, b.cz + off); m.rotation.y = side ? Math.PI / 2 : -Math.PI / 2; } else { m.position.set(b.cx + off, y, b.cz + (side === 3 ? 22.7 : -22.7)); m.rotation.y = side === 3 ? 0 : Math.PI; }
      scene.add(m);
    }
  }
  let n = 0;
  for (const l of lots) {
    if (!['downtown', 'neon', 'beach', 'old'].includes(l.district) || rng() > 0.16) continue;
    const m = new THREE.Mesh(pg, bmats[n++ % bmats.length]); m.scale.set(14, 6.5, 1); m.position.set(l.x, l.top + 5, l.z); m.rotation.y = rng.pick([0, Math.PI / 2]) + rng.range(-.2, .2); scene.add(m);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), new THREE.MeshLambertMaterial({ color: 0x555a66 })); leg.position.set(l.x, l.top + 1.5, l.z); scene.add(leg);
  }
}

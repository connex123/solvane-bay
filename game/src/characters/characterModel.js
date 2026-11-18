// Low-poly humanoids from rounded capsules, spheres and tapered cylinders: merged body, animated arms and legs, optional held gun. Geometry is cached per style.
import * as THREE from 'three';

const cache = {}; const mat = new THREE.MeshLambertMaterial({ vertexColors: true }); const gunMat = new THREE.MeshLambertMaterial({ color: 0x15151a });
export const STYLES = {
  nico: { shirt: 0xe9eef2, pants: 0x2b3350, skin: 0xc68a5e, hair: 0x15110e, jacket: 0x1fa7a0, trim: 0xff4fd8 },
  cop: { shirt: 0x24428c, pants: 0x14192b, skin: 0xe0b08c, hair: 0x1d2b53, trim: 0x9fc4ff, cap: true },
  coral: { shirt: 0xe0409a, pants: 0x30303a, skin: 0x9a6a46, hair: 0x111111 },
  suit: { shirt: 0x15151a, pants: 0x15151a, skin: 0xd8a47c, hair: 0x2a1a10 },
};
const SHIRTS = [0xf2c230, 0xe8613c, 0x4aa3df, 0x7bc67b, 0xf4f0e6, 0xb06ad8, 0xff8fa8], PANTS = [0x3b4a6b, 0x6b5a45, 0xd9d0b8, 0x2a2a30], SKINS = [0xf0c8a0, 0xd9a577, 0xb07a52, 0x7a5236, 0xe8b890];
export const randomStyle = (rng) => ({ shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), skin: rng.pick(SKINS), hair: rng.pick([0x111111, 0x3a2414, 0xc9a050, 0x7a2a1a]) });
// Merge rounded primitives (capsules, spheres, tapered cylinders) into one vertex-coloured, non-indexed geometry.
function merge(list) {
  const P = [], N = [], C = [];
  for (const [g0, col] of list) {
    const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position.array, n = g.attributes.normal.array, c = new THREE.Color(col);
    for (let i = 0; i < p.length; i += 3) { P.push(p[i], p[i + 1], p[i + 2]); N.push(n[i], n[i + 1], n[i + 2]); C.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeBoundingSphere(); return g;
}
const cap = (r, len, x, y, z, sx = 1, sz = 1) => new THREE.CapsuleGeometry(r, len, 3, 10).scale(sx, 1, sz).translate(x, y, z);
const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.SphereGeometry(r, 12, 9).scale(sx, sy, sz).translate(x, y, z);
const cyl = (rt, rb, h, x, y, z, sz = 1) => new THREE.CylinderGeometry(rt, rb, h, 12).scale(1, 1, sz).translate(x, y, z);
const bx = (w, h, d, x, y, z, rx = 0) => new THREE.BoxGeometry(w, h, d).rotateX(rx).translate(x, y, z);
function parts(st) {
  const k = JSON.stringify(st); if (cache[k]) return cache[k];
  const jk = st.jacket ?? st.shirt, tr = st.trim ?? st.shirt, B = [], A = [], L = [];
  B.push([cyl(0.27, 0.21, 0.6, 0, 1.17, 0, 0.62), jk], [cap(0.12, 0.36, 0, 1.43, 0, 1, 0.9).rotateZ(Math.PI / 2).translate(0, 1.43 - 1.43 * 1, 0), jk], [cyl(0.215, 0.2, 0.2, 0, 0.9, 0, 0.68), st.pants], [cyl(0.218, 0.218, 0.05, 0, 0.98, 0, 0.7), 0x1a1a1e]);
  B[1][0] = new THREE.CapsuleGeometry(0.12, 0.36, 3, 10).rotateZ(Math.PI / 2).scale(1, 1, 0.9).translate(0, 1.43, 0);
  if (st.jacket) B.push([bx(0.17, 0.5, 0.02, 0, 1.2, 0.16), st.shirt], [bx(0.05, 0.42, 0.02, -0.11, 1.24, 0.165, -0.05), tr], [bx(0.05, 0.42, 0.02, 0.11, 1.24, 0.165, -0.05), tr], [bx(0.3, 0.12, 0.02, 0, 1.08, -0.16), tr]);
  if (st.cap) B.push([bx(0.07, 0.09, 0.02, 0.13, 1.3, 0.16), 0xf2c230], [bx(0.18, 0.04, 0.02, -0.12, 1.32, 0.16), 0xf2c230], [cyl(0.218, 0.218, 0.06, 0, 0.98, 0, 0.7), 0x0e0e12], [bx(0.07, 0.24, 0.14, 0.24, 0.86, 0.02), 0x111111], [bx(0.3, 0.12, 0.02, 0, 1.25, -0.16), 0x9fc4ff]);
  B.push([cyl(0.065, 0.075, 0.12, 0, 1.53, 0), st.skin], [sph(0.15, 0, 1.69, 0.0, 0.92, 1.1, 1), st.skin], [bx(0.04, 0.06, 0.05, 0, 1.67, 0.15), st.skin], [sph(0.035, -0.14, 1.68, 0), st.skin], [sph(0.035, 0.14, 1.68, 0), st.skin]);
  B.push([bx(0.045, 0.03, 0.01, -0.055, 1.72, 0.137), 0x161616], [bx(0.045, 0.03, 0.01, 0.055, 1.72, 0.137), 0x161616], [bx(0.1, 0.015, 0.01, 0, 1.6, 0.137), 0x7a3a2a]);
  if (st.cap) B.push([cyl(0.165, 0.16, 0.1, 0, 1.83, 0), st.hair], [bx(0.28, 0.025, 0.14, 0, 1.79, 0.17), 0x0a0a0a], [bx(0.05, 0.05, 0.02, 0, 1.84, 0.165), 0xf2c230], [bx(0.08, 0.04, 0.01, 0, 1.735, 0.143), 0x050505]);
  else B.push([new THREE.SphereGeometry(0.162, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4).scale(0.95, 1.05, 1.04).translate(0, 1.715, -0.012), st.hair], [sph(0.1, 0, 1.7, -0.075, 1.4, 1.25, 1), st.hair]);
  A.push([cap(0.078, 0.26, 0, -0.2, 0), jk], [cap(0.066, 0.24, 0, -0.52, 0), jk], [cyl(0.075, 0.075, 0.05, 0, -0.66, 0), tr], [sph(0.068, 0, -0.76, 0.01, 1, 1.2, 1), st.skin]);
  L.push([cap(0.11, 0.3, 0, -0.24, 0), st.pants], [cap(0.092, 0.3, 0, -0.6, 0), st.pants], [cap(0.075, 0.16, 0, -0.81, 0.06).rotateX(0).scale(1, 1, 1), 0x111114]);
  L[2][0] = new THREE.CapsuleGeometry(0.075, 0.16, 3, 8).rotateX(Math.PI / 2).scale(1.15, 1, 1).translate(0, -0.8, 0.05);
  return (cache[k] = { body: merge(B), arm: merge(A), leg: merge(L) });
}
const dark = new THREE.MeshLambertMaterial({ color: 0x22232a });
function buildGun() {
  const g = new THREE.Group(), add = (w, h, d, x, y, z, m = gunMat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
  add(0.09, 0.13, 0.42, 0, 0, 0); add(0.04, 0.04, 0.24, 0, 0.02, 0.32, dark); add(0.06, 0.2, 0.08, 0, -0.15, 0.06, dark); add(0.05, 0.09, 0.2, 0, -0.01, -0.3, dark); add(0.03, 0.04, 0.08, 0, 0.09, 0.12, dark); add(0.06, 0.1, 0.06, 0, -0.1, -0.1, dark);
  return g;
}
export function buildCharacter(style) {
  const g = parts(style), root = new THREE.Group(), mk = (geo, x, y) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.castShadow = true; root.add(m); return m; };
  const body = mk(g.body, 0, 0), armL = mk(g.arm, -0.34, 1.47), armR = mk(g.arm, 0.34, 1.47), legL = mk(g.leg, -0.14, 0.85), legR = mk(g.leg, 0.14, 0.85);
  const gun = buildGun(); gun.position.set(0, 1.38, 0.62); gun.visible = false; root.add(gun);
  root.userData = { body, armL, armR, legL, legR, gun }; return root;
}
export function animateWalk(ch, phase, amt, aim) {
  const u = ch.userData, s = Math.sin(phase) * amt;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = aim ? -1.35 : -s * 0.8; u.armR.rotation.x = aim ? -1.5 : s * 0.8; u.armL.rotation.z = aim ? 0.42 : 0; u.armR.rotation.z = aim ? -0.42 : 0;
}
export function setGun(ch, kind) { const g = ch.userData.gun; g.visible = !!kind; if (kind) g.scale.set(1, 1, kind === 'shotgun' ? 1.5 : kind === 'smg' ? 1.1 : 0.7); }

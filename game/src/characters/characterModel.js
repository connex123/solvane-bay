// Smooth low-poly humanoids: lathed torso with an open jacket and collar, rounded head with face and hair styles, tapered limbs with hands and shoes.
// Body, arms and legs are separate vertex-coloured meshes (pivoting at shoulders/hips) so walk and aim poses can animate them. Geometry is cached per style.
import * as THREE from 'three';

const cache = {};
const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
const gunMat = new THREE.MeshLambertMaterial({ color: 0x15151a }), dark = new THREE.MeshLambertMaterial({ color: 0x22232a });

export const STYLES = {
  nico: { shirt: 0xf4f4f0, pants: 0x1f2a44, skin: 0xc68a5e, hair: 0x15110e, hairStyle: 'quiff', jacket: 0x14a39a, trim: 0x0d5f5a, sleeves: 'long', shoes: 0xf6f6f6, sole: 0xdedede, beard: true },
  cop: { shirt: 0x1d2c58, pants: 0x131a2e, skin: 0xe0b08c, hair: 0x2a1a10, hairStyle: 'buzz', sleeves: 'short', shoes: 0x0c0c0e, cap: 0x15204a, badge: true },
  coral: { shirt: 0xe0409a, pants: 0x30303a, skin: 0x9a6a46, hair: 0x111111, hairStyle: 'buzz', jacket: 0x22222a, trim: 0xe0409a, sleeves: 'long', shoes: 0x111111 },
  suit: { shirt: 0xe8e8e8, pants: 0x15151a, skin: 0xd8a47c, hair: 0x2a1a10, hairStyle: 'short', jacket: 0x17171c, trim: 0x2a2a30, sleeves: 'long', shoes: 0x0a0a0a },
};
const SHIRTS = [0xf2c230, 0xe8613c, 0x4aa3df, 0x7bc67b, 0xf4f0e6, 0xb06ad8, 0xff8fa8, 0x40c8c0], PANTS = [0x3b4a6b, 0x6b5a45, 0xd9d0b8, 0x2a2a30, 0x8a9bb0];
const SKINS = [0xf0c8a0, 0xd9a577, 0xb07a52, 0x7a5236, 0xe8b890, 0x5c3a24], HAIRS = [0x111111, 0x3a2414, 0xc9a050, 0x7a2a1a, 0x9a9a9a];
const JACKETS = [null, null, null, 0xf4f0e6, 0x2f6fb0, 0xd8b48a, 0x2a2a30], SHOES = [0xf2f2f2, 0x111111, 0xd94a3a, 0x6b4a2a];
export const randomStyle = (rng) => {
  const jacket = rng.pick(JACKETS);
  return { shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), skin: rng.pick(SKINS), hair: rng.pick(HAIRS), hairStyle: rng.pick(['short', 'long', 'bun', 'buzz', 'afro', 'short']),
    jacket, trim: jacket ? rng.pick([0x222222, 0xf4f0e6]) : null, sleeves: jacket ? 'long' : rng.pick(['short', 'short', 'long']), shoes: rng.pick(SHOES) };
};

// Merge primitives into one vertex-coloured, non-indexed geometry.
function merge(list) {
  const P = [], N = [], C = [];
  for (const [g0, col] of list) {
    const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position.array, n = g.attributes.normal.array, c = new THREE.Color(col);
    for (let i = 0; i < p.length; i += 3) { P.push(p[i], p[i + 1], p[i + 2]); N.push(n[i], n[i + 1], n[i + 2]); C.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeBoundingSphere(); return g;
}
const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1, ws = 14, hs = 10) => new THREE.SphereGeometry(r, ws, hs).scale(sx, sy, sz).translate(x, y, z);
const cyl = (rt, rb, h, x, y, z, sz = 1, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg).scale(1, 1, sz).translate(x, y, z);
const bx = (w, h, d, x, y, z, rx = 0, rz = 0) => new THREE.BoxGeometry(w, h, d).rotateX(rx).rotateZ(rz).translate(x, y, z);
// Tapered limb segment hanging down from y0: cylinder with rounded ends.
const limb = (out, col, r1, r2, len, y0, z = 0) => out.push([cyl(r1, r2, len, 0, y0 - len / 2, z, 1, 12), col], [sph(r1, 0, y0, z, 1, 1, 1, 12, 8), col], [sph(r2, 0, y0 - len, z, 1, 1, 1, 12, 8), col]);
// Torso shell: lathe profile from waist to neck, flattened front-to-back.
function torso(scaleR, depth, col, gap = 0) {
  const pr = [[0.0, 0.9], [0.19, 0.9], [0.2, 1.0], [0.205, 1.1], [0.225, 1.24], [0.25, 1.36], [0.245, 1.43], [0.19, 1.49], [0.08, 1.53], [0.0, 1.53]];
  return [new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(r * scaleR, y)), 18, gap, Math.PI * 2 - 2 * gap).scale(1, 1, depth), col];
}

function hair(B, st) {
  const h = st.hair, s = st.hairStyle ?? 'short';
  if (s === 'buzz') { B.push([new THREE.SphereGeometry(0.137, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(0.92, 1.08, 1.02).translate(0, 1.708, -0.006), h]); return; }
  if (s === 'afro') { B.push([sph(0.19, 0, 1.78, -0.03, 1, 0.9, 1), h]); return; }
  B.push([new THREE.SphereGeometry(0.145, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45).scale(0.93, 1.1, 1.04).translate(0, 1.71, -0.01), h], [sph(0.12, 0, 1.69, -0.06, 1.12, 1.2, 0.9), h]);
  if (s === 'quiff') B.push([sph(0.08, 0.01, 1.85, 0.06, 1.3, 0.6, 1.1), h], [sph(0.06, -0.06, 1.84, 0.03, 1.1, 0.6, 1), h]);
  if (s === 'bun') B.push([sph(0.065, 0, 1.86, -0.1), h]);
  if (s === 'long') B.push([cyl(0.13, 0.15, 0.32, 0, 1.56, -0.06, 0.65), h], [sph(0.04, -0.12, 1.66, 0.05, 0.6, 2.2, 0.8), h], [sph(0.04, 0.12, 1.66, 0.05, 0.6, 2.2, 0.8), h]);
}

function parts(st) {
  const k = JSON.stringify(st); if (cache[k]) return cache[k];
  const jk = st.jacket ?? st.shirt, tr = st.trim ?? jk, shoes = st.shoes ?? 0x111114, B = [], A = [], L = [];
  // Torso: shirt underneath, jacket shell over it with an open front.
  B.push(torso(1, 0.62, st.shirt));
  if (st.jacket) {
    B.push(torso(1.07, 0.66, jk, 0.42)); // open front shows the shirt
    B.push([cyl(0.225, 0.215, 0.06, 0, 0.93, 0, 0.66), tr]); // ribbed hem
    B.push([new THREE.TorusGeometry(0.1, 0.035, 6, 16).rotateX(Math.PI / 2).scale(1, 1, 0.85).translate(0, 1.5, -0.01), tr]); // collar
  } else {
    B.push([new THREE.TorusGeometry(0.075, 0.018, 5, 14).rotateX(Math.PI / 2).translate(0, 1.515, 0.0), st.shirt]); // crew neck
  }
  B.push([sph(0.105, -0.25, 1.43, 0, 1, 0.9, 1), jk], [sph(0.105, 0.25, 1.43, 0, 1, 0.9, 1), jk]); // shoulders
  // Hips and belt.
  B.push([cyl(0.2, 0.2, 0.14, 0, 0.88, 0, 0.66), st.pants], [sph(0.2, 0, 0.82, 0, 1, 0.45, 0.66), st.pants], [cyl(0.205, 0.205, 0.04, 0, 0.94, 0, 0.67), 0x1a1a1e], [bx(0.05, 0.035, 0.02, 0, 0.94, 0.135), 0xb8b8b0]);
  // Police details: badge, shoulder patches, name bar, radio, holster.
  if (st.badge) B.push([sph(0.03, -0.1, 1.33, 0.15, 1, 1.2, 0.35), 0xe8c040], [bx(0.09, 0.02, 0.01, 0.1, 1.33, 0.152), 0xd8d8d8], [bx(0.04, 0.07, 0.03, 0.11, 1.4, 0.14), 0x111111],
    [sph(0.045, -0.29, 1.36, 0, 0.3, 1, 1), 0xe8c040], [sph(0.045, 0.29, 1.36, 0, 0.3, 1, 1), 0xe8c040], [bx(0.07, 0.17, 0.11, 0.23, 0.86, 0.02), 0x0e0e0e], [bx(0.3, 0.1, 0.02, 0, 1.3, -0.15), 0xd8d8e8]);
  // Neck and head.
  B.push([cyl(0.058, 0.066, 0.13, 0, 1.56, 0), st.skin], [sph(0.13, 0, 1.7, 0.0, 0.88, 1.1, 0.98), st.skin], [sph(0.085, 0, 1.625, 0.03, 1, 0.75, 1), st.skin]);
  B.push([sph(0.028, -0.118, 1.69, -0.01, 0.6, 1, 1), st.skin], [sph(0.028, 0.118, 1.69, -0.01, 0.6, 1, 1), st.skin]); // ears
  B.push([sph(0.02, 0, 1.675, 0.128, 0.9, 1.2, 1), st.skin]); // nose
  for (const sx of [-1, 1]) {
    B.push([sph(0.022, sx * 0.045, 1.71, 0.11, 1.1, 0.8, 0.5, 10, 6), 0xf6f2ea], [sph(0.012, sx * 0.045, 1.71, 0.121, 1, 1, 0.4, 8, 6), 0x1a120c]); // eyes
    B.push([bx(0.05, 0.012, 0.012, sx * 0.047, 1.74, 0.116, 0, sx * -0.12), st.hair]); // brows
  }
  B.push([bx(0.05, 0.01, 0.01, 0, 1.625, 0.112), 0x6a2e24]); // mouth
  if (st.beard) B.push([sph(0.088, 0, 1.612, 0.036, 0.95, 0.62, 0.95), 0x3a2a20]);
  if (st.cap) B.push([cyl(0.142, 0.14, 0.09, 0, 1.79, -0.005, 1, 16), st.cap], [sph(0.142, 0, 1.83, -0.005, 1, 0.35, 1), st.cap], [cyl(0.13, 0.13, 0.012, 0, 1.765, 0.1, 0.6, 16), 0x0a0a0a],
    [sph(0.024, 0, 1.8, 0.138, 1, 1.2, 0.4), 0xe8c040], [cyl(0.145, 0.145, 0.018, 0, 1.755, -0.005, 1, 16), 0xe8c040], [sph(0.12, 0, 1.69, -0.06, 1.1, 0.8, 0.9), st.hair]);
  else hair(B, st);
  // Arm (pivot at shoulder): upper sleeve, forearm (bare for short sleeves), cuff, hand with thumb.
  const fore = st.sleeves === 'short' ? st.skin : jk;
  limb(A, jk, 0.075, 0.064, 0.3, -0.03); if (st.sleeves === 'short') A.push([cyl(0.082, 0.08, 0.12, 0, -0.27, 0), jk]);
  limb(A, fore, 0.06, 0.05, 0.28, -0.34);
  if (st.sleeves !== 'short') A.push([cyl(0.058, 0.058, 0.05, 0, -0.6, 0), tr]);
  A.push([sph(0.052, 0, -0.68, 0.01, 0.85, 1.35, 1.05), st.skin], [sph(0.022, 0.03, -0.66, 0.045, 1, 1.6, 1), st.skin]);
  // Leg (pivot at hip): thigh, shin, rounded shoe with a sole.
  limb(L, st.pants, 0.105, 0.08, 0.38, -0.05); limb(L, st.pants, 0.078, 0.06, 0.34, -0.43);
  L.push([sph(0.07, 0, -0.8, 0.05, 1.0, 0.65, 1.75), shoes], [cyl(0.072, 0.072, 0.03, 0, -0.835, 0.05, 1.75), st.sole ?? (shoes === 0xf2f2f2 || shoes === 0xf6f6f6 ? 0xd8d8d8 : 0xe8e4dc)]);
  return (cache[k] = { body: merge(B), arm: merge(A), leg: merge(L) });
}
function buildGun() {
  const g = new THREE.Group(), add = (w, h, d, x, y, z, m = gunMat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
  add(0.09, 0.13, 0.42, 0, 0, 0); add(0.04, 0.04, 0.24, 0, 0.02, 0.32, dark); add(0.06, 0.2, 0.08, 0, -0.15, 0.06, dark); add(0.05, 0.09, 0.2, 0, -0.01, -0.3, dark); add(0.03, 0.04, 0.08, 0, 0.09, 0.12, dark); add(0.06, 0.1, 0.06, 0, -0.1, -0.1, dark);
  return g;
}
export function buildCharacter(style) {
  const g = parts(style), root = new THREE.Group(), mk = (geo, x, y) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.castShadow = true; root.add(m); return m; };
  const body = mk(g.body, 0, 0), armL = mk(g.arm, -0.3, 1.45), armR = mk(g.arm, 0.3, 1.45), legL = mk(g.leg, -0.11, 0.85), legR = mk(g.leg, 0.11, 0.85);
  const gun = buildGun(); gun.position.set(0, 1.38, 0.62); gun.visible = false; root.add(gun);
  root.userData = { body, armL, armR, legL, legR, gun }; return root;
}
export function animateWalk(ch, phase, amt, aim) {
  const u = ch.userData, s = Math.sin(phase) * amt;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = aim ? -1.35 : -s * 0.8; u.armR.rotation.x = aim ? -1.5 : s * 0.8; u.armL.rotation.z = aim ? 0.42 : 0.06; u.armR.rotation.z = aim ? -0.42 : -0.06;
}
export function setGun(ch, kind) { const g = ch.userData.gun; g.visible = !!kind; if (kind) g.scale.set(1, 1, kind === 'shotgun' ? 1.5 : kind === 'smg' ? 1.1 : 0.7); }

// Smooth low-poly humanoids: merged vertex-coloured body (head, hair, face, torso, jacket), jointed arms and legs,
// optional held gun. Each style's geometry is built once and cached. Front of the character faces +z.
import * as THREE from 'three';

const cache = {}; const mat = new THREE.MeshLambertMaterial({ vertexColors: true }); const gunMat = new THREE.MeshLambertMaterial({ color: 0x15151a });
export const STYLES = {
  nico: { shirt: 0xf4f4f0, pants: 0x1f2c48, skin: 0xc68a5e, hair: 0x15110e, jacket: 0x14a39a, trim: 0x0d4f4b, shoes: 0xf6f6f6, hairStyle: 'fade', stubble: true },
  cop: { shirt: 0x1d2c5a, pants: 0x141a2e, skin: 0xe0b08c, hair: 0x2a1a10, shoes: 0x0c0c0e, cop: true, hairStyle: 'short' },
  coral: { shirt: 0xe0409a, pants: 0x30303a, skin: 0x9a6a46, hair: 0x111111, jacket: 0x2a2a34, trim: 0xe0409a, shoes: 0xf2f2f2, hairStyle: 'bun' },
  suit: { shirt: 0xe8e8e8, pants: 0x17171c, skin: 0xd8a47c, hair: 0x2a1a10, jacket: 0x17171c, trim: 0x17171c, shoes: 0x0a0a0a, hairStyle: 'short', tie: 0x8a1020 },
};
const SHIRTS = [0xf2c230, 0xe8613c, 0x4aa3df, 0x7bc67b, 0xf4f0e6, 0xb06ad8, 0xff8fa8, 0x2fc4b2, 0xffffff];
const JACKETS = [null, null, 0xd9c7a0, 0x36506e, 0x8c3a3a, 0xf0ead8, 0x3a6b4a];
const PANTS = [0x3b4a6b, 0x6b5a45, 0xd9d0b8, 0x2a2a30, 0x5a7aa0, 0xf0ece0];
const SKINS = [0xf0c8a0, 0xd9a577, 0xb07a52, 0x7a5236, 0xe8b890, 0x5a3a26];
const HAIRS = [0x111111, 0x3a2414, 0xc9a050, 0x7a2a1a, 0x8a8a8a, 0x2a1a10];
const HAIR_STYLES = ['short', 'long', 'bun', 'fade', 'curly', 'bald'];
const SHOES = [0xf2f2f2, 0x1a1a1a, 0x8a5a30, 0xe8613c, 0x4aa3df];
export const randomStyle = (rng) => {
  const jacket = rng.pick(JACKETS);
  return { shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), skin: rng.pick(SKINS), hair: rng.pick(HAIRS), hairStyle: rng.pick(HAIR_STYLES), shoes: rng.pick(SHOES), ...(jacket ? { jacket, trim: jacket } : {}) };
};

// Collects transformed primitive geometries with a flat colour each into one non-indexed buffer.
class PartBuilder {
  constructor() { this.p = []; this.n = []; this.c = []; }
  add(geo, color, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0 } = {}) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m); const col = new THREE.Color(color);
    const P = g.attributes.position.array, N = g.attributes.normal.array;
    for (let i = 0; i < P.length; i += 3) { this.p.push(P[i], P[i + 1], P[i + 2]); this.n.push(N[i], N[i + 1], N[i + 2]); this.c.push(col.r, col.g, col.b); }
    g.dispose(); return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); return g;
  }
}
const SPH = new THREE.SphereGeometry(1, 10, 8), BALL = new THREE.SphereGeometry(1, 6, 4), BOX = new THREE.BoxGeometry(1, 1, 1);
const cyl = (rt, rb, h, seg = 9) => new THREE.CylinderGeometry(rt, rb, h, seg, 1);
const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 8);
const HAIR_CAP = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.56);
const COLLAR = new THREE.TorusGeometry(0.085, 0.028, 5, 12, Math.PI * 1.35);

function headParts(b, st) {
  const hy = 1.66, sk = st.skin;
  b.add(cyl(0.055, 0.062, 0.14), sk, { y: 1.52 });                                   // neck
  b.add(SPH, sk, { y: hy, sx: 0.118, sy: 0.14, sz: 0.128 });                          // skull
  b.add(SPH, sk, { y: hy - 0.07, z: 0.025, sx: 0.088, sy: 0.07, sz: 0.095 });         // jaw
  b.add(BALL, sk, { x: -0.117, y: hy, sx: 0.022, sy: 0.035, sz: 0.025 }).add(BALL, sk, { x: 0.117, y: hy, sx: 0.022, sy: 0.035, sz: 0.025 }); // ears
  b.add(cyl(0.004, 0.022, 0.05, 4), new THREE.Color(sk).multiplyScalar(0.92), { y: hy - 0.015, z: 0.128, rx: 0.25 }); // nose
  for (const sx of [-1, 1]) {
    b.add(BALL, 0xf4f0ea, { x: sx * 0.045, y: hy + 0.018, z: 0.108, sx: 0.022, sy: 0.015, sz: 0.012 }); // eye white
    b.add(BALL, 0x18110c, { x: sx * 0.045, y: hy + 0.018, z: 0.118, sx: 0.011, sy: 0.012, sz: 0.006 }); // iris
    b.add(BOX, st.cop ? 0x2a1a10 : st.hair, { x: sx * 0.046, y: hy + 0.048, z: 0.118, sx: 0.048, sy: 0.011, sz: 0.012, rz: sx * -0.12 }); // brow
  }
  b.add(BOX, new THREE.Color(sk).multiplyScalar(0.7), { y: hy - 0.07, z: 0.113, sx: 0.045, sy: 0.009, sz: 0.01 }); // mouth
  if (st.stubble) b.add(SPH, new THREE.Color(sk).lerp(new THREE.Color(st.hair), 0.45), { y: hy - 0.08, z: 0.03, sx: 0.09, sy: 0.064, sz: 0.098 });
  const h = st.hair, hs = st.cop ? 'short' : st.hairStyle || 'short';
  if (hs !== 'bald') b.add(HAIR_CAP, h, { y: hy + 0.005, z: -0.008, sx: 0.126, sy: hs === 'curly' ? 0.17 : 0.152, sz: 0.138, rx: -0.32 });
  if (hs === 'fade') b.add(SPH, h, { y: hy + 0.11, z: 0.02, sx: 0.1, sy: 0.05, sz: 0.11, rx: -0.2 });          // swept top
  if (hs === 'long') { b.add(cap(0.11, 0.16), h, { y: hy - 0.08, z: -0.05, sz: 0.55 }); b.add(cap(0.03, 0.14), h, { x: -0.11, y: hy - 0.06, z: 0.02 }).add(cap(0.03, 0.14), h, { x: 0.11, y: hy - 0.06, z: 0.02 }); }
  if (hs === 'bun') b.add(SPH, h, { y: hy + 0.12, z: -0.08, sx: 0.06, sy: 0.055, sz: 0.06 });
  if (hs === 'curly') for (let i = 0; i < 7; i++) b.add(BALL, h, { x: Math.cos(i * 0.9) * 0.1, y: hy + 0.1 + (i % 2) * 0.03, z: Math.sin(i * 0.9) * 0.09 - 0.02, sx: 0.05, sy: 0.05, sz: 0.05 });
  if (st.cop) { // patrol cap: crown, band, visor, badge
    b.add(cyl(0.142, 0.128, 0.07, 12), 0x16203f, { y: hy + 0.135, z: -0.005, rx: -0.08 });
    b.add(cyl(0.13, 0.13, 0.035, 12), 0x0b0b10, { y: hy + 0.09 });
    b.add(cyl(0.12, 0.12, 0.012, 12, 1), 0x0b0b10, { y: hy + 0.085, z: 0.09, sz: 0.65, rx: 0.25 });
    b.add(BOX, 0xf2c230, { y: hy + 0.13, z: 0.135, sx: 0.035, sy: 0.04, sz: 0.01 });
  }
}

function torsoParts(b, st) {
  const jk = st.jacket ?? st.shirt, open = !!st.jacket;
  b.add(cyl(0.165, 0.15, 0.2, 10), st.pants, { y: 0.9, sz: 0.68 });                                  // hips
  b.add(cyl(0.16, 0.165, 0.05, 10), st.cop ? 0x0c0c0e : 0x2a2018, { y: 1.0, sz: 0.7 });             // belt
  b.add(cyl(0.215, 0.165, 0.46, 10), jk, { y: 1.24, sz: 0.62 });                                    // torso, tapered to waist
  b.add(SPH, jk, { y: 1.44, sx: 0.215, sy: 0.07, sz: 0.135 });                                       // shoulder line
  for (const sx of [-1, 1]) b.add(SPH, jk, { x: sx * 0.235, y: 1.415, sx: 0.085, sy: 0.08, sz: 0.09 }); // deltoids
  if (open) { // open jacket front showing the shirt, lapels and ribbed hem
    b.add(BOX, st.shirt, { y: 1.22, z: 0.105, sx: 0.12, sy: 0.4, sz: 0.03, rx: -0.06 });
    for (const sx of [-1, 1]) b.add(BOX, st.trim ?? jk, { x: sx * 0.07, y: 1.32, z: 0.11, sx: 0.03, sy: 0.22, sz: 0.03, rz: sx * 0.32, rx: -0.08 });
    b.add(cyl(0.218, 0.218, 0.05, 10), st.trim ?? jk, { y: 1.04, sz: 0.64 });
    if (st.tie) b.add(BOX, st.tie, { y: 1.26, z: 0.122, sx: 0.035, sy: 0.3, sz: 0.012, rx: -0.06 });
  }
  b.add(COLLAR, open ? (st.trim ?? jk) : st.shirt, { y: 1.47, z: 0.01, rx: Math.PI / 2 + 0.25, rz: Math.PI * 1.17 });
  if (st.cop) {
    b.add(BOX, 0xf2c230, { x: -0.1, y: 1.33, z: 0.125, sx: 0.045, sy: 0.055, sz: 0.012 });           // badge
    b.add(BOX, 0xd8dde8, { x: 0.1, y: 1.34, z: 0.122, sx: 0.06, sy: 0.015, sz: 0.01 });              // name bar
    b.add(BOX, 0x0c0c0e, { x: 0.12, y: 1.4, z: 0.11, sx: 0.04, sy: 0.07, sz: 0.04 });               // shoulder radio
    b.add(BOX, 0x0c0c0e, { x: 0.18, y: 0.94, z: 0.02, sx: 0.06, sy: 0.14, sz: 0.11 });               // holster
    for (const sx of [-1, 1]) b.add(BOX, 0x9fc4ff, { x: sx * 0.2, y: 1.42, z: 0, sx: 0.01, sy: 0.05, sz: 0.06, rz: sx * 0.5 }); // shoulder patches
  }
}
function armParts(b, st) {
  const jk = st.jacket ?? st.shirt, sleeve = st.jacket || st.cop ? jk : st.shirt, bare = !st.jacket && !st.cop;
  b.add(cap(0.064, 0.2), sleeve, { y: -0.16 });
  b.add(cap(0.054, 0.2), bare ? st.skin : sleeve, { y: -0.42 });
  if (!bare) b.add(cyl(0.06, 0.06, 0.045, 8), st.trim ?? jk, { y: -0.55 });
  b.add(SPH, st.skin, { y: -0.63, z: 0.01, sx: 0.045, sy: 0.07, sz: 0.035 });                        // hand
  b.add(cap(0.016, 0.04), st.skin, { x: 0.035, y: -0.6, z: 0.03, rz: 0.5 });                         // thumb
}
function legParts(b, st) {
  b.add(cyl(0.095, 0.075, 0.44, 9), st.pants, { y: -0.22 });
  b.add(cyl(0.075, 0.058, 0.36, 9), st.pants, { y: -0.6 });
  b.add(cap(0.058, 0.16), st.shoes ?? 0x111114, { y: -0.8, z: 0.045, rx: Math.PI / 2, sy: 1, sx: 1.05, sz: 0.75 }); // shoe
  b.add(BOX, 0xe8e8e8, { y: -0.845, z: 0.045, sx: 0.115, sy: 0.02, sz: 0.27 });                     // sole
}
function parts(st) {
  const k = JSON.stringify(st); if (cache[k]) return cache[k];
  const body = new PartBuilder(), arm = new PartBuilder(), leg = new PartBuilder();
  headParts(body, st); torsoParts(body, st); armParts(arm, st); legParts(leg, st);
  return (cache[k] = { body: body.build(), arm: arm.build(), leg: leg.build() });
}
const dark = new THREE.MeshLambertMaterial({ color: 0x22232a });
function buildGun() {
  const g = new THREE.Group(), add = (w, h, d, x, y, z, m = gunMat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
  add(0.07, 0.11, 0.38, 0, 0, 0); add(0.035, 0.035, 0.22, 0, 0.02, 0.29, dark); add(0.05, 0.17, 0.07, 0, -0.13, 0.05, dark); add(0.045, 0.08, 0.18, 0, -0.01, -0.27, dark); add(0.025, 0.035, 0.07, 0, 0.08, 0.1, dark); add(0.05, 0.09, 0.05, 0, -0.09, -0.09, dark);
  return g;
}
export function buildCharacter(style) {
  const g = parts(style), root = new THREE.Group(), mk = (geo, x, y) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.castShadow = true; root.add(m); return m; };
  const body = mk(g.body, 0, 0), armL = mk(g.arm, -0.27, 1.43), armR = mk(g.arm, 0.27, 1.43), legL = mk(g.leg, -0.09, 0.9), legR = mk(g.leg, 0.09, 0.9);
  armL.scale.x = -1; // mirror so the thumb faces forward on both hands
  const gun = buildGun(); gun.position.set(0, 1.4, 0.6); gun.visible = false; root.add(gun);
  root.userData = { body, armL, armR, legL, legR, gun }; return root;
}
export function animateWalk(ch, phase, amt, aim) {
  const u = ch.userData, s = Math.sin(phase) * amt, bob = Math.abs(Math.cos(phase)) * amt * 0.04;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.body.position.y = bob; u.body.rotation.y = s * 0.12;
  u.armL.rotation.x = aim ? -1.4 : -s * 0.8; u.armR.rotation.x = aim ? -1.52 : s * 0.8; u.armL.rotation.z = aim ? 0.5 : 0.06; u.armR.rotation.z = aim ? -0.32 : -0.06;
}
export function setGun(ch, kind) { const g = ch.userData.gun; g.visible = !!kind; if (kind) g.scale.set(1, 1, kind === 'shotgun' ? 1.5 : kind === 'smg' ? 1.1 : 0.7); }

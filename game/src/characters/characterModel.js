// Low-poly humanoids from boxes: merged body, animated arms and legs, optional held gun. Geometry is cached per style.
import * as THREE from 'three';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';

const cache = {}; const mat = new THREE.MeshLambertMaterial({ vertexColors: true }); const gunMat = new THREE.MeshLambertMaterial({ color: 0x15151a });
export const STYLES = {
  nico: { shirt: 0xe9eef2, pants: 0x2b3350, skin: 0xc68a5e, hair: 0x15110e, jacket: 0x1fa7a0, trim: 0xff4fd8 },
  cop: { shirt: 0x24428c, pants: 0x14192b, skin: 0xe0b08c, hair: 0x1d2b53, trim: 0x9fc4ff, cap: true },
  coral: { shirt: 0xe0409a, pants: 0x30303a, skin: 0x9a6a46, hair: 0x111111 },
  suit: { shirt: 0x15151a, pants: 0x15151a, skin: 0xd8a47c, hair: 0x2a1a10 },
};
const SHIRTS = [0xf2c230, 0xe8613c, 0x4aa3df, 0x7bc67b, 0xf4f0e6, 0xb06ad8, 0xff8fa8], PANTS = [0x3b4a6b, 0x6b5a45, 0xd9d0b8, 0x2a2a30], SKINS = [0xf0c8a0, 0xd9a577, 0xb07a52, 0x7a5236, 0xe8b890];
export const randomStyle = (rng) => ({ shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), skin: rng.pick(SKINS), hair: rng.pick([0x111111, 0x3a2414, 0xc9a050, 0x7a2a1a]) });
function parts(st) {
  const k = JSON.stringify(st); if (cache[k]) return cache[k];
  const body = newBuf(), arm = newBuf(), leg = newBuf(), jk = st.jacket ?? st.shirt, tr = st.trim ?? st.shirt;
  pushBox(body, 0, 0.85, 0, 0.6, 0.7, 0.32, jk); pushBox(body, 0, 1.45, -0.02, 0.46, 0.1, 0.36, st.jacket ? tr : st.shirt);
  if (st.jacket) { pushBox(body, 0, 0.9, 0.165, 0.16, 0.5, 0.02, st.shirt); pushBox(body, 0, 0.85, 0, 0.62, 0.05, 0.34, tr); pushBox(body, 0, 1.02, -0.165, 0.34, 0.3, 0.02, tr); pushBox(body, 0, 1.12, -0.172, 0.18, 0.1, 0.02, st.jacket); }
  if (st.cap) { pushBox(body, 0, 0.82, 0, 0.62, 0.08, 0.34, 0x0e0e12); pushBox(body, 0, 0.83, 0.175, 0.08, 0.05, 0.01, 0xf2c230); pushBox(body, 0.15, 1.2, 0.165, 0.09, 0.1, 0.02, 0xf2c230); pushBox(body, -0.2, 1.22, 0.165, 0.06, 0.1, 0.04, 0x111111); pushBox(body, 0.3, 0.55, 0.02, 0.06, 0.3, 0.14, 0x111111); pushBox(body, 0, 0.9, -0.165, 0.34, 0.16, 0.02, 0x9fc4ff); }
  pushBox(body, 0, 1.5, 0, 0.13, 0.08, 0.13, st.skin); pushBox(body, 0, 1.55, 0, 0.3, 0.3, 0.3, st.skin); pushBox(body, -0.16, 1.6, 0, 0.03, 0.08, 0.06, st.skin); pushBox(body, 0.16, 1.6, 0, 0.03, 0.08, 0.06, st.skin);
  if (st.cap) { pushBox(body, 0, 1.78, 0, 0.35, 0.1, 0.35, st.hair); pushBox(body, 0, 1.75, 0.2, 0.33, 0.03, 0.12, 0x0a0a0a); pushBox(body, 0, 1.8, 0.18, 0.05, 0.05, 0.02, 0xf2c230); pushBox(body, 0, 1.64, 0.151, 0.24, 0.05, 0.01, 0x050505); pushBox(body, 0, 1.6, -0.17, 0.32, 0.15, 0.05, 0x20180f); }
  else { pushBox(body, 0, 1.8, -0.01, 0.34, 0.08, 0.34, st.hair); pushBox(body, 0, 1.58, -0.17, 0.34, 0.25, 0.05, st.hair); pushBox(body, -0.16, 1.62, -0.02, 0.03, 0.2, 0.3, st.hair); pushBox(body, 0.16, 1.62, -0.02, 0.03, 0.2, 0.3, st.hair); pushBox(body, 0, 1.72, 0.15, 0.32, 0.08, 0.04, st.hair); pushBox(body, -0.07, 1.64, 0.151, 0.05, 0.04, 0.01, 0x111111); pushBox(body, 0.07, 1.64, 0.151, 0.05, 0.04, 0.01, 0x111111); }
  pushBox(arm, 0, -0.55, 0, 0.18, 0.55, 0.18, jk); pushBox(arm, 0, -0.6, 0, 0.195, 0.05, 0.195, tr); pushBox(arm, 0, -0.75, 0, 0.15, 0.15, 0.15, st.skin);
  pushBox(leg, 0, -0.85, 0, 0.24, 0.85, 0.26, st.pants); pushBox(leg, 0, -0.85, 0.03, 0.27, 0.2, 0.34, 0x111114);
  return (cache[k] = { body: toGeometry(body), arm: toGeometry(arm), leg: toGeometry(leg) });
}
const dark = new THREE.MeshLambertMaterial({ color: 0x22232a });
function buildGun() {
  const g = new THREE.Group(), add = (w, h, d, x, y, z, m = gunMat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
  add(0.09, 0.13, 0.42, 0, 0, 0); add(0.04, 0.04, 0.24, 0, 0.02, 0.32, dark); add(0.06, 0.2, 0.08, 0, -0.15, 0.06, dark); add(0.05, 0.09, 0.2, 0, -0.01, -0.3, dark); add(0.03, 0.04, 0.08, 0, 0.09, 0.12, dark); add(0.06, 0.1, 0.06, 0, -0.1, -0.1, dark);
  return g;
}
export function buildCharacter(style) {
  const g = parts(style), root = new THREE.Group(), mk = (geo, x, y) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.castShadow = true; root.add(m); return m; };
  const body = mk(g.body, 0, 0), armL = mk(g.arm, -0.38, 1.5), armR = mk(g.arm, 0.38, 1.5), legL = mk(g.leg, -0.14, 0.85), legR = mk(g.leg, 0.14, 0.85);
  const gun = buildGun(); gun.position.set(0, 1.38, 0.62); gun.visible = false; root.add(gun);
  root.userData = { body, armL, armR, legL, legR, gun }; return root;
}
export function animateWalk(ch, phase, amt, aim) {
  const u = ch.userData, s = Math.sin(phase) * amt;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = aim ? -1.35 : -s * 0.8; u.armR.rotation.x = aim ? -1.5 : s * 0.8; u.armL.rotation.z = aim ? 0.42 : 0; u.armR.rotation.z = aim ? -0.42 : 0;
}
export function setGun(ch, kind) { const g = ch.userData.gun; g.visible = !!kind; if (kind) g.scale.set(1, 1, kind === 'shotgun' ? 1.5 : kind === 'smg' ? 1.1 : 0.7); }

// Low-poly humanoids from boxes: merged body, animated arms and legs, optional held gun. Geometry is cached per style.
import * as THREE from 'three';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';

const cache = {}; const mat = new THREE.MeshLambertMaterial({ vertexColors: true }); const gunMat = new THREE.MeshLambertMaterial({ color: 0x15151a });
export const STYLES = {
  nico: { shirt: 0x1fa7a0, pants: 0xe8e2d0, skin: 0xc68a5e, hair: 0x15110e },
  cop: { shirt: 0x1d2b53, pants: 0x14192b, skin: 0xe0b08c, hair: 0x1d2b53, cap: true },
  coral: { shirt: 0xe0409a, pants: 0x30303a, skin: 0x9a6a46, hair: 0x111111 },
  suit: { shirt: 0x15151a, pants: 0x15151a, skin: 0xd8a47c, hair: 0x2a1a10 },
};
const SHIRTS = [0xf2c230, 0xe8613c, 0x4aa3df, 0x7bc67b, 0xf4f0e6, 0xb06ad8, 0xff8fa8], PANTS = [0x3b4a6b, 0x6b5a45, 0xd9d0b8, 0x2a2a30], SKINS = [0xf0c8a0, 0xd9a577, 0xb07a52, 0x7a5236, 0xe8b890];
export const randomStyle = (rng) => ({ shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), skin: rng.pick(SKINS), hair: rng.pick([0x111111, 0x3a2414, 0xc9a050, 0x7a2a1a]) });
function parts(st) {
  const k = JSON.stringify(st); if (cache[k]) return cache[k];
  const body = newBuf(), arm = newBuf(), leg = newBuf();
  pushBox(body, 0, 0.85, 0, 0.6, 0.7, 0.32, st.shirt); pushBox(body, 0, 1.55, 0, 0.3, 0.3, 0.3, st.skin); pushBox(body, 0, 1.8, -0.02, 0.33, 0.12, 0.34, st.hair);
  if (st.cap) pushBox(body, 0, 1.78, 0.18, 0.3, 0.04, 0.22, st.hair);
  pushBox(arm, 0, -0.62, 0, 0.16, 0.62, 0.16, st.shirt); pushBox(arm, 0, -0.74, 0, 0.17, 0.14, 0.17, st.skin);
  pushBox(leg, 0, -0.85, 0, 0.24, 0.85, 0.26, st.pants);
  return (cache[k] = { body: toGeometry(body), arm: toGeometry(arm), leg: toGeometry(leg) });
}
export function buildCharacter(style) {
  const g = parts(style), root = new THREE.Group(), mk = (geo, x, y) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.castShadow = true; root.add(m); return m; };
  const body = mk(g.body, 0, 0), armL = mk(g.arm, -0.38, 1.5), armR = mk(g.arm, 0.38, 1.5), legL = mk(g.leg, -0.14, 0.85), legR = mk(g.leg, 0.14, 0.85);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.55), gunMat); gun.position.set(-0.3, 1.2, 0.42); gun.visible = false; root.add(gun);
  root.userData = { body, armL, armR, legL, legR, gun }; return root;
}
export function animateWalk(ch, phase, amt, aim) {
  const u = ch.userData, s = Math.sin(phase) * amt;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = aim ? -1.3 : -s * 0.8; u.armR.rotation.x = aim ? -1.5 : s * 0.8;
}
export function setGun(ch, kind) { const g = ch.userData.gun; g.visible = !!kind; if (kind) g.scale.set(1, 1, kind === 'shotgun' ? 1.5 : kind === 'smg' ? 1.1 : 0.7); }

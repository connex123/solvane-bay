// Original car models built from boxes: shared merged geometry per model, tinted body material per colour.
import * as THREE from 'three';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';

export const CAR_TYPES = {
  veloce: { name: 'Veloce GT', len: 4.5, wid: 1.95, cab: [0.4, 0.38, -0.3], roof: 1.2, max: 62, acc: 24, grip: 7, steer: 0.62, hp: 900, tint: 0xe83a5c },
  marlin: { name: 'Marlin Sedan', len: 4.7, wid: 1.9, cab: [0.5, 0.5, -0.15], roof: 1.4, max: 40, acc: 15, grip: 8, steer: 0.6, hp: 1000, tint: 0x2f7fd8 },
  tupelo: { name: 'Tupelo Cab', len: 4.7, wid: 1.9, cab: [0.5, 0.5, -0.15], roof: 1.4, max: 40, acc: 15, grip: 8, steer: 0.6, hp: 1000, tint: 0xf2c230 },
  cadia: { name: 'Cadia Pickup', len: 5.1, wid: 2.0, cab: [0.34, 0.6, 0.55], roof: 1.7, max: 38, acc: 14, grip: 7, steer: 0.55, hp: 1100, tint: 0x2fb89a },
  hawke: { name: 'Hawke SUV', len: 4.9, wid: 2.0, cab: [0.62, 0.62, -0.1], roof: 1.75, max: 42, acc: 16, grip: 7.5, steer: 0.55, hp: 1300, tint: 0x222831 },
  rumble: { name: 'Rumble 69', len: 4.8, wid: 1.95, cab: [0.42, 0.42, -0.25], roof: 1.3, max: 52, acc: 22, grip: 6, steer: 0.6, hp: 1000, tint: 0xff8a3d },
  interceptor: { name: 'SBPD Interceptor', len: 4.8, wid: 1.95, cab: [0.46, 0.46, -0.15], roof: 1.4, max: 52, acc: 20, grip: 8, steer: 0.62, hp: 900, tint: 0xffffff, police: true },
};
const geoCache = {}, matCache = {};
const trimMat = new THREE.MeshLambertMaterial({ vertexColors: true });
function build(key) {
  const t = CAR_TYPES[key], W = t.wid, L = t.len, body = newBuf(), trim = newBuf(), [cl, ch, co] = t.cab;
  pushBox(body, 0, 0.35, 0, W, 0.55, L, 0xffffff);
  if (key === 'cadia') { pushBox(body, 0, 0.9, -L * 0.3, W * 0.95, 0.3, L * 0.38, 0xffffff); }
  pushBox(trim, 0, 0.92, co * L * 0.3, W * 0.88, ch * 0.82, L * cl, 0x1a2230);
  pushBox(body, 0, 0.92 + ch * 0.82, co * L * 0.3, W * 0.8, 0.07, L * cl * 0.92, 0xffffff);
  if (key === 'rumble') pushBox(body, 0, 0.9, L * 0.28, 0.5, 0.12, 0.8, 0x111111);
  if (key === 'veloce') pushBox(body, 0, 0.98, -L * 0.46, W * 0.9, 0.1, 0.5, 0x111111);
  if (t.police) { pushBox(body, 0, 0.45, 0, W + 0.04, 0.2, L * 0.55, 0x101820); pushBox(body, 0, 0.9, L * 0.28, W * 0.5, 0.04, 0.9, 0x101820); }
  if (key === 'tupelo') pushBox(trim, 0, 0.92 + ch * 0.82 + 0.07, 0, 0.7, 0.22, 0.3, 0xfff2b0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) pushBox(trim, sx * (W / 2 - 0.05), 0, sz * L * 0.32, 0.3, 0.7, 0.7, 0x15151a);
    pushBox(trim, sx * (W / 2 - 0.35), 0.62, L / 2 + 0.01, 0.4, 0.18, 0.06, 0xfff4c0);
    pushBox(trim, sx * (W / 2 - 0.35), 0.62, -L / 2 - 0.01, 0.4, 0.18, 0.06, 0xff2a2a);
  }
  pushBox(trim, 0, 0.3, L / 2, W, 0.2, 0.12, 0x222226); pushBox(trim, 0, 0.3, -L / 2, W, 0.2, 0.12, 0x222226);
  return { body: toGeometry(body), trim: toGeometry(trim) };
}
export function buildCarMesh(key, tint) {
  const g = geoCache[key] || (geoCache[key] = build(key)); const t = CAR_TYPES[key], c = tint ?? t.tint;
  const mk = `${key}${c}`; const mat = matCache[mk] || (matCache[mk] = new THREE.MeshLambertMaterial({ color: c, vertexColors: true }));
  const grp = new THREE.Group(); const a = new THREE.Mesh(g.body, mat), b = new THREE.Mesh(g.trim, trimMat); a.castShadow = b.castShadow = true; grp.add(a, b); grp.userData.bodyMesh = a;
  if (t.police) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.35), new THREE.MeshBasicMaterial({ color: 0xff3040 })), bl = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.35), new THREE.MeshBasicMaterial({ color: 0x4080ff }));
    r.position.set(-0.4, t.roof + 0.05, 0); bl.position.set(0.4, t.roof + 0.05, 0); grp.add(r, bl); grp.userData.bar = { r, b: bl };
  }
  return grp;
}
export const CIVIL_TYPES = ['marlin', 'marlin', 'tupelo', 'cadia', 'hawke', 'rumble', 'veloce'];
export const burntMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a, vertexColors: true });

// Wren's garage: an open-front workshop on the Point Wren corner of the Crown Heights avenue. One drive-in bay with
// a lift, a tool wall, tyre stacks, a red tool chest, a shelf of respray cans, warm strip lights and a painted sign.
// The upgrade screen itself lives in shop/garageShop.js; this file only builds the place and its walls.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { lineCoord } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { addBox } from './collision.js';

// footprint: x0..x1 along the avenue, back wall at z0, open front at z1 facing the avenue (south)
export const WORKSHOP = { x0: lineCoord(2) - 24, x1: lineCoord(2) - 10, z0: lineCoord(3) - 22, z1: lineCoord(3) - 8, h: 5.4 };
export const BAY = { x: (WORKSHOP.x0 + WORKSHOP.x1) / 2, z: WORKSHOP.z0 + 7.5 }; // where the car stands on the lift
export const LIFT = { y: 1.0, track: 0.85, half: 2.7 }; // runway top height, runway centre offset, half length
const PAINTS = [0xd01020, 0x2fd6c4, 0xffd23c, 0x15151a, 0xff6a4f, 0xf0f0f0];

function signTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#0f4650'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#ff6a4f'; g.fillRect(0, 112, 1024, 16);
  g.font = 'bold 76px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd23c'; g.fillText("WREN'S GARAGE", 380, 60); g.font = 'bold 40px "Arial Black", sans-serif'; g.fillStyle = '#fff4e0'; g.fillText('TUNE · ARMOUR · RESPRAY', 820, 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildWrenGarage(scene) {
  const { x0, x1, z0, z1, h } = WORKSHOP, cx = (x0 + x1) / 2, w = x1 - x0, d = z1 - z0, B = newBuf(), L = newBuf();
  pushBox(B, cx, 0.3, (z0 + z1) / 2, w, 0.06, d, 0xb9b2a6); // concrete floor (over the park grass)
  pushBox(B, cx, 0.36, z1 - 0.3, w, 0.02, 0.4, 0xffc93c); for (const sx of [-3.2, 3.2]) pushBox(B, BAY.x + sx, 0.36, BAY.z, 0.18, 0.02, 9, 0xffc93c); // bay lines
  pushBox(B, cx, 0, z0 + 0.2, w, h, 0.4, 0x8fd3c8); // back wall
  for (const x of [x0 + 0.2, x1 - 0.2]) { pushBox(B, x, 0, (z0 + z1) / 2, 0.4, h, d, 0xead2a4); pushBox(B, x, 0, (z0 + z1) / 2, 0.46, 0.9, d + 0.06, 0xff6a4f); } // side walls with a coral skirting
  pushBox(B, cx, h, (z0 + z1) / 2, w + 0.8, 0.35, d + 0.8, 0xe8dccb); pushBox(B, cx, h - 0.9, z1 + 0.1, w + 0.8, 0.9, 0.3, 0x0f4650); // roof and fascia under the sign
  for (const x of [x0 + 0.3, x1 - 0.3]) pushBox(B, x, 0, z1 + 0.05, 0.7, h, 0.7, 0xfff4e6); // front pillars
  // the lift: a four-post drive-on lift, two yellow runways the tyres stand on, a steel drip tray between them, yellow posts
  // with crossbeams at both ends, ramps down to the floor on the street side and an oil-dark patch under it all
  const { y: ry, track, half } = LIFT;
  for (const sx of [-1, 1]) { pushBox(B, BAY.x + sx * track, ry - 0.2, BAY.z, 0.6, 0.2, half * 2, 0xffc93c); pushBox(B, BAY.x + sx * (track + 0.33), ry - 0.12, BAY.z, 0.06, 0.2, half * 2, 0x2a2e33); // runway and its lip
    for (let k = 0; k < 3; k++) pushBox(B, BAY.x + sx * track, 0.36, BAY.z + half + 0.3 + k * 0.55, 0.6, (ry - 0.36) * (3 - k) / 4, 0.55, 0xe0b030); // stepped ramp
    for (const sz of [-1, 1]) { pushBox(B, BAY.x + sx * 1.55, 0.36, BAY.z + sz * (half + 0.05), 0.2, 2.5, 0.2, 0xffc93c); pushBox(B, BAY.x + sx * 1.55, 2.86, BAY.z + sz * (half + 0.05), 0.28, 0.08, 0.28, 0x2fb8a8); } }
  for (const sz of [-1, 1]) pushBox(B, BAY.x, ry - 0.34, BAY.z + sz * (half + 0.05), 3.3, 0.16, 0.24, 0xb8bec4); // crossbeams under the runway ends
  pushBox(B, BAY.x, ry - 0.2, BAY.z, track * 2 - 0.6, 0.06, half * 2 - 0.6, 0xa8b0b6); // drip tray
  pushBox(B, BAY.x, 0.36, BAY.z, 3.4, 0.01, half * 2 + 0.4, 0xa29a8c); // the floor stain under the lift
  pushBox(B, x1 - 0.46, 1.1, z0 + 4.2, 0.12, 2.2, 5.6, 0x3a4a50); // pegboard
  const tools = [0xff6a4f, 0xffd23c, 0x2fd6c4, 0xf0f0f0, 0xe8402c, 0x9aa4b0];
  for (let k = 0; k < 14; k++) pushBox(B, x1 - 0.56, 1.35 + Math.floor(k / 7) * 0.95, z0 + 1.8 + (k % 7) * 0.8, 0.08, 0.55 - (k % 2) * 0.2, 0.16 + (k % 3) * 0.1, tools[k % tools.length]);
  // red tool chest, tyre stacks, a workbench and the shelf of respray cans in the six paint colours
  pushBox(B, x1 - 0.85, 0.35, z0 + 9.6, 0.7, 1.15, 1.6, 0xd8282c); for (let k = 0; k < 4; k++) pushBox(B, x1 - 1.22, 0.55 + k * 0.25, z0 + 9.6, 0.02, 0.04, 1.4, 0xf0f0f0);
  for (const [tx, tz, n] of [[x1 - 1.1, z0 + 1.3, 4], [x1 - 1.1, z0 + 2.5, 3], [x1 - 2.2, z0 + 1.2, 2]]) for (let k = 0; k < n; k++) pushBox(B, tx, 0.35 + k * 0.32, tz, 0.95, 0.3, 0.95, 0x1c1f22);
  pushBox(B, x0 + 0.75, 0.35, z0 + 6, 1.1, 0.95, 3.2, 0x8a6a4a); pushBox(B, x0 + 0.75, 1.3, z0 + 6, 1.2, 0.08, 3.3, 0x5a4634); // workbench
  pushBox(B, x1 - 0.55, 3.5, z0 + 4.2, 0.5, 0.06, 4.0, 0x5a4634); PAINTS.forEach((c, k) => pushBox(B, x1 - 0.55, 3.56, z0 + 2.7 + k * 0.6, 0.32, 0.42, 0.32, c));
  pushBox(B, cx, h + 0.17, z1 + 0.3, w + 0.8, (w + 0.6) / 8 + 0.4, 0.2, 0x0f4650); // sign board
  // warm strip lights under the roof (HDR so they bloom) and one warm work light inside
  for (const sz of [-4.5, 0, 4.5]) pushBox(L, cx, h - 0.25, (z0 + z1) / 2 + sz, w - 3, 0.12, 0.35, 0xffffff);
  const m = new THREE.Mesh(toGeometry(B), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = m.receiveShadow = true; scene.add(m);
  scene.add(new THREE.Mesh(toGeometry(L), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.7) })));
  // the ceiling seen from inside (box tops only face up), and the shop's name painted again high on the tool wall
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x8a8070 })); ceil.position.set(cx, h - 0.02, (z0 + z1) / 2); scene.add(ceil);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.75), new THREE.MeshBasicMaterial({ map: signTexture() })); inner.rotation.y = -Math.PI / 2; inner.position.set(x1 - 0.42, 4.5, z0 + 6); scene.add(inner);
  const lamp = new THREE.PointLight(0xffd2a0, 55, 17, 1.3); lamp.position.set(cx, h - 1, (z0 + z1) / 2 + 1); scene.add(lamp); G.garageLamp = lamp;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.6, (w + 0.6) / 8), new THREE.MeshBasicMaterial({ map: signTexture() })); sign.position.set(cx, h + 0.35 + (w + 0.6) / 16, z1 + 0.42); scene.add(sign);
  // walls are solid for cars and people; the front stays open
  addBox({ x0, x1, z0: z0 - 0.2, z1: z0 + 0.6, h }); addBox({ x0: x0 - 0.2, x1: x0 + 0.6, z0, z1, h }); addBox({ x0: x1 - 0.6, x1: x1 + 0.2, z0, z1, h });
  // nothing from the park may grow through the roof
  for (const pp of [G.palmProps, ...(G.treeProps || [])]) { if (!pp) continue; const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    pp.list.forEach((it, i) => { if (it.x > x0 - 3 && it.x < x1 + 3 && it.z > z0 - 3 && it.z < z1 + 3) pp.mesh.setMatrixAt(i, zero); }); pp.mesh.instanceMatrix.needsUpdate = true; }
}

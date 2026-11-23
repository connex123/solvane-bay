// Wren's garage: an open-fronted workshop on the Point Wren corner of the Crown Heights avenue. One drive-in bay
// with a four-post lift, a tool wall, tyre stacks, a red tool chest, a shelf of respray cans, warm strip lights and
// a painted sign. This file only builds the place and its walls; the upgrade screen is shop/garageShop.js.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { lineCoord } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { addBox } from './collision.js';

// Footprint: x0..x1 along the avenue, the back wall at z0, the open front at z1 facing the avenue (south).
export const WORKSHOP = { x0: lineCoord(2) - 24, x1: lineCoord(2) - 10, z0: lineCoord(3) - 22, z1: lineCoord(3) - 8, h: 5.4 };
// Where a car stands on the lift.
export const BAY = { x: (WORKSHOP.x0 + WORKSHOP.x1) / 2, z: WORKSHOP.z0 + 7.5 };
// Runway top height, runway centre offset from the bay centre, half the runway length.
export const LIFT = { y: 1.0, track: 0.85, half: 2.7 };

const RESPRAY_CANS = [0xd01020, 0x2fd6c4, 0xffd23c, 0x15151a, 0xff6a4f, 0xf0f0f0];
const TOOL_COLOURS = [0xff6a4f, 0xffd23c, 0x2fd6c4, 0xf0f0f0, 0xe8402c, 0x9aa4b0];
const LIFT_YELLOW = 0xffc93c;
const SIGN_NAVY = 0x0f4650;
const FLOOR_TOP = 0.36;

function shopSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = '#0f4650';
  g.fillRect(0, 0, 1024, 128);
  g.fillStyle = '#ff6a4f';
  g.fillRect(0, 112, 1024, 16); // coral underline
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // both lines get a max width so they never overlap, whichever fonts are installed
  g.font = 'bold 76px Impact, "Arial Black", sans-serif';
  g.fillStyle = '#ffd23c';
  g.fillText("WREN'S GARAGE", 360, 60, 640);
  g.font = 'bold 40px "Arial Black", sans-serif';
  g.fillStyle = '#fff4e0';
  g.fillText('TUNE · ARMOUR · RESPRAY', 860, 60, 290);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function shell(buf, ws, mid) {
  const { x0, x1, z0, z1, h } = ws;
  pushBox(buf, mid.x, 0.3, mid.z, mid.w, 0.06, mid.d, 0xb9b2a6); // concrete floor over the park grass
  pushBox(buf, mid.x, FLOOR_TOP, z1 - 0.3, mid.w, 0.02, 0.4, LIFT_YELLOW); // painted bay lines
  for (const side of [-3.2, 3.2]) pushBox(buf, BAY.x + side, FLOOR_TOP, BAY.z, 0.18, 0.02, 9, LIFT_YELLOW);
  pushBox(buf, mid.x, 0, z0 + 0.2, mid.w, h, 0.4, 0x8fd3c8); // back wall
  for (const x of [x0 + 0.2, x1 - 0.2]) {
    pushBox(buf, x, 0, mid.z, 0.4, h, mid.d, 0xead2a4); // side wall
    pushBox(buf, x, 0, mid.z, 0.46, 0.9, mid.d + 0.06, 0xff6a4f); // coral skirting
  }
  pushBox(buf, mid.x, h, mid.z, mid.w + 0.8, 0.35, mid.d + 0.8, 0xe8dccb); // roof
  pushBox(buf, mid.x, h - 0.9, z1 + 0.1, mid.w + 0.8, 0.9, 0.3, SIGN_NAVY); // fascia under the sign
  for (const x of [x0 + 0.3, x1 - 0.3]) pushBox(buf, x, 0, z1 + 0.05, 0.7, h, 0.7, 0xfff4e6); // front pillars
}

// A four-post drive-on lift: two yellow runways the tyres stand on (with stepped ramps down to the floor on the
// street side), yellow posts with teal caps, crossbeams under the runway ends, a drip tray, and an oil stain.
function fourPostLift(buf) {
  const { y: top, track, half } = LIFT;
  for (const side of [-1, 1]) {
    pushBox(buf, BAY.x + side * track, top - 0.2, BAY.z, 0.6, 0.2, half * 2, LIFT_YELLOW); // runway
    pushBox(buf, BAY.x + side * (track + 0.33), top - 0.12, BAY.z, 0.06, 0.2, half * 2, 0x2a2e33); // its lip
    for (let step = 0; step < 3; step++) {
      const rise = ((top - FLOOR_TOP) * (3 - step)) / 4;
      pushBox(buf, BAY.x + side * track, FLOOR_TOP, BAY.z + half + 0.3 + step * 0.55, 0.6, rise, 0.55, 0xe0b030);
    }
    for (const end of [-1, 1]) {
      const postZ = BAY.z + end * (half + 0.05);
      pushBox(buf, BAY.x + side * 1.55, FLOOR_TOP, postZ, 0.2, 2.5, 0.2, LIFT_YELLOW);
      pushBox(buf, BAY.x + side * 1.55, 2.86, postZ, 0.28, 0.08, 0.28, 0x2fb8a8);
    }
  }
  for (const end of [-1, 1]) pushBox(buf, BAY.x, top - 0.34, BAY.z + end * (half + 0.05), 3.3, 0.16, 0.24, 0xb8bec4);
  pushBox(buf, BAY.x, top - 0.2, BAY.z, track * 2 - 0.6, 0.06, half * 2 - 0.6, 0xa8b0b6); // drip tray
  pushBox(buf, BAY.x, FLOOR_TOP, BAY.z, 3.4, 0.01, half * 2 + 0.4, 0xa29a8c); // stain
}

// Tool wall with hanging tools, a red tool chest, tyre stacks, the workbench and the shelf of respray cans.
function fittings(buf, ws) {
  const { x0, x1, z0 } = ws;
  pushBox(buf, x1 - 0.46, 1.1, z0 + 4.2, 0.12, 2.2, 5.6, 0x3a4a50); // pegboard
  for (let k = 0; k < 14; k++) {
    const row = Math.floor(k / 7), col = k % 7;
    pushBox(buf, x1 - 0.56, 1.35 + row * 0.95, z0 + 1.8 + col * 0.8, 0.08, 0.55 - (k % 2) * 0.2, 0.16 + (k % 3) * 0.1, TOOL_COLOURS[k % TOOL_COLOURS.length]);
  }
  pushBox(buf, x1 - 0.85, 0.35, z0 + 9.6, 0.7, 1.15, 1.6, 0xd8282c); // tool chest
  for (let drawer = 0; drawer < 4; drawer++) pushBox(buf, x1 - 1.22, 0.55 + drawer * 0.25, z0 + 9.6, 0.02, 0.04, 1.4, 0xf0f0f0);
  const tyreStacks = [[x1 - 1.1, z0 + 1.3, 4], [x1 - 1.1, z0 + 2.5, 3], [x1 - 2.2, z0 + 1.2, 2]];
  for (const [tx, tz, count] of tyreStacks) {
    for (let k = 0; k < count; k++) pushBox(buf, tx, 0.35 + k * 0.32, tz, 0.95, 0.3, 0.95, 0x1c1f22);
  }
  pushBox(buf, x0 + 0.75, 0.35, z0 + 6, 1.1, 0.95, 3.2, 0x8a6a4a); // workbench
  pushBox(buf, x0 + 0.75, 1.3, z0 + 6, 1.2, 0.08, 3.3, 0x5a4634); // its top
  pushBox(buf, x1 - 0.55, 3.5, z0 + 4.2, 0.5, 0.06, 4.0, 0x5a4634); // paint shelf
  RESPRAY_CANS.forEach((colour, k) => pushBox(buf, x1 - 0.55, 3.56, z0 + 2.7 + k * 0.6, 0.32, 0.42, 0.32, colour));
}

// Zero the instance matrices of park palms and trees under the roof so nothing grows through it.
function clearPlantsUnderRoof(ws) {
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const props of [G.palmProps, ...(G.treeProps || [])]) {
    if (!props) continue;
    props.list.forEach((item, i) => {
      const under = item.x > ws.x0 - 3 && item.x < ws.x1 + 3 && item.z > ws.z0 - 3 && item.z < ws.z1 + 3;
      if (under) props.mesh.setMatrixAt(i, hidden);
    });
    props.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function buildWrenGarage(scene) {
  const ws = WORKSHOP;
  const { x0, x1, z0, z1, h } = ws;
  const mid = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
  const solid = newBuf();
  const strips = newBuf();
  shell(solid, ws, mid);
  fourPostLift(solid);
  fittings(solid, ws);
  const signHeight = (mid.w + 0.6) / 8;
  pushBox(solid, mid.x, h + 0.17, z1 + 0.3, mid.w + 0.8, signHeight + 0.4, 0.2, SIGN_NAVY); // sign board
  for (const dz of [-4.5, 0, 4.5]) pushBox(strips, mid.x, h - 0.25, mid.z + dz, mid.w - 3, 0.12, 0.35, 0xffffff); // strip lights

  const body = new THREE.Mesh(toGeometry(solid), new THREE.MeshLambertMaterial({ vertexColors: true }));
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);
  scene.add(new THREE.Mesh(toGeometry(strips), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.7) }))); // HDR: blooms

  // the ceiling seen from inside (merged box tops only face up)
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(mid.w, mid.d).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xd8cbb4, emissive: 0x302418 }));
  ceiling.position.set(mid.x, h - 0.02, mid.z);
  scene.add(ceiling);
  // the shop's name again, painted high on the tool wall
  const wallSign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.75), new THREE.MeshBasicMaterial({ map: shopSignTexture() }));
  wallSign.rotation.y = -Math.PI / 2;
  wallSign.position.set(x1 - 0.42, 4.5, z0 + 6);
  scene.add(wallSign);
  const workLight = new THREE.PointLight(0xffd2a0, 75, 18, 1.3);
  workLight.position.set(mid.x, h - 1, mid.z + 1);
  scene.add(workLight);
  G.garageLamp = workLight;
  const frontSign = new THREE.Mesh(new THREE.PlaneGeometry(mid.w + 0.6, signHeight), new THREE.MeshBasicMaterial({ map: shopSignTexture() }));
  frontSign.position.set(mid.x, h + 0.35 + signHeight / 2, z1 + 0.42);
  scene.add(frontSign);

  // back and side walls are solid for cars and people; the front stays open
  addBox({ x0, x1, z0: z0 - 0.2, z1: z0 + 0.6, h });
  addBox({ x0: x0 - 0.2, x1: x0 + 0.6, z0, z1, h });
  addBox({ x0: x1 - 0.6, x1: x1 + 0.2, z0, z1, h });
  clearPlantsUnderRoof(ws);
}

// Merged-geometry helpers: many boxes packed into one vertex-coloured buffer (open at the bottom),
// with world-scaled UVs on the walls so a window texture tiles at a fixed size; plus an instancing shortcut.
import * as THREE from 'three';

const WINDOW_TILE = 16; // metres per texture repeat
const FLAT_UV = 0.02; // a texel inside the plain (window-free) corner of the atlas

// Each wall: outward normal, the axis it is fixed on, the axis it runs along, and where that run starts,
// so the quad's corners go bottom-start, bottom-end, top-end, top-start (counter-clockwise from outside).
const WALLS = [
  { normal: [1, 0, 0], fixed: 0, at: 1, run: 2, from: 1 },
  { normal: [-1, 0, 0], fixed: 0, at: 0, run: 2, from: 0 },
  { normal: [0, 0, 1], fixed: 2, at: 1, run: 0, from: 0 },
  { normal: [0, 0, -1], fixed: 2, at: 0, run: 0, from: 1 },
];

function wallCorners(wall) {
  const corners = [];
  const heights = [0, 0, 1, 1];
  const runs = [wall.from, 1 - wall.from, 1 - wall.from, wall.from];
  for (let k = 0; k < 4; k++) {
    const c = [0, heights[k], 0];
    c[wall.fixed] = wall.at;
    c[wall.run] = runs[k];
    corners.push(c);
  }
  return corners;
}

const FACES = WALLS.map((wall) => ({ normal: wall.normal, corners: wallCorners(wall), uvAxis: wall.run }));
FACES.push({ normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uvAxis: -1 });

const TRIANGLES = [0, 1, 2, 0, 2, 3];

export const newBuf = () => ({ p: [], n: [], u: [], c: [] });

/**
 * Append a box to buffer b. (cx, cz) is the footprint centre, y0 the base height, w/h/d the size.
 * With win set, walls get world-scaled UVs (offset by uo) so the window texture lines up.
 */
export function pushBox(b, cx, y0, cz, w, h, d, color, win = false, uo = 0) {
  const tint = new THREE.Color(color);
  const size = [w, h, d];
  for (const face of FACES) {
    const tiled = win && face.uvAxis >= 0;
    for (const corner of TRIANGLES.map((k) => face.corners[k])) {
      b.p.push(cx + (corner[0] - 0.5) * w, y0 + corner[1] * h, cz + (corner[2] - 0.5) * d);
      b.n.push(...face.normal);
      b.c.push(tint.r, tint.g, tint.b);
      if (tiled) {
        b.u.push((corner[face.uvAxis] * size[face.uvAxis]) / WINDOW_TILE + uo, (corner[1] * h) / WINDOW_TILE);
      } else {
        b.u.push(FLAT_UV, FLAT_UV);
      }
    }
  }
}

/** Turn a filled buffer into a BufferGeometry. */
export function toGeometry(b) {
  const geometry = new THREE.BufferGeometry();
  const attrs = [['position', b.p, 3], ['normal', b.n, 3], ['uv', b.u, 2], ['color', b.c, 3]];
  for (const [name, data, width] of attrs) {
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(data, width));
  }
  geometry.computeBoundingSphere();
  return geometry;
}

/** One InstancedMesh placing geo at each item's x/y/z with optional yaw (ry) and uniform scale (s). */
export function inst(geo, mat, items) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  const placer = new THREE.Object3D();
  items.forEach((item, index) => {
    placer.position.set(item.x, item.y || 0, item.z);
    placer.rotation.set(0, item.ry || 0, 0);
    placer.scale.setScalar(item.s || 1);
    placer.updateMatrix();
    mesh.setMatrixAt(index, placer.matrix);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

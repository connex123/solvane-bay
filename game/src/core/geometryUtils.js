// Tiny merged-geometry helpers: boxes pushed into one vertex-coloured buffer (windows tile via world-scaled UVs).
import * as THREE from 'three';
const F = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], ax: 2 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], ax: 2 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], ax: 0 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], ax: 0 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], ax: -1 },
];
const IDX = [0, 1, 2, 0, 2, 3];
export const newBuf = () => ({ p: [], n: [], u: [], c: [] });
export function pushBox(b, cx, y0, cz, w, h, d, color, win = false, uo = 0) {
  const col = new THREE.Color(color); const dims = [w, h, d];
  for (const f of F) for (const k of IDX) {
    const c = f.c[k];
    b.p.push(cx + (c[0] - 0.5) * w, y0 + c[1] * h, cz + (c[2] - 0.5) * d);
    b.n.push(f.n[0], f.n[1], f.n[2]); b.c.push(col.r, col.g, col.b);
    if (f.ax < 0 || !win) b.u.push(0.02, 0.02); else b.u.push(c[f.ax] * dims[f.ax] / 16 + uo, c[1] * h / 16);
  }
}
export function toGeometry(b) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
  g.computeBoundingSphere();
  return g;
}
export function inst(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length)); const o = new THREE.Object3D();
  items.forEach((it, i) => { o.position.set(it.x, it.y || 0, it.z); o.rotation.set(0, it.ry || 0, 0); o.scale.setScalar(it.s || 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.count = items.length; m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; return m;
}

// Static building colliders in a spatial hash: circle push-out and ray marching for bullets and the camera.
const CELL = 32; const grid = new Map(); export const boxes = [];
const key = (cx, cz) => cx * 4096 + cz;
export function clearBoxes() { boxes.length = 0; grid.clear(); }
export function addBox(b) {
  boxes.push(b);
  for (let cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++) for (let cz = Math.floor(b.z0 / CELL); cz <= Math.floor(b.z1 / CELL); cz++) {
    const k = key(cx, cz); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(b);
  }
}
const out = { hit: false, dx: 0, dz: 0, nx: 0, nz: 0 };
export function resolveCircle(x, z, r) {
  out.hit = false; out.dx = 0; out.dz = 0; out.nx = 0; out.nz = 0;
  const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL), d0 = Math.floor((z - r) / CELL), d1 = Math.floor((z + r) / CELL);
  for (let cx = c0; cx <= c1; cx++) for (let cz = d0; cz <= d1; cz++) {
    const l = grid.get(key(cx, cz)); if (!l) continue;
    for (const b of l) {
      const px = Math.max(b.x0, Math.min(x, b.x1)), pz = Math.max(b.z0, Math.min(z, b.z1));
      let dx = x - px, dz = z - pz; const d = Math.hypot(dx, dz);
      if (d < r) {
        if (d < 1e-4) { const l1 = x - b.x0, r1 = b.x1 - x, t1 = z - b.z0, b1 = b.z1 - z, m = Math.min(l1, r1, t1, b1); dx = m === l1 ? -1 : m === r1 ? 1 : 0; dz = m === t1 ? -1 : m === b1 ? 1 : 0; out.dx += dx * (m + r); out.dz += dz * (m + r); out.nx += dx; out.nz += dz; }
        else { const pen = r - d; out.dx += dx / d * pen; out.dz += dz / d * pen; out.nx += dx / d; out.nz += dz / d; }
        out.hit = true;
      }
    }
  }
  if (out.hit) { const n = Math.hypot(out.nx, out.nz) || 1; out.nx /= n; out.nz /= n; }
  return out;
}
export const blockedAt = (x, z) => resolveCircle(x, z, 0.6).hit;
// Distance along a ray (ox,oy,oz)+t*(dx,dy,dz) to the first building, or max.
export function rayBuildings(ox, oy, oz, dx, dy, dz, max) {
  for (let t = 0.5; t < max; t += 0.8) {
    const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
    if (y < 0) return t;
    const l = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (l) for (const b of l) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y < b.h) return t;
  }
  return max;
}

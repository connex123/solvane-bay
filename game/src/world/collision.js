// Building colliders: axis-aligned footprints bucketed in a uniform spatial hash. Supports pushing circles out of
// walls (people, cars) and marching rays (bullets, sight lines, the camera) until they enter a building.
const CELL = 32; // metres per hash cell
const buckets = new Map();
export const boxes = [];

const cellOf = (v) => Math.floor(v / CELL);
const bucketKey = (cx, cz) => cx * 4096 + cz;

export function clearBoxes() {
  boxes.length = 0;
  buckets.clear();
}

/** Register a box { x0, x1, z0, z1, h? } in every cell its footprint touches. */
export function addBox(b) {
  boxes.push(b);
  for (let cx = cellOf(b.x0); cx <= cellOf(b.x1); cx++) {
    for (let cz = cellOf(b.z0); cz <= cellOf(b.z1); cz++) {
      const key = bucketKey(cx, cz);
      let list = buckets.get(key);
      if (!list) {
        list = [];
        buckets.set(key, list);
      }
      list.push(b);
    }
  }
}

// Shared result object (no allocation per call). dx/dz: total push-out; nx/nz: unit contact normal.
const push = { hit: false, dx: 0, dz: 0, nx: 0, nz: 0 };

// Centre inside the box: shove out through the nearest face.
function escapeFromInside(b, x, z, r) {
  const toLeft = x - b.x0, toRight = b.x1 - x, toNear = z - b.z0, toFar = b.z1 - z;
  const nearest = Math.min(toLeft, toRight, toNear, toFar);
  let sx = 0, sz = 0;
  if (nearest === toLeft) sx = -1; else if (nearest === toRight) sx = 1;
  if (nearest === toNear) sz = -1; else if (nearest === toFar) sz = 1;
  push.dx += sx * (nearest + r);
  push.dz += sz * (nearest + r);
  push.nx += sx;
  push.nz += sz;
}

function pushOutOf(b, x, z, r) {
  const closestX = Math.min(Math.max(x, b.x0), b.x1);
  const closestZ = Math.min(Math.max(z, b.z0), b.z1);
  const ox = x - closestX, oz = z - closestZ;
  const gap = Math.hypot(ox, oz);
  if (gap >= r) return;
  if (gap < 1e-4) {
    escapeFromInside(b, x, z, r);
  } else {
    const depth = r - gap;
    push.dx += (ox / gap) * depth;
    push.dz += (oz / gap) * depth;
    push.nx += ox / gap;
    push.nz += oz / gap;
  }
  push.hit = true;
}

/** Overlap of a circle (x, z, r) with the buildings: returns the shared push result. */
export function resolveCircle(x, z, r) {
  push.hit = false;
  push.dx = push.dz = push.nx = push.nz = 0;
  for (let cx = cellOf(x - r); cx <= cellOf(x + r); cx++) {
    for (let cz = cellOf(z - r); cz <= cellOf(z + r); cz++) {
      const list = buckets.get(bucketKey(cx, cz));
      if (list) for (const b of list) pushOutOf(b, x, z, r);
    }
  }
  if (push.hit) {
    const len = Math.hypot(push.nx, push.nz) || 1;
    push.nx /= len;
    push.nz /= len;
  }
  return push;
}

export const blockedAt = (x, z) => resolveCircle(x, z, 0.6).hit;

const RAY_START = 0.5;
const RAY_STEP = 0.8;

/** Distance along the ray (ox,oy,oz) + t(dx,dy,dz) to the ground or the first building, or max if clear. */
export function rayBuildings(ox, oy, oz, dx, dy, dz, max) {
  for (let t = RAY_START; t < max; t += RAY_STEP) {
    const py = oy + dy * t;
    if (py < 0) return t;
    const px = ox + dx * t, pz = oz + dz * t;
    const list = buckets.get(bucketKey(cellOf(px), cellOf(pz)));
    if (!list) continue;
    for (const b of list) {
      if (px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1 && py < b.h) return t;
    }
  }
  return max;
}

// Shared world constants: the street grid, lane widths, colour palettes, map extents and district names.

// Grid: N x N blocks, each S metres on a side, with roads RW metres wide.
export const N = 9;
export const S = 64;
export const RW = 14;
export const HALF = (N * S) / 2;
export const LANE = 3.5;
export const WALK = 2.5;

// The shoreline sits a little east of the last avenue.
export const SEA_X = HALF + 48;

/** World coordinate of the i-th grid line (0..N). */
export function lineCoord(i) {
  return i * S - HALF;
}

// Pastel stucco facades.
export const STUCCO = [
  0xf4a6a0, 0xf7c59f, 0x8fd3c8, 0xb8e0b0,
  0xf6e3b4, 0xe97f6f, 0xc3a6e0, 0xe9c46a,
  0xf2b5d4, 0x9ec9e8, 0xfff4e6, 0xf08a5d,
];

// Tinted curtain-wall glass.
export const GLASS = [
  0x9ec9e8, 0x8fb4d4, 0xdfe7ee,
  0xc3c9d6, 0xb4d8e0, 0xe8d0c0,
];

// Paint jobs for civilian cars.
export const CAR_COLORS = [
  0xe83a5c, 0x2f7fd8, 0xf2c230,
  0x2fb89a, 0xf0f0f0, 0x222831,
  0xff8a3d, 0x8e5ad8, 0x9aa4b0,
];

// Rectangle the city map and minimap project.
export const MAP_BOUNDS = { x0: -330, x1: 470, z0: -330, z1: 330 };

const district = (name, color) => ({ name, color });
export const DISTRICTS = {
  downtown: district('Crown Heights', '#f4b860'),
  neon: district('Neon Row', '#ff4fd8'),
  marina: district('Marina Cala', '#4fd8ff'),
  docks: district('Port Calder', '#a0a8b8'),
  beach: district('The Strand', '#ffe08a'),
  hills: district('Point Wren', '#7ed68a'),
  old: district('Old Town', '#ff9a76'),
};

// XP needed to reach respect levels 1..5.
export const RESPECT_XP = [0, 200, 500, 900, 1500];

/** Limit v to the range [lo, hi] (the upper cap applies first, then the floor wins). */
export function clamp(v, lo, hi) {
  const capped = v > hi ? hi : v;
  return capped < lo ? lo : capped;
}

const TAU = Math.PI * 2;
/** Bring an angle into (-PI, PI]. */
export function wrapAngle(angle) {
  let out = angle;
  while (out > Math.PI) out -= TAU;
  while (out < -Math.PI) out += TAU;
  return out;
}

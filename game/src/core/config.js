// World constants shared by every module: grid size, lane geometry, palettes and district names.
export const N = 9, S = 64, RW = 14, HALF = N * S / 2, LANE = 3.5, WALK = 2.5;
export const SEA_X = HALF + 48;
export const lineCoord = (i) => -HALF + i * S;
export const STUCCO = [0xa8e6cf, 0xff9e8a, 0xffb8a0, 0xffe7a3, 0xa8d8f0, 0xfff8ee, 0xffd1a8, 0x8fe0d4, 0xffc2d4, 0xfff0d0, 0xf7a58a, 0xc8ecb8];
export const GLASS = [0x9ec9e8, 0x8fb4d4, 0xdfe7ee, 0xc3c9d6, 0xb4d8e0, 0xe8d0c0];
export const CAR_COLORS = [0xe83a5c, 0x2f7fd8, 0xf2c230, 0x2fb89a, 0xf0f0f0, 0x222831, 0xff8a3d, 0x8e5ad8, 0x9aa4b0];
export const MAP_BOUNDS = { x0: -330, x1: 470, z0: -330, z1: 330 };
export const DISTRICTS = {
  downtown: { name: 'Crown Heights', color: '#f4b860' },
  neon: { name: 'Neon Row', color: '#ff4fd8' },
  marina: { name: 'Marina Cala', color: '#4fd8ff' },
  docks: { name: 'Port Calder', color: '#a0a8b8' },
  beach: { name: 'Palmetto Beach', color: '#ffe08a' },
  hills: { name: 'Alder Hills', color: '#7ed68a' },
  old: { name: 'Casa Vieja', color: '#ff9a76' },
};
export const RESPECT_XP = [0, 200, 500, 900, 1500];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const wrapAngle = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

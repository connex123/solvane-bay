// The one game-state object every system reads and writes, plus a few helpers built on it.
import { RESPECT_XP } from './config.js';

const MAX_TOASTS = 4;

export const G = {
  // session
  seed: 1, shot: null, mode: 'title', time: 0, clock: 17.6,
  // three.js handles, filled in at boot
  scene: null, camera: null, renderer: null,
  // live entity lists
  cars: [], actors: [], markers: [], pickups: [],
  // player and police heat
  p: null,
  wanted: { heat: 0, stars: 0, unseen: 0, bust: 0 },
  // progress
  mission: null, completed: [], packages: [], money: 500, xp: 0,
  // presentation
  settings: { vol: 0.7, sens: 1 },
  toasts: [], shake: 0, radio: 0, buildingMat: null,
  deadT: 0, deadKind: '',
  heli: null,
  cam: { yaw: Math.PI, pitch: 0.15 },
  hudRate: 0,
};

/** Respect level (1-based) reached with the given XP. */
export function levelFromXp(xp) {
  let level = 1;
  for (let i = 0; i < RESPECT_XP.length; i++) {
    if (xp >= RESPECT_XP[i]) level = i + 1;
  }
  return level;
}

/** Queue a toast message; only the newest few are kept. */
export function notify(text, kind = '') {
  G.toasts.push({ text, kind, t: 4 });
  while (G.toasts.length > MAX_TOASTS) G.toasts.shift();
}

/** Flat (x/z) distance between two points. Despite the name it is the plain distance, not squared. */
export function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.hypot(dx, dz);
}

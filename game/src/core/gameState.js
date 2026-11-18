// The single shared game state object plus small helpers every system uses.
import { RESPECT_XP } from './config.js';
export const G = {
  seed: 1, shot: null, mode: 'title', time: 0, clock: 17.6,
  scene: null, camera: null, renderer: null,
  cars: [], actors: [], markers: [], pickups: [],
  p: null, wanted: { heat: 0, stars: 0, unseen: 0, bust: 0 },
  mission: null, completed: [], packages: [], money: 500, xp: 0,
  settings: { vol: 0.7, sens: 1 }, toasts: [], shake: 0, radio: 0, buildingMat: null, deadT: 0, deadKind: '',
  heli: null, cam: { yaw: Math.PI, pitch: 0.15 }, hudRate: 0,
};
export const levelFromXp = (xp) => { let l = 1; RESPECT_XP.forEach((t, i) => { if (xp >= t) l = i + 1; }); return l; };
export const notify = (text, kind = '') => { G.toasts.push({ text, kind, t: 4 }); if (G.toasts.length > 4) G.toasts.shift(); };
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// Read-only state summary for automated play-testing: window.__solvane.state() returns mode, player, car, wanted,
// mission and the frame rate over the last few seconds. It exposes copies only; nothing here can change the game.
import { G } from './gameState.js';

const frames = [];
export function recordFrame(t) { frames.push(t); while (frames.length && t - frames[0] > 3000) frames.shift(); }
const fps = () => (frames.length > 1 ? (frames.length - 1) / ((frames[frames.length - 1] - frames[0]) / 1000) : 0);
function nearest(p) {
  let best = null, bd = 1e9; for (const c of G.cars) { if (c.dead || c === p.car || c.kind === 'cop') continue; const d = Math.hypot(c.x - p.x, c.z - p.z) + (c.kind === 'parked' ? 0 : 25); if (d < bd) { bd = d; best = c; } }
  return best ? { dx: Math.round((best.x - p.x) * 100) / 100, dz: Math.round((best.z - p.z) * 100) / 100, kind: best.kind } : null;
}
export function installDebugHook() {
  const r = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
  Object.defineProperty(window, '__solvane', { configurable: false, value: Object.freeze({ state: () => {
    const p = G.p, c = p.car;
    return {
      mode: G.mode, playerMode: c ? 'driving' : 'on-foot', x: r(p.x), z: r(p.z), hp: r(p.hp), moveSpeed: r(p.moving || 0), weapon: p.weapon, ammo: { ...p.ammo }, aim: !!p.aim,
      car: c ? { model: c.model?.name || c.key || '', speed: r(c.speed), kmh: Math.round(Math.abs(c.speed) * 3.6) } : null,
      stars: G.wanted.stars, cops: G.cars.filter((k) => k.kind === 'cop').length, peds: G.actors.length, cars: G.cars.length,
      mission: G.mission ? { title: G.mission.def?.title, text: G.mission.text } : null, money: G.money,
      camYaw: r(G.cam.yaw, 3), nearCar: nearest(p),
      screens: [...document.querySelectorAll('.screen:not(.hidden)')].map((e) => e.id), fps: r(fps(), 1), quality: G.qualityLevel ?? 0, effects: G.fx?.length ?? null,
    };
  } }) });
}

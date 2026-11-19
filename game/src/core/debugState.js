// Read-only state summary on window.__solvane for play-testing tools (mode, player, car, wanted level, mission, fps, quality).
import { G } from './gameState.js';
import { fpsHistory } from '../render/qualityGovernor.js';

const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
function nearest(p) {
  let best = null; for (const k of G.cars) { if (k.kind === 'cop' || k.dead || k === p.car) continue; const d = Math.hypot(k.x - p.x, k.z - p.z); if (!best || d < best.d) best = { dx: round(k.x - p.x), dz: round(k.z - p.z), d: round(d), kind: k.kind }; }
  return best;
}
function summary() {
  const p = G.p, c = p.car, screen = [...document.querySelectorAll('.screen')].find((s) => !s.classList.contains('hidden'))?.id || null;
  return Object.freeze({
    mode: G.mode, screen, onFoot: !c, x: round(p.x), z: round(p.z), hp: round(p.hp), weapon: p.weapon, ammo: { ...p.ammo }, nearCar: p.nearCar?.type.name || null,
    car: c ? c.type.name : null, speedKmh: c ? Math.round(Math.abs(c.speed) * 3.6) : 0, stars: G.wanted.stars, heat: round(G.wanted.heat, 2),
    cops: G.cars.filter((k) => k.kind === 'cop' && !k.dead).length, copsOnFoot: G.actors.filter((a) => a.kind === 'cop' && !a.dead).length, peds: G.actors.length,
    camYaw: round(G.cam.yaw, 3), nitro: c ? round(c.nitro ?? 1, 2) : null, boosting: !!c?.boosting, condition: c ? Math.round(c.hp / c.maxHp * 100) : null, seen: !!G.wanted.seen, nearestCar: nearest(p),
    mission: G.mission ? G.mission.def.title : null, frame: G.frameNo || 0, simTime: round(G.time, 2), fps: round(G.fps || 0), fpsHistory: fpsHistory(), quality: G.quality || null, frameMs: G.perf ? { sim: round(G.perf.sim), render: round(G.perf.render), steps: G.perf.steps, lastFrame: round(G.perf.raw, 3) } : null,
  });
}
export function exposeDebugState() { Object.defineProperty(window, '__solvane', { get: summary, configurable: false }); }

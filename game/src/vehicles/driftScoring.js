// Driving score: sustained slides build a DRIFT xN chain that pays cash when it ends cleanly, and passing traffic
// closely at speed pays a NEAR MISS bonus. Both raise floating popups (G.popups) that the HUD renders.
import { G } from '../core/gameState.js';

export const DRIFT = { minSpeed: 9, minSlip: 0.22, step: 0.9, maxMult: 9, grace: 0.45, minTime: 0.9 };
export const NEAR = { minSpeed: 14, dist: 3.1, cash: 100, cooldown: 2.5 };
const d = { t: 0, pts: 0, mult: 1, off: 0, hp: 0 };
export const driftState = d;
export function popup(text, cash = 0, kind = 'drift') {
  if (cash) { G.money += cash; G.xp = (G.xp || 0) + Math.round(cash / 25); }
  G.popups = G.popups || []; G.popups.push({ text, cash, kind, t: 2.4 }); if (G.popups.length > 3) G.popups.shift();
}
// Slip angle between where the car points and where it is travelling.
export function slipAngle(car) {
  const sp = Math.hypot(car.vx, car.vz); if (sp < 1) return 0;
  let a = Math.atan2(car.vx, car.vz) - car.heading; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a;
}
export const driftCash = (pts, mult) => Math.round(pts * mult / 10) * 10;
export function updateDriftScore(car, dt) {
  const sp = Math.hypot(car.vx, car.vz), slip = Math.abs(slipAngle(car));
  if (d.t > 0 && car.hp < d.hp - 5) { d.t = 0; d.pts = 0; d.mult = 1; popup('DRIFT BROKEN', 0, 'bad'); }
  if (sp > DRIFT.minSpeed && slip > DRIFT.minSlip && slip < 2.2) {
    if (d.t === 0) d.hp = car.hp; d.t += dt; d.off = 0; d.pts += sp * slip * dt * 1.6;
    d.mult = Math.min(DRIFT.maxMult, 1 + Math.floor(d.t / DRIFT.step));
  } else if (d.t > 0) {
    d.off += dt;
    if (d.off > DRIFT.grace) { if (d.t >= DRIFT.minTime) popup(`DRIFT x${d.mult}`, Math.max(50, driftCash(d.pts, d.mult)), 'drift'); d.t = 0; d.pts = 0; d.mult = 1; }
  }
  // near misses: a moving car slides past within a few metres while we are fast, without contact
  if (sp > NEAR.minSpeed) for (const o of G.cars) {
    if (o === car || o.dead || (o.kind !== 'traffic' && o.kind !== 'cop')) continue;
    const dx = o.x - car.x, dz = o.z - car.z; if (Math.abs(dx) > 8 || Math.abs(dz) > 8) continue;
    const dist = Math.hypot(dx, dz), rel = Math.hypot(o.vx - car.vx, o.vz - car.vz), along = (dx * car.vx + dz * car.vz) / sp;
    if (dist < NEAR.dist + car.type.wid && dist > car.type.wid * 0.95 && Math.abs(along) < 1.2 && rel > NEAR.minSpeed && (o.nearT || 0) < G.time && car.hitT < 0.1) {
      o.nearT = G.time + NEAR.cooldown; popup('NEAR MISS', NEAR.cash, 'near');
    }
  }
}
export function tickPopups(dt) { if (!G.popups) return; for (const p of G.popups) p.t -= dt; G.popups = G.popups.filter((p) => p.t > 0); }

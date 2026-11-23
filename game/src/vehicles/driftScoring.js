// Driving score. Holding a slide builds a "DRIFT xN" chain that pays out when it ends cleanly; slipping past
// moving traffic at speed pays a NEAR MISS bonus. Both push floating popups onto G.popups for the HUD.
import { G } from '../core/gameState.js';
import { wrapAngle } from '../core/config.js';

export const DRIFT = { minSpeed: 9, minSlip: 0.22, step: 0.9, maxMult: 9, grace: 0.45, minTime: 0.9 };
export const NEAR = { minSpeed: 14, dist: 3.1, cash: 100, cooldown: 2.5 };

const MAX_POPUPS = 3;
const POPUP_LIFE = 2.4;
const MAX_SLIP = 2.2; // past this the car is spinning, not drifting

// The running chain (read by the HUD): t = time sliding, pts = raw score, mult = multiplier,
// off = time since the slide stopped, hp = car health when the chain began.
export const driftState = { t: 0, pts: 0, mult: 1, off: 0, hp: 0 };
const chain = driftState;

function resetChain() {
  chain.t = 0;
  chain.pts = 0;
  chain.mult = 1;
}

/** Show a popup; any cash is paid at once, along with a little XP. */
export function popup(text, cash = 0, kind = 'drift') {
  if (cash) {
    G.money += cash;
    G.xp = (G.xp || 0) + Math.round(cash / 25);
  }
  if (!G.popups) G.popups = [];
  G.popups.push({ text, cash, kind, t: POPUP_LIFE });
  if (G.popups.length > MAX_POPUPS) G.popups.shift();
}

/** Angle between the car's nose and its direction of travel (0 when barely moving). */
export function slipAngle(car) {
  if (Math.hypot(car.vx, car.vz) < 1) return 0;
  return wrapAngle(Math.atan2(car.vx, car.vz) - car.heading);
}

/** Payout for a finished chain, rounded to tens. */
export function driftCash(pts, mult) {
  return Math.round((pts * mult) / 10) * 10;
}

function trackDrift(car, dt, speed, slip) {
  // A real knock mid-slide breaks the chain.
  if (chain.t > 0 && car.hp < chain.hp - 5) {
    resetChain();
    popup('DRIFT BROKEN', 0, 'bad');
  }
  const sliding = speed > DRIFT.minSpeed && slip > DRIFT.minSlip && slip < MAX_SLIP;
  if (sliding) {
    if (chain.t === 0) chain.hp = car.hp;
    chain.t += dt;
    chain.off = 0;
    chain.pts += speed * slip * dt * 1.6;
    chain.mult = Math.min(DRIFT.maxMult, 1 + Math.floor(chain.t / DRIFT.step));
    return;
  }
  if (chain.t <= 0) return;
  chain.off += dt;
  if (chain.off <= DRIFT.grace) return;
  if (chain.t >= DRIFT.minTime) popup(`DRIFT x${chain.mult}`, Math.max(50, driftCash(chain.pts, chain.mult)), 'drift');
  resetChain();
}

function isNearMiss(car, other, speed) {
  const dx = other.x - car.x;
  const dz = other.z - car.z;
  if (Math.abs(dx) > 8 || Math.abs(dz) > 8) return false;
  const gap = Math.hypot(dx, dz);
  const closing = Math.hypot(other.vx - car.vx, other.vz - car.vz);
  const alongTrack = (dx * car.vx + dz * car.vz) / speed; // how far ahead/behind, along our heading
  const width = car.type.wid;
  return gap < NEAR.dist + width && gap > width * 0.95 && Math.abs(alongTrack) < 1.2 &&
    closing > NEAR.minSpeed && (other.nearT || 0) < G.time && car.hitT < 0.1;
}

function trackNearMisses(car, speed) {
  if (speed <= NEAR.minSpeed) return;
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    if (other.kind !== 'traffic' && other.kind !== 'cop') continue;
    if (!isNearMiss(car, other, speed)) continue;
    other.nearT = G.time + NEAR.cooldown;
    popup('NEAR MISS', NEAR.cash, 'near');
  }
}

export function updateDriftScore(car, dt) {
  const speed = Math.hypot(car.vx, car.vz);
  trackDrift(car, dt, speed, Math.abs(slipAngle(car)));
  trackNearMisses(car, speed);
}

/** Age the popups and drop the expired ones. */
export function tickPopups(dt) {
  if (!G.popups) return;
  G.popups = G.popups.filter((item) => {
    item.t -= dt;
    return item.t > 0;
  });
}

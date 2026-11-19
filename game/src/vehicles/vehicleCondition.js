// Vehicle condition: collision damage expressed as a 0-100 % rating, with a status word and engine smoke/fire as it drops.
import { smoke, particle } from '../combat/effects.js';

export const conditionPct = (car) => Math.max(0, Math.round(car.hp / car.maxHp * 100));
export const conditionWord = (pct) => pct > 75 ? 'MINT' : pct > 45 ? 'DENTED' : pct > 20 ? 'SMOKING' : 'CRITICAL';
// Engine-bay smoke grows from grey to black below 45 %, and flames lick out below 20 %.
export function conditionEffects(car, dt) {
  if (car.dead) return; const pct = car.hp / car.maxHp; if (pct > 0.45) return;
  const s = Math.sin(car.heading), c = Math.cos(car.heading), f = car.type.len * 0.35, x = car.x + s * f, z = car.z + c * f;
  if (Math.random() < dt * (pct < 0.2 ? 14 : 6)) smoke(x, 1.1, z, pct < 0.2 ? 0x151515 : 0x888888);
  if (pct < 0.2 && Math.random() < dt * 10) particle({ x, y: 0.95, z, vy: 1.6, life: 0.35, size: 0.8, grow: 1, color: 0xff7a2a, add: true });
}

// Wanted level: crimes add heat, heat maps to 0-5 stars, and heat fades once the player breaks line of pursuit.
import { G, notify } from '../core/gameState.js';

const HEAT = { hitped: 0.35, killped: 1.1, runover: 0.9, hitcop: 1.0, killcop: 1.6, ram: 0.2, shootcar: 0.5, explosion: 0.8, steal: 0.7, shots: 0.12, shotsSeen: 0.4, shotsCop: 0.6, killgang: 0 };
export function crime(type) {
  const w = G.wanted, add = HEAT[type] || 0; if (!add) return;
  const before = w.stars; w.heat = Math.min(5.99, w.heat + add); if (type === 'killcop') w.heat = Math.max(w.heat, 2); if (type === 'shotsCop') w.heat = Math.max(w.heat, 1.5);
  w.stars = Math.floor(w.heat); w.unseen = 0; if (w.stars > before) { notify(`WANTED LEVEL ${w.stars}`, 'wanted'); w.grace = DISPATCH_GRACE; }
}
// a fresh or raised wanted level holds while the call goes out and the first units drive in (they spawn 110-170 m away),
// so it can not cool off before anyone has had a chance to respond
export const DISPATCH_GRACE = 10;
export function setStars(n) { G.wanted.heat = n; G.wanted.stars = n; G.wanted.unseen = 0; }
export function updateWanted(dt, copDist, seen = copDist < 75 + G.wanted.stars * 12) {
  const w = G.wanted; if (w.stars <= 0) { w.heat = Math.max(0, w.heat - dt * 0.1); w.stars = Math.floor(w.heat); return; }
  if (w.grace > 0) w.grace -= dt;
  if (!seen && w.grace > 0) { /* the units are still on their way in */ }
  else if (!seen) { w.unseen += dt; w.heat -= dt * (0.08 + w.unseen * 0.012); }
  else { w.unseen = Math.max(0, w.unseen - dt * 2); w.heat -= dt * 0.004; }
  w.heat = Math.max(0, w.heat); const s = Math.floor(w.heat); if (s < w.stars) { w.stars = s; if (s === 0) notify('WANTED LEVEL LOST', 'good'); }
}

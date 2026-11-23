// Career record: what Nico has done across the whole game (cars stolen, highest wanted level, kilometres driven and
// walked, gang members put down, wanted levels shaken off, taxi fares, races, cash earned), saved with the game, and
// the Bay completion percentage built from story chapters, hidden packages, side jobs and Low Tide territory.
import { G } from './gameState.js';

const DEFAULTS = { carsStolen: 0, highestWanted: 0, metresDriven: 0, metresOnFoot: 0, gangDown: 0, wantedEscapes: 0, taxiFares: 0, racesWon: 0, cashEarned: 0 };
export const careerStats = () => (G.stats ||= { ...DEFAULTS });
export function recordStat(key, add = 1) { const s = careerStats(); s[key] = (s[key] || 0) + add; }
export function recordBest(key, value) { const s = careerStats(); if (value > (s[key] || 0)) s[key] = value; }
// Distance on foot and at the wheel, from the player's real movement each simulation step (teleports ignored).
let last = null;
export function trackMovement() {
  const p = G.p, x = p.car ? p.car.x : p.x, z = p.car ? p.car.z : p.z;
  if (last && G.mode === 'play') { const d = Math.hypot(x - last.x, z - last.z); if (d < 30) recordStat(p.car ? 'metresDriven' : 'metresOnFoot', d); }
  last = { x, z };
}
// Bay completion: story 60 %, hidden packages 15 %, side jobs 10 % (ten to max), Low Tide territory 15 %.
export function completionPercent({ chapters, totalChapters, packages, totalPackages, tideShare, stats }) {
  const s = { ...careerStats(), ...stats }, jobs = Math.min(10, s.taxiFares + s.racesWon) / 10;
  return Math.round(60 * chapters / totalChapters + 15 * packages / Math.max(1, totalPackages) + 10 * jobs + 15 * tideShare / 100);
}
export const resetCareer = () => { G.stats = { ...DEFAULTS }; last = null; };

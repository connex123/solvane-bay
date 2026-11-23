// Screenshot 3: the city map opened mid-story (six chapters done, chapter 7 next): districts tinted by who holds them,
// mission, shop and activity badges, hidden packages, the GPS route to the next chapter, and the career panel with the
// Bay completion ring, chapters ticked off, career stats, Low Tide territory and three used save slots.
import { G } from '../core/gameState.js';
import { HALF } from '../core/config.js';
import { enterCar } from '../characters/playerController.js';
import { seedSave } from '../save/saveGame.js';
import { refreshStartMarker } from '../missions/missionRunner.js';
import { setScene, carAt, renderShot } from './sceneStaging.js';

const DONE = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
export const CAREER = { carsStolen: 47, highestWanted: 5, metresDriven: 86400, metresOnFoot: 14250, gangDown: 63, wantedEscapes: 21, taxiFares: 7, racesWon: 3, cashEarned: 61850 };
export function mapProgress(api) {
  setScene({ clock: 16.2, money: 48250, xp: 1260, completed: DONE, crew: { cd: {}, swaps: 2 } });
  G.packages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; G.stats = { ...CAREER }; G.playBase = 6 * 3600 + 14 * 60; G.time = 0;
  const base = { v: 3, xp: G.xp, packages: G.packages, owned: {}, ammo: {}, stats: CAREER, clock: 16.2 };
  seedSave({ ...base, money: 48250, completed: DONE, play: G.playBase, place: 'The Strand', at: '2026-11-22 21:40' }, 1);
  seedSave({ ...base, money: 18900, completed: DONE.slice(0, 4), play: 3 * 3600 + 51 * 60, place: 'Neon Row', at: '2026-11-20 19:05' }, 2);
  seedSave({ ...base, money: 41120, completed: DONE, play: 6 * 3600 + 2 * 60, place: 'Marina Cala', at: '2026-11-22 21:12' }, 3);
  const car = carAt('veloce', HALF + 3.5, 60, Math.PI, { tint: 0xf22a1c }); enterCar(car); G.p.x = car.x; G.p.z = car.z; refreshStartMarker();
  G.mode = 'pause'; api.showScreen('cityMap'); renderShot(api, 1);
}

// How busy the streets around the player are: per-district targets for civilian cars, pedestrians and loitering groups,
// scaled by the graphics quality tier so a slow machine keeps its frame rate, and the district's own vehicle mix
// (cabs downtown, box trucks and vans at the docks, convertibles and buses on the Strand, sports cars in Neon Row).
import { G } from '../core/gameState.js';
import { HALF, S, N, clamp } from '../core/config.js';
import { districtOfBlock } from '../world/cityLayout.js';
import { rnd } from '../core/random.js';

const DISTRICT_LIFE = {
  downtown: { cars: 1.2, peds: 1.3, mix: ['tupelo', 'tupelo', 'marlin', 'hawke', 'tidebus', 'calder', 'pico', 'veloce'] },
  neon: { cars: 1.05, peds: 1.25, mix: ['rumble', 'veloce', 'tupelo', 'pico', 'marlin', 'hawke'] },
  marina: { cars: 0.9, peds: 1.0, mix: ['hawke', 'marlin', 'veloce', 'pico', 'calder', 'tidebus'] },
  docks: { cars: 0.85, peds: 0.5, mix: ['calder', 'calder', 'cadia', 'cadia', 'hawke', 'marlin'] },
  beach: { cars: 1.1, peds: 1.35, mix: ['rumble', 'rumble', 'pico', 'tidebus', 'tupelo', 'cadia', 'veloce', 'marlin'] },
  hills: { cars: 0.6, peds: 0.6, mix: ['hawke', 'marlin', 'pico', 'cadia'] },
  old: { cars: 1.0, peds: 1.1, mix: ['pico', 'marlin', 'cadia', 'calder', 'tupelo', 'rumble', 'tidebus'] },
};
// Quality tiers from render/qualityGovernor.js: the fewer pixels and effects, the fewer extra people and cars.
const TIER_SCALE = { High: 1, Medium: 0.9, Low: 0.75, Lowest: 0.6, Minimal: 0.45 };

export function districtKeyAt(x, z) {
  if (x > HALF + 8) return 'beach';
  const i = clamp(Math.floor((x + HALF) / S), 0, N - 1), j = clamp(Math.floor((z + HALF) / S), 0, N - 1);
  return districtOfBlock(i, j);
}
// Targets for the ring of streets around (x, z): civilian cars, walking pedestrians and loitering groups.
export function streetBudget(x, z) {
  const d = DISTRICT_LIFE[districtKeyAt(x, z)] || DISTRICT_LIFE.old, q = TIER_SCALE[G.quality] ?? 1;
  return { cars: Math.round(30 * d.cars * q), peds: Math.round(38 * d.peds * q), groups: Math.round(9 * d.peds * q) };
}
// A civilian vehicle that belongs on this street.
export const pickCivilType = (x, z) => rnd.pick((DISTRICT_LIFE[districtKeyAt(x, z)] || DISTRICT_LIFE.old).mix);

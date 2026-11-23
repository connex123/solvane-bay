// Control of the Bay. Each district is held either by Brandt's CROWN syndicate or by Nico's LOW TIDE crew;
// finishing a chapter flips the districts its arc entry lists. Shares count real city blocks. Saved with the game.
import { G } from '../core/gameState.js';
import { DISTRICTS } from '../core/config.js';
import { blocks } from '../world/cityLayout.js';
import { ARC } from './chapterArc.js';

export const HOLDERS = {
  crown: { name: 'CROWN', color: '#e0463c' },
  tide: { name: 'LOW TIDE', color: '#2fd6c4' },
};

/** Every district under the Crown. */
export function startingTerritory() {
  const map = {};
  for (const key of Object.keys(DISTRICTS)) map[key] = 'crown';
  return map;
}

/** Rebuild the holder map by replaying completed chapters in story order (new games, older saves). */
export function territoryFromChapters(completed) {
  const map = startingTerritory();
  const done = new Set(completed);
  for (const [id, entry] of Object.entries(ARC)) {
    if (!done.has(id)) continue;
    for (const [district, holder] of entry.flips) map[district] = holder;
  }
  return map;
}

export function territory() {
  if (!G.territory) G.territory = territoryFromChapters(G.completed || []);
  return G.territory;
}

export function holderOf(district) {
  return territory()[district] || 'crown';
}

/** Apply a chapter's flips; returns the districts that actually changed hands. */
export function applyChapterFlips(id) {
  const map = territory();
  const flips = (ARC[id] && ARC[id].flips) || [];
  const changed = [];
  for (const [district, holder] of flips) {
    if (map[district] === holder) continue;
    map[district] = holder;
    changed.push({ district, name: DISTRICTS[district].name, holder });
  }
  return changed;
}

/** Percentage of city blocks each side holds. */
export function shares() {
  if (!blocks.length) {
    territory();
    return { tide: 0, crown: 100 };
  }
  const map = territory();
  const tideBlocks = blocks.filter((block) => map[block.district] === 'tide').length;
  const tide = Math.round((tideBlocks / blocks.length) * 100);
  return { tide, crown: 100 - tide };
}

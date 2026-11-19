// Who holds the Bay: every district belongs to Brandt's CROWN syndicate or Nico's LOW TIDE crew. Shares are measured
// in real city blocks; finishing a chapter flips the districts its arc entry names. The holder map is saved.
import { G } from '../core/gameState.js';
import { DISTRICTS } from '../core/config.js';
import { blocks } from '../world/cityLayout.js';
import { ARC } from './chapterArc.js';

export const HOLDERS = { crown: { name: 'CROWN', color: '#e0463c' }, tide: { name: 'LOW TIDE', color: '#2fd6c4' } };
export const startingTerritory = () => Object.fromEntries(Object.keys(DISTRICTS).map((k) => [k, 'crown']));
// Replays the flips of every completed chapter in story order (used for new games and saves that predate territory).
export function territoryFromChapters(completed) {
  const t = startingTerritory();
  for (const id of Object.keys(ARC)) if (completed.includes(id)) for (const [d, h] of ARC[id].flips) t[d] = h;
  return t;
}
export const territory = () => (G.territory ||= territoryFromChapters(G.completed || []));
export const holderOf = (district) => territory()[district] || 'crown';
export function applyChapterFlips(id) {
  const t = territory(), changed = [];
  for (const [d, h] of ARC[id]?.flips || []) if (t[d] !== h) { t[d] = h; changed.push({ district: d, name: DISTRICTS[d].name, holder: h }); }
  return changed;
}
// Percentage of city blocks each side holds.
export function shares() {
  const t = territory(); let tide = 0; for (const b of blocks) if (t[b.district] === 'tide') tide++;
  const pct = blocks.length ? Math.round((tide / blocks.length) * 100) : 0; return { tide: pct, crown: 100 - pct };
}

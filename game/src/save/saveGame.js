// Save/load to localStorage in three slots (two manual, one autosave written after every chapter): money, rep,
// chapters, territory, crew cooldowns, weapons and ammo, garage upgrades, packages, career stats and the clock.
import { G } from '../core/gameState.js';
import { districtAt } from '../world/cityLayout.js';
import { territoryFromChapters, territory } from '../story/territoryControl.js';
export const SLOTS = [{ id: 1, name: 'SLOT 1' }, { id: 2, name: 'SLOT 2' }, { id: 3, name: 'AUTOSAVE' }];
export const AUTOSAVE = 3;
const key = (slot) => `solvane-bay-save-${slot}`;
// Staged screenshot and self-test runs never touch localStorage: they use in-memory slots seeded deterministically.
const ISOLATED = typeof location !== 'undefined' && /[?&](shot|selftest)\b/.test(location.search);
const memSlots = {};
const store = { get: (slot) => (ISOLATED ? memSlots[slot] ?? null : localStorage.getItem(key(slot))), set: (slot, v) => { if (ISOLATED) memSlots[slot] = v; else localStorage.setItem(key(slot), v); } };
export function seedSave(obj, slot = 1) { store.set(slot, obj ? JSON.stringify(obj) : null); }
export function saveGame(slot = 1) {
  try { const p = G.p; store.set(slot, JSON.stringify({ v: 3, money: G.money, territory: territory(), crew: G.crew, garage: G.garage, weapon: p.weapon, xp: G.xp, completed: G.completed, packages: G.packages, owned: p.owned, ammo: p.ammo, stats: G.stats, clock: G.clock, play: Math.round((G.playBase || 0) + G.time), place: districtAt(p.x, p.z), at: new Date().toISOString().slice(0, 16).replace('T', ' ') })); return true; } catch (e) { return false; }
}
export function readSave(slot = 1) { try { return JSON.parse(store.get(slot) || 'null'); } catch (e) { return null; } }
// The most recently written slot (what Continue on the title screen loads).
export function latestSave() { let best = null; for (const { id } of SLOTS) { const s = readSave(id); if (s && (!best || (s.at || '') > (best.s.at || ''))) best = { slot: id, s }; } return best; }
export function applySave(s) {
  const p = G.p; G.money = s.money; G.xp = s.xp; G.completed = s.completed || []; G.packages = s.packages || []; p.owned = s.owned || p.owned; p.ammo = s.ammo || p.ammo; G.clock = s.clock ?? G.clock; G.playBase = s.play || 0;
  G.territory = s.territory || territoryFromChapters(G.completed); G.crew = s.crew || null; G.garage = s.garage || null; G.stats = s.stats || null; if (s.weapon != null && p.owned[s.weapon]) p.weapon = s.weapon;
}
export const slotSummary = (slot = 1) => {
  const s = readSave(slot), name = SLOTS.find((q) => q.id === slot)?.name || `SLOT ${slot}`; if (!s) return { used: false, name, text: 'Empty' };
  const m = Math.floor((s.play || 0) / 60), ch = Math.min((s.completed || []).length + 1, 8);
  return { used: true, name, text: `CH ${ch} · $${Number(s.money).toLocaleString('en-US')} · ${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m · ${s.place || 'Solvane Bay'}` };
};

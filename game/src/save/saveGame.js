// Save/load to localStorage: money, respect, story progress, packages, weapons, clock.
import { G, levelFromXp } from '../core/gameState.js';
import { districtAt } from '../world/cityLayout.js';
const KEY = 'solvane-bay-save-1';
// Staged screenshot and self-test runs never touch localStorage: they use an in-memory slot seeded deterministically.
const ISOLATED = typeof location !== 'undefined' && /[?&](shot|selftest)\b/.test(location.search);
let memSlot = null;
const store = { get: () => (ISOLATED ? memSlot : localStorage.getItem(KEY)), set: (v) => { if (ISOLATED) memSlot = v; else localStorage.setItem(KEY, v); } };
export function seedSave(obj) { store.set(obj ? JSON.stringify(obj) : null); }
export function saveGame() {
  try { const p = G.p; store.set(JSON.stringify({ v: 1, money: G.money, xp: G.xp, completed: G.completed, packages: G.packages, owned: p.owned, ammo: p.ammo, clock: G.clock, play: Math.round((G.playBase || 0) + G.time), place: districtAt(p.x, p.z), at: new Date().toISOString().slice(0, 16).replace('T', ' ') })); return true; } catch (e) { return false; }
}
export function readSave() { try { return JSON.parse(store.get() || 'null'); } catch (e) { return null; } }
export function applySave(s) {
  const p = G.p; G.money = s.money; G.xp = s.xp; G.completed = s.completed || []; G.packages = s.packages || []; p.owned = s.owned || p.owned; p.ammo = s.ammo || p.ammo; G.clock = s.clock ?? G.clock; G.playBase = s.play || 0;
}
export const slotSummary = () => {
  const s = readSave(); if (!s) return { used: false, text: 'Slot 1 \u00b7 Empty' };
  const m = Math.floor((s.play || 0) / 60), ch = Math.min((s.completed || []).length + 1, 6);
  return { used: true, text: `Slot 1 \u00b7 CH ${ch} \u00b7 $${Number(s.money).toLocaleString('en-US')} \u00b7 ${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m \u00b7 ${s.place || 'Solvane Bay'}` };
};

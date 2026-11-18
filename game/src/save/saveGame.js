// Save/load to localStorage: money, respect, story progress, packages, weapons, clock.
import { G, levelFromXp } from '../core/gameState.js';
const KEY = 'solvane-bay-save-1';
export function saveGame() {
  try { const p = G.p; localStorage.setItem(KEY, JSON.stringify({ v: 1, money: G.money, xp: G.xp, completed: G.completed, packages: G.packages, owned: p.owned, ammo: p.ammo, clock: G.clock, at: new Date().toISOString().slice(0, 16).replace('T', ' ') })); return true; } catch (e) { return false; }
}
export function readSave() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
export function applySave(s) {
  const p = G.p; G.money = s.money; G.xp = s.xp; G.completed = s.completed || []; G.packages = s.packages || []; p.owned = s.owned || p.owned; p.ammo = s.ammo || p.ammo; G.clock = s.clock ?? G.clock;
}
export const slotSummary = () => { const s = readSave(); return s ? { used: true, text: `${s.at}  ·  $${s.money}  ·  Lv ${levelFromXp(s.xp)}  ·  ${s.completed.length}/6 chapters` } : { used: false, text: 'Empty slot' }; };

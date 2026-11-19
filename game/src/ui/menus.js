// Menu screens: title, pause, controls, settings, shop, flatlined/cuffed. Buttons use data-act handlers wired in main.js.
import { G, notify } from '../core/gameState.js';
import { WEAPONS, maxAmmo } from '../combat/weapons.js';
import { levelFromXp } from '../core/gameState.js';
import { readSave } from '../save/saveGame.js';
import { MISSIONS } from '../missions/storyMissions.js';
const titleCase = (t) => t.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
export function saveLine(sv) { const done = (sv.completed || []).length, m = MISSIONS[Math.min(done, MISSIONS.length - 1)]; const pct = Math.round(100 * (0.8 * done / MISSIONS.length + 0.2 * (sv.packages || []).length / 12)); return `CH ${m.chapter} \u00b7 ${titleCase(m.title)} \u00b7 ${pct}%`; }
import { setVolume, sfx } from '../audio/soundEngine.js';
import { drawCityMap } from './cityMap.js';
import { fillCrewChapters } from './crewChaptersScreen.js';
import { fillGarage } from '../shop/garageShop.js';
import { setQuality } from '../render/qualityGovernor.js';

const $ = (id) => document.getElementById(id); const ALL = ['title', 'pause', 'controls', 'settings', 'shop', 'cityMap', 'dead', 'crew', 'garage'];
const KEYS = [['W A S D', 'Move / drive'], ['Shift', 'Sprint / nitro in a car'], ['Mouse', 'Look and aim'], ['L-Click', 'Shoot / punch'], ['R-Click', 'Aim'], ['1 – 5', 'Fists, pistol, SMG, shotgun, molotov'], ['Tab (hold)', 'Weapon wheel'], ['Z / X / C', 'Crew: Hot Swap, Blackout, Patch Up'], ['J', 'Crew & Chapters'], ['F', 'Enter or steal nearest car / exit'], ['E', 'Interact, talk, advance dialogue'], ['Space', 'Handbrake (drift)'], ['H', 'Horn'], ['R', 'Radio station'], ['M', 'City map'], ['Esc', 'Pause'], ['Walk into gold markers', 'Start missions']];
export function initMenus(handlers) {
  $('keysList').innerHTML = KEYS.map(([k, t]) => `<div><b>${k}</b>${t}</div>`).join('');
  document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { sfx.click(); handlers[b.dataset.act]?.(); }));
  $('setVol').addEventListener('input', (e) => setVolume(+e.target.value)); $('setSens').addEventListener('input', (e) => { G.settings.sens = +e.target.value; });
  $('setFx').addEventListener('change', (e) => setQuality(e.target.value));
}
export function showScreen(id) {
  ALL.forEach((s) => $(s).classList.toggle('hidden', s !== id)); if (id === 'title') { const sv = readSave(); $('btnContinue').disabled = !sv; $('contSub').textContent = sv ? saveLine(sv) : ''; } if (id === 'cityMap') drawCityMap(); if (id === 'shop') fillShop(); if (id === 'crew') fillCrewChapters(); if (id === 'garage') fillGarage();
}
export const hideScreens = () => ALL.forEach((s) => $(s).classList.add('hidden'));
export function showDead(title, sub) { showScreen('dead'); $('deadTitle').textContent = title; $('deadTitle').style.color = title === 'CUFFED' ? '#5a8aff' : '#ff3a55'; $('deadSub').textContent = sub; }
function fillShop() {
  const p = G.p, lv = levelFromXp(G.xp); $('shopMoney').textContent = `Cash $${Math.floor(G.money)}  ·  Rep level ${lv}`;
  let h = ''; WEAPONS.forEach((w, i) => { if (!i) return; const own = p.owned[i];
    h += `<div class="item"><span>${w.name} ${own ? `(${p.ammo[w.id]} rounds)` : ''}</span>${own ? `<button data-buy="ammo${i}">+${w.mag * 2} ammo $${w.ammoPrice}</button>` : lv >= w.level ? `<button data-buy="gun${i}">Buy $${w.price}</button>` : `<span style="opacity:.5">Rep ${w.level} required</span>`}</div>`; });
  h += `<div class="item"><span>Body armor</span><button data-buy="armor">Buy $250</button></div>`; $('shopList').innerHTML = h;
  $('shopList').querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => { buy(b.dataset.buy); fillShop(); }));
}
function buy(what) {
  const p = G.p, pay = (c) => { if (G.money < c) { notify('Not enough cash', 'bad'); return false; } G.money -= c; sfx.pickup(); return true; };
  if (what === 'armor') { if (pay(250)) p.armor = 100; return; }
  const i = +what.slice(-1), w = WEAPONS[i];
  if (what.startsWith('gun')) { if (pay(w.price)) { p.owned[i] = true; p.ammo[w.id] = w.mag * 3; } } else if (pay(w.ammoPrice)) p.ammo[w.id] = Math.min(maxAmmo(w.id), p.ammo[w.id] + w.mag * 2);
}

// Wren's garage at Point Wren (open once Wren joins in chapter 1): paid engine, armour plating and nitro tank upgrades
// plus a respray. Upgrades are Nico's tune-up kit: they apply to whatever car he drives. Saved with the game.
import { G, notify } from '../core/gameState.js';
import { lineCoord } from '../core/config.js';
import { addMarker } from '../missions/markers.js';
import { sfx } from '../audio/soundEngine.js';

export const WREN_GARAGE = { x: lineCoord(2) - 9, z: lineCoord(3) + 9 };
export const UPGRADES = [
  { id: 'engine', name: 'Engine rebuild', desc: '+12% acceleration, +5% top speed per level', costs: [1500, 3000, 5000] },
  { id: 'armour', name: 'Armour plating', desc: '-15% damage taken per level', costs: [1200, 2500, 4000] },
  { id: 'nitro', name: 'Nitro tank', desc: 'Boost lasts 40% longer per level', costs: [1000, 2500] },
];
export const RESPRAY = { cost: 200, colors: [0xd01020, 0x2fd6c4, 0xffd23c, 0x15151a, 0xff6a4f, 0xf0f0f0] };
const g = () => (G.garage ||= { engine: 0, armour: 0, nitro: 0, color: null });
export const garageLevel = (id) => g()[id] || 0;
// Called whenever Nico gets behind a wheel: stamps the bought upgrades onto that car.
export function applyGarage(car) {
  const s = g(); car.pacc = 1 + 0.12 * s.engine; car.pmax = 1 + 0.05 * s.engine; car.armourMul = 1 - 0.15 * s.armour; car.nitroMul = 1 / (1 + 0.4 * s.nitro);
  if (s.color != null && car.paintedBy !== s.color) { const m = car.mesh.userData.bodyMesh; m.material = m.material.clone(); m.material.color.setHex(s.color); car.paintedBy = s.color; }
}
function pay(c) { if (G.money < c) { notify('WREN: Cash first, kid.', 'bad'); return false; } G.money -= c; sfx.pickup(); return true; }
export function buyUpgrade(id) {
  const u = UPGRADES.find((q) => q.id === id), lv = garageLevel(id); if (!u || lv >= u.costs.length) return false;
  if (!pay(u.costs[lv])) return false; g()[id] = lv + 1; if (G.p.car) applyGarage(G.p.car); notify(`${u.name.toUpperCase()} LEVEL ${lv + 1}`, 'good'); return true;
}
export function buyRespray(color) { if (!pay(RESPRAY.cost)) return false; g().color = color; if (G.p.car) applyGarage(G.p.car); notify('FRESH PAINT: Wren approves', 'good'); return true; }
export function fillGarage() {
  const $ = (id) => document.getElementById(id), hex = (c) => '#' + c.toString(16).padStart(6, '0');
  $('garageMoney').textContent = `Cash $${Math.floor(G.money).toLocaleString('en-US')}${G.p.car ? ` · Working on: ${G.p.car.type.name}` : ''}`;
  $('garageList').innerHTML = UPGRADES.map((u) => { const lv = garageLevel(u.id), max = lv >= u.costs.length;
    return `<div class="item"><span><b>${u.name}</b> <span class="pips">${u.costs.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span><br><small>${u.desc}</small></span>${max ? '<span class="maxed">MAXED</span>' : `<button data-up="${u.id}">Level ${lv + 1} · $${u.costs[lv].toLocaleString('en-US')}</button>`}</div>`; }).join('')
    + `<div class="item"><span><b>Respray</b> $${RESPRAY.cost}</span><span class="swatches">${RESPRAY.colors.map((c) => `<button data-paint="${c}" style="background:${hex(c)}" aria-label="paint ${hex(c)}"></button>`).join('')}</span></div>`;
  $('garageList').querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => { buyUpgrade(b.dataset.up); fillGarage(); }));
  $('garageList').querySelectorAll('[data-paint]').forEach((b) => b.addEventListener('click', () => { buyRespray(+b.dataset.paint); fillGarage(); }));
}
export function initGarage() {
  addMarker({ ...WREN_GARAGE, color: 0xffb35a, kind: 'shop', label: "WREN'S GARAGE", prompt: "E: Wren's garage upgrades", auto: false, r: 4.5,
    onInteract: () => { if (!G.completed.includes('m1')) return notify('The garage is locked. Old Wren only opens up to friends.', 'bad'); G.hooks.openGarage(); } });
}

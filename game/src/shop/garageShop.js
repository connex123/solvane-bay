// Wren's garage at Point Wren (open once Wren joins in chapter 1): paid engine, armour plating and nitro tank upgrades
// plus a respray. Upgrades are Nico's tune-up kit: they apply to whatever car he drives. Saved with the game.
// Driving into the workshop (world/wrenGarage.js) and opening the garage rolls the car onto the lift and frames it from
// inside the shop, with the street behind it, beside the upgrade panel (stat bars, prices, paint swatches).
import { G, notify } from '../core/gameState.js';
import { WORKSHOP, BAY } from '../world/wrenGarage.js';
import { addMarker } from '../missions/markers.js';
import { sfx } from '../audio/soundEngine.js';

export const WREN_GARAGE = { x: BAY.x, z: BAY.z + 3 };
export const UPGRADES = [
  { id: 'engine', name: 'Engine rebuild', desc: '+12% acceleration, +5% top speed per level', costs: [1500, 3000, 5000] },
  { id: 'armour', name: 'Armour plating', desc: '-15% damage taken per level', costs: [1200, 2500, 4000] },
  { id: 'nitro', name: 'Nitro tank', desc: 'Boost lasts 40% longer per level', costs: [1000, 2500] },
];
export const RESPRAY = { cost: 200, colors: [0xd01020, 0x2fd6c4, 0xffd23c, 0x15151a, 0xff6a4f, 0xf0f0f0], names: ['Brandt red', 'Lagoon teal', 'Taxi gold', 'Night ink', 'Coral', 'Salt white'] };
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
// what the tune-up kit does to the car, as bar fills (0..1): the stock part and the part Wren's work adds
export function garageStats() {
  const s = g(), bar = (name, base, add, max) => ({ name, base: base / max, value: (base + add) / max });
  return [bar('ACCELERATION', 1, 0.12 * s.engine, 1.36), bar('TOP SPEED', 1, 0.05 * s.engine, 1.15), bar('ARMOUR', 0.3, 0.15 * s.armour, 0.75), bar('NITRO', 1, 0.4 * s.nitro, 1.8)];
}
// Opening the garage with a car inside the workshop rolls it onto the lift, nose in, and frames it from the back corner.
export function garageView() {
  const c = G.p.car, { x0, x1, z0, z1 } = WORKSHOP; G.garageCam = null;
  if (!c || c.x < x0 || c.x > x1 || c.z < z0 || c.z > z1 + 3) return false;
  c.x = BAY.x; c.z = BAY.z; c.heading = Math.PI; c.vx = c.vz = c.speed = 0; c.mesh.position.set(c.x, c.y || 0, c.z); c.mesh.rotation.set(0, c.heading, 0);
  G.garageCam = { pos: [x0 + 1.3, 2.7, z0 + 1.4], look: [x1 + 3.5, 0.9, z1 + 7], fov: 62 }; return true;
}
export function fillGarage() {
  const $ = (id) => document.getElementById(id), hex = (c) => '#' + c.toString(16).padStart(6, '0');
  garageView();
  $('garageMoney').innerHTML = `<span class="gcar">${G.p.car ? G.p.car.type.name.toUpperCase() : 'NO CAR IN THE BAY'}</span><span>Cash <b>$${Math.floor(G.money).toLocaleString('en-US')}</b></span>`;
  $('garageStats').innerHTML = garageStats().map((b) => `<div class="gstat"><span>${b.name}</span><i><em style="width:${Math.round(b.base * 100)}%"></em><u style="left:${Math.round(b.base * 100)}%;width:${Math.round((b.value - b.base) * 100)}%"></u></i></div>`).join('');
  $('garageList').innerHTML = UPGRADES.map((u) => { const lv = garageLevel(u.id), max = lv >= u.costs.length;
    return `<div class="item"><span><b>${u.name}</b> <span class="pips">${u.costs.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span><br><small>${u.desc}</small></span>${max ? '<span class="maxed">MAXED</span>' : `<button data-up="${u.id}">Level ${lv + 1} · $${u.costs[lv].toLocaleString('en-US')}</button>`}</div>`; }).join('')
    + `<div class="item"><span><b>Respray</b> $${RESPRAY.cost}<br><small>${g().color == null ? 'Stock paint' : RESPRAY.names[RESPRAY.colors.indexOf(g().color)] || 'Custom'}</small></span><span class="swatches">${RESPRAY.colors.map((c, i) => `<button data-paint="${c}" class="${g().color === c ? 'on' : ''}" style="background:${hex(c)}" aria-label="paint ${RESPRAY.names[i]}"></button>`).join('')}</span></div>`;
  $('garageList').querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => { buyUpgrade(b.dataset.up); fillGarage(); }));
  $('garageList').querySelectorAll('[data-paint]').forEach((b) => b.addEventListener('click', () => { buyRespray(+b.dataset.paint); fillGarage(); }));
}
export function initGarage() {
  addMarker({ ...WREN_GARAGE, color: 0xffb35a, kind: 'shop', label: "WREN'S GARAGE", prompt: "E: Wren's garage upgrades", auto: false, r: 4.5,
    onInteract: () => { if (!G.completed.includes('m1')) return notify('The garage is locked. Old Wren only opens up to friends.', 'bad'); G.hooks.openGarage(); } });
}

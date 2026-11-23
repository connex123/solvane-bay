// Wren's garage shop at Point Wren, open once Wren joins in chapter 1. Nico buys engine, armour and nitro upgrades
// and a respray; they are his tune-up kit, applied to whatever car he drives, and saved with the game. Opening the
// garage with a car in the workshop (world/wrenGarage.js) rolls it onto the lift and frames it from inside the shop,
// street behind, beside the upgrade panel with stat bars, prices and paint swatches.
import { G, notify } from '../core/gameState.js';
import { WORKSHOP, BAY, LIFT } from '../world/wrenGarage.js';
import { addMarker } from '../missions/markers.js';
import { sfx } from '../audio/soundEngine.js';

export const WREN_GARAGE = { x: BAY.x, z: BAY.z + 3 };

export const UPGRADES = [
  { id: 'engine', name: 'Engine rebuild', desc: '+12% acceleration, +5% top speed per level', costs: [1500, 3000, 5000] },
  { id: 'armour', name: 'Armour plating', desc: '-15% damage taken per level', costs: [1200, 2500, 4000] },
  { id: 'nitro', name: 'Nitro tank', desc: 'Boost lasts 40% longer per level', costs: [1000, 2500] },
];

const PAINT_JOBS = [
  [0xd01020, 'Brandt red'], [0x2fd6c4, 'Lagoon teal'], [0xffd23c, 'Taxi gold'],
  [0x15151a, 'Night ink'], [0xff6a4f, 'Coral'], [0xf0f0f0, 'Salt white'],
];
export const RESPRAY = {
  cost: 200,
  colors: PAINT_JOBS.map(([hex]) => hex),
  names: PAINT_JOBS.map(([, name]) => name),
};

// Per-level effect sizes.
const ENGINE_ACCEL = 0.12;
const ENGINE_TOP = 0.05;
const ARMOUR_CUT = 0.15;
const NITRO_STRETCH = 0.4;

function kit() {
  if (!G.garage) G.garage = { engine: 0, armour: 0, nitro: 0, color: null };
  return G.garage;
}

export const garageLevel = (id) => kit()[id] || 0;

/** Stamp the bought upgrades (and paint) onto a car; called whenever Nico gets behind a wheel. */
export function applyGarage(car) {
  const owned = kit();
  car.pacc = 1 + ENGINE_ACCEL * owned.engine;
  car.pmax = 1 + ENGINE_TOP * owned.engine;
  car.armourMul = 1 - ARMOUR_CUT * owned.armour;
  car.nitroMul = 1 / (1 + NITRO_STRETCH * owned.nitro);
  if (owned.color == null || car.paintedBy === owned.color) return;
  const body = car.mesh.userData.bodyMesh;
  body.material = body.material.clone(); // never repaint the shared material of every car of this model
  body.material.color.setHex(owned.color);
  car.paintedBy = owned.color;
}

function charge(amount) {
  if (G.money < amount) {
    notify('WREN: Cash first, kid.', 'bad');
    return false;
  }
  G.money -= amount;
  sfx.pickup();
  return true;
}

function refitCurrentCar() {
  if (G.p.car) applyGarage(G.p.car);
}

export function buyUpgrade(id) {
  const upgrade = UPGRADES.find((entry) => entry.id === id);
  const level = garageLevel(id);
  if (!upgrade || level >= upgrade.costs.length) return false;
  if (!charge(upgrade.costs[level])) return false;
  kit()[id] = level + 1;
  refitCurrentCar();
  notify(`${upgrade.name.toUpperCase()} LEVEL ${level + 1}`, 'good');
  return true;
}

export function buyRespray(color) {
  if (!charge(RESPRAY.cost)) return false;
  kit().color = color;
  refitCurrentCar();
  notify('FRESH PAINT: Wren approves', 'good');
  return true;
}

/** What the kit does to a car, as bar fills in 0..1: `base` is the stock part, `value` adds Wren's work. */
export function garageStats() {
  const owned = kit();
  const bar = (name, stock, bonus, full) => ({ name, base: stock / full, value: (stock + bonus) / full });
  return [
    bar('ACCELERATION', 1, ENGINE_ACCEL * owned.engine, 1.36),
    bar('TOP SPEED', 1, ENGINE_TOP * owned.engine, 1.15),
    bar('ARMOUR', 0.3, ARMOUR_CUT * owned.armour, 0.75),
    bar('NITRO', 1, NITRO_STRETCH * owned.nitro, 1.8),
  ];
}

/** With a car in the workshop, roll it onto the lift nose-in and set a camera in the back corner. */
export function garageView() {
  const car = G.p.car;
  const { x0, x1, z0, z1 } = WORKSHOP;
  G.garageCam = null;
  if (!car) return false;
  const inWorkshop = car.x >= x0 && car.x <= x1 && car.z >= z0 && car.z <= z1 + 3;
  if (!inWorkshop) return false;
  car.x = BAY.x;
  car.z = BAY.z;
  car.heading = Math.PI;
  car.vx = 0;
  car.vz = 0;
  car.speed = 0;
  car.mesh.position.set(car.x, LIFT.y, car.z); // tyres on the runways
  car.mesh.rotation.set(0, car.heading, 0);
  G.garageCam = { pos: [x0 + 1.3, 2.7, z0 + 1.4], look: [x1 + 3.5, 0.9, z1 + 7], fov: 62 };
  return true;
}

const cssHex = (value) => '#' + value.toString(16).padStart(6, '0');
const dollars = (n) => n.toLocaleString('en-US');

function statBarsHtml() {
  return garageStats().map((stat) => {
    const stock = Math.round(stat.base * 100);
    const extra = Math.round((stat.value - stat.base) * 100);
    return `<div class="gstat"><span>${stat.name}</span><i><em style="width:${stock}%"></em><u style="left:${stock}%;width:${extra}%"></u></i></div>`;
  }).join('');
}

function upgradeRowHtml(upgrade) {
  const level = garageLevel(upgrade.id);
  const pips = upgrade.costs.map((_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
  const action = level >= upgrade.costs.length
    ? '<span class="maxed">MAXED</span>'
    : `<button data-up="${upgrade.id}">Level ${level + 1} · $${dollars(upgrade.costs[level])}</button>`;
  return `<div class="item"><span><b>${upgrade.name}</b> <span class="pips">${pips}</span><br><small>${upgrade.desc}</small></span>${action}</div>`;
}

function resprayRowHtml() {
  const current = kit().color;
  const label = current == null ? 'Stock paint' : RESPRAY.names[RESPRAY.colors.indexOf(current)] || 'Custom';
  const swatches = RESPRAY.colors.map((colour, i) =>
    `<button data-paint="${colour}" class="${current === colour ? 'on' : ''}" style="background:${cssHex(colour)}" aria-label="paint ${RESPRAY.names[i]}"></button>`).join('');
  return `<div class="item"><span><b>Respray</b> $${RESPRAY.cost}<br><small>${label}</small></span><span class="swatches">${swatches}</span></div>`;
}

/** Fill (or refresh) the garage panel; buttons buy and then redraw it. */
export function fillGarage() {
  const byId = (id) => document.getElementById(id);
  garageView();
  const carName = G.p.car ? G.p.car.type.name.toUpperCase() : 'NO CAR IN THE BAY';
  byId('garageMoney').innerHTML = `<span class="gcar">${carName}</span><span>Cash <b>$${dollars(Math.floor(G.money))}</b></span>`;
  byId('garageStats').innerHTML = statBarsHtml();
  const list = byId('garageList');
  list.innerHTML = UPGRADES.map(upgradeRowHtml).join('') + resprayRowHtml();
  for (const button of list.querySelectorAll('[data-up]')) {
    button.addEventListener('click', () => { buyUpgrade(button.dataset.up); fillGarage(); });
  }
  for (const button of list.querySelectorAll('[data-paint]')) {
    button.addEventListener('click', () => { buyRespray(Number(button.dataset.paint)); fillGarage(); });
  }
}

export function initGarage() {
  addMarker({
    ...WREN_GARAGE, color: 0xffb35a, kind: 'shop', label: "WREN'S GARAGE", prompt: "E: Wren's garage upgrades", auto: false, r: 4.5,
    onInteract: () => {
      if (!G.completed.includes('m1')) return notify('The garage is locked. Old Wren only opens up to friends.', 'bad');
      G.hooks.openGarage();
    },
  });
}

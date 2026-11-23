// The five weapon slots: fists, pistol, SMG, shotgun and the thrown molotov. Guns unlock by respect level,
// in the shop, or through the story.

// Columns: id, name, damage, seconds between shots, range (m), pellets, spread, automatic, price, level, magazine.
const TABLE = [
  ['fists', 'Fists', 14, 0.42, 2.4, 1, 0, false, 0, 1, 0],
  ['pistol', 'Pistol', 30, 0.28, 90, 1, 0.008, false, 0, 1, 12],
  ['smg', 'SMG', 15, 0.075, 80, 1, 0.03, true, 700, 2, 30],
  ['shotgun', 'Shotgun', 14, 0.85, 40, 7, 0.07, false, 1000, 3, 8],
  ['molotov', 'Molotov', 0, 0.9, 24, 0, 0, false, 600, 2, 1],
];

// Price of a box of ammo, and the most a player can carry.
const AMMO = {
  pistol: { box: 60, cap: 120 },
  smg: { box: 90, cap: 300 },
  shotgun: { box: 100, cap: 48 },
  molotov: { box: 150, cap: 10 },
};

export const WEAPONS = TABLE.map(([id, name, dmg, rate, range, pellets, spread, auto, price, level, mag]) => {
  const weapon = { id, name, dmg, rate, range, pellets, spread, auto, price, level, mag };
  if (id === 'molotov') weapon.thrown = true;
  if (AMMO[id]) weapon.ammoPrice = AMMO[id].box;
  return weapon;
});

export function maxAmmo(id) {
  return AMMO[id] ? AMMO[id].cap : 0;
}

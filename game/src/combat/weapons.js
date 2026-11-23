// Weapon definitions for the five slots: fists, pistol, SMG, shotgun and the thrown molotov (unlocked by rep level, shop, story).
export const WEAPONS = [
  { id: 'fists', name: 'Fists', dmg: 14, rate: 0.42, range: 2.4, pellets: 1, spread: 0, auto: false, price: 0, level: 1, mag: 0 },
  { id: 'pistol', name: 'Pistol', dmg: 30, rate: 0.28, range: 90, pellets: 1, spread: 0.008, auto: false, price: 0, level: 1, mag: 12, ammoPrice: 60 },
  { id: 'smg', name: 'SMG', dmg: 15, rate: 0.075, range: 80, pellets: 1, spread: 0.03, auto: true, price: 700, level: 2, mag: 30, ammoPrice: 90 },
  { id: 'shotgun', name: 'Shotgun', dmg: 14, rate: 0.85, range: 40, pellets: 7, spread: 0.07, auto: false, price: 1000, level: 3, mag: 8, ammoPrice: 100 },
  { id: 'molotov', name: 'Molotov', dmg: 0, rate: 0.9, range: 24, pellets: 0, spread: 0, auto: false, thrown: true, price: 600, level: 2, mag: 1, ammoPrice: 150 },
];
export const maxAmmo = (id) => ({ pistol: 120, smg: 300, shotgun: 48, molotov: 10 }[id] || 0);

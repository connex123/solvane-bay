// Side content: taxi fares, a street race, hidden packages, health/armor pickups, Calder Arms weapon shop and Glow Coat Respray.
import { G, notify } from '../core/gameState.js';
import { rnd } from '../core/random.js';
import { lineCoord, CAR_COLORS } from '../core/config.js';
import { addMarker } from './markers.js';
import { startMission } from './missionRunner.js';
import { corner } from './storyMissions.js';
import { setStars } from '../police/wantedSystem.js';
import { sfx } from '../audio/soundEngine.js';
import * as THREE from 'three';

export const SHOP = corner(5, 5, -1, -1), GARAGE = corner(4, 6, 1, -1), TAXI = corner(3, 8, 1, -1), RACE = corner(8, 5, -1, 1);
export const RESPAWN = { hospital: corner(6, 4, 1, 1), police: corner(4, 3, -1, 1) };
const PACK = [[1, 1], [7, 0], [8, 3], [3, 2], [5, 1], [0, 4], [6, 8], [2, 8], [8, 7], [4, 5], [0, 7], [5, 7], [1, 5], [7, 5], [3, 0], [6, 2]];
let packs = [], pickups = [];
export function initSideActivities() {
  addMarker({ ...SHOP, color: 0x4fa8ff, kind: 'shop', label: 'CALDER ARMS', prompt: 'E: Calder Arms weapon shop', auto: false, r: 4, onInteract: () => G.hooks.openShop() });
  addMarker({ ...GARAGE, color: 0x4fe0a0, kind: 'garage', label: 'GLOW COAT RESPRAY', needCar: true, r: 5, cooldown: 4, onEnter: () => {
    const c = G.p.car; if (G.money < 150) return notify('GLOW COAT RESPRAY costs $150', 'bad'); G.money -= 150; c.mesh.userData.bodyMesh.material = c.mesh.userData.bodyMesh.material.clone(); c.mesh.userData.bodyMesh.material.color.setHex(rnd.pick(CAR_COLORS)); c.hp = c.maxHp; setStars(0); G.wanted.heat = 0; notify('RESPRAYED: wanted level cleared', 'good'); sfx.pickup(); } });
  addMarker({ ...TAXI, color: 0xf2c230, kind: 'side', label: 'TAXI FARE', prompt: 'E: start a taxi fare (needs a car)', auto: false, needCar: true, r: 5, onInteract: () => startFare() });
  addMarker({ ...RACE, color: 0xff4fd8, kind: 'side', label: 'STREET RACE', prompt: 'E: start a street race (needs a car)', auto: false, needCar: true, r: 5, onInteract: () => startRace() });
  const gm = new THREE.SphereGeometry(0.7, 10, 8), mm = new THREE.MeshBasicMaterial({ color: 0xffe14a });
  PACK.forEach(([i, j], k) => { const m = new THREE.Mesh(gm, mm); const pt = corner(i, j, k % 2 ? 1 : -1, k % 3 ? 1 : -1); m.position.set(pt.x, 1.4, pt.z); G.scene.add(m); packs.push({ ...pt, m, id: k }); });
  [[6, 4, -1], [3, 5, 1], [4, 2, 1], [1, 6, 1], [8, 2, -1], [5, 8, 1]].forEach(([i, j, s], k) => { const type = k % 2 ? 'armor' : 'health', pt = corner(i, j, s, -s);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ color: type === 'health' ? 0xff4f6a : 0x4fa8ff })); m.position.set(pt.x, 1.2, pt.z); G.scene.add(m); pickups.push({ ...pt, m, type, t: 0 }); });
}
export function updateSide(dt) {
  const p = G.p;
  for (const k of packs) { if (G.packages.includes(k.id)) { k.m.visible = false; continue; } k.m.rotation.y += dt * 2; k.m.position.y = 1.4 + Math.sin(G.time * 3 + k.id) * 0.2; if (Math.hypot(k.x - p.x, k.z - p.z) < 2.2) { G.packages.push(k.id); G.money += 250; G.xp += 20; sfx.pickup(); notify(`HIDDEN PACKAGE ${G.packages.length}/${packs.length}  +$250`, 'good'); if (G.packages.length === packs.length) { G.money += 5000; notify('ALL PACKAGES FOUND  +$5000', 'good'); } } }
  for (const k of pickups) { if (k.t > 0) { k.t -= dt; k.m.visible = k.t <= 0; continue; } k.m.rotation.y += dt * 2; if (Math.hypot(k.x - p.x, k.z - p.z) < 2) { if (k.type === 'health') p.hp = 100; else p.armor = 100; k.t = 60; k.m.visible = false; sfx.pickup(); } }
}
export const packageCount = () => packs.length;
export const packagePositions = () => packs.map((k) => ({ x: k.x, z: k.z, got: G.packages.includes(k.id) }));
function startFare() {
  if (G.mission) return notify('Finish your current mission first', 'bad');
  const a = { x: lineCoord(rnd.int(1, 8)) + 9, z: lineCoord(rnd.int(1, 8)) + 9 }, b = { x: lineCoord(rnd.int(0, 8)) - 9, z: lineCoord(rnd.int(0, 8)) - 9 }, d = Math.hypot(a.x - b.x, a.z - b.z);
  startMission({ side: true, title: 'TAXI FARE', chapter: 0, reward: { money: Math.round(150 + d * 1.5), xp: 25 }, stages: [{ type: 'goto', at: a, r: 6, car: 'any', text: 'Pick up the passenger' }, { type: 'goto', at: b, r: 6, car: 'any', time: Math.round(40 + d / 9), text: 'Drop the fare off in time' }] });
}
function startRace() {
  if (G.mission) return notify('Finish your current mission first', 'bad');
  const pts = [[8, 8], [5, 8], [3, 6], [3, 3], [6, 2], [8, 4], [8, 5]].map(([i, j]) => ({ x: lineCoord(i), z: lineCoord(j) }));
  startMission({ side: true, title: 'STREET RACE', chapter: 0, reward: { money: 1200, xp: 90 }, stages: pts.map((q, k) => ({ type: 'goto', at: q, r: 9, car: 'any', time: k === 0 ? 40 : 28, text: `Race checkpoint ${k + 1}/${pts.length}` })) });
}

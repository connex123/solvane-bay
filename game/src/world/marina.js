// Marina Cala: the boardwalk, pier nine and its finger piers, Viktor Brandt's three-deck yacht the CROWN JEWEL
// (coral and cream), the speedboat berth, and the Point Wren light jetty where the ledger is handed over.
// Also answers "how high is the walkable deck here?" and "which water is blocked?" for players, guards and boats.
import * as THREE from 'three';
import { SEA_X } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { G } from '../core/gameState.js';
import { addBox } from './collision.js';
import { CAUSEWAY, LIGHTHOUSE } from './landmarks.js';

const CORAL = 0xe8604c, CREAM = 0xf6ead2, TEAK = 0xc8925e, TINT = 0x1d4a58, PLANK = 0x9a7650;
const PIER_Z = -190, DECK_TOP = 0.55;
// the yacht lies along the south side of pier nine, bow out to sea (+x)
export const YACHT = { x: SEA_X + 44, z: PIER_Z + 7.2, len: 36, wid: 9, deckY: 1.15, name: 'CROWN JEWEL' };
export const MARINA_GATE = { x: SEA_X - 9, z: PIER_Z };
export const GANGWAY = { x: YACHT.x - 13, z: PIER_Z + 2.4 };
export const SAFE = { x: YACHT.x - 9.5, z: YACHT.z };
export const GUARD_SPOTS = [{ x: YACHT.x - 15, z: YACHT.z - 2.2 }, { x: YACHT.x - 12, z: YACHT.z + 2.4 }, { x: YACHT.x - 7.5, z: YACHT.z - 2.6 }, { x: YACHT.x - 16, z: YACHT.z + 1.8 }];
export const SPEEDBOAT_BERTH = { x: SEA_X + 60, z: PIER_Z - 4.6, h: Math.PI / 2 };
export const DROP = { x: LIGHTHOUSE.x - 24, z: LIGHTHOUSE.z - 22 };
// walkable rectangles [x0, x1, z0, z1, top]
const DECKS = [
  [SEA_X - 4, SEA_X + 4, -262, -118, DECK_TOP], // boardwalk
  [SEA_X, SEA_X + 72, PIER_Z - 2, PIER_Z + 2, DECK_TOP], // pier nine
  [SEA_X, SEA_X + 40, -232, -229, DECK_TOP], [SEA_X, SEA_X + 40, -152, -149, DECK_TOP], // finger piers
  [DROP.x - 2, DROP.x + 16, DROP.z + 5, DROP.z + 9, DECK_TOP], // light jetty
  [YACHT.x - YACHT.len / 2, YACHT.x + YACHT.len / 2 - 3, YACHT.z - YACHT.wid / 2, YACHT.z + YACHT.wid / 2, YACHT.deckY],
];
export function surfaceHeight(x, z) {
  let h = 0; for (const d of DECKS) if (x > d[0] && x < d[1] && z > d[2] && z < d[3]) h = Math.max(h, d[4]); return h;
}
// nearest standing spot on a pier or jetty within r (for stepping off a boat)
export function dockSpotNear(x, z, r = 6) {
  let best = null, bd = r;
  for (const d of DECKS.slice(0, 5)) { const px = Math.min(Math.max(x, d[0] + 0.8), d[1] - 0.8), pz = Math.min(Math.max(z, d[2] + 0.8), d[3] - 0.8), dd = Math.hypot(px - x, pz - z); if (dd < bd) { bd = dd; best = { x: px, z: pz }; } }
  return best;
}
// water obstacles for boats: rectangles [x0, x1, z0, z1] plus circles
const RECTS = [
  [-1e4, SEA_X + 1.5, -1e4, 1e4], // the shore
  ...DECKS.slice(1, 5).map((d) => [d[0], d[1], d[2] - 0.4, d[3] + 0.4]),
  [YACHT.x - YACHT.len / 2, YACHT.x + YACHT.len / 2 + 2, YACHT.z - YACHT.wid / 2, YACHT.z + YACHT.wid / 2],
  [CAUSEWAY.x0 - 7, CAUSEWAY.x0 + 3, CAUSEWAY.z - 13, CAUSEWAY.z + 13],
];
for (let x = CAUSEWAY.x0 + 50; x < CAUSEWAY.x0 + 1400; x += 70) if (CAUSEWAY.pylons.every((p) => Math.abs(p - x) > 30)) RECTS.push([x - 2, x + 2, CAUSEWAY.z - 7, CAUSEWAY.z + 7]);
for (const px of CAUSEWAY.pylons) RECTS.push([px - 8, px + 8, CAUSEWAY.z - 18, CAUSEWAY.z + 18]);
const CIRCLES = [[LIGHTHOUSE.x, LIGHTHOUSE.z, 11]];
// push a circle (boat) out of obstacles; returns the push and the surface normal, or null
export function waterBlock(x, z, r) {
  for (const b of RECTS) {
    const px = Math.min(Math.max(x, b[0]), b[1]), pz = Math.min(Math.max(z, b[2]), b[3]), dx = x - px, dz = z - pz, d = Math.hypot(dx, dz);
    if (d < r) { if (d > 1e-4) return { dx: dx / d * (r - d), dz: dz / d * (r - d), nx: dx / d, nz: dz / d };
      const out = [[x - b[0], -1, 0], [b[1] - x, 1, 0], [z - b[2], 0, -1], [b[3] - z, 0, 1]].sort((a, c) => a[0] - c[0])[0]; return { dx: out[1] * (out[0] + r), dz: out[2] * (out[0] + r), nx: out[1], nz: out[2] }; }
  }
  for (const [cx, cz, cr] of CIRCLES) { const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz) || 1; if (d < cr + r) return { dx: dx / d * (cr + r - d), dz: dz / d * (cr + r - d), nx: dx / d, nz: dz / d }; }
  return null;
}

function nameplate(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = '#f6ead2'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#c8402e'; g.font = 'bold 60px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function yacht(scene, B) {
  const { x, z, len, wid, deckY } = YACHT, a = x - len / 2;
  // hull in three tapering steps toward the bow, a coral boot stripe and a teak main deck
  pushBox(B, x - 3, -1.3, z, len - 6, deckY + 1.3, wid, CREAM); pushBox(B, x + len / 2 - 4.5, -1.1, z, 3, deckY + 1.1 + 0.2, wid * 0.72, CREAM); pushBox(B, x + len / 2 - 1.5, -0.8, z, 3, deckY + 0.8 + 0.45, wid * 0.4, CREAM);
  pushBox(B, x - 3, -0.7, z, len - 5.8, 1.1, wid + 0.12, CORAL); pushBox(B, x + len / 2 - 4.5, -0.5, z, 3.1, 1.0, wid * 0.72 + 0.12, CORAL);
  pushBox(B, x - 3, deckY - 0.02, z, len - 6.4, 0.08, wid - 0.4, TEAK);
  for (const s of [-1, 1]) { pushBox(B, x - 4, deckY, z + s * (wid / 2 - 0.1), len - 8, 0.95, 0.08, 0xffffff); for (let k = 0; k < 9; k++) pushBox(B, a + 2 + k * 3.4, deckY, z + s * (wid / 2 - 0.1), 0.08, 0.95, 0.08, 0xffffff); }
  pushBox(B, a + 0.6, deckY, z, 0.08, 0.95, wid - 0.4, 0xffffff);
  // deck 2 (salon), deck 3 (bridge), flybridge and radar arch, with dark tinted window bands
  pushBox(B, x + 3, deckY, z, 20, 2.5, wid - 1.6, CREAM); pushBox(B, x + 3, deckY + 0.95, z, 20.1, 1.05, wid - 1.5, TINT);
  pushBox(B, x + 4.5, deckY + 2.5, z, 21.5, 0.4, wid - 0.8, CORAL);
  pushBox(B, x + 5, deckY + 2.75, z, 14, 2.1, wid - 2.4, CREAM); pushBox(B, x + 5, deckY + 3.4, z, 14.1, 0.95, wid - 2.3, TINT); pushBox(B, x + 6, deckY + 4.85, z, 16, 0.22, wid - 1.8, CORAL);
  pushBox(B, x + 4, deckY + 5.07, z, 7, 1.0, wid - 3.4, CREAM); pushBox(B, x + 4, deckY + 6.07, z, 7.6, 0.18, wid - 3, CORAL);
  for (const s of [-1, 1]) pushBox(B, x + 1.5, deckY + 5.07, z + s * 2.2, 0.3, 3, 0.3, 0xffffff); pushBox(B, x + 1.5, deckY + 8, z, 0.5, 0.3, 4.7, 0xffffff); pushBox(B, x + 1.5, deckY + 8.3, z, 1.6, 0.25, 0.25, 0x333a40);
  // aft: swim platform, deck chairs, the safe by the salon door, gangway to the pier
  pushBox(B, a - 1, -0.15, z, 2, 0.35, wid - 1, TEAK);
  for (const s of [-1, 1]) pushBox(B, a + 4, deckY, z + s * 2.4, 2.2, 0.4, 0.9, 0x2fc4b2);
  pushBox(B, SAFE.x, deckY, SAFE.z, 0.9, 1.1, 0.9, 0x30343a); pushBox(B, SAFE.x - 0.46, deckY + 0.35, SAFE.z, 0.04, 0.3, 0.3, 0xe8b84a);
  pushBox(B, GANGWAY.x, DECK_TOP, GANGWAY.z + 0.8, 1.2, 0.12, 3.2, 0xdcdcdc);
  addBox({ x0: x - 7, x1: x + 13, z0: z - wid / 2 + 0.8, z1: z + wid / 2 - 0.8 }); // the salon is solid
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.3), new THREE.MeshBasicMaterial({ map: nameplate(YACHT.name) }));
  plate.position.set(a - 0.02, deckY - 0.6, z); plate.rotation.y = -Math.PI / 2; scene.add(plate);
  for (const s of [-1, 1]) { const p2 = plate.clone(); p2.scale.setScalar(0.8); p2.position.set(x + 6, deckY - 0.5, z + s * (wid / 2 + 0.07)); p2.rotation.y = s > 0 ? 0 : Math.PI; scene.add(p2); }
}
export function buildMarina(scene) {
  const B = newBuf();
  for (const d of DECKS.slice(0, 5)) { pushBox(B, (d[0] + d[1]) / 2, -0.6, (d[2] + d[3]) / 2, d[1] - d[0], DECK_TOP + 0.6, d[3] - d[2], PLANK);
    for (let px = d[0] + 2; px < d[1]; px += 8) for (const pz of [d[2], d[3]]) pushBox(B, px, -0.6, pz, 0.4, DECK_TOP + 1.3, 0.4, 0x6a5038); }
  // gate arch at the shore end of pier nine
  for (const s of [-1, 1]) pushBox(B, MARINA_GATE.x, 0, MARINA_GATE.z + s * 7, 0.9, 6, 0.9, CREAM); pushBox(B, MARINA_GATE.x, 6, MARINA_GATE.z, 1.2, 1.2, 15, CORAL);
  // small cruisers and sailboats on the finger piers
  for (const pz of [-230.5, -150.5]) for (let b = 0; b < 4; b++) { const bz = pz + (b % 2 ? 5 : -5), bx = SEA_X + 7 + b * 9, c = [0xffffff, 0xf4a6a0, 0x8fd3c8, 0xf6e3b4][(b + (pz > -200 ? 1 : 0)) % 4];
    pushBox(B, bx, -0.3, bz, 7, 1.4, 2.8, c); pushBox(B, bx - 0.8, 1.1, bz, 2.6, 1.0, 2.0, 0xf8f8f8); if (b % 2) pushBox(B, bx + 0.8, 1.1, bz, 0.18, 8, 0.18, 0xdddddd); }
  yacht(scene, B);
  const m = new THREE.Mesh(toGeometry(B), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
}
// guards stand on the decks they are over (the player's height is set in playerController)
export function updateMarina() {
  for (const a of G.actors) { if (Math.abs(a.x - YACHT.x) > 80 || Math.abs(a.z - PIER_Z) > 80) continue; const h = surfaceHeight(a.x, a.z); if (a.dead) a.mesh.position.y = h + 0.2; else { a.y = h; a.mesh.position.y = h; } }
}

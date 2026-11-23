// Solvane Bay's landmarks, built from real geometry: the coral-red cable-stayed Causeway striding out over the sea,
// the striped Point Wren light on its rock off the Strand, Crown Tower (the tallest glass tower in Crown Heights, crowned
// in gold that glows at dusk) and the Old Town lagoon market on stilts over turquoise water.
import * as THREE from 'three';
import { SEA_X, lineCoord, S } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';

import { addBox } from './collision.js';
import { buildGasBottles } from '../combat/gasBottles.js';

// Map positions (also used by the city map legend and icons).
export const CAUSEWAY = { z: lineCoord(3) + 8, x0: SEA_X + 30, pylons: [SEA_X + 70, SEA_X + 236], deckY: 15 };
export const LIGHTHOUSE = { x: SEA_X + 58, z: lineCoord(7) + 44 };
export const CROWN_TOWER = { x: lineCoord(5) + S / 2, z: lineCoord(3) + S / 2, h: 222 };
export const LAGOON = { x: lineCoord(0) + S / 2, z: lineCoord(7) + S / 2 };
export const LANDMARKS = [
  { id: 'causeway', name: 'The Causeway', x: CAUSEWAY.pylons[0], z: CAUSEWAY.z },
  { id: 'lighthouse', name: 'Point Wren Light', x: LIGHTHOUSE.x, z: LIGHTHOUSE.z },
  { id: 'tower', name: 'Crown Tower', x: CROWN_TOWER.x, z: CROWN_TOWER.z },
  { id: 'lagoon', name: 'Lagoon Market', x: LAGOON.x, z: LAGOON.z },
];

const CORAL = 0xe8604c, CREAM = 0xf6ead2, GOLD = 0xe8b84a, PYLON = 0xf06a50;
const live = { crown: null, lamp: null, glow: null, beam: null };

function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

function causeway(scene, B) {
  const { z, x0, pylons, deckY } = CAUSEWAY, x1 = x0 + 1400;
  // deck, kerbs, a coral fascia stripe, and the abutment standing in the shallows
  pushBox(B, (x0 + x1) / 2, deckY - 2.4, z, x1 - x0, 2.4, 22, 0xd8d2c8); pushBox(B, (x0 + x1) / 2, deckY - 1.6, z - 11.1, x1 - x0, 0.8, 0.3, CORAL); pushBox(B, (x0 + x1) / 2, deckY - 1.6, z + 11.1, x1 - x0, 0.8, 0.3, CORAL);
  pushBox(B, (x0 + x1) / 2, deckY, z, x1 - x0, 0.14, 21, 0x50565e);
  for (const s of [-1, 1]) pushBox(B, (x0 + x1) / 2, deckY, z + s * 10.4, x1 - x0, 1.1, 0.25, CREAM);
  pushBox(B, x0 - 2, -2, z, 10, deckY - 0.4, 26, 0xcfc6b6);
  for (let x = x0 + 50; x < x1; x += 70) if (pylons.every((p) => Math.abs(p - x) > 30)) pushBox(B, x, -2, z, 4, deckY - 2.4 + 2, 14, 0xcfc6b6);
  // two H pylons: twin tapering legs outside the deck, a crossbeam under the deck and one near the top. They have their own
  // floodlit material (see floodlitMaterial): from late afternoon the coral faces glow from the deck floodlights so the
  // pylons read coral against the low sun, and gold strips on every leg corner catch the light like a rim.
  const H = 128, P = newBuf(), R = newBuf(), L = newBuf();
  for (const px of pylons) {
    for (const s of [-1, 1]) for (let k = 0; k < 8; k++) { const w = 6.2 - k * 0.45, y = -2 + k * (H / 8), zc = z + s * (13.5 - k * 0.5); pushBox(P, px, y, zc, w, H / 8 + 0.2, w, PYLON);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) pushBox(R, px + sx * w / 2, y, zc + sz * w / 2, 0.55, H / 8 + 0.2, 0.55, GOLD); }
    pushBox(P, px, deckY - 6, z, 5, 3.5, 30, PYLON); pushBox(P, px, H * 0.74, z, 4, 4.5, 24, PYLON); pushBox(B, px, -3, z, 16, 3, 36, 0xbfb6a6);
    pushBox(R, px, H * 0.74 - 0.3, z, 4.3, 0.5, 24.3, GOLD); pushBox(R, px, H * 0.74 + 4.3, z, 4.3, 0.5, 24.3, GOLD);
    pushBox(P, px, H - 2, z, 4.4, 2, 24, 0xfff2dc);
    for (const s of [-1, 1]) for (const y of [deckY + 30, H * 0.5, H * 0.74 + 2]) pushBox(L, px + 3.4, y, z + s * 12, 0.9, 0.9, 0.9, 0xffffff); // white marker lamps up the legs
  }
  live.pylonMat = floodlitMaterial(); live.rimMat = floodlitMaterial();
  for (const [b, m] of [[P, live.pylonMat], [R, live.rimMat]]) { const mesh = new THREE.Mesh(toGeometry(b), m); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); }
  // deck lamps: a warm bead every 24 m along both kerbs, the whole way out to sea
  for (let x = x0 + 10; x < x1; x += 24) for (const s of [-1, 1]) pushBox(L, x, deckY + 1.1, z + s * 10.4, 0.7, 0.45, 0.7, 0xffffff);
  scene.add(new THREE.Mesh(toGeometry(L), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.9, 1.1) })));
  // cable fans: from anchor points high on each leg down to the deck edge on both sides of the pylon
  const pts = [];
  for (const px of pylons) for (const s of [-1, 1]) for (const dir of [-1, 1]) for (let i = 0; i < 11; i++) {
    const ay = H * 0.78 + i * 2.4, ax = px + dir * 1.2, az = z + s * (13.5 - 0.5 * (ay / (H / 8)) * 0.98);
    const dx = px + dir * (22 + i * 11.5); pts.push(ax, ay, az, dx, deckY + 0.6, z + s * 10.4);
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.LineSegments(cg, live.cableMat = new THREE.LineBasicMaterial({ color: 0xfff4e0 })));
  // red aviation lamps on the pylon tops
  const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.5, 0.35) }), lg = new THREE.SphereGeometry(1.1, 8, 6);
  for (const px of pylons) for (const s of [-1, 1]) { const m = new THREE.Mesh(lg, lampM); m.position.set(px, H + 0.6, z + s * 10); scene.add(m); }
}
// Lambert with an emissive that follows the vertex colour (coral glows coral, gold glows gold); the strength is set per frame.
function floodlitMaterial() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0 });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance *= vColor.rgb;'); };
  return m;
}

function lighthouse(scene, B) {
  const { x, z } = LIGHTHOUSE, rock = new THREE.MeshLambertMaterial({ color: 0x7c7466 }), rg = new THREE.DodecahedronGeometry(1, 0);
  [[0, 0, 13, 4], [9, 5, 8, 3], [-8, 6, 7, 2.6], [5, -9, 7, 2.4], [-6, -7, 6, 2]].forEach(([dx, dz, r, h]) => { const m = new THREE.Mesh(rg, rock); m.position.set(x + dx, h * 0.3, z + dz); m.scale.set(r, h, r * 0.9); m.rotation.y = dx; scene.add(m); });
  pushBox(B, x, 3.4, z, 12, 0.6, 12, 0xe2dccd); pushBox(B, x - 7, 0.2, z, 16, 0.5, 2.2, 0x9a7650); // base platform and jetty
  const g = new THREE.Group(); g.position.set(x, 4, z); scene.add(g);
  const white = new THREE.MeshLambertMaterial({ color: 0xfaf6ee }), red = new THREE.MeshLambertMaterial({ color: CORAL });
  const H = 30, bands = 6;
  for (let k = 0; k < bands; k++) { const r0 = 3.3 - k * (1.0 / bands), r1 = r0 - 1.0 / bands, m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, H / bands, 20), k % 2 ? red : white); m.position.y = (k + 0.5) * H / bands; m.castShadow = true; g.add(m); }
  const dark = new THREE.MeshLambertMaterial({ color: 0x23383c });
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.5, 20), dark); gal.position.y = H + 0.25; g.add(gal);
  const lamp = live.lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.5) })); lamp.position.y = H + 2; g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.3, 2.6, 16), red); cap.position.y = H + 4.8; g.add(cap);
  const glow = live.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,244,214,1)', 'rgba(255,190,110,0.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.y = H + 2; glow.scale.set(16, 16, 1); g.add(glow);
  // the sweeping beam: a long faint cone that turns slowly, strongest at dusk
  const beam = live.beam = new THREE.Group(); beam.position.y = H + 2; g.add(beam);
  const bm = new THREE.Mesh(new THREE.ConeGeometry(5, 90, 16, 1, true).translate(0, -45, 0).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  bm.position.x = 0; beam.add(bm);
}

function glassTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, '#5fb6c4'); gr.addColorStop(0.5, '#2f8796'); gr.addColorStop(1, '#5fb6c4'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  g.fillStyle = 'rgba(255,240,215,0.55)'; for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 64, 2);
  g.fillStyle = 'rgba(20,50,58,0.5)'; for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

function crownTower(scene, B) {
  const { x, z } = CROWN_TOWER;
  pushBox(B, x, 0, z, 48, 9, 48, 0xe6d6bc); pushBox(B, x, 9, z, 50, 0.8, 50, GOLD); pushBox(B, x, 0, z - 24.2, 20, 6, 0.6, 0x24484e); // podium, gold cornice, lobby glass
  addBox({ x0: x - 24, x1: x + 24, z0: z - 24, z1: z + 24, h: 9.8 });
  const tex = glassTexture(), mats = [];
  const SEC = [[32, 92], [27, 70], [22, 46]]; let y = 9.8;
  for (const [w, h] of SEC) {
    const t = tex.clone(); t.needsUpdate = true; t.repeat.set(w / 16, h / 16);
    const m = new THREE.MeshPhongMaterial({ map: t, color: 0xffffff, specular: 0xffe6c0, shininess: 70, emissive: 0xffb060, emissiveIntensity: 0, emissiveMap: t }); mats.push(m);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), m); mesh.position.set(x, y + h / 2, z); mesh.castShadow = true; scene.add(mesh);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pushBox(B, x + sx * w / 2, y, z + sz * w / 2, 1.4, h, 1.4, GOLD); // gold corner fins
    pushBox(B, x, y + h - 0.2, z, w + 1.6, 1.4, w + 1.6, GOLD); y += h + 1.2;
  }
  // the gold crown crest: a band, eight points and a spire; emissive so it glows as the sun goes down
  const crown = live.crown = new THREE.MeshPhongMaterial({ color: GOLD, emissive: 0xffa020, emissiveIntensity: 0.3, specular: 0xfff0c0, shininess: 90 });
  const cg = new THREE.Group(); cg.position.set(x, y, z); scene.add(cg);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 10.5, 4, 8, 1, true), crown); band.position.y = 2; cg.add(band);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8, sp = new THREE.Mesh(new THREE.ConeGeometry(1.5, k % 2 ? 7 : 11, 6), crown); sp.position.set(Math.cos(a) * 9.6, 4 + (k % 2 ? 3.5 : 5.5), Math.sin(a) * 9.6); cg.add(sp);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), crown); orb.position.set(sp.position.x, sp.position.y + (k % 2 ? 3.8 : 5.8), sp.position.z); cg.add(orb); }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.4, 26, 6), crown); spire.position.y = 13; cg.add(spire);
  live.towerMats = mats;
}

function lagoonMarket(scene, B, rng) {
  const { x, z } = LAGOON;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(48, 48).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x2fd0c4, emissive: 0x0a5a5c, specular: 0xfff0d8, shininess: 80 }));
  water.position.set(x, 0.12, z); scene.add(water);
  for (const [dx, dz, w, d] of [[0, -24.5, 50, 1], [0, 24.5, 50, 1], [-24.5, 0, 1, 50], [24.5, 0, 1, 50]]) pushBox(B, x + dx, 0, z + dz, w, 0.7, d, 0xd8c8a6); // stone rim
  addBox({ x0: x - 25, x1: x + 25, z0: z - 25, z1: z + 25, h: 1.2 });
  const STRIPES = [[0xe8604c, 0xfff4e0, 0x2fb8a8], [0x2fb8a8, 0xfff4e0, 0xe8604c], [0xe8604c, 0x2fb8a8, 0xfff4e0], [0x2fb8a8, 0xe8604c, 0xfff4e0]], WALLS = [0xf7c59f, 0x8fd3c8, 0xf4a6a0, 0xf6e3b4, 0xb8e0b0, 0xfff4e6];
  const stalls = [[-14, -13], [0, -15], [14, -13], [-14, 6], [14, 6], [0, 12]];
  stalls.forEach(([dx, dz], i) => {
    const cx = x + dx, cz = z + dz, [a, b, v] = STRIPES[i % 4];
    for (const sx of [-3.6, 3.6]) for (const sz of [-2.6, 2.6]) pushBox(B, cx + sx, 0, cz + sz, 0.35, 1.6, 0.35, 0x7a5a3a); // stilts
    pushBox(B, cx, 1.5, cz, 8.4, 0.3, 6.4, 0xa07a50); pushBox(B, cx, 1.8, cz + 1, 6.4, 2.6, 3.6, WALLS[i % WALLS.length]); pushBox(B, cx, 1.8, cz - 1.9, 6.4, 1.0, 1.6, 0xe9d8b8); // deck, hut, counter
    for (let k = 0; k < 8; k++) { pushBox(B, cx - 3.5 + k + 0.5, 4.4 - Math.abs(k - 3.5) * 0.08, cz - 0.4, 1, 0.22, 7.2, k % 2 ? b : a); pushBox(B, cx - 3.5 + k + 0.5, 3.75, cz - 4.05, 1, 0.68 - (k % 2) * 0.18, 0.08, k % 2 ? v : a); } // striped coral / cream / teal awning with a scalloped front valance
    for (let k = 0; k < 3; k++) pushBox(B, cx - 2 + k * 2, 2.8, cz - 2.2, 0.9, 0.5, 0.9, [0xff8a3d, 0x7ed68a, 0xffd23c][(i + k) % 3]); // produce crates
  });
  // festoon lights: bulb strings on poles along the street front and a lit bead row under every awning's valance,
  // coral, amber and teal bulbs that glow brighter as the sun goes down (strength set in updateLandmarks)
  const bulbs = newBuf(), wires = [], BULBS = [0xffb347, 0xff7a5c, 0xffd27a, 0x5fe0d0], kz = z + 26.6, poles = [-24, -14, -7, 7, 14, 24];
  const string = (ax, ay, az, bx, by, bz, sag, n) => { let px = ax, py = ay, pz = az; for (let k = 1; k <= n; k++) { const t = k / n, x2 = ax + (bx - ax) * t, z2 = az + (bz - az) * t, y2 = ay + (by - ay) * t - Math.sin(t * Math.PI) * sag;
    wires.push(px, py, pz, x2, y2, z2); if (k < n) pushBox(bulbs, x2, y2 - 0.24, z2, 0.2, 0.24, 0.2, BULBS[(k + Math.round(ax)) % 4]); px = x2; py = y2; pz = z2; } };
  for (const dx of poles) { pushBox(B, x + dx, 0, kz, 0.22, 5, 0.22, 0x3a3a40); addBox({ x0: x + dx - 0.2, x1: x + dx + 0.2, z0: kz - 0.2, z1: kz + 0.2, h: 5 }); }
  for (let k = 0; k < poles.length - 1; k++) string(x + poles[k], 4.9, kz, x + poles[k + 1], 4.9, kz, 0.9, Math.round((poles[k + 1] - poles[k]) / 1.1));
  stalls.forEach(([dx, dz]) => { const cx = x + dx, cz = z + dz; string(cx - 3.6, 4.0, cz - 4.15, cx + 3.6, 4.0, cz - 4.15, 0.25, 8); if (dz > 0) string(cx - 3.6, 4.0, cz + 3.3, cx + 3.6, 4.0, cz + 3.3, 0.25, 8);
    if (dz > 0) string(cx, 4.0, cz + 3.3, x + (dx === 0 ? 7 : dx), 4.9, kz, 0.6, 10); }); // and a run from each street-side stall out to the poles
  live.bulbMat = new THREE.MeshBasicMaterial({ vertexColors: true }); scene.add(new THREE.Mesh(toGeometry(bulbs), live.bulbMat));
  { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)); scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2a2228 }))); }
  // a cluster of cooking-gas bottles on each stall deck, at the corner nearest the street (combat/gasBottles.js)
  // and a gas cage on the kerb outside each landing of the long boardwalk
  buildGasBottles(scene, [...stalls.map(([dx, dz]) => [x + dx + 3.0, 1.8, z + dz + (dz < 0 ? -2.7 : 2.7)]), [x + 3.5, 0.1, z + 25.7], [x - 3.5, 0.1, z - 25.7]]);
  // boardwalks from the street into the market, and a rowboat or two
  pushBox(B, x, 1.4, z - 2.5, 3, 0.25, 50, 0xb08a5a); pushBox(B, x, 1.4, z - 2.5, 38, 0.25, 3, 0xb08a5a);
  for (let k = 0; k < 2; k++) { const bx = x - 8 + k * 17, bz = z + 18 - k * 2; pushBox(B, bx, 0.1, bz, 4.4, 0.7, 1.7, k ? 0xe8604c : 0x2fb8a8); pushBox(B, bx, 0.5, bz, 3.6, 0.3, 1.2, 0xf6ead2); }
  void rng;
}

export function buildLandmarks(scene, rng) {
  const B = newBuf();
  causeway(scene, B); lighthouse(scene, B); crownTower(scene, B); lagoonMarket(scene, B, rng);
  const m = new THREE.Mesh(toGeometry(B), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; m.receiveShadow = true; scene.add(m);
}

// Dusk glow: crown crest and tower windows warm up as the sun drops, the light's beam turns.
export function updateLandmarks(clock, time) {
  const dusk = Math.min(1, Math.max(0, (clock - 17.0) / 2.2)) + (clock < 6 ? 1 : 0), d = Math.min(1, dusk);
  if (live.crown) live.crown.emissiveIntensity = 0.25 + d * 1.6;
  if (live.towerMats) for (const m of live.towerMats) m.emissiveIntensity = d * 0.35;
  // Causeway floodlights come up through the late afternoon (full by 17:30) and stay on all night
  const fl = clock < 6.5 ? 1 : Math.min(1, Math.max(0, (clock - 16.2) / 1.3));
  if (live.pylonMat) { live.pylonMat.emissiveIntensity = 0.06 + fl * 0.62; live.rimMat.emissiveIntensity = 0.15 + fl * 1.5; live.cableMat.color.setRGB(1, 0.96, 0.88).multiplyScalar(1 + fl * 0.7); }
  if (live.bulbMat) live.bulbMat.color.setScalar(0.9 + fl * 0.75);
  if (live.glow) { const s = 12 + d * 14; live.glow.scale.set(s, s, 1); live.glow.material.opacity = 0.55 + d * 0.45; }
  if (live.beam) { live.beam.rotation.y = time * 0.7; live.beam.children[0].material.opacity = 0.03 + d * 0.12; }
}

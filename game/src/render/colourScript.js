// SOLVANE BAY's colour script: teal and coral. Each story act has its own grade, picked from story progress:
//   Act I   morning mint: pale amber sun, mint-teal shadows, minty highlights
//   Act II  golden hour: amber sun low over a turquoise sea, coral accents, long teal shadows
//   Act III dusk: deep teal sky falling into a coral horizon, warm windows, cool teal shadows
//   LOW TIDE BLAZE: the evening blaze laid over any act while the sun sits low (and always in staged shots and the title):
//           deep teal overhead through coral to hot gold at the horizon, hot gold key, teal shadows, gold sand, sun glints on the sea
// Shadows are always teal, never purple. Sky (world/skyAndLighting.js) and grade (render/postProcessing.js) read from here.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { ACTS } from '../story/chapterArc.js';

const c = (h) => new THREE.Color(h);
export const GRADES = {
  1: { name: 'MORNING MINT', horizon: c('#ffd29a'), band: c('#a8ecd8'), sky: c('#3fb0c4'), zenith: c('#1f7f9c'), fog: c('#d8f0e2'), hemiSky: c('#b8f0e4'), hemiGround: c('#d8b890'),
    shadow: [0.84, 1.0, 0.98], high: [1.02, 1.03, 0.94], sat: 1.06 },
  2: { name: 'GOLDEN HOUR', horizon: c('#ffa848'), band: c('#ffc884'), sky: c('#5cc4c8'), zenith: c('#1b7894'), fog: c('#ffd2a0'), hemiSky: c('#8fdcd4'), hemiGround: c('#d89a70'),
    shadow: [0.8, 0.98, 1.0], high: [1.08, 0.99, 0.84], sat: 1.14 },
  3: { name: 'DUSK', horizon: c('#ff7048'), band: c('#ff9c74'), sky: c('#3a9aa8'), zenith: c('#0f4f68'), fog: c('#f2a68a'), hemiSky: c('#6cc8c4'), hemiGround: c('#c87a5c'),
    shadow: [0.72, 0.95, 1.02], high: [1.1, 0.92, 0.8], sat: 1.18 },
};
// The blaze preset: one place for the golden-hour look. key = sun colour, keyBoost = sun intensity factor, sand = sand tint,
// glint = sea specular, contrast = S-curve strength, split = how hard shadows go teal / highlights go gold.
export const BLAZE = { name: 'LOW TIDE BLAZE', horizon: c('#ffb238'), band: c('#ff7448'), sky: c('#2f9aa6'), zenith: c('#0a3e56'), fog: c('#ffa46a'), hemiSky: c('#4ab4b8'), hemiGround: c('#d07848'),
  shadow: [0.62, 0.9, 1.0], high: [1.16, 0.98, 0.72], sat: 1.3, contrast: 0.55, key: c('#ffa040'), keyBoost: 1.35, sand: c('#ffc070'), glint: c('#ffd080') };
// How much of the blaze is on: full in staged shots and on the title (a scene may set G.blazeForce), otherwise it rides the evening magic hour.
export const blazeAmount = () => G.blazeForce ?? (G.mode === 'title' || G.shotCrisp ? 1 : Math.max(0, Math.min(1, G.magic || 0)));
const mixed = { horizon: new THREE.Color(), band: new THREE.Color(), sky: new THREE.Color(), zenith: new THREE.Color(), fog: new THREE.Color(), hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), shadow: [1, 1, 1], high: [1, 1, 1], sat: 1, contrast: 0.3, blaze: 0 };
// The act the story is in: the act holding the first unfinished chapter (Act III once everything is done).
export function currentAct() {
  const done = G.completed || []; const a = ACTS.find((x) => x.chapters.some((id) => !done.includes(id)));
  return a ? a.n : 3;
}
// The title screen always shows the city at golden hour, the look of the box art.
// The act's grade blended toward the blaze; returns one shared object (no per-frame allocation).
export function currentGrade() {
  const a = GRADES[G.mode === 'title' ? 2 : currentAct()], b = blazeAmount(), m = mixed;
  for (const k of ['horizon', 'band', 'sky', 'zenith', 'fog', 'hemiSky', 'hemiGround']) m[k].copy(a[k]).lerp(BLAZE[k], b);
  for (let i = 0; i < 3; i++) { m.shadow[i] = a.shadow[i] + (BLAZE.shadow[i] - a.shadow[i]) * b; m.high[i] = a.high[i] + (BLAZE.high[i] - a.high[i]) * b; }
  m.sat = a.sat + (BLAZE.sat - a.sat) * b; m.contrast = 0.3 + (BLAZE.contrast - 0.3) * b; m.blaze = b; return m;
}

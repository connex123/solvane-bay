// SOLVANE BAY's colour script: teal and coral. Each story act has its own grade, picked from story progress:
//   Act I   morning mint: pale amber sun, mint-teal shadows, minty highlights
//   Act II  golden hour: amber sun low over a turquoise sea, coral accents, long teal shadows
//   Act III dusk: deep teal sky falling into a coral horizon, warm windows, cool teal shadows
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
// The act the story is in: the act holding the first unfinished chapter (Act III once everything is done).
export function currentAct() {
  const done = G.completed || []; const a = ACTS.find((x) => x.chapters.some((id) => !done.includes(id)));
  return a ? a.n : 3;
}
// The title screen always shows the city at golden hour, the look of the box art.
export const currentGrade = () => GRADES[G.mode === 'title' ? 2 : currentAct()];

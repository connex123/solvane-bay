// Graphics quality presets and the Auto mode (default) that steps resolution, shadows and bloom down until the frame rate holds.
import * as THREE from 'three';
import { G } from '../core/gameState.js';

// pixel ratio cap, shadows, post-processing (bloom + grade)
export const LEVELS = [
  { name: 'High', pr: 1.5, shadows: true, post: true },
  { name: 'Medium', pr: 1.0, shadows: true, post: true },
  { name: 'Low', pr: 0.8, shadows: false, post: true },
  { name: 'Lowest', pr: 0.6, shadows: false, post: false },
];
const PRESET = { high: 0, medium: 1, low: 2 };
const gov = { level: -1, t: 0, frames: 0, wait: 2, fps: 60, history: [] };

function apply(level) {
  if (level === gov.level) return; gov.level = level; const L = LEVELS[level], r = G.renderer;
  r.setPixelRatio(Math.min(devicePixelRatio, L.pr)); r.setSize(innerWidth, innerHeight);
  const sz = r.getDrawingBufferSize(new THREE.Vector2()); G.post?.setSize(sz.x, sz.y);
  if (r.shadowMap.enabled !== L.shadows) { r.shadowMap.enabled = L.shadows; G.scene.traverse((o) => { const m = o.material; if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true; }); }
  G.settings.post = L.post; G.quality = L.name;
}
// 'auto' starts at High and only steps down; fixed presets apply immediately.
export function setQuality(q) {
  G.settings.quality = q; gov.t = 0; gov.frames = 0; gov.wait = 2;
  apply(q === 'auto' ? Math.max(0, gov.level) : PRESET[q] ?? 0);
}
// Called once per rendered frame with the real frame time.
export function updateQuality(frameDt) {
  gov.t += frameDt; gov.frames++;
  if (gov.t < 1.5) return;
  gov.fps = gov.frames / gov.t; G.fps = gov.fps; gov.history.push(Math.round(gov.fps)); if (gov.history.length > 20) gov.history.shift();
  gov.t = 0; gov.frames = 0;
  if (G.settings.quality !== 'auto' || G.mode !== 'play') return;
  if (gov.wait > 0) { gov.wait--; return; }
  if (gov.fps < 40 && gov.level < LEVELS.length - 1) { apply(gov.level + 1); gov.wait = 1; }
}
export const fpsHistory = () => gov.history.slice();

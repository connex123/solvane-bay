// Graphics quality presets and the Auto mode (default) that steps resolution, shadows and bloom down until the frame rate holds,
// and back up after a few seconds of comfortable headroom (wide 40/56 fps band plus a backoff that grows if a step up fails).
import * as THREE from 'three';
import { G } from '../core/gameState.js';

// pixel ratio cap, shadows, post-processing (bloom + grade)
export const LEVELS = [
  { name: 'High', pr: 1.5, shadows: true, post: true },
  { name: 'Medium', pr: 1.0, shadows: true, post: true },
  { name: 'Low', pr: 0.8, shadows: false, post: true },
  { name: 'Lowest', pr: 0.6, shadows: false, post: false },
  { name: 'Minimal', pr: 0.4, shadows: false, post: false }, // software renderers only: keeps the game responsive
];
const PRESET = { high: 0, medium: 1, low: 2 };
const gov = { level: -1, t: 0, frames: 0, wait: 2, fps: 60, history: [], good: 0, upNeed: 3, sinceUp: 99 };

function apply(level) {
  if (level === gov.level) return; gov.level = level; const L = LEVELS[level], r = G.renderer;
  r.setPixelRatio(Math.min(devicePixelRatio, L.pr)); r.setSize(innerWidth, innerHeight);
  const sz = r.getDrawingBufferSize(new THREE.Vector2()); G.post?.setSize(sz.x, sz.y);
  // Shadows are never switched off (that recompiles every shader: a multi-second hitch on slow GPUs). Lower levels use a
  // smaller shadow map that is redrawn only every ~1.5 s instead of every frame.
  r.shadowMap.autoUpdate = L.shadows; r.shadowMap.needsUpdate = true; gov.shadowT = 0;
  const size = L.shadows ? 2048 : 1024;
  G.scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow && o.shadow.mapSize.x !== size) { o.shadow.mapSize.set(size, size); o.shadow.map?.dispose(); o.shadow.map = null; } });
  // post stays on (switching to direct rendering would recompile every shader); the lowest level runs it in lite mode
  if (G.post && G.post.params.lite !== !L.post) { G.post.params.lite = !L.post; G.post.setSize(sz.x, sz.y); }
  G.quality = L.name;
}
// 'auto' starts at High, steps down under load and back up with hysteresis; fixed presets apply immediately.
export function setQuality(q) {
  G.settings.quality = q; gov.t = 0; gov.frames = 0; gov.wait = 2;
  apply(q === 'auto' ? Math.max(0, gov.level) : PRESET[q] ?? 0);
}
// Called once per rendered frame with the real frame time.
export function updateQuality(frameDt) {
  gov.t += frameDt; gov.frames++;
  if (!G.renderer.shadowMap.autoUpdate && (gov.shadowT = (gov.shadowT || 0) + frameDt) > 1.5) { gov.shadowT = 0; G.renderer.shadowMap.needsUpdate = true; }
  if (gov.t < 1.5) return;
  gov.fps = gov.frames / gov.t; G.fps = gov.fps; gov.history.push(Math.round(gov.fps)); if (gov.history.length > 20) gov.history.shift();
  gov.t = 0; gov.frames = 0;
  // settles on the title screen too, so play never starts with a quality step (and its shader recompile) pending
  if (G.settings.quality !== 'auto' || (G.mode !== 'play' && G.mode !== 'title')) return;
  if (gov.wait > 0) { gov.wait--; return; }
  gov.sinceUp++;
  if (gov.fps < 40 && gov.level < LEVELS.length - 1) {
    // a step up that could not hold within ~10 s: wait twice as long before trying again (max ~48 s)
    if (gov.sinceUp <= 6) gov.upNeed = Math.min(32, gov.upNeed * 2);
    // far below target (a slow software renderer): go straight to the lowest level instead of one recompile per step
    apply(gov.fps < 12 ? LEVELS.length - 1 : gov.level + 1); gov.wait = 1; gov.good = 0; return;
  }
  gov.good = gov.fps > 56 ? gov.good + 1 : 0;
  if (gov.good >= gov.upNeed && gov.level > 0) { apply(gov.level - 1); gov.good = 0; gov.wait = 1; gov.sinceUp = 0; }
}
// Boot calibration (Auto only, before the title shows): time a few real frames at the current level and start at the
// level the measured frame time implies, so play never opens with seconds-long frames on a slow (software) GPU.
export function calibrateQuality(renderOnce) {
  if (G.settings.quality !== 'auto') return;
  const gl = G.renderer.getContext(), px = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  renderOnce(); sync(); const t0 = performance.now(); for (let i = 0; i < 3; i++) { renderOnce(); sync(); }
  const ms = (performance.now() - t0) / 3; G.calibrationMs = Math.round(ms);
  apply(ms > 60 ? LEVELS.length - 1 : ms > 30 ? 2 : ms > 18 ? 1 : 0); gov.t = 0; gov.frames = 0; gov.wait = 1;
}
export const fpsHistory = () => gov.history.slice();

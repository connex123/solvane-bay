// Graphics quality. Fixed presets, plus Auto (the default): it drops resolution, shadow detail and bloom until the
// frame rate holds, and climbs back after a few seconds of comfortable headroom. The band is wide (below 40 fps
// steps down, above 56 fps counts toward a step up), and a step up that fails makes the next attempt wait longer.
import * as THREE from 'three';
import { G } from '../core/gameState.js';

// pr: pixel-ratio cap; shadows: full shadow map updated every frame; post: bloom on (off = lite post).
export const LEVELS = [
  { name: 'High', pr: 1.5, shadows: true, post: true },
  { name: 'Medium', pr: 1.0, shadows: true, post: true },
  { name: 'Low', pr: 0.8, shadows: false, post: true },
  { name: 'Lowest', pr: 0.6, shadows: false, post: false },
  { name: 'Minimal', pr: 0.4, shadows: false, post: false }, // for software renderers: keeps the game responsive
];

const NAMED = { high: 0, medium: 1, low: 2 };
const BOTTOM = LEVELS.length - 1;

const WINDOW = 1.5; // seconds per fps sample
const DOWN_BELOW = 40;
const UP_ABOVE = 56;
const PANIC_BELOW = 12; // this slow: jump straight to the bottom level
const SHADOW_REFRESH = 1.5; // seconds between shadow redraws when they are not live
const HISTORY = 20;

const state = {
  level: -1, // currently applied level (-1 before boot)
  elapsed: 0, frames: 0, // the running sample window
  skip: 2, // windows to ignore after a change
  fps: 60,
  history: [],
  goodWindows: 0, // consecutive windows above UP_ABOVE
  needForUp: 3, // good windows required before stepping up (doubles after a failed step up)
  windowsSinceUp: 99,
  shadowClock: 0,
};

function resizeShadowMaps(size) {
  G.scene.traverse((obj) => {
    if (!obj.isDirectionalLight || !obj.castShadow || obj.shadow.mapSize.x === size) return;
    obj.shadow.mapSize.set(size, size);
    if (obj.shadow.map) obj.shadow.map.dispose();
    obj.shadow.map = null;
  });
}

function applyLevel(index) {
  if (index === state.level) return;
  state.level = index;
  const preset = LEVELS[index];
  const renderer = G.renderer;
  renderer.setPixelRatio(Math.min(devicePixelRatio, preset.pr));
  renderer.setSize(innerWidth, innerHeight);
  const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
  if (G.post) G.post.setSize(buffer.x, buffer.y);

  // Shadows stay enabled at every level: turning them off recompiles every shader (seconds of hitching on slow
  // GPUs). Lower levels use a smaller map that is only redrawn every SHADOW_REFRESH seconds.
  renderer.shadowMap.autoUpdate = preset.shadows;
  renderer.shadowMap.needsUpdate = true;
  state.shadowClock = 0;
  resizeShadowMaps(preset.shadows ? 2048 : 1024);

  // Post-processing also stays on (direct rendering would recompile too); the low levels run it in lite mode.
  const wantLite = !preset.post;
  if (G.post && G.post.params.lite !== wantLite) {
    G.post.params.lite = wantLite;
    G.post.setSize(buffer.x, buffer.y);
  }
  G.quality = preset.name;
}

function restartWindow(skip) {
  state.elapsed = 0;
  state.frames = 0;
  state.skip = skip;
}

/** 'auto' keeps (or starts from) the current level and adapts; named presets apply immediately. */
export function setQuality(q) {
  G.settings.quality = q;
  restartWindow(2);
  applyLevel(q === 'auto' ? Math.max(0, state.level) : NAMED[q] ?? 0);
}

function stepDown() {
  // A step up that collapsed within about 10 s: wait twice as long before the next try (capped near 48 s).
  if (state.windowsSinceUp <= 6) state.needForUp = Math.min(32, state.needForUp * 2);
  applyLevel(state.fps < PANIC_BELOW ? BOTTOM : state.level + 1);
  state.skip = 1;
  state.goodWindows = 0;
}

function maybeStepUp() {
  state.goodWindows = state.fps > UP_ABOVE ? state.goodWindows + 1 : 0;
  if (state.goodWindows < state.needForUp || state.level <= 0) return;
  applyLevel(state.level - 1);
  state.goodWindows = 0;
  state.skip = 1;
  state.windowsSinceUp = 0;
}

/** Call once per rendered frame with the real frame time. */
export function updateQuality(frameDt) {
  state.elapsed += frameDt;
  state.frames += 1;
  if (!G.renderer.shadowMap.autoUpdate) {
    state.shadowClock += frameDt;
    if (state.shadowClock > SHADOW_REFRESH) {
      state.shadowClock = 0;
      G.renderer.shadowMap.needsUpdate = true;
    }
  }
  if (state.elapsed < WINDOW) return;

  state.fps = state.frames / state.elapsed;
  G.fps = state.fps;
  state.history.push(Math.round(state.fps));
  if (state.history.length > HISTORY) state.history.shift();
  state.elapsed = 0;
  state.frames = 0;

  // Auto also settles on the title screen, so play never opens with a pending step (and its recompile).
  if (G.settings.quality !== 'auto') return;
  if (G.mode !== 'play' && G.mode !== 'title') return;
  if (state.skip > 0) { state.skip -= 1; return; }
  state.windowsSinceUp += 1;
  if (state.fps < DOWN_BELOW && state.level < BOTTOM) { stepDown(); return; }
  maybeStepUp();
}

/**
 * Boot calibration (Auto only, before the title appears): time a few real frames and start at the level that
 * frame time implies, so a slow software GPU never opens play with seconds-long frames.
 */
export function calibrateQuality(renderOnce) {
  if (G.settings.quality !== 'auto') return;
  const gl = G.renderer.getContext();
  const pixel = new Uint8Array(4);
  const finish = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); // forces the GPU to finish
  renderOnce();
  finish();
  const start = performance.now();
  const runs = 3;
  for (let i = 0; i < runs; i++) { renderOnce(); finish(); }
  const perFrame = (performance.now() - start) / runs;
  G.calibrationMs = Math.round(perFrame);
  let index = 0;
  if (perFrame > 60) index = BOTTOM;
  else if (perFrame > 30) index = 2;
  else if (perFrame > 18) index = 1;
  applyLevel(index);
  restartWindow(1);
}

export const fpsHistory = () => [...state.history];

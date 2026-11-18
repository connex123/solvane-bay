// Automatic quality scaling: watches the frame rate during play and steps the render cost down (resolution, bloom chain,
// shadow map) until it holds a playable rate. Only steps down, so it never oscillates. Disabled when Settings > Effects is
// set by hand to High or Low.
import { G } from '../core/gameState.js';

export function createAdaptiveQuality(renderer, post, sun) {
  const base = Math.min(devicePixelRatio, 1.5);
  const LEVELS = [
    { ratio: base, post: true, shadow: 2048 },
    { ratio: Math.min(base, 1), post: true, shadow: 2048 },
    { ratio: Math.min(base, 1), post: false, shadow: 1024 },
    { ratio: 0.75, post: false, shadow: 1024 },
    { ratio: 0.5, post: false, shadow: 0 },
  ];
  let level = 0, acc = 0, n = 0, settle = 2;
  function apply() {
    const L = LEVELS[level]; renderer.setPixelRatio(L.ratio); renderer.setSize(innerWidth, innerHeight); post?.setSize();
    G.autoPost = L.post; G.qualityLevel = level; sun.castShadow = L.shadow > 0;
    if (L.shadow && sun.shadow.mapSize.x !== L.shadow) { sun.shadow.mapSize.set(L.shadow, L.shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  }
  return {
    get level() { return level; },
    update(rawDt) {
      if (G.mode !== 'play' || G.settings.post !== 'auto') { acc = n = 0; return; }
      if (settle > 0) { settle -= rawDt; return; } // ignore the first seconds (shader compiles, streaming)
      acc += rawDt; n++;
      if (acc < 1.5) return;
      const fps = n / acc; acc = n = 0;
      if (fps < 28 && level < LEVELS.length - 1) { level = Math.min(LEVELS.length - 1, level + (fps < 12 ? 2 : 1)); apply(); settle = 1; console.info(`adaptive quality: ${fps.toFixed(1)} fps -> level ${level}`); }
    },
    reset() { level = 0; apply(); },
  };
}

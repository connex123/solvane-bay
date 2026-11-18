// Frame loop: fixed-step simulation (1/60 s) driven by an accumulator so low frame rates never run in slow motion,
// one render per frame, HUD update, Auto quality, and input edges kept until a simulation step has consumed them.
import { G } from './gameState.js';
import { endFrame } from './input.js';
import { stepGame } from './simulation.js';
import { handleGlobalKeys } from './gameFlow.js';
import { renderFrame } from '../render/frameRenderer.js';
import { updateHud } from '../ui/hud.js';
import { updateQuality } from '../render/qualityGovernor.js';

const STEP = 1 / 60, MAX_STEPS = 20, MAX_FRAME = 1.0;
let last = 0, acc = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const real = last ? Math.min(MAX_FRAME, (t - last) / 1000) : STEP; last = t; acc += real;
  updateQuality(real); handleGlobalKeys();
  // Below 3 fps the steps stretch (up to 0.05 s each) (still real-time) instead of piling up.
  const n = Math.min(MAX_STEPS, Math.floor(acc / STEP)), h = acc / STEP > MAX_STEPS ? acc / MAX_STEPS : STEP;
  const t1 = performance.now(); for (let i = 0; i < n; i++) { stepGame(h); if (i === 0) endFrame(); acc -= h; }
  const t2 = performance.now();
  if (G.mode === 'title') { G.p.x = 0; G.p.z = 0; }
  renderFrame(false, real);
  if (G.mode !== 'title') updateHud(real);
  const t3 = performance.now(), pf = G.perf ||= { sim: 0, render: 0, steps: 0 }; pf.sim += ((t2 - t1) - pf.sim) * 0.2; pf.render += ((t3 - t2) - pf.render) * 0.2; pf.steps = n; pf.raw = real;
}
export function startLoop() { requestAnimationFrame(frame); }

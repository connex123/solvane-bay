// The frame loop. Simulation advances in fixed 1/60 s steps fed by an accumulator, so a slow frame rate
// never turns into slow motion; each frame then renders once, refreshes the HUD and lets Auto quality adapt.
// Input edges are cleared only after the first simulation step of a frame has consumed them.
import { G } from './gameState.js';
import { endFrame } from './input.js';
import { stepGame } from './simulation.js';
import { handleGlobalKeys } from './gameFlow.js';
import { renderFrame } from '../render/frameRenderer.js';
import { updateHud } from '../ui/hud.js';
import { updateQuality } from '../render/qualityGovernor.js';

const FIXED_DT = 1 / 60;
const STEP_CAP = 20; // most steps one frame may run
const LONGEST_FRAME = 1.0; // seconds; longer gaps (tab switches) are clipped

let previousStamp = 0;
let pending = 0; // simulated time owed, in seconds

function frameDelta(stamp) {
  const dt = previousStamp ? Math.min(LONGEST_FRAME, (stamp - previousStamp) / 1000) : FIXED_DT;
  previousStamp = stamp;
  return dt;
}

function runSteps() {
  const owed = pending / FIXED_DT;
  const count = Math.min(STEP_CAP, Math.floor(owed));
  // Under ~3 fps the steps grow (up to 0.05 s each) so the world stays real-time instead of falling behind.
  const stepSize = owed > STEP_CAP ? pending / STEP_CAP : FIXED_DT;
  for (let i = 0; i < count; i++) {
    stepGame(stepSize);
    if (i === 0) endFrame();
    pending -= stepSize;
  }
  return count;
}

function smooth(perf, key, sample) {
  perf[key] += (sample - perf[key]) * 0.2;
}

function tick(stamp) {
  requestAnimationFrame(tick);
  const dt = frameDelta(stamp);
  pending += dt;
  updateQuality(dt);
  handleGlobalKeys();

  // The first frames of a session paint the HUD for the first time (slow on software GL): hold the world still.
  if (G.holdFrames > 0) {
    G.holdFrames--;
    pending = 0;
  }

  const simStart = performance.now();
  const steps = runSteps();
  const simEnd = performance.now();

  if (G.mode === 'title') { G.p.x = 0; G.p.z = 0; }
  renderFrame(false, dt);
  if (G.mode !== 'title') updateHud(dt);
  const drawEnd = performance.now();

  if (!G.perf) G.perf = { sim: 0, render: 0, steps: 0 };
  smooth(G.perf, 'sim', simEnd - simStart);
  smooth(G.perf, 'render', drawEnd - simEnd);
  G.perf.steps = steps;
  G.perf.raw = dt;

  // Count of rendered frames: the tools wait on it to know their input has been consumed.
  G.frameNo = (G.frameNo || 0) + 1;
}

export function startLoop() {
  requestAnimationFrame(tick);
}

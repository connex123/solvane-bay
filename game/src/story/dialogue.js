// Dialogue queue: story lines with a speaker portrait; advance with E / Enter / click, or they auto-advance.
import { G } from '../core/gameState.js';
import { pressed, input } from '../core/input.js';

export const dlg = { queue: [], cur: null, t: 0, onDone: null };
export function say(lines, onDone) {
  const arr = Array.isArray(lines) ? lines : [lines];
  if (dlg.cur) { dlg.queue.push(...arr.map((l) => ({ ...l }))); if (onDone) { const prev = dlg.onDone; dlg.onDone = () => { prev?.(); onDone(); }; } return; }
  dlg.queue = arr.map((l) => ({ ...l })); dlg.onDone = onDone || null; next();
}
function next() {
  dlg.cur = dlg.queue.shift() || null; dlg.t = 0;
  if (!dlg.cur) { const f = dlg.onDone; dlg.onDone = null; f?.(); if (!dlg.cur) return; }
}
export function updateDialogue(dt) {
  if (!dlg.cur) return; dlg.t += dt;
  const dur = Math.max(3.2, dlg.cur.text.length * 0.055);
  if ((pressed('KeyE') || pressed('Enter') || input.leftPressed) && dlg.t > 0.5 || dlg.t > dur + 2.5) next();
}
export const clearDialogue = () => { dlg.queue = []; dlg.cur = null; dlg.onDone = null; };

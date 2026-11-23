// Story dialogue: a queue of spoken lines ({ who, text }) shown one at a time with the speaker's portrait.
// The player skips ahead with E, Enter or a click; otherwise each line moves on once it has had time to be read.
import { pressed, input } from '../core/input.js';

export const dlg = { queue: [], cur: null, t: 0, onDone: null };

const MIN_SKIP_AGE = 0.5;   // seconds a line stays up before a key can skip it
const MIN_LINE_TIME = 3.2;  // shortest auto-advance time
const PER_CHAR = 0.055;     // reading time added per character
const LINGER = 2.5;         // extra hold after the line is fully read

const lineTime = (text) => Math.max(MIN_LINE_TIME, text.length * PER_CHAR);

// Chain a finishing callback after whatever is already waiting for the queue to run dry.
function chainDone(fn) {
  if (!fn) return;
  const earlier = dlg.onDone;
  dlg.onDone = earlier ? () => { earlier(); fn(); } : fn;
}

function showNextLine() {
  dlg.t = 0;
  dlg.cur = dlg.queue.length ? dlg.queue.shift() : null;
  if (dlg.cur) return;
  // Queue ran dry: fire the callback once. It may start a fresh conversation through say().
  const done = dlg.onDone;
  dlg.onDone = null;
  if (done) done();
}

export function say(lines, onDone) {
  const fresh = (Array.isArray(lines) ? lines : [lines]).map((line) => Object.assign({}, line));
  if (dlg.cur) {
    // Someone is already talking: these lines wait their turn.
    for (const line of fresh) dlg.queue.push(line);
    chainDone(onDone);
    return;
  }
  dlg.queue = fresh;
  dlg.onDone = onDone || null;
  showNextLine();
}

export function updateDialogue(dt) {
  const line = dlg.cur;
  if (!line) return;
  dlg.t += dt;
  const skipped = dlg.t > MIN_SKIP_AGE && (pressed('KeyE') || pressed('Enter') || input.leftPressed);
  const timedOut = dlg.t > lineTime(line.text) + LINGER;
  if (skipped || timedOut) showNextLine();
}

export function clearDialogue() {
  dlg.queue = [];
  dlg.cur = null;
  dlg.onDone = null;
}

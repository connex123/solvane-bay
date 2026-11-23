// Keyboard and mouse state: held keys, keys pressed this frame, mouse look deltas and pointer lock.

export const input = {
  keys: new Set(), // codes currently held
  edge: new Set(), // codes that went down since the last endFrame()
  dx: 0, dy: 0,
  left: false, right: false, leftPressed: false,
  wheel: 0,
  locked: false,
  canvas: null,
};

export const down = (code) => input.keys.has(code);
export const pressed = (code) => input.edge.has(code);

// Keys whose browser default (scrolling, focus moves) would fight the game.
const SWALLOWED = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);
const MOUSE_LEFT = 0;
const MOUSE_RIGHT = 2;

function onKeyDown(ev) {
  if (SWALLOWED.has(ev.code)) ev.preventDefault();
  if (!input.keys.has(ev.code)) input.edge.add(ev.code);
  input.keys.add(ev.code);
}

function onMouseDown(ev, canvas) {
  // While unlocked, only clicks on the game canvas count: menu and HUD clicks must never fire a gun.
  if (!input.locked && ev.target !== canvas) return;
  if (ev.button === MOUSE_LEFT) {
    input.left = true;
    input.leftPressed = true;
  }
  if (ev.button === MOUSE_RIGHT) input.right = true;
}

function onMouseUp(ev) {
  if (ev.button === MOUSE_LEFT) input.left = false;
  if (ev.button === MOUSE_RIGHT) input.right = false;
}

export function initInput(canvas) {
  input.canvas = canvas;
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', (ev) => input.keys.delete(ev.code));
  addEventListener('blur', () => input.keys.clear());
  addEventListener('mousemove', (ev) => {
    if (!input.locked) return;
    input.dx += ev.movementX;
    input.dy += ev.movementY;
  });
  addEventListener('mousedown', (ev) => onMouseDown(ev, canvas));
  addEventListener('mouseup', onMouseUp);
  addEventListener('contextmenu', (ev) => ev.preventDefault());
  addEventListener('wheel', (ev) => { input.wheel += Math.sign(ev.deltaY); });
  document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
    if (!input.locked && input.onUnlock) input.onUnlock();
  });
}

export function requestLock() {
  try {
    const pending = input.canvas.requestPointerLock && input.canvas.requestPointerLock();
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  } catch (err) {
    // some browsers throw when lock is refused; the game simply stays unlocked
  }
}

export function releaseLock() {
  try {
    if (document.exitPointerLock) document.exitPointerLock();
  } catch (err) {
    // nothing to release
  }
}

/** Clear the per-frame values once a simulation step has seen them. */
export function endFrame() {
  input.edge.clear();
  input.dx = 0;
  input.dy = 0;
  input.leftPressed = false;
  input.wheel = 0;
}

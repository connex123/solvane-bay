// Keyboard and mouse state with per-frame edge detection and pointer lock.
export const input = { keys: new Set(), edge: new Set(), dx: 0, dy: 0, left: false, right: false, leftPressed: false, wheel: 0, locked: false, canvas: null };
export const down = (c) => input.keys.has(c);
export const pressed = (c) => input.edge.has(c);
export function initInput(canvas) {
  input.canvas = canvas;
  addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (!input.keys.has(e.code)) input.edge.add(e.code);
    input.keys.add(e.code);
  });
  addEventListener('keyup', (e) => input.keys.delete(e.code));
  addEventListener('blur', () => input.keys.clear());
  addEventListener('mousemove', (e) => { if (input.locked) { input.dx += e.movementX; input.dy += e.movementY; } });
  addEventListener('mousedown', (e) => { if (!input.locked && e.target !== canvas) return; // clicks on menus/HUD never reach the gun
    if (e.button === 0) { input.left = true; input.leftPressed = true; } if (e.button === 2) input.right = true; });
  addEventListener('mouseup', (e) => { if (e.button === 0) input.left = false; if (e.button === 2) input.right = false; });
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('wheel', (e) => { input.wheel += Math.sign(e.deltaY); });
  document.addEventListener('pointerlockchange', () => { input.locked = document.pointerLockElement === canvas; if (!input.locked) input.onUnlock?.(); });
}
export function requestLock() { try { const r = input.canvas.requestPointerLock?.(); r?.catch?.(() => {}); } catch (e) { /* ignored */ } }
export function releaseLock() { try { document.exitPointerLock?.(); } catch (e) { /* ignored */ } }
export function endFrame() { input.edge.clear(); input.dx = 0; input.dy = 0; input.leftPressed = false; input.wheel = 0; }

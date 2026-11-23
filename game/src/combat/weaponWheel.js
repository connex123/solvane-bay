// The weapon wheel. Holding Tab opens a ring of the five slots; flick the mouse toward one (or press 1-5)
// and let go of Tab to equip it.
import { G } from '../core/gameState.js';
import { input, down } from '../core/input.js';
import { WEAPONS } from './weapons.js';
import { gunSvg } from '../ui/weaponIcons.js';
import { selectWeapon } from '../characters/playerController.js';

export const wheel = { open: false, pick: 0, vx: 0, vy: 0 };

const RING_RADIUS = 112; // px from the centre to each slot
const FLICK = 40; // px of accumulated mouse travel that selects a slot
const TURN = Math.PI * 2;

const byId = (id) => document.getElementById(id);
let markupReady = false;

// Slot i sits at this angle; slot 0 is at the top and the rest run clockwise.
const slotAngle = (i) => (i / WEAPONS.length) * TURN - Math.PI / 2;

function slotMarkup(weapon, i) {
  const left = (Math.cos(slotAngle(i)) * RING_RADIUS).toFixed(0);
  const top = (Math.sin(slotAngle(i)) * RING_RADIUS).toFixed(0);
  return `<div class="wseg" data-i="${i}" style="left:${left}px;top:${top}px">${gunSvg(weapon.id)}<b>${i + 1}</b><span></span></div>`;
}

function buildMarkup() {
  markupReady = true;
  byId('wheel').innerHTML = WEAPONS.map(slotMarkup).join('') + '<div class="wcenter"><b></b><span></span></div>';
}

function ammoText(weapon, owned, player) {
  if (!owned) return 'LOCKED';
  if (weapon.id === 'fists') return '∞';
  return String(player.ammo[weapon.id] ?? 0);
}

/** Paint the wheel from the player's real inventory (the staged screenshot calls this too). */
export function renderWheel() {
  if (!markupReady) buildMarkup();
  const player = G.p;
  const root = byId('wheel');
  root.classList.toggle('hidden', !wheel.open);
  for (const seg of root.querySelectorAll('.wseg')) {
    const i = Number(seg.dataset.i);
    const owned = Boolean(player.owned[i]);
    seg.classList.toggle('own', owned);
    seg.classList.toggle('on', i === wheel.pick);
    seg.querySelector('span').textContent = ammoText(WEAPONS[i], owned, player);
  }
  root.querySelector('.wcenter b').textContent = WEAPONS[wheel.pick].name.toUpperCase();
  root.querySelector('.wcenter span').textContent = player.owned[wheel.pick] ? 'RELEASE TAB' : 'NOT OWNED';
}

// Map accumulated mouse travel to the nearest slot.
function slotFromFlick(vx, vy) {
  const count = WEAPONS.length;
  const fromTop = Math.atan2(vy, vx) + Math.PI / 2;
  const slot = Math.round((fromTop / TURN) * count) % count;
  return (slot + count) % count;
}

/** Returns true while the wheel is open; it then swallows mouse movement so the camera holds still. */
export function updateWeaponWheel() {
  const holding = down('Tab') && G.mode === 'play';
  if (holding && !wheel.open) {
    Object.assign(wheel, { open: true, pick: G.p.weapon, vx: 0, vy: 0 });
  }
  if (!wheel.open) return false;

  wheel.vx += input.dx;
  wheel.vy += input.dy;
  input.dx = 0;
  input.dy = 0;
  if (Math.hypot(wheel.vx, wheel.vy) > FLICK) {
    wheel.pick = slotFromFlick(wheel.vx, wheel.vy);
    wheel.vx *= 0.5;
    wheel.vy *= 0.5;
  }
  WEAPONS.forEach((_, i) => {
    if (input.edge.has(`Digit${i + 1}`)) wheel.pick = i;
  });
  if (!holding) {
    wheel.open = false;
    selectWeapon(wheel.pick);
  }
  renderWheel();
  return wheel.open;
}

// Weapon wheel: hold Tab to open a radial menu of the five slots, steer with the mouse (or tap 1-5), release to equip.
import { G } from '../core/gameState.js';
import { input, down } from '../core/input.js';
import { WEAPONS } from './weapons.js';
import { gunSvg } from '../ui/weaponIcons.js';
import { selectWeapon } from '../characters/playerController.js';

export const wheel = { open: false, pick: 0, vx: 0, vy: 0 };
const $ = (id) => document.getElementById(id);
let built = false;
function build() {
  built = true; const el = $('wheel'), R = 112;
  el.innerHTML = WEAPONS.map((w, i) => { const a = (i / WEAPONS.length) * Math.PI * 2 - Math.PI / 2; return `<div class="wseg" data-i="${i}" style="left:${(Math.cos(a) * R).toFixed(0)}px;top:${(Math.sin(a) * R).toFixed(0)}px">${gunSvg(w.id)}<b>${i + 1}</b><span></span></div>`; }).join('') + '<div class="wcenter"><b></b><span></span></div>';
}
// Fills the wheel from the player's real inventory; also used by the staged screenshot.
export function renderWheel() {
  if (!built) build(); const p = G.p, el = $('wheel'); el.classList.toggle('hidden', !wheel.open);
  el.querySelectorAll('.wseg').forEach((s) => {
    const i = +s.dataset.i, w = WEAPONS[i], own = !!p.owned[i];
    s.classList.toggle('own', own); s.classList.toggle('on', i === wheel.pick);
    s.querySelector('span').textContent = !own ? 'LOCKED' : w.id === 'fists' ? '∞' : String(p.ammo[w.id] ?? 0);
  });
  const w = WEAPONS[wheel.pick]; el.querySelector('.wcenter b').textContent = w.name.toUpperCase(); el.querySelector('.wcenter span').textContent = p.owned[wheel.pick] ? 'RELEASE TAB' : 'NOT OWNED';
}
// Returns true while the wheel is open (it then eats the mouse movement so the camera holds still).
export function updateWeaponWheel() {
  const p = G.p, held = down('Tab') && G.mode === 'play';
  if (held && !wheel.open) { wheel.open = true; wheel.pick = p.weapon; wheel.vx = 0; wheel.vy = 0; }
  if (wheel.open) {
    wheel.vx += input.dx; wheel.vy += input.dy; input.dx = 0; input.dy = 0;
    if (Math.hypot(wheel.vx, wheel.vy) > 40) { const a = Math.atan2(wheel.vy, wheel.vx) + Math.PI / 2, n = WEAPONS.length; wheel.pick = ((Math.round((a / (Math.PI * 2)) * n) % n) + n) % n; wheel.vx *= 0.5; wheel.vy *= 0.5; }
    for (let i = 0; i < WEAPONS.length; i++) if (input.edge.has(`Digit${i + 1}`)) wheel.pick = i;
    if (!held) { wheel.open = false; selectWeapon(wheel.pick); }
    renderWheel();
  }
  return wheel.open;
}

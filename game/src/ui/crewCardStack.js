// HUD crew card stack: one card per recruited crew member with portrait, name, ability, hotkey and a cooldown ring
// that fills back up and glows READY. Also drives the BLACKOUT screen flicker.
import { G } from '../core/gameState.js';
import { CREW, isRecruited, cooldownLeft, blackoutLeft } from '../crew/crewAbilities.js';
import { drawPortrait } from './portraits.js';

const $ = (id) => document.getElementById(id);
let sig = '';
export function updateCrewCards() {
  const list = CREW.filter((c) => isRecruited(c.id)), s = list.map((c) => c.id).join();
  const root = $('crewStack');
  if (s !== sig) {
    sig = s; root.innerHTML = list.map((c) => `<div class="crewc" id="crew-${c.id}"><div class="ring"><canvas width="96" height="96"></canvas></div><div class="cinfo"><b>${c.id.toUpperCase()}</b><span>${c.ability}</span><em></em></div><kbd>${c.keyLabel}</kbd></div>`).join('');
    list.forEach((c) => drawPortrait($(`crew-${c.id}`).querySelector('canvas'), c.id));
  }
  for (const c of list) {
    const left = cooldownLeft(c.id), el = $(`crew-${c.id}`), pct = left > 0 ? 1 - left / c.cd : 1;
    el.style.setProperty('--p', `${Math.round(pct * 360)}deg`); el.classList.toggle('ready', left <= 0);
    const t = left > 0 ? `${Math.ceil(left)}s` : 'READY', em = el.querySelector('em'); if (em.textContent !== t) em.textContent = t;
  }
  $('hud').classList.toggle('blackout', blackoutLeft() > 0 && G.mode === 'play');
}

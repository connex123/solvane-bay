// The crew chips on the HUD: one per recruited member, showing portrait, name, ability, hotkey and a cooldown
// ring that refills and turns READY. It also switches the HUD's BLACKOUT flicker on and off.
import { G } from '../core/gameState.js';
import { CREW, isRecruited, cooldownLeft, blackoutLeft } from '../crew/crewAbilities.js';
import { drawPortrait } from './portraits.js';

const byId = (id) => document.getElementById(id);
let builtFor = ''; // ids of the members the chips were last built for

function chipMarkup(member) {
  return `<div class="crewc" id="crew-${member.id}">`
    + '<div class="ring"><canvas width="96" height="96"></canvas></div>'
    + `<div class="cinfo"><b>${member.id.toUpperCase()}</b><span>${member.ability}</span><em></em></div>`
    + `<kbd>${member.keyLabel}</kbd></div>`;
}

function rebuild(members) {
  byId('crewStack').innerHTML = members.map(chipMarkup).join('');
  for (const member of members) drawPortrait(byId(`crew-${member.id}`).querySelector('canvas'), member.id);
}

function refreshChip(member) {
  const chip = byId(`crew-${member.id}`);
  const wait = cooldownLeft(member.id);
  const filled = wait > 0 ? 1 - wait / member.cd : 1;
  chip.style.setProperty('--p', `${Math.round(filled * 360)}deg`);
  chip.classList.toggle('ready', wait <= 0);
  const label = wait > 0 ? `${Math.ceil(wait)}s` : 'READY';
  const slot = chip.querySelector('em');
  if (slot.textContent !== label) slot.textContent = label;
}

export function updateCrewCards() {
  const members = CREW.filter((member) => isRecruited(member.id));
  const key = members.map((member) => member.id).join(',');
  if (key !== builtFor) {
    builtFor = key;
    rebuild(members);
  }
  members.forEach(refreshChip);
  byId('hud').classList.toggle('blackout', blackoutLeft() > 0 && G.mode === 'play');
}

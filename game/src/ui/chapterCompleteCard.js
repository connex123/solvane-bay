// The card shown for a few seconds over the HUD when a story chapter ends: act, "CHAPTER N COMPLETE", the chapter
// title and story beat, cash and rep earned, the unlocks, and any districts that changed hands.
import { HOLDERS } from '../story/territoryControl.js';
import { actOf } from '../story/chapterArc.js';

const SHOW_SECONDS = 9;
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

let remaining = 0;

const card = () => document.getElementById('chapterCard');
const escapeHtml = (value) => String(value).replace(/[&<>]/g, (ch) => ENTITIES[ch]);

function turfLine(flip) {
  const holder = HOLDERS[flip.holder];
  return `<div class="cc-turf" style="--c:${holder.color}">${escapeHtml(flip.name.toUpperCase())} <b>&#9654; ${holder.name}</b></div>`;
}

export function showChapterCard({ def, arc, flips = [], days }) {
  const act = actOf(def.id);
  const unlocks = arc?.unlocks || [];
  const parts = [
    `<div class="cc-kick">ACT ${act?.n ?? ''} · ${escapeHtml(act?.title ?? '')}</div>`,
    `<div class="cc-done">CHAPTER ${def.chapter} COMPLETE</div>`,
    `<div class="cc-title">${escapeHtml(def.title)}</div>`,
    `<div class="cc-beat">${escapeHtml(arc?.beat ?? '')}</div>`,
    '<div class="cc-row">'
      + `<span class="cc-cash">+$${def.reward.money.toLocaleString('en-US')}</span>`
      + `<span class="cc-xp">+${def.reward.xp} REP</span>`
      + `<span class="cc-days">${escapeHtml(days)}</span></div>`,
  ];
  if (unlocks.length) parts.push(`<div class="cc-unl">${unlocks.map((item) => `<i>${escapeHtml(item)}</i>`).join('')}</div>`);
  parts.push(...flips.map(turfLine));
  const el = card();
  el.innerHTML = parts.join('');
  el.classList.remove('hidden');
  remaining = SHOW_SECONDS;
}

export function updateChapterCard(dt) {
  if (remaining <= 0) return;
  remaining -= dt;
  if (remaining <= 0) card().classList.add('hidden');
}

export const chapterCardShowing = () => remaining > 0;

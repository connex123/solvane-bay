// The chapter-complete card: "CHAPTER N COMPLETE", the title, the story beat, cash and rep earned, unlocks and the
// districts that changed hands. Shown for a few seconds over the HUD when a story chapter ends.
import { HOLDERS } from '../story/territoryControl.js';
import { actOf } from '../story/chapterArc.js';

const $ = (id) => document.getElementById(id);
let left = 0;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function showChapterCard({ def, arc, flips = [], days }) {
  const act = actOf(def.id), el = $('chapterCard');
  el.innerHTML = `<div class="cc-kick">ACT ${act?.n ?? ''} · ${esc(act?.title ?? '')}</div><div class="cc-done">CHAPTER ${def.chapter} COMPLETE</div><div class="cc-title">${esc(def.title)}</div>`
    + `<div class="cc-beat">${esc(arc?.beat ?? '')}</div><div class="cc-row"><span class="cc-cash">+$${def.reward.money.toLocaleString('en-US')}</span><span class="cc-xp">+${def.reward.xp} REP</span><span class="cc-days">${esc(days)}</span></div>`
    + (arc?.unlocks?.length ? `<div class="cc-unl">${arc.unlocks.map((u) => `<i>${esc(u)}</i>`).join('')}</div>` : '')
    + flips.map((f) => `<div class="cc-turf" style="--c:${HOLDERS[f.holder].color}">${esc(f.name.toUpperCase())} <b>&#9654; ${HOLDERS[f.holder].name}</b></div>`).join('');
  el.classList.remove('hidden'); left = 9;
}
export function updateChapterCard(dt) { if (left > 0) { left -= dt; if (left <= 0) $('chapterCard').classList.add('hidden'); } }
export const chapterCardShowing = () => left > 0;

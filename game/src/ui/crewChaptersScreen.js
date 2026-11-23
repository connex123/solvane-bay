// Crew & Chapters screen (pause menu tab, or J): crew portrait cards with role, ability and recruited/locked state,
// the three acts with every chapter ticked off and the current one's stakes, the waterfront territory strip, days to
// the Gala, Brandt and Reyne as the targets, and everything the story has unlocked so far.
import { G } from '../core/gameState.js';
import { CAST } from '../story/characters.js';
import { ACTS, ARC, STORY_TITLE, galaLabel } from '../story/chapterArc.js';
import { CREW, isRecruited, recruitChapter, cooldownLeft } from '../crew/crewAbilities.js';
import { shares } from '../story/territoryControl.js';
import { MISSIONS, missionById } from '../missions/storyMissions.js';
import { drawPortrait } from './portraits.js';

const $ = (id) => document.getElementById(id);
const done = (id) => G.completed.includes(id);
function crewCard(id) {
  const c = CAST[id], ab = CREW.find((q) => q.id === id);
  let state, cls;
  if (id === 'nico') { state = 'YOU'; cls = 'you'; }
  else if (id === 'dex') { state = done('m6') ? 'SOLD YOU OUT' : 'ALLY · FIXER'; cls = done('m6') ? 'traitor' : 'ally'; }
  else if (isRecruited(id)) { const cd = cooldownLeft(id); state = cd > 0 ? `RECRUITED · ${Math.ceil(cd)}s` : 'RECRUITED · READY'; cls = 'in'; }
  else { state = `LOCKED · JOINS AFTER CH ${missionById(recruitChapter(id)).chapter}`; cls = 'locked'; }
  const abil = ab ? `<div class="ab"><kbd>${ab.keyLabel}</kbd><b>${ab.ability}</b></div><p>${ab.desc}</p>` : id === 'nico' ? '<div class="ab"><kbd>1-5</kbd><b>FIVE WEAPON SLOTS</b></div><p>Ex-courier. Home for his mother and her diner.</p>' : `<div class="ab"><b>${done('m6') ? 'NOW WORKS FOR BRANDT' : 'CLUB VELVET'}</b></div><p>${done('m6') ? 'Traded Nico for a seat at the Gala.' : 'Knows everyone. Owes everyone.'}</p>`;
  return `<div class="ccard ${cls}"><canvas width="96" height="96" data-who="${id}"></canvas><div class="nm">${c.name.toUpperCase()}</div><div class="rl">${c.role}</div>${abil}<div class="stt">${state}</div></div>`;
}
function actColumn(a) {
  const next = MISSIONS.find((m) => !done(m.id));
  const rows = a.chapters.map((id) => { const m = missionById(id), d = done(id), cur = next === m, run = G.mission?.def === m;
    return `<div class="chrow ${d ? 'done' : cur ? 'cur' : 'lock'}"><i>${d ? '✓' : cur ? '▶' : m.chapter}</i><div><b>CH ${m.chapter} · ${m.title}</b>${cur ? `<span>${run ? 'IN PROGRESS: ' : 'NEXT: '}${ARC[id].stakes}</span>` : d ? `<span>${ARC[id].beat}</span>` : ''}</div></div>`; }).join('');
  return `<div class="act"><h4>ACT ${['I', 'II', 'III'][a.n - 1]} · ${a.title}</h4>${rows}</div>`;
}
export function fillCrewChapters() {
  const sh = shares(), n = G.completed.length, unl = Object.keys(ARC).filter(done).flatMap((id) => ARC[id].unlocks);
  const villains = ['brandt', 'reyne'].map((id) => `<div class="vill"><canvas width="96" height="96" data-who="${id}"></canvas><div><b>${CAST[id].name.toUpperCase()}</b><span>${CAST[id].role}</span></div></div>`).join('');
  $('crewBody').innerHTML = `<div class="cchead"><div><div class="kick">SOLVANE BAY: ${STORY_TITLE}</div><h2>CREW &amp; CHAPTERS</h2></div><div class="ccprog"><b>${n} / ${MISSIONS.length}</b><span>CHAPTERS</span></div><div class="ccturf"><div class="trow"><span>WATERFRONT</span><em>${galaLabel(n)}</em></div><div class="turf"><i style="width:${sh.crown}%"></i><b style="width:${sh.tide}%"></b></div><div class="turflab"><span>Crown ${sh.crown}%</span><span>Low Tide ${sh.tide}%</span></div></div></div>`
    + `<div class="crewrow">${['nico', 'sol', 'tamsin', 'wren', 'dex'].map(crewCard).join('')}</div>`
    + `<div class="actrow">${ACTS.map(actColumn).join('')}<div class="act side"><h4>THE CROWN</h4>${villains}<h4>UNLOCKED</h4><div class="unl">${unl.length ? unl.map((u) => `<i>${u}</i>`).join('') : '<span>Finish chapter 1</span>'}</div></div></div>`;
  $('crewBody').querySelectorAll('canvas[data-who]').forEach((c) => drawPortrait(c, c.dataset.who));
}

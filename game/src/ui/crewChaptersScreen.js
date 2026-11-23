// The Crew & Chapters screen (a pause-menu tab, or J). It lays out the crew as portrait cards (role, ability,
// recruited or locked), the three acts with each chapter's status and stakes, the waterfront territory bar and the
// Gala countdown, Brandt and Reyne as the targets, and every unlock the story has handed out so far.
import { G } from '../core/gameState.js';
import { CAST } from '../story/characters.js';
import { ACTS, ARC, STORY_TITLE, galaLabel } from '../story/chapterArc.js';
import { CREW, isRecruited, recruitChapter, cooldownLeft } from '../crew/crewAbilities.js';
import { shares } from '../story/territoryControl.js';
import { MISSIONS, missionById } from '../missions/storyMissions.js';
import { drawPortrait } from './portraits.js';

const CREW_ORDER = ['nico', 'sol', 'tamsin', 'wren', 'dex'];
const TARGETS = ['brandt', 'reyne'];
const ROMAN = ['I', 'II', 'III'];
const DEX_BETRAYAL = 'm6';

const isDone = (chapterId) => G.completed.includes(chapterId);
const portraitSlot = (who) => `<canvas width="96" height="96" data-who="${who}"></canvas>`;
const abilityLine = (key, title) => `<div class="ab">${key ? `<kbd>${key}</kbd>` : ''}<b>${title}</b></div>`;

// Status line and card class for one crew member.
function memberStatus(id) {
  if (id === 'nico') return { text: 'YOU', cls: 'you' };
  if (id === 'dex') {
    return isDone(DEX_BETRAYAL) ? { text: 'SOLD YOU OUT', cls: 'traitor' } : { text: 'ALLY · FIXER', cls: 'ally' };
  }
  if (isRecruited(id)) {
    const wait = cooldownLeft(id);
    return { text: wait > 0 ? `RECRUITED · ${Math.ceil(wait)}s` : 'RECRUITED · READY', cls: 'in' };
  }
  const joinsAt = missionById(recruitChapter(id)).chapter;
  return { text: `LOCKED · JOINS AFTER CH ${joinsAt}`, cls: 'locked' };
}

// Ability block: the crew ability for recruits, Nico's weapon slots, or Dex's club (and later his betrayal).
function memberBlurb(id) {
  const ability = CREW.find((entry) => entry.id === id);
  if (ability) return abilityLine(ability.keyLabel, ability.ability) + `<p>${ability.desc}</p>`;
  if (id === 'nico') return abilityLine('1-5', 'FIVE WEAPON SLOTS') + '<p>Ex-courier. Home for his mother and her diner.</p>';
  const turned = isDone(DEX_BETRAYAL);
  return abilityLine('', turned ? 'NOW WORKS FOR BRANDT' : 'CLUB VELVET')
    + `<p>${turned ? 'Traded Nico for a seat at the Gala.' : 'Knows everyone. Owes everyone.'}</p>`;
}

function crewCard(id) {
  const who = CAST[id];
  const status = memberStatus(id);
  return `<div class="ccard ${status.cls}">${portraitSlot(id)}<div class="nm">${who.name.toUpperCase()}</div>`
    + `<div class="rl">${who.role}</div>${memberBlurb(id)}<div class="stt">${status.text}</div></div>`;
}

function chapterRow(chapterId, upNext) {
  const mission = missionById(chapterId);
  const finished = isDone(chapterId);
  const current = upNext === mission;
  const running = G.mission?.def === mission;
  const rowClass = finished ? 'done' : current ? 'cur' : 'lock';
  const badge = finished ? '✓' : current ? '▶' : mission.chapter;
  let note = '';
  if (current) note = `<span>${running ? 'IN PROGRESS: ' : 'NEXT: '}${ARC[chapterId].stakes}</span>`;
  else if (finished) note = `<span>${ARC[chapterId].beat}</span>`;
  return `<div class="chrow ${rowClass}"><i>${badge}</i><div><b>CH ${mission.chapter} · ${mission.title}</b>${note}</div></div>`;
}

function actColumn(act, upNext) {
  const rows = act.chapters.map((id) => chapterRow(id, upNext)).join('');
  return `<div class="act"><h4>ACT ${ROMAN[act.n - 1]} · ${act.title}</h4>${rows}</div>`;
}

function header(doneCount) {
  const turf = shares();
  return '<div class="cchead">'
    + `<div><div class="kick">SOLVANE BAY: ${STORY_TITLE}</div><h2>CREW &amp; CHAPTERS</h2></div>`
    + `<div class="ccprog"><b>${doneCount} / ${MISSIONS.length}</b><span>CHAPTERS</span></div>`
    + '<div class="ccturf">'
    + `<div class="trow"><span>WATERFRONT</span><em>${galaLabel(doneCount)}</em></div>`
    + `<div class="turf"><i style="width:${turf.crown}%"></i><b style="width:${turf.tide}%"></b></div>`
    + `<div class="turflab"><span>Crown ${turf.crown}%</span><span>Low Tide ${turf.tide}%</span></div>`
    + '</div></div>';
}

function sideColumn() {
  const villains = TARGETS.map((id) =>
    `<div class="vill">${portraitSlot(id)}<div><b>${CAST[id].name.toUpperCase()}</b><span>${CAST[id].role}</span></div></div>`).join('');
  const unlocked = Object.keys(ARC).filter(isDone).flatMap((id) => ARC[id].unlocks);
  const list = unlocked.length ? unlocked.map((item) => `<i>${item}</i>`).join('') : '<span>Finish chapter 1</span>';
  return `<div class="act side"><h4>THE CROWN</h4>${villains}<h4>UNLOCKED</h4><div class="unl">${list}</div></div>`;
}

export function fillCrewChapters() {
  const body = document.getElementById('crewBody');
  const upNext = MISSIONS.find((mission) => !isDone(mission.id));
  body.innerHTML = header(G.completed.length)
    + `<div class="crewrow">${CREW_ORDER.map(crewCard).join('')}</div>`
    + `<div class="actrow">${ACTS.map((act) => actColumn(act, upNext)).join('')}${sideColumn()}</div>`;
  for (const canvas of body.querySelectorAll('canvas[data-who]')) drawPortrait(canvas, canvas.dataset.who);
}

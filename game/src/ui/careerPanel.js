// Career panel beside the city map: Bay completion ring, rep level, story chapters ticked off, career stats in big
// numbers, Low Tide territory with the districts it holds, and the three save slots with Save / Load buttons.
import { G, levelFromXp } from '../core/gameState.js';
import { RESPECT_XP, DISTRICTS } from '../core/config.js';
import { careerStats, completionPercent } from '../core/careerStats.js';
import { MISSIONS } from '../missions/storyMissions.js';
import { packageCount } from '../missions/sideActivities.js';
import { territory, shares } from '../story/territoryControl.js';
import { SLOTS, AUTOSAVE, slotSummary } from '../save/saveGame.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const km = (m) => (m / 1000).toFixed(1);
const titleCase = (t) => t.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
const stars = (n) => '<span class="cstars">' + [0, 1, 2, 3, 4].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('') + '</span>';
function playTime() { const m = Math.floor(((G.playBase || 0) + G.time) / 60); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; }
export function fillCareerPanel(side) {
  const s = careerStats(), lv = levelFromXp(G.xp), lo = RESPECT_XP[lv - 1], hi = RESPECT_XP[lv], sh = shares(), t = territory();
  const pct = completionPercent({ chapters: G.completed.length, totalChapters: MISSIONS.length, packages: G.packages.length, totalPackages: packageCount(), tideShare: sh.tide });
  const next = MISSIONS.find((m) => !G.completed.includes(m.id));
  const chapters = MISSIONS.map((m) => { const done = G.completed.includes(m.id), nx = m === next; return `<div class="cprow ${done ? 'done' : nx ? 'next' : 'locked'}"><b>${done ? '✓' : nx ? '▶' : m.chapter}</b><span>${titleCase(m.title)}</span></div>`; }).join('');
  const cell = (v, label) => `<div class="cstat"><b>${v}</b><span>${label}</span></div>`;
  const held = Object.keys(DISTRICTS).filter((d) => t[d] === 'tide').map((d) => `<i style="--c:${DISTRICTS[d].color}">${DISTRICTS[d].name}</i>`).join('') || '<em>None yet: the Crown holds the Bay</em>';
  const slots = SLOTS.map(({ id }) => { const q = slotSummary(id); return `<div class="srow${q.used ? ' used' : ''}"><b>${q.name}</b><span>${q.text}</span>${id !== AUTOSAVE ? `<button data-slot="save:${id}">Save</button>` : ''}<button data-slot="load:${id}"${q.used ? '' : ' disabled'}>Load</button></div>`; }).join('');
  side.innerHTML = `
  <div class="card chead"><div class="ring" style="--p:${pct * 3.6}deg"><div><b>${pct}%</b><span>BAY</span></div></div>
    <div class="cwho"><h3>CAREER · NICO VARELA</h3><div class="clv"><b>REP ${lv}</b><div class="bar"><i style="width:${hi ? Math.round((G.xp - lo) / (hi - lo) * 100) : 100}%"></i></div></div>
    <div class="cmeta"><span>${money(G.money)}</span><span>${playTime()} played</span><span>${money(s.cashEarned)} earned</span></div></div></div>
  <div class="card"><h3>STORY · ${G.completed.length} / ${MISSIONS.length} CHAPTERS</h3><div class="chgrid">${chapters}</div></div>
  <div class="card"><h3>CAREER STATS</h3><div class="cgrid">
    ${cell(s.carsStolen, 'CARS STOLEN')}${cell(stars(s.highestWanted), 'TOP WANTED')}${cell(km(s.metresDriven) + '<small>km</small>', 'DRIVEN')}
    ${cell(s.gangDown, 'GANG DOWN')}${cell(s.wantedEscapes, 'COPS SHAKEN')}${cell(km(s.metresOnFoot) + '<small>km</small>', 'ON FOOT')}
    ${cell(s.taxiFares, 'TAXI FARES')}${cell(s.racesWon, 'RACES WON')}${cell(`${G.packages.length}<small>/${packageCount()}</small>`, 'PACKAGES')}</div></div>
  <div class="card"><h3>TERRITORY · LOW TIDE ${sh.tide}%</h3><div class="turf"><i style="width:${sh.crown}%"></i><b style="width:${sh.tide}%"></b></div><div class="held">${held}</div></div>
  <div class="card"><h3>SAVE SLOTS</h3>${slots}</div>`;
  side.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => window.dispatchEvent(new CustomEvent('slot', { detail: b.dataset.slot }))));
}

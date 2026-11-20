// HUD: mission card, SBPD response list, money/clock/stars, radio card, vitals, weapons, speedometer, dialogue, toasts.
import { G, levelFromXp } from '../core/gameState.js';
import { RESPECT_XP } from '../core/config.js';
import { districtAt } from '../world/cityLayout.js';
import { copCars } from '../police/policeDispatch.js';
import { WEAPONS } from '../combat/weapons.js';
import { radioInfo } from '../audio/radioStations.js';
import { dlg } from '../story/dialogue.js';
import { CAST } from '../story/characters.js';
import { drawPortrait } from './portraits.js';
import { drawMinimap, gpsTarget } from './minimap.js';
import { conditionPct, conditionWord } from '../vehicles/vehicleCondition.js';
import { nitroLevel } from '../vehicles/nitroBoost.js';
import { driftState } from '../vehicles/driftScoring.js';
import { updateChapterCard } from './chapterCompleteCard.js';
import { gunSvg } from './weaponIcons.js';
import { updateCrewCards } from './crewCardStack.js';
import { shares } from '../story/territoryControl.js';
import { galaLabel } from '../story/chapterArc.js';

const wpV = { x: 0, y: 0, z: 0 }, HUD_RECTS = ['leftCol', 'crewStack', 'bottomLeft', 'topRight', 'rightCol', 'dialog'];
// Screen-space waypoint diamond with distance over the GPS target (clamped to the screen edges).
function updateWaypoint() {
  const t = G.mode === 'play' ? gpsTarget() : null, el = $('waypoint'); if (!t) { el.style.display = 'none'; return; }
  const v = G.camera.position.clone().set(t.x, 5, t.z).project(G.camera), behind = v.z > 1; let x = (v.x * 0.5 + 0.5) * innerWidth, y = (0.5 - v.y * 0.5) * innerHeight;
  if (behind) { x = innerWidth - x; y = innerHeight - 90; }
  x = Math.max(40, Math.min(innerWidth - 40, x)); y = Math.max(70, Math.min(innerHeight - 90, y));
  // never sit on a HUD card: push the diamond (and its distance label) out toward the screen centre
  for (const id of HUD_RECTS) { const e = $(id); if (!e || !e.offsetParent) continue; const r = e.getBoundingClientRect();
    if (x > r.left - 22 && x < r.right + 22 && y > r.top - 16 && y < r.bottom + 34) { if (r.left + r.right < innerWidth) x = r.right + 30; else x = r.left - 30; } }
  el.style.display = 'block'; el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`; el.classList.toggle('start', t.kind === 'start');
  set('wpDist', `${Math.round(Math.hypot(t.x - G.p.x, t.z - G.p.z))} m`);
}

let lastMoney = null, gain = 0, deltaT = 0;
const $ = (id) => document.getElementById(id); let lastWho = null, polT = 0, cache = {};
const set = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
const show = (id, on) => $(id).classList.toggle('hidden', !on);
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export function updateHud(dt) {
  const p = G.p, M = G.mission, w = G.wanted;
  $('hud').classList.toggle('compact', !!G.settings.hudCompact); // V: compact corners layout
  show('missionCard', !!M);
  if (M) { set('mChap', M.def.side ? 'SIDE JOB' : `CH ${M.def.chapter}`); set('mTitle', M.def.title); set('mObj', M.text); set('mStage', `STAGE ${Math.max(1, M.idx + 1)} / ${M.total}`); set('mTimer', M.timer > 0 ? fmt(M.timer) : ''); const nx = M.def.stages[M.idx + 1]; const nh = `<b>NEXT</b>${nx ? nx.text : `Payout $${M.def.reward.money.toLocaleString('en-US')} · +${M.def.reward.xp} rep`}`; if (cache.nh !== nh) { cache.nh = nh; $('mNext').innerHTML = nh; } $('mBar').style.width = `${Math.max(6, (M.idx / M.total) * 100)}%`; }
  polT -= dt; show('policeCard', w.stars > 0);
  if (w.stars > 0 && polT <= 0) {
    polT = 0.25; const units = [...copCars(), ...(G.boats || []).filter((b) => b.type.police && b.driver === 'ai' && !b.dead)], cs = units.map((c) => ({ c, d: Math.hypot(c.x - p.x, c.z - p.z) })).sort((a, b) => a.d - b.d).slice(0, 4);
    let h = cs.map(({ c, d }) => `<div class="prow"><span class="cs">${c.callsign || 'SB-00'}</span><span class="d">${Math.round(d)} m</span><span class="tag ${c.ai}">${c.ai || 'PURSUIT'}</span></div>`).join('');
    if (G.heli) h += `<div class="prow"><span class="cs">AIR-1</span><span class="d">${Math.round(Math.hypot(G.heli.x - p.x, G.heli.z - p.z))} m</span><span class="tag TRACKING">TRACKING</span></div>`;
    $('policeRows').innerHTML = h; set('policeCount', `${units.length} ${units.length === 1 ? 'UNIT' : 'UNITS'}`);
  }
  const hh = Math.floor(G.clock) % 24, mm = Math.floor((G.clock % 1) * 60); set('clock', `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  set('money', `$${Math.floor(G.money).toLocaleString('en-US')}`);
  if (lastMoney === null) lastMoney = G.money; if (G.money > lastMoney + 0.5) { gain = (deltaT > 0 ? gain : 0) + (G.money - lastMoney); deltaT = 2.6; } lastMoney = G.money; deltaT -= dt;
  set('moneyDelta', deltaT > 0 ? `+$${Math.round(gain).toLocaleString('en-US')}` : '');
  const lv = levelFromXp(G.xp), lo = RESPECT_XP[lv - 1], hi = RESPECT_XP[lv]; set('respLv', `LV ${lv}`); $('respBar').style.width = `${hi ? Math.round((G.xp - lo) / (hi - lo) * 100) : 100}%`;
  const st = $('stars').children; for (let i = 0; i < 5; i++) st[i].classList.toggle('on', i < w.stars); $('stars').classList.toggle('flash', w.stars > 0 && !w.seen);
  show('losTag', w.stars > 0); if (w.stars > 0) { set('losTag', w.seen ? 'IN SIGHT' : 'SEARCHING'); $('losTag').className = w.seen ? 'seen' : 'search'; }
  const r = radioInfo(); set('rName', r ? r.name : 'RADIO OFF'); set('rTrack', r ? `${r.track} · ${r.dj}` : 'Press R to tune in');
  $('hpBar').style.width = `${Math.max(0, p.hp)}%`; $('arBar').style.width = `${p.armor}%`; set('hpNum', String(Math.max(0, Math.round(p.hp)))); set('arNum', String(Math.round(p.armor))); set('district', districtAt(p.x, p.z).toUpperCase());
  const wp = WEAPONS[p.weapon] || WEAPONS[0], wh = WEAPONS.map((q, i) => `<div class="wt${p.owned[i] ? ' own' : ''}${p.weapon === i ? ' sel' : ''}"><b>${i + 1}</b>${gunSvg(q.id)}<span>${!p.owned[i] ? '' : q.id === 'fists' ? '∞' : p.ammo[q.id] ?? 0}</span></div>`).join('');
  if (cache.wh !== wh) { cache.wh = wh; $('wbar').innerHTML = wh; }
  if (cache.wid !== wp.id) { cache.wid = wp.id; $('wIcon').innerHTML = gunSvg(wp.id); set('wName', wp.name.toUpperCase()); }
  const am = wp.id === 'fists' ? '∞' : p.ammo[wp.id] ?? 0, mag = wp.mag ? Math.min(wp.mag, am) : 0; const ah = wp.id === 'fists' ? '<small>MELEE</small>' : wp.thrown ? `${am}<small> THROW</small>` : `${mag}<small> / ${Math.max(0, am - mag)}</small>`; if (cache.ah !== ah) { cache.ah = ah; $('wAmmo').innerHTML = ah; }
  show('speedo', !!p.car); if (p.car) { set('speedVal', String(Math.round(Math.abs(p.car.speed) * 3.6))); set('carName', p.car.type.name.toUpperCase()); const cp = conditionPct(p.car); $('carBar').style.width = `${cp}%`; set('condPct', `${cp}% ${conditionWord(cp)}`); $('carBar').parentNode.classList.toggle('low', cp <= 45); const nl = nitroLevel(p.car); $('nitroBar').style.width = `${Math.round(nl * 100)}%`; $('nitroBar').parentNode.classList.toggle('on', !!p.car.boosting); set('nitroKey', p.car.boosting ? 'BOOST!' : `${Math.round(nl * 100)}%`); set('gear', p.car.speed < -0.5 ? 'R' : `D${Math.min(6, 1 + Math.floor(Math.abs(p.car.speed) / 9))}`); }
  show('crosshair', !p.car && p.aim && G.mode === 'play');
  const d = dlg.cur; show('dialog', !!d);
  if (d) { if (lastWho !== d.who) { lastWho = d.who; drawPortrait($('portrait'), d.who); } set('dName', (CAST[d.who]?.name || d.who).toUpperCase() + '  ·  ' + (CAST[d.who]?.role || '')); const n = Math.min(d.text.length, Math.floor(dlg.t * 55) + 1); set('dText', d.text.slice(0, n)); } else lastWho = null;
  const pr = G.prompt || (!p.car && p.nearCar ? `F  Enter ${p.nearCar.type.name}` : ''); show('prompt', !!pr && G.mode === 'play'); set('prompt', pr);
  const tl = G.toasts.map((t) => `<div class="toast ${t.kind}">${t.text}</div>`).join(''); if (cache.tl !== tl) { cache.tl = tl; $('toasts').innerHTML = tl; }
  for (const t of G.toasts) t.t -= dt; G.toasts = G.toasts.filter((t) => t.t > 0);
  let pu = (G.popups || []).map((q) => `<div class="popup ${q.kind}" style="opacity:${Math.min(1, q.t * 2).toFixed(2)}"><b>${q.text}</b>${q.cash ? `<span>+$${q.cash}</span>` : ''}</div>`).join('');
  $('radioCard').style.visibility = (G.popups || []).length >= 2 ? 'hidden' : ''; // the stunt combo takes the radio card's slot while it runs
  if ((G.popups || []).length >= 2) pu = `<div class="popup combo"><b>COMBO x${G.popups.length}</b><span>+$${G.popups.reduce((s, q) => s + q.cash, 0)}</span></div>` + pu; // two or more stunts chained
  if (p.car && driftState.t > 0.3) pu = `<div class="popup live"><b>DRIFT x${driftState.mult}</b><span>${Math.round(driftState.pts * driftState.mult)}</span></div>` + pu;
  if (cache.pu !== pu) { cache.pu = pu; $('popups').innerHTML = pu; }
  updateChapterCard(dt); updateCrewCards();
  const sh = shares(); set('galaBadge', galaLabel(G.completed.length)); set('turfCrownT', `Crown ${sh.crown}%`); set('turfTideT', `Low Tide ${sh.tide}%`); $('turfCrown').style.width = `${sh.crown}%`; $('turfTide').style.width = `${sh.tide}%`;
  G.hudRate += dt; if (G.hudRate > 0.04) { G.hudRate = 0; drawMinimap($('minimap')); }
  updateWaypoint();
}
export const showHud = (on) => show('hud', on);

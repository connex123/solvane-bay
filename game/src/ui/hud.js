// HUD: mission card, SBPD response list, money/clock/stars, radio card, vitals, weapons, speedometer, dialogue, toasts.
import { G } from '../core/gameState.js';
import { districtAt } from '../world/cityLayout.js';
import { copCars } from '../police/policeDispatch.js';
import { WEAPONS } from '../combat/weapons.js';
import { radioInfo } from '../audio/radioStations.js';
import { dlg } from '../story/dialogue.js';
import { CAST } from '../story/characters.js';
import { drawPortrait } from './portraits.js';
import { drawMinimap, gpsTarget } from './minimap.js';

const wpV = { x: 0, y: 0, z: 0 };
// Screen-space waypoint diamond with distance over the GPS target (clamped to the screen edges).
function updateWaypoint() {
  const t = G.mode === 'play' ? gpsTarget() : null, el = $('waypoint'); if (!t) { el.style.display = 'none'; return; }
  const v = G.camera.position.clone().set(t.x, 5, t.z).project(G.camera), behind = v.z > 1; let x = (v.x * 0.5 + 0.5) * innerWidth, y = (0.5 - v.y * 0.5) * innerHeight;
  if (behind) { x = innerWidth - x; y = innerHeight - 90; }
  x = Math.max(40, Math.min(innerWidth - 40, x)); y = Math.max(70, Math.min(innerHeight - 90, y));
  el.style.display = 'block'; el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`; el.classList.toggle('start', t.kind === 'start');
  set('wpDist', `${Math.round(Math.hypot(t.x - G.p.x, t.z - G.p.z))} m`);
}

const $ = (id) => document.getElementById(id); let lastWho = null, polT = 0, cache = {};
const set = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
const show = (id, on) => $(id).classList.toggle('hidden', !on);
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export function updateHud(dt) {
  const p = G.p, M = G.mission, w = G.wanted;
  show('missionCard', !!M);
  if (M) { set('mChap', M.def.side ? 'SIDE JOB' : `CH ${M.def.chapter}`); set('mTitle', M.def.title); set('mObj', M.text); set('mStage', `STAGE ${Math.max(1, M.idx + 1)} / ${M.total}`); set('mTimer', M.timer > 0 ? fmt(M.timer) : ''); $('mBar').style.width = `${Math.max(6, (M.idx / M.total) * 100)}%`; }
  polT -= dt; show('policeCard', w.stars > 0);
  if (w.stars > 0 && polT <= 0) {
    polT = 0.25; const cs = copCars().map((c) => ({ c, d: Math.hypot(c.x - p.x, c.z - p.z) })).sort((a, b) => a.d - b.d).slice(0, 4);
    let h = cs.map(({ c, d }) => `<div class="prow"><span class="cs">${c.callsign || 'SB-00'}</span><span class="d">${Math.round(d)} m</span><span class="tag ${c.ai}">${c.ai || 'PURSUIT'}</span></div>`).join('');
    if (G.heli) h += `<div class="prow"><span class="cs">AIR-1</span><span class="d">${Math.round(Math.hypot(G.heli.x - p.x, G.heli.z - p.z))} m</span><span class="tag TRACKING">TRACKING</span></div>`;
    $('policeRows').innerHTML = h; set('policeCount', `${copCars().length} UNITS`);
  }
  const hh = Math.floor(G.clock) % 24, mm = Math.floor((G.clock % 1) * 60); set('clock', `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  set('money', `$${Math.floor(G.money).toLocaleString('en-US')}`);
  const st = $('stars').children; for (let i = 0; i < 5; i++) st[i].classList.toggle('on', i < w.stars); $('stars').classList.toggle('flash', w.stars > 0 && w.unseen > 0);
  const r = radioInfo(); set('rName', r ? r.name : 'RADIO OFF'); set('rTrack', r ? `${r.track} · ${r.dj}` : 'Press R to tune in');
  $('hpBar').style.width = `${Math.max(0, p.hp)}%`; $('arBar').style.width = `${p.armor}%`; set('district', districtAt(p.x, p.z).toUpperCase());
  const wh = WEAPONS.map((wp, i) => `<div class="wslot${p.weapon === i ? ' sel' : ''}" style="${p.owned[i] ? '' : 'opacity:.25'}"><b>${i + 1}</b>${wp.name}<span>${i === 0 ? '∞' : p.owned[i] ? p.ammo[wp.id] : '–'}</span></div>`).join('');
  if (cache.wh !== wh) { cache.wh = wh; $('weapons').innerHTML = wh; }
  show('speedo', !!p.car); if (p.car) { set('speedVal', String(Math.round(Math.abs(p.car.speed) * 3.6))); set('carName', p.car.type.name.toUpperCase()); $('carBar').style.width = `${Math.max(0, p.car.hp / p.car.maxHp * 100)}%`; set('gear', p.car.speed < -0.5 ? 'R' : `D${Math.min(6, 1 + Math.floor(Math.abs(p.car.speed) / 9))}`); }
  show('crosshair', !p.car && p.aim && G.mode === 'play');
  const d = dlg.cur; show('dialog', !!d);
  if (d) { if (lastWho !== d.who) { lastWho = d.who; drawPortrait($('portrait'), d.who); } set('dName', (CAST[d.who]?.name || d.who).toUpperCase() + '  ·  ' + (CAST[d.who]?.role || '')); const n = Math.min(d.text.length, Math.floor(dlg.t * 55) + 1); set('dText', d.text.slice(0, n)); } else lastWho = null;
  const pr = G.prompt || (!p.car && p.nearCar ? `F  Enter ${p.nearCar.type.name}` : ''); show('prompt', !!pr && G.mode === 'play'); set('prompt', pr);
  const tl = G.toasts.map((t) => `<div class="toast ${t.kind}">${t.text}</div>`).join(''); if (cache.tl !== tl) { cache.tl = tl; $('toasts').innerHTML = tl; }
  for (const t of G.toasts) t.t -= dt; G.toasts = G.toasts.filter((t) => t.t > 0);
  G.hudRate += dt; if (G.hudRate > 0.04) { G.hudRate = 0; drawMinimap($('minimap')); }
  updateWaypoint();
}
export const showHud = (on) => show('hud', on);

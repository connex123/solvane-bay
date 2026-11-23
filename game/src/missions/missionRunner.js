// Runs a mission definition stage by stage: steal, goto/deliver, chase, kill, collect, escape; timers, rewards, failure.
import { recordStat } from '../core/careerStats.js';
import { G, notify, levelFromXp } from '../core/gameState.js';
import { rnd } from '../core/random.js';
import { MISSIONS } from './storyMissions.js';
import { addMarker, removeMarker } from './markers.js';
import { say } from '../story/dialogue.js';
import { createCar } from '../vehicles/carPhysics.js';
import { placeTraffic } from '../vehicles/trafficSystem.js';
import { createActor } from '../characters/pedestrianSystem.js';
import { STYLES } from '../characters/characterModel.js';
import { setStars } from '../police/wantedSystem.js';
import { saveGame, AUTOSAVE } from '../save/saveGame.js';
import { sfx } from '../audio/soundEngine.js';
import { nearestLine } from '../world/cityLayout.js';
import { HALF, lineCoord } from '../core/config.js';
import { ARC, galaLabel } from '../story/chapterArc.js';
import { applyChapterFlips } from '../story/territoryControl.js';
import { showChapterCard } from '../ui/chapterCompleteCard.js';

let startMarker = null, objMarkers = [], introLock = false;
export const activeMission = () => G.mission;
export function nextStory() { return MISSIONS.find((m) => !G.completed.includes(m.id)); }
export function refreshStartMarker() {
  removeMarker(startMarker); startMarker = null; if (G.mission || introLock) return;
  const m = nextStory(); if (!m) return;
  startMarker = addMarker({ ...m.start, color: 0xffd23c, kind: 'start', label: `${m.title}`, r: 4.5, onEnter: () => { if (G.mission || introLock || G.mode !== 'play') return; introLock = true; say(m.intro, () => { introLock = false; startMission(m); }); } });
}
export function startMission(def) {
  removeMarker(startMarker); startMarker = null;
  G.mission = { def, idx: -1, stage: null, timer: 0, total: def.stages.length, car: null, text: '', side: !!def.side, target: null, collected: 0, enemies: [] };
  nextStage();
}
function clearObj() { objMarkers.forEach(removeMarker); objMarkers = []; }
function nextStage() {
  const M = G.mission; M.stage?.end?.(M, false); clearObj(); M.idx++;
  if (M.idx >= M.def.stages.length) return complete();
  const s = M.stage = M.def.stages[M.idx]; M.text = s.text; M.timer = s.time || 0; M.stageDone = false; sfx.pickup();
  if (s.type === 'steal') { const car = createCar(s.key, s.at.x, s.at.z, s.at.h || 0, 'parked', s.tint); car.missionCar = true; M.car = car; objMarkers.push(addMarker({ follow: car, x: car.x, z: car.z, color: 0xff3a5c, r: 0, label: 'CAR', auto: true })); }
  else if (s.type === 'goto') objMarkers.push(addMarker({ ...s.at, color: 0xffd23c, r: s.r || 6, label: 'GO', needCar: !!s.car, needFoot: !!s.foot, onEnter: (m) => { if (s.car === 'mission' && G.p.car !== M.car) return; if (s.car === 'boat' && !G.p.car?.isBoat) return; M.stageDone = true; } }));
  else if (s.type === 'collect') { M.collected = 0; s.pts.forEach((pt) => objMarkers.push(addMarker({ ...pt, color: 0x4fe0c0, r: 3, label: 'PICKUP', onEnter: (m) => { removeMarker(m); objMarkers = objMarkers.filter((o) => o !== m); M.collected++; sfx.pickup(); notify(`${M.collected}/${s.pts.length}`, 'good'); if (M.collected >= s.pts.length) M.stageDone = true; } }))); }
  else if (s.type === 'kill') { M.enemies = []; for (let k = 0; k < s.count; k++) { const sp = s.spots?.[k % s.spots.length], a = createActor('gang', sp ? sp.x : s.at.x + rnd.range(-14, 14), sp ? sp.z : s.at.z + rnd.range(-14, 14), s.gang === 'brandt' || s.gang === undefined && false ? STYLES.suit : (s.gang === 'brandt' ? STYLES.suit : STYLES.coral), {}); a.hp = 70; M.enemies.push(a); } objMarkers.push(addMarker({ ...s.at, color: 0xff3a5c, r: 0, label: 'TARGETS' })); }
  else if (s.type === 'chase') { const pt = s.at, line = nearestLine(pt.z), car = placeTraffic('x', line, pt.x, 1, s.key, 'target', s.tint); car.hp = car.maxHp = 700; M.target = car; M.car = car; objMarkers.push(addMarker({ follow: car, x: car.x, z: car.z, color: 0xff3a5c, r: 0, label: 'TARGET' })); }
  else if (s.type === 'escape') { setStars(s.stars); }
  if (s.stars && s.type !== 'escape' && G.wanted.stars < s.stars) setStars(s.stars);
  s.begin?.(M);
}
function fail(why) { if (!G.mission) return; G.mission.stage?.end?.(G.mission, true); notify(`MISSION FAILED: ${why}`, 'bad'); clearObj(); G.mission = null; refreshStartMarker(); }
export const failMission = fail;
function complete() {
  const M = G.mission, d = M.def; clearObj(); G.mission = null; G.money += d.reward.money; const lv = levelFromXp(G.xp); G.xp += d.reward.xp; sfx.pickup();
  if (levelFromXp(G.xp) > lv) notify(`REP LEVEL ${levelFromXp(G.xp)}: new gear at Calder Arms`, 'good');
  recordStat('cashEarned', d.reward.money); if (d.side) recordStat(d.title === 'STREET RACE' ? 'racesWon' : 'taxiFares');
  if (d.side) { notify(`JOB DONE  +$${d.reward.money}  +${d.reward.xp} REP`, 'good'); refreshStartMarker(); return; }
  G.completed.push(d.id); const flips = applyChapterFlips(d.id); G.hooks.onChapter?.(d.id);
  showChapterCard({ def: d, arc: ARC[d.id], flips, days: galaLabel(G.completed.length) });
  if (d.outro) say(d.outro); saveGame(AUTOSAVE); refreshStartMarker();
  if (G.completed.length === MISSIONS.length) notify('THE BAY IS FREE: keep driving', 'good');
}
export function updateMission(dt) {
  const M = G.mission; if (!M) return; const s = M.stage, p = G.p;
  if (M.timer > 0 && !M.stageDone) { M.timer -= dt; if (M.timer <= 0) return fail('time ran out'); }
  if (s.type === 'steal' && p.car === M.car) M.stageDone = true;
  if (s.type === 'goto' && s.car === 'mission') { const m = objMarkers[0]; if (m) { m.hidden = p.car !== M.car; } M.text = p.car === M.car ? s.text : 'Get back in the mission car'; if (M.car?.dead) return fail('the car was destroyed'); }
  if (s.type === 'chase') { const t = M.target; if (t.dead) M.stageDone = true; else if (!G.cars.includes(t) || Math.hypot(t.x - p.x, t.z - p.z) > 280) return fail('the target got away'); }
  if (s.type === 'kill') { const left = M.enemies.filter((a) => !a.dead).length; M.text = `${s.text} (${left} left)`; if (!left) M.stageDone = true; objMarkers.forEach((m) => m.hidden = Math.hypot(m.x - p.x, m.z - p.z) < 25); }
  if (s.type === 'escape') { if (G.wanted.stars === 0) M.stageDone = true; }
  if (s.type === 'goto' && s.car === 'boat') M.text = p.car?.isBoat ? s.text : 'Get back in the speedboat';
  if (s.tick && !M.stageDone) { const r = s.tick(M, dt); if (typeof r === 'string') return fail(r); if (r) M.stageDone = true; }
  if (s.type === 'steal' && M.car?.dead) return fail('the car was destroyed');
  if (M.stageDone) nextStage();
}
export const missionFailed = fail;
export function missionTargets() { const M = G.mission; if (!M) return []; return [...G.markers.filter((m) => m.kind === 'obj' && !m.hidden), ...(M.stage?.type === 'kill' ? M.enemies.filter((a) => !a.dead).map((a) => ({ x: a.x, z: a.z, color: 0xff3a5c, label: '' })) : [])]; }

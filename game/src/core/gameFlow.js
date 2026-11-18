// Game flow: new game / continue, pause and menus, death and respawn, the hooks other systems call, and menu hotkeys.
import { G, notify } from './gameState.js';
import { drawCityMap } from '../ui/cityMap.js';
import { input, pressed, requestLock, releaseLock, clearEdges } from './input.js';
import { exitCar } from '../characters/playerController.js';
import { removeCar, damageCar } from '../vehicles/carPhysics.js';
import { hitActor, removeActor } from '../characters/pedestrianSystem.js';
import { crime, setStars } from '../police/wantedSystem.js';
import { refreshStartMarker, failMission } from '../missions/missionRunner.js';
import { RESPAWN } from '../missions/sideActivities.js';
import { HOME } from '../missions/storyMissions.js';
import { say, clearDialogue } from '../story/dialogue.js';
import { rig } from '../camera/cameraRig.js';
import { showHud } from '../ui/hud.js';
import { showScreen, hideScreens, showDead } from '../ui/menus.js';
import { initAudio, sfx } from '../audio/soundEngine.js';
import { cycleRadio } from '../audio/radioStations.js';
import { saveGame, readSave, applySave } from '../save/saveGame.js';

function hurtPlayer(d) { const p = G.p; if (p.car) { damageCar(p.car, d * 3); return; } const a = Math.min(p.armor, d * 0.7); p.armor -= a; p.hp -= d - a; G.shake = Math.max(G.shake, 0.25); }
export function playerDown(kind) {
  if (G.mode !== 'play') return; G.mode = 'dead'; G.deadT = 0; G.deadKind = kind; failMission(kind.toLowerCase()); clearDialogue();
  const fee = Math.min(Math.floor(G.money), Math.max(100, Math.round(G.money * 0.05))); G.fee = fee; releaseLock();
  showDead(kind, kind === 'CUFFED' ? `The SBPD took $${fee} and your freedom for a night.` : `Hospital bills: $${fee}. Nico wakes up in Crown Medical.`);
}
export function respawn() {
  const p = G.p, at = G.deadKind === 'CUFFED' ? RESPAWN.police : RESPAWN.hospital; G.money -= G.fee; if (p.car) exitCar(true);
  p.x = at.x; p.z = at.z; p.hp = 100; p.armor = 0; p.yaw = 0; p.hidden = false; p.mesh.visible = true; G.cam.yaw = Math.PI; setStars(0);
  for (const c of G.cars.filter((c) => c.kind === 'cop')) removeCar(c); for (const a of G.actors.filter((a) => a.kind === 'cop')) removeActor(a);
  G.mode = 'play'; hideScreens(); showHud(true); requestLock(); refreshStartMarker();
}
G.hooks = { hitActor, crime, hurtPlayer, playerDown, openShop: () => { G.mode = 'pause'; releaseLock(); showScreen('shop'); }, onEnterCar: () => {} };

function resetWorld() {
  const p = G.p; G.money = 500; G.xp = 0; G.completed = []; G.packages = []; G.mission = null; p.owned = { 0: true, 1: true }; p.ammo = { pistol: 60, smg: 0, shotgun: 0 }; p.hp = 100; p.armor = 0; p.weapon = 1;
  setStars(0); G.clock = 17.6; if (p.car) exitCar(true); p.x = HOME.x; p.z = HOME.z; p.yaw = Math.PI / 2; G.cam.yaw = Math.PI / 2; G.cam.pitch = 0.2; p.mesh.visible = true; p.hidden = false; clearDialogue();
}
export function startGame(load) {
  initAudio(); resetWorld(); if (load) { const s = readSave(); if (s) applySave(s); }
  G.mode = 'play'; rig.mode = 'auto'; hideScreens(); showHud(true); swallowMenuClick(); requestLock(); refreshStartMarker();
  say([{ who: 'dex', text: load ? 'Back in the Bay, Nico? Gold marker, Club Velvet. Let us get to work.' : 'Welcome to Solvane Bay, Nico. Walk into the gold marker outside Club Velvet and we will talk work.' }]);
}
export function toTitle() { G.mode = 'title'; rig.mode = 'aerial'; showHud(false); showScreen('title'); releaseLock(); G.mission = null; clearDialogue(); }
export function pause(on) { if (on && G.mode === 'play') { G.mode = 'pause'; showScreen('pause'); releaseLock(); sfx.engine(false, 0, 0); } else if (!on && (G.mode === 'pause')) { G.mode = 'play'; hideScreens(); swallowMenuClick(); requestLock(); } }
// the click on a menu button must not also fire the player's gun
function swallowMenuClick() { clearEdges(); input.left = false; }
export const handlers = {
  new: () => startGame(false), continue: () => startGame(true), controls: () => { G.prevScreen = G.mode; showScreen('controls'); }, settings: () => showScreen('settings'),
  back: () => showScreen(G.mode === 'title' ? 'title' : 'pause'), resume: () => pause(false), map: () => showScreen('cityMap'), save: () => { saveGame(); notify('GAME SAVED', 'good'); pause(false); },
  quit: () => toTitle(), closeShop: () => { G.mode = 'play'; hideScreens(); swallowMenuClick(); requestLock(); },
};

window.addEventListener('slot', (e) => { if (e.detail === 'save') { saveGame(); notify('GAME SAVED', 'good'); drawCityMap(); } else if (e.detail === 'load' && readSave()) startGame(true); });

export function menuKeys() {
  if (pressed('Escape')) { if (G.mode === 'play') pause(true); else if (G.mode === 'pause') { if (!document.getElementById('cityMap').classList.contains('hidden') || !document.getElementById('pause').classList.contains('hidden')) pause(false); else showScreen('pause'); } }
  if (pressed('KeyM') && (G.mode === 'play')) { G.mode = 'pause'; showScreen('cityMap'); releaseLock(); } else if (pressed('KeyM') && G.mode === 'pause' && !document.getElementById('cityMap').classList.contains('hidden')) pause(false);
  if (pressed('KeyR') && G.mode === 'play') { cycleRadio(); sfx.click(); }
  if (G.mode === 'play' && !input.locked && input.leftPressed && document.getElementById('dialog').classList.contains('hidden')) requestLock();
}

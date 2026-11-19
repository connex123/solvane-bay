// Game flow: new game / continue, pause, title, death and respawn, menu button handlers and global hotkeys (Esc, M, R).
import { G, notify } from './gameState.js';
import { input, pressed, requestLock, releaseLock } from './input.js';
import { drawCityMap } from '../ui/cityMap.js';
import { exitCar } from '../characters/playerController.js';
import { removeCar, damageCar } from '../vehicles/carPhysics.js';
import { hitActor, removeActor } from '../characters/pedestrianSystem.js';
import { crime, setStars } from '../police/wantedSystem.js';
import { refreshStartMarker, failMission } from '../missions/missionRunner.js';
import { RESPAWN } from '../missions/sideActivities.js';
import { HOME } from '../missions/storyMissions.js';
import { say, clearDialogue } from '../story/dialogue.js';
import { galaLabel } from '../story/chapterArc.js';
import { grantMolotovs } from '../combat/molotov.js';
import { applyGarage } from '../shop/garageShop.js';
import { rig } from '../camera/cameraRig.js';
import { showScreen, hideScreens, showDead } from '../ui/menus.js';
import { initAudio, sfx } from '../audio/soundEngine.js';
import { cycleRadio } from '../audio/radioStations.js';
import { saveGame, readSave, applySave } from '../save/saveGame.js';
import { spawnTrafficNear } from '../vehicles/trafficSystem.js';
import { spawnPedsNear } from '../characters/pedestrianSystem.js';
import { renderFrame } from '../render/frameRenderer.js';
import { showHud, updateHud } from '../ui/hud.js';

const hidden = (id) => document.getElementById(id).classList.contains('hidden');
function hurtPlayer(d) { const p = G.p; if (p.car) { damageCar(p.car, d * 3); return; } const a = Math.min(p.armor, d * 0.7); p.armor -= a; p.hp -= d - a; G.shake = Math.max(G.shake, 0.25); }
function playerDown(kind) {
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
G.hooks = { hitActor, crime, hurtPlayer, playerDown, openShop: () => { G.mode = 'pause'; releaseLock(); showScreen('shop'); }, onEnterCar: (car) => applyGarage(car), openGarage: () => { G.mode = 'pause'; releaseLock(); showScreen('garage'); }, onChapter: (id) => { if (id === 'm3') grantMolotovs(3); } };

function resetWorld() {
  const p = G.p; G.money = 500; G.xp = 0; G.completed = []; G.packages = []; G.mission = null; G.territory = null; G.crew = null; G.garage = null; p.owned = { 0: true, 1: true }; p.ammo = { pistol: 60, smg: 0, shotgun: 0, molotov: 0 }; p.hp = 100; p.armor = 0; p.weapon = 1;
  setStars(0); G.clock = 17.6; if (p.car) exitCar(true); p.x = HOME.x; p.z = HOME.z; p.yaw = Math.PI / 2; G.cam.yaw = Math.PI / 2; G.cam.pitch = 0.2; p.mesh.visible = true; p.hidden = false; clearDialogue();
}
// Swallow the click that pressed a menu button so it never reaches the gun.
const swallowClick = () => { input.left = false; input.leftPressed = false; };
// Populate the streets around the player and draw the first play frame (GPU uploads, shadow map, HUD) right away, so
// the cost lands on the button press rather than as a stall a second into play.
function primeFirstFrame() {
  const p = G.p; for (let k = 0; k < 6; k++) { spawnTrafficNear(p.x, p.z, 70, 190); spawnPedsNear(p.x, p.z, 30, 130); }
  renderFrame(true); updateHud(0.016); const gl = G.renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
}
export function startGame(load) {
  initAudio(); resetWorld(); if (load) { const s = readSave(); if (s) applySave(s); }
  G.mode = 'play'; rig.mode = 'auto'; hideScreens(); showHud(true); swallowClick(); requestLock(); refreshStartMarker(); primeFirstFrame(); G.holdFrames = 3;
  say(load ? [{ who: 'sol', text: `${galaLabel(G.completed.length)}, Nico. Follow the gold marker; the Low Tide is not getting any younger.` }]
    : [{ who: 'nico', text: 'Five years away and the night ferry still smells like diesel and fried fish. Home.' }, { who: 'brandt', text: 'Welcome back, Mr Varela. Your mother\'s diner belongs to the Crown now. Enjoy the Causeway Gala in seven days.' }, { who: 'dex', text: 'Nico! Gold marker outside Club Velvet. We talk before Brandt\'s people find you.' }]);
}
export function toTitle() { G.mode = 'title'; rig.mode = 'aerial'; showHud(false); showScreen('title'); releaseLock(); G.mission = null; clearDialogue(); }
export function pause(on) { if (on && G.mode === 'play') { G.mode = 'pause'; showScreen('pause'); releaseLock(); sfx.engine(false, 0, 0); } else if (!on && (G.mode === 'pause')) { G.mode = 'play'; hideScreens(); swallowClick(); requestLock(); } }
export const handlers = {
  new: () => startGame(false), continue: () => startGame(true), controls: () => { G.prevScreen = G.mode; showScreen('controls'); }, settings: () => showScreen('settings'),
  back: () => showScreen(G.mode === 'title' ? 'title' : 'pause'), resume: () => pause(false), map: () => showScreen('cityMap'), crew: () => showScreen('crew'), save: () => { saveGame(); notify('GAME SAVED', 'good'); pause(false); },
  quit: () => toTitle(), closeShop: () => { G.mode = 'play'; hideScreens(); swallowClick(); requestLock(); },
};
window.addEventListener('slot', (e) => { if (e.detail === 'save') { saveGame(); notify('GAME SAVED', 'good'); drawCityMap(); } else if (e.detail === 'load' && readSave()) startGame(true); });
input.onUnlock = () => { if (G.mode === 'play') { pause(true); G.unlockPauseAt = performance.now(); } };

// Global hotkeys, read once per rendered frame.
export function handleGlobalKeys() {
  // Esc while the pointer is locked both releases the lock (which pauses) and arrives as a key: that is one pause, not pause+resume
  if (pressed('Escape') && performance.now() - (G.unlockPauseAt || -1e9) < 500) input.edge.delete('Escape');
  if (pressed('Escape')) { if (G.mode === 'play') pause(true); else if (G.mode === 'pause') { if (!hidden('cityMap') || !hidden('pause')) pause(false); else showScreen('pause'); } }
  if (pressed('KeyM') && G.mode === 'play') { G.mode = 'pause'; showScreen('cityMap'); releaseLock(); } else if (pressed('KeyM') && G.mode === 'pause' && !hidden('cityMap')) pause(false);
  if (pressed('KeyJ') && G.mode === 'play') { G.mode = 'pause'; showScreen('crew'); releaseLock(); } else if (pressed('KeyJ') && G.mode === 'pause' && !hidden('crew')) pause(false);
  if (pressed('KeyR') && G.mode === 'play') { cycleRadio(); sfx.click(); }
  if (G.mode === 'play' && !input.locked && input.leftPressed && hidden('dialog')) requestLock();
  for (const k of ['Escape', 'KeyM', 'KeyR', 'KeyJ']) input.edge.delete(k); // consumed here; other edges wait for the next simulation step
}

// Boot and game loop for SOLVANE BAY: builds the city, wires systems together, runs the frame loop and game flow.
import * as THREE from 'three';
import { G, notify } from './core/gameState.js';
import { drawCityMap } from './ui/cityMap.js';
import { seedRandom, rnd } from './core/random.js';
import { initInput, input, pressed, requestLock, releaseLock, endFrame } from './core/input.js';
import { buildLayout } from './world/cityLayout.js';
import { facadeMaps } from './world/textureFactory.js';
import { createSky } from './world/skyAndLighting.js';
import { buildBeachAndSea, animateSea } from './world/beachAndSea.js';
import { buildRoads } from './world/roadNetwork.js';
import { buildCity } from './world/buildingFactory.js';
import { buildProps } from './world/propsFactory.js';
import { initEffects, updateEffects, updateSirens } from './combat/effects.js';
import { createPlayer, updatePlayer, exitCar } from './characters/playerController.js';
import { stepCar, carCollisions, removeCar, damageCar } from './vehicles/carPhysics.js';
import { updateTraffic, populateParked, spawnTrafficNear } from './vehicles/trafficSystem.js';
import { updateActors, maintainPeds, hitActor, spawnPedsNear, removeActor } from './characters/pedestrianSystem.js';
import { crime, updateWanted, setStars } from './police/wantedSystem.js';
import { updatePolice } from './police/policeDispatch.js';
import { updateHeli } from './police/helicopterUnit.js';
import { updateMarkers } from './missions/markers.js';
import { updateMission, refreshStartMarker, failMission } from './missions/missionRunner.js';
import { initSideActivities, updateSide, RESPAWN } from './missions/sideActivities.js';
import { HOME } from './missions/storyMissions.js';
import { say, updateDialogue, clearDialogue } from './story/dialogue.js';
import { updateCamera, rig } from './camera/cameraRig.js';
import { updateHud, showHud } from './ui/hud.js';
import { initMenus, showScreen, hideScreens, showDead } from './ui/menus.js';
import { initAudio, sfx } from './audio/soundEngine.js';
import { cycleRadio, updateRadio } from './audio/radioStations.js';
import { saveGame, readSave, applySave } from './save/saveGame.js';
import { createPostProcessing } from './render/postProcessing.js';
import { runShot, runSelfTest } from './shots/screenshotScenes.js';

const params = new URLSearchParams(location.search), shotName = params.get('shot'), selftest = params.has('selftest');
let renderer, sky, post = null, pedT = 0;
window.addEventListener('error', (e) => console.error('CONSOLE_ERROR ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => console.error('CONSOLE_ERROR ' + e.reason));

function hurtPlayer(d) { const p = G.p; if (p.car) { damageCar(p.car, d * 3); return; } const a = Math.min(p.armor, d * 0.7); p.armor -= a; p.hp -= d - a; G.shake = Math.max(G.shake, 0.25); }
function playerDown(kind) {
  if (G.mode !== 'play') return; G.mode = 'dead'; G.deadT = 0; G.deadKind = kind; failMission(kind.toLowerCase()); clearDialogue();
  const fee = Math.min(Math.floor(G.money), Math.max(100, Math.round(G.money * 0.05))); G.fee = fee; releaseLock();
  showDead(kind, kind === 'CUFFED' ? `The SBPD took $${fee} and your freedom for a night.` : `Hospital bills: $${fee}. Nico wakes up in Crown Medical.`);
}
function respawn() {
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
function startGame(load) {
  initAudio(); resetWorld(); if (load) { const s = readSave(); if (s) applySave(s); }
  G.mode = 'play'; rig.mode = 'auto'; hideScreens(); showHud(true); requestLock(); refreshStartMarker();
  say([{ who: 'dex', text: load ? 'Back in the Bay, Nico? Gold marker, Club Velvet. Let us get to work.' : 'Welcome to Solvane Bay, Nico. Walk into the gold marker outside Club Velvet and we will talk work.' }]);
}
function toTitle() { G.mode = 'title'; rig.mode = 'aerial'; showHud(false); showScreen('title'); releaseLock(); G.mission = null; clearDialogue(); }
function pause(on) { if (on && G.mode === 'play') { G.mode = 'pause'; showScreen('pause'); releaseLock(); sfx.engine(false, 0, 0); } else if (!on && (G.mode === 'pause')) { G.mode = 'play'; hideScreens(); requestLock(); } }
const handlers = {
  new: () => startGame(false), continue: () => startGame(true), controls: () => { G.prevScreen = G.mode; showScreen('controls'); }, settings: () => showScreen('settings'),
  back: () => showScreen(G.mode === 'title' ? 'title' : 'pause'), resume: () => pause(false), map: () => showScreen('cityMap'), save: () => { saveGame(); notify('GAME SAVED', 'good'); pause(false); },
  quit: () => toTitle(), closeShop: () => { G.mode = 'play'; hideScreens(); requestLock(); },
};

window.addEventListener('slot', (e) => { if (e.detail === 'save') { saveGame(); notify('GAME SAVED', 'good'); drawCityMap(); } else if (e.detail === 'load' && readSave()) startGame(true); });

export function stepGame(dt) {
  const p = G.p; G.time += dt;
  if (G.mode === 'play') {
    G.clock = (G.clock + dt / 60) % 24; updatePlayer(dt); updateDialogue(dt);
  }
  if (G.mode === 'play' || G.mode === 'title' || G.mode === 'dead') {
    updateTraffic(dt); for (const c of G.cars.slice()) if (c.kind !== 'traffic' && c.kind !== 'target') stepCar(c, dt); carCollisions(); updateActors(dt);
    pedT -= dt; if (pedT < 0) { pedT = 1; maintainPeds(); }
  }
  if (G.mode === 'play') {
    const cd = updatePolice(dt); updateWanted(dt, cd); updateHeli(dt); updateMarkers(dt); updateMission(dt); updateSide(dt);
    if (p.hp <= 0) playerDown('FLATLINED');
    const c = p.car; sfx.engine(!!c && !c.dead, c ? c.speed : 0, c ? c.input.throttle : 0);
    let near = 999; for (const k of G.cars) if (k.kind === 'cop' && !k.dead) near = Math.min(near, Math.hypot(k.x - p.x, k.z - p.z)); sfx.siren(G.wanted.stars > 0 ? Math.max(0, 1 - near / 120) : 0);
    updateRadio();
  } else sfx.engine(false, 0, 0);
  if (G.mode === 'dead') { G.deadT += dt; if (G.deadT > 3.6) respawn(); }
  updateEffects(dt); updateSirens(G.time); animateSea(G.time);
}
function keys() {
  if (pressed('Escape')) { if (G.mode === 'play') pause(true); else if (G.mode === 'pause') { if (!document.getElementById('cityMap').classList.contains('hidden') || !document.getElementById('pause').classList.contains('hidden')) pause(false); else showScreen('pause'); } }
  if (pressed('KeyM') && (G.mode === 'play')) { G.mode = 'pause'; showScreen('cityMap'); releaseLock(); } else if (pressed('KeyM') && G.mode === 'pause' && !document.getElementById('cityMap').classList.contains('hidden')) pause(false);
  if (pressed('KeyR') && G.mode === 'play') { cycleRadio(); sfx.click(); }
  if (G.mode === 'play' && !input.locked && input.leftPressed && document.getElementById('dialog').classList.contains('hidden')) requestLock();
}
export function renderFrame(snap) {
  const focus = G.p; if (G.mode === 'title' && G.titleCam) Object.assign(rig.aerial, G.titleCam); else if (G.mode === 'title') { const o = Math.sin(G.time * 0.05) * 60; Object.assign(rig.aerial, { x: 190 + o, y: 120, z: 390, tx: 150 + o * 0.5, ty: 0, tz: -70 }); }
  updateCamera(0.016, !!snap); sky.update(G.clock, rig.mode === 'aerial' ? { x: 0, z: 0 } : focus, G.camera); draw(); screenFx();
}
// Draw through the bloom/tone-mapping pipeline when enabled; plain renderer output is the fallback.
function draw() {
  if (post && G.settings.post !== false) {
    try { const sp = G.p.car ? Math.abs(G.p.car.speed) : 0; post.params.fringe = G.mode === 'play' ? Math.max(0, Math.min(1, (sp - 22) / 28)) : 0; post.params.exposure = G.exposure || 1.25; post.render(G.scene, G.camera, G.time); return; }
    catch (e) { console.warn('post-processing disabled: ' + e.message); post = null; }
  }
  renderer.setRenderTarget(null); renderer.render(G.scene, G.camera);
}
function screenFx() {
  const sp = G.mode === 'play' && G.p.car ? Math.abs(G.p.car.speed) : 0; speedEl.style.opacity = String(Math.max(0, Math.min(0.85, (sp - 18) / 30)));
  const gl = G.sunScreen; glareEl.style.opacity = gl && G.mode === 'play' ? String(gl.a * (post && G.settings.post !== false ? 0.2 : 1)) : '0'; if (gl) glareEl.firstElementChild.style.transform = `translate(${gl.x}px, ${gl.y}px)`;
}
const speedEl = document.getElementById('speedfx'), glareEl = document.getElementById('glare');
let last = 0;
function frame(t) {
  requestAnimationFrame(frame); const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t; keys(); stepGame(dt);
  if (G.mode === 'title') { G.p.x = 0; G.p.z = 0; }
  updateCamera(dt, false); sky.update(G.clock, rig.mode === 'aerial' ? { x: 0, z: 0 } : G.p, G.camera); draw();
  if (G.mode !== 'title') updateHud(dt); endFrame();
}
async function boot() {
  const canvas = document.getElementById('game'); G.seed = +params.get('seed') || 1; const rng = seedRandom(G.seed);
  renderer = G.renderer = new THREE.WebGLRenderer({ canvas, antialias: !shotName, preserveDrawingBuffer: !!shotName, powerPreference: 'high-performance' }); renderer.setPixelRatio(shotName ? 1 : Math.min(devicePixelRatio, 1.5)); renderer.setSize(shotName ? 1280 : innerWidth, shotName ? 800 : innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  const scene = G.scene = new THREE.Scene(); const camera = G.camera = new THREE.PerspectiveCamera(60, shotName ? 1.6 : innerWidth / innerHeight, 0.5, 1800); scene.add(camera);
  if (!shotName) addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); post?.setSize(renderer.getDrawingBufferSize(new THREE.Vector2()).x, renderer.getDrawingBufferSize(new THREE.Vector2()).y); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  try { post = createPostProcessing(renderer, { samples: 4 }); } catch (e) { console.warn('post-processing unavailable: ' + e.message); post = null; }
  G.settings.post = params.get('post') !== '0';
  initInput(canvas); input.onUnlock = () => { if (G.mode === 'play') pause(true); };
  buildLayout(rng); const tex = { facade: facadeMaps() };
  sky = createSky(scene); buildBeachAndSea(scene, rng); buildRoads(scene); buildCity(scene, tex, rng); buildProps(scene, rng); initEffects(scene);
  createPlayer(); populateParked(40); initSideActivities(); initMenus(handlers);
  for (let k = 0; k < 18; k++) spawnTrafficNear(0, 0, 20, 280); for (let k = 0; k < 22; k++) spawnPedsNear(0, 0, 10, 250);
  const api = { stepGame, renderFrame, startGame, showScreen, showHud, updateHud, handlers };
  if (shotName) { await runShot(shotName, api); return; }
  if (selftest) { await runSelfTest(api); return; }
  toTitle(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error('CONSOLE_ERROR boot ' + (e.stack || e)); document.title = 'BOOT_FAIL ' + e.message; });

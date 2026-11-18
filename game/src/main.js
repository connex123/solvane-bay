// Boot and frame loop for SOLVANE BAY: creates the renderer and city, then each frame runs input, simulation sub-steps and drawing.
import * as THREE from 'three';
import { G } from './core/gameState.js';
import { seedRandom } from './core/random.js';
import { initInput, input, endFrame, clearEdges } from './core/input.js';
import { buildLayout } from './world/cityLayout.js';
import { facadeMaps } from './world/textureFactory.js';
import { createSky } from './world/skyAndLighting.js';
import { buildBeachAndSea } from './world/beachAndSea.js';
import { buildRoads } from './world/roadNetwork.js';
import { buildCity } from './world/buildingFactory.js';
import { buildProps } from './world/propsFactory.js';
import { initEffects } from './combat/visualEffects.js';
import { createPlayer } from './characters/playerController.js';
import { populateParked, spawnTrafficNear } from './vehicles/trafficSystem.js';
import { spawnPedsNear } from './characters/pedestrianSystem.js';
import { initSideActivities } from './missions/sideActivities.js';
import { updateCamera, rig } from './camera/cameraRig.js';
import { updateHud, showHud } from './ui/hud.js';
import { initMenus, showScreen } from './ui/menus.js';
import { runShot, runSelfTest } from './shots/screenshotScenes.js';
import { createPost } from './render/postProcessing.js';
import { installDebugHook, recordFrame } from './core/debugHook.js';
import { createAdaptiveQuality } from './render/adaptiveQuality.js';
import { stepGame } from './core/simulation.js';
import { startGame, toTitle, pause, handlers, menuKeys } from './core/gameFlow.js';

const params = new URLSearchParams(location.search), shotName = params.get('shot'), selftest = params.has('selftest');
let renderer, sky, post = null, quality = null;
function draw() {
  const c = G.p.car, sp = G.mode === 'play' && c ? Math.abs(c.speed) : 0;
  if (quality && G.settings.post !== 'auto' && quality.level > 0) quality.reset();
  if (post) { post.enabled = G.settings.post === 'high' || (G.settings.post === 'auto' && G.autoPost !== false); post.render(G.scene, G.camera, { fringe: Math.max(0, Math.min(1, (sp - 20) / 25)) }); } else renderer.render(G.scene, G.camera);
}
window.addEventListener('error', (e) => console.error('CONSOLE_ERROR ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => console.error('CONSOLE_ERROR ' + e.reason));

export function renderFrame(snap) {
  const focus = G.p; if (G.mode === 'title') { const o = Math.sin(G.time * 0.05) * 60; Object.assign(rig.aerial, { x: 190 + o, y: 120, z: 390, tx: 150 + o * 0.5, ty: 0, tz: -70 }); }
  updateCamera(0.016, !!snap); sky.update(G.clock, rig.mode === 'aerial' ? { x: 0, z: 0 } : focus, G.camera); draw(); screenFx();
}
function screenFx() {
  const sp = G.mode === 'play' && G.p.car ? Math.abs(G.p.car.speed) : 0; speedEl.style.opacity = String(Math.max(0, Math.min(0.85, (sp - 18) / 30)));
  const gl = G.sunScreen; glareEl.style.opacity = gl && G.mode === 'play' ? String(gl.a) : '0'; if (gl) glareEl.firstElementChild.style.transform = `translate(${gl.x}px, ${gl.y}px)`;
}
const speedEl = document.getElementById('speedfx'), glareEl = document.getElementById('glare');
let last = 0;
function frame(t) {
  requestAnimationFrame(frame); const raw = Math.min(0.5, (t - last) / 1000 || 0.016), dt = Math.min(0.05, raw); const last0 = last; last = t; recordFrame(t); quality?.update((t - last0) / 1000 || 0.016); menuKeys();
  // fixed sub-steps keep the simulation real-time when frames are slow; key/click edges fire on the first sub-step only
  for (let rem = raw; rem > 1e-4; rem -= 0.05) { stepGame(Math.min(0.05, rem)); clearEdges(); }
  if (G.mode === 'title') { G.p.x = 0; G.p.z = 0; }
  updateCamera(dt, false); sky.update(G.clock, rig.mode === 'aerial' ? { x: 0, z: 0 } : G.p, G.camera); draw();
  if (G.mode !== 'title') updateHud(dt); endFrame();
}
async function boot() {
  const canvas = document.getElementById('game'); G.seed = +params.get('seed') || 1; const rng = seedRandom(G.seed);
  renderer = G.renderer = new THREE.WebGLRenderer({ canvas, antialias: !shotName, preserveDrawingBuffer: !!shotName, powerPreference: 'high-performance' }); renderer.setPixelRatio(shotName ? 1 : Math.min(devicePixelRatio, 1.5)); renderer.setSize(shotName ? 1280 : innerWidth, shotName ? 800 : innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  try { post = G.post = createPost(renderer, { samples: 4 }); } catch (e) { console.warn('post-processing unavailable: ' + e.message); post = null; }
  const scene = G.scene = new THREE.Scene(); const camera = G.camera = new THREE.PerspectiveCamera(60, shotName ? 1.6 : innerWidth / innerHeight, 0.5, 1800); scene.add(camera);
  if (!shotName) addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); post?.setSize(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  initInput(canvas); input.onUnlock = () => { if (G.mode === 'play') pause(true); };
  buildLayout(rng); const tex = { facade: facadeMaps() };
  sky = createSky(scene); buildBeachAndSea(scene, rng); buildRoads(scene); buildCity(scene, tex, rng); buildProps(scene, rng); initEffects(scene);
  createPlayer(); populateParked(40); initSideActivities(); initMenus(handlers);
  for (let k = 0; k < 18; k++) spawnTrafficNear(0, 0, 20, 280); for (let k = 0; k < 22; k++) spawnPedsNear(0, 0, 10, 250);
  const api = { stepGame, renderFrame, startGame, showScreen, showHud, updateHud, handlers };
  if (shotName) { await runShot(shotName, api); return; }
  if (selftest) { await runSelfTest(api); return; }
  quality = createAdaptiveQuality(renderer, post, sky.sun); installDebugHook(); toTitle(); requestAnimationFrame(frame);
}
boot().catch((e) => { console.error('CONSOLE_ERROR boot ' + (e.stack || e)); document.title = 'BOOT_FAIL ' + e.message; });

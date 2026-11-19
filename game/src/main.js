// Boot for SOLVANE BAY: renderer and scene, city build, systems and menus, then the title screen and frame loop
// (or a staged screenshot / self-test when ?shot= or ?selftest is set).
import * as THREE from 'three';
import { G } from './core/gameState.js';
import { seedRandom } from './core/random.js';
import { initInput } from './core/input.js';
import { buildLayout } from './world/cityLayout.js';
import { facadeMaps } from './world/textureFactory.js';
import { createSky } from './world/skyAndLighting.js';
import { buildBeachAndSea } from './world/beachAndSea.js';
import { buildRoads } from './world/roadNetwork.js';
import { buildCity } from './world/buildingFactory.js';
import { buildProps } from './world/propsFactory.js';
import { initEffects } from './combat/effects.js';
import { createPlayer } from './characters/playerController.js';
import { populateParked, spawnTrafficNear } from './vehicles/trafficSystem.js';
import { spawnPedsNear } from './characters/pedestrianSystem.js';
import { initSideActivities } from './missions/sideActivities.js';
import { initGarage } from './shop/garageShop.js';
import { updateHud, showHud } from './ui/hud.js';
import { initMenus, showScreen } from './ui/menus.js';
import { createPostProcessing } from './render/postProcessing.js';
import { renderFrame } from './render/frameRenderer.js';
import { setQuality, calibrateQuality } from './render/qualityGovernor.js';
import { stepGame } from './core/simulation.js';
import { handlers, startGame, toTitle } from './core/gameFlow.js';
import { startLoop } from './core/gameLoop.js';
import { exposeDebugState } from './core/debugState.js';
import { runShot } from './shots/screenshotScenes.js';
import { runSelfTest } from './shots/selfTest.js';
import { initMolotovGlow } from './combat/molotov.js';
import { buildLandmarks } from './world/landmarks.js';
import { buildBeachLife } from './world/beachLife.js';
import { initMotoTaxis } from './vehicles/motoTaxis.js';
import { warmUpShaders } from './render/shaderWarmup.js';

const params = new URLSearchParams(location.search), shotName = params.get('shot'), selftest = params.has('selftest');
window.addEventListener('error', (e) => console.error('CONSOLE_ERROR ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', (e) => console.error('CONSOLE_ERROR ' + e.reason));

async function boot() {
  const canvas = document.getElementById('game'); G.seed = +params.get('seed') || 1; const rng = seedRandom(G.seed);
  const renderer = G.renderer = new THREE.WebGLRenderer({ canvas, antialias: !shotName, preserveDrawingBuffer: !!shotName, powerPreference: 'high-performance' }); renderer.setPixelRatio(shotName ? 1 : Math.min(devicePixelRatio, 1.5)); renderer.setSize(shotName ? 1280 : innerWidth, shotName ? 800 : innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  const scene = G.scene = new THREE.Scene(); const camera = G.camera = new THREE.PerspectiveCamera(60, shotName ? 1.6 : innerWidth / innerHeight, 0.5, 1800); scene.add(camera);
  if (!shotName) addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); const sz = renderer.getDrawingBufferSize(new THREE.Vector2()); G.post?.setSize(sz.x, sz.y); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  try { G.post = createPostProcessing(renderer, { samples: 4 }); } catch (e) { console.warn('post-processing unavailable: ' + e.message); G.post = null; }
  G.settings.post = params.get('post') !== '0';
  initInput(canvas);
  buildLayout(rng); const tex = { facade: facadeMaps() };
  G.sky = createSky(scene); buildBeachAndSea(scene, rng); buildRoads(scene); buildCity(scene, tex, rng); buildProps(scene, rng); buildLandmarks(scene, rng); buildBeachLife(scene, rng); initMotoTaxis(scene); initEffects(scene); initMolotovGlow(scene);
  createPlayer(); populateParked(40); initSideActivities(); initGarage(); initMenus(handlers);
  for (let k = 0; k < 18; k++) spawnTrafficNear(0, 0, 20, 280); for (let k = 0; k < 22; k++) spawnPedsNear(0, 0, 10, 250);
  const api = { stepGame, renderFrame, startGame, showScreen, showHud, updateHud, handlers };
  if (shotName) { await runShot(shotName, api); return; }
  if (selftest) { await runSelfTest(api); return; }
  if (params.get('post') !== '0') setQuality('auto');
  try { warmUpShaders(renderer, scene, camera, G.post); } catch (e) { console.warn('shader warm-up skipped: ' + e.message); }
  toTitle(); calibrateQuality(() => renderFrame(true));
  exposeDebugState(); startLoop();
}
boot().catch((e) => { console.error('CONSOLE_ERROR boot ' + (e.stack || e)); document.title = 'BOOT_FAIL ' + e.message; });

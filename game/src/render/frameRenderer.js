// Draws one frame: moves the camera, updates sky and sun, renders through the bloom + grade chain (or straight
// to the screen if that chain fails), then sets the speed-line and sun-glare overlays.
import { G } from '../core/gameState.js';
import { updateCamera, rig } from '../camera/cameraRig.js';
import { updateLandmarks } from '../world/landmarks.js';
import { currentGrade } from './colourScript.js';

const speedLines = document.getElementById('speedfx');
const glare = document.getElementById('glare');

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const usingPost = () => Boolean(G.post) && G.settings.post !== false;
const playerCar = () => G.p.car;

// The title screen drifts slowly over the bay unless a staged title camera is set.
function aimTitleCamera() {
  if (G.mode !== 'title') return;
  if (G.titleCam) {
    Object.assign(rig.aerial, G.titleCam);
    return;
  }
  const drift = Math.sin(G.time * 0.05) * 60;
  Object.assign(rig.aerial, { x: 190 + drift, y: 120, z: 390, tx: 150 + drift * 0.5, ty: 0, tz: -70 });
}

// Edge streak strength: builds above ~90 km/h, plus a kick on nitro. Staged shots use it too (it is the real look).
function streakAmount() {
  const car = G.mode === 'play' ? playerCar() : null;
  if (!car) return 0;
  const fromSpeed = clamp01((Math.abs(car.speed) - 24) / 26) * 0.75;
  return Math.min(1, fromSpeed + (car.boosting ? 0.35 : 0));
}

function feedPost() {
  const params = G.post.params;
  const speed = playerCar() ? Math.abs(playerCar().speed) : 0;
  params.fringe = G.mode === 'play' && !G.shotCrisp ? clamp01((speed - 22) / 28) : 0;
  params.radial = streakAmount() * (G.shotCrisp ? 0.3 : 1);
  params.exposure = G.exposure || 1.25;
  params.magic = G.magic || 0;
  params.grade = currentGrade();
}

function drawScene() {
  if (usingPost()) {
    try {
      feedPost();
      G.post.render(G.scene, G.camera, G.time);
      return;
    } catch (err) {
      console.warn('post-processing disabled: ' + err.message);
      G.post = null;
    }
  }
  G.renderer.setRenderTarget(null);
  G.renderer.render(G.scene, G.camera);
}

function updateOverlays() {
  const car = G.mode === 'play' ? playerCar() : null;
  const speed = car ? Math.abs(car.speed) : 0;
  // speed lines at the frame edges
  const lines = Math.max(0, Math.min(0.85, (speed - 18) / 30) * (G.shotCrisp ? 0.25 : 1));
  speedLines.style.opacity = String(lines);

  const sun = G.sunScreen;
  if (sun && G.mode === 'play') {
    glare.style.opacity = String(sun.a * (usingPost() ? 0.2 : 1) * (G.shotCrisp ? 0.4 : 1));
  } else {
    glare.style.opacity = '0';
  }
  if (sun) glare.firstElementChild.style.transform = `translate(${sun.x}px, ${sun.y}px)`;
}

// Where the sky's sun and shadow camera centre: the title camera, the map centre in aerial view, else the player.
function skyFocus() {
  if (G.mode === 'title' && G.titleCam) return { x: G.titleCam.x, z: G.titleCam.z - 30 };
  if (rig.mode === 'aerial') return { x: 0, z: 0 };
  return G.p;
}

/** snap: put the camera straight on its target (staged shots); dt drives the camera smoothing. */
export function renderFrame(snap, dt = 0.016) {
  aimTitleCamera();
  updateCamera(dt, Boolean(snap));
  G.sky.update(G.clock, skyFocus(), G.camera);
  updateLandmarks(G.clock, G.time);
  drawScene();
  updateOverlays();
}

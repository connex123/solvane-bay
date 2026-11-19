// Renders one frame: camera update, sky/sun, the bloom + grade pipeline (plain renderer as fallback) and the speed/glare overlays.
import { G } from '../core/gameState.js';
import { updateCamera, rig } from '../camera/cameraRig.js';
import { updateLandmarks } from '../world/landmarks.js';
import { currentGrade } from './colourScript.js';

const speedEl = document.getElementById('speedfx'), glareEl = document.getElementById('glare');
const postOn = () => G.post && G.settings.post !== false;
function titleCamera() {
  if (G.mode !== 'title') return;
  if (G.titleCam) Object.assign(rig.aerial, G.titleCam);
  else { const o = Math.sin(G.time * 0.05) * 60; Object.assign(rig.aerial, { x: 190 + o, y: 120, z: 390, tx: 150 + o * 0.5, ty: 0, tz: -70 }); }
}
function draw() {
  if (postOn()) {
    try { const sp = G.p.car ? Math.abs(G.p.car.speed) : 0; G.post.params.fringe = G.mode === 'play' && !G.shotCrisp ? Math.max(0, Math.min(1, (sp - 22) / 28)) : 0; G.post.params.exposure = G.exposure || 1.25; G.post.params.magic = G.magic || 0; G.post.params.grade = currentGrade(); G.post.render(G.scene, G.camera, G.time); return; }
    catch (e) { console.warn('post-processing disabled: ' + e.message); G.post = null; }
  }
  G.renderer.setRenderTarget(null); G.renderer.render(G.scene, G.camera);
}
function screenFx() {
  const sp = G.mode === 'play' && G.p.car ? Math.abs(G.p.car.speed) : 0; speedEl.style.opacity = String(Math.max(0, Math.min(G.shotCrisp ? 0.12 : 0.85, (sp - 18) / 30))); // staged shots keep the frame edges crisp
  const gl = G.sunScreen; glareEl.style.opacity = gl && G.mode === 'play' ? String(gl.a * (postOn() ? 0.2 : 1) * (G.shotCrisp ? 0.4 : 1)) : '0'; if (gl) glareEl.firstElementChild.style.transform = `translate(${gl.x}px, ${gl.y}px)`;
}
// snap: jump the camera straight to its target (staged shots); dt drives camera smoothing.
export function renderFrame(snap, dt = 0.016) {
  titleCamera(); updateCamera(dt, !!snap); G.sky.update(G.clock, G.mode === 'title' && G.titleCam ? { x: G.titleCam.x, z: G.titleCam.z - 30 } : rig.mode === 'aerial' ? { x: 0, z: 0 } : G.p, G.camera); updateLandmarks(G.clock, G.time); draw(); screenFx();
}

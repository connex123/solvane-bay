// Staged screenshot scenes for ?shot=<name>: each one builds a moment of the real game (world, entities, HUD, menus)
// deterministically from a seed, renders it, and hands the frame to the capture tool (tools/take-screenshots.mjs).
import { G } from '../core/gameState.js';
import { coverChase } from './coverChaseScene.js';
import { streetFight } from './streetFightScene.js';
import { mapProgress } from './mapProgressScene.js';
import { marinaChase } from './marinaChaseScene.js';

export const SHOT_SCENES = { '1-cover': coverChase, '2-fight': streetFight, '3-map': mapProgress, '4-marina': marinaChase };
// Run the named scene, then freeze the rendered canvas as an image under the HUD so the capture sees exactly that frame.
export async function runShot(name, api) {
  G.shot = name; (SHOT_SCENES[name] || coverChase)(api);
  const c = G.renderer.domElement, img = new Image(); img.id = 'shotImg'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:0';
  img.src = c.toDataURL('image/jpeg', 0.93); await img.decode(); c.style.display = 'none'; document.body.insertBefore(img, document.getElementById('hud'));
  document.title = 'SHOT_READY';
}

// Keeps busy streets cheap to draw: a few times a second, people and vehicles far from the camera are hidden (they are
// a few pixels tall there and fog covers them) and only those near the camera cast shadows, so the extra traffic and
// crowds cost draw calls only where they can be seen. Distances shrink on the lower quality tiers.
import { G } from '../core/gameState.js';

const TIER = { High: 1, Medium: 0.9, Low: 0.75, Lowest: 0.65, Minimal: 0.55 };
const PEOPLE = { show: 115, shadow: 42 }, VEHICLES = { show: 170, shadow: 70 };
let t = 0;
function apply(obj, d, lim, k) {
  const show = d < lim.show * k, shadow = show && d < lim.shadow * k, m = obj.mesh, u = m.userData;
  if (m.visible !== show) m.visible = show;
  if (u.shadowOn !== shadow) { u.shadowOn = shadow; m.traverse((o) => { if (o.isMesh && o.material && !o.material.transparent) o.castShadow = shadow; }); }
}
export function updateDistanceCulling(dt) {
  t -= dt; if (t > 0 || !G.camera || G.shot) return; t = 0.3;
  const c = G.camera.position, k = TIER[G.quality] ?? 1, p = G.p;
  for (const a of G.actors) apply(a, Math.hypot(a.x - c.x, a.z - c.z), PEOPLE, k);
  for (const v of G.cars) if (v !== p.car && v.mesh) apply(v, Math.hypot(v.x - c.x, v.z - c.z), VEHICLES, k);
}

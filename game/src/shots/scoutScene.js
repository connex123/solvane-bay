// TEMPORARY location scouting: ?shot=scout&cam=x,y,z&look=x,y,z&clock=h
import { G } from '../core/gameState.js';
import { setScene, frame, renderShot } from './sceneStaging.js';
export function scout(api) {
  const q = new URLSearchParams(location.search), v = (k, d) => (q.get(k) || d).split(',').map(Number);
  setScene({ clock: +(q.get('clock') || 15), money: 1000, xp: 100, completed: [], magic: +(q.get('magic') || 0.4), blaze: +(q.get('blaze') || 0.35) });
  const [x, y, z] = v('cam', '0,10,0'); G.p.x = x; G.p.z = z; frame([x, y, z], v('look', '0,0,-50'), +(q.get('fov') || 60)); document.getElementById('hud').style.display = 'none'; renderShot(api);
}

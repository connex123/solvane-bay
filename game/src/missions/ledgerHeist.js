// Chapter 7 set piece, THE LEDGER: the speedboat at pier nine, and the run past the Causeway to the Point Wren light
// with SBPD harbour launches on Nico's wake. Stage hooks (begin / tick / end) used by storyMissions.js.
import { G, notify } from '../core/gameState.js';
import { addMarker, removeMarker } from './markers.js';
import { createBoat, removeBoat, BOAT_TYPES } from '../vehicles/boats.js';
import { SPEEDBOAT_BERTH, YACHT } from '../world/marina.js';
import { setStars } from '../police/wantedSystem.js';
import { SEA_X } from '../core/config.js';
import { say } from '../story/dialogue.js';

// the Skipjack moored at pier nine (made once, reused)
export function mooredSpeedboat() {
  const b = G.boats.find((q) => q.key === 'skipjack' && !q.dead);
  if (b) return b; const { x, z, h } = SPEEDBOAT_BERTH; return createBoat('skipjack', x, z, h);
}
export const boardSpeedboat = {
  begin(M) { M.boat = mooredSpeedboat(); M.boat.hp = M.boat.maxHp; M.boatMarker = addMarker({ follow: M.boat, x: M.boat.x, z: M.boat.z, color: 0xff3a5c, r: 0, label: 'BOAT' }); notify('ALARM ON THE CROWN JEWEL', 'bad'); },
  tick(M) { if (M.boat.dead) return 'the speedboat went down'; return G.p.car === M.boat; },
  end(M) { removeMarker(M.boatMarker); M.boatMarker = null; },
};
export const boatEscape = {
  begin(M) {
    M.launches = [[SEA_X + 64, YACHT.z - 70], [SEA_X + 120, YACHT.z - 20]].map(([x, z]) => { const b = createBoat('patrol', x, z, Math.PI * 0.9, 'ai'); b.driver = 'ai'; return b; });
    say([{ who: 'sol', text: 'Harbour launches off your stern! Hug the Causeway pylons, they turn like bathtubs.' }]);
  },
  tick(M) { if (!M.boat || M.boat.dead) return 'the speedboat went down'; return false; },
  end(M, failed) {
    for (const b of M.launches || []) if (G.boats.includes(b) && !b.dead) removeBoat(b); M.launches = [];
    if (!failed) { setStars(0); notify('LEDGER DELIVERED', 'good'); }
  },
};
export const BOAT_NAME = BOAT_TYPES.skipjack.name;

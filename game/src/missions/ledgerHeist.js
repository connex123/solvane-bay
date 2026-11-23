// Chapter 7 set piece, THE LEDGER: take the speedboat from pier nine and run it past the Causeway to the Point
// Wren light with SBPD harbour launches on Nico's wake. storyMissions.js drives these stage hooks (begin / tick / end).
import { G, notify } from '../core/gameState.js';
import { addMarker, removeMarker } from './markers.js';
import { createBoat, removeBoat, BOAT_TYPES } from '../vehicles/boats.js';
import { SPEEDBOAT_BERTH, YACHT } from '../world/marina.js';
import { setStars } from '../police/wantedSystem.js';
import { SEA_X } from '../core/config.js';
import { say } from '../story/dialogue.js';

const SUNK = 'the speedboat went down';
// where the two harbour launches start, relative to the marina
const LAUNCH_STARTS = [[SEA_X + 64, YACHT.z - 70], [SEA_X + 120, YACHT.z - 20]];

/** The Skipjack at pier nine: the existing one if it is still afloat, otherwise a fresh one at its berth. */
export function mooredSpeedboat() {
  const afloat = G.boats.find((boat) => boat.key === 'skipjack' && !boat.dead);
  if (afloat) return afloat;
  return createBoat('skipjack', SPEEDBOAT_BERTH.x, SPEEDBOAT_BERTH.z, SPEEDBOAT_BERTH.h);
}

export const boardSpeedboat = {
  begin(M) {
    M.boat = mooredSpeedboat();
    M.boat.hp = M.boat.maxHp;
    M.boatMarker = addMarker({ follow: M.boat, x: M.boat.x, z: M.boat.z, color: 0xff3a5c, r: 0, label: 'BOAT' });
    notify('ALARM ON THE CROWN JEWEL', 'bad');
  },
  tick(M) {
    if (M.boat.dead) return SUNK;
    return G.p.car === M.boat;
  },
  end(M) {
    removeMarker(M.boatMarker);
    M.boatMarker = null;
  },
};

export const boatEscape = {
  begin(M) {
    M.launches = LAUNCH_STARTS.map(([x, z]) => {
      const launch = createBoat('patrol', x, z, Math.PI * 0.9, 'ai');
      launch.driver = 'ai';
      return launch;
    });
    say([{ who: 'sol', text: 'Harbour launches off your stern! Hug the Causeway pylons, they turn like bathtubs.' }]);
  },
  tick(M) {
    return !M.boat || M.boat.dead ? SUNK : false;
  },
  end(M, failed) {
    for (const launch of M.launches || []) {
      if (G.boats.includes(launch) && !launch.dead) removeBoat(launch);
    }
    M.launches = [];
    if (failed) return;
    setStars(0);
    notify('LEDGER DELIVERED', 'good');
  },
};

export const BOAT_NAME = BOAT_TYPES.skipjack.name;

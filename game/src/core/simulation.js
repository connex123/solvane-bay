// One fixed simulation step of the world: player, traffic, pedestrians, police, wanted level, missions, effects and audio.
import { G } from './gameState.js';
import { updateEffects, updateSirens } from '../combat/effects.js';
import { updatePlayer } from '../characters/playerController.js';
import { stepCar, carCollisions } from '../vehicles/carPhysics.js';
import { updateTraffic } from '../vehicles/trafficSystem.js';
import { updateActors, maintainPeds } from '../characters/pedestrianSystem.js';
import { updateWanted } from '../police/wantedSystem.js';
import { updatePolice } from '../police/policeDispatch.js';
import { updateHeli } from '../police/helicopterUnit.js';
import { updateLineOfSight } from '../police/lineOfSight.js';
import { updateSpikes } from '../police/spikeStrip.js';
import { tickPopups } from '../vehicles/driftScoring.js';
import { updateMarkers } from '../missions/markers.js';
import { updateMission } from '../missions/missionRunner.js';
import { updateSide } from '../missions/sideActivities.js';
import { updateDialogue } from '../story/dialogue.js';
import { sfx } from '../audio/soundEngine.js';
import { updateRadio } from '../audio/radioStations.js';
import { animateSea } from '../world/beachAndSea.js';
import { respawn } from './gameFlow.js';
import { updateCrew } from '../crew/crewAbilities.js';

let pedT = 0;
export function stepGame(dt) {
  const p = G.p; G.time += dt;
  if (G.mode === 'play') { G.clock = (G.clock + dt / 60) % 24; updatePlayer(dt); updateDialogue(dt); }
  if (G.mode === 'play' || G.mode === 'title' || G.mode === 'dead') {
    updateTraffic(dt); for (const c of G.cars.slice()) if (c.kind !== 'traffic' && c.kind !== 'target') stepCar(c, dt); carCollisions(); updateActors(dt);
    pedT -= dt; if (pedT < 0) { pedT = 1; maintainPeds(); }
  }
  if (G.mode === 'play') {
    const cd = updatePolice(dt); updateWanted(dt, cd, updateLineOfSight(dt)); tickPopups(dt); updateHeli(dt); updateSpikes(dt); updateMarkers(dt); updateMission(dt); updateSide(dt); updateCrew(dt);
    if (p.hp <= 0) G.hooks.playerDown('FLATLINED');
    const c = p.car; sfx.engine(!!c && !c.dead, c ? c.speed : 0, c ? c.input.throttle : 0);
    let near = 999; for (const k of G.cars) if (k.kind === 'cop' && !k.dead) near = Math.min(near, Math.hypot(k.x - p.x, k.z - p.z)); sfx.siren(G.wanted.stars > 0 ? Math.max(0, 1 - near / 120) : 0);
    updateRadio();
  } else sfx.engine(false, 0, 0);
  if (G.mode === 'dead') { G.deadT += dt; if (G.deadT > 3.6) respawn(); }
  updateEffects(dt); updateSirens(G.time); animateSea(G.time);
}

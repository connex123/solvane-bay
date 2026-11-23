// Shared movement for two-wheelers (moto-taxis, delivery scooters): each rides straight down an avenue in the
// right-hand lane, weaving and leaning, faster than the cars; it is placed again near the player once it leaves the
// city or falls far behind. A rider may also pull in to the kerb for a while (a drop-off) when its fleet asks it to.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { HALF, LANE, lineCoord } from '../core/config.js';
import { randomRoadPoint } from '../world/cityLayout.js';
import { rnd } from '../core/random.js';

// A fleet of `count` riders built from geometry(i), with a speed range and an optional kerbside stop rule.
export function createRiderFleet(scene, count, geometry, { speed = [13, 19], weave = 1.1, stopEvery = 0, stopFor = 4 } = {}) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true }), list = [];
  const place = (b, near) => {
    const pt = randomRoadPoint(rnd, near.x, near.z, 40, 150); b.axis = pt.axis; b.line = pt.line; b.t = pt.axis === 'x' ? pt.x : pt.z;
    b.dir = rnd() < 0.5 ? 1 : -1; b.speed = speed[0] + rnd() * (speed[1] - speed[0]); b.phase = rnd() * 6; b.lane = LANE * (0.45 + rnd() * 0.9); b.run = 0; b.stop = 0; b.kerb = 0;
  };
  for (let i = 0; i < count; i++) { const m = new THREE.Mesh(geometry(i), mat); m.castShadow = true; scene.add(m); const b = { mesh: m }; place(b, { x: 0, z: 0 }); list.push(b); }
  const update = (dt) => {
    const p = G.p;
    for (const b of list) {
      if (stopEvery) { b.run += b.speed * dt; if (b.stop > 0) b.stop -= dt; else if (b.run > stopEvery) { b.run = -rnd() * stopEvery * 0.5; b.stop = stopFor; } }
      const parked = b.stop > 0; b.kerb += ((parked ? 1 : 0) - b.kerb) * Math.min(1, dt * 2);
      b.t += b.dir * b.speed * dt * (1 - b.kerb); b.phase += dt * 1.3 * (1 - b.kerb);
      if (Math.abs(b.t) > HALF + 10 || (dt > 0 && Math.hypot((b.axis === 'x' ? b.t : lineCoord(b.line)) - p.x, (b.axis === 'x' ? lineCoord(b.line) : b.t) - p.z) > 220)) place(b, p);
      const weave_ = Math.sin(b.phase) * weave * (1 - b.kerb), off = b.lane + weave_ + b.kerb * (LANE * 2 - 0.9 - b.lane), cross = lineCoord(b.line) + (b.axis === 'x' ? b.dir : -b.dir) * off;
      const x = b.axis === 'x' ? b.t : cross, z = b.axis === 'x' ? cross : b.t, lean = Math.cos(b.phase) * (1 - b.kerb);
      b.mesh.position.set(x, 0.3, z); b.mesh.rotation.set(0, (b.axis === 'x' ? b.dir * Math.PI / 2 : b.dir > 0 ? 0 : Math.PI) - lean * 0.18 * b.dir, lean * 0.16 * (b.axis === 'x' ? 1 : -1));
    }
  };
  // Staged scenes put a rider at an exact spot on an avenue.
  const stage = (i, axis, line, t, dir, lane = LANE, phase = 0) => { Object.assign(list[i], { axis, line, t, dir, lane, phase, stop: 0, kerb: 0 }); update(0); };
  return { list, update, stage };
}

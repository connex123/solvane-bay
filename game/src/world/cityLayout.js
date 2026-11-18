// Grid layout of Solvane Bay: which district and block type sits where, and where the roads run.
import { N, S, HALF, lineCoord, DISTRICTS, clamp } from '../core/config.js';
export function districtOfBlock(i, j) {
  if (i >= 3 && i <= 5 && j >= 3 && j <= 5) return 'downtown';
  if (i >= 6 && j <= 3) return 'marina';
  if (j <= 1 && i <= 5) return 'docks';
  if (i >= 1 && i <= 4 && j >= 6) return 'neon';
  if (i >= 6 && j >= 4) return 'beach';
  if (i <= 1 && j >= 2 && j <= 5) return 'hills';
  return 'old';
}
export const blocks = [];
export function buildLayout(rng) {
  blocks.length = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const district = districtOfBlock(i, j);
    let type = 'buildings';
    if (district === 'hills') type = rng() < 0.7 ? 'park' : 'buildings';
    else if (district === 'docks') type = 'yard';
    else if (i === 4 && j === 4) type = 'plaza';
    blocks.push({ i, j, cx: lineCoord(i) + S / 2, cz: lineCoord(j) + S / 2, district, type });
  }
  return blocks;
}
export function districtAt(x, z) {
  if (x > HALF + 52) return 'Open Sea';
  if (x > HALF + 8) return 'Palmetto Beach';
  const i = clamp(Math.floor((x + HALF) / S), 0, N - 1), j = clamp(Math.floor((z + HALF) / S), 0, N - 1);
  return DISTRICTS[districtOfBlock(i, j)].name;
}
export const ix = (i) => lineCoord(i);
export const nearestLine = (v) => clamp(Math.round((v + HALF) / S), 0, N);
export function randomRoadPoint(rng, cx, cz, rMin, rMax) {
  for (let k = 0; k < 20; k++) {
    const a = rng() * Math.PI * 2, r = rng.range(rMin, rMax);
    let x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (Math.abs(x) > HALF || Math.abs(z) > HALF) continue;
    const axis = rng() < 0.5 ? 'x' : 'z';
    if (axis === 'x') z = lineCoord(nearestLine(z)); else x = lineCoord(nearestLine(x));
    return { x, z, axis, line: axis === 'x' ? nearestLine(z) : nearestLine(x) };
  }
  return { x: 0, z: lineCoord(3), axis: 'x', line: 3 };
}

// The city plan: which district each grid block belongs to, what kind of block it is, and helpers for snapping
// points onto the road grid.
import { N, S, HALF, lineCoord, DISTRICTS, clamp } from '../core/config.js';

// District map as rectangles of block columns (cols) and rows, inclusive, checked top to bottom: the first
// rectangle containing a block names its district, and anything left over is Old Town.
const ANY = [-Infinity, Infinity];
const DISTRICT_RECTS = [
  { key: 'downtown', cols: [3, 5], rows: [3, 5] },
  { key: 'marina', cols: [6, Infinity], rows: [-Infinity, 3] },
  { key: 'docks', cols: [-Infinity, 5], rows: [-Infinity, 1] },
  { key: 'neon', cols: [1, 4], rows: [6, Infinity] },
  { key: 'beach', cols: [6, Infinity], rows: [4, Infinity] },
  { key: 'hills', cols: [-Infinity, 1], rows: [2, 5] },
  { key: 'old', cols: ANY, rows: ANY },
];
const within = ([lo, hi], v) => v >= lo && v <= hi;

/** District key for block column i, row j. */
export function districtOfBlock(i, j) {
  return DISTRICT_RECTS.find((rect) => within(rect.cols, i) && within(rect.rows, j)).key;
}

// Hand-placed special blocks: Crown Tower and the Old Town lagoon market are built in world/landmarks.js.
const SPECIAL = { '4,4': 'plaza', '5,3': 'tower', '0,7': 'lagoon' };

export const blocks = [];

function blockType(i, j, district, rng) {
  if (district === 'hills') return rng() < 0.7 ? 'park' : 'buildings'; // one draw per hills block
  if (district === 'docks') return 'yard';
  return SPECIAL[`${i},${j}`] || 'buildings';
}

/** Fill `blocks` row by row from the seeded rng and return it. */
export function buildLayout(rng) {
  blocks.length = 0;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const district = districtOfBlock(i, j);
      const type = blockType(i, j, district, rng);
      blocks.push({ i, j, cx: lineCoord(i) + S / 2, cz: lineCoord(j) + S / 2, district, type });
    }
  }
  return blocks;
}

const blockIndex = (v) => clamp(Math.floor((v + HALF) / S), 0, N - 1);

/** Display name of the area at a world point (the beach and the sea lie east of the grid). */
export function districtAt(x, z) {
  if (x > HALF + 52) return 'Open Sea';
  if (x > HALF + 8) return 'The Strand';
  return DISTRICTS[districtOfBlock(blockIndex(x), blockIndex(z))].name;
}

export const ix = (i) => lineCoord(i);

/** Index of the grid line nearest coordinate v. */
export const nearestLine = (v) => clamp(Math.round((v + HALF) / S), 0, N);

/**
 * A random point on a road between rMin and rMax from (cx, cz), snapped onto the nearest line along a random axis.
 * Gives up after 20 tries and returns a fixed point on line 3.
 */
export function randomRoadPoint(rng, cx, cz, rMin, rMax) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng.range(rMin, rMax);
    let x = cx + Math.cos(angle) * dist;
    let z = cz + Math.sin(angle) * dist;
    if (Math.abs(x) > HALF || Math.abs(z) > HALF) continue;
    const axis = rng() < 0.5 ? 'x' : 'z';
    let line;
    if (axis === 'x') {
      line = nearestLine(z);
      z = lineCoord(line);
    } else {
      line = nearestLine(x);
      x = lineCoord(line);
    }
    return { x, z, axis, line };
  }
  return { x: 0, z: lineCoord(3), axis: 'x', line: 3 };
}

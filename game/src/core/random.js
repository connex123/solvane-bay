// Seedable pseudo-random numbers (the mulberry32 generator), so ?seed= rebuilds the same city and staged scenes.

const GOLDEN_STEP = 0x6d2b79f5;
const TWO_POW_32 = 4294967296;

export function makeRng(seed) {
  let state = seed >>> 0;
  if (!state) state = 1;

  function next() {
    state |= 0;
    state = (state + GOLDEN_STEP) | 0;
    let z = Math.imul(state ^ (state >>> 15), state | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / TWO_POW_32;
  }

  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1));
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  return next;
}

// Live binding: modules that import rnd see the replacement after seedRandom().
export let rnd = makeRng(Date.now());

export function seedRandom(seed) {
  rnd = makeRng(seed);
  return rnd;
}

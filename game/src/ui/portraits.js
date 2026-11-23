// Character portraits painted on a canvas (no image files) for the HUD crew chips, dialogue and Crew & Chapters.
// Everyone shares one lighting setup (warm key light from the upper left, a hard cel shadow on the right cheek and
// a teal rim light) and gets a silhouette of their own: Nico's spiky crop and stubble, Sol's bun, shades and hoop,
// Dex's slick hair and gold chain, Wren's grey beard and cap, Tamsin's headphones and braids, Brandt's silver hair,
// suit and crown pin, Reyne's police cap and moustache, Dispatch's headset.
import { CAST } from '../story/characters.js';

const GOLD = '#ffc93c';
const CORAL = '#ff6f59';
const NAVY = '#1d2b53';
const DEEP_SEA = '#06303a';

// Per-character extras. brow: tilt of the eyebrows (positive reads angrier). mouth: smile | grin | flat | frown | smirk.
const TRAITS = {
  nico: { brow: 0.04, mouth: 'flat', stubble: true },
  sol: { brow: -0.03, mouth: 'grin', hoop: true },
  dex: { brow: 0.02, mouth: 'smirk', chain: true },
  wren: { brow: -0.04, mouth: 'smile', beard: true, cap: '#2f6a74', wrinkles: true },
  tamsin: { brow: 0.03, mouth: 'flat', phones: true, braids: true },
  brandt: { brow: 0.08, mouth: 'smirk', pin: true, suit: true },
  reyne: { brow: 0.1, mouth: 'frown', police: true, tache: true },
  dispatch: { brow: 0, mouth: 'flat', headset: true, police: true },
};

/** Scale a #rrggbb colour's channels by factor k (k < 1 darkens). */
function tint(hex, k) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift) => Math.min(255, Math.max(0, Math.round(((value >> shift) & 255) * k)));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

// Tiny path helpers on a 100 x 100 canvas. A shape is a list of steps: [x, y] is a line, [cx, cy, x, y] a curve.
function trace(g, start, steps, close = false) {
  g.beginPath();
  g.moveTo(start[0], start[1]);
  for (const s of steps) {
    if (s.length === 2) g.lineTo(s[0], s[1]);
    else g.quadraticCurveTo(s[0], s[1], s[2], s[3]);
  }
  if (close) g.closePath();
}
function fillShape(g, colour, start, steps) {
  g.fillStyle = colour;
  trace(g, start, steps, true);
  g.fill();
}
function strokeShape(g, colour, width, start, steps) {
  g.strokeStyle = colour;
  g.lineWidth = width;
  trace(g, start, steps);
  g.stroke();
}
function blob(g, colour, x, y, rx, ry = rx) {
  g.fillStyle = colour;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function paintBackdrop(g, who) {
  const sky = g.createLinearGradient(0, 0, 0, 100);
  sky.addColorStop(0, who.bg[0]);
  sky.addColorStop(1, DEEP_SEA);
  g.fillStyle = sky;
  g.fillRect(0, 0, 100, 100);
  blob(g, 'rgba(255,240,210,0.22)', 74, 22, 22); // low sun behind the shoulder
}

function paintBraids(g, hair) {
  for (const side of [-1, 1]) {
    for (let link = 0; link < 6; link++) blob(g, hair, 50 + side * 21, 46 + link * 8, 5.2, 4.6);
  }
}

function paintTorso(g, who, t) {
  const cloth = t.suit ? '#1a1c24' : t.police ? NAVY : who.shirt;
  fillShape(g, cloth, [4, 100], [[8, 70, 50, 68], [92, 70, 96, 100]]);
  fillShape(g, 'rgba(0,0,0,0.22)', [50, 68], [[90, 70, 96, 100], [70, 100]]); // the shaded side
  if (t.suit) {
    fillShape(g, '#f4f0e8', [41, 69], [[50, 90], [59, 69]]); // shirt front
    fillShape(g, '#b8202c', [48, 72], [[52, 72], [53, 92], [50, 96], [47, 92]]); // tie
  } else {
    const collar = tint(who.shirt.length === 7 ? who.shirt : NAVY, 0.7);
    fillShape(g, collar, [38, 69], [[50, 82], [62, 69], [58, 68], [50, 76], [42, 68]]);
  }
  if (t.police) fillShape(g, GOLD, [24, 80], [[30, 77], [34, 82], [29, 88]]); // badge
  if (t.pin) {
    fillShape(g, GOLD, [26, 82], [[27, 76], [29.5, 79], [31.5, 75], [33.5, 79], [36, 76], [37, 82]]);
    g.strokeStyle = '#5a3a00';
    g.lineWidth = 0.8;
    g.stroke();
  }
  if (t.chain) {
    g.strokeStyle = GOLD;
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(50, 66, 13, 0.35, Math.PI - 0.35);
    g.stroke();
  }
}

function paintHead(g, who, t) {
  g.fillStyle = tint(who.skin, 0.82);
  g.fillRect(43, 54, 14, 16); // neck
  blob(g, who.skin, 29.5, 42, 4, 6);
  blob(g, who.skin, 70.5, 42, 4, 6);
  fillShape(g, who.skin, [30, 34], [[30, 14, 50, 14], [70, 14, 70, 34], [70, 52, 58, 60], [50, 65, 42, 60], [30, 52, 30, 34]]);
  // cel shadow down the right cheek, then the teal rim light along the jaw
  fillShape(g, 'rgba(40,20,10,0.16)', [56, 15], [[70, 16, 70, 34], [70, 52, 58, 60], [52, 63, 49, 63], [62, 48, 56, 15]]);
  strokeShape(g, 'rgba(80,240,220,0.55)', 1.6, [69.5, 26], [[71, 44, 60, 58]]);

  if (t.stubble || t.beard) {
    const chinDrop = t.beard ? 74 : 66;
    fillShape(g, t.beard ? '#d8d8d4' : 'rgba(30,20,15,0.28)', [32, 44],
      [[33, 58, 42, 63], [50, chinDrop, 58, 63], [67, 58, 68, 44], [60, 50, 50, 50], [40, 50, 32, 44]]);
  }
  if (t.wrinkles) {
    for (const y of [22, 25]) strokeShape(g, 'rgba(80,40,20,0.35)', 0.8, [40, y], [[50, y - 1.5, 60, y]]);
  }
}

function paintEyes(g, who, t) {
  if (who.shades) {
    g.fillStyle = '#0c1418';
    g.beginPath();
    g.moveTo(31, 33); g.lineTo(48, 33); g.lineTo(46, 42); g.quadraticCurveTo(38, 44, 33, 41); g.closePath();
    g.moveTo(52, 33); g.lineTo(69, 33); g.lineTo(67, 41); g.quadraticCurveTo(62, 44, 54, 42); g.closePath();
    g.fill();
    g.fillRect(47, 33.5, 6, 1.6); // bridge
    for (const x of [34, 55]) fillShape(g, 'rgba(120,230,220,0.55)', [x, 35], [[x + 6, 35], [x + 2, 39]]); // glints
  } else {
    for (const x of [40, 60]) {
      blob(g, '#fffaf0', x, 37, 5, 3);
      blob(g, '#2a1a10', x + 1, 37, 2.4, 2.6);
      blob(g, '#fff', x + 1.8, 36.2, 0.8);
    }
  }
  const lift = t.brow * 40;
  g.strokeStyle = t.beard ? '#cfcfcf' : tint(who.hair, 0.9);
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(34, 30 - lift); g.lineTo(46, 30 + lift);
  g.moveTo(54, 30 + lift); g.lineTo(66, 30 - lift);
  g.stroke();
}

const MOUTHS = {
  smile: [[43, 54], [[50, 58, 57, 54]]],
  frown: [[43, 56], [[50, 52.5, 57, 56]]],
  smirk: [[43, 55], [[52, 56, 58, 52]]],
  flat: [[44, 55], [[56, 55]]],
};

function paintMouth(g, who, t) {
  strokeShape(g, 'rgba(60,30,15,0.45)', 1.4, [50, 40], [[53, 47, 49, 48.5]]); // nose
  if (t.tache) fillShape(g, who.hair, [42, 52], [[50, 48, 58, 52], [50, 51, 42, 52]]);
  if (t.mouth === 'grin') {
    fillShape(g, '#5a2418', [42, 53], [[50, 60, 58, 53]]);
    g.fillStyle = '#fff';
    g.fillRect(44, 53.2, 12, 1.8); // teeth
    g.strokeStyle = '#5a2418';
    g.lineWidth = 1.8;
    g.stroke();
    return;
  }
  const [start, steps] = MOUTHS[t.mouth] || MOUTHS.flat;
  strokeShape(g, '#5a2418', 1.8, start, steps);
}

const HAIRCUTS = {
  short(g) {
    trace(g, [29, 36], [[26, 12, 48, 11], [72, 10, 71, 34], [66, 24], [60, 27], [55, 21], [48, 26], [42, 21], [35, 27]], true);
    g.fill();
  },
  bun(g) {
    trace(g, [30, 33], [[30, 12, 50, 12], [70, 12, 70, 33], [62, 20, 50, 20], [38, 20, 30, 33]]);
    g.fill();
    blob(g, g.fillStyle, 50, 8, 10, 8);
    g.fillStyle = CORAL;
    g.fillRect(43, 13, 14, 3); // hair tie
  },
  slick(g) {
    trace(g, [29, 34], [[28, 10, 52, 10], [73, 11, 71, 32], [66, 18, 50, 19], [38, 20, 33, 30]], true);
    g.fill();
    for (const y of [14, 17]) strokeShape(g, 'rgba(255,255,255,0.35)', 1, [36, y + 4], [[50, y - 2, 66, y + 3]]);
  },
  long(g) {
    trace(g, [29, 40], [[26, 11, 50, 11], [74, 11, 71, 40], [64, 20, 50, 21], [36, 20, 29, 40]]);
    g.fill();
    for (let x = 36; x < 66; x += 5) strokeShape(g, 'rgba(255,255,255,0.18)', 0.9, [x, 13], [[x - 3, 22]]);
  },
};

function paintHeadwear(g, who, t) {
  g.fillStyle = who.hair;
  if (HAIRCUTS[who.style]) HAIRCUTS[who.style](g);

  if (t.cap) {
    fillShape(g, t.cap, [28, 28], [[30, 8, 50, 8], [70, 8, 72, 28]]);
    fillShape(g, tint(t.cap, 0.7), [26, 28], [[76, 28], [80, 33, 62, 32], [26, 31]]); // peak
    g.fillStyle = CORAL;
    g.fillRect(45, 14, 10, 6); // patch
  }
  if (t.police) {
    fillShape(g, NAVY, [25, 26], [[28, 8, 50, 7], [72, 8, 75, 26]]);
    g.fillStyle = '#0c1430';
    g.fillRect(27, 24, 46, 5); // hat band
    fillShape(g, '#0c1430', [30, 29], [[70, 29], [64, 35, 50, 34], [36, 35, 30, 29]]); // visor
    fillShape(g, GOLD, [50, 11], [[55, 15], [53, 22], [47, 22], [45, 15]]); // cap badge
    g.fillStyle = '#f4f0e8';
    g.fillRect(27, 24, 46, 1.4);
  }
  if (t.phones) {
    g.strokeStyle = '#1c2a30';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(50, 34, 23, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    for (const side of [-1, 1]) {
      blob(g, CORAL, 50 + side * 22, 40, 6, 9);
      blob(g, '#1c2a30', 50 + side * 23.5, 40, 2.4, 5);
    }
  }
  if (t.headset) strokeShape(g, '#222', 1.6, [31, 44], [[36, 56, 44, 55]]);
  if (t.hoop) {
    g.strokeStyle = GOLD;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(29, 50, 3.4, 0, Math.PI * 2);
    g.stroke();
  }
}

/** Paint character `id` (a CAST key; unknown ids fall back to Nico) to fill `canvas`. */
export function drawPortrait(canvas, id) {
  const who = CAST[id] || CAST.nico;
  const traits = TRAITS[id] || TRAITS.nico;
  const g = canvas.getContext('2d');
  g.save();
  g.setTransform(canvas.width / 100, 0, 0, canvas.height / 100, 0, 0);
  g.lineJoin = 'round';
  g.lineCap = 'round';

  paintBackdrop(g, who);
  if (traits.braids) paintBraids(g, who.hair); // behind the shoulders
  paintTorso(g, who, traits);
  paintHead(g, who, traits);
  paintEyes(g, who, traits);
  paintMouth(g, who, traits);
  paintHeadwear(g, who, traits);

  g.strokeStyle = 'rgba(244,232,204,0.9)'; // cream keyline frame
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 97, 97);
  g.restore();
}

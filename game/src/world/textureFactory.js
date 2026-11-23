// All of the game's textures are painted onto canvases at start-up; there are no image files.
import * as THREE from 'three';

/** Paint a w x h canvas with draw(ctx, w, h) and wrap it as an sRGB texture (tiling unless repeat is false). */
export function canvasTex(w, h, draw, repeat = true) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  texture.anisotropy = 4;
  return texture;
}

// Park-Miller "minimal standard" generator: fixed-seed textures look the same on every run.
function lehmer(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

// Sprinkle `count` 2x2 specks, randomly dark or light, with alpha up to maxAlpha.
function speckle(g, w, h, count, maxAlpha) {
  for (let n = 0; n < count; n++) {
    const shade = Math.random() < 0.5 ? '0,0,0' : '255,255,255';
    g.fillStyle = `rgba(${shade},${Math.random() * maxAlpha})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

const FACADE_SIZE = 512;
const STOREY = 128; // px per floor (and per window bay) in the facade tile
// Window rectangle [x, y, w, h] for bay i on floor j of the facade tile.
const facadeWindow = (i, j) => [24 + i * STOREY, 34 + j * STOREY, 80, 74];

function paintFacadeWindow(g, x, y, w, h) {
  g.fillStyle = 'rgba(70,50,40,0.28)';
  g.fillRect(x - 6, y - 6, w + 12, h + 14); // recess shadow
  g.fillStyle = '#ffffff';
  g.fillRect(x - 4, y - 4, w + 8, h + 8); // frame
  const reflection = g.createLinearGradient(x, y, x, y + h); // the sky reflected: blue, then peach at the horizon
  reflection.addColorStop(0, '#3d79b8');
  reflection.addColorStop(0.55, '#8fc3ea');
  reflection.addColorStop(0.62, '#f3c9a0');
  reflection.addColorStop(1, '#5a6c88');
  g.fillStyle = reflection;
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.35)'; // diagonal glint
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x + 26, y);
  g.lineTo(x + 44, y);
  g.lineTo(x + 12, y + h);
  g.fill();
  g.fillStyle = '#ffffff'; // mullion and transom
  g.fillRect(x + w / 2 - 2, y, 4, h);
  g.fillRect(x, y + h * 0.38, w, 3);
  g.fillStyle = '#fffaf0'; // sill and its shadow
  g.fillRect(x - 8, y + h + 4, w + 16, 7);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(x - 8, y + h + 11, w + 16, 3);
}

function paintFacade(g) {
  g.fillStyle = '#fbf8f2';
  g.fillRect(0, 0, FACADE_SIZE, FACADE_SIZE);
  speckle(g, FACADE_SIZE, FACADE_SIZE, 2600, 0.05);
  for (let floor = 0; floor < 4; floor++) {
    const top = floor * STOREY;
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(0, top, FACADE_SIZE, 12); // cornice
    g.fillStyle = 'rgba(60,40,30,0.16)'; // art-deco pin lines
    for (const [dy, thick] of [[12, 3], [118, 2], [123, 2]]) g.fillRect(0, top + dy, FACADE_SIZE, thick);
    for (let bay = 0; bay < 4; bay++) paintFacadeWindow(g, ...facadeWindow(bay, floor));
  }
}

function paintCurtainWall(g, rand) {
  const PANEL = 64;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = col * PANEL, y = row * PANEL;
      const angle = rand(); // each panel catches the sky at its own angle
      const sheen = g.createLinearGradient(x, y, x + PANEL, y + PANEL);
      sheen.addColorStop(0, angle < 0.2 ? '#ffe2c0' : '#bfe0ff');
      sheen.addColorStop(1, angle < 0.6 ? '#4f86c0' : '#79a8d8');
      g.fillStyle = sheen;
      g.fillRect(x, y, PANEL, PANEL);
    }
  }
  const sweep = g.createLinearGradient(0, 0, 512, 512); // a soft diagonal reflection across the whole wall
  sweep.addColorStop(0, 'rgba(255,255,255,0)');
  sweep.addColorStop(0.45, 'rgba(255,240,220,0.35)');
  sweep.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.fillStyle = sweep;
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#eef2f6'; // mullion grid
  for (let k = 0; k <= 8; k++) {
    g.fillRect(k * PANEL - 2, 0, 4, 512);
    g.fillRect(0, k * PANEL - 3, 512, 6);
  }
}

/**
 * Building textures: `map` is a near-white stucco facade (vertex colours tint it pastel) with deco bands and framed
 * windows reflecting the sky; `em` lights some of those windows at night; `glass` is the downtown curtain wall and
 * `glassEm` its lit panels.
 */
export function facadeMaps() {
  const rand = lehmer(7);
  const lit = Array.from({ length: 32 }, () => rand() < 0.4);
  const map = canvasTex(FACADE_SIZE, FACADE_SIZE, paintFacade);
  const em = canvasTex(FACADE_SIZE, FACADE_SIZE, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, FACADE_SIZE, FACADE_SIZE);
    for (let floor = 0; floor < 4; floor++) {
      for (let bay = 0; bay < 4; bay++) {
        if (!lit[floor * 4 + bay]) continue;
        g.fillStyle = rand() < 0.3 ? '#ffb060' : '#ffe6a8'; // amber or warm white
        g.fillRect(...facadeWindow(bay, floor));
      }
    }
  });
  const glass = canvasTex(512, 512, (g) => paintCurtainWall(g, rand));
  const glassEm = canvasTex(512, 512, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (rand() >= 0.3) continue;
        g.fillStyle = rand() < 0.5 ? '#ffd9a0' : '#fff0d0';
        g.fillRect(col * 64 + 3, row * 64 + 4, 58, 56);
      }
    }
  });
  return { map, em, glass, glassEm };
}

/** Road surface across a 512 px lane strip; with `lines`, kerb lines, double yellow centre and dashed lane marks. */
export function asphaltTex(lines = true) {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#6b6c72';
    g.fillRect(0, 0, 512, 512);
    speckle(g, 512, 512, 9000, 0.09);
    g.fillStyle = 'rgba(40,40,46,0.18)'; // patched streaks
    for (let n = 0; n < 6; n++) g.fillRect(Math.random() * 512, 0, 30 + Math.random() * 90, 512);
    g.fillStyle = 'rgba(30,30,36,0.35)'; // tyre-worn lanes
    g.fillRect(0, 150, 512, 34);
    g.fillRect(0, 330, 512, 34);
    if (!lines) return;
    g.fillStyle = '#fbfbf4';
    g.fillRect(0, 26, 512, 6);
    g.fillRect(0, 480, 512, 6);
    g.fillStyle = '#ffd23c';
    g.fillRect(0, 243, 512, 6);
    g.fillRect(0, 263, 512, 6);
    g.fillStyle = '#f4f4ec';
    for (const offset of [0, 256]) {
      g.fillRect(offset + 16, 136, 120, 5);
      g.fillRect(offset + 16, 372, 120, 5);
    }
  });
}

/** Warm paving tiles with slight per-tile variation. */
export function tileTex() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#e9e1d2';
    g.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const v = 222 + Math.floor(Math.random() * 22);
        g.fillStyle = `rgb(${v},${v - 8},${v - 22})`;
        g.fillRect(col * 32 + 1, row * 32 + 1, 30, 30);
      }
    }
    speckle(g, 128, 128, 500, 0.06);
  });
}

/** Billboard art for the city's own made-up brands: gradient sky, a striped sunset, headline, tagline, footer. */
export function adTexture(head, tag, c1, c2) {
  return canvasTex(512, 256, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, c1);
    sky.addColorStop(1, c2);
    g.fillStyle = sky;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = 'rgba(255,240,200,0.9)'; // half sun
    g.beginPath();
    g.arc(400, 150, 70, Math.PI, 0);
    g.fill();
    g.fillStyle = c2; // stripes cut through it
    for (let k = 0; k < 4; k++) g.fillRect(320, 112 + k * 12, 160, 4 + k);

    g.fillStyle = '#ffffff';
    g.textBaseline = 'top';
    g.shadowColor = 'rgba(0,0,0,0.35)';
    g.shadowBlur = 8;
    g.font = 'bold 64px Arial Black, Arial, sans-serif';
    g.fillText(head, 26, 36, 360);
    g.font = 'bold 26px Arial, sans-serif';
    g.fillText(tag, 28, 128, 300);
    g.shadowBlur = 0;

    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.fillRect(0, 214, 512, 42);
    g.fillStyle = c2;
    g.font = 'bold 22px Arial, sans-serif';
    g.fillText('SOLVANE BAY', 28, 224);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 10;
    g.strokeRect(5, 5, 502, 246);
  }, false);
}

export function sandTex() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#e8d4a2';
    g.fillRect(0, 0, 128, 128);
    speckle(g, 128, 128, 1200, 0.12);
  });
}

/** Sea surface: blue with darker swell bands and little white wave crests. */
export function waterTex() {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#2490b4';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(20,90,140,0.25)';
    for (let band = 0; band < 14; band++) g.fillRect(0, band * 19, 256, 8);
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.lineWidth = 2;
    for (let n = 0; n < 40; n++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 10, y - 4, x + 22, y);
      g.stroke();
    }
  });
}

/** Soft round white glow for lamps and sprites. */
export function glowTex() {
  return canvasTex(64, 64, (g) => {
    const falloff = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    falloff.addColorStop(0, 'rgba(255,255,255,1)');
    falloff.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    falloff.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = falloff;
    g.fillRect(0, 0, 64, 64);
  }, false);
}

/** Neon-style sign: glowing border and centred text sized to fit. */
export function signTexture(text, fg, bg = '#150a24', w = 512, h = 160) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.lineWidth = 6;
    g.shadowColor = fg;
    g.shadowBlur = 18;
    g.strokeRect(10, 10, w - 20, h - 20);
    const size = Math.min(80, (w - 60) / (text.length * 0.62));
    g.font = `bold ${size}px Arial Black, Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = fg;
    // drawn twice so the glow builds up
    g.fillText(text, w / 2, h / 2 + 4);
    g.fillText(text, w / 2, h / 2 + 4);
  }, false);
}

/**
 * A billowing puff for fire and smoke: many soft blobs inside a round falloff, lit from the top left so each puff
 * has a bright crown and a shaded underside. Particles tint it.
 */
export function puffTex() {
  return canvasTex(128, 128, (g) => {
    const rand = lehmer(91);
    for (let n = 0; n < 70; n++) {
      const angle = rand() * 6.283;
      const dist = Math.sqrt(rand()) * 34;
      const x = 64 + Math.cos(angle) * dist;
      const y = 64 + Math.sin(angle) * dist;
      const radius = 12 + rand() * 20 * (1 - dist / 60);
      const light = 0.55 + 0.45 * Math.max(0, (64 - y) / 40 + (64 - x) / 80) * rand() + 0.2;
      const v = Math.min(255, Math.round(170 + 85 * light));
      const blobFill = g.createRadialGradient(x - radius * 0.25, y - radius * 0.3, 0, x, y, radius);
      blobFill.addColorStop(0, `rgba(${v},${v},${v},0.55)`);
      blobFill.addColorStop(0.6, `rgba(${v - 40},${v - 40},${v - 40},0.3)`);
      blobFill.addColorStop(1, 'rgba(120,120,120,0)');
      g.fillStyle = blobFill;
      g.beginPath();
      g.arc(x, y, radius, 0, 6.283);
      g.fill();
    }
    // fade alpha to a ragged circle so the square never shows
    const image = g.getImageData(0, 0, 128, 128);
    const px = image.data;
    for (let p = 0; p < 128 * 128; p++) {
      const dx = (p % 128) - 64, dy = (p >> 7) - 64;
      const edge = Math.max(0, 1 - Math.hypot(dx, dy) / 62);
      const a = p * 4 + 3;
      px[a] = Math.min(255, px[a] * 1.6 * Math.min(1, edge * 2.2) * (0.85 + rand() * 0.3));
    }
    g.putImageData(image, 0, 0);
  }, false);
}

/** Scorch decal: a charred centre that fades out in a ragged ring. */
export function scorchTex() {
  return canvasTex(128, 128, (g) => {
    const rand = lehmer(17);
    for (let n = 0; n < 40; n++) {
      const angle = rand() * 6.283;
      const dist = rand() * 30;
      const x = 64 + Math.cos(angle) * dist, y = 64 + Math.sin(angle) * dist;
      const soot = g.createRadialGradient(x, y, 0, x, y, 14 + rand() * 26);
      soot.addColorStop(0, 'rgba(10,8,8,0.35)');
      soot.addColorStop(1, 'rgba(10,8,8,0)');
      g.fillStyle = soot;
      g.fillRect(0, 0, 128, 128);
    }
  }, false);
}

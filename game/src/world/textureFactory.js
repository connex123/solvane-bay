// Every texture in the game is drawn on a canvas at run time (deterministic: a local LCG, never Math.random).
import * as THREE from 'three';
export function canvasTex(w, h, draw, repeat = true, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const noise = (g, w, h, n, a, sz = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * a})`; g.fillRect(r() * w, r() * h, sz, sz); } };
const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };

// Stucco facade tile = 16 m x 16 m: 4 bays x 4 floors. Walls are near-white (tinted pastel per building through the wall mask),
// windows have white frames, sills, shutters on some bays and a sky reflection (azure top -> peach bottom) with a glint.
export function facadeMaps() {
  seed = 7; const W = 512, cell = W / 4, lit = [], kind = [];
  for (let k = 0; k < 16; k++) { lit.push(r() < 0.4); kind.push(r()); }
  const win = (i, j) => [i * cell + cell * 0.24, j * cell + cell * 0.2, cell * 0.52, cell * 0.6];
  const map = canvasTex(W, W, (g) => {
    g.fillStyle = '#fbf7ef'; g.fillRect(0, 0, W, W); noise(g, W, W, 5000, 0.05);
    for (let j = 0; j < 4; j++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, j * cell + cell - 6, W, 6); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, j * cell + cell - 9, W, 3); }
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const [x, y, w, h] = win(i, j), k = kind[j * 4 + i];
      g.fillStyle = 'rgba(60,40,30,0.18)'; g.fillRect(x - 6, y - 6, w + 12, h + 16); // recess shadow
      g.fillStyle = '#ffffff'; g.fillRect(x - 5, y - 5, w + 10, h + 10);
      g.fillStyle = lin(g, x, y, x, y + h, [[0, '#9cc8ea'], [0.55, '#5f8fb8'], [0.8, '#e9b48e'], [1, '#c98a6a']]); g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.32)'; g.beginPath(); g.moveTo(x, y + h * 0.75); g.lineTo(x + w * 0.45, y); g.lineTo(x + w * 0.7, y); g.lineTo(x, y + h); g.fill();
      if (k < 0.35) { g.fillStyle = 'rgba(255,248,235,0.85)'; g.fillRect(x, y, w, h * 0.38); g.fillStyle = 'rgba(0,0,0,0.08)'; for (let f = 0; f < 6; f++) g.fillRect(x + f * w / 6, y, 2, h * 0.38); } // blinds
      g.fillStyle = '#f4f4f4'; g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h * 0.4, w, 3); // mullions
      g.fillStyle = '#ffffff'; g.fillRect(x - 9, y + h + 3, w + 18, 7); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x - 9, y + h + 10, w + 18, 4); // sill
      if (k > 0.7) { for (const sx of [x - 26, x + w + 6]) { g.fillStyle = '#ffffff'; g.fillRect(sx, y - 2, 20, h + 4); g.fillStyle = 'rgba(0,0,0,0.1)'; for (let s = 0; s < 8; s++) g.fillRect(sx + 2, y + s * h / 8 + 4, 16, 2); } } // shutters
    }
  });
  const mask = canvasTex(W, W, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, W);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const [x, y, w, h] = win(i, j); g.fillStyle = '#000'; g.fillRect(x - 5, y - 5, w + 10, h + 10); g.fillRect(x - 9, y + h + 3, w + 18, 7); if (kind[j * 4 + i] > 0.7) { g.fillRect(x - 26, y - 2, 20, h + 4); g.fillRect(x + w + 6, y - 2, 20, h + 4); } }
  }, true, false);
  const em = canvasTex(W, W, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (lit[j * 4 + i]) { const [x, y, w, h] = win(i, j); g.fillStyle = r() < 0.3 ? '#ffb060' : '#ffe2a0'; g.fillRect(x, y + h * 0.4, w, h * 0.6); }
  });
  // glass curtain wall for downtown towers: 8 panels x 5 floors per 16 m, mullions, sky reflection with warm sun streaks
  const glass = canvasTex(W, W, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, W, [[0, '#7fb4e6'], [0.45, '#4f86c0'], [0.75, '#f0b48c'], [1, '#6d8fb4']]); g.fillRect(0, 0, W, W);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,230,200' : '20,40,70'},${r() * 0.18})`; g.fillRect(i * 64, j * W / 5, 64, W / 5); }
    g.fillStyle = 'rgba(255,255,255,0.18)'; for (let k = 0; k < 3; k++) { const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x - 80, W); g.lineTo(x - 140, W); g.fill(); }
    g.fillStyle = '#dfe6ee'; for (let i = 0; i <= 8; i++) g.fillRect(i * 64 - 3, 0, 6, W); for (let j = 0; j <= 5; j++) g.fillRect(0, j * W / 5 - 5, W, 10);
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let j = 0; j < 5; j++) g.fillRect(0, j * W / 5 + 5, W, 4);
  });
  const glassEm = canvasTex(W, W, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) if (r() < 0.3) { g.fillStyle = r() < 0.5 ? '#ffe8c0' : '#c8e4ff'; g.fillRect(i * 64 + 4, j * W / 5 + 10, 56, W / 5 - 16); }
  });
  return { map, mask, em, glass, glassEm };
}
export function asphaltTex(lines = true) {
  seed = 11;
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#7c7d85'; g.fillRect(0, 0, 512, 512); noise(g, 512, 512, 9000, 0.12, 2); noise(g, 512, 512, 600, 0.06, 6);
    g.fillStyle = 'rgba(30,30,36,0.18)'; for (let k = 0; k < 2; k++) g.fillRect(0, 150 + k * 190, 512, 34); // tyre polish in each lane pair
    if (!lines) return;
    g.fillStyle = '#f6f6f0'; g.fillRect(0, 26, 512, 7); g.fillRect(0, 479, 512, 7);
    g.fillStyle = '#f5c63a'; g.fillRect(0, 243, 512, 6); g.fillRect(0, 263, 512, 6);
    g.fillStyle = '#f6f6f0'; for (let k = 0; k < 2; k++) g.fillRect(k * 256 + 20, 125, 130, 6), g.fillRect(k * 256 + 20, 381, 130, 6);
  });
}
export const sidewalkTex = () => { seed = 13; return canvasTex(256, 256, (g) => {
  g.fillStyle = '#e8ddcb'; g.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = 225 + Math.floor(r() * 22); g.fillStyle = `rgb(${v + 6},${v - 2},${v - 16})`; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
  noise(g, 256, 256, 2500, 0.06); g.fillStyle = 'rgba(120,100,80,0.35)'; for (let k = 0; k <= 4; k++) { g.fillRect(k * 64 - 1, 0, 2, 256); g.fillRect(0, k * 64 - 1, 256, 2); }
}); };
export const sandTex = () => { seed = 17; return canvasTex(256, 256, (g) => { g.fillStyle = '#f2dcae'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 6000, 0.1); g.strokeStyle = 'rgba(190,150,100,0.12)'; g.lineWidth = 3; for (let k = 0; k < 10; k++) { g.beginPath(); g.moveTo(0, k * 26 + 8); g.bezierCurveTo(80, k * 26, 170, k * 26 + 16, 256, k * 26 + 8); g.stroke(); } }); };
export const waterTex = () => canvasTex(4, 4, (g) => { g.fillStyle = '#2aa0c0'; g.fillRect(0, 0, 4, 4); });
export const glowTex = () => canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, false);
export function signTexture(text, fg, bg = '#150a24', w = 512, h = 160) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.shadowColor = fg; g.shadowBlur = 18; g.strokeRect(10, 10, w - 20, h - 20);
    g.font = `bold ${Math.min(80, (w - 60) / (text.length * 0.62))}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 4); g.fillText(text, w / 2, h / 2 + 4);
  }, false);
}
// Daylight billboard posters for our own in-world brands: gradient sky, a sun/stripe motif, headline and tagline.
export function adTexture(title, tag, c1, c2, ink = '#ffffff') {
  return canvasTex(512, 256, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, 256, [[0, c1], [1, c2]]); g.fillRect(0, 0, 512, 256);
    g.fillStyle = 'rgba(255,240,200,0.9)'; g.beginPath(); g.arc(420, 150, 70, 0, Math.PI * 2); g.fill();
    g.fillStyle = c2; for (let k = 0; k < 5; k++) g.fillRect(340, 150 + k * 16, 170, 7);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 196, 512, 60);
    g.fillStyle = ink; g.font = `900 ${Math.min(74, 560 / title.length)}px Arial Black, Arial, sans-serif`; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 8; g.fillText(title, 26, 96);
    g.shadowBlur = 0; g.font = 'bold 26px Arial, sans-serif'; g.fillText(tag, 26, 228); g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 246);
  }, false);
}

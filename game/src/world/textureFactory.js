// Every texture in the game is drawn on a canvas at run time.
import * as THREE from 'three';
export function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
const noise = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };
// Stucco facade: art-deco floor bands, framed windows reflecting a blue-to-peach sky, sills and recessed shadow.
// The texture is near-white so the per-building vertex colour tints it into the pastel palette.
export function facadeMaps() {
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const lit = []; for (let k = 0; k < 32; k++) lit.push(r() < 0.4);
  const win = (i, j) => [24 + i * 128, 34 + j * 128, 80, 74];
  const map = canvasTex(512, 512, (g) => {
    g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, 512, 512); noise(g, 512, 512, 2600, 0.05);
    for (let j = 0; j < 4; j++) {
      const y = j * 128; g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, y, 512, 12); // cornice band
      g.fillStyle = 'rgba(60,40,30,0.16)'; g.fillRect(0, y + 12, 512, 3); g.fillRect(0, y + 118, 512, 2); g.fillRect(0, y + 123, 512, 2); // deco pin-lines
      for (let i = 0; i < 4; i++) {
        const [x, wy, w, h] = win(i, j);
        g.fillStyle = 'rgba(70,50,40,0.28)'; g.fillRect(x - 6, wy - 6, w + 12, h + 14); // recess shadow
        g.fillStyle = '#ffffff'; g.fillRect(x - 4, wy - 4, w + 8, h + 8); // frame
        const gr = g.createLinearGradient(x, wy, x, wy + h); gr.addColorStop(0, '#3d79b8'); gr.addColorStop(0.55, '#8fc3ea'); gr.addColorStop(0.62, '#f3c9a0'); gr.addColorStop(1, '#5a6c88');
        g.fillStyle = gr; g.fillRect(x, wy, w, h);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(x, wy + h); g.lineTo(x + 26, wy); g.lineTo(x + 44, wy); g.lineTo(x + 12, wy + h); g.fill();
        g.fillStyle = '#ffffff'; g.fillRect(x + w / 2 - 2, wy, 4, h); g.fillRect(x, wy + h * 0.38, w, 3); // mullions
        g.fillStyle = '#fffaf0'; g.fillRect(x - 8, wy + h + 4, w + 16, 7); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 8, wy + h + 11, w + 16, 3); // sill
      }
    }
  });
  const em = canvasTex(512, 512, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (lit[j * 4 + i]) { const [x, y, w, h] = win(i, j); g.fillStyle = r() < 0.3 ? '#ffb060' : '#ffe6a8'; g.fillRect(x, y, w, h); }
  });
  // Glass curtain wall for the downtown towers: mullion grid, panels catching sky and sun at different angles.
  const glass = canvasTex(512, 512, (g) => {
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const x = i * 64, y = j * 64, t = r(), gr = g.createLinearGradient(x, y, x + 64, y + 64);
      gr.addColorStop(0, t < 0.2 ? '#ffe2c0' : '#bfe0ff'); gr.addColorStop(1, t < 0.6 ? '#4f86c0' : '#79a8d8'); g.fillStyle = gr; g.fillRect(x, y, 64, 64);
    }
    const sh = g.createLinearGradient(0, 0, 512, 512); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.45, 'rgba(255,240,220,0.35)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#eef2f6'; for (let k = 0; k <= 8; k++) { g.fillRect(k * 64 - 2, 0, 4, 512); g.fillRect(0, k * 64 - 3, 512, 6); }
  });
  const glassEm = canvasTex(512, 512, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (r() < 0.3) { g.fillStyle = r() < 0.5 ? '#ffd9a0' : '#fff0d0'; g.fillRect(i * 64 + 3, j * 64 + 4, 58, 56); } });
  return { map, em, glass, glassEm };
}
export function asphaltTex(lines = true) {
  return canvasTex(512, 512, (g) => {
    g.fillStyle = '#6b6c72'; g.fillRect(0, 0, 512, 512); noise(g, 512, 512, 9000, 0.09);
    g.fillStyle = 'rgba(40,40,46,0.18)'; for (let k = 0; k < 6; k++) g.fillRect(Math.random() * 512, 0, 30 + Math.random() * 90, 512);
    g.fillStyle = 'rgba(30,30,36,0.35)'; g.fillRect(0, 150, 512, 34); g.fillRect(0, 330, 512, 34); // tyre-worn lanes
    if (!lines) return;
    g.fillStyle = '#fbfbf4'; g.fillRect(0, 26, 512, 6); g.fillRect(0, 480, 512, 6);
    g.fillStyle = '#ffd23c'; g.fillRect(0, 243, 512, 6); g.fillRect(0, 263, 512, 6);
    g.fillStyle = '#f4f4ec'; for (let k = 0; k < 2; k++) g.fillRect(k * 256 + 16, 136, 120, 5), g.fillRect(k * 256 + 16, 372, 120, 5);
  });
}
export const tileTex = () => canvasTex(128, 128, (g) => {
  g.fillStyle = '#e9e1d2'; g.fillRect(0, 0, 128, 128);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = 222 + Math.floor(Math.random() * 22); g.fillStyle = `rgb(${v},${v - 8},${v - 22})`; g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); }
  noise(g, 128, 128, 500, 0.06);
});
// Billboard artwork for our own in-world brands: gradient sky panel, sun stripes, headline and tagline.
export function adTexture(head, tag, c1, c2) {
  return canvasTex(512, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    g.fillStyle = 'rgba(255,240,200,0.9)'; g.beginPath(); g.arc(400, 150, 70, Math.PI, 0); g.fill();
    g.fillStyle = c2; for (let k = 0; k < 4; k++) g.fillRect(320, 112 + k * 12, 160, 4 + k);
    g.fillStyle = '#ffffff'; g.font = 'bold 64px Arial Black, Arial, sans-serif'; g.textBaseline = 'top'; g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 8; g.fillText(head, 26, 36, 360);
    g.font = 'bold 26px Arial, sans-serif'; g.fillText(tag, 28, 128, 300); g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(0, 214, 512, 42); g.fillStyle = c2; g.font = 'bold 22px Arial, sans-serif'; g.fillText('SOLVANE BAY', 28, 224);
    g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 246);
  }, false);
}
export const sandTex = () => canvasTex(128, 128, (g) => { g.fillStyle = '#e8d4a2'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 1200, 0.12); });
export const waterTex = () => canvasTex(256, 256, (g) => {
  g.fillStyle = '#2490b4'; g.fillRect(0, 0, 256, 256); g.fillStyle = 'rgba(20,90,140,0.25)'; for (let i = 0; i < 14; i++) g.fillRect(0, i * 19, 256, 8);
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) { const x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 22, y); g.stroke(); }
});
export const glowTex = () => canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, false);
export function signTexture(text, fg, bg = '#150a24', w = 512, h = 160) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.shadowColor = fg; g.shadowBlur = 18; g.strokeRect(10, 10, w - 20, h - 20);
    g.font = `bold ${Math.min(80, (w - 60) / (text.length * 0.62))}px Arial Black, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 4); g.fillText(text, w / 2, h / 2 + 4);
  }, false);
}
// Billowing puff for fire and smoke: dozens of soft blobs packed inside a round falloff, lit from the top-left so
// each puff has a bright crown and a shaded underside. Tinted per particle.
export const puffTex = () => canvasTex(128, 128, (g) => {
  let s = 91; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 70; i++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * 34, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, rad = 12 + r() * 20 * (1 - d / 60), lit = 0.55 + 0.45 * Math.max(0, (64 - y) / 40 + (64 - x) / 80) * r() + 0.2;
    const v = Math.min(255, Math.round(170 + 85 * lit)), gr = g.createRadialGradient(x - rad * 0.25, y - rad * 0.3, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${v},${v},${v},0.55)`); gr.addColorStop(0.6, `rgba(${v - 40},${v - 40},${v - 40},0.3)`); gr.addColorStop(1, 'rgba(120,120,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
  }
  const img = g.getImageData(0, 0, 128, 128), px = img.data;
  for (let i = 0; i < px.length; i += 4) { const k = (i >> 2), x = k % 128 - 64, y = (k >> 7) - 64, f = Math.max(0, 1 - Math.hypot(x, y) / 62); px[i + 3] = Math.min(255, px[i + 3] * 1.6 * Math.min(1, f * 2.2) * (0.85 + r() * 0.3)); }
  g.putImageData(img, 0, 0);
}, false);
// Scorch decal: charred centre fading out in a ragged ring.
export const scorchTex = () => canvasTex(128, 128, (g) => {
  let s = 17; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 40; i++) { const a = r() * 6.283, d = r() * 30, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, rad = 14 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(10,8,8,0.35)'); gr.addColorStop(1, 'rgba(10,8,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
}, false);

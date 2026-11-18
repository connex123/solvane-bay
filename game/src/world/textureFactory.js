// Every texture in the game is drawn on a canvas at run time.
import * as THREE from 'three';
export function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
const noise = (g, w, h, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };
export function facadeMaps() {
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const lit = []; for (let k = 0; k < 16; k++) lit.push(r() < 0.45);
  const win = (g, i, j) => { const x = 16 + i * 60, y = 22 + j * 60; return [x, y, 40, 40]; };
  const map = canvasTex(256, 256, (g) => {
    g.fillStyle = '#f2ede4'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 900, 0.06);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const [x, y, w, h] = win(g, i, j); const gr = g.createLinearGradient(x, y, x + w, y + h);
      gr.addColorStop(0, '#79a2c8'); gr.addColorStop(1, '#2c3f5e'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 14, y); g.lineTo(x + 24, y); g.lineTo(x + 6, y + h); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 3, y + h, w + 6, 4);
    }
  });
  const em = canvasTex(256, 256, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (lit[j * 4 + i]) { const [x, y, w, h] = win(g, i, j); g.fillStyle = r() < 0.3 ? '#ffb060' : '#ffe6a8'; g.fillRect(x, y, w, h); }
  });
  return { map, em };
}
export function asphaltTex(lines = true) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#4a4a54'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 2500, 0.1);
    if (!lines) return;
    g.fillStyle = '#f0f0e8'; g.fillRect(0, 14, 256, 3); g.fillRect(0, 239, 256, 3);
    g.fillStyle = '#f3c63c'; g.fillRect(0, 120, 256, 3); g.fillRect(0, 133, 256, 3);
    g.fillStyle = 'rgba(255,255,255,0.55)'; for (let k = 0; k < 2; k++) g.fillRect(k * 128 + 8, 68, 56, 3), g.fillRect(k * 128 + 8, 186, 56, 3);
  });
}
export const sandTex = () => canvasTex(128, 128, (g) => { g.fillStyle = '#e8d4a2'; g.fillRect(0, 0, 128, 128); noise(g, 128, 128, 1200, 0.12); });
export const waterTex = () => canvasTex(256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#2b9bb8'); gr.addColorStop(1, '#1d6f9a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
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

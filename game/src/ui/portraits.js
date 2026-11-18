// Draws character portraits on a canvas (flat illustrated busts with per-character hair, shades and colours).
import { CAST } from '../story/characters.js';
export function drawPortrait(canvas, id) {
  const c = CAST[id] || CAST.nico, g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, c.bg[0]); bg.addColorStop(1, c.bg[1]); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(w * 0.75, h * 0.2, w * 0.3, 0, 7); g.fill();
  g.fillStyle = c.shirt; g.beginPath(); g.moveTo(w * 0.08, h); g.quadraticCurveTo(w * 0.1, h * 0.68, w * 0.5, h * 0.66); g.quadraticCurveTo(w * 0.9, h * 0.68, w * 0.92, h); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.moveTo(w * 0.38, h * 0.67); g.lineTo(w * 0.5, h * 0.85); g.lineTo(w * 0.62, h * 0.67); g.fill();
  g.fillStyle = c.skin; g.fillRect(w * 0.42, h * 0.55, w * 0.16, h * 0.14);
  if (c.style === 'long') { g.fillStyle = c.hair; g.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.62); }
  g.fillStyle = c.skin; g.beginPath(); g.ellipse(w * 0.5, h * 0.4, w * 0.2, h * 0.24, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(w * 0.58, h * 0.42, w * 0.1, h * 0.2, 0, -1.2, 1.2); g.fill();
  g.fillStyle = c.hair;
  if (c.style !== 'bald') { g.beginPath(); g.ellipse(w * 0.5, h * 0.27, w * 0.215, h * (c.style === 'slick' ? 0.12 : 0.15), 0, Math.PI, 0); g.fill(); }
  if (c.style === 'bun') { g.beginPath(); g.arc(w * 0.5, h * 0.09, w * 0.09, 0, 7); g.fill(); }
  if (c.style === 'cap') { g.fillStyle = '#1d2b53'; g.fillRect(w * 0.27, h * 0.2, w * 0.46, h * 0.09); g.fillRect(w * 0.27, h * 0.27, w * 0.6, h * 0.03); g.fillStyle = '#f2c230'; g.fillRect(w * 0.47, h * 0.22, w * 0.06, h * 0.05); }
  if (c.style === 'bald') { g.fillStyle = c.hair; g.fillRect(w * 0.3, h * 0.38, w * 0.05, h * 0.18); g.fillRect(w * 0.65, h * 0.38, w * 0.05, h * 0.18); }
  if (c.shades) { g.fillStyle = '#10121a'; g.fillRect(w * 0.3, h * 0.38, w * 0.18, h * 0.07); g.fillRect(w * 0.52, h * 0.38, w * 0.18, h * 0.07); g.fillRect(w * 0.47, h * 0.4, w * 0.06, h * 0.015); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(w * 0.33, h * 0.39, w * 0.05, h * 0.015); }
  else { g.fillStyle = '#fff'; g.fillRect(w * 0.34, h * 0.39, w * 0.1, h * 0.05); g.fillRect(w * 0.56, h * 0.39, w * 0.1, h * 0.05); g.fillStyle = '#1a1210'; g.fillRect(w * 0.38, h * 0.39, w * 0.04, h * 0.05); g.fillRect(w * 0.6, h * 0.39, w * 0.04, h * 0.05); }
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = Math.max(2, w * 0.018); g.beginPath(); g.moveTo(w * 0.42, h * 0.54); g.quadraticCurveTo(w * 0.5, h * 0.58, w * 0.58, h * 0.53); g.stroke();
  if (id === 'brandt' || id === 'wren') { g.fillStyle = 'rgba(200,200,200,0.55)'; g.fillRect(w * 0.36, h * 0.5, w * 0.28, h * 0.05); }
}

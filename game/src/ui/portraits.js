// Illustrated character portraits drawn on a canvas, used by the HUD crew stack, dialogue and Crew & Chapters.
// One lighting setup for everyone (warm key from the upper left, teal rim from the right, soft cel shadow) and a
// distinct silhouette per character: Sol's shades and bun, Tamsin's headphones and braids, Wren's grey beard and cap,
// Brandt's silver slick and gold crown pin, Reyne's police cap, Dex's gold chain, Nico's messy crop and stubble.
import { CAST } from '../story/characters.js';

// expression: brow tilt (+ = angry), mouth: 'smile' | 'grin' | 'flat' | 'frown' | 'smirk'
const LOOK = {
  nico: { brow: 0.04, mouth: 'flat', stubble: true }, sol: { brow: -0.03, mouth: 'grin', hoop: true }, dex: { brow: 0.02, mouth: 'smirk', chain: true },
  wren: { brow: -0.04, mouth: 'smile', beard: true, cap: '#2f6a74', wrinkles: true }, tamsin: { brow: 0.03, mouth: 'flat', phones: true, braids: true },
  brandt: { brow: 0.08, mouth: 'smirk', pin: true, suit: true }, reyne: { brow: 0.1, mouth: 'frown', police: true, tache: true }, dispatch: { brow: 0, mouth: 'flat', headset: true, police: true },
};
function shade(hex, f) { const n = parseInt(hex.slice(1), 16), c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; }
const ell = (g, x, y, rx, ry, a0 = 0, a1 = 7) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, a0, a1); g.fill(); };

export function drawPortrait(canvas, id) {
  const c = CAST[id] || CAST.nico, L = LOOK[id] || LOOK.nico, g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  g.save(); g.setTransform(w / 100, 0, 0, h / 100, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round';
  // background: the character's colour fading into deep teal, with a sun disc and a cream ring
  const bg = g.createLinearGradient(0, 0, 0, 100); bg.addColorStop(0, c.bg[0]); bg.addColorStop(1, '#06303a'); g.fillStyle = bg; g.fillRect(0, 0, 100, 100);
  g.fillStyle = 'rgba(255,240,210,0.22)'; ell(g, 74, 22, 22, 22);
  // braids hang behind the shoulders
  if (L.braids) { g.fillStyle = c.hair; for (const s of [-1, 1]) for (let k = 0; k < 6; k++) ell(g, 50 + s * 21, 46 + k * 8, 5.2, 4.6); }
  // shoulders and clothes
  g.fillStyle = L.suit ? '#1a1c24' : L.police ? '#1d2b53' : c.shirt; g.beginPath(); g.moveTo(4, 100); g.quadraticCurveTo(8, 70, 50, 68); g.quadraticCurveTo(92, 70, 96, 100); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.moveTo(50, 68); g.quadraticCurveTo(90, 70, 96, 100); g.lineTo(70, 100); g.fill();
  if (L.suit) { g.fillStyle = '#f4f0e8'; g.beginPath(); g.moveTo(41, 69); g.lineTo(50, 90); g.lineTo(59, 69); g.fill(); g.fillStyle = '#b8202c'; g.beginPath(); g.moveTo(48, 72); g.lineTo(52, 72); g.lineTo(53, 92); g.lineTo(50, 96); g.lineTo(47, 92); g.fill(); }
  else { g.fillStyle = shade(c.shirt.length === 7 ? c.shirt : '#1d2b53', 0.7); g.beginPath(); g.moveTo(38, 69); g.lineTo(50, 82); g.lineTo(62, 69); g.lineTo(58, 68); g.lineTo(50, 76); g.lineTo(42, 68); g.fill(); }
  if (L.police) { g.fillStyle = '#ffc93c'; g.beginPath(); g.moveTo(24, 80); g.lineTo(30, 77); g.lineTo(34, 82); g.lineTo(29, 88); g.fill(); }
  if (L.pin) { g.fillStyle = '#ffc93c'; g.beginPath(); g.moveTo(26, 82); g.lineTo(27, 76); g.lineTo(29.5, 79); g.lineTo(31.5, 75); g.lineTo(33.5, 79); g.lineTo(36, 76); g.lineTo(37, 82); g.closePath(); g.fill(); g.strokeStyle = '#5a3a00'; g.lineWidth = 0.8; g.stroke(); }
  if (L.chain) { g.strokeStyle = '#ffc93c'; g.lineWidth = 2.2; g.beginPath(); g.arc(50, 66, 13, 0.35, Math.PI - 0.35); g.stroke(); }
  // neck, ears, head (jaw shape), cel shadow on the right and a teal rim
  const skin = c.skin; g.fillStyle = shade(skin, 0.82); g.fillRect(43, 54, 14, 16);
  g.fillStyle = skin; ell(g, 29.5, 42, 4, 6); ell(g, 70.5, 42, 4, 6);
  g.beginPath(); g.moveTo(30, 34); g.quadraticCurveTo(30, 14, 50, 14); g.quadraticCurveTo(70, 14, 70, 34); g.quadraticCurveTo(70, 52, 58, 60); g.quadraticCurveTo(50, 65, 42, 60); g.quadraticCurveTo(30, 52, 30, 34); g.fill();
  g.fillStyle = 'rgba(40,20,10,0.16)'; g.beginPath(); g.moveTo(56, 15); g.quadraticCurveTo(70, 16, 70, 34); g.quadraticCurveTo(70, 52, 58, 60); g.quadraticCurveTo(52, 63, 49, 63); g.quadraticCurveTo(62, 48, 56, 15); g.fill();
  g.strokeStyle = 'rgba(80,240,220,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(69.5, 26); g.quadraticCurveTo(71, 44, 60, 58); g.stroke();
  if (L.stubble || L.beard) { g.fillStyle = L.beard ? '#d8d8d4' : 'rgba(30,20,15,0.28)'; g.beginPath(); g.moveTo(32, 44); g.quadraticCurveTo(33, 58, 42, 63); g.quadraticCurveTo(50, L.beard ? 74 : 66, 58, 63); g.quadraticCurveTo(67, 58, 68, 44); g.quadraticCurveTo(60, 50, 50, 50); g.quadraticCurveTo(40, 50, 32, 44); g.fill(); }
  if (L.wrinkles) { g.strokeStyle = 'rgba(80,40,20,0.35)'; g.lineWidth = 0.8; for (const y of [22, 25]) { g.beginPath(); g.moveTo(40, y); g.quadraticCurveTo(50, y - 1.5, 60, y); g.stroke(); } }
  // eyes: whites and irises, or shades with a highlight; brows set the expression
  if (c.shades) { g.fillStyle = '#0c1418'; g.beginPath(); g.moveTo(31, 33); g.lineTo(48, 33); g.lineTo(46, 42); g.quadraticCurveTo(38, 44, 33, 41); g.closePath(); g.moveTo(52, 33); g.lineTo(69, 33); g.lineTo(67, 41); g.quadraticCurveTo(62, 44, 54, 42); g.closePath(); g.fill(); g.fillRect(47, 33.5, 6, 1.6);
    g.fillStyle = 'rgba(120,230,220,0.55)'; g.beginPath(); g.moveTo(34, 35); g.lineTo(40, 35); g.lineTo(36, 39); g.fill(); g.beginPath(); g.moveTo(55, 35); g.lineTo(61, 35); g.lineTo(57, 39); g.fill(); }
  else { g.fillStyle = '#fffaf0'; ell(g, 40, 37, 5, 3); ell(g, 60, 37, 5, 3); g.fillStyle = '#2a1a10'; ell(g, 41, 37, 2.4, 2.6); ell(g, 61, 37, 2.4, 2.6); g.fillStyle = '#fff'; ell(g, 41.8, 36.2, 0.8, 0.8); ell(g, 61.8, 36.2, 0.8, 0.8); }
  g.strokeStyle = L.beard ? '#cfcfcf' : shade(c.hair, 0.9); g.lineWidth = 2.4; const b = L.brow * 40;
  g.beginPath(); g.moveTo(34, 30 - b); g.lineTo(46, 30 + b); g.moveTo(54, 30 + b); g.lineTo(66, 30 - b); g.stroke();
  // nose and mouth
  g.strokeStyle = 'rgba(60,30,15,0.45)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(50, 40); g.quadraticCurveTo(53, 47, 49, 48.5); g.stroke();
  if (L.tache) { g.fillStyle = c.hair; g.beginPath(); g.moveTo(42, 52); g.quadraticCurveTo(50, 48, 58, 52); g.quadraticCurveTo(50, 51, 42, 52); g.fill(); }
  g.strokeStyle = '#5a2418'; g.lineWidth = 1.8; g.beginPath();
  if (L.mouth === 'grin') { g.fillStyle = '#5a2418'; g.moveTo(42, 53); g.quadraticCurveTo(50, 60, 58, 53); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(44, 53.2, 12, 1.8); }
  else if (L.mouth === 'smile') g.moveTo(43, 54), g.quadraticCurveTo(50, 58, 57, 54);
  else if (L.mouth === 'frown') g.moveTo(43, 56), g.quadraticCurveTo(50, 52.5, 57, 56);
  else if (L.mouth === 'smirk') g.moveTo(43, 55), g.quadraticCurveTo(52, 56, 58, 52);
  else g.moveTo(44, 55), g.lineTo(56, 55);
  g.stroke();
  // hair and headwear
  g.fillStyle = c.hair;
  if (c.style === 'short') { g.beginPath(); g.moveTo(29, 36); g.quadraticCurveTo(26, 12, 48, 11); g.quadraticCurveTo(72, 10, 71, 34); g.lineTo(66, 24); g.lineTo(60, 27); g.lineTo(55, 21); g.lineTo(48, 26); g.lineTo(42, 21); g.lineTo(35, 27); g.closePath(); g.fill(); }
  if (c.style === 'bun') { g.beginPath(); g.moveTo(30, 33); g.quadraticCurveTo(30, 12, 50, 12); g.quadraticCurveTo(70, 12, 70, 33); g.quadraticCurveTo(62, 20, 50, 20); g.quadraticCurveTo(38, 20, 30, 33); g.fill(); ell(g, 50, 8, 10, 8); g.fillStyle = '#ff6f59'; g.fillRect(43, 13, 14, 3); }
  if (c.style === 'slick') { g.beginPath(); g.moveTo(29, 34); g.quadraticCurveTo(28, 10, 52, 10); g.quadraticCurveTo(73, 11, 71, 32); g.quadraticCurveTo(66, 18, 50, 19); g.quadraticCurveTo(38, 20, 33, 30); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; for (const y of [14, 17]) { g.beginPath(); g.moveTo(36, y + 4); g.quadraticCurveTo(50, y - 2, 66, y + 3); g.stroke(); } }
  if (c.style === 'long') { g.beginPath(); g.moveTo(29, 40); g.quadraticCurveTo(26, 11, 50, 11); g.quadraticCurveTo(74, 11, 71, 40); g.quadraticCurveTo(64, 20, 50, 21); g.quadraticCurveTo(36, 20, 29, 40); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.9; for (let x = 36; x < 66; x += 5) { g.beginPath(); g.moveTo(x, 13); g.lineTo(x - 3, 22); g.stroke(); } }
  if (L.cap) { g.fillStyle = L.cap; g.beginPath(); g.moveTo(28, 28); g.quadraticCurveTo(30, 8, 50, 8); g.quadraticCurveTo(70, 8, 72, 28); g.closePath(); g.fill(); g.fillStyle = shade(L.cap, 0.7); g.beginPath(); g.moveTo(26, 28); g.lineTo(76, 28); g.quadraticCurveTo(80, 33, 62, 32); g.lineTo(26, 31); g.fill(); g.fillStyle = '#ff6f59'; g.fillRect(45, 14, 10, 6); }
  if (L.police) { g.fillStyle = '#1d2b53'; g.beginPath(); g.moveTo(25, 26); g.quadraticCurveTo(28, 8, 50, 7); g.quadraticCurveTo(72, 8, 75, 26); g.closePath(); g.fill(); g.fillStyle = '#0c1430'; g.fillRect(27, 24, 46, 5); g.beginPath(); g.moveTo(30, 29); g.lineTo(70, 29); g.quadraticCurveTo(64, 35, 50, 34); g.quadraticCurveTo(36, 35, 30, 29); g.fill();
    g.fillStyle = '#ffc93c'; g.beginPath(); g.moveTo(50, 11); g.lineTo(55, 15); g.lineTo(53, 22); g.lineTo(47, 22); g.lineTo(45, 15); g.closePath(); g.fill(); g.fillStyle = '#f4f0e8'; g.fillRect(27, 24, 46, 1.4); }
  if (L.phones) { g.strokeStyle = '#1c2a30'; g.lineWidth = 4; g.beginPath(); g.arc(50, 34, 23, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.fillStyle = '#ff6f59'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(50 + s * 22, 40, 6, 9, 0, 0, 7); g.fill(); g.fillStyle = '#1c2a30'; ell(g, 50 + s * 23.5, 40, 2.4, 5); g.fillStyle = '#ff6f59'; } }
  if (L.headset) { g.strokeStyle = '#222'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(31, 44); g.quadraticCurveTo(36, 56, 44, 55); g.stroke(); }
  if (L.hoop) { g.strokeStyle = '#ffc93c'; g.lineWidth = 1.6; g.beginPath(); g.arc(29, 50, 3.4, 0, 7); g.stroke(); }
  // cream keyline frame
  g.strokeStyle = 'rgba(244,232,204,0.9)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 97, 97);
  g.restore();
}

// Three synthesized radio stations (step-sequenced WebAudio loops) with DJ names and track titles; R cycles them.
import { G } from '../core/gameState.js';
import { audio } from './soundEngine.js';

export const STATIONS = [
  { name: 'SUNSET FM 94.3', dj: 'DJ Marlo', genre: 'Synthwave', bpm: 104, root: 45, scale: [0, 3, 7, 10], tracks: ['Palm Shadows', 'Boulevard Heat', 'Coral Dusk'], bass: [0, 0, 3, 0, 5, 5, 3, 7], color: '#ff9a3c' },
  { name: 'NEON PULSE 101', dj: 'Kiki Vega', genre: 'Club', bpm: 124, root: 40, scale: [0, 3, 5, 7, 10], tracks: ['Velvet Strobe', 'Last Tram to Neon Row', 'Glass Hearts'], bass: [0, 0, 0, 7, 0, 0, 5, 3], color: '#ff4fd8' },
  { name: 'SALT & STATIC 88.1', dj: 'Ozzy Quill', genre: 'Lo-fi', bpm: 78, root: 48, scale: [0, 4, 7, 11], tracks: ['Harbour Haze', 'Low Tide Tape', 'Rooftop Rain'], bass: [0, 0, 5, 5, 7, 7, 4, 4], color: '#7dd3fc' },
];
let step = 0, nextT = 0;
export const radioInfo = () => (G.radio === 0 ? null : { ...STATIONS[G.radio - 1], track: STATIONS[G.radio - 1].tracks[Math.floor(G.time / 90) % 3] });
export function cycleRadio() { G.radio = (G.radio + 1) % (STATIONS.length + 1); step = 0; nextT = 0; G.radioShowT = 5; }
const f = (n) => 440 * Math.pow(2, (n - 69) / 12);
function note(t, freq, dur, type, vol, filt) {
  const c = audio.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = type; o.frequency.value = freq; fl.frequency.value = filt;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(fl); fl.connect(g); g.connect(audio.master); o.start(t); o.stop(t + dur + 0.02);
}
function drum(t, kind) {
  const c = audio.ctx; if (kind === 'k') { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g); g.connect(audio.master); o.start(t); o.stop(t + 0.22); return; }
  const s = c.createBufferSource(); s.buffer = audio.noise; const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = kind === 'h' ? 7000 : 2000; const g = c.createGain(); g.gain.setValueAtTime(kind === 'h' ? 0.08 : 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'h' ? 0.04 : 0.12)); s.connect(fl); fl.connect(g); g.connect(audio.master); s.start(t); s.stop(t + 0.15);
}
export function updateRadio() {
  const c = audio.ctx; if (!c || G.radio === 0 || c.state !== 'running') return; const st = STATIONS[G.radio - 1], dt = 60 / st.bpm / 4; if (nextT < c.currentTime) nextT = c.currentTime + 0.05;
  while (nextT < c.currentTime + 0.25) {
    const s = step % 16, bar = Math.floor(step / 16) % 8, r = st.root + st.bass[bar];
    if (st.genre === 'Club') { if (s % 4 === 0) drum(nextT, 'k'); if (s % 2 === 1) drum(nextT, 'h'); if (s === 4 || s === 12) drum(nextT, 's'); if (s % 2 === 0) note(nextT, f(r + 12), dt * 1.5, 'sawtooth', 0.05, 900 + (s % 8) * 150); note(nextT, f(st.root + 24 + st.scale[(s * 3 + bar) % st.scale.length]), dt, 'square', 0.025, 2500); }
    else if (st.genre === 'Synthwave') { if (s % 8 === 0 || s === 10) drum(nextT, 'k'); if (s === 4 || s === 12) drum(nextT, 's'); if (s % 2 === 0) drum(nextT, 'h'); if (s % 2 === 0) note(nextT, f(r), dt * 1.8, 'sawtooth', 0.07, 500); if (s % 4 === 0) note(nextT, f(st.root + 24 + st.scale[(s / 4 + bar) % st.scale.length]), dt * 4, 'triangle', 0.06, 3000); }
    else { if (s === 0 || s === 8) drum(nextT, 'k'); if (s === 4 || s === 12) drum(nextT, 's'); if (s % 4 === 2) drum(nextT, 'h'); if (s === 0) for (const n of st.scale) note(nextT, f(r + 12 + n), dt * 14, 'triangle', 0.03, 1400); if (s % 8 === 3) note(nextT, f(r), dt * 3, 'sine', 0.12, 400); }
    nextT += dt; step++;
  }
}

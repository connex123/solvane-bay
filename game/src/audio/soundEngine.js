// WebAudio sound effects: synthesized engine, siren, gunshots, explosions, horn and UI clicks.
import { G } from '../core/gameState.js';
export const audio = { ctx: null, master: null, noise: null, engine: null, siren: null, horn: null };
export function initAudio() {
  if (audio.ctx) { audio.ctx.resume?.(); return; }
  try {
    const ctx = audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    audio.master = ctx.createGain(); audio.master.gain.value = G.settings.vol; audio.master.connect(ctx.destination);
    audio.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = audio.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const osc = (type, f, g, filt) => { const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = type; o.frequency.value = f; gn.gain.value = 0; let n = o; if (filt) { const fl = ctx.createBiquadFilter(); fl.frequency.value = filt; o.connect(fl); n = fl; } n.connect(gn); gn.connect(audio.master); o.start(); return { o, g: gn }; };
    audio.engine = osc('sawtooth', 50, 0, 600); audio.siren = osc('square', 700, 0, 1800); audio.horn = osc('square', 420, 0, 1200); audio.horn.o2 = null;
  } catch (e) { audio.ctx = null; }
}
export const setVolume = (v) => { G.settings.vol = v; if (audio.master) audio.master.gain.value = v; };
function burst(dur, freq, vol, type = 'lowpass', q = 1) {
  const c = audio.ctx; if (!c) return; const s = c.createBufferSource(); s.buffer = audio.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur); s.connect(f); f.connect(g); g.connect(audio.master); s.start(); s.stop(c.currentTime + dur);
}
function tone(f0, f1, dur, vol, type = 'sine') {
  const c = audio.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, c.currentTime); o.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur); o.connect(g); g.connect(audio.master); o.start(); o.stop(c.currentTime + dur);
}
export const sfx = {
  click: () => tone(900, 600, 0.06, 0.15, 'square'),
  shot: (kind) => { burst(kind === 'shotgun' ? 0.35 : 0.16, kind === 'smg' ? 3000 : 1800, 0.7); tone(160, 50, 0.12, 0.4); },
  explosion: () => { burst(1.6, 500, 1.2); tone(90, 30, 1.2, 0.8, 'sawtooth'); },
  crash: (v) => burst(0.25, 900, Math.min(1, v / 20)),
  punch: () => burst(0.1, 500, 0.5),
  pickup: () => { tone(600, 1200, 0.15, 0.2, 'triangle'); },
  engine(on, speed, thr) { const e = audio.engine; if (!e || !audio.ctx) return; e.g.gain.value = on ? 0.05 + thr * 0.05 : 0; e.o.frequency.value = 45 + Math.abs(speed) * 3.2 + thr * 20; },
  siren(level) { const s = audio.siren; if (!s || !audio.ctx) return; s.g.gain.value = level * 0.018; s.o.frequency.value = 650 + Math.sin(G.time * 6) * 220; },
  horn(on) { const h = audio.horn; if (h && audio.ctx) h.g.gain.value = on ? 0.05 : 0; },
};
export const audioTone = tone;

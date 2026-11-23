// Synthesised sound with WebAudio: a looping engine, siren and horn, plus one-shot gunshots, explosions,
// crashes, punches and UI blips built from noise bursts and pitch sweeps. No audio files.
import { G } from '../core/gameState.js';

export const audio = { ctx: null, master: null, noise: null, engine: null, siren: null, horn: null };

const SILENT = 0.001; // exponential ramps cannot reach 0

function whiteNoise(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); // one second, mono
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return buffer;
}

// A continuously running oscillator behind a lowpass filter and a gain held at zero until used.
function droneVoice(ctx, wave, freq, cutoff) {
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.value = freq;
  const filter = ctx.createBiquadFilter();
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  osc.start();
  return { o: osc, g: gain };
}

/** Create the audio graph on first use (needs a user gesture); later calls just resume it. */
export function initAudio() {
  if (audio.ctx) {
    if (audio.ctx.resume) audio.ctx.resume();
    return;
  }
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctor();
    audio.ctx = ctx;
    audio.master = ctx.createGain();
    audio.master.gain.value = G.settings.vol;
    audio.master.connect(ctx.destination);
    audio.noise = whiteNoise(ctx);
    audio.engine = droneVoice(ctx, 'sawtooth', 50, 600);
    audio.siren = droneVoice(ctx, 'square', 700, 1800);
    audio.horn = droneVoice(ctx, 'square', 420, 1200);
    audio.horn.o2 = null;
  } catch (err) {
    audio.ctx = null; // no WebAudio: the game runs silent
  }
}

export function setVolume(v) {
  G.settings.vol = v;
  if (audio.master) audio.master.gain.value = v;
}

function fadingGain(ctx, peak, seconds) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(SILENT, ctx.currentTime + seconds);
  gain.connect(audio.master);
  return gain;
}

// Filtered noise that dies away over `seconds`.
function noiseHit(seconds, cutoff, peak, filterType = 'lowpass', q = 1) {
  const ctx = audio.ctx;
  if (!ctx) return;
  const source = ctx.createBufferSource();
  source.buffer = audio.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = cutoff;
  filter.Q.value = q;
  source.connect(filter);
  filter.connect(fadingGain(ctx, peak, seconds));
  source.start();
  source.stop(ctx.currentTime + seconds);
}

// A pitch sweep from fromHz to toHz that dies away over `seconds`.
function sweep(fromHz, toHz, seconds, peak, wave = 'sine') {
  const ctx = audio.ctx;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(fromHz, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(toHz, ctx.currentTime + seconds);
  osc.connect(fadingGain(ctx, peak, seconds));
  osc.start();
  osc.stop(ctx.currentTime + seconds);
}

export const sfx = {
  click: () => sweep(900, 600, 0.06, 0.15, 'square'),
  shot(kind) {
    const tail = kind === 'shotgun' ? 0.35 : 0.16;
    const crack = kind === 'smg' ? 3000 : 1800;
    noiseHit(tail, crack, 0.7);
    sweep(160, 50, 0.12, 0.4); // the thump under the crack
  },
  explosion() {
    noiseHit(1.6, 500, 1.2);
    sweep(90, 30, 1.2, 0.8, 'sawtooth');
  },
  crash: (v) => noiseHit(0.25, 900, Math.min(1, v / 20)),
  punch: () => noiseHit(0.1, 500, 0.5),
  pickup() {
    sweep(600, 1200, 0.15, 0.2, 'triangle');
  },
  engine(on, speed, thr) {
    const voice = audio.engine;
    if (!voice || !audio.ctx) return;
    voice.g.gain.value = on ? 0.05 + thr * 0.05 : 0;
    voice.o.frequency.value = 45 + Math.abs(speed) * 3.2 + thr * 20;
  },
  siren(level) {
    const voice = audio.siren;
    if (!voice || !audio.ctx) return;
    voice.g.gain.value = level * 0.018;
    voice.o.frequency.value = 650 + Math.sin(G.time * 6) * 220; // wail
  },
  horn(on) {
    const voice = audio.horn;
    if (voice && audio.ctx) voice.g.gain.value = on ? 0.05 : 0;
  },
};

export const audioTone = sweep;

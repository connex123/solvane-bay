// Visual effects: pooled sprite particles (sparks, smoke, fire, muzzle flashes), tracers, skid marks and siren lights.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { glowTex, puffTex, scorchTex } from '../world/textureFactory.js';

const pool = []; let tracers = [], skid, skidN = 0, glow, puff, flash, flashT = 0; const sirens = new Set(), scorches = []; let scorchN = 0;
const dummy = new THREE.Object3D(), tmpC = new THREE.Color();
export function initEffects(scene) {
  glow = glowTex(); puff = puffTex();
  for (let i = 0; i < 300; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false })); s.visible = false; scene.add(s);
    pool.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 0, g: 0, size: 1, op: 1, spin: 0, c1: new THREE.Color(), c2: null, drag: 0 });
  }
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), new THREE.MeshBasicMaterial({ color: 0xffe8a0 })); m.visible = false; scene.add(m); tracers.push({ m, life: 0 });
  }
  const g = new THREE.PlaneGeometry(0.3, 1.1).rotateX(-Math.PI / 2);
  skid = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), 300);
  skid.frustumCulled = false; dummy.scale.set(0, 0, 0); dummy.updateMatrix(); for (let i = 0; i < 300; i++) skid.setMatrixAt(i, dummy.matrix); scene.add(skid);
  // one pooled flash light (always in the scene so the light count never changes and no shader recompiles mid-game)
  flash = new THREE.PointLight(0xffa040, 0, 34, 1.4); flash.position.set(0, -50, 0); scene.add(flash);
  const st = scorchTex(), sg = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 })); m.visible = false; scene.add(m); scorches.push({ m, life: 0 }); }
}
// o.tex 'puff' = billowing noise puff (fire/smoke), o.c2 = colour reached at end of life, o.hdr = brightness boost for bloom
export function particle(o) {
  const p = pool.find((q) => q.life <= 0); if (!p) return;
  p.life = p.max = o.life; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0; p.grow = o.grow || 0; p.g = o.g || 0; p.size = o.size; p.op = o.op ?? 1; p.spin = o.spin || 0; p.drag = o.drag || 0; p.fin = o.fin || 0; // fin: seconds to fade in (smoke that emerges instead of popping in)
  const m = p.s.material; m.map = o.tex === 'puff' ? puff : glow; m.rotation = o.rot ?? (o.tex === 'puff' ? Math.random() * 6.283 : 0);
  p.c1.set(o.color).multiplyScalar(o.hdr || 1); p.c2 = o.c2 != null ? new THREE.Color(o.c2).multiplyScalar(o.hdr2 || 1) : null; m.color.copy(p.c1);
  p.s.position.set(o.x, o.y, o.z); m.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending; p.s.visible = true; p.s.scale.setScalar(o.size);
}
export const muzzleFlash = (x, y, z) => { particle({ x, y, z, life: 0.07, size: 1.5, color: 0xffd070, add: true, hdr: 2 }); particle({ x, y, z, life: 0.07, size: 0.6, color: 0xffffff, add: true, hdr: 3 }); };
export function sparks(x, y, z, n = 6) { for (let i = 0; i < n; i++) particle({ x, y, z, vx: (Math.random() - .5) * 9, vy: Math.random() * 6, vz: (Math.random() - .5) * 9, g: 18, life: 0.5, size: 0.25, color: 0xffc060, add: true, hdr: 2 }); }
// a bullet or debris hitting the sea: a plume of white water thrown up and falling back
export function splash(x, z, big = 1) {
  const R = Math.random; for (let i = 0; i < 6 + big * 3; i++) particle({ x: x + (R() - .5) * 0.4 * big, y: 0.2, z: z + (R() - .5) * 0.4 * big, vx: (R() - .5) * 1.2 * big, vy: (5 + R() * 5) * big, vz: (R() - .5) * 1.2 * big, g: 16, life: 0.75, size: (0.3 + R() * 0.25) * big, grow: 0.5 * big, color: 0xffffff, hdr: 2, op: 0.95 });
  particle({ x, y: 0.15, z, life: 0.5, size: 1.2 * big, grow: 2 * big, color: 0xffffff, hdr: 1.4, op: 0.7, tex: 'puff' });
}
export const smoke =(x, y, z, c = 0x333333) => particle({ x, y, z, vx: (Math.random() - .5) * 1.5, vy: 2 + Math.random() * 2, vz: (Math.random() - .5) * 1.5, life: 1.6, size: 1.2, grow: 2.5, color: c, op: 0.7, tex: 'puff', spin: 0.4 });
export const tyreSmoke = (x, z) => particle({ x, y: 0.4, z, vx: (Math.random() - .5) * 1.2, vy: 0.6 + Math.random() * 0.8, vz: (Math.random() - .5) * 1.2, life: 1.4, size: 1.1, grow: 2.6, color: 0xfff4f0, op: 0.5, tex: 'puff', spin: 0.3 });
// flames licking off a burning wreck
export const fire = (x, y, z) => { const R = Math.random; particle({ x: x + (R() - .5) * 1.4, y, z: z + (R() - .5) * 1.4, vy: 2 + R() * 1.5, life: 0.6 + R() * 0.3, size: 1 + R() * 0.6, grow: 0.8, color: 0xffd060, c2: 0x9a1808, hdr: 1.8, op: 0.95, tex: 'puff', spin: 1 });
  particle({ x: x + (R() - .5) * 0.9, y: y + 0.2, z: z + (R() - .5) * 0.9, vy: 2.4 + R(), life: 0.4 + R() * 0.2, size: 0.9 + R() * 0.5, grow: 1.2, color: 0xfff0b8, c2: 0xff8a30, hdr: 2.4, add: true, op: 0.8, tex: 'puff' }); }; // white-hot core so flames read bright, not muddy
export function explosion(x, y, z) {
  const R = Math.random, P = 'puff';
  flash.position.set(x, y + 2, z); flash.intensity = 900; flashT = 0.6;
  // white-hot core puffs, then the rolling fireball (amber -> orange -> dark red; pure yellow reads olive once the warm grade and smoke mix in), each puff its own noise blob
  for (let i = 0; i < 7; i++) particle({ x: x + (R() - .5) * 1.2, y: y + 0.6 + R() * 1.2, z: z + (R() - .5) * 1.2, vx: (R() - .5) * 3, vy: 1 + R() * 2, vz: (R() - .5) * 3, life: 0.45 + R() * 0.2, size: 2 + R() * 1.4, grow: 4, color: 0xfff6d0, c2: 0xff9a30, hdr: 2.6, hdr2: 1.6, add: true, op: 0.9, tex: P, spin: 1.5, drag: 2 });
  for (let i = 0; i < 22; i++) { const a = R() * 6.283, sp = 3 + R() * 5; particle({ x: x + Math.cos(a) * 0.8, y: y + 0.5 + R() * 1.6, z: z + Math.sin(a) * 0.8, vx: Math.cos(a) * sp, vy: 2 + R() * 6, vz: Math.sin(a) * sp, life: 0.9 + R() * 0.6, size: 1.8 + R() * 1.6, grow: 3.2, color: [0xffc040, 0xff9028, 0xff6a1c][i % 3], c2: 0x5a1208, hdr: 1.9, hdr2: 0.7, op: 0.95, tex: P, spin: (R() - .5) * 2, drag: 2.2 }); }
  for (let i = 0; i < 8; i++) particle({ x: x + (R() - .5) * 2, y: y + 1 + R(), z: z + (R() - .5) * 2, vx: (R() - .5) * 5, vy: 2 + R() * 4, vz: (R() - .5) * 5, life: 0.7, size: 3 + R() * 2, grow: 3, color: 0xff7020, hdr: 1.4, add: true, op: 0.5, tex: P, drag: 2 });
  // billowing smoke column rising out of the fireball (fading in over half a second, so the first instant is a clean bright burst): warm grey, fire-lit and see-through
  for (let i = 0; i < 18; i++) particle({ fin: 0.5, x: x + (R() - .5) * 2, y: y + 1.2 + i * 0.18 + R() * 0.6, z: z + (R() - .5) * 2, vx: (R() - .5) * 1.6, vy: 2.5 + R() * 2.5, vz: (R() - .5) * 1.6, life: 3 + R(), size: 2.6 + i * 0.12 + R(), grow: 2.4, color: i % 3 ? 0x8a6656 : 0xa8785c, c2: 0xc8b4a4, op: 0.5, tex: P, spin: (R() - .5) * 0.6, drag: 0.6 });
  // flying burning debris trailing glow, dark chunks, sparks and a ground glow
  for (let i = 0; i < 16; i++) { const vx = (R() - .5) * 22, vy = 6 + R() * 10, vz = (R() - .5) * 22; particle({ x, y: y + 0.8, z, vx, vy, vz, g: 14, life: 1.3, size: 0.55, color: 0xffb040, hdr: 2.2, add: true }); particle({ x, y: y + 0.8, z, vx: vx * 0.9, vy: vy * 0.9, vz: vz * 0.9, g: 14, life: 1.2, size: 0.32, color: 0x1a1210 }); }
  sparks(x, y + 1, z, 26);
  particle({ x, y: 0.4, z, life: 0.9, size: 9, grow: 2, color: 0xff7a28, hdr: 1.6, add: true, op: 0.8 });
  const sc = scorches[scorchN++ % scorches.length]; sc.m.position.set(x, 0.04, z); sc.m.scale.set(7, 1, 7); sc.m.rotation.y = R() * 6; sc.m.material.opacity = 1; sc.m.visible = true; sc.life = 30;
  G.shake = Math.max(G.shake, 1);
}
export function tracer(ax, ay, az, bx, by, bz) {
  const t = tracers.find((q) => q.life <= 0); if (!t) return;
  const len = Math.hypot(bx - ax, by - ay, bz - az); t.m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); t.m.lookAt(bx, by, bz); t.m.scale.set(1, 1, len); t.m.visible = true; t.life = 0.09;
}
export function skidMark(x, z, heading) {
  dummy.position.set(x, 0.05, z); dummy.rotation.set(0, heading, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); skid.setMatrixAt(skidN++ % 300, dummy.matrix); skid.instanceMatrix.needsUpdate = true;
}
export function addSiren(car, scene) {
  const mk = (c) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(3.4); scene.add(s); return s; };
  car.siren = { gR: mk(0xff2030), gB: mk(0x2060ff), ph: Math.random() * 6 }; sirens.add(car);
}
export function removeSiren(car) { if (car.siren) { car.siren.gR.removeFromParent(); car.siren.gB.removeFromParent(); } sirens.delete(car); }
export function updateEffects(dt) {
  for (const p of pool) if (p.life > 0) {
    p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; }
    if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vz *= k; p.vy *= k; }
    p.vy -= p.g * dt; p.s.material.rotation += p.spin * dt; if (p.c2) p.s.material.color.copy(p.c1).lerp(p.c2, Math.min(1, (1 - p.life / p.max) * 1.4));
    p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; p.size += p.grow * dt; p.s.scale.setScalar(p.size); p.s.material.opacity = p.op * (p.life / p.max) * (p.fin ? Math.min(1, (p.max - p.life) / p.fin) : 1);
  }
  if (flashT > 0) { flashT -= dt; flash.intensity = flashT > 0 ? 900 * (flashT / 0.6) ** 2 : 0; }
  for (const c of scorches) if (c.life > 0) { c.life -= dt; c.m.material.opacity = Math.min(1, c.life / 5); if (c.life <= 0) c.m.visible = false; }
  for (const t of tracers) if (t.life > 0) { t.life -= dt; if (t.life <= 0) t.m.visible = false; }
  G.shake = Math.max(0, G.shake - dt * 2.2); layoutFloaters(dt);
}
export function updateSirens(t) {
  for (const c of sirens) {
    if (c.dead || !c.mesh) continue; const s = c.siren, f = Math.floor((t * 5 + s.ph) % 2) === 0, a = Math.sin(c.heading), b = Math.cos(c.heading), h = c.type.roof + 0.25;
    s.gR.position.set(c.x + a * 0.2 + b * 0.5, h, c.z + b * 0.2 - a * 0.5); s.gB.position.set(c.x + a * 0.2 - b * 0.5, h, c.z + b * 0.2 + a * 0.5);
    s.gR.visible = f; s.gB.visible = !f; if (c.bar) { c.bar.r.material.color.setHex(f ? 0xff3040 : 0x401018).multiplyScalar(f ? 4 : 1); c.bar.b.material.color.setHex(f ? 0x101840 : 0x4080ff).multiplyScalar(f ? 1 : 4.5); }
  }
}

// Floating damage numbers with a hit marker, projected from world space onto a DOM overlay.
const floaters = []; let fxRoot;
export function floatText(x, y, z, text, kind = 'hit') {
  if (!fxRoot) { fxRoot = document.createElement('div'); fxRoot.id = 'fx'; document.body.appendChild(fxRoot); }
  const el = document.createElement('div'); el.className = 'dmg ' + kind; el.innerHTML = `<i class="hm"></i><b>${text}</b>`; fxRoot.appendChild(el);
  floaters.push({ el, x, y, z, t: 0, life: 0.9 }); if (floaters.length > 16) floaters.shift().el.remove();
}
export function layoutFloaters(dt) {
  const cam = G.camera; if (!cam) return; const v = new THREE.Vector3();
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.t += dt; if (f.t > f.life) { f.el.remove(); floaters.splice(i, 1); continue; }
    v.set(f.x, f.y + f.t * 1.2, f.z).project(cam); if (v.z > 1) { f.el.style.display = 'none'; continue; }
    f.el.style.display = ''; f.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px)`; f.el.style.opacity = String(Math.min(1, (f.life - f.t) * 3));
  }
}

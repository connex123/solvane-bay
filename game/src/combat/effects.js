// Visual effects: pooled sprite particles (sparks, smoke, fire, muzzle flashes), tracers, skid marks and siren lights.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { glowTex } from '../world/textureFactory.js';

const pool = []; let tracers = [], skid, skidN = 0, glow; const sirens = new Set();
const dummy = new THREE.Object3D();
export function initEffects(scene) {
  glow = glowTex();
  for (let i = 0; i < 160; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false })); s.visible = false; scene.add(s);
    pool.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 0, g: 0, size: 1, op: 1 });
  }
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1), new THREE.MeshBasicMaterial({ color: 0xffe8a0 })); m.visible = false; scene.add(m); tracers.push({ m, life: 0 });
  }
  const g = new THREE.PlaneGeometry(0.3, 1.1).rotateX(-Math.PI / 2);
  skid = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), 300);
  skid.frustumCulled = false; dummy.scale.set(0, 0, 0); dummy.updateMatrix(); for (let i = 0; i < 300; i++) skid.setMatrixAt(i, dummy.matrix); scene.add(skid);
}
export function particle(o) {
  const p = pool.find((q) => q.life <= 0); if (!p) return;
  p.life = p.max = o.life; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0; p.grow = o.grow || 0; p.g = o.g || 0; p.size = o.size; p.op = o.op ?? 1;
  p.s.position.set(o.x, o.y, o.z); p.s.material.color.set(o.color); p.s.material.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending; p.s.visible = true; p.s.scale.setScalar(o.size);
}
export const muzzleFlash = (x, y, z) => particle({ x, y, z, life: 0.07, size: 1.3, color: 0xffd070, add: true });
export function sparks(x, y, z, n = 6) { for (let i = 0; i < n; i++) particle({ x, y, z, vx: (Math.random() - .5) * 9, vy: Math.random() * 6, vz: (Math.random() - .5) * 9, g: 18, life: 0.5, size: 0.25, color: 0xffc060, add: true }); }
export const smoke = (x, y, z, c = 0x333333) => particle({ x, y, z, vx: (Math.random() - .5) * 1.5, vy: 2 + Math.random() * 2, vz: (Math.random() - .5) * 1.5, life: 1.6, size: 1.2, grow: 2.5, color: c, op: 0.7 });
export const tyreSmoke = (x, z) => particle({ x, y: 0.4, z, vx: (Math.random() - .5) * 1.2, vy: 0.6 + Math.random() * 0.8, vz: (Math.random() - .5) * 1.2, life: 1.4, size: 1.1, grow: 2.6, color: 0xf0e8f0, op: 0.55 });
export function explosion(x, y, z) {
  for (let i = 0; i < 18; i++) particle({ x, y: y + 0.5, z, vx: (Math.random() - .5) * 12, vy: Math.random() * 9, vz: (Math.random() - .5) * 12, life: 0.7, size: 3, grow: 4, color: 0xff8a2a, add: true });
  for (let i = 0; i < 12; i++) particle({ x, y: y + 1, z, vx: (Math.random() - .5) * 8, vy: 3 + Math.random() * 6, vz: (Math.random() - .5) * 8, life: 2, size: 3, grow: 4, color: 0x222222, op: 0.8 });
  sparks(x, y + 1, z, 14); G.shake = Math.max(G.shake, 1);
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
    p.vy -= p.g * dt; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; p.size += p.grow * dt; p.s.scale.setScalar(p.size); p.s.material.opacity = p.op * (p.life / p.max);
  }
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

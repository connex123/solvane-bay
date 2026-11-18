// Original low-poly car models: each body is an extruded, bevelled side profile with wheel arches, tapered in plan
// (narrower nose/tail, tumblehome greenhouse). Glossy clearcoat paint reflects a small procedural sky environment,
// glass is dark tinted, rims have spokes, and head/tail lights carry HDR colours so they bloom.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { canvasTex } from '../world/textureFactory.js';

export const CAR_TYPES = {
  veloce: { name: 'Veloce GT', len: 4.5, wid: 1.98, cab: [0.4, 0.38, -0.3], roof: 1.2, max: 62, acc: 24, grip: 7, steer: 0.62, hp: 900, tint: 0xe83a5c },
  marlin: { name: 'Marlin Sedan', len: 4.7, wid: 1.9, cab: [0.5, 0.5, -0.15], roof: 1.42, max: 40, acc: 15, grip: 8, steer: 0.6, hp: 1000, tint: 0x2f7fd8 },
  tupelo: { name: 'Tupelo Cab', len: 4.7, wid: 1.9, cab: [0.5, 0.5, -0.15], roof: 1.42, max: 40, acc: 15, grip: 8, steer: 0.6, hp: 1000, tint: 0xf6c21c },
  cadia: { name: 'Cadia Van', len: 5.1, wid: 2.0, cab: [0.34, 0.6, 0.55], roof: 2.05, max: 36, acc: 13, grip: 7, steer: 0.55, hp: 1200, tint: 0x2fb89a },
  hawke: { name: 'Hawke SUV', len: 4.9, wid: 2.0, cab: [0.62, 0.62, -0.1], roof: 1.78, max: 42, acc: 16, grip: 7.5, steer: 0.55, hp: 1300, tint: 0x222831 },
  rumble: { name: 'Rumble 69 Convertible', len: 4.8, wid: 1.95, cab: [0.42, 0.42, -0.25], roof: 1.15, max: 52, acc: 22, grip: 6, steer: 0.6, hp: 1000, tint: 0xff8a3d },
  pico: { name: 'Pico Compact', len: 3.8, wid: 1.75, cab: [0.5, 0.5, -0.1], roof: 1.5, max: 38, acc: 16, grip: 8, steer: 0.66, hp: 800, tint: 0x8fd3c8 },
  interceptor: { name: 'SBPD Interceptor', len: 4.8, wid: 1.95, cab: [0.46, 0.46, -0.15], roof: 1.44, max: 52, acc: 20, grip: 8, steer: 0.62, hp: 900, tint: 0xf7f8fa, police: true },
};
// Side profiles (z: rear -> front is -L/2 -> +L/2, y: height). top = front-to-rear outline of the painted body;
// cab = greenhouse outline (front base, roof front, roof rear, rear base); light heights; wheel radius.
const PROFILES = {
  veloce: { top: [[2.25, 0.4], [2.18, 0.6], [1.1, 0.78], [0.55, 0.84], [-1.65, 0.95], [-2.2, 0.93], [-2.25, 0.62]], cab: [[0.6, 0.83], [-0.2, 1.2], [-0.85, 1.19], [-1.8, 0.93]], hy: 0.55, ty: 0.8, r: 0.35, sport: true },
  sedan: { top: [[2.35, 0.48], [2.3, 0.8], [1.05, 0.92], [0.85, 0.95], [-1.55, 0.99], [-2.3, 0.96], [-2.35, 0.55]], cab: [[0.85, 0.94], [0.05, 1.42], [-1.0, 1.42], [-1.6, 0.98]], hy: 0.66, ty: 0.82, r: 0.36 },
  hawke: { top: [[2.45, 0.58], [2.4, 1.0], [1.3, 1.1], [1.1, 1.12], [-2.4, 1.16], [-2.45, 0.66]], cab: [[1.1, 1.1], [0.4, 1.78], [-2.2, 1.78], [-2.4, 1.16]], hy: 0.85, ty: 1.0, r: 0.4 },
  cadia: { top: [[2.55, 0.55], [2.5, 0.92], [1.95, 1.05], [1.8, 1.08], [0.55, 2.02], [-2.5, 2.04], [-2.55, 0.62]], cab: [[1.85, 1.05], [1.2, 1.9], [0.62, 1.92], [0.62, 1.05]], hy: 0.8, ty: 1.2, r: 0.38 },
  rumble: { top: [[2.4, 0.48], [2.35, 0.86], [0.75, 0.94], [-1.0, 0.94], [-2.35, 0.97], [-2.4, 0.55]], cab: null, hy: 0.68, ty: 0.82, r: 0.37 },
  pico: { top: [[1.9, 0.5], [1.85, 0.84], [1.15, 0.95], [0.85, 0.98], [-1.75, 1.0], [-1.9, 0.6]], cab: [[0.85, 0.97], [0.15, 1.5], [-1.45, 1.48], [-1.78, 1.0]], hy: 0.66, ty: 0.85, r: 0.32 },
};
PROFILES.marlin = PROFILES.tupelo = PROFILES.interceptor = PROFILES.sedan;

let envTex = null;
function env() { // tiny procedural sky (azure top, peach horizon, warm ground) prefiltered for glossy reflections
  if (envTex || !G.renderer) return envTex;
  try {
    const s = new THREE.Scene(), m = new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(vec3(1.6,1.1,0.75), vec3(0.25,0.5,1.1), pow(h,0.5)) : mix(vec3(0.55,0.45,0.4), vec3(0.18,0.16,0.16), min(1.0,-h*4.0)); float s = max(dot(normalize(vP), normalize(vec3(1.0,0.25,0.35))),0.0); c += vec3(6.0,4.5,3.0)*pow(s,200.0); gl_FragColor = vec4(c,1.0); }' });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12), m));
    const pm = new THREE.PMREMGenerator(G.renderer); envTex = pm.fromScene(s, 0.02).texture; pm.dispose();
  } catch (e) { envTex = null; }
  return envTex;
}

// Merge simple geometries into one non-indexed buffer, painting each part a flat (possibly HDR) colour.
function merge(parts) {
  const P = [], N = [], C = [];
  for (const [g0, col] of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position.array, n = g.attributes.normal.array, c = Array.isArray(col) ? col : new THREE.Color(col).toArray();
    for (let i = 0; i < p.length; i += 3) { P.push(p[i], p[i + 1], p[i + 2]); N.push(n[i], n[i + 1], n[i + 2]); C.push(c[0], c[1], c[2]); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeBoundingSphere(); return g;
}
const B = (w, h, d, x, y, z, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); return g.translate(x, y, z); };
const cyl = (r, w, x, y, z, seg = 14) => new THREE.CylinderGeometry(r, r, w, seg).rotateZ(Math.PI / 2).translate(x, y, z);

// Extrude a side profile across the car's width, then taper it in plan view.
function extrudeProfile(shape, width, taper) {
  const bt = 0.07, g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.1, width - bt * 2), bevelEnabled: true, bevelThickness: bt, bevelSize: 0.05, bevelSegments: 2, curveSegments: 6 });
  g.rotateY(-Math.PI / 2); g.translate(width / 2 - bt, 0, 0);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * taper(p.getY(i), p.getZ(i)));
  g.computeVertexNormals(); return g;
}
function bodyShape(pr, L) {
  const s = new THREE.Shape(), r = pr.r + 0.07, wz = L * 0.32, by = 0.26, top = pr.top;
  s.moveTo(top[0][0], by); for (const [z, y] of top) s.lineTo(z, y); s.lineTo(top[top.length - 1][0], by);
  s.lineTo(-wz - r, by); s.absarc(-wz, pr.r, r, Math.PI, 0, true); s.lineTo(wz - r, by); s.absarc(wz, pr.r, r, Math.PI, 0, true); s.lineTo(top[0][0], by);
  return s;
}
const polyShape = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const [z, y] of pts.slice(1)) s.lineTo(z, y); s.lineTo(pts[0][0], pts[0][1]); return s; };

const geoCache = {};
function build(key) {
  const t = CAR_TYPES[key], pr = PROFILES[key], W = t.wid, L = t.len, wz = L * 0.32, hl = L / 2;
  const plan = (z) => 1 - 0.1 * Math.pow(Math.min(1, Math.abs(z) / hl), 3);
  const paint = [extrudeProfile(bodyShape(pr, L), W, (y, z) => plan(z) * (1 - 0.05 * Math.max(0, Math.min(1, (y - 0.6) / 0.4))))];
  const glass = [], trim = [], lights = [];
  const DK = 0x141418, CH = [1.2, 1.2, 1.25], PLATE = 0xf4f4ee;
  if (pr.cab) {
    const [a, b2, c, d] = pr.cab, base = Math.min(a[1], d[1]), h = Math.max(b2[1], c[1]) - base;
    glass.push(extrudeProfile(polyShape(pr.cab), W * 0.84, (y) => 1 - 0.2 * Math.max(0, (y - base) / h)));
    const roofT = 0.06; // painted roof skin + pillars
    paint.push(extrudeProfile(polyShape([[b2[0] - 0.05, b2[1] - 0.02], [b2[0] - 0.02, b2[1] + roofT], [c[0] + 0.02, c[1] + roofT], [c[0] + 0.05, c[1] - 0.02]]), W * 0.7, () => 1));
    if (key === 'cadia') paint.push(extrudeProfile(polyShape([[0.62, 1.0], [0.55, 2.04], [-2.5, 2.06], [-2.55, 1.0]]), W, () => 1));
  } else { // convertible: raked windscreen in a frame, seats and roll hoops
    glass.push(B(W * 0.78, 0.42, 0.04, 0, 1.12, 0.62, -0.55)); trim.push([B(W * 0.8, 0.05, 0.08, 0, 1.31, 0.52, -0.55), DK]);
    for (const sx of [-0.42, 0.42]) { trim.push([B(0.55, 0.12, 0.6, sx, 0.8, -0.35), 0x5a2a1a], [B(0.55, 0.62, 0.14, sx, 1.05, -0.62, 0.15), 0x5a2a1a], [B(0.08, 0.4, 0.08, sx, 1.1, -0.95), CH]); }
    trim.push([B(W * 0.86, 0.06, 1.3, 0, 0.9, -0.2), 0x2a1a14]);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { // wheels: tyre, sidewall, spoked rim, hub
    const x = sx * (W / 2 - 0.15), z = sz * wz, ox = x + sx * 0.14;
    trim.push([cyl(pr.r, 0.3, x, pr.r, z, 16), 0x111113], [cyl(pr.r * 0.72, 0.02, ox, pr.r, z, 16), 0x2a2a2e], [cyl(pr.r * 0.66, 0.03, ox + sx * 0.005, pr.r, z, 16), [0.55, 0.57, 0.6]], [cyl(0.07, 0.05, ox + sx * 0.02, pr.r, z, 8), CH]);
    for (let k = 0; k < 5; k++) { const sp = new THREE.BoxGeometry(0.03, pr.r * 1.25, 0.07); sp.rotateX(k / 5 * Math.PI); sp.translate(ox + sx * 0.02, pr.r, z); trim.push([sp, CH]); }
    if (pr.sport) paint.push(B(0.12, 0.16, 0.95, sx * (W / 2 - 0.02), pr.r + 0.36, z)); // fender flare lip
  }
  const fz = pr.top[0][0], rz = pr.top[pr.top.length - 1][0], hy = pr.hy, ty = pr.ty;
  for (const sx of [-1, 1]) {
    lights.push([B(pr.sport ? 0.5 : 0.42, pr.sport ? 0.08 : 0.16, 0.12, sx * (W / 2 - 0.36), hy, fz + 0.01), [5, 4.7, 4.1]]); // headlights
    lights.push([B(0.22, 0.05, 0.1, sx * (W / 2 - 0.36), hy - 0.13, fz + 0.01), [3.2, 1.9, 0.6]]); // amber DRL
    trim.push([B(0.1, 0.09, 0.2, sx * (W / 2 + 0.04), pr.cab ? pr.cab[0][1] + 0.08 : 1.0, pr.cab ? pr.cab[0][0] - 0.2 : 0.5), DK]); // mirrors
  }
  if (pr.sport) {
    lights.push([B(W * 0.86, 0.06, 0.08, 0, ty - 0.04, rz - 0.05), [4.5, 0.25, 0.2]]); // full-width tail bar
    trim.push([B(W * 0.98, 0.05, 0.55, 0, 1.24, -1.95), DK]); for (const sx of [-0.55, 0.55]) trim.push([B(0.06, 0.3, 0.14, sx, 1.07, -1.95), DK]); // spoiler
    trim.push([B(W * 0.9, 0.06, 0.4, 0, 0.3, fz - 0.1), DK], [B(W * 0.86, 0.16, 0.1, 0, 0.36, rz + 0.03), DK]); // splitter, diffuser
    for (const sx of [-1, 1]) { trim.push([B(0.05, 0.16, 0.7, sx * (W / 2 - 0.0), 0.62, -0.75), DK]); for (const o of [0.12, 0.28]) trim.push([new THREE.CylinderGeometry(0.045, 0.05, 0.14, 10).rotateX(Math.PI / 2).translate(sx * o, 0.34, rz - 0.05), [0.35, 0.35, 0.38]]); }
    trim.push([B(0.7, 0.12, 0.06, 0, 0.5, fz - 0.02), DK]); // nose intake
  } else {
    for (const sx of [-1, 1]) lights.push([B(0.42, 0.2, 0.08, sx * (W / 2 - 0.32), ty - 0.08, rz - 0.05), [4.2, 0.22, 0.18]]);
    trim.push([B(W * 0.52, 0.2, 0.08, 0, hy - 0.02, fz - 0.03), DK], [B(W + 0.02, 0.18, 0.16, 0, 0.36, fz - 0.04), 0x2a2a30], [B(W + 0.02, 0.18, 0.16, 0, 0.36, rz + 0.04), 0x2a2a30]); // grille, bumpers
  }
  trim.push([B(0.5, 0.13, 0.03, 0, 0.44, rz - 0.01), PLATE]);
  if (key === 'interceptor') {
    trim.push([B(W * 0.7, 0.42, 0.12, 0, 0.55, fz + 0.12), DK], [B(0.12, 0.42, 0.1, 0, 0.55, fz + 0.06), DK]); // push bar
    trim.push([B(1.5, 0.08, 0.36, 0, t.roof + 0.0, -0.45), DK]); // light bar base
    lights.push([B(0.16, 0.08, 0.06, 0.4, hy + 0.02, fz + 0.18), [0.4, 0.8, 5]], [B(0.16, 0.08, 0.06, -0.4, hy + 0.02, fz + 0.18), [5, 0.4, 0.4]]); // grille strobes
  }
  return { paint: merge(paint.map((g) => [g, 0xffffff])), glass: merge(glass.map((g) => [g, 0xffffff])), trim: merge(trim), lights: merge(lights) };
}

// SBPD livery: navy lower panel, teal sweep, shield badge and lettering, drawn on a canvas decal.
let liveryTex = null, hoodTex = null, rearTex = null;
function livery() {
  liveryTex = liveryTex || canvasTex(512, 128, (g) => {
    g.clearRect(0, 0, 512, 128); g.fillStyle = '#16264a'; g.beginPath(); g.moveTo(0, 70); g.lineTo(512, 50); g.lineTo(512, 128); g.lineTo(0, 128); g.fill();
    g.fillStyle = '#1fb5b0'; g.beginPath(); g.moveTo(0, 58); g.lineTo(512, 36); g.lineTo(512, 48); g.lineTo(0, 70); g.fill();
    g.fillStyle = '#16264a'; g.font = 'bold 40px Arial Black, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('SBPD', 196, 22);
    g.fillStyle = '#ffffff'; g.font = 'bold 15px Arial, sans-serif'; g.fillText('SOLVANE BAY POLICE', 170, 100); g.fillText('DIAL 911', 40, 106);
    g.fillStyle = '#d8a53a'; g.beginPath(); g.moveTo(140, 6); g.lineTo(176, 6); g.lineTo(176, 26); g.quadraticCurveTo(158, 44, 140, 26); g.fill();
    g.fillStyle = '#16264a'; g.font = 'bold 13px Arial'; g.fillText('SB', 147, 19);
  }, false);
  hoodTex = hoodTex || canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.fillStyle = '#16264a'; g.font = 'bold 84px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SBPD', 128, 128); g.fillStyle = '#1fb5b0'; g.fillRect(20, 186, 216, 14); }, false);
  return { side: liveryTex, hood: hoodTex };
}
const taxiTex = () => canvasTex(256, 64, (g) => { g.fillStyle = '#fff6c8'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#1a1a1a'; g.font = 'bold 34px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAY CAB', 128, 34); }, false);

const matCache = {};
const shared = {};
function sharedMats() {
  if (shared.glass) return shared;
  const e = env();
  shared.glass = new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.05, metalness: 0.6, envMap: e, envMapIntensity: 0.85 });
  shared.trim = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3, envMap: e, envMapIntensity: 0.8 });
  shared.lights = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  return shared;
}
export function buildCarMesh(key, tint) {
  const g = geoCache[key] || (geoCache[key] = build(key)); const t = CAR_TYPES[key], m = sharedMats();
  const c = t.police ? t.tint : key === 'tupelo' ? t.tint : tint ?? t.tint;
  const mk = `${key}${c}`;
  const paint = matCache[mk] || (matCache[mk] = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMap: env(), envMapIntensity: 0.45 }));
  const grp = new THREE.Group(), a = new THREE.Mesh(g.paint, paint), gl = new THREE.Mesh(g.glass, m.glass), tr = new THREE.Mesh(g.trim, m.trim), li = new THREE.Mesh(g.lights, m.lights);
  a.castShadow = gl.castShadow = tr.castShadow = true; grp.add(a, gl, tr, li); grp.userData.bodyMesh = a;
  if (t.police) {
    const lv = livery();
    const sideLit = new THREE.MeshLambertMaterial({ map: lv.side, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const sx of [-1, 1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.72), sideLit); d.position.set(sx * (t.wid / 2 + 0.035), 0.66, 0.1); d.rotation.y = sx * Math.PI / 2; grp.add(d); }
    const hood = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshLambertMaterial({ map: lv.hood, transparent: true, depthWrite: false })); hood.rotation.x = -Math.PI / 2 + 0.06; hood.position.set(0, 0.965, 1.55); grp.add(hood);
    rearTex = rearTex || canvasTex(256, 80, (g) => { g.fillStyle = '#16264a'; g.fillRect(0, 0, 256, 80); g.fillStyle = '#1fb5b0'; g.fillRect(0, 62, 256, 8); g.fillStyle = '#ffffff'; g.font = 'bold 44px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SBPD', 128, 32); }, false);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.32), new THREE.MeshLambertMaterial({ map: rearTex })); rear.position.set(0, 0.62, -t.len / 2 - 0.075); rear.rotation.y = Math.PI; grp.add(rear);
    const bar = (col, x) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: col, toneMapped: false })); mm.position.set(x, t.roof + 0.12, -0.45); grp.add(mm); return mm; };
    grp.userData.bar = { r: bar(0xff3040, -0.38), b: bar(0x4080ff, 0.38) };
  }
  if (key === 'tupelo') { const s = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.26, 0.3), new THREE.MeshBasicMaterial({ map: taxiTex() })); s.position.set(0, t.roof + 0.18, -0.3); grp.add(s); }
  return grp;
}
export const CIVIL_TYPES = ['marlin', 'marlin', 'tupelo', 'tupelo', 'cadia', 'hawke', 'rumble', 'pico', 'pico', 'veloce'];
export const burntMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

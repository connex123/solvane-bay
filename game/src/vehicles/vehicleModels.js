// Original low-poly car models: each body is an extruded, bevelled side profile with real wheel arches, a tinted glass
// greenhouse, body-colour roof, spoked rims, HDR head/tail lights (bloom) and clearcoat paint lit by a sky environment map.
// The SBPD interceptor wears a canvas-drawn livery (white, navy skirt, teal stripe, SBPD decal) and a red/blue light bar.
import * as THREE from 'three';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { canvasTex } from '../world/textureFactory.js';
import { G } from '../core/gameState.js';

export const CAR_TYPES = {
  veloce: { name: 'Veloce GT', len: 4.5, wid: 1.95, roof: 1.2, max: 62, acc: 24, grip: 7, steer: 0.62, hp: 900, tint: 0xe83a5c },
  marlin: { name: 'Marlin Sedan', len: 4.7, wid: 1.9, roof: 1.45, max: 40, acc: 15, grip: 8, steer: 0.6, hp: 1000, tint: 0x2f7fd8 },
  tupelo: { name: 'Tupelo Cab', len: 4.7, wid: 1.9, roof: 1.45, max: 40, acc: 15, grip: 8, steer: 0.6, hp: 1000, tint: 0xf2c230 },
  cadia: { name: 'Cadia Pickup', len: 5.1, wid: 2.0, roof: 1.72, max: 38, acc: 14, grip: 7, steer: 0.55, hp: 1100, tint: 0x2fb89a },
  hawke: { name: 'Hawke SUV', len: 4.9, wid: 2.0, roof: 1.75, max: 42, acc: 16, grip: 7.5, steer: 0.55, hp: 1300, tint: 0x222831 },
  rumble: { name: 'Rumble 69', len: 4.8, wid: 1.95, roof: 1.32, max: 52, acc: 22, grip: 6, steer: 0.6, hp: 1000, tint: 0xff8a3d },
  surf: { name: 'Surfline Van', len: 5.0, wid: 2.0, roof: 2.08, max: 36, acc: 12, grip: 7, steer: 0.5, hp: 1300, tint: 0xf0f0f0 },
  pixie: { name: 'Pixie Hatch', len: 3.8, wid: 1.75, roof: 1.5, max: 40, acc: 16, grip: 8, steer: 0.68, hp: 800, tint: 0x8fd3c8 },
  riviera: { name: 'Riviera Spider', len: 4.7, wid: 1.9, roof: 1.22, max: 54, acc: 20, grip: 7, steer: 0.6, hp: 900, tint: 0xfff4e6 },
  interceptor: { name: 'SBPD Interceptor', len: 4.8, wid: 1.95, roof: 1.45, max: 52, acc: 20, grip: 8, steer: 0.62, hp: 900, tint: 0xffffff, police: true },
};
const SEDAN = { top: [[-0.5, 0.8], [-0.48, 0.96], [-0.3, 0.99], [-0.22, 0.99], [0.16, 0.96], [0.44, 0.86], [0.5, 0.76], [0.5, 0.38]], cab: [[-0.25, 0.98], [-0.12, 1.42], [0.08, 1.44], [0.19, 0.96]], wb: 0.3, r: 0.37, yb: 0.3, head: [0.72, 0.5], tail: 0.84 };
const PROFILES = {
  veloce: { top: [[-0.5, 0.72], [-0.49, 0.88], [-0.4, 0.92], [-0.31, 0.94], [-0.2, 0.9], [0.12, 0.86], [0.24, 0.83], [0.33, 0.82], [0.46, 0.62], [0.5, 0.5], [0.5, 0.36]], cab: [[-0.31, 0.9], [-0.11, 1.17], [0.02, 1.19], [0.16, 0.85]], wb: 0.31, r: 0.37, yb: 0.26, head: [0.58, 0.475], tail: 0.78, cw: 0.72 },
  rumble: { top: [[-0.5, 0.78], [-0.49, 0.95], [-0.3, 0.96], [-0.14, 0.96], [0.08, 0.94], [0.46, 0.9], [0.5, 0.82], [0.5, 0.38]], cab: [[-0.27, 0.95], [-0.12, 1.3], [0.04, 1.31], [0.13, 0.93]], wb: 0.31, r: 0.38, yb: 0.3, head: [0.76, 0.5], tail: 0.86 },
  marlin: SEDAN, tupelo: SEDAN, interceptor: SEDAN,
  hawke: { top: [[-0.5, 0.95], [-0.49, 1.12], [0.18, 1.12], [0.44, 1.04], [0.5, 0.92], [0.5, 0.45]], cab: [[-0.47, 1.11], [-0.44, 1.73], [0.06, 1.75], [0.23, 1.1]], wb: 0.31, r: 0.43, yb: 0.4, head: [0.9, 0.5], tail: 1.0 },
  cadia: { top: [[-0.5, 0.9], [-0.5, 1.12], [-0.02, 1.12], [0.2, 1.1], [0.44, 1.05], [0.5, 0.92], [0.5, 0.45]], cab: [[-0.03, 1.11], [-0.01, 1.7], [0.12, 1.72], [0.25, 1.09]], wb: 0.32, r: 0.43, yb: 0.4, head: [0.9, 0.5], tail: 1.0 },
  surf: { top: [[-0.5, 0.5], [-0.5, 2.0], [-0.46, 2.08], [0.22, 2.08], [0.36, 1.6], [0.48, 1.1], [0.5, 0.95], [0.5, 0.45]], cab: [[-0.42, 1.42], [-0.42, 1.86], [0.25, 2.0], [0.377, 1.58], [0.377, 1.42]], wide: true, wb: 0.32, r: 0.4, yb: 0.36, head: [0.85, 0.5], tail: 1.2 },
  pixie: { top: [[-0.5, 0.8], [-0.49, 1.0], [-0.44, 1.04], [0.14, 0.96], [0.42, 0.84], [0.5, 0.72], [0.5, 0.36]], cab: [[-0.46, 1.03], [-0.40, 1.48], [0.04, 1.5], [0.2, 0.95]], wb: 0.32, r: 0.34, yb: 0.28, head: [0.72, 0.49], tail: 0.92 },
  riviera: { top: [[-0.5, 0.76], [-0.49, 0.9], [-0.2, 0.92], [0.12, 0.9], [0.44, 0.78], [0.5, 0.68], [0.5, 0.34]], cab: [[0.07, 0.89], [-0.01, 1.22], [0.02, 1.22], [0.11, 0.89]], open: true, wb: 0.3, r: 0.37, yb: 0.28, head: [0.66, 0.49], tail: 0.82 },
};
const geoCache = {}, matCache = {};
const trimMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0b1622, metalness: 0.3, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x151518, roughness: 0.85 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.85, roughness: 0.25 });
const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.85, 2.5) });
const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.08, 0.06) });
const signMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 1.2) });

function ensureEnv() { // tiny sky environment (azure -> peach horizon, warm sun) prefiltered with PMREM for paint/glass reflections
  if (G.envTried || !G.renderer || !G.scene) return; G.envTried = true;
  try {
    const es = new THREE.Scene(), m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `varying vec3 vD; void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 c = h > 0.0 ? mix(vec3(1.0, 0.72, 0.5), vec3(0.18, 0.42, 0.9), pow(h, 0.5)) : mix(vec3(0.55, 0.45, 0.4), vec3(0.18, 0.16, 0.16), pow(-h, 0.4));
        float s = max(dot(d, normalize(vec3(1.0, 0.18, -0.2))), 0.0); c += vec3(6.0, 4.0, 2.2) * pow(s, 300.0) + vec3(0.9, 0.5, 0.25) * pow(s, 8.0);
        if (abs(h) < 0.12 && d.x < 0.3) c *= 0.55 + 0.45 * step(0.5, fract(atan(d.z, d.x) * 6.0)); gl_FragColor = vec4(c, 1.0); }` });
    es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
    const pm = new THREE.PMREMGenerator(G.renderer); G.scene.environment = pm.fromScene(es, 0.02, 0.1, 100).texture; pm.dispose();
  } catch (e) { console.warn('env map unavailable: ' + e.message); }
}
function liveryTex() {
  return canvasTex(512, 256, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 256);
    const yv = (y) => 256 * (1 - y / 1.6);
    g.fillStyle = '#14254a'; g.fillRect(0, yv(0.66), 512, yv(0) - yv(0.66));
    g.fillStyle = '#19c2b0'; g.fillRect(0, yv(0.74), 512, yv(0.67) - yv(0.74)); g.fillStyle = '#ffd23a'; g.fillRect(0, yv(0.765), 512, 3);
    g.fillStyle = '#14254a'; g.font = '900 46px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SBPD', 256, yv(0.88));
    g.fillStyle = '#ffffff'; g.font = 'bold 15px Arial, sans-serif'; g.fillText('SOLVANE BAY POLICE', 256, yv(0.5)); g.fillText('DIAL 311', 100, yv(0.5)); g.fillText('DIAL 311', 412, yv(0.5));
    g.fillStyle = '#14254a'; g.beginPath(); g.arc(150, yv(0.88), 16, 0, Math.PI * 2); g.arc(362, yv(0.88), 16, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(150, yv(0.88), 9, 0, Math.PI * 2); g.arc(362, yv(0.88), 9, 0, Math.PI * 2); g.fill();
  }, false);
}
function mergeGeos(list) {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g)); let n = 0; parts.forEach((p) => { n += p.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); o += p.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return g;
}
function extrude(pts, L, depth, bevel) {
  const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.05, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -Math.max(0.05, depth - 2 * bevel) / 2); g.rotateY(-Math.PI / 2); return g;
}
function bodyOutline(P, L) { // top profile (rear -> front) closed along the sills with arches cut around both wheels
  const pts = P.top.map(([u, y]) => [u * L, y]), wz = P.wb * L, ra = P.r + 0.07, wy = P.r, top = pts.slice();
  const topAt = (z) => { for (let i = 1; i < top.length; i++) { const [z0, y0] = top[i - 1], [z1, y1] = top[i]; if (z >= Math.min(z0, z1) && z <= Math.max(z0, z1) && z1 !== z0) return y0 + (y1 - y0) * (z - z0) / (z1 - z0); } return 9; };
  for (const c of [wz, -wz]) {
    pts.push([c + ra, P.yb]);
    for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI; const z = c + Math.cos(a) * ra; pts.push([z, Math.min(topAt(z) - 0.1, Math.max(P.yb, wy + Math.sin(a) * ra))]); }
    pts.push([c - ra, P.yb]);
  }
  pts.push([-0.5 * L, P.yb]); return pts;
}
function build(key) {
  const t = CAR_TYPES[key], P = PROFILES[key], L = t.len, W = t.wid, out = {};
  const body = extrude(bodyOutline(P, L), L, W, 0.09);
  // livery UVs: body sides read along the car on both flanks; every other face samples the plain white top of the livery
  const pa = body.attributes.position, na = body.attributes.normal, uv = new Float32Array(pa.count * 2);
  for (let i = 0; i < pa.count; i++) { const nx = na.getX(i), z = pa.getZ(i), y = pa.getY(i); if (Math.abs(nx) > 0.6) { uv[i * 2] = nx > 0 ? 0.5 - z / L : 0.5 + z / L; uv[i * 2 + 1] = y / 1.6; } else { uv[i * 2] = 0.5; uv[i * 2 + 1] = 0.985; } }
  body.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); out.body = body;
  const cabPts = P.cab.map(([u, y]) => [u * L, y]), cw = P.wide ? W + 0.03 : W * (P.cw || 0.78);
  out.glass = extrude(cabPts, L, cw, P.open ? 0.02 : 0.05);
  if (!P.open && !P.wide) { const [rb, rt, ft, fb] = cabPts, lp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; out.roof = extrude([lp(rt, rb, 0.16), rt, ft, lp(ft, fb, 0.12)], L, cw + 0.04, 0.03); }
  const T = newBuf(), wz = P.wb * L;
  pushBox(T, 0, P.yb - 0.04, P.top.at(-1)[0] * L - 0.02, W * 0.98, 0.26, 0.16, 0x1a1c20); pushBox(T, 0, P.yb - 0.04, -L / 2 + 0.04, W * 0.98, 0.24, 0.16, 0x1a1c20); // bumpers / diffuser
  pushBox(T, 0, P.yb + 0.08, L / 2 - 0.06, W * 0.46, 0.16, 0.1, 0x0c0d10); // grille
  for (const sx of [-1, 1]) { pushBox(T, sx * (W / 2 + 0.02), P.yb - 0.02, 0, 0.08, 0.12, wz * 2 - P.r * 2 - 0.2, 0x1a1c20); pushBox(T, sx * (cw / 2 + 0.12), P.cab[0][1] + 0.08, P.cab.at(-1)[0] * L - 0.25, 0.18, 0.12, 0.22, 0x1a1c20); }
  if (key === 'veloce') { for (const sx of [-0.6, 0.6]) pushBox(T, sx, 0.86, -L * 0.45, 0.07, 0.26, 0.14, 0x111111); pushBox(T, 0, 1.1, -L * 0.455, W * 0.96, 0.05, 0.42, 0x111111); for (const sx of [-1, 1]) pushBox(T, sx * 0.45, 0.62, L * 0.18, 0.5, 0.012, 0.9, 0x111111); }
  if (key === 'rumble') pushBox(T, 0, 0.92, L * 0.22, 0.6, 0.14, 1.0, 0x111111);
  if (key === 'cadia') pushBox(T, 0, 1.0, -L * 0.26, W - 0.22, 0.14, L * 0.44, 0x26282c);
  if (key === 'riviera') { pushBox(T, 0, 0.84, -L * 0.07, W - 0.3, 0.09, L * 0.26, 0x3a1f18); for (const sx of [-0.42, 0.42]) { pushBox(T, sx, 0.88, -L * 0.12, 0.6, 0.3, 0.5, 0xc89870); pushBox(T, sx, 0.9, -L * 0.17, 0.6, 0.62, 0.12, 0xc89870); } }
  if (key === 'surf') for (const sx of [-1, 1]) pushBox(T, sx * 0.62, 2.08, 0, 0.08, 0.1, L * 0.6, 0x2a2c30);
  if (t.police) { pushBox(T, 0, t.roof, 0, 1.3, 0.08, 0.36, 0x1a1c22); pushBox(T, 0, 0.3, L / 2 + 0.06, W * 0.7, 0.36, 0.08, 0x111216); }
  out.trim = toGeometry(T);
  const tires = [], rims = [], tw = 0.3;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (W / 2 - 0.16), z = sz * wz, ty = new THREE.CylinderGeometry(P.r, P.r, tw, 18); ty.rotateZ(Math.PI / 2); ty.translate(x, P.r, z); tires.push(ty);
    const disc = new THREE.CylinderGeometry(P.r * 0.66, P.r * 0.66, 0.04, 18); disc.rotateZ(Math.PI / 2); disc.translate(x + sx * (tw / 2 - 0.01), P.r, z); rims.push(disc);
    for (let k = 0; k < 5; k++) { const sp = new THREE.BoxGeometry(0.05, P.r * 1.22, 0.075); sp.rotateX(k / 5 * Math.PI * 2); sp.translate(x + sx * (tw / 2 + 0.02), P.r, z); rims.push(sp); }
    const hub = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8); hub.rotateZ(Math.PI / 2); hub.translate(x + sx * (tw / 2 + 0.03), P.r, z); rims.push(hub);
  }
  out.tires = mergeGeos(tires); out.rims = mergeGeos(rims);
  const hz = P.head[1] * L, [hy] = P.head, H = [], R = [];
  for (const sx of [-1, 1]) { const hl = new THREE.BoxGeometry(0.44, 0.11, 0.3); hl.translate(sx * (W / 2 - 0.32), hy, hz - 0.08); H.push(hl);
    const tl = new THREE.BoxGeometry(0.5, 0.12, 0.2); tl.translate(sx * (W / 2 - 0.3), P.tail, -L / 2 + 0.02); R.push(tl); }
  if (key === 'veloce' || key === 'riviera') { const strip = new THREE.BoxGeometry(W * 0.62, 0.05, 0.2); strip.translate(0, P.tail - 0.02, -L / 2 + 0.03); R.push(strip); }
  out.head = mergeGeos(H); out.tail = mergeGeos(R); return out;
}
function paint(key, c) {
  const mk = `${key}${c}`; if (matCache[mk]) return matCache[mk];
  const police = CAR_TYPES[key].police;
  return (matCache[mk] = new THREE.MeshPhysicalMaterial({ color: c, map: police ? (matCache.livery ||= liveryTex()) : null, metalness: police ? 0.05 : 0.25, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.65 }));
}
export function buildCarMesh(key, tint) {
  ensureEnv();
  const g = geoCache[key] || (geoCache[key] = build(key)); const t = CAR_TYPES[key], c = tint ?? t.tint, pm = paint(key, c);
  const grp = new THREE.Group(), a = new THREE.Mesh(g.body, pm); a.castShadow = true; grp.add(a); grp.userData.bodyMesh = a;
  const glass = new THREE.Mesh(g.glass, glassMat); glass.castShadow = true; grp.add(glass);
  if (g.roof) grp.add(new THREE.Mesh(g.roof, pm));
  const tr = new THREE.Mesh(g.trim, trimMat), ti = new THREE.Mesh(g.tires, tireMat), ri = new THREE.Mesh(g.rims, rimMat); ti.castShadow = true; grp.add(tr, ti, ri, new THREE.Mesh(g.head, headMat), new THREE.Mesh(g.tail, tailMat));
  if (key === 'tupelo') { const s = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.24, 0.3), signMat); s.position.set(0, t.roof + 0.12, -0.2); grp.add(s); }
  if (t.police) {
    const mk = (col, x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: col })); m.position.set(x, t.roof + 0.15, 0); grp.add(m); return m; };
    grp.userData.bar = { r: mk(new THREE.Color(5, 0.3, 0.35), -0.32), b: mk(new THREE.Color(0.3, 0.8, 6), 0.32) };
  }
  return grp;
}
export const CIVIL_TYPES = ['marlin', 'marlin', 'tupelo', 'cadia', 'hawke', 'rumble', 'veloce', 'surf', 'pixie', 'pixie', 'riviera'];
export const burntMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

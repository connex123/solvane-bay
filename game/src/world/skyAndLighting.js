// Golden-hour sky dome (azure zenith -> peach/gold horizon, HDR sun disc + halo that blooms), warm sun with soft shadows
// following the player, cool blue sky fill, peach distance fog and the full day/night colour ramp. The sun sets over the sea (east).
import * as THREE from 'three';
import { G } from '../core/gameState.js';

const KEYS = [ // sun elevation, zenith, horizon, sun colour, fog tint
  [-0.3, '#060a22', '#1a1a42', '#6a7fc0', '#1c1c3a'], [-0.05, '#1d2c6a', '#e0687a', '#ff7a5a', '#b06a78'], [0.05, '#1f5cc0', '#ffa878', '#ff9a50', '#f2b08e'],
  [0.16, '#2a6fd4', '#ffd0a0', '#ffc27a', '#f7cfae'], [0.4, '#3a86e2', '#ffe6c8', '#ffe2b8', '#f2dcc8'], [0.9, '#3f8fe8', '#cfeaff', '#fff4e0', '#d8e6f0'],
].map(([e, ...c]) => [e, ...c.map((h) => new THREE.Color(h))]);
const sunV = new THREE.Vector3(), fwd = new THREE.Vector3();
function ramp(e, idx, out) {
  let k = 0; while (k < KEYS.length - 2 && e > KEYS[k + 1][0]) k++;
  const a = KEYS[k], b = KEYS[k + 1], t = Math.max(0, Math.min(1, (e - a[0]) / (b[0] - a[0])));
  return out.copy(a[idx]).lerp(b[idx], t);
}
export const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(1, 0.1, 0) }, sunCol: { value: new THREE.Color() }, sunI: { value: 1 } };
export function createSky(scene) {
  const u = skyU; G.skyU = skyU;
  const mat = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunI; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); vec3 sd = normalize(sunDir); float h = d.y;
        float az = max(dot(normalize(d.xz + 1e-4), normalize(sd.xz + 1e-4)), 0.0); // 1 toward the sun's side of the sky
        vec3 horW = mix(hor, hor * vec3(1.08, 0.92, 0.78) + sunCol * 0.18, az * az);
        vec3 mid = mix(top, vec3(0.62, 0.82, 1.0), 0.6); float hh = clamp(h, 0.0, 1.0);
        vec3 c = hh < 0.16 ? mix(horW, mid, smoothstep(0.0, 1.0, hh / 0.16)) : mix(mid, top, pow((hh - 0.16) / 0.84, 0.7));
        c = mix(c, mix(top, horW, 0.55) * 1.05, smoothstep(0.0, 0.1, h) * (1.0 - smoothstep(0.1, 0.45, h)) * 0.25);
        c = mix(c, horW * 0.92, clamp(-h * 4.0, 0.0, 1.0));
        float s = max(dot(d, sd), 0.0);
        c += sunCol * sunI * (smoothstep(0.99935, 0.9996, s) * 26.0 + pow(s, 900.0) * 6.0 + pow(s, 60.0) * 0.7 + pow(s, 8.0) * 0.22);
        gl_FragColor = vec4(c, 1.0); }` });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 20), mat); dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome);
  const sun = new THREE.DirectionalLight(0xffb070, 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -90; sc.right = sc.top = 90; sc.near = 1; sc.far = 520; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.35; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0x9cc4ff, 0xc89a78, 1.0); scene.add(hemi);
  const amb = new THREE.AmbientLight(0xfff0e0, 0.18); scene.add(amb);
  scene.fog = new THREE.Fog(0xf7cfae, 180, 900);
  const dir = new THREE.Vector3(), fogC = new THREE.Color(), cool = new THREE.Color(0x8fb8ff);
  return {
    sun, hemi,
    update(clock, focus, camera) {
      const e = Math.sin((clock - 6) / 24 * Math.PI * 2), ang = (clock - 6) / 12 * Math.PI;
      const az = G.sunAz ?? 0.06; // sun azimuth: sets over the sea, slightly north of the east-west boulevards
      u.sunDir.value.set(-Math.cos(ang) * Math.cos(az), Math.max(0.035, Math.sin(ang)) - (e < 0 ? 0.3 : 0), Math.cos(ang) * Math.sin(az)).normalize();
      dir.copy(u.sunDir.value); if (e < 0.02) dir.set(Math.cos(ang) * 0.5, 0.6, -0.3).normalize();
      dir.y = Math.max(dir.y, 0.2); dir.normalize(); // keep shadows long but readable
      ramp(e, 1, u.top.value); ramp(e, 2, u.hor.value); ramp(e, 3, u.sunCol.value); ramp(e, 4, fogC); u.sunI.value = e < -0.02 ? 0.3 : 1;
      scene.fog.color.copy(fogC);
      if (G.mode === 'title') { scene.fog.near = 320; scene.fog.far = 1600; } else { scene.fog.near = 180; scene.fog.far = 900; }
      for (const hm of G.hillMats || []) hm.color.setScalar(Math.max(0.3, Math.min(1, 0.45 + (e + 0.1) * 1.6)));
      const day = Math.max(0.2, Math.min(1, (e + 0.08) * 5));
      sun.color.copy(u.sunCol.value); sun.intensity = e < 0 ? 0.45 : Math.min(3.0, 2.2 + e * 2.5);
      hemi.color.copy(cool).lerp(u.top.value, 0.35); hemi.groundColor.copy(u.hor.value).multiplyScalar(0.7); hemi.intensity = 0.35 + day * 1.0; amb.intensity = 0.3 + day * 0.4;
      sun.position.set(focus.x + dir.x * 170, dir.y * 170, focus.z + dir.z * 170); sun.target.position.set(focus.x, 0, focus.z);
      dome.position.copy(camera.position);
      sunV.copy(u.sunDir.value).multiplyScalar(600).add(camera.position).project(camera); camera.getWorldDirection(fwd); const fa = fwd.dot(u.sunDir.value);
      G.sunScreen = sunV.z < 1 && fa > 0.55 && e > -0.02 ? { x: (sunV.x * 0.5 + 0.5) * innerWidth, y: (-sunV.y * 0.5 + 0.5) * innerHeight, a: Math.min(0.5, (fa - 0.55) * 1.6) } : null;
      if (G.buildingMat) G.buildingMat.emissiveIntensity = Math.max(0.12, Math.min(1.6, 1.0 - e * 4.5));
      if (G.lampMat) G.lampMat.color.setScalar(e < 0.08 ? 3.2 : 1.1);
    },
  };
}

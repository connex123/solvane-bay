// Sunset sky dome, sun/moon light with a shadow box following the player, fog and the day/night colour ramp.
import * as THREE from 'three';
import { G } from '../core/gameState.js';

const KEYS = [ // sun elevation, top, horizon, sun colour
  [-0.3, '#070b24', '#1a1740', '#6a7fc0'], [-0.05, '#2a2160', '#c14f7a', '#ff7a5a'], [0.08, '#5a4a9e', '#ff7f6e', '#ff9a55'],
  [0.25, '#5a8ed8', '#ffc08e', '#ffc080'], [0.8, '#3f8fe8', '#bfe4ff', '#fff4e0'],
].map(([e, a, b, c]) => [e, new THREE.Color(a), new THREE.Color(b), new THREE.Color(c)]);
const tmpA = new THREE.Color();
function ramp(e, idx, out) {
  let k = 0; while (k < KEYS.length - 2 && e > KEYS[k + 1][0]) k++;
  const a = KEYS[k], b = KEYS[k + 1], t = Math.max(0, Math.min(1, (e - a[0]) / (b[0] - a[0])));
  return out.copy(a[idx]).lerp(b[idx], t);
}
export function createSky(scene) {
  const u = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(1, 0.1, 0) }, sunCol: { value: new THREE.Color() } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y; vec3 c = mix(hor, top, pow(clamp(h,0.0,1.0), 0.45));
        c = mix(c, hor*0.7, clamp(-h*3.0,0.0,1.0)); float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunCol * (pow(s, 600.0) * 3.0 + pow(s, 24.0) * 0.45 + pow(s, 4.0) * 0.18); gl_FragColor = vec4(c, 1.0); }` });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 24, 16), mat); dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome);
  const sun = new THREE.DirectionalLight(0xffa060, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -95; sc.right = sc.top = 95; sc.near = 1; sc.far = 500; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.4;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffb0a0, 0x6b4a58, 0.9); scene.add(hemi);
  scene.fog = new THREE.Fog(0xff9a7a, 140, 720);
  const dir = new THREE.Vector3();
  return {
    update(clock, focus, camera) {
      const e = Math.sin((clock - 6) / 24 * Math.PI * 2), ang = (clock - 6) / 12 * Math.PI;
      dir.set(Math.cos(ang), Math.max(0.03, Math.sin(ang)) , 0.35).normalize();
      if (e < 0.02) dir.set(-Math.cos(ang) * 0.5, 0.6, -0.3).normalize();
      ramp(e, 1, u.top.value); ramp(e, 2, u.hor.value); ramp(e, 3, u.sunCol.value);
      u.sunDir.value.set(Math.cos(ang), Math.max(0.03, Math.sin(ang)) * 0.8 - (e < 0 ? 0.3 : 0), 0.35).normalize();
      scene.fog.color.copy(u.hor.value); if (e < 0.0) scene.fog.color.multiplyScalar(0.8);
      const day = Math.max(0.28, Math.min(1, (e + 0.08) * 5));
      sun.color.copy(u.sunCol.value); sun.intensity = e < 0 ? 0.55 : Math.min(2.4, 0.9 + e * 5) * (e < 0.04 ? 0.8 : 1);
      hemi.color.copy(u.hor.value).lerp(u.top.value, 0.4); hemi.intensity = 0.35 + day * 0.65;
      sun.position.set(focus.x + dir.x * 160, dir.y * 160, focus.z + dir.z * 160); sun.target.position.set(focus.x, 0, focus.z);
      dome.position.copy(camera.position);
      if (G.buildingMat) G.buildingMat.emissiveIntensity = Math.max(0.05, Math.min(1.1, 0.95 - e * 3.5));
    },
  };
}

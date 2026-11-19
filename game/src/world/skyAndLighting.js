// Teal-and-coral sky dome (palette from render/colourScript.js), sun/moon light with a shadow box following the player, fog and the day/night colour ramp.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { currentGrade } from '../render/colourScript.js';

// The sun's path is turned south of the bay's east-west avenues so it sets over the sea beside the Causeway, not dead ahead.
const SUN_YAW = 0.35, CY = Math.cos(SUN_YAW), SY = Math.sin(SUN_YAW);
const yaw = (v) => v.set(v.x * CY + v.z * SY, v.y, -v.x * SY + v.z * CY);

const KEYS = [ // sun elevation, zenith, horizon, sun colour
  [-0.3, '#060a26', '#1c1a48', '#6a7fc0'], [-0.05, '#1d2a70', '#d0607a', '#ff7a5a'], [0.08, '#1d55c0', '#ffa070', '#ffa050'],
  [0.25, '#1f63d0', '#ffd0a0', '#ffd090'], [0.8, '#2a78e0', '#cfe8ff', '#fff4e0'],
].map(([e, a, b, c]) => [e, new THREE.Color(a), new THREE.Color(b), new THREE.Color(c)]);
const tmpA = new THREE.Color(), sunV = new THREE.Vector3(), fwd = new THREE.Vector3();
function ramp(e, idx, out) {
  let k = 0; while (k < KEYS.length - 2 && e > KEYS[k + 1][0]) k++;
  const a = KEYS[k], b = KEYS[k + 1], t = Math.max(0, Math.min(1, (e - a[0]) / (b[0] - a[0])));
  return out.copy(a[idx]).lerp(b[idx], t);
}
export function createSky(scene) {
  const u = { mHor: { value: new THREE.Color() }, mBand: { value: new THREE.Color() }, mSky: { value: new THREE.Color() }, mZen: { value: new THREE.Color() }, magic: { value: 0 }, top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(1, 0.1, 0) }, sunCol: { value: new THREE.Color() } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 mHor, mBand, mSky, mZen; uniform float magic; uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y; float s = max(dot(d, normalize(sunDir)), 0.0);
        vec3 mid = mix(top, vec3(0.55, 0.86, 0.9), 0.55);
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h)); c = mix(c, top, smoothstep(0.12, 0.75, h));
        // the act's sky: coral/amber horizon, a warm band, turquoise sky and deep teal overhead, hotter toward the sun
        vec3 mh = mix(mHor, mBand, smoothstep(0.0, 0.1, h)); mh = mix(mh, mSky, smoothstep(0.08, 0.42, h)); mh = mix(mh, mZen, smoothstep(0.42, 1.0, h));
        mh = mix(mh, vec3(1.0, 0.7, 0.34), pow(s, 4.0) * (1.0 - smoothstep(0.0, 0.45, h)) * 0.7);
        c = mix(c, mh, magic);
        c = mix(c, sunCol * 1.05, pow(s, 6.0) * (1.0 - smoothstep(0.0, 0.5, h)) * 0.55);
        c = mix(c, hor * 0.75, clamp(-h * 3.0, 0.0, 1.0));
        c += vec3(1.0, 0.92, 0.75) * smoothstep(0.99935, 0.99955, s) * 5.0 + sunCol * (pow(s, 300.0) * 0.8 + pow(s, 30.0) * 0.35 + pow(s, 5.0) * 0.1);
        gl_FragColor = vec4(c, 1.0); }` });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 24, 16), mat); dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome);
  const sun = new THREE.DirectionalLight(0xffb070, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 3;
  const sc = sun.shadow.camera; sc.left = sc.bottom = -95; sc.right = sc.top = 95; sc.near = 1; sc.far = 500; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.4;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0x9cdcd8, 0xc89878, 1.0); scene.add(hemi);
  scene.fog = new THREE.Fog(0xffc49a, 180, 950);
  const dir = new THREE.Vector3();
  return {
    update(clock, focus, camera) {
      const e = Math.sin((clock - 6) / 24 * Math.PI * 2), ang = (clock - 6) / 12 * Math.PI;
      dir.set(-Math.cos(ang), Math.max(0.03, Math.sin(ang)) * 0.7 + 0.32, 0.12).normalize();
      if (e < 0.02) dir.set(-Math.cos(ang) * 0.5, 0.6, -0.3).normalize();
      yaw(dir); const gr = currentGrade(); u.mHor.value.copy(gr.horizon); u.mBand.value.copy(gr.band); u.mSky.value.copy(gr.sky); u.mZen.value.copy(gr.zenith);
      ramp(e, 1, u.top.value); ramp(e, 2, u.hor.value); ramp(e, 3, u.sunCol.value);
      // magic hour peaks while the sun sits low (about 16:45-18:30); shot scenes may force it with G.magicForce
      const mg = G.magicForce ?? Math.max(0, Math.min(1, (e + 0.06) / 0.1, (0.36 - e) / 0.14)); G.magic = mg; u.magic.value = mg;
      yaw(u.sunDir.value.set(-Math.cos(ang), Math.max(0.03, Math.sin(ang)) * 0.62 - (e < 0 ? 0.3 : 0), -0.03)).normalize();
      scene.fog.color.copy(u.hor.value).lerp(tmpA.set('#ffe2c4'), e > 0 ? 0.35 : 0).lerp(gr.fog, mg * 0.6); if (e < 0.0) scene.fog.color.multiplyScalar(0.8);
      if (G.mode === 'title') { scene.fog.near = 300; scene.fog.far = 1500; } else { scene.fog.near = 180; scene.fog.far = 950; }
      for (const hm of G.hillMats || []) hm.color.setScalar((G.mode === 'title' ? 1 : 0.78) * Math.max(0.35, Math.min(1, 0.45 + (e + 0.1) * 1.4)));
      const day = Math.max(0.28, Math.min(1, (e + 0.08) * 5));
      sun.color.copy(u.sunCol.value).lerp(tmpA.set('#ffa850'), mg * 0.5); sun.intensity = e < 0 ? 0.55 : Math.min(3.4, 1.6 + e * 9) * (e < 0.04 ? 0.8 : 1);
      hemi.color.copy(u.top.value).lerp(tmpA.set('#d8e8ff'), 0.55); hemi.intensity = 0.4 + day * 1.0; hemi.color.lerp(gr.hemiSky, mg * 0.6); hemi.groundColor.set(0xc89878).lerp(gr.hemiGround, mg * 0.6); // teal fill: shadows go teal, never purple
      sun.position.set(focus.x + dir.x * 160, dir.y * 160, focus.z + dir.z * 160); sun.target.position.set(focus.x, 0, focus.z);
      dome.position.copy(camera.position);
      sunV.copy(u.sunDir.value).multiplyScalar(600).add(camera.position).project(camera); camera.getWorldDirection(fwd); const fa = fwd.dot(u.sunDir.value);
      G.sunScreen = sunV.z < 1 && fa > 0.45 && e > -0.02 ? { x: (sunV.x * 0.5 + 0.5) * innerWidth, y: (-sunV.y * 0.5 + 0.5) * innerHeight, a: Math.min(0.9, (fa - 0.45) * 2.2) } : null;
      if (G.buildingMat) G.buildingMat.emissiveIntensity = Math.max(0.04, Math.min(1.1, 0.75 - e * 4.6)); if (G.glassMat) G.glassMat.emissiveIntensity = G.buildingMat.emissiveIntensity * 0.8;
      if (G.lampMat) G.lampMat.color.setScalar(e > 0.2 ? 1 : 3.2);
    },
  };
}

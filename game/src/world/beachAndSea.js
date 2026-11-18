// Ground, beach strip with umbrellas, animated sea, marina piers with boats, distant hills and port cranes.
import * as THREE from 'three';
import { HALF, SEA_X, lineCoord } from '../core/config.js';
import { newBuf, pushBox, toGeometry } from '../core/geometryUtils.js';
import { G } from '../core/gameState.js';
import { sandTex } from './textureFactory.js';
import { skyU } from './skyAndLighting.js';

let seaU = null;
export function buildBeachAndSea(scene, rng) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xb8b48a }));
  ground.position.y = -0.05; ground.receiveShadow = true; scene.add(ground);
  const st = sandTex(); st.repeat.set(12, 240);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(SEA_X - HALF + 6, 2000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: st }));
  sand.position.set((SEA_X + HALF - 6) / 2, 0.0, 0); sand.receiveShadow = true; scene.add(sand);
  // Sea: own shader with layered sine-wave normals, sky reflection (fresnel), HDR sun glitter path that blooms, shore foam and haze.
  seaU = { ...skyU, time: { value: 0 }, fogC: { value: scene.fog ? scene.fog.color : new THREE.Color(0xf7cfae) }, shoreX: { value: SEA_X } };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: seaU, toneMapped: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunI; uniform float time; uniform vec3 fogC; uniform float shoreX; varying vec3 vW;
      void main(){ vec2 p = vW.xz; float t = time;
        vec2 g = vec2(0.0);
        g += vec2(0.8, 0.3) * cos(dot(p, vec2(0.11, 0.04)) + t * 1.1) * 0.09; g += vec2(-0.3, 0.9) * cos(dot(p, vec2(-0.05, 0.16)) + t * 1.4) * 0.07;
        g += vec2(0.6, -0.7) * cos(dot(p, vec2(0.31, -0.27)) + t * 2.1) * 0.05; g += vec2(0.2, 1.0) * cos(dot(p, vec2(0.7, 0.55)) + t * 2.9) * 0.035;
        g += vec2(1.0, 0.1) * cos(dot(p, vec2(1.3, -0.4)) + t * 3.7) * 0.025;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y)); vec3 v = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
        n = normalize(mix(n, vec3(0.0, 1.0, 0.0), clamp(dist / 900.0, 0.0, 0.85)));
        vec3 r = reflect(-v, n); r.y = abs(r.y);
        vec3 sky = mix(hor, top, pow(clamp(r.y, 0.0, 1.0), 0.5));
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        float shore = clamp((vW.x - shoreX) / 60.0, 0.0, 1.0);
        vec3 water = mix(vec3(0.10, 0.62, 0.66), vec3(0.03, 0.22, 0.42), shore);
        vec3 c = mix(water * (0.55 + 0.45 * sunI), sky, clamp(fres * 1.1, 0.0, 0.9));
        vec3 sd = normalize(sunDir); float sp = max(dot(r, sd), 0.0);
        c += sunCol * sunI * (pow(sp, 900.0) * 30.0 + pow(sp, 120.0) * 2.2 + pow(sp, 14.0) * 0.18);
        float foam = smoothstep(0.0, 1.0, 1.0 - (vW.x - shoreX) / 5.0) * (0.55 + 0.45 * sin(vW.z * 0.35 + t * 1.6 + sin(vW.z * 0.07) * 4.0));
        c = mix(c, vec3(1.0, 0.98, 0.94), clamp(foam, 0.0, 0.85) * step(shoreX - 1.0, vW.x));
        float fogF = smoothstep(260.0, 1500.0, dist); c = mix(c, fogC * 1.02, fogF * 0.9);
        gl_FragColor = vec4(c, 1.0); }` }));
  sea.position.set(SEA_X + 1800, 0.03, 0); sea.frustumCulled = false; scene.add(sea);
  const B = newBuf(); // piers, boats, umbrellas, huts, cranes
  for (let k = 0; k < 4; k++) {
    const z = lineCoord(0) + 40 + k * 64; pushBox(B, SEA_X + 4, -0.1, z, 70, 0.6, 4, 0x9a7650);
    for (let b = 0; b < 4; b++) { const bz = z + (b % 2 ? 4.5 : -4.5), bx = SEA_X - 10 + b * 14, c = rng.pick([0xffffff, 0xf4a6a0, 0x8fd3c8, 0xf6e3b4]);
      pushBox(B, bx, 0, bz, 9, 1.3, 3, c); pushBox(B, bx - 1, 1.3, bz, 3, 1.1, 2, 0xf8f8f8); pushBox(B, bx + 1, 1.3, bz, 0.2, 7, 0.2, 0xdddddd); }
  }
  for (let k = 0; k < 26; k++) { const x = HALF + rng.range(10, 36), z = rng.range(-HALF + 20, HALF); const c = rng.pick([0xff5a7a, 0x2fc4b2, 0xffb02e, 0xffffff]);
    pushBox(B, x, 0, z, 0.12, 2.4, 0.12, 0xeeeeee); pushBox(B, x, 2.3, z, 2.8, 0.3, 2.8, c); pushBox(B, x + 2.2, 0.05, z, 0.9, 0.12, 2.0, 0xffe9c0); }
  pushBox(B, HALF + 22, 0, lineCoord(6) + 10, 5, 3, 5, 0xf2f0e8); pushBox(B, HALF + 22, 3, lineCoord(6) + 10, 6, 0.4, 6, 0xff5a7a);
  for (let k = 0; k < 3; k++) { const x = lineCoord(1) + k * 90, z = lineCoord(0) + 20;
    for (const dx of [-8, 8]) pushBox(B, x + dx, 0, z, 1.2, 30, 1.2, 0xe8a030); pushBox(B, x, 28, z, 20, 1.5, 1.5, 0xe8a030); pushBox(B, x, 26, z + 14, 1.5, 1.5, 28, 0xe8a030); }
  const m = new THREE.Mesh(toGeometry(B), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; scene.add(m);
  // Smooth layered coastal hills: rounded ridgelines (sum of sines), pale far layers fading into the haze.
  const LAYERS = [[860, 330, 0xb8bedc, 0xf2d0bc], [740, 250, 0x93a8cc, 0xe0c4b4], [650, 175, 0x6f9aa8, 0xc8bea0], [590, 105, 0x4f8f58, 0x9cb47e]];
  LAYERS.forEach(([r, H, top, low], li) => {
    const N = 160, pos = [], col = [], idx = [], ct = new THREE.Color(top), cl = new THREE.Color(low), ph = [rng() * 6, rng() * 6, rng() * 6];
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = Math.PI * (0.32 + 1.36 * u), taper = Math.pow(Math.sin(u * Math.PI), 0.6);
      const w = 0.55 + 0.25 * Math.sin(a * 3 + ph[0]) + 0.14 * Math.sin(a * 7 + ph[1]) + 0.06 * Math.sin(a * 13 + ph[2]), h = Math.max(6, H * w * taper);
      const x = Math.cos(a) * r, z = Math.sin(a) * r; pos.push(x, -4, z, x, h, z); col.push(cl.r, cl.g, cl.b, ct.r, ct.g, ct.b);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const hmat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }); (G.hillMats ||= []).push(hmat); const m = new THREE.Mesh(g, hmat); m.frustumCulled = false; m.renderOrder = -5 + li; scene.add(m);
  });
}
export function animateSea(t) { if (seaU) seaU.time.value = t; }

// Hand-written post-processing chain: HDR scene target (MSAA) -> soft bright-pass -> separable gaussian bloom at 1/2 and 1/4
// resolution -> composite with ACES filmic tone mapping, warm golden-hour grade, vignette and a speed-driven chromatic fringe.
// Falls back to plain renderer output (with the renderer's own ACES) if any target or shader fails.
import * as THREE from 'three';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BRIGHT = `uniform sampler2D tSrc; uniform float threshold; uniform float knee; varying vec2 vUv;
  void main(){ vec2 px = vec2(dFdx(vUv.x), dFdy(vUv.y)) * 0.5;
    vec3 c = (texture2D(tSrc, vUv + vec2(-px.x, -px.y)).rgb + texture2D(tSrc, vUv + vec2(px.x, -px.y)).rgb + texture2D(tSrc, vUv + vec2(-px.x, px.y)).rgb + texture2D(tSrc, vUv + px).rgb) * 0.25;
    c = min(c, vec3(24.0)); float l = max(c.r, max(c.g, c.b)); float s = clamp(l - threshold + knee, 0.0, 2.0 * knee); s = s * s / (4.0 * knee + 1e-4);
    float w = max(s, l - threshold) / max(l, 1e-4); gl_FragColor = vec4(c * w, 1.0); }`;
const BLUR = `uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270;
    c += (texture2D(tSrc, vUv + dir * 1.3846153).rgb + texture2D(tSrc, vUv - dir * 1.3846153).rgb) * 0.3162162;
    c += (texture2D(tSrc, vUv + dir * 3.2307692).rgb + texture2D(tSrc, vUv - dir * 3.2307692).rgb) * 0.0702702; gl_FragColor = vec4(c, 1.0); }`;
const COPY = 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }';
const COMPOSITE = `uniform sampler2D tScene; uniform sampler2D tBloomA; uniform sampler2D tBloomB; uniform float exposure; uniform float bloom;
  uniform float fringe; uniform float vig; uniform vec3 warm; uniform float sat; varying vec2 vUv;
  vec3 aces(vec3 x){ // fitted ACES RRT+ODT (Hill), applied in linear space
    const mat3 i = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
    const mat3 o = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
    x = i * x; vec3 a = x * (x + 0.0245786) - 0.000090537; vec3 b = x * (0.983729 * x + 0.4329510) + 0.238081; return clamp(o * (a / b), 0.0, 1.0); }
  vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main(){ vec2 d = vUv - 0.5; float r2 = dot(d, d);
    vec3 c; if (fringe > 0.001) { vec2 o = d * fringe * r2 * 0.022; c = vec3(texture2D(tScene, vUv + o).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - o).b); }
    else c = texture2D(tScene, vUv).rgb;
    c += (texture2D(tBloomA, vUv).rgb * 0.55 + texture2D(tBloomB, vUv).rgb * 0.75) * bloom;
    c = aces(c * exposure * warm);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = max(mix(vec3(l), c, sat), 0.0);
    c = mix(c * vec3(0.96, 0.99, 1.06), c, smoothstep(0.0, 0.35, l)); // cool the deep shadows a touch, keep highlights warm
    c *= 1.0 - vig * smoothstep(0.18, 0.75, r2 * 1.6);
    gl_FragColor = vec4(toSRGB(c), 1.0); }`;

export function createPost(renderer, opts = {}) {
  const gl = renderer.getContext(), isGL2 = renderer.capabilities.isWebGL2;
  const floatOK = isGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  const type = floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const mk = (w, h, samples = 0) => new THREE.WebGLRenderTarget(w, h, { type, samples, depthBuffer: samples > 0 || w < 0, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const size = new THREE.Vector2(); renderer.getDrawingBufferSize(size);
  const sceneRT = new THREE.WebGLRenderTarget(size.x, size.y, { type, samples: isGL2 ? (opts.samples ?? 4) : 0, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  const half = [mk(1, 1), mk(1, 1)], quarter = [mk(1, 1), mk(1, 1)];
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), qs = new THREE.Scene(); quad.frustumCulled = false; qs.add(quad);
  const sm = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
  const bright = sm(BRIGHT, { tSrc: { value: null }, threshold: { value: 1.7 }, knee: { value: 0.7 } });
  const blur = sm(BLUR, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
  const copy = sm(COPY, { tSrc: { value: null } });
  const comp = sm(COMPOSITE, { tScene: { value: sceneRT.texture }, tBloomA: { value: half[0].texture }, tBloomB: { value: quarter[0].texture }, exposure: { value: 1.0 }, bloom: { value: 0.55 },
    fringe: { value: 0 }, vig: { value: 0.32 }, warm: { value: new THREE.Vector3(1.04, 1.0, 0.93) }, sat: { value: 1.12 } });
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(qs, cam); };
  const blurPair = (rt, n) => { const w = rt[0].width, h = rt[0].height; for (let k = 0; k < n; k++) { const s = 1 + k * 0.5;
    blur.uniforms.tSrc.value = rt[0].texture; blur.uniforms.dir.value.set(s / w, 0); pass(blur, rt[1]);
    blur.uniforms.tSrc.value = rt[1].texture; blur.uniforms.dir.value.set(0, s / h); pass(blur, rt[0]); } };
  function setSize(w, h) { sceneRT.setSize(w, h); const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1); half.forEach((r) => r.setSize(hw, hh)); quarter.forEach((r) => r.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2))); }
  setSize(size.x, size.y);
  const post = {
    enabled: true, ok: true, params: comp.uniforms, threshold: bright.uniforms.threshold, hdr: floatOK,
    setSize(w, h) { renderer.getDrawingBufferSize(size); setSize(size.x, size.y); },
    render(scene, camera, fx = {}) {
      if (!post.enabled || !post.ok) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
      try {
        const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
        renderer.setRenderTarget(sceneRT); renderer.render(scene, camera);
        bright.uniforms.tSrc.value = sceneRT.texture; pass(bright, half[0]); blurPair(half, 2);
        copy.uniforms.tSrc.value = half[0].texture; pass(copy, quarter[0]); blurPair(quarter, 3);
        comp.uniforms.fringe.value = fx.fringe || 0; comp.uniforms.exposure.value = fx.exposure ?? renderer.toneMappingExposure;
        pass(comp, null); renderer.toneMapping = tm;
        const err = post.checked ? 0 : gl.getError(); post.checked = true; if (err) throw new Error('GL error ' + err);
      } catch (e) { console.warn('post-processing disabled: ' + e.message); post.ok = false; renderer.setRenderTarget(null); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.render(scene, camera); }
    },
  };
  return post;
}
// HDR emissive colour: a hex colour scaled above 1.0 so it crosses the bloom threshold (render targets are linear half-float).
export const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

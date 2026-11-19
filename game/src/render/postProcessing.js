// Post-processing for SOLVANE BAY, written from scratch on WebGLRenderTarget + ShaderMaterial full-screen passes:
// HDR scene target -> soft-knee bright pass -> separable gaussian bloom pyramid (1/2, 1/4, 1/8 res)
// -> composite with ACES filmic tone mapping, the act's teal-and-coral grade, vignette and speed chromatic fringe.
import * as THREE from 'three';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const BRIGHT = `uniform sampler2D tSrc; uniform float uThreshold, uKnee; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = max(c.r, max(c.g, c.b));
  float s = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee); s = s * s / (4.0 * uKnee + 1e-4);
  float w = max(s, l - uThreshold) / max(l, 1e-4); gl_FragColor = vec4(min(c * w, vec3(24.0)), 1.0); }`;

// 9-tap gaussian folded into 5 bilinear fetches.
const BLUR = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270270;
  vec2 o1 = uDir * 1.3846153846, o2 = uDir * 3.2307692308;
  c += (texture2D(tSrc, vUv + o1).rgb + texture2D(tSrc, vUv - o1).rgb) * 0.3162162162;
  c += (texture2D(tSrc, vUv + o2).rgb + texture2D(tSrc, vUv - o2).rgb) * 0.0702702703;
  gl_FragColor = vec4(c, 1.0); }`;

const COPY = 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }';

const COMPOSITE = `uniform sampler2D tScene, tB1, tB2, tB3; uniform float uBloom, uExposure, uFringe, uVignette, uTime, uWarm, uMagic, uSat, uContrast, uRadial; uniform vec2 uCenter; uniform vec3 uShadowTint, uHighTint;
varying vec2 vUv;
vec3 aces(vec3 x){ // Narkowicz fit of the ACES filmic curve, with the RRT/ODT input/output matrices
  const mat3 I = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 O = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  x = I * x; vec3 a = x * (x + 0.0245786) - 0.000090537; vec3 b = x * (0.983729 * x + 0.4329510) + 0.238081; return clamp(O * (a / b), 0.0, 1.0); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec2 d = vUv - 0.5; float r2 = dot(d, d);
  vec3 col;
  if (uFringe > 0.001) { vec2 off = d * uFringe * r2 * 0.035;
    col = vec3(texture2D(tScene, vUv + off).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - off).b); }
  else col = texture2D(tScene, vUv).rgb;
  // at-speed radial blur: the frame edges smear out from the vanishing point (6 taps, only while fast or on nitro)
  if (uRadial > 0.001) { vec2 dir = vUv - uCenter; float w = smoothstep(0.24, 0.72, length(dir * vec2(1.5, 1.0))) * uRadial; vec3 acc = col;
    for (int i = 1; i < 7; i++) acc += texture2D(tScene, vUv - dir * (float(i) * 0.0075 * w)).rgb; col = acc / 7.0; }
  vec3 bloom = texture2D(tB1, vUv).rgb * 0.5 + texture2D(tB2, vUv).rgb * 0.8 + texture2D(tB3, vUv).rgb * 1.1;
  col += bloom * uBloom;
  col *= uExposure;
  col = aces(col);
  // the act's grade (render/colourScript.js): teal shadows, warm act-tinted highlights, saturation and a gentle S-curve,
  // strongest while the sun is low
  { float m = 0.55 + 0.45 * uMagic, lm = dot(clamp(col, 0.0, 1.0), vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(lm), col, mix(1.0, uSat, m) + 0.1 * uMagic);
    vec3 tone = mix(uShadowTint, uHighTint, smoothstep(0.06, 0.72, lm));
    col *= mix(vec3(1.0), tone, m);
    col = clamp(col, 0.0, 1.0); col = mix(col, col * col * (3.0 - 2.0 * col), uContrast * m);
    col = max(col, vec3(0.018, 0.04, 0.05) * (1.0 - lm)); } // lifted teal blacks: never muddy
  col = clamp(col, 0.0, 1.0);
  col *= mix(1.0, smoothstep(0.95, 0.18, r2 * 2.2), uVignette);
  col = toSRGB(col);
  col += (fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0); }`;

export function createPostProcessing(renderer, opts = {}) {
  const gl = renderer.getContext();
  const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const half = isGL2 && !!gl.getExtension('EXT_color_buffer_float');
  const type = half ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const mk = (w, h, samples = 0) => new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type, samples: isGL2 ? Math.max(0, samples) : 0, depthBuffer: samples >= 0, colorSpace: THREE.LinearSRGBColorSpace, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const samples = opts.samples ?? 4;
  let W = 1, H = 1, sceneRT = null, levels = [];
  // lite: no MSAA and no bloom passes, same shaders (the lowest quality level keeps the grade without a recompile)
  const params = { threshold: 1.1, knee: 0.45, bloom: 0.42, exposure: 1.0, fringe: 0, vignette: 0.55, lite: false };
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), fsScene = new THREE.Scene();
  quad.frustumCulled = false; fsScene.add(quad);
  const mat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
  const bright = mat(BRIGHT, { tSrc: { value: null }, uThreshold: { value: 1.0 }, uKnee: { value: 0.5 } });
  const blur = mat(BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
  const copy = mat(COPY, { tSrc: { value: null } });
  const comp = mat(COMPOSITE, { tScene: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, uBloom: { value: 0.55 }, uExposure: { value: 1.0 }, uFringe: { value: 0 }, uVignette: { value: 0.55 }, uTime: { value: 0 }, uWarm: { value: 1 }, uMagic: { value: 0 }, uSat: { value: 1.1 }, uContrast: { value: 0.3 }, uRadial: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.55) }, uShadowTint: { value: new THREE.Vector3(0.8, 0.98, 1.0) }, uHighTint: { value: new THREE.Vector3(1.08, 0.99, 0.84) } });
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(fsScene, camera); };

  function setSize(w, h) {
    W = w; H = h; sceneRT?.dispose(); levels.forEach((l) => { l.a.dispose(); l.b.dispose(); });
    sceneRT = mk(w, h, params.lite ? 0 : samples); levels = [2, 4, 8].map((f) => ({ a: mk(w / f | 0, h / f | 0, -1), b: mk(w / f | 0, h / f | 0, -1), w: w / f | 0, h: h / f | 0 }));
  }
  function render(scene, cam, time = 0) {
    const prevTM = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(sceneRT); renderer.render(scene, cam);
    bright.uniforms.tSrc.value = sceneRT.texture; bright.uniforms.uThreshold.value = params.threshold; bright.uniforms.uKnee.value = params.knee; if (!params.lite) pass(bright, levels[0].a);
    let src = levels[0].a;
    for (let i = 0; i < (params.lite ? 0 : levels.length); i++) {
      const L = levels[i];
      if (i > 0) { copy.uniforms.tSrc.value = src.texture; pass(copy, L.a); }
      const iters = i === 0 ? 1 : 2;
      for (let k = 0; k < iters; k++) {
        blur.uniforms.tSrc.value = L.a.texture; blur.uniforms.uDir.value.set(1 / L.w, 0); pass(blur, L.b);
        blur.uniforms.tSrc.value = L.b.texture; blur.uniforms.uDir.value.set(0, 1 / L.h); pass(blur, L.a);
      }
      src = L.a;
    }
    const u = comp.uniforms; u.tScene.value = sceneRT.texture; u.tB1.value = levels[0].a.texture; u.tB2.value = levels[1].a.texture; u.tB3.value = levels[2].a.texture;
    u.uBloom.value = params.lite ? 0 : params.bloom; u.uExposure.value = params.exposure; u.uFringe.value = params.fringe; u.uVignette.value = params.vignette; u.uTime.value = time % 100; u.uMagic.value = params.magic || 0; u.uRadial.value = params.radial || 0;
    if (params.grade) { u.uSat.value = params.grade.sat; u.uContrast.value = params.grade.contrast ?? 0.3; u.uShadowTint.value.fromArray(params.grade.shadow); u.uHighTint.value.fromArray(params.grade.high); }
    pass(comp, null); renderer.toneMapping = prevTM;
  }
  const size = renderer.getDrawingBufferSize(new THREE.Vector2()); setSize(size.x, size.y);
  return { render, setSize, params, hdr: half, target: () => sceneRT };
}

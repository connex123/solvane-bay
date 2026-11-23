// SOLVANE BAY's post-processing chain, built directly on WebGLRenderTarget and full-screen ShaderMaterial passes:
//   1. the scene renders into an HDR (half-float when available) multisampled target;
//   2. a soft-knee bright pass keeps only what glows;
//   3. a three-level bloom pyramid (1/2, 1/4, 1/8 resolution) blurs it with a separable gaussian;
//   4. one composite pass adds the bloom, exposes, tone-maps with an ACES fit, applies the act's teal/coral grade,
//      vignette, at-speed chromatic fringe and edge streaks, converts to sRGB and dithers.
import * as THREE from 'three';

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;
void main() {
  vec3 hdr = texture2D(tSrc, vUv).rgb;
  float peak = max(max(hdr.r, hdr.g), hdr.b);
  // quadratic soft knee around the threshold, then a hard ramp above it
  float knee = clamp(peak - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  knee = (knee * knee) / (4.0 * uKnee + 1e-4);
  float keep = max(knee, peak - uThreshold) / max(peak, 1e-4);
  gl_FragColor = vec4(min(hdr * keep, vec3(24.0)), 1.0);
}`;

// A 9-tap gaussian expressed as 5 bilinear taps (offsets and weights of the linear-sampling form).
const BLUR_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uDir;
varying vec2 vUv;
const float W0 = 0.2270270270;
const float W1 = 0.3162162162;
const float W2 = 0.0702702703;
const float D1 = 1.3846153846;
const float D2 = 3.2307692308;
vec3 pairAt(float dist) {
  vec2 reach = uDir * dist;
  return texture2D(tSrc, vUv + reach).rgb + texture2D(tSrc, vUv - reach).rgb;
}
void main() {
  vec3 sum = texture2D(tSrc, vUv).rgb * W0 + pairAt(D1) * W1 + pairAt(D2) * W2;
  gl_FragColor = vec4(sum, 1.0);
}`;

const COPY_FRAG = /* glsl */ `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0);
}`;

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tB1;
uniform sampler2D tB2;
uniform sampler2D tB3;
uniform float uBloom;
uniform float uExposure;
uniform float uFringe;
uniform float uVignette;
uniform float uTime;
uniform float uMagic;
uniform float uSat;
uniform float uContrast;
uniform float uRadial;
uniform vec2 uCenter;
uniform vec3 uShadowTint;
uniform vec3 uHighTint;
varying vec2 vUv;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const vec3 BLACK_FLOOR = vec3(0.018, 0.04, 0.05);

// ACES filmic curve (Narkowicz-style rational fit) between the RRT input and ODT output matrices.
vec3 acesFilmic(vec3 linear) {
  const mat3 toAces = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 fromAces = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  vec3 v = toAces * linear;
  vec3 num = v * (v + 0.0245786) - 0.000090537;
  vec3 den = v * (0.983729 * v + 0.4329510) + 0.238081;
  return clamp(fromAces * (num / den), 0.0, 1.0);
}

vec3 linearToSrgb(vec3 c) {
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(low, high, step(0.0031308, c));
}

// Scene colour, with red and blue pulled apart toward the frame edges while driving fast.
vec3 sceneWithFringe(vec2 fromCentre, float radius2) {
  if (uFringe <= 0.001) return texture2D(tScene, vUv).rgb;
  vec2 shift = fromCentre * uFringe * radius2 * 0.035;
  return vec3(texture2D(tScene, vUv + shift).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - shift).b);
}

// At-speed radial streaks on the edges only: zero across the central ~60% of the frame (a squircle), rising to the
// border, so the car, the pursuers and the skyline stay sharp. Six extra taps, only while fast or on nitro.
vec3 edgeStreaks(vec3 base, vec2 fromCentre) {
  if (uRadial <= 0.001) return base;
  vec2 e = abs(fromCentre) * 2.0;
  e *= e;
  float squircle = sqrt(sqrt(dot(e, e)));
  float amount = smoothstep(0.6, 1.02, squircle) * uRadial;
  if (amount <= 0.001) return base;
  vec2 toward = vUv - uCenter;
  vec3 sum = base;
  for (int i = 1; i < 7; i++) sum += texture2D(tScene, vUv - toward * (float(i) * 0.0075 * amount)).rgb;
  return sum / 7.0;
}

// The act's grade (render/colourScript.js): saturation, teal shadows and warm highlights, a gentle S-curve and lifted
// teal blacks. It leans in harder while the sun is low (uMagic).
vec3 actGrade(vec3 c) {
  float strength = 0.55 + 0.45 * uMagic;
  float luma = dot(clamp(c, 0.0, 1.0), LUMA);
  c = mix(vec3(luma), c, mix(1.0, uSat, strength) + 0.1 * uMagic);
  vec3 tone = mix(uShadowTint, uHighTint, smoothstep(0.06, 0.72, luma));
  c *= mix(vec3(1.0), tone, strength);
  c = clamp(c, 0.0, 1.0);
  vec3 sCurve = c * c * (3.0 - 2.0 * c);
  c = mix(c, sCurve, uContrast * strength);
  return max(c, BLACK_FLOOR * (1.0 - luma)); // never muddy
}

float ditherNoise() {
  return fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
}

void main() {
  vec2 fromCentre = vUv - 0.5;
  float radius2 = dot(fromCentre, fromCentre);

  vec3 c = edgeStreaks(sceneWithFringe(fromCentre, radius2), fromCentre);
  vec3 glow = texture2D(tB1, vUv).rgb * 0.5 + texture2D(tB2, vUv).rgb * 0.8 + texture2D(tB3, vUv).rgb * 1.1;
  c = (c + glow * uBloom) * uExposure;
  c = actGrade(acesFilmic(c));
  c = clamp(c, 0.0, 1.0);
  c *= mix(1.0, smoothstep(0.95, 0.18, radius2 * 2.2), uVignette);
  c = linearToSrgb(c) + ditherNoise() / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;

const PYRAMID_DIVISORS = [2, 4, 8];

function supportsHalfFloat(gl) {
  const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  return { webgl2, half: webgl2 && Boolean(gl.getExtension('EXT_color_buffer_float')) };
}

function fullscreenMaterial(fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT, fragmentShader, uniforms,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
}

export function createPostProcessing(renderer, opts = {}) {
  const caps = supportsHalfFloat(renderer.getContext());
  const texelType = caps.half ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const msaa = opts.samples ?? 4;

  // msaaSamples < 0 means a bloom buffer: no depth, no MSAA.
  function makeTarget(width, height, msaaSamples) {
    return new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), {
      type: texelType,
      samples: caps.webgl2 ? Math.max(0, msaaSamples) : 0,
      depthBuffer: msaaSamples >= 0,
      colorSpace: THREE.LinearSRGBColorSpace,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }

  // lite: no MSAA and no bloom passes, but the same shaders, so the lowest quality level keeps the grade
  // without a shader recompile.
  const params = { threshold: 1.1, knee: 0.45, bloom: 0.42, exposure: 1.0, fringe: 0, vignette: 0.55, lite: false };

  const screenCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  screenQuad.frustumCulled = false;
  const screenScene = new THREE.Scene();
  screenScene.add(screenQuad);

  const brightPass = fullscreenMaterial(BRIGHT_FRAG, { tSrc: { value: null }, uThreshold: { value: 1.0 }, uKnee: { value: 0.5 } });
  const blurPass = fullscreenMaterial(BLUR_FRAG, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
  const copyPass = fullscreenMaterial(COPY_FRAG, { tSrc: { value: null } });
  const compositePass = fullscreenMaterial(COMPOSITE_FRAG, {
    tScene: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null },
    uBloom: { value: 0.55 }, uExposure: { value: 1.0 }, uFringe: { value: 0 }, uVignette: { value: 0.55 },
    uTime: { value: 0 }, uMagic: { value: 0 }, uSat: { value: 1.1 }, uContrast: { value: 0.3 }, uRadial: { value: 0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.55) },
    uShadowTint: { value: new THREE.Vector3(0.8, 0.98, 1.0) },
    uHighTint: { value: new THREE.Vector3(1.08, 0.99, 0.84) },
  });

  let sceneTarget = null;
  let pyramid = []; // [{ a, b, w, h }] ping-pong pair per level

  function draw(material, target) {
    screenQuad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(screenScene, screenCam);
  }

  function blurLevel(level, rounds) {
    for (let r = 0; r < rounds; r++) {
      blurPass.uniforms.tSrc.value = level.a.texture;
      blurPass.uniforms.uDir.value.set(1 / level.w, 0);
      draw(blurPass, level.b);
      blurPass.uniforms.tSrc.value = level.b.texture;
      blurPass.uniforms.uDir.value.set(0, 1 / level.h);
      draw(blurPass, level.a);
    }
  }

  function buildBloom() {
    brightPass.uniforms.tSrc.value = sceneTarget.texture;
    brightPass.uniforms.uThreshold.value = params.threshold;
    brightPass.uniforms.uKnee.value = params.knee;
    if (params.lite) return;
    draw(brightPass, pyramid[0].a);
    pyramid.forEach((level, i) => {
      if (i > 0) {
        copyPass.uniforms.tSrc.value = pyramid[i - 1].a.texture; // downsample the previous level
        draw(copyPass, level.a);
      }
      blurLevel(level, i === 0 ? 1 : 2);
    });
  }

  function setSize(w, h) {
    if (sceneTarget) sceneTarget.dispose();
    for (const level of pyramid) { level.a.dispose(); level.b.dispose(); }
    sceneTarget = makeTarget(w, h, params.lite ? 0 : msaa);
    pyramid = PYRAMID_DIVISORS.map((div) => {
      const lw = (w / div) | 0, lh = (h / div) | 0;
      return { a: makeTarget(lw, lh, -1), b: makeTarget(lw, lh, -1), w: lw, h: lh };
    });
  }

  function render(scene, cam, time = 0) {
    const savedToneMapping = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the composite
    renderer.setRenderTarget(sceneTarget);
    renderer.render(scene, cam);
    buildBloom();

    const u = compositePass.uniforms;
    u.tScene.value = sceneTarget.texture;
    u.tB1.value = pyramid[0].a.texture;
    u.tB2.value = pyramid[1].a.texture;
    u.tB3.value = pyramid[2].a.texture;
    u.uBloom.value = params.lite ? 0 : params.bloom;
    u.uExposure.value = params.exposure;
    u.uFringe.value = params.fringe;
    u.uVignette.value = params.vignette;
    u.uTime.value = time % 100;
    u.uMagic.value = params.magic || 0;
    u.uRadial.value = params.radial || 0;
    const grade = params.grade;
    if (grade) {
      u.uSat.value = grade.sat;
      u.uContrast.value = grade.contrast ?? 0.3;
      u.uShadowTint.value.fromArray(grade.shadow);
      u.uHighTint.value.fromArray(grade.high);
    }
    draw(compositePass, null);
    renderer.toneMapping = savedToneMapping;
  }

  const drawing = renderer.getDrawingBufferSize(new THREE.Vector2());
  setSize(drawing.x, drawing.y);
  return { render, setSize, params, hdr: caps.half, target: () => sceneTarget };
}

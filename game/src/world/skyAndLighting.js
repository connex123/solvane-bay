// Sky, sun and atmosphere: a teal-and-coral sky dome (its palette comes from render/colourScript.js), the sun
// (or moon) as a shadow-casting directional light whose shadow box follows the player, hemisphere fill, fog, and
// the colour ramp that carries all of it from night through dawn, noon and the evening golden hour.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { currentGrade, BLAZE } from '../render/colourScript.js';

// The sun's arc is turned off the city's east-west avenues so it sets over the sea beside the Causeway,
// not straight down the street.
const ARC_TURN = 0.35;
const TURN_COS = Math.cos(ARC_TURN);
const TURN_SIN = Math.sin(ARC_TURN);
function turnArc(v) {
  return v.set(v.x * TURN_COS + v.z * TURN_SIN, v.y, v.z * TURN_COS - v.x * TURN_SIN);
}

// Day ramp keyed by the sun's elevation: [elevation, zenith colour, horizon colour, sun colour].
const RAMP_KEYS = [
  [-0.3, '#060a26', '#1c1a48', '#6a7fc0'], // night
  [-0.05, '#1d2a70', '#d0607a', '#ff7a5a'], // twilight
  [0.08, '#1d55c0', '#ffa070', '#ffa050'], // sunrise / sunset
  [0.25, '#1f63d0', '#ffd0a0', '#ffd090'], // low sun
  [0.8, '#2a78e0', '#cfe8ff', '#fff4e0'], // midday
].map(([elevation, ...hexes]) => ({ elevation, colours: hexes.map((hex) => new THREE.Color(hex)) }));
const ZENITH = 0, HORIZON = 1, SUN = 2;

function rampColour(elevation, which, out) {
  let lower = 0;
  while (lower < RAMP_KEYS.length - 2 && elevation > RAMP_KEYS[lower + 1].elevation) lower++;
  const a = RAMP_KEYS[lower], b = RAMP_KEYS[lower + 1];
  const t = Math.min(1, Math.max(0, (elevation - a.elevation) / (b.elevation - a.elevation)));
  return out.copy(a.colours[which]).lerp(b.colours[which], t);
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 mHor;
uniform vec3 mBand;
uniform vec3 mSky;
uniform vec3 mZen;
uniform float magic;
uniform vec3 top;
uniform vec3 hor;
uniform vec3 sunDir;
uniform vec3 sunCol;
varying vec3 vDir;

// The physical-ish sky: horizon colour up through a pale turquoise middle to the zenith.
vec3 daySky(float h) {
  vec3 middle = mix(top, vec3(0.55, 0.86, 0.9), 0.55);
  vec3 c = mix(hor, middle, smoothstep(0.0, 0.22, h));
  return mix(c, top, smoothstep(0.12, 0.75, h));
}

// The act's painted sky: coral/amber horizon, a warm band, turquoise, then deep teal overhead; hotter toward the sun.
vec3 actSky(float h, float towardSun) {
  vec3 c = mix(mHor, mBand, smoothstep(0.0, 0.1, h));
  c = mix(c, mSky, smoothstep(0.08, 0.42, h));
  c = mix(c, mZen, smoothstep(0.42, 1.0, h));
  float heat = pow(towardSun, 4.0) * (1.0 - smoothstep(0.0, 0.45, h)) * 0.7;
  return mix(c, vec3(1.0, 0.7, 0.34), heat);
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  float towardSun = max(dot(dir, normalize(sunDir)), 0.0);

  vec3 c = mix(daySky(h), actSky(h, towardSun), magic);
  c = mix(c, sunCol * 1.05, pow(towardSun, 6.0) * (1.0 - smoothstep(0.0, 0.5, h)) * 0.55); // glow around the sun
  c = mix(c, hor * 0.75, clamp(-h * 3.0, 0.0, 1.0)); // below the horizon

  vec3 disc = vec3(1.0, 0.92, 0.75) * smoothstep(0.99935, 0.99955, towardSun) * 5.0;
  vec3 halo = sunCol * (pow(towardSun, 300.0) * 0.8 + pow(towardSun, 30.0) * 0.35 + pow(towardSun, 5.0) * 0.1);
  gl_FragColor = vec4(c + disc + halo, 1.0);
}`;

const SHADOW_HALF_SPAN = 95;
const SUN_DISTANCE = 160;
const SKY_RADIUS = 1000;

function makeSunLight() {
  const sun = new THREE.DirectionalLight(0xffb070, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 3;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.4;
  Object.assign(sun.shadow.camera, {
    left: -SHADOW_HALF_SPAN, right: SHADOW_HALF_SPAN, top: SHADOW_HALF_SPAN, bottom: -SHADOW_HALF_SPAN, near: 1, far: 500,
  });
  return sun;
}

const scratchColour = new THREE.Color();
const sunOnScreen = new THREE.Vector3();
const viewDir = new THREE.Vector3();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function createSky(scene) {
  const uniforms = {
    mHor: { value: new THREE.Color() }, mBand: { value: new THREE.Color() },
    mSky: { value: new THREE.Color() }, mZen: { value: new THREE.Color() },
    magic: { value: 0 },
    top: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(1, 0.1, 0) }, sunCol: { value: new THREE.Color() },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(SKY_RADIUS, 24, 16),
    new THREE.ShaderMaterial({ uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  scene.add(dome);

  const sun = makeSunLight();
  scene.add(sun, sun.target);
  const fill = new THREE.HemisphereLight(0x9cdcd8, 0xc89878, 1.0);
  scene.add(fill);
  scene.fog = new THREE.Fog(0xffc49a, 180, 950);

  const lightDir = new THREE.Vector3();

  // Light direction for shading: follows the sun by day, a fixed high moon angle at night.
  function aimLight(elevation, arcAngle) {
    if (elevation < 0.02) lightDir.set(-Math.cos(arcAngle) * 0.5, 0.6, -0.3).normalize();
    else lightDir.set(-Math.cos(arcAngle), Math.max(0.03, Math.sin(arcAngle)) * 0.7 + 0.32, 0.12).normalize();
    turnArc(lightDir);
  }

  function paintAtmosphere(elevation, grade, magicHour) {
    const fog = scene.fog;
    fog.color.copy(uniforms.hor.value).lerp(scratchColour.set('#ffe2c4'), elevation > 0 ? 0.35 : 0).lerp(grade.fog, magicHour * 0.6);
    if (elevation < 0) fog.color.multiplyScalar(0.8);
    const longView = G.mode === 'title' || G.shotCrisp;
    fog.near = longView ? 300 : 180;
    fog.far = longView ? 1700 : 950;
    const hillShade = (G.mode === 'title' ? 1 : 0.78) * clamp(0.45 + (elevation + 0.1) * 1.4, 0.35, 1);
    for (const mat of G.hillMats || []) mat.color.setScalar(hillShade);
  }

  // The Low Tide Blaze (amount = grade.blaze x magic hour): a hotter gold key light, gold sand, sun glints on the sea.
  function paintLights(elevation, grade, magicHour) {
    const daylight = clamp((elevation + 0.08) * 5, 0.28, 1);
    const blaze = grade.blaze * magicHour;
    sun.color.copy(uniforms.sunCol.value).lerp(scratchColour.set('#ffa850'), magicHour * 0.5).lerp(BLAZE.key, blaze * 0.6);
    const baseIntensity = elevation < 0 ? 0.55 : Math.min(3.4, 1.6 + elevation * 9) * (elevation < 0.04 ? 0.8 : 1);
    sun.intensity = baseIntensity * (1 + (BLAZE.keyBoost - 1) * blaze);
    if (G.sandMat) G.sandMat.color.setRGB(1, 1, 1).lerp(BLAZE.sand, blaze * 0.75);
    if (G.seaMat) {
      G.seaMat.specular.set(0xffb090).lerp(BLAZE.glint, blaze).multiplyScalar(1 + blaze * 1.5);
      G.seaMat.shininess = 90 - blaze * 50;
    }
    // teal fill so shadows go teal, never purple
    fill.color.copy(uniforms.top.value).lerp(scratchColour.set('#d8e8ff'), 0.55);
    fill.intensity = 0.4 + daylight * 1.0;
    fill.color.lerp(grade.hemiSky, magicHour * 0.6);
    fill.groundColor.set(0xc89878).lerp(grade.hemiGround, magicHour * 0.6);
  }

  // Where the sun sits on screen, for the lens glare overlay (null when it is behind or far off-axis).
  function locateSunOnScreen(camera, elevation) {
    sunOnScreen.copy(uniforms.sunDir.value).multiplyScalar(600).add(camera.position).project(camera);
    camera.getWorldDirection(viewDir);
    const facing = viewDir.dot(uniforms.sunDir.value);
    if (!(sunOnScreen.z < 1 && facing > 0.45 && elevation > -0.02)) return null;
    return {
      x: (sunOnScreen.x * 0.5 + 0.5) * innerWidth,
      y: (-sunOnScreen.y * 0.5 + 0.5) * innerHeight,
      a: Math.min(0.9, (facing - 0.45) * 2.2),
    };
  }

  function update(clock, focus, camera) {
    const hoursFromSix = clock - 6;
    const elevation = Math.sin((hoursFromSix / 24) * Math.PI * 2);
    const arcAngle = (hoursFromSix / 12) * Math.PI;
    aimLight(elevation, arcAngle);

    const grade = currentGrade();
    uniforms.mHor.value.copy(grade.horizon);
    uniforms.mBand.value.copy(grade.band);
    uniforms.mSky.value.copy(grade.sky);
    uniforms.mZen.value.copy(grade.zenith);
    rampColour(elevation, ZENITH, uniforms.top.value);
    rampColour(elevation, HORIZON, uniforms.hor.value);
    rampColour(elevation, SUN, uniforms.sunCol.value);

    // Magic hour peaks while the sun is low (roughly 16:45 to 18:30); staged shots can force it with G.magicForce.
    const magicHour = G.magicForce ?? Math.max(0, Math.min(1, (elevation + 0.06) / 0.1, (0.36 - elevation) / 0.14));
    G.magic = magicHour;
    uniforms.magic.value = magicHour;
    const sunHeight = Math.max(0.03, Math.sin(arcAngle)) * 0.62 - (elevation < 0 ? 0.3 : 0);
    turnArc(uniforms.sunDir.value.set(-Math.cos(arcAngle), sunHeight, -0.03)).normalize();

    paintAtmosphere(elevation, grade, magicHour);
    paintLights(elevation, grade, magicHour);

    sun.position.set(focus.x + lightDir.x * SUN_DISTANCE, lightDir.y * SUN_DISTANCE, focus.z + lightDir.z * SUN_DISTANCE);
    sun.target.position.set(focus.x, 0, focus.z);
    dome.position.copy(camera.position);
    G.sunScreen = locateSunOnScreen(camera, elevation);

    // windows light up as the sun goes down; street lamps go HDR after dusk
    if (G.buildingMat) G.buildingMat.emissiveIntensity = clamp(0.75 - elevation * 4.6, 0.04, 1.1);
    if (G.glassMat) G.glassMat.emissiveIntensity = G.buildingMat.emissiveIntensity * 0.8;
    if (G.lampMat) G.lampMat.color.setScalar(elevation > 0.2 ? 1 : 3.2);
  }

  return { update };
}

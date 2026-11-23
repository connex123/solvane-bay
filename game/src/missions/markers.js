// World markers for mission starts, objectives, shops and pickups: a tall glowing column with a spinning ring,
// a blip on the minimap, and either an automatic trigger on entry or an "E" interaction prompt.
import * as THREE from 'three';
import { G } from '../core/gameState.js';
import { pressed } from '../core/input.js';

const COLUMN_HEIGHT = 34;
const column = new THREE.CylinderGeometry(2.4, 2.4, COLUMN_HEIGHT, 14, 1, true);
column.translate(0, COLUMN_HEIGHT / 2, 0); // stand it on the ground
const halo = new THREE.TorusGeometry(2.6, 0.18, 6, 24);
halo.rotateX(Math.PI / 2);

const paintCache = new Map();
function paintsFor(color) {
  if (!paintCache.has(color)) {
    const glow = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    paintCache.set(color, { glow, solid: new THREE.MeshBasicMaterial({ color }) });
  }
  return paintCache.get(color);
}

const DEFAULTS = { r: 4, color: 0xffd23c, kind: 'obj', label: '', auto: true };

/** Add a marker. Options override DEFAULTS; x/z place it, follow makes it track an object. */
export function addMarker(o) {
  const marker = Object.assign({}, DEFAULTS, o);
  const { glow, solid } = paintsFor(marker.color);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(column, glow), new THREE.Mesh(halo, solid));
  group.position.set(marker.x, 0.3, marker.z);
  G.scene.add(group);
  marker.mesh = group;
  G.markers.push(marker);
  return marker;
}

export function removeMarker(m) {
  if (!m) return;
  m.mesh.removeFromParent();
  const at = G.markers.indexOf(m);
  if (at !== -1) G.markers.splice(at, 1);
}

function playerQualifies(marker, player) {
  if (marker.needCar && !player.car) return false;
  if (marker.needFoot && player.car) return false;
  return true;
}

export function updateMarkers(dt) {
  const player = G.p;
  G.prompt = '';
  for (const marker of [...G.markers]) {
    if (marker.follow) {
      marker.x = marker.follow.x;
      marker.z = marker.follow.z;
    }
    marker.mesh.position.set(marker.x, 0.3, marker.z);
    marker.mesh.rotation.y += dt;
    marker.mesh.visible = !marker.hidden;
    if (marker.hidden) continue;

    marker.cool = Math.max(0, (marker.cool || 0) - dt);
    const inside = Math.hypot(marker.x - player.x, marker.z - player.z) < marker.r;
    if (!inside || !playerQualifies(marker, player)) continue;

    if (!marker.auto) {
      G.prompt = marker.prompt || marker.label;
      if (pressed('KeyE') && marker.onInteract) marker.onInteract(marker);
    } else if (marker.cool <= 0) {
      marker.cool = marker.cooldown || 2;
      if (marker.onEnter) marker.onEnter(marker);
    }
  }
}

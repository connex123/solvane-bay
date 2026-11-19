// Compiles every material in the scene once at boot (hidden objects included, for the same render target and tone
// mapping the frame pipeline uses) so the first frames of play never stall on first-use shader compiles.
import * as THREE from 'three';

export function warmUpShaders(renderer, scene, camera, post) {
  const hidden = []; scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  const tm = renderer.toneMapping, target = renderer.getRenderTarget();
  try {
    if (post) { renderer.toneMapping = THREE.NoToneMapping; renderer.setRenderTarget(post.target()); }
    renderer.compile(scene, camera);
  } finally { renderer.toneMapping = tm; renderer.setRenderTarget(target); for (const o of hidden) o.visible = false; }
}

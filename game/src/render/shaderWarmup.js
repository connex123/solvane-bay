// Boot-time shader warm-up: compile every material in the scene, hidden objects included, against the same render
// target and tone mapping the frame pipeline uses, so play never stalls on a first-use shader compile.
import * as THREE from 'three';

export function warmUpShaders(renderer, scene, camera, post) {
  const revealed = [];
  scene.traverse((obj) => {
    if (obj.visible) return;
    obj.visible = true;
    revealed.push(obj);
  });
  const previous = { toneMapping: renderer.toneMapping, target: renderer.getRenderTarget() };
  try {
    if (post) {
      // the post chain renders the scene untonemapped into its own HDR target
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setRenderTarget(post.target());
    }
    renderer.compile(scene, camera);
  } finally {
    renderer.toneMapping = previous.toneMapping;
    renderer.setRenderTarget(previous.target);
    revealed.forEach((obj) => { obj.visible = false; });
  }
}

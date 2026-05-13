import * as THREE from 'three';

export function applyCorridor(corridor, scene) {
  corridor.traverse((node) => {
    if (!node.isMesh) return;

    node.castShadow = true;
    node.receiveShadow = true;

    const n = node.name.toLowerCase();

    // ascunde tavanul vechi
    if (node.name === 'Plane020_teto_0') {
      node.visible = false;
      return;
    }

    // pastrează materialul original din GLB
    if (node.material) {
      if (Array.isArray(node.material)) {
        node.material.forEach((mat) => {
          mat.needsUpdate = true;
        });
      } else {
        node.material.needsUpdate = true;
      }
    }

    if (n.includes('bec1') || n.includes('bec2') || n.includes('bucal')) {
      node.position.y -= 100;
    }
  });
}
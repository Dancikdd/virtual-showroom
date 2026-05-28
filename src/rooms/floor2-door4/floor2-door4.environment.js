import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class TreeEnvironment {

  constructor(scene) {
    this.scene = scene;
    this.background = new THREE.Color(0xd99b6a);
    this.fog = new THREE.FogExp2(0xd99b6a, 0.00025);
    this.skybox = null;

    const loader = new GLTFLoader();

    loader.load(
      '/products/free_-_skybox_anime_sky.glb',
      (gltf) => {
        this.skybox = gltf.scene;
        this.skybox.scale.set(8000, 8000, 8000);
        this.skybox.position.set(0, 0, 0);
        this.skybox.rotation.y = Math.PI;

        this.skybox.traverse((child) => {
          if (child.isMesh) {
            child.frustumCulled = false;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              child.material.depthWrite = false;
              child.material.needsUpdate = true;
            }
          }
        });

        this.scene.add(this.skybox);
      },
      undefined,
      (err) => {
        console.error('SKYBOX ERROR', err);
      }
    );
  }

  setVisible(visible) {
    // ✅ Added: actually toggle the skybox mesh visibility
    if (this.skybox) {
      this.skybox.visible = visible;
    }

    if (visible) {
      this.scene.background = this.background;
      this.scene.fog = this.fog;
    } else {
      this.scene.background = new THREE.Color(0x00010a);
      this.scene.fog = new THREE.FogExp2(0x00010a, 0.00005);
    }
  }

  update(time) {
    if (this.skybox) {
      this.skybox.rotation.y += 0.0002;
    }
  }
}
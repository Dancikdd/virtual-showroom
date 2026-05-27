import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class FireplaceEnvironment {
  constructor(scene) {
    this.scene = scene;

    this.group = new THREE.Group();

    this.loader = new GLTFLoader();

    this.roomModel = null;

    // lumină caldă
    this.fireLight = new THREE.PointLight(
      0xff6600,
      2.2,
      500
    );

    this.fireLight.position.set(0, 120, 120);

    this.group.add(this.fireLight);

    this.ambient = new THREE.AmbientLight(
      0xffc8a0,
      0.45
    );

    this.group.add(this.ambient);

    // LOAD ROOM MODEL
    this.loader.load(
      '/products/paintings_on_walls.glb',

      (gltf) => {
        this.roomModel = gltf.scene;

        this.roomModel.scale.set(180, 180, 180);

        // camera/background position
        this.roomModel.position.set(
          0,
          -160,
          80
        );

     this.roomModel.rotation.y = Math.PI / 2;

        this.roomModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            child.frustumCulled = false;
          }
        });

        this.group.add(this.roomModel);

        console.log('Paintings room loaded');
      }
    );

    this.group.visible = false;

    this.scene.add(this.group);
  }

  setVisible(v) {
    this.group.visible = v;
  }

  update(time, fireOn = true) {
    if (!this.group.visible) return;

    this.fireLight.intensity = fireOn
      ? 1.8 + Math.random() * 0.8
      : 0.2;
  }
}
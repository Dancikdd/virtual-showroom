import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class SwordEnvironment {

  constructor(scene) {

    this.scene = scene;

    this.group = new THREE.Group();

    this.loader = new GLTFLoader();

    this.forest = null;

    this.particles = null;

    this.particleVelocities = [];

    this._createEnvironment();

    this.setVisible(false);

    this.scene.add(this.group);
  }

  _createEnvironment() {

    // 🌲 FOREST MODEL
    this.loader.load(

      '/products/forest_lighting_wip.glb',

      (gltf) => {

        this.forest = gltf.scene;

        // scale forest
        this.forest.scale.setScalar(35);

        // center forest
        this.forest.position.set(
          0,
          -25,
          0
        );

        this.forest.rotation.y =
          Math.PI * 0.5;

        // shadows / materials
        this.forest.traverse((child) => {

          if (child.isMesh) {

            child.castShadow = true;

            child.receiveShadow = true;

            if (child.material) {

              child.material.roughness = 1;

              child.material.metalness = 0;
            }
          }
        });

        this.group.add(this.forest);
      }
    );

    // ✨ particles
    const count = 40;

    const geo = new THREE.BufferGeometry();

    const positions =
      new Float32Array(count * 3);

    this.particleVelocities = [];

    for (let i = 0; i < count; i++) {

      const angle =
        Math.random() * Math.PI * 2;

      const radius =
        60 + Math.random() * 180;

      positions[i * 3] =
        Math.cos(angle) * radius;

      positions[i * 3 + 1] =
        Math.random() * 120;

      positions[i * 3 + 2] =
        Math.sin(angle) * radius;

      this.particleVelocities.push({

        vx:
          (Math.random() - 0.5) * 0.02,

        vy:
          0.01 + Math.random() * 0.03,

        vz:
          (Math.random() - 0.5) * 0.02,
      });
    }

    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        positions,
        3
      )
    );

    this.particles = new THREE.Points(

      geo,

      new THREE.PointsMaterial({

        color: 0xffffff,

        size: 1.6,

        transparent: true,

        opacity: 0.25,

        blending:
          THREE.AdditiveBlending,

        depthWrite: false,
      })
    );

    this.group.add(this.particles);
  }

  setVisible(v) {

    this.group.visible = v;
  }

  update(time) {

    if (!this.group.visible) return;

    // ✨ particle animation
    if (this.particles) {

      const pos =
        this.particles.geometry
          .attributes.position.array;

      for (
        let i = 0;
        i < this.particleVelocities.length;
        i++
      ) {

        const v =
          this.particleVelocities[i];

        pos[i * 3] += v.vx;

        pos[i * 3 + 1] += v.vy;

        pos[i * 3 + 2] += v.vz;

        if (pos[i * 3 + 1] > 140) {

          const angle =
            Math.random() *
            Math.PI *
            2;

          const radius =
            70 +
            Math.random() * 190;

          pos[i * 3] =
            Math.cos(angle) *
            radius;

          pos[i * 3 + 1] = 0;

          pos[i * 3 + 2] =
            Math.sin(angle) *
            radius;
        }
      }

      this.particles.geometry
        .attributes.position.needsUpdate = true;
    }
  }
}
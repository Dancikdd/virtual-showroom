import * as THREE from 'three';

export class FireplaceLights {
  constructor(scene) {
    this.scene = scene;

    this.ambient = new THREE.AmbientLight(0xffddaa, 0);
    this.scene.add(this.ambient);

    this.fireLight = new THREE.PointLight(0xff6600, 0, 600);
    this.fireLight.position.set(0, 120, 80);
    this.scene.add(this.fireLight);
  }

  on() {
    this.ambient.intensity  = 0.6;
    this.fireLight.intensity = 20;
  }

  off() {
    this.ambient.intensity  = 0;
    this.fireLight.intensity = 0;
  }

  update(time, enabled) {
    if (!enabled) {
      this.fireLight.intensity = 0;
      return;
    }
    this.fireLight.intensity = 20 + Math.sin(time * 18) * 3 + Math.random() * 2;
  }
}
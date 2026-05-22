// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 1 — Lumini Astronaut
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class AstroLights {
  constructor(scene) {
    this.scene = scene;
    this._setup();
  }

  _setup() {
    this.ambient = new THREE.AmbientLight(0xffffff, 0);
    this.scene.add(this.ambient);

    this.keyLight = new THREE.PointLight(0xffffff, 0, 1200);
    this.keyLight.position.set(0, 200, 0);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.PointLight(0xffeedd, 0, 1200);
    this.fillLight.position.set(200, 0, 200);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0xffffff, 0, 1200);
    this.rimLight.position.set(-200, 0, -200);
    this.scene.add(this.rimLight);
  }

  on() {
    this.ambient.intensity   = 3;
    this.keyLight.intensity  = 80;
    this.fillLight.intensity = 60;
    this.rimLight.intensity  = 50;
  }

  off() {
    this.ambient.intensity   = 0;
    this.keyLight.intensity  = 0;
    this.fillLight.intensity = 0;
    this.rimLight.intensity  = 0;
  }
}

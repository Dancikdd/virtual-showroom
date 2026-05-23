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
    this.fillLight.position.set(200, 40, 220);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0xffffff, 0, 1200);
    this.rimLight.position.set(-200, 20, -220);
    this.scene.add(this.rimLight);

    this.accentLightA = new THREE.PointLight(0x66ccff, 0, 900, 1);
    this.accentLightA.position.set(-120, 90, 180);
    this.scene.add(this.accentLightA);

    this.accentLightB = new THREE.PointLight(0x70ffea, 0, 900, 1);
    this.accentLightB.position.set(140, 100, -160);
    this.scene.add(this.accentLightB);

    this.spotLight = new THREE.SpotLight(0xc0e8ff, 0, 1400, Math.PI / 10, 0.2, 0.7);
    this.spotLight.position.set(0, 220, 120);
    this.spotLight.target.position.set(0, 80, 0);
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);
  }

  on() {
    this.ambient.intensity   = 0.6;
    this.keyLight.intensity  = 45;
    this.fillLight.intensity = 35;
    this.rimLight.intensity  = 25;
    this.accentLightA.intensity = 28;
    this.accentLightB.intensity = 24;
    this.spotLight.intensity = 12;
  }

  off() {
    this.ambient.intensity   = 0;
    this.keyLight.intensity  = 0;
    this.fillLight.intensity = 0;
    this.rimLight.intensity  = 0;
  }
}

// ══════════════════════════════════════════════════════════════
//  FLOOR 2 - DOOR 2 — Lumini Sword
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class SwordLights {
  constructor(scene) {
    this.scene = scene;
    this._setup();
  }

  _setup() {
    this.ambient = new THREE.AmbientLight(0x220033, 0);
    this.scene.add(this.ambient);

    this.keyLight = new THREE.PointLight(0xaa66ff, 0, 1200);
    this.keyLight.position.set(0, 300, 200);
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.PointLight(0x4400aa, 0, 800);
    this.rimLight.position.set(-200, 100, -200);
    this.scene.add(this.rimLight);

    this.groundLight = new THREE.PointLight(0x6600ff, 0, 500);
    this.groundLight.position.set(0, 10, 0);
    this.scene.add(this.groundLight);
  }

  on() {
    this.ambient.intensity     = 0.5;
    this.keyLight.intensity    = 40;
    this.rimLight.intensity    = 20;
    this.groundLight.intensity = 15;
  }

  off() {
    this.ambient.intensity     = 0;
    this.keyLight.intensity    = 0;
    this.rimLight.intensity    = 0;
    this.groundLight.intensity = 0;
  }
}
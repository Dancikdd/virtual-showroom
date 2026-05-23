// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 2 — Lumini Grasslands
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class GrassLights {
  constructor(scene) {
    this.scene = scene;
    this._setup();
  }

  _setup() {
    // Lumină ambientă caldă — cer de zi
    this.ambient = new THREE.AmbientLight(0xd4eaff, 0);
    this.scene.add(this.ambient);

    // Soare — directional puternic din sus-dreapta
    this.sunLight = new THREE.DirectionalLight(0xfff4cc, 0);
    this.sunLight.position.set(300, 500, 200);
    this.sunLight.target.position.set(0, 0, 0);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Fill light — cer albastru din opus
    this.skyFill = new THREE.HemisphereLight(0x88ccff, 0x4a7c2f, 0);
    this.scene.add(this.skyFill);

    // Rim light — contur verde deschis
    this.rimLight = new THREE.PointLight(0x90ff70, 0, 800);
    this.rimLight.position.set(-200, 150, -200);
    this.scene.add(this.rimLight);

    // Accent warm — lumină de apus lateral
    this.warmAccent = new THREE.PointLight(0xffcc66, 0, 600);
    this.warmAccent.position.set(250, 80, 100);
    this.scene.add(this.warmAccent);
  }

  on() {
    this.ambient.intensity    = 1.2;
    this.sunLight.intensity   = 4.0;
    this.skyFill.intensity    = 1.5;
    this.rimLight.intensity   = 20;
    this.warmAccent.intensity = 15;
  }

  off() {
    this.ambient.intensity    = 0;
    this.sunLight.intensity   = 0;
    this.skyFill.intensity    = 0;
    this.rimLight.intensity   = 0;
    this.warmAccent.intensity = 0;
  }
}
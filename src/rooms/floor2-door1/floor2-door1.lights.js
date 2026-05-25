// ══════════════════════════════════════════════════════════════
//  FLOOR 2 - DOOR 1 — Lumini Car Showroom
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class CarLights {
  constructor(scene) {
    this.scene = scene;
    this._setup();
  }

  _setup() {
    this.keyLight = new THREE.SpotLight(0xffffff, 0, 800, Math.PI / 4, 0.15);
    this.keyLight.position.set(0, 280, 120);
    this.keyLight.target.position.set(0, 0, 0);
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.fillLeft = new THREE.PointLight(0xfff5ee, 0, 600);
    this.fillLeft.position.set(-200, 100, 60);
    this.scene.add(this.fillLeft);

    this.fillRight = new THREE.PointLight(0xeef5ff, 0, 600);
    this.fillRight.position.set(200, 100, 60);
    this.scene.add(this.fillRight);

    this.frontLight = new THREE.SpotLight(0xffffff, 0, 500, Math.PI / 4, 0.2);
    this.frontLight.position.set(0, 120, 250);
    this.frontLight.target.position.set(0, 20, 0);
    this.scene.add(this.frontLight);
    this.scene.add(this.frontLight.target);

    this.backLight = new THREE.PointLight(0xffffff, 0, 400);
    this.backLight.position.set(0, 100, -200);
    this.scene.add(this.backLight);

    this.underLight = new THREE.PointLight(0xff6600, 0, 300);
    this.underLight.position.set(0, -10, 0);
    this.scene.add(this.underLight);

    this.sideLeft = new THREE.PointLight(0xffffff, 0, 180);
    this.sideLeft.position.set(-110, 50, 0);
    this.scene.add(this.sideLeft);

    this.sideRight = new THREE.PointLight(0xffffff, 0, 180);
    this.sideRight.position.set(110, 50, 0);
    this.scene.add(this.sideRight);

    this.topRim = new THREE.PointLight(0xffffff, 0, 200);
    this.topRim.position.set(0, 140, 0);
    this.scene.add(this.topRim);

    this.closeFront = new THREE.PointLight(0xfff8ee, 0, 160);
    this.closeFront.position.set(0, 40, 120);
    this.scene.add(this.closeFront);

    this.closeBack = new THREE.PointLight(0xeeeeff, 0, 160);
    this.closeBack.position.set(0, 40, -120);
    this.scene.add(this.closeBack);

    this.diag1 = new THREE.PointLight(0xffffff, 0, 170);
    this.diag1.position.set(-90, 80, 90);
    this.scene.add(this.diag1);

    this.diag2 = new THREE.PointLight(0xffffff, 0, 170);
    this.diag2.position.set(90, 80, 90);
    this.scene.add(this.diag2);

    this.bounce = new THREE.PointLight(0xffeedd, 0, 120);
    this.bounce.position.set(0, 10, 0);
    this.scene.add(this.bounce);

    this.cabinLight = new THREE.PointLight(0xff4400, 0, 80);
    this.cabinLight.position.set(0, 30, 0);
    this.scene.add(this.cabinLight);
  }

  on() {
    this.keyLight.intensity   = 12;
    this.fillLeft.intensity   = 8;
    this.fillRight.intensity  = 8;
    this.frontLight.intensity = 7;
    this.backLight.intensity  = 6;
    this.underLight.intensity = 3;
    this.sideLeft.intensity   = 3;
    this.sideRight.intensity  = 3;
    this.topRim.intensity     = 4;
    this.closeFront.intensity = 3;
    this.closeBack.intensity  = 2;
    this.diag1.intensity      = 3;
    this.diag2.intensity      = 3;
    this.bounce.intensity     = 2;
  }

  off() {
    this.keyLight.intensity   = 0;
    this.fillLeft.intensity   = 0;
    this.fillRight.intensity  = 0;
    this.frontLight.intensity = 0;
    this.backLight.intensity  = 0;
    this.underLight.intensity = 0;
    this.sideLeft.intensity   = 0;
    this.sideRight.intensity  = 0;
    this.topRim.intensity     = 0;
    this.closeFront.intensity = 0;
    this.closeBack.intensity  = 0;
    this.diag1.intensity      = 0;
    this.diag2.intensity      = 0;
    this.bounce.intensity     = 0;
  }

  // Apelat din update loop
  updateCabin(isInside, isRunning, time) {
    if (!isInside) { this.cabinLight.intensity = 0; return; }
    this.cabinLight.intensity = isRunning
      ? 1.8 + Math.sin(time * 12) * 0.15
      : 1.2;
  }
}

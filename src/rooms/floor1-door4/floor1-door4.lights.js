// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 4 — Wall-E Lights
//  Warm post-apocalyptic sunset palette:
//    • Amber key from above-right
//    • Dim cool fill from left (night sky)
//    • Orange ground bounce
//    • Two soft eye glows (updated from WalleEnvironment)
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class WalleLights {
  constructor(scene) {
    this.scene = scene;
    this._setup();
  }

  _setup() {
    // Base ambient — dark warm night
    this.ambient = new THREE.AmbientLight(0x1a120a, 0);
    this.scene.add(this.ambient);

    // Key — warm sunset from upper-right
    this.keyLight = new THREE.DirectionalLight(0xffaa44, 0);
    this.keyLight.position.set(200, 300, 100);
    this.keyLight.target.position.set(0, 60, 0);
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // Fill — cool blue from left
    this.fillLight = new THREE.DirectionalLight(0x334466, 0);
    this.fillLight.position.set(-200, 100, 50);
    this.scene.add(this.fillLight);

    // Ground bounce — warm orange from below
    this.groundBounce = new THREE.PointLight(0xff6600, 0, 600, 1.5);
    this.groundBounce.position.set(0, -40, 0);
    this.scene.add(this.groundBounce);

    // Eye glow L/R — set position later by WalleEnvironment
    this.eyeGlowL = new THREE.PointLight(0x88eeff, 0, 120, 2);
    this.eyeGlowR = new THREE.PointLight(0x88eeff, 0, 120, 2);
    this.scene.add(this.eyeGlowL);
    this.scene.add(this.eyeGlowR);
  }

  on() {
    this.ambient.intensity      = 1.2;
    this.keyLight.intensity     = 4.0;
    this.fillLight.intensity    = 1.5;
    this.groundBounce.intensity = 3.0;
    this.eyeGlowL.intensity     = 2.5;
    this.eyeGlowR.intensity     = 2.5;
  }

  off() {
    this.ambient.intensity      = 0;
    this.keyLight.intensity     = 0;
    this.fillLight.intensity    = 0;
    this.groundBounce.intensity = 0;
    this.eyeGlowL.intensity     = 0;
    this.eyeGlowR.intensity     = 0;
  }

  // Called every frame — pulse the eye glow
  update(time) {
    const pulse = 2.0 + Math.sin(time * 2.1) * 0.4;
    this.eyeGlowL.intensity = pulse;
    this.eyeGlowR.intensity = pulse;
  }
}
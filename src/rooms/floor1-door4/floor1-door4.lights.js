// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 4 — Wall-E Lights  (Space Edition)
//  Palette:
//    • Ambient rece de spațiu (aproape negru-albăstrui)
//    • Key warm din lateral-sus (soare îndepărtat)
//    • Fill rece albastru-violet din stânga
//    • Bounce luminos de pe platformă (gri reflexiv)
//    • Eye glows cianic pulsatile
//    • Rim light alb de contur (separă Wall-E de fundal întunecat)
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class WalleLights {
  constructor(scene) {
    this.scene = scene;
    this._setup();
  }

  _setup() {
    // Ambient — spațiu, aproape negru cu tentă rece
    this.ambient = new THREE.AmbientLight(0x0a0d1a, 0);
    this.scene.add(this.ambient);

    // Key — soare îndepărtat, warm, din dreapta-sus
    this.keyLight = new THREE.DirectionalLight(0xffc878, 0);
    this.keyLight.position.set(300, 400, 150);
    this.keyLight.target.position.set(0, 60, 0);
    this.keyLight.castShadow = true;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // Fill — albastru-violet cosmic din stânga
    this.fillLight = new THREE.DirectionalLight(0x2a3a6a, 0);
    this.fillLight.position.set(-300, 150, 80);
    this.scene.add(this.fillLight);

    // Bounce de pe platformă — alb-gri rece (platforma e reflexivă)
    this.groundBounce = new THREE.PointLight(0xc8d8ff, 0, 500, 1.8);
    this.groundBounce.position.set(0, -5, 0);
    this.scene.add(this.groundBounce);

    // Rim light — contur alb din spate (separă de fundal negru)
    this.rimLight = new THREE.DirectionalLight(0xffffff, 0);
    this.rimLight.position.set(-80, 200, -400);
    this.scene.add(this.rimLight);

    // Eye glow L/R — cianic, poziționate de WalleEnvironment
    this.eyeGlowL = new THREE.PointLight(0x44ddff, 0, 130, 2);
    this.eyeGlowR = new THREE.PointLight(0x44ddff, 0, 130, 2);
    this.scene.add(this.eyeGlowL);
    this.scene.add(this.eyeGlowR);

    // Lumini de accent pentru platforma circulară
    this.platformRimL = new THREE.PointLight(0x8888ff, 0, 350, 2);
    this.platformRimL.position.set(-250, 20, 0);
    this.scene.add(this.platformRimL);

    this.platformRimR = new THREE.PointLight(0xff9944, 0, 350, 2);
    this.platformRimR.position.set(250, 20, 0);
    this.scene.add(this.platformRimR);
  }

  on() {
    this.ambient.intensity        = 0.6;
    this.keyLight.intensity       = 5.0;
    this.fillLight.intensity      = 2.0;
    this.groundBounce.intensity   = 2.5;
    this.rimLight.intensity       = 3.5;
    this.eyeGlowL.intensity       = 2.5;
    this.eyeGlowR.intensity       = 2.5;
    this.platformRimL.intensity   = 1.8;
    this.platformRimR.intensity   = 1.2;
  }

  off() {
    this.ambient.intensity        = 0;
    this.keyLight.intensity       = 0;
    this.fillLight.intensity      = 0;
    this.groundBounce.intensity   = 0;
    this.rimLight.intensity       = 0;
    this.eyeGlowL.intensity       = 0;
    this.eyeGlowR.intensity       = 0;
    this.platformRimL.intensity   = 0;
    this.platformRimR.intensity   = 0;
  }

  // Apelat în fiecare frame
  update(time) {
    // Pulsare ochi — cianic
    const pulse = 2.2 + Math.sin(time * 2.1) * 0.5;
    this.eyeGlowL.intensity = pulse;
    this.eyeGlowR.intensity = pulse;

    // Pulsare subtilă a luminilor de platformă
    this.platformRimL.intensity = 1.8 + Math.sin(time * 0.7) * 0.3;
    this.platformRimR.intensity = 1.2 + Math.sin(time * 0.9 + 1.2) * 0.25;
  }
}
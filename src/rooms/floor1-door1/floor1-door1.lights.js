// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 1 — Lumini Astronaut (IMPROVED)
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class AstroLights {
  constructor(scene) {
    this.scene = scene;
    this._setup();
  }

  _setup() {
    // ── Ambient (foarte slab, spațiu)
    this.ambient = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.ambient);

    // ── Key light (soare / centru)
    this.keyLight = new THREE.PointLight(0xffffff, 60, 1500);
    this.keyLight.position.set(0, 200, 0);
    this.scene.add(this.keyLight);

    // ── Fill light (cald)
    this.fillLight = new THREE.PointLight(0xffeedd, 25, 1400);
    this.fillLight.position.set(200, 40, 220);
    this.scene.add(this.fillLight);

    // ── Rim light (foarte important pentru astronaut)
    this.rimLight = new THREE.PointLight(0xffffff, 55, 1600);
    this.rimLight.position.set(-250, 120, -300);
    this.scene.add(this.rimLight);

    // ── Accent A (albastru rece - spațiu)
    this.accentLightA = new THREE.PointLight(0x66ccff, 40, 1200);
    this.accentLightA.position.set(-120, 90, 180);
    this.scene.add(this.accentLightA);

    // ── Accent B (turcoaz)
    this.accentLightB = new THREE.PointLight(0x70ffea, 30, 1200);
    this.accentLightB.position.set(140, 100, -160);
    this.scene.add(this.accentLightB);

    // ── Spotlight principal (focus astronaut)
    this.spotLight = new THREE.SpotLight(
      0xc0e8ff,
      40,
      1800,
      Math.PI / 9,
      0.25,
      0.8
    );

    this.spotLight.position.set(0, 260, 160);
    this.spotLight.target.position.set(0, 80, 0);
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);

    // ── NEW: astronaut dedicated light (FOCUS LIGHT)
    this.astronautLight = new THREE.PointLight(0x88cfff, 65, 900);
    this.astronautLight.position.set(80, 120, 120);
    this.scene.add(this.astronautLight);

    // ── NEW: subtle fill from below (space bounce)
    this.underLight = new THREE.PointLight(0x2233ff, 18, 700);
    this.underLight.position.set(0, -120, 0);
    this.scene.add(this.underLight);
  }

  on() {
    this.ambient.intensity   = 0.6;

    this.keyLight.intensity  = 60;
    this.fillLight.intensity = 35;
    this.rimLight.intensity  = 55;

    this.accentLightA.intensity = 40;
    this.accentLightB.intensity = 30;

    this.spotLight.intensity = 40;

    this.astronautLight.intensity = 65;
    this.underLight.intensity = 18;
  }

  off() {
    this.ambient.intensity = 0;

    this.keyLight.intensity = 0;
    this.fillLight.intensity = 0;
    this.rimLight.intensity = 0;

    this.accentLightA.intensity = 0;
    this.accentLightB.intensity = 0;

    this.spotLight.intensity = 0;

    this.astronautLight.intensity = 0;
    this.underLight.intensity = 0;
  }

  // ── optional: mică animație (arată mult mai “alive”)
  update(time) {
    const t = time * 0.002;

    if (this.accentLightA) {
      this.accentLightA.intensity = 35 + Math.sin(t) * 8;
    }

    if (this.astronautLight) {
      this.astronautLight.intensity = 60 + Math.sin(t * 1.3) * 10;
    }
  }
}
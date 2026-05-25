// ══════════════════════════════════════════════════════════════
//  FLOOR 2 - DOOR 1 — Environment Car Showroom
//  Platformă rotativă cu inele luminoase
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class CarEnvironment {
  constructor(scene) {
    this.scene = scene;
    this._createPlatform();
    this.setVisible(false);
  }

  _createPlatform() {
    this.group = new THREE.Group();

    // Disc principal
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(95, 95, 2, 128),
      new THREE.MeshStandardMaterial({ color: 0x111520, roughness: 0.15, metalness: 0.9 })
    );
    disc.position.y = -1;
    this.group.add(disc);

    // Inel exterior albastru
    this.ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(95, 2.5, 16, 128),
      new THREE.MeshStandardMaterial({ color: 0x0055ff, emissive: 0x0033cc, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.8 })
    );
    this.ring1.rotation.x = Math.PI / 2;
    this.ring1.position.y = 0.5;
    this.group.add(this.ring1);

    // Inel interior portocaliu
    this.ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(70, 1.2, 16, 128),
      new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.8 })
    );
    this.ring2.rotation.x = Math.PI / 2;
    this.ring2.position.y = 0.5;
    this.group.add(this.ring2);

    // Glow de podea
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(130, 64),
      new THREE.MeshBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -2;
    this.group.add(glow);

    // Lumina de podea
    this.glowLight = new THREE.PointLight(0x0033ff, 0, 250);
    this.glowLight.position.set(0, -5, 0);
    this.group.add(this.glowLight);

    this.group.position.set(0, 0, 0);
    this.scene.add(this.group);
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  // Apelat din update loop
  update(time, isRunning, rotationSpeed) {
    if (!this.group.visible) return;

    if (isRunning) {
      this.group.rotation.y += rotationSpeed;
    }

    this.ring1.material.emissiveIntensity = 0.8 + Math.sin(time * 2.0) * 0.2;
    this.ring2.material.emissiveIntensity = 0.5 + Math.cos(time * 1.5) * 0.2;
    this.glowLight.intensity = 2.5 + Math.sin(time * 1.8) * 0.8;
  }
}

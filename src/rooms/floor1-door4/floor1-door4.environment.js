// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 4 — Wall-E Environment
//  Platformă circulară gri-luminoasă pe fundal de spațiu
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class WalleEnvironment {
  constructor(scene) {
    this.scene      = scene;
    this.objects    = [];
    this._isVisible = false;

    this._createSpaceBackground();
    this._createPlatform();

    this.setVisible(false);
  }

  // ── FUNDAL SPAȚIU ─────────────────────────────────────────────
  _createSpaceBackground() {
    // Cer de noapte / spațiu — sferă uriașă inversată
    const skyGeo = new THREE.SphereGeometry(2000, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x000008,
      side: THREE.BackSide,
    });
    this.skybox = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skybox);
    this.objects.push(this.skybox);

    // Stele — particule albe aleatorii
    const starCount  = 1500;
    const starGeo    = new THREE.BufferGeometry();
    const positions  = new Float32Array(starCount * 3);
    const sizes      = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Distribuție pe sferă
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 1500 + Math.random() * 400;

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = Math.random() * 2.5 + 0.5;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const starMat = new THREE.PointsMaterial({
      color:       0xffffff,
      size:        2.0,
      sizeAttenuation: true,
      transparent: true,
      opacity:     0.85,
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
    this.objects.push(this.stars);

    // Câteva stele mai mari / strălucitoare (culori calde/reci)
    const brightColors  = [0xffeedd, 0xddeeff, 0xffffff, 0xffddaa, 0xaaddff];
    const brightStarGeo = new THREE.BufferGeometry();
    const bPos          = new Float32Array(80 * 3);

    for (let i = 0; i < 80; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 1400;

      bPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      bPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      bPos[i * 3 + 2] = r * Math.cos(phi);
    }

    brightStarGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));

    const brightMat = new THREE.PointsMaterial({
      color:       0xfff5e0,
      size:        4.5,
      sizeAttenuation: true,
      transparent: true,
      opacity:     0.95,
    });

    this.brightStars = new THREE.Points(brightStarGeo, brightMat);
    this.scene.add(this.brightStars);
    this.objects.push(this.brightStars);

    // Nebuloasă subtilă — sprite mare translucid portocaliu-roz
    const nebMat = new THREE.SpriteMaterial({
      color:       0xff6633,
      transparent: true,
      opacity:     0.04,
    });
    this.nebula1 = new THREE.Sprite(nebMat);
    this.nebula1.scale.set(1800, 900, 1);
    this.nebula1.position.set(600, 200, -1200);
    this.scene.add(this.nebula1);
    this.objects.push(this.nebula1);

    const nebMat2 = new THREE.SpriteMaterial({
      color:       0x3366ff,
      transparent: true,
      opacity:     0.03,
    });
    this.nebula2 = new THREE.Sprite(nebMat2);
    this.nebula2.scale.set(1400, 700, 1);
    this.nebula2.position.set(-700, 100, -1000);
    this.scene.add(this.nebula2);
    this.objects.push(this.nebula2);
  }

  // ── PLATFORMĂ CIRCULARĂ ───────────────────────────────────────
  _createPlatform() {
    // Disc principal — gri metalic deschis
    const discGeo = new THREE.CylinderGeometry(220, 220, 18, 64);
    const discMat = new THREE.MeshStandardMaterial({
      color:     0x8a8a8a,
      roughness: 0.35,
      metalness: 0.65,
    });
    this.disc = new THREE.Mesh(discGeo, discMat);
    this.disc.position.y = -9;
    this.disc.receiveShadow = true;
    this.disc.castShadow    = true;
    this.scene.add(this.disc);
    this.objects.push(this.disc);

    // Bordură exterioară — inel mai deschis / mai metalic
    const rimGeo = new THREE.TorusGeometry(220, 6, 16, 80);
    const rimMat = new THREE.MeshStandardMaterial({
      color:     0xc0c0c0,
      roughness: 0.2,
      metalness: 0.9,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0;
    this.scene.add(rim);
    this.objects.push(rim);

    // Inele decorative pe suprafața discului
    const ringRadii = [80, 140, 190];
    ringRadii.forEach(r => {
      const rGeo = new THREE.TorusGeometry(r, 1.5, 8, 64);
      const rMat = new THREE.MeshStandardMaterial({
        color:     0xaaaaaa,
        roughness: 0.3,
        metalness: 0.8,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.5;
      this.scene.add(ring);
      this.objects.push(ring);
    });

    // Lumini de podea integrate în platformă (mici puncte luminoase)
    const dotCount = 12;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const dotGeo = new THREE.CylinderGeometry(4, 4, 2, 16);
      const dotMat = new THREE.MeshStandardMaterial({
        color:     0xffffff,
        roughness: 0.1,
        metalness: 0.1,
        emissive:  0x88ccff,
        emissiveIntensity: 1.5,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(
        Math.cos(angle) * 200,
        1,
        Math.sin(angle) * 200,
      );
      this.scene.add(dot);
      this.objects.push(dot);
    }

    // Soclu central ușor ridicat
    const baseGeo = new THREE.CylinderGeometry(40, 45, 6, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color:     0x999999,
      roughness: 0.4,
      metalness: 0.7,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 3;
    this.scene.add(base);
    this.objects.push(base);
  }

  // ── VISIBILITY ────────────────────────────────────────────────
  setVisible(v) {
    this._isVisible = v;
    this.objects.forEach(o => { o.visible = v; });
  }

  // ── UPDATE ────────────────────────────────────────────────────
  update(time) {
    // Stele pâlpâie ușor
    if (this.stars) {
      this.stars.material.opacity = 0.75 + Math.sin(time * 0.3) * 0.1;
    }
    // Rotire lentă a stelelor — efect paralaxă
    if (this.brightStars) {
      this.brightStars.rotation.y = time * 0.005;
    }
  }

  dispose() {}
}
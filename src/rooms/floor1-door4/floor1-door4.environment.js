// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 4 — Wall-E Environment
//
//  Features:
//    • Dusty desert ground + horizon haze
//    • Starfield sky
//    • Floating dust/trash particles
//
//  Head tracking şi eye glow lights → floor1-door4.headmove.js
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ── Particle config ──────────────────────────────────────────
const DUST_COUNT  = 1800;
const DUST_FIELD  = 900;

export class WalleEnvironment {
  constructor(scene) {
    this.scene      = scene;
    this.objects    = [];
    this._isVisible = false;
    this._time      = 0;

    this._createGround();
    this._createStars();
    this._createDust();

    this.setVisible(false);
  }

  // ── GROUND ────────────────────────────────────────────────────
  _createGround() {
    // Slightly bumpy desert floor
    const geo = new THREE.PlaneGeometry(4000, 4000, 40, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i,
        Math.sin(x * 0.018) * Math.cos(y * 0.015) * 6
        + (Math.random() - 0.5) * 3
      );
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -10;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.objects.push(ground);

    // Horizon haze plane — large flat quad with additive gradient
    const hazeGeo = new THREE.PlaneGeometry(8000, 600);
    const hazeMat = new THREE.MeshBasicMaterial({
      color:       0xff7722,
      transparent: true,
      opacity:     0.07,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    });
    const haze = new THREE.Mesh(hazeGeo, hazeMat);
    haze.position.set(0, 80, -1800);
    this.scene.add(haze);
    this.objects.push(haze);
  }

  // ── STARS ─────────────────────────────────────────────────────
  _createStars() {
    const count = 1200;
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Hemisphere above the horizon
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.5;
      const r     = 3500 + Math.random() * 500;
      pos[i*3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3 + 1] = r * Math.cos(phi);
      pos[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color:           0xfff5e0,
      size:            3.5,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.7,
      depthWrite:      false,
    });
    const stars = new THREE.Points(geo, mat);
    stars.frustumCulled = false;
    this.scene.add(stars);
    this.objects.push(stars);
  }

  // ── DUST PARTICLES ────────────────────────────────────────────
  _createDust() {
    const pos = new Float32Array(DUST_COUNT * 3);

    this._dustData = Array.from({ length: DUST_COUNT }, (_, i) => {
      const x = (Math.random() - 0.5) * DUST_FIELD;
      const y = Math.random() * 200;
      const z = (Math.random() - 0.5) * DUST_FIELD;
      pos[i*3]     = x;
      pos[i*3 + 1] = y;
      pos[i*3 + 2] = z;
      return {
        vx:    (Math.random() - 0.5) * 0.3,
        vy:    0.05 + Math.random() * 0.15,
        vz:    (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
      };
    });

    this._dustPos = pos;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    this._dustGeo = geo;

    const mat = new THREE.PointsMaterial({
      color:           0xcc8844,
      size:            2.5,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.30,
      depthWrite:      false,
      blending:        THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(geo, mat);
    dust.frustumCulled = false;
    this.scene.add(dust);
    this.objects.push(dust);
  }

  // ── VISIBILITY ────────────────────────────────────────────────
  setVisible(v) {
    this._isVisible = v;
    this.objects.forEach(o => { o.visible = v; });
  }

  // ── UPDATE ────────────────────────────────────────────────────
  update(time) {
    if (!this._isVisible) return;
    this._time = time;

    // ── Dust drift ────────────────────────────────────────────
    const top = 200;
    for (let i = 0; i < DUST_COUNT; i++) {
      const d = this._dustData[i];
      this._dustPos[i*3]     += d.vx * 0.016 + Math.sin(time * 0.2 + d.phase) * 0.04;
      this._dustPos[i*3 + 1] += d.vy * 0.016;
      this._dustPos[i*3 + 2] += d.vz * 0.016;
      if (this._dustPos[i*3 + 1] > top) {
        this._dustPos[i*3 + 1] = -10;
      }
    }
    this._dustGeo.attributes.position.needsUpdate = true;
  }

  dispose() {}
}
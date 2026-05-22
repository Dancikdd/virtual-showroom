// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 1 — Environment Astronaut
//  Sistem solar complet + stele de fundal
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class AstroEnvironment {
  constructor(scene) {
    this.scene      = scene;
    this.planets    = [];
    this.orbitLines = [];

    this._createStars();
    this._createSolarSystem();

    this.setVisible(false);
  }

  // ══════════════════════════════════════════════════════════════
  //  STELE
  // ══════════════════════════════════════════════════════════════
  _createStars() {
    const count = 2500;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    const col   = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 12000;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12000;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12000;
      const b = 0.15 + Math.random() * 0.25;
      col[i * 3]     = b * 0.7;
      col[i * 3 + 1] = b * 0.8;
      col[i * 3 + 2] = b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    this.stars = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.0, vertexColors: true, sizeAttenuation: true,
      transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.scene.add(this.stars);
  }

  // ══════════════════════════════════════════════════════════════
  //  SISTEM SOLAR
  // ══════════════════════════════════════════════════════════════
  _createSolarSystem() {
    const texLoader = new THREE.TextureLoader();

    this.sun = new THREE.Mesh(
      new THREE.SphereGeometry(200, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffcc22 })
    );
    this.sun.position.set(0, -800, 0);
    this.scene.add(this.sun);

    this.sun.add(new THREE.Mesh(
      new THREE.SphereGeometry(260, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.12 })
    ));

    const BASE = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/';
    const planetData = [
      { color: 0xaaaaaa, tex: null,                          orbitR: 380,  size: 22, speed: 1.6,  name: 'Mercur',  atmo: null },
      { color: 0xe8cda0, tex: null,                          orbitR: 580,  size: 38, speed: 1.17, name: 'Venus',   atmo: 0xffeeaa },
      { color: 0x4488ff, tex: BASE + 'earth_atmos_2048.jpg', orbitR: 800,  size: 42, speed: 1.0,  name: 'Terra',   atmo: 0x4488ff },
      { color: 0xff4422, tex: null,                          orbitR: 1050, size: 30, speed: 0.80, name: 'Marte',   atmo: 0xff6644 },
      { color: 0xddaa88, tex: BASE + 'jupiter.jpg',          orbitR: 1450, size: 90, speed: 0.43, name: 'Jupiter', atmo: 0xddaa88 },
      { color: 0xeedd99, tex: null,                          orbitR: 1900, size: 75, speed: 0.32, name: 'Saturn',  atmo: null },
    ];

    planetData.forEach((pd) => {
      // Orbită
      const orbitPts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        orbitPts.push(new THREE.Vector3(Math.cos(a) * pd.orbitR, 0, Math.sin(a) * pd.orbitR));
      }
      const orbitLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.15 })
      );
      orbitLine.position.copy(this.sun.position);
      this.scene.add(orbitLine);
      this.orbitLines.push(orbitLine);

      // Planetă
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(pd.size, 32, 32),
        new THREE.MeshStandardMaterial({
          color: pd.tex ? 0xffffff : pd.color,
          map: pd.tex ? texLoader.load(pd.tex) : null,
          roughness: 0.8, metalness: 0.0,
        })
      );
      this.scene.add(mesh);

      if (pd.atmo) {
        mesh.add(new THREE.Mesh(
          new THREE.SphereGeometry(pd.size * 1.18, 32, 32),
          new THREE.MeshBasicMaterial({ color: pd.atmo, transparent: true, opacity: 0.13 })
        ));
      }

      if (pd.name === 'Saturn') {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(pd.size * 1.5, pd.size * 2.6, 64),
          new THREE.MeshBasicMaterial({ color: 0xddcc88, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
        );
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
      }

      let moon = null;
      if (pd.name === 'Terra') {
        moon = new THREE.Mesh(
          new THREE.SphereGeometry(14, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 })
        );
        this.scene.add(moon);
      }

      this.planets.push({ mesh, moon, orbitR: pd.orbitR, speed: pd.speed, angle: Math.random() * Math.PI * 2 });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  VIZIBILITATE
  // ══════════════════════════════════════════════════════════════
  setVisible(visible) {
    if (this.stars) this.stars.visible = visible;
    if (this.sun)   this.sun.visible   = visible;
    this.planets.forEach(p => {
      p.mesh.visible = visible;
      if (p.moon) p.moon.visible = visible;
    });
    this.orbitLines.forEach(o => o.visible = visible);
  }

  // ══════════════════════════════════════════════════════════════
  //  UPDATE
  // ══════════════════════════════════════════════════════════════
  update(time) {
    if (this.stars) this.stars.rotation.y = time * 0.006;

    this.planets.forEach((p) => {
      p.angle += 0.001 * p.speed;
      p.mesh.position.x = this.sun.position.x + Math.cos(p.angle) * p.orbitR;
      p.mesh.position.y = this.sun.position.y;
      p.mesh.position.z = this.sun.position.z + Math.sin(p.angle) * p.orbitR;
      p.mesh.rotation.y += 0.01 * p.speed;

      if (p.moon) {
        const moonAngle = time * 2.0;
        p.moon.position.x = p.mesh.position.x + Math.cos(moonAngle) * 70;
        p.moon.position.y = p.mesh.position.y;
        p.moon.position.z = p.mesh.position.z + Math.sin(moonAngle) * 70;
      }
    });
  }
}

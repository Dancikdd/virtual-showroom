import * as THREE from 'three';

export class AstroEnvironment {
  constructor(scene) {
    this.scene = scene;

    this.planets = [];
    this.orbitLines = [];

    this.loader = new THREE.TextureLoader();

    this._createStars();
    this._createSolarSystem();

    this.setVisible(false);
  }

  // ═══════════════════════════════
  // ✨ STELE
  // ═══════════════════════════════
  _createStars() {

    const count = 6500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      pos[i3]     = (Math.random() - 0.5) * 20000;
      pos[i3 + 1] = (Math.random() - 0.5) * 20000;
      pos[i3 + 2] = (Math.random() - 0.5) * 20000;

      const b = 0.4 + Math.random() * 0.9;

      col[i3] = b;
      col[i3 + 1] = b;
      col[i3 + 2] = b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 3.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.scene.add(this.stars);
  }

  // ═══════════════════════════════
  // 📦 TEXTURE LOADER
  // ═══════════════════════════════
  loadTexture(path) {
    const tex = this.loader.load(path);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // ═══════════════════════════════
  // 🌍 SISTEM SOLAR
  // ═══════════════════════════════
  _createSolarSystem() {

    this.sun = new THREE.Mesh(
      new THREE.SphereGeometry(200, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffcc22 })
    );

    this.sun.position.set(0, -800, 0);
    this.scene.add(this.sun);

    const planets = [
      { name: 'Mercur', orbitR: 380, size: 22, speed: 1.6, tex: '/planets/2k_mercury.jpg', color: 0x888888 },
      { name: 'Venus', orbitR: 580, size: 38, speed: 1.17, tex: '/planets/2k_venus_surface.jpg', color: 0xe8cda0 },
      { name: 'Terra', orbitR: 800, size: 42, speed: 1.0, tex: '/planets/2k_earth_daymap.jpg', color: 0x4488ff },
      { name: 'Marte', orbitR: 1050, size: 30, speed: 0.8, tex: '/planets/2k_mars.jpg', color: 0xff4422 },
      { name: 'Jupiter', orbitR: 1450, size: 90, speed: 0.43, tex: '/planets/2k_jupiter.jpg', color: 0xddaa88 },

      {
        name: 'Saturn',
        orbitR: 1900,
        size: 75,
        speed: 0.32,
        tex: '/planets/2k_saturn.jpg',
        color: 0xeedd99
      },

      { name: 'Uranus', orbitR: 2300, size: 60, speed: 0.25, tex: '/planets/2k_uranus.jpg', color: 0x66ccff },
      { name: 'Neptune', orbitR: 2700, size: 60, speed: 0.2, tex: '/planets/2k_neptune.jpg', color: 0x3355ff }
    ];

    planets.forEach((p) => {

      const texture = p.tex ? this.loadTexture(p.tex) : null;

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.size, 32, 32),
        new THREE.MeshStandardMaterial({
          map: texture,
          color: texture ? 0xffffff : p.color,
          roughness: 1,
          metalness: 0
        })
      );

      this.scene.add(mesh);

      // 🪐 SATURN RING
      let ring = null;

      if (p.name === 'Saturn') {
        const ringGeo = new THREE.RingGeometry(110, 170, 64);

        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xd8c59a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });

        ring = new THREE.Mesh(ringGeo, ringMat);

        // 🪐 ușor înclinat (realist)
        ring.rotation.x = Math.PI / 2 + 0.35;
        ring.rotation.z = 0.15;

        this.scene.add(ring);
      }

      this.planets.push({
        mesh,
        ring,
        orbitR: p.orbitR,
        speed: p.speed,
        angle: Math.random() * Math.PI * 2,
        spin: 0.002 + Math.random() * 0.003
      });

      // orbit line
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          Math.cos(a) * p.orbitR,
          0,
          Math.sin(a) * p.orbitR
        ));
      }

      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: 0xaaddff,
          transparent: true,
          opacity: 0.12
        })
      );

      line.position.copy(this.sun.position);
      this.scene.add(line);
      this.orbitLines.push(line);
    });
  }

  // ═══════════════════════════════
  setVisible(v) {
    if (this.stars) this.stars.visible = v;
    if (this.sun) this.sun.visible = v;

    this.planets.forEach(p => {
      p.mesh.visible = v;
      if (p.ring) p.ring.visible = v;
    });

    this.orbitLines.forEach(o => o.visible = v);
  }

  // ═══════════════════════════════
  update(time) {

    if (this.stars) this.stars.rotation.y = time * 0.002;

    this.planets.forEach((p) => {
      p.angle += 0.001 * p.speed;

      const x = this.sun.position.x + Math.cos(p.angle) * p.orbitR;
      const z = this.sun.position.z + Math.sin(p.angle) * p.orbitR;
      const y = this.sun.position.y;

      p.mesh.position.set(x, y, z);

      // 🌍 rotație pe axă
      p.mesh.rotation.y += p.spin;

      // 🪐 ring urmează planeta
      if (p.ring) {
        p.ring.position.set(x, y, z);
      }
    });
  }
}
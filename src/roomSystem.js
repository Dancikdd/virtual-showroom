import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Config per ușă — adaugi tu modelele reale
const ROOM_CONFIG = {
  'door_001': { label: 'Produs 1', color: 0x8844ff },
  'door_002': { label: 'Produs 2', color: 0xff4488 },
  'door_003': { label: 'Produs 3', color: 0x44ffaa },
  'door_004': { label: 'Produs 4', color: 0xff8844 },
  'door_005': { label: 'Produs 5', color: 0x44aaff },
  'door_006': { label: 'Produs 6', color: 0xffff44 },
  'door_007': { label: 'Produs 7', color: 0xff4444 },
  'door_008': { label: 'Produs 8', color: 0x44ff44 },
};

export class RoomSystem {
  constructor(renderer, onExit) {
    this.renderer = renderer;
    this.onExit = onExit; // callback când iese din cameră
    this.active = false;
    this.currentModel = null;
    this.rotationY = 0;

    // Scenă separată — spațiu negru
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);

    // Camera proprie
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 80, 250);
    this.camera.lookAt(0, 80, 0);

    // Lumini dramatice pe model
    const ambient = new THREE.AmbientLight(0xffffff, 3);
    this.scene.add(ambient);

    this.spotLight = new THREE.SpotLight(0xffffff, 3, 800, Math.PI / 6, 0.3);
    this.spotLight.position.set(0, 400, 200);
    this.spotLight.target.position.set(0, 0, 0);
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);

    this.rimLight = new THREE.PointLight(0x6633ff, 2, 600);
    this.rimLight.position.set(-200, 100, -200);
    this.scene.add(this.rimLight);

    this.rimLight2 = new THREE.PointLight(0xff3366, 1.5, 500);
    this.rimLight2.position.set(200, 50, -150);
    this.scene.add(this.rimLight2);

    // Overlay pentru flash + fade
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: white;
      opacity: 0;
      pointer-events: none;
      z-index: 100;
      transition: none;
    `;
    document.body.appendChild(this.overlay);

    // Label produs
    this.label = document.createElement('div');
    this.label.style.cssText = `
      position: fixed;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 22px;
      font-family: sans-serif;
      letter-spacing: 3px;
      text-transform: uppercase;
      opacity: 0;
      transition: opacity 0.8s ease;
      z-index: 50;
      pointer-events: none;
    `;
    document.body.appendChild(this.label);

    // Particle ring decorativ
    this._createParticleRing();

    this.loader = new GLTFLoader();
    this._preloadAll();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  _createParticleRing() {
    const count = 300;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 180 + Math.random() * 40;
      pos[i * 3]     = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    this.particleMat = new THREE.PointsMaterial({
      color: 0x8844ff,
      size: 2.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
    });

    this.particles = new THREE.Points(geo, this.particleMat);
    this.particles.position.set(0, 80, 0);
    this.particles.visible = false; 
    this.scene.add(this.particles);
  }

_preloadAll() {
  this.models = {};

  Object.entries(ROOM_CONFIG).forEach(([key, config]) => {
    const geo = new THREE.BoxGeometry(80, 80, 80);
    const mat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.3,
      metalness: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 40, 0);
    mesh.visible = false;
    this.scene.add(mesh);
    this.models[key] = { mesh, config };
  });
}

  enter(doorKey) {
    if (this.active) return;

    console.log('enter doorKey:', doorKey);
    
    this.active = true;

    this._flash(() => {
      if (this.currentModel) {
        this.currentModel.visible = false;
      }

      const entry = this.models[doorKey];
      if (entry) {
        entry.mesh.visible = true;
        this.currentModel = entry.mesh;
        this.label.textContent = entry.config.label;
      } else {
        this.label.textContent = doorKey;
      }

      this.rotationY = 0;
      this.particles.visible = true;

      this.particleMat.opacity = 0;
      this.label.style.opacity = '1';
    });
  }

exit() {
  if (!this.active) return;

  this.label.style.opacity = '0';

  this.overlay.style.transition = 'none';
  this.overlay.style.opacity = '0';

  requestAnimationFrame(() => {
    this.overlay.style.transition = 'opacity 0.15s ease-in';
    this.overlay.style.opacity = '1';

    setTimeout(() => {
      this.active = false;
      if (this.currentModel) {
        this.currentModel.visible = false;
        this.currentModel = null;
      }
      this.particleMat.opacity = 0;
      this.particles.visible = false;

      if (typeof this.onExit === 'function') {
        this.onExit();
      }

      // Fade back — acum se vede corridorul din poziția corectă
      this.overlay.style.transition = 'opacity 0.4s ease-out';
      this.overlay.style.opacity = '0';

    }, 150);
  });
}

_flash(onMidpoint, onComplete) {
  // Reset overlay
  this.overlay.style.transition = 'none';
  this.overlay.style.opacity = '0';

  this.camera.position.set(0, 80, 250);
  this.camera.fov = 75;
  this.camera.updateProjectionMatrix();

  requestAnimationFrame(() => {
    this.overlay.style.transition = 'opacity 0.4s ease-in';
    this.overlay.style.opacity = '1';

    setTimeout(() => {
      onMidpoint();

      this.overlay.style.transition = 'opacity 0.6s ease-out';
      this.overlay.style.opacity = '0';

      this._animateEntry();

      setTimeout(() => {
        if (typeof onComplete === 'function') onComplete();
      }, 600);
    }, 400);
  });
}

_animateEntry() {
  const duration = 1200; // ms
  const start = performance.now();

  const startZ = 320;
  const endZ = 250;
  const startFov = 72;
  const endFov = 60;

  this.camera.position.z = startZ;
  this.camera.fov = startFov;
  this.camera.updateProjectionMatrix();

  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    // ease out cubic
    const e = 1 - Math.pow(1 - t, 3);

    this.camera.position.z = startZ + (endZ - startZ) * e;
    this.camera.fov = startFov + (endFov - startFov) * e;
    this.camera.updateProjectionMatrix();

    if (t < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

  update(time) {
    if (!this.active) return;

    this.renderer.autoClear = true; // ← adaugă

    // Rotație lentă model
    if (this.currentModel) {
      this.currentModel.rotation.y = time * 0.3;
    }

    // Particule fade in
    this.particleMat.opacity += (0.7 - this.particleMat.opacity) * 0.03;

    // Ring rotație
    this.particles.rotation.y = time * 0.1;

    // Rim lights pulsate
    this.rimLight.intensity = 2 + Math.sin(time * 1.5) * 0.5;
    this.rimLight2.intensity = 1.5 + Math.cos(time * 1.2) * 0.4;

    this.renderer.render(this.scene, this.camera);
  }
}
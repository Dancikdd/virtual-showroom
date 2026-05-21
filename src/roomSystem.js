import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const ROOM_CONFIG = {
  'door_001': {
    label: 'Produs 1',
    color: 0x8844ff,
    modelPath: '/products/astronaut-animated.glb',
    scale: 1,
    offsetY: 60,
  },
  'door_002': {
    label: 'Produs 2',
    color: 0xff4488,
    modelPath: null,
    scale: 1,
    offsetY: 0,
  },
  'door_003': {
    label: 'Produs 3',
    color: 0x44ffaa,
    modelPath: null,
    scale: 1,
    offsetY: 0,
  },
  'door_004': {
    label: 'Produs 4',
    color: 0xff8844,
    modelPath: null,
    scale: 1,
    offsetY: 0,
  },
  'door_005': {
    label: 'Produs 5',
    color: 0x44aaff,
    modelPath: null,
    scale: 1,
    offsetY: 0,
  },
  'door_006': {
    label: 'Produs 6',
    color: 0xffff44,
    modelPath: null,
    scale: 1,
    offsetY: 0,
  },
  'door_007': {
    label: 'Produs 7',
    color: 0xff4444,
    modelPath: null,
    scale: 1,
    offsetY: 0,
  },
  'door_008': {
    label: 'Produs 8',
    color: 0x44ff44,
    modelPath: null,
    scale: 1,
    offsetY: 0,
  },
};

export class RoomSystem {
  constructor(renderer, onExit) {
    this.renderer = renderer;
    this.onExit = onExit;
    this.active = false;
    this.currentModel = null;

    this.mixer = null;
    this.clock = new THREE.Clock();

    this.orbitYaw      = 0;
    this.orbitPitch    = 0;
    this.smoothYaw     = 0;
    this.smoothPitch   = 0;

    // Raza orbita — 170 e normal, creste la click
    this._orbitR       = 170;
    this._orbitRTarget = 170;

    this.lastMouseX    = 0;
    this.lastMouseY    = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 80, 250);
    this.camera.lookAt(0, 80, 0);

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

    this._injectCursorStyle();

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

    this.texLoader  = new THREE.TextureLoader();
    this.raycaster  = new THREE.Raycaster();
    this.mouse2D    = new THREE.Vector2();

    this._createStars();

    this.modelCache = {};

    this.loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    this.loader.setDRACOLoader(dracoLoader);

    this._bindMouseEvents();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  _injectCursorStyle() {
    if (document.getElementById('room-cursor-style')) return;
    const style = document.createElement('style');
    style.id = 'room-cursor-style';
    style.textContent = `
      .room-grab    { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg fill='white' stroke='%23333' stroke-width='1.5'%3E%3Crect x='13' y='2' width='4' height='14' rx='2'/%3E%3Crect x='18' y='4' width='4' height='12' rx='2'/%3E%3Crect x='8' y='5' width='4' height='12' rx='2'/%3E%3Crect x='23' y='7' width='4' height='10' rx='2'/%3E%3Crect x='6' y='15' width='20' height='12' rx='3'/%3E%3C/g%3E%3C/svg%3E") 10 4, grab; }
      .room-grabbing { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg fill='white' stroke='%23333' stroke-width='1.5'%3E%3Crect x='8' y='10' width='4' height='10' rx='2'/%3E%3Crect x='13' y='8' width='4' height='12' rx='2'/%3E%3Crect x='18' y='8' width='4' height='12' rx='2'/%3E%3Crect x='23' y='10' width='4' height='10' rx='2'/%3E%3Crect x='6' y='18' width='20' height='10' rx='3'/%3E%3C/g%3E%3C/svg%3E") 10 4, grabbing; }
    `;
    document.head.appendChild(style);
  }

  _createStars() {
    const count = 2000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 6000;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6000;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6000;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 1.4, sizeAttenuation: true, transparent: true, opacity: 0.85,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
    this._createSolarSystem();
  }

  _createSolarSystem() {
    const sunGeo = new THREE.SphereGeometry(200, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc22 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(0, -800, 0);
    this.scene.add(this.sun);

    const glowGeo = new THREE.SphereGeometry(260, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.12 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.sun.add(glow);

    const BASE = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/';
    const planetData = [
      { color: 0xaaaaaa, tex: null,                          orbitR: 380,  size: 22, speed: 1.6,  tilt: 0.06, name: 'Mercur', atmo: null },
      { color: 0xe8cda0, tex: null,                          orbitR: 580,  size: 38, speed: 1.17, tilt: 0.04, name: 'Venus',  atmo: 0xffeeaa },
      { color: 0x4488ff, tex: BASE + 'earth_atmos_2048.jpg', orbitR: 800,  size: 42, speed: 1.0,  tilt: 0.0,  name: 'Terra',  atmo: 0x4488ff },
      { color: 0xff4422, tex: null,                          orbitR: 1050, size: 30, speed: 0.80, tilt: 0.03, name: 'Marte',  atmo: 0xff6644 },
      { color: 0xddaa88, tex: BASE + 'jupiter.jpg',          orbitR: 1450, size: 90, speed: 0.43, tilt: 0.02, name: 'Jupiter',atmo: 0xddaa88 },
      { color: 0xeedd99, tex: null,                          orbitR: 1900, size: 75, speed: 0.32, tilt: 0.04, name: 'Saturn', atmo: null },
    ];

    this.planets = [];
    this.orbitLines = [];

    planetData.forEach((pd) => {
      const orbitPts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        orbitPts.push(new THREE.Vector3(Math.cos(a) * pd.orbitR, 0, Math.sin(a) * pd.orbitR));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
      const orbitMat = new THREE.LineBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.15 });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.position.copy(this.sun.position);
      this.scene.add(orbitLine);
      this.orbitLines.push(orbitLine);

      const geo = new THREE.SphereGeometry(pd.size, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: pd.tex ? 0xffffff : pd.color,
        map: pd.tex ? this.texLoader.load(pd.tex) : null,
        roughness: 0.8,
        metalness: 0.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);

      if (pd.atmo) {
        const atmoGeo = new THREE.SphereGeometry(pd.size * 1.18, 32, 32);
        const atmoMat = new THREE.MeshBasicMaterial({ color: pd.atmo, transparent: true, opacity: 0.13, side: THREE.FrontSide });
        const atmo = new THREE.Mesh(atmoGeo, atmoMat);
        mesh.add(atmo);
      }

      let ring = null;
      if (pd.name === 'Saturn') {
        const ringGeo = new THREE.RingGeometry(pd.size * 1.5, pd.size * 2.6, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xddcc88, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
        ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
      }

      let moon = null;
      if (pd.name === 'Terra') {
        const moonGeo = new THREE.SphereGeometry(14, 16, 16);
        const moonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
        moon = new THREE.Mesh(moonGeo, moonMat);
        this.scene.add(moon);
      }

      this.planets.push({ mesh, moon, orbitR: pd.orbitR, speed: pd.speed, tilt: pd.tilt, angle: Math.random() * Math.PI * 2 });
    });
  }

  _bindMouseEvents() {
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this._onMouseDown = (e) => {
      if (!this.active) return;

      if (this.currentModel) {
        this.mouse2D.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        this.mouse2D.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse2D, this.camera);
        const hits = this.raycaster.intersectObject(this.currentModel, true);

        if (hits.length > 0) {
          // Fiecare click adauga la raza — se poate apasa la infinit
          this._orbitRTarget += 80; // cat creste la fiecare click
          return;
        }
      }

      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      document.body.classList.remove('room-grab');
      document.body.classList.add('room-grabbing');
    };

    this._onMouseMove = (e) => {
      if (!this.active || !this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.orbitYaw   -= dx * 0.003;
      this.orbitPitch += dy * 0.003;
      this.orbitPitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.orbitPitch));
    };

    this._onMouseUp = () => {
      if (!this.active) return;
      this.isDragging = false;
      document.body.classList.remove('room-grabbing');
      document.body.classList.add('room-grab');
    };

    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup',   this._onMouseUp);
  }

  _makePlaceholder(config) {
    const geo = new THREE.BoxGeometry(80, 80, 80);
    const mat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.3,
      metalness: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 40 + config.offsetY, 0);
    mesh.visible = false;
    this.scene.add(mesh);
    return { object: mesh, mixer: null };
  }

  _loadModel(doorKey, config, onReady) {
    if (this.modelCache[doorKey]) {
      onReady(this.modelCache[doorKey]);
      return;
    }

    if (!config.modelPath) {
      const entry = this._makePlaceholder(config);
      this.modelCache[doorKey] = entry;
      onReady(entry);
      return;
    }

    this.loader.load(
      config.modelPath,
      (gltf) => {
        const group = gltf.scene;

        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 120;
        const autoScale = (targetSize / maxDim) * config.scale;

        group.scale.setScalar(autoScale);
        group.position.set(
          -center.x * autoScale,
          -box.min.y * autoScale + config.offsetY,
          -center.z * autoScale
        );

        group.visible = false;
        this.scene.add(group);

        let mixer = null;
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(group);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        }

        const entry = { object: group, mixer };
        this.modelCache[doorKey] = entry;
        onReady(entry);
      },
      undefined,
      (err) => {
        console.warn(`Nu am putut încărca modelul pentru ${doorKey}:`, err);
        const entry = this._makePlaceholder(config);
        this.modelCache[doorKey] = entry;
        onReady(entry);
      }
    );
  }

  enter(doorKey) {
    if (this.active) return;

    console.log('enter doorKey:', doorKey);
    this.active = true;
    document.body.classList.remove('room-grabbing');
    document.body.classList.add('room-grab');
    document.body.style.cursor = '';
    const cc = document.getElementById('cursor');
    if (cc) cc.style.display = 'none';

    this.orbitYaw      = 0;
    this.orbitPitch    = 0;
    this._orbitR       = 170;
    this._orbitRTarget = 170;

    const config = ROOM_CONFIG[doorKey];

    this._flash(() => {
      if (this.currentModel) {
        this.currentModel.visible = false;
        this.currentModel = null;
        this.mixer = null;
      }

      this.label.textContent = config ? config.label : doorKey;
      this.label.style.opacity = '1';

      this._loadModel(doorKey, config, (entry) => {
        if (!this.active) return;
        entry.object.visible = true;
        this.currentModel = entry.object;
        this.mixer = entry.mixer;
        this.clock.getDelta();
      });
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
        this.mixer = null;

        document.body.classList.remove('room-grab', 'room-grabbing');
        document.body.style.cursor = 'none';
        const cc = document.getElementById('cursor');
        if (cc) cc.style.display = 'block';
        if (typeof this.onExit === 'function') this.onExit();

        this.overlay.style.transition = 'opacity 0.4s ease-out';
        this.overlay.style.opacity = '0';
      }, 150);
    });
  }

  _flash(onMidpoint, onComplete) {
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
    const duration = 1200;
    const start = performance.now();
    const startZ = 320, endZ = 250;
    const startFov = 72, endFov = 60;

    this.camera.position.z = startZ;
    this.camera.fov = startFov;
    this.camera.updateProjectionMatrix();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
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

    this.renderer.autoClear = true;

    const delta = this.clock.getDelta();

    if (this.mixer) this.mixer.update(delta);

    const lerpSpeed = 0.04;
    this.smoothYaw   += (this.orbitYaw   - this.smoothYaw)   * lerpSpeed;
    this.smoothPitch += (this.orbitPitch - this.smoothPitch) * lerpSpeed;
    const lookX = Math.sin(this.smoothYaw) * Math.cos(this.smoothPitch);
    const lookY = Math.sin(this.smoothPitch);
    const lookZ = -Math.cos(this.smoothYaw) * Math.cos(this.smoothPitch);
    this.camera.position.set(0, 80, 0);
    this.camera.lookAt(lookX * 100, 80 + lookY * 100, lookZ * 100);

    if (this.currentModel) {
      const t = time * 0.18;

      this._orbitR += (this._orbitRTarget - this._orbitR) * 0.08;
      this._orbitRTarget += (170 - this._orbitRTarget) * 0.002; 

      const r = this._orbitR;
      const x = Math.sin(t) * r;
      const y = 80 + Math.sin(t * 0.7 + 1.2) * r * 0.45;
      const z = Math.cos(t * 0.9 + 0.5) * r;

      this.currentModel.position.set(x, y, z);

      this.currentModel.rotation.y = time * 1.2;
    }

    if (this.planets) {
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

    if (this.stars) this.stars.rotation.y = time * 0.008;

    this.rimLight.intensity  = 2   + Math.sin(time * 1.5) * 0.5;
    this.rimLight2.intensity = 1.5 + Math.cos(time * 1.2) * 0.4;

    this.renderer.render(this.scene, this.camera);
  }
}
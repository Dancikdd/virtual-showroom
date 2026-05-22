import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { DoorModelManager } from './doorManager.js';

const ROOM_CONFIG = {
  // ── Etaj 1 ──
  // showGalaxy: true  → afișează galaxia + nebuloasele în camera respectivă
  'floor1_door_001': { label: 'Produs 1',  color: 0x8844ff, modelPath: '/products/astronaut-animated.glb', scale: 1, offsetY: 60, animation: 'orbit',        showGalaxy: false },
  'floor1_door_002': { label: 'Produs 2',  color: 0xff4488, modelPath: null, scale: 1, offsetY: 0, theme: 'underwater', animation: 'rotate',                   showGalaxy: false },
  'floor1_door_003': { label: 'Produs 3',  color: 0x44ffaa, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor1_door_004': { label: 'Produs 4',  color: 0xff8844, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor1_door_005': { label: 'Produs 5',  color: 0x44aaff, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor1_door_006': { label: 'Produs 6',  color: 0xffff44, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor1_door_007': { label: 'Produs 7',  color: 0xff4444, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor1_door_008': { label: 'Produs 8',  color: 0x44ff44, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },

  // ── Etaj 2 ──
  'floor2_door_001': { label: 'Porsche 911 GT3 RS',  color: 0xff6600, modelPath: '/products/lamborghini_centenario_lp-770_interior_sdc.glb', scale: 1.5, offsetY: 0, animation: 'car_showroom', showGalaxy: true  },
  'floor2_door_002': { label: 'Produs 10', color: 0xff44aa, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor2_door_003': { label: 'Produs 11', color: 0x44ffcc, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor2_door_004': { label: 'Produs 12', color: 0xff6622, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor2_door_005': { label: 'Produs 13', color: 0x2266ff, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor2_door_006': { label: 'Produs 14', color: 0xffee22, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor2_door_007': { label: 'Produs 15', color: 0xff2222, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
  'floor2_door_008': { label: 'Produs 16', color: 0x22ff22, modelPath: null, scale: 1, offsetY: 0, animation: 'rotate',                                         showGalaxy: false },
};

// ── Offset-uri în spațiul LOCAL al mașinii pentru camera interioară ──
// Ajustează după geometria modelului tău dacă e necesar
const CAR_INTERIOR_CAM_OFFSET    = new THREE.Vector3(0, 30, 0);   // centrul interiorului mașinii
const CAR_INTERIOR_LOOKAT_OFFSET = new THREE.Vector3(0, 30, -120); // privire înainte (prin parbriz)

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

    this._orbitR       = 170;
    this._orbitRTarget = 170;

    this.lastMouseX    = 0;
    this.lastMouseY    = 0;

    // CAR ROTATION SYSTEM
    this.isCarRunning = false;
    this.carRotationSpeed = 0;
    this.carRotationTarget = 0.005;
    this.currentAnimationType = 'rotate';

    // ── CAR INTERIOR VIEW ──
    this.isInsideCar = false;
    this._interiorTransitioning = false;
    this._camPosLerp  = new THREE.Vector3();
    this._camLookLerp = new THREE.Vector3();

    // DOOR ANIMATION SYSTEM
    this.doorsOpen = false;
    this.doorActions = [];

    // ── Platformă mașină ──
    this.carPlatform = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x00010a);

    // ── FOG mai slab ──
    this.scene.fog = new THREE.FogExp2(0x00010a, 0.00005);

    this.doorManager = new DoorModelManager(this.scene);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      20000
    );
    this.camera.position.set(0, 80, 400);
    this.camera.lookAt(0, 80, 0);

    // ── Ambient ──
    const ambient = new THREE.AmbientLight(0x080d20, 1.5);
    this.scene.add(ambient);

    const topLight = new THREE.PointLight(0xffffff, 3, 1000);
    topLight.position.set(0, 500, 0);
    this.scene.add(topLight);

    const bottomLight = new THREE.PointLight(0x1133ff, 1.5, 800);
    bottomLight.position.set(0, -200, 0);
    this.scene.add(bottomLight);

    this.spotLight = new THREE.SpotLight(0xffffff, 4, 800, Math.PI / 6, 0.3);
    this.spotLight.position.set(0, 400, 200);
    this.spotLight.target.position.set(0, 0, 0);
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(200, 300, 100);
    keyLight.target.position.set(0, 50, 0);
    this.scene.add(keyLight);
    this.scene.add(keyLight.target);

    const fillLight = new THREE.DirectionalLight(0x2244ff, 1.5);
    fillLight.position.set(-200, 300, -100);
    this.scene.add(fillLight);

    this.rimLight = new THREE.PointLight(0x6633ff, 1.5, 600);
    this.rimLight.position.set(-200, 100, -200);
    this.scene.add(this.rimLight);

    this.rimLight2 = new THREE.PointLight(0xff3366, 1.2, 500);
    this.rimLight2.position.set(200, 50, -150);
    this.scene.add(this.rimLight2);

    // ── Lumini dedicate MAȘINII ──
    this.carKeyLight = new THREE.SpotLight(0xffffff, 0, 800, Math.PI / 4, 0.15);
    this.carKeyLight.position.set(0, 280, 120);
    this.carKeyLight.target.position.set(0, 0, 0);
    this.scene.add(this.carKeyLight);
    this.scene.add(this.carKeyLight.target);

    this.carFillLeft = new THREE.PointLight(0xfff5ee, 0, 600);
    this.carFillLeft.position.set(-200, 100, 60);
    this.scene.add(this.carFillLeft);

    this.carFillRight = new THREE.PointLight(0xeef5ff, 0, 600);
    this.carFillRight.position.set(200, 100, 60);
    this.scene.add(this.carFillRight);

    this.carFrontLight = new THREE.SpotLight(0xffffff, 0, 500, Math.PI / 4, 0.2);
    this.carFrontLight.position.set(0, 120, 250);
    this.carFrontLight.target.position.set(0, 20, 0);
    this.scene.add(this.carFrontLight);
    this.scene.add(this.carFrontLight.target);

    this.carBackLight = new THREE.PointLight(0xffffff, 0, 400);
    this.carBackLight.position.set(0, 100, -200);
    this.scene.add(this.carBackLight);

    this.carUnderLight = new THREE.PointLight(0xff6600, 0, 300);
    this.carUnderLight.position.set(0, -10, 0);
    this.scene.add(this.carUnderLight);

    // ── Lumina de interior cockpit (portocaliu-roșu cald) ──
    this.interiorCabinLight = new THREE.PointLight(0xff4400, 0, 80);
    this.interiorCabinLight.position.set(0, 30, 0);
    this.scene.add(this.interiorCabinLight);

    // ── Lumini galaxie ──
    this.galaxyLight1 = new THREE.PointLight(0x0033cc, 0.6, 3000);
    this.galaxyLight1.position.set(-1000, 500, -1500);
    this.scene.add(this.galaxyLight1);

    this.galaxyLight2 = new THREE.PointLight(0x0055cc, 0.4, 2500);
    this.galaxyLight2.position.set(1200, -300, -1000);
    this.scene.add(this.galaxyLight2);

    // ── Overlay fade ──
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: #00010a;
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

    // ── LOADING INDICATOR ──
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ff6600;
      font-size: 16px;
      font-family: sans-serif;
      letter-spacing: 4px;
      text-transform: uppercase;
      opacity: 0;
      z-index: 200;
      pointer-events: none;
      transition: opacity 0.3s ease;
      text-align: center;
    `;
    this.loadingIndicator.innerHTML = `
      <div style="margin-bottom:12px;font-size:28px;">⟳</div>
      <div>SE ÎNCARCĂ...</div>
    `;
    document.body.appendChild(this.loadingIndicator);

    this._spinnerAngle = 0;

    // ── CAR CONTROLS CONTAINER ──
    this.carControls = document.createElement('div');
    this.carControls.id = 'car-controls';
    this.carControls.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 15px;
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(this.carControls);

    // ── CAR START/STOP BUTTON ──
    this.btnCarStart = document.createElement('button');
    this.btnCarStart.id = 'car-start-btn';
    this.btnCarStart.textContent = '▶ START';
    this.btnCarStart.style.cssText = `
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border: 2px solid #ff6600;
      background: rgba(255, 102, 0, 0.2);
      color: #ff6600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    this.btnCarStart.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCarEngine();
    });
    this.carControls.appendChild(this.btnCarStart);

    // ── DOORS BUTTON ──
    this.doorsButton = document.createElement('button');
    this.doorsButton.id = 'doors-btn';
    this.doorsButton.textContent = '🚪 DESCHIDE UȘILE';
    this.doorsButton.style.cssText = `
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border: 2px solid #44aaff;
      background: rgba(68, 170, 255, 0.2);
      color: #44aaff;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    this.doorsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleBothDoors();
    });
    this.carControls.appendChild(this.doorsButton);

    // ── INTERIOR BUTTON ──
    this.btnCarInterior = document.createElement('button');
    this.btnCarInterior.id = 'car-interior-btn';
    this.btnCarInterior.textContent = '🚗 INTRĂ ÎN MAȘINĂ';
    this.btnCarInterior.style.cssText = `
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border: 2px solid #00ffaa;
      background: rgba(0, 255, 170, 0.12);
      color: #00ffaa;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    this.btnCarInterior.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCarInterior();
    });
    this.carControls.appendChild(this.btnCarInterior);

    // ── HUD interior (vizibil doar când ești în mașină) ──
    this._createInteriorHUD();

    this.texLoader  = new THREE.TextureLoader();
    this.raycaster  = new THREE.Raycaster();
    this.mouse2D    = new THREE.Vector2();

    this._createGalaxyBackground();
    this._createStars();
    this._createCarPlatform();

    this.modelCache = {};

    this.loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    this.loader.setDRACOLoader(dracoLoader);

    this._preloadAllModels();
    this._bindMouseEvents();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  HUD interior cockpit (vignetă minimală — fără speedometer)
  // ══════════════════════════════════════════════════════════════
  _createInteriorHUD() {
    this.interiorHUD = document.createElement('div');
    this.interiorHUD.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 60;
      opacity: 0;
      transition: opacity 0.6s ease;
    `;

    // Vignetă — margini întunecoase pentru feeling de cockpit
    const vignette = document.createElement('div');
    vignette.style.cssText = `
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center,
        transparent 45%,
        rgba(0,0,0,0.40) 75%,
        rgba(0,0,0,0.82) 100%
      );
    `;
    this.interiorHUD.appendChild(vignette);
    document.body.appendChild(this.interiorHUD);
  }
  // ══════════════════════════════════════════════════════════════
  //  TOGGLE INTERIOR VIEW
  // ══════════════════════════════════════════════════════════════
  toggleCarInterior() {
    if (this._interiorTransitioning) return;
    this.isInsideCar = !this.isInsideCar;
    this._interiorTransitioning = true;

    // ── Actualizează butoanele ──
    if (this.isInsideCar) {
      this.btnCarInterior.textContent      = '🚗 IEȘi DIN MAȘINĂ';
      this.btnCarInterior.style.background = 'rgba(0, 255, 170, 0.3)';
      this.btnCarInterior.style.boxShadow  = '0 0 12px rgba(0,255,170,0.4)';
      // Ascunde START când ești în interior
      this.btnCarStart.style.opacity       = '0';
      this.btnCarStart.style.pointerEvents = 'none';
    } else {
      this.btnCarInterior.textContent      = '🚗 INTRĂ ÎN MAȘINĂ';
      this.btnCarInterior.style.background = 'rgba(0, 255, 170, 0.12)';
      this.btnCarInterior.style.boxShadow  = 'none';
      // Arată START la ieșire
      this.btnCarStart.style.opacity       = '1';
      this.btnCarStart.style.pointerEvents = 'auto';
    }

    // ── Flash scurt de tranziție ──
    this.overlay.style.transition = 'opacity 0.18s ease-in';
    this.overlay.style.opacity    = '0.85';

    setTimeout(() => {
      // Setează starea camerelor după fade
      if (this.isInsideCar) {
        // ── Intră în mașină — FOV mai îngust (ca ochii unui șofer) ──
        this.camera.fov = 80;
        this.camera.updateProjectionMatrix();
        this.interiorHUD.style.opacity = '1';

        // Pornește lumina de cockpit
        if (this.interiorCabinLight) this.interiorCabinLight.intensity = 1.8;

        // Resetează yaw/pitch interior la zero (privire înainte)
        this.orbitYaw   = 0;
        this.orbitPitch = 0;
        this.smoothYaw  = 0;
        this.smoothPitch = 0;

      } else {
        // ── Iese din mașină ──
        this.camera.fov = 60;
        this.camera.updateProjectionMatrix();
        this.interiorHUD.style.opacity = '0';
        if (this.interiorCabinLight) this.interiorCabinLight.intensity = 0;
      }

      this.overlay.style.transition = 'opacity 0.3s ease-out';
      this.overlay.style.opacity    = '0';

      setTimeout(() => {
        this._interiorTransitioning = false;
      }, 300);
    }, 180);
  }

  // ══════════════════════════════════════════════════════════════
  //  PLATFORMĂ MAȘINĂ
  // ══════════════════════════════════════════════════════════════
  _createCarPlatform() {
    const group = new THREE.Group();

    const discGeo = new THREE.CylinderGeometry(95, 95, 2, 128);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x111520,
      roughness: 0.15,
      metalness: 0.9,
      envMapIntensity: 1.0,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -1;
    group.add(disc);

    const ringGeo = new THREE.TorusGeometry(95, 2.5, 16, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x0055ff,
      emissive: 0x0033cc,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5;
    group.add(ring);

    const ring2Geo = new THREE.TorusGeometry(70, 1.2, 16, 128);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff3300,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.8,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 0.5;
    group.add(ring2);

    const glowGeo = new THREE.CircleGeometry(130, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0044ff,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -2;
    group.add(glow);

    this.platformGlowLight = new THREE.PointLight(0x0033ff, 0, 250);
    this.platformGlowLight.position.set(0, -5, 0);
    group.add(this.platformGlowLight);

    group.position.set(0, 0, 0);
    group.visible = false;
    this.scene.add(group);

    this.carPlatform = group;
    this._platformRing  = ring;
    this._platformRing2 = ring2;
  }

  // ══════════════════════════════════════════════════════════════
  //  PRELOAD MODELE
  // ══════════════════════════════════════════════════════════════
  _preloadAllModels() {
    Object.entries(ROOM_CONFIG).forEach(([doorKey, config]) => {
      if (config.modelPath && !this.modelCache[doorKey]) {
        this._loadModelSilent(doorKey, config);
      }
    });
  }

  _loadModelSilent(doorKey, config) {
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

        if (config.animation === 'car_showroom') {
          this._boostCarMaterials(group);
        }

        let mixer = null;
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(group);
        }

        this.modelCache[doorKey] = { object: group, mixer, gltf };
        console.log(`[Preload] Model cached: ${doorKey}`);
      },
      undefined,
      (err) => {
        console.warn(`[Preload] Nu am putut încărca ${doorKey}:`, err);
      }
    );
  }

  _boostCarMaterials(group) {
    group.traverse((child) => {
      if (!child.isMesh) return;
      const mat = child.material;
      if (!mat) return;

      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach((m) => {
        if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
          m.envMapIntensity = 4.0;
          m.roughness = Math.min(m.roughness, 0.25);
          m.needsUpdate = true;
        }
        if (m.isMeshPhongMaterial || m.isMeshLambertMaterial) {
          m.needsUpdate = true;
        }
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  GALAXIE & STELE
  // ══════════════════════════════════════════════════════════════
  _createGalaxyBackground() {
    const starCount = 12000;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const starColors = [
      new THREE.Color(0x334477),
      new THREE.Color(0x223366),
      new THREE.Color(0x445588),
      new THREE.Color(0x2244aa),
      new THREE.Color(0x556699),
      new THREE.Color(0x667799),
      new THREE.Color(0xaabbcc),
      new THREE.Color(0x8899aa),
      new THREE.Color(0x334455),
      new THREE.Color(0x112244),
    ];

    for (let i = 0; i < starCount; i++) {
      const arm = Math.floor(Math.random() * 4);
      const armAngle = (arm / 4) * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.5) * 4000 + 200;
      const spiral = armAngle + (dist / 4000) * Math.PI * 3;
      const scatter = (Math.random() - 0.5) * 900;
      const heightScatter = (Math.random() - 0.5) * 600 * Math.exp(-dist / 3000);

      positions[i * 3]     = Math.cos(spiral) * dist + scatter;
      positions[i * 3 + 1] = heightScatter;
      positions[i * 3 + 2] = Math.sin(spiral) * dist + scatter - 2000;

      const col = starColors[Math.floor(Math.random() * starColors.length)];
      const brightness = 0.25 + Math.random() * 0.35 + Math.exp(-dist / 2000) * 0.2;
      colors[i * 3]     = col.r * brightness;
      colors[i * 3 + 1] = col.g * brightness;
      colors[i * 3 + 2] = col.b * brightness;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.galaxyStars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.galaxyStars);

    this._createNebulaClouds();
    this._createGalacticCore();
  }

  _createNebulaClouds() {
    const nebulaData = [
      { color: 0x000a33, size: 1800, opacity: 0.07, x: 0,    y: 0,    z: -2000 },
      { color: 0x001155, size: 1400, opacity: 0.06, x: -400, y: 100,  z: -1800 },
      { color: 0x001166, size: 1000, opacity: 0.05, x: 600,  y: -200, z: -2200 },
      { color: 0x0a0044, size: 1200, opacity: 0.04, x: -600, y: -100, z: -1600 },
      { color: 0x001144, size: 900,  opacity: 0.06, x: 300,  y: 300,  z: -2400 },
      { color: 0x000833, size: 700,  opacity: 0.05, x: -200, y: -400, z: -1400 },
      { color: 0x110033, size: 800,  opacity: 0.04, x: 800,  y: 200,  z: -2600 },
      { color: 0x080022, size: 600,  opacity: 0.03, x: -700, y: 300,  z: -2800 },
    ];

    this.nebulaClouds = [];
    nebulaData.forEach(nd => {
      const geo = new THREE.SphereGeometry(nd.size, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: nd.color,
        transparent: true,
        opacity: nd.opacity,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(nd.x, nd.y, nd.z);
      this.scene.add(mesh);
      this.nebulaClouds.push({ mesh, originalOpacity: nd.opacity });
    });
  }

  _createGalacticCore() {
    const coreGeo = new THREE.SphereGeometry(120, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x112266,
      transparent: true,
      opacity: 0.10,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.galacticCore = new THREE.Mesh(coreGeo, coreMat);
    this.galacticCore.position.set(0, 0, -2000);
    this.scene.add(this.galacticCore);

    const haloGeo = new THREE.SphereGeometry(400, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x001133,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    this.galacticCore.add(halo);

    const coreStarCount = 1500;
    const coreGeoStars = new THREE.BufferGeometry();
    const corePos = new Float32Array(coreStarCount * 3);
    const coreCol = new Float32Array(coreStarCount * 3);

    for (let i = 0; i < coreStarCount; i++) {
      const r = Math.pow(Math.random(), 2) * 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      corePos[i * 3]     = Math.cos(theta) * Math.cos(phi) * r;
      corePos[i * 3 + 1] = Math.sin(phi) * r * 0.4;
      corePos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;

      const t = Math.random();
      coreCol[i * 3]     = 0.2 + t * 0.3;
      coreCol[i * 3 + 1] = 0.3 + t * 0.3;
      coreCol[i * 3 + 2] = 0.5 + t * 0.3;
    }

    coreGeoStars.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    coreGeoStars.setAttribute('color', new THREE.BufferAttribute(coreCol, 3));

    const coreStarMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const coreStars = new THREE.Points(coreGeoStars, coreStarMat);
    this.galacticCore.add(coreStars);
  }

  _createStars() {
    const count = 2500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

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
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.0,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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
      { color: 0xaaaaaa, tex: null,                          orbitR: 380,  size: 22, speed: 1.6,  tilt: 0.06, name: 'Mercur',  atmo: null },
      { color: 0xe8cda0, tex: null,                          orbitR: 580,  size: 38, speed: 1.17, tilt: 0.04, name: 'Venus',   atmo: 0xffeeaa },
      { color: 0x4488ff, tex: BASE + 'earth_atmos_2048.jpg', orbitR: 800,  size: 42, speed: 1.0,  tilt: 0.0,  name: 'Terra',   atmo: 0x4488ff },
      { color: 0xff4422, tex: null,                          orbitR: 1050, size: 30, speed: 0.80, tilt: 0.03, name: 'Marte',   atmo: 0xff6644 },
      { color: 0xddaa88, tex: BASE + 'jupiter.jpg',          orbitR: 1450, size: 90, speed: 0.43, tilt: 0.02, name: 'Jupiter', atmo: 0xddaa88 },
      { color: 0xeedd99, tex: null,                          orbitR: 1900, size: 75, speed: 0.32, tilt: 0.04, name: 'Saturn',  atmo: null },
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

      if (pd.name === 'Saturn') {
        const ringGeo = new THREE.RingGeometry(pd.size * 1.5, pd.size * 2.6, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xddcc88, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
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

  // ══════════════════════════════════════════════════════════════
  //  CAR ENGINE TOGGLE
  // ══════════════════════════════════════════════════════════════
  toggleCarEngine() {
    this.isCarRunning = !this.isCarRunning;
    if (this.btnCarStart) {
      this.btnCarStart.textContent = this.isCarRunning ? '⏹ STOP' : '▶ START';
      this.btnCarStart.style.background = this.isCarRunning
        ? 'rgba(255, 102, 0, 0.4)'
        : 'rgba(255, 102, 0, 0.2)';
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  DOOR ANIMATIONS
  // ══════════════════════════════════════════════════════════════
  _findDoorAnimations(gltf) {
    this.doorActions = [];

    if (!gltf.animations || gltf.animations.length === 0) {
      console.warn('Modelul nu are animații.');
      return;
    }

    let clips = gltf.animations.filter(c => c.name.toLowerCase().includes('door'));
    if (clips.length === 0) clips = gltf.animations;

    clips.forEach(clip => {
      let minTime = Infinity;
      let maxTime = -Infinity;
      clip.tracks.forEach(t => {
        minTime = Math.min(minTime, t.times[0]);
        maxTime = Math.max(maxTime, t.times[t.times.length - 1]);
      });
      if (minTime === Infinity) minTime = 0;
      if (maxTime === -Infinity) maxTime = clip.duration;

      const fps = 30;
      const startFrame = Math.floor(minTime * fps);
      const endFrame   = Math.ceil(maxTime * fps);
      const subClip = THREE.AnimationUtils.subclip(clip, clip.name + '_doors', startFrame, endFrame, fps);

      console.log(`Subclip: ${subClip.name} | ${minTime.toFixed(2)}s → ${maxTime.toFixed(2)}s (${subClip.duration.toFixed(2)}s)`);

      this._doorDuration = subClip.duration;

      const action = this.mixer.clipAction(subClip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.stop();
      this.doorActions.push(action);
    });
  }

  toggleBothDoors() {
    this.doorsOpen = !this.doorsOpen;

    this.doorsButton.textContent = this.doorsOpen ? '🚪 ÎNCHIDE UȘILE' : '🚪 DESCHIDE UȘILE';
    this.doorsButton.style.background = this.doorsOpen
      ? 'rgba(68, 170, 255, 0.5)'
      : 'rgba(68, 170, 255, 0.2)';

    if (!this.doorActions?.length) {
      console.warn('Nicio animație de uși disponibilă.');
      return;
    }

    const SPEED = 3.0;
    const endT = this._doorDuration ?? this.doorActions[0]?.getClip().duration ?? 1;

    this.clock.getDelta();

    this.doorActions.forEach(action => {
      action.paused = false;

      if (this.doorsOpen) {
        action.timeScale = SPEED;
        action.reset();
        action.play();
        this.mixer.update(0);
      } else {
        action.timeScale = -SPEED;
        action.reset();
        action.time = endT;
        action.play();
        this.mixer.update(0);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  CURSOR & MOUSE
  // ══════════════════════════════════════════════════════════════
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

  _bindMouseEvents() {
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this._onMouseDown = (e) => {
      if (!this.active) return;
      // ── În interior, drag-ul rotește camera de privire ──
      if (this.isInsideCar) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        document.body.classList.add('room-grabbing');
        return;
      }
      if (this.currentAnimationType === 'car_showroom') return;

      if (this.currentModel) {
        this.mouse2D.x =  (e.clientX / window.innerWidth)  * 2 - 1;
        this.mouse2D.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse2D, this.camera);
        const hits = this.raycaster.intersectObject(this.currentModel, true);
        if (hits.length > 0) {
          this._orbitRTarget += 80;
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

      if (this.isInsideCar) {
        // ── Privire 360° în cockpit ──
        this.orbitYaw   -= dx * 0.0025;           // yaw liber, fără limită
        this.orbitPitch += dy * 0.0025;
        this.orbitPitch  = Math.max(-1.4, Math.min(1.4, this.orbitPitch)); // doar sus/jos limitat fizic
        return;
      }

      if (this.currentAnimationType === 'car_showroom') return;

      this.orbitYaw   -= dx * 0.003;
      this.orbitPitch += dy * 0.003;
      this.orbitPitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.orbitPitch));
    };

    this._onMouseUp = () => {
      if (!this.active) return;
      this.isDragging = false;
      document.body.classList.remove('room-grabbing');
      if (!this.isInsideCar && this.currentAnimationType !== 'car_showroom') {
        document.body.classList.add('room-grab');
      }
    };

    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup',   this._onMouseUp);
  }

  // ══════════════════════════════════════════════════════════════
  //  MODEL LOADING
  // ══════════════════════════════════════════════════════════════
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
    return { object: mesh, mixer: null, gltf: null };
  }

  _loadModel(doorKey, config, onReady) {
    if (this.modelCache[doorKey]) {
      const cached = this.modelCache[doorKey];

      if (cached.gltf && cached.gltf.animations?.length > 0) {
        cached.mixer = new THREE.AnimationMixer(cached.object);
      }

      onReady(cached);
      return;
    }

    if (config.modelPath) {
      this.loadingIndicator.style.opacity = '1';
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
        this.loadingIndicator.style.opacity = '0';

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

        if (config.animation === 'car_showroom') {
          this._boostCarMaterials(group);
        }

        let mixer = null;
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(group);
          console.log('Animații disponibile în model:');
          gltf.animations.forEach((clip) => console.log(' -', clip.name));
        }

        const entry = { object: group, mixer, gltf };
        this.modelCache[doorKey] = entry;
        onReady(entry);
      },
      undefined,
      (err) => {
        this.loadingIndicator.style.opacity = '0';
        console.warn(`Nu am putut încărca modelul pentru ${doorKey}:`, err);
        const entry = this._makePlaceholder(config);
        this.modelCache[doorKey] = entry;
        onReady(entry);
      }
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  ENTER ROOM
  // ══════════════════════════════════════════════════════════════
  enter(doorKey) {
    if (this.active) return;

    console.log('enter doorKey:', doorKey);
    this.active = true;

    const config = ROOM_CONFIG[doorKey];
    this.currentAnimationType = config?.animation || 'rotate';

    if (this.currentAnimationType !== 'car_showroom') {
      document.body.classList.remove('room-grabbing');
      document.body.classList.add('room-grab');
    } else {
      document.body.classList.remove('room-grabbing', 'room-grab');
    }

    document.body.style.cursor = '';
    const cc = document.getElementById('cursor');
    if (cc) cc.style.display = 'none';

    this.orbitYaw      = 0;
    this.orbitPitch    = 0;
    this._orbitR       = 170;
    this._orbitRTarget = 170;
    this.currentDoorKey = doorKey;

    this.isCarRunning = false;
    this.carRotationSpeed = 0;

    // ── Reset interior la intrare ──
    this.isInsideCar = false;
    this._interiorTransitioning = false;
    this.interiorHUD.style.opacity = '0';
    if (this.interiorCabinLight) this.interiorCabinLight.intensity = 0;
    if (this.btnCarInterior) {
      this.btnCarInterior.textContent   = '🚗 INTRĂ ÎN MAȘINĂ';
      this.btnCarInterior.style.background = 'rgba(0, 255, 170, 0.12)';
      this.btnCarInterior.style.boxShadow  = 'none';
    }

    this.doorsOpen = false;
    this.doorActions = [];
    this.doorsButton.textContent = '🚪 DESCHIDE UȘILE';
    this.doorsButton.style.background = 'rgba(68, 170, 255, 0.2)';

    const isCar = this.currentAnimationType === 'car_showroom';
    const isModelReady = !!this.modelCache[doorKey];

    this._flash(() => {
      const isFirstDoor = doorKey === 'floor1_door_001';
      const showGalaxy  = !!(config?.showGalaxy);

      // ── Solar system — doar la prima ușă ──
      if (this.stars) this.stars.visible = isFirstDoor;
      if (this.sun)   this.sun.visible   = isFirstDoor;
      if (this.planets) this.planets.forEach(p => {
        p.mesh.visible = isFirstDoor;
        if (p.moon) p.moon.visible = isFirstDoor;
      });
      if (this.orbitLines) this.orbitLines.forEach(o => o.visible = isFirstDoor);

      // ── Galaxie (stele spiralate + nebuloase + nucleu galactic) ──
      // Vizibile NUMAI dacă ușa are showGalaxy: true în ROOM_CONFIG
      if (this.galaxyStars)  this.galaxyStars.visible  = showGalaxy;
      if (this.galacticCore) this.galacticCore.visible  = showGalaxy;
      if (this.nebulaClouds) this.nebulaClouds.forEach(nc => { nc.mesh.visible = showGalaxy; });
      if (this.galaxyLight1) this.galaxyLight1.intensity = showGalaxy ? 0.6 : 0;
      if (this.galaxyLight2) this.galaxyLight2.intensity = showGalaxy ? 0.4 : 0;

      if (this.carPlatform) this.carPlatform.visible = isCar;

      Object.values(this.modelCache).forEach(cached => {
        if (cached.object !== undefined) cached.object.visible = false;
      });
      if (this.currentModel) {
        this.currentModel.visible = false;
        this.currentModel = null;
        this.mixer = null;
      }

      this._setCarLights(isCar);

      this.label.textContent = config ? config.label : doorKey;
      this.label.style.opacity = '1';
      this.label.style.color = '#ffffff';

      if (isCar) {
        this.carControls.style.opacity = '1';
        this.carControls.style.pointerEvents = 'auto';
      } else {
        this.carControls.style.opacity = '0';
        this.carControls.style.pointerEvents = 'none';
      }

      this._loadModel(doorKey, config, (entry) => {
        if (!this.active) return;
        entry.object.visible = true;
        this.currentModel = entry.object;
        this.mixer = entry.mixer;

        if (isCar && entry.gltf) {
          this._findDoorAnimations(entry.gltf);
        }

        this.loadingIndicator.style.opacity = '0';
        this.clock.getDelta();
      });
    }, isModelReady);
  }

  _setCarLights(on) {
    if (this.carKeyLight)    this.carKeyLight.intensity    = on ? 10 : 0;
    if (this.carFillLeft)    this.carFillLeft.intensity    = on ? 7  : 0;
    if (this.carFillRight)   this.carFillRight.intensity   = on ? 7  : 0;
    if (this.carFrontLight)  this.carFrontLight.intensity  = on ? 6  : 0;
    if (this.carBackLight)   this.carBackLight.intensity   = on ? 5  : 0;
    if (this.carUnderLight)  this.carUnderLight.intensity  = on ? 2  : 0;
    if (this.platformGlowLight) this.platformGlowLight.intensity = on ? 4 : 0;
  }

  // ══════════════════════════════════════════════════════════════
  //  EXIT ROOM
  // ══════════════════════════════════════════════════════════════
  exit() {
    if (!this.active) return;

    this.label.style.opacity = '0';
    this.carControls.style.opacity = '0';
    this.carControls.style.pointerEvents = 'none';
    this.loadingIndicator.style.opacity = '0';
    this.interiorHUD.style.opacity = '0';

    // ── Resetează starea interiorului ──
    this.isInsideCar = false;
    this._interiorTransitioning = false;
    if (this.interiorCabinLight) this.interiorCabinLight.intensity = 0;

    this.doorActions = [];

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

        if (this.carPlatform) this.carPlatform.visible = false;
        this._setCarLights(false);
        if (this.carFrontLight) this.carFrontLight.intensity = 0;
        if (this.carBackLight)  this.carBackLight.intensity  = 0;

        // Reset FOV
        this.camera.fov = 60;
        this.camera.updateProjectionMatrix();

        this.scene.background = new THREE.Color(0x00010a);
        this.label.style.color = '#ffffff';

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

  _flash(onMidpoint, isModelReady = false) {
    this.overlay.style.transition = 'none';
    this.overlay.style.opacity = '0';

    if (this.currentAnimationType === 'car_showroom') {
      this.camera.position.set(0, 60, 200);
      this.camera.lookAt(0, 20, 0);
    } else {
      this.camera.position.set(0, 80, 250);
    }
    this.camera.fov = 75;
    this.camera.updateProjectionMatrix();

    const fadeInMs  = isModelReady ? 200 : 400;
    const fadeOutMs = isModelReady ? 300 : 600;

    requestAnimationFrame(() => {
      this.overlay.style.transition = `opacity ${fadeInMs / 1000}s ease-in`;
      this.overlay.style.opacity = '1';

      setTimeout(() => {
        onMidpoint();

        this.overlay.style.transition = `opacity ${fadeOutMs / 1000}s ease-out`;
        this.overlay.style.opacity = '0';

        this._animateEntry();
      }, fadeInMs);
    });
  }

  _animateEntry() {
    const duration = 1200;
    const start = performance.now();

    const startZ = 4000;
    const endZ   = this.currentAnimationType === 'car_showroom' ? 200 : 150;
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

  // ══════════════════════════════════════════════════════════════
  //  UPDATE LOOP
  // ══════════════════════════════════════════════════════════════
  update(time) {
    if (!this.active) return;

    this.renderer.autoClear = true;

    const delta = this.clock.getDelta();
    const cappedDelta = Math.min(delta, 0.1);
    if (this.mixer) this.mixer.update(cappedDelta);

    // ── Logică cameră ──
    if (this.currentAnimationType === 'car_showroom') {

      if (this.isInsideCar && this.currentModel) {
        // ── INTERIOR VIEW ──
        this._updateInteriorCamera();
      } else {
        // ── EXTERIOR SHOWROOM ──
        this.camera.position.set(0, 60, 200);
        this.camera.lookAt(0, 20, 0);
      }

    } else {
      // ── Orbit view pentru celelalte produse ──
      const lerpSpeed = 0.04;
      this.smoothYaw   += (this.orbitYaw   - this.smoothYaw)   * lerpSpeed;
      this.smoothPitch += (this.orbitPitch - this.smoothPitch) * lerpSpeed;
      const lookX = Math.sin(this.smoothYaw) * Math.cos(this.smoothPitch);
      const lookY = Math.sin(this.smoothPitch);
      const lookZ = -Math.cos(this.smoothYaw) * Math.cos(this.smoothPitch);
      this.camera.position.set(0, 80, 0);
      this.camera.lookAt(lookX * 100, 80 + lookY * 100, lookZ * 100);
    }

    // ── Model animation ──
    if (this.currentModel) {
      if (this.currentAnimationType === 'orbit' && this.currentDoorKey === 'floor1_door_001') {
        const t = time * 0.18;
        this._orbitR += (this._orbitRTarget - this._orbitR) * 0.08;
        this._orbitRTarget += (170 - this._orbitRTarget) * 0.002;

        const r = this._orbitR;
        const x = Math.sin(t) * r;
        const y = 80 + Math.sin(t * 0.7 + 1.2) * r * 0.45;
        const z = Math.cos(t * 0.9 + 0.5) * r;

        this.currentModel.position.set(x, y, z);
        this.currentModel.rotation.y = time * 1.2;

      } else if (this.currentAnimationType === 'car_showroom') {
        this.currentModel.position.set(0, 0, 0);

        if (this.isCarRunning) {
          this.carRotationSpeed = this.carRotationTarget;
        } else {
          this.carRotationSpeed = 0;
        }
        // Rotire numai dacă nu ești în interior (sau dacă ești și mașina e pornită)
        if (!this.isInsideCar || this.isCarRunning) {
          this.currentModel.rotation.y += this.carRotationSpeed;
        }

      } else {
        this.currentModel.position.set(0, 80, -150);
        this.currentModel.rotation.y = time * 0.5;
      }
    }


    // ── Platformă ──
    if (this.carPlatform && this.carPlatform.visible) {
      if (this.isCarRunning) {
        this.carPlatform.rotation.y += this.carRotationTarget;
      }

      if (this._platformRing) {
        const pulse = 0.8 + Math.sin(time * 2.0) * 0.2;
        this._platformRing.material.emissiveIntensity = pulse;
      }
      if (this._platformRing2) {
        const pulse2 = 0.5 + Math.cos(time * 1.5) * 0.2;
        this._platformRing2.material.emissiveIntensity = pulse2;
      }
      if (this.platformGlowLight) {
        this.platformGlowLight.intensity = 2.5 + Math.sin(time * 1.8) * 0.8;
      }
    }

    // ── Lumina de cockpit pulsează când mașina e pornită ──
    if (this.isInsideCar && this.interiorCabinLight) {
      if (this.isCarRunning) {
        this.interiorCabinLight.intensity = 1.8 + Math.sin(time * 12) * 0.15;
      } else {
        this.interiorCabinLight.intensity = 1.2;
      }
    }

    // ── Planete ──
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

    // ── Galaxie ──
    if (this.galaxyStars) {
      this.galaxyStars.rotation.y = time * 0.003;
      this.galaxyStars.rotation.x = Math.sin(time * 0.001) * 0.015;
    }

    if (this.galacticCore) {
      const pulse = 1 + Math.sin(time * 0.6) * 0.03;
      this.galacticCore.scale.setScalar(pulse);
    }

    if (this.nebulaClouds) {
      this.nebulaClouds.forEach((nc, i) => {
        const breathe = nc.originalOpacity + Math.sin(time * 0.25 + i * 0.7) * 0.01;
        nc.mesh.material.opacity = Math.max(0, breathe);
        nc.mesh.rotation.y = time * 0.0008 * (i % 2 === 0 ? 1 : -1);
        nc.mesh.rotation.x = time * 0.0004 * (i % 3 === 0 ? 1 : -1);
      });
    }

    if (this.stars) this.stars.rotation.y = time * 0.006;

    this.rimLight.intensity  = 1.5 + Math.sin(time * 1.5) * 0.3;
    this.rimLight2.intensity = 1.2 + Math.cos(time * 1.2) * 0.3;

    if (this.galaxyLight1) {
      this.galaxyLight1.intensity = 0.6 + Math.sin(time * 0.4) * 0.15;
    }
    if (this.galaxyLight2) {
      this.galaxyLight2.intensity = 0.4 + Math.cos(time * 0.5) * 0.1;
    }

    this.renderer.render(this.scene, this.camera);
  }

  // ══════════════════════════════════════════════════════════════
  //  INTERIOR CAMERA — calculează poziția din spațiul local al mașinii
  // ══════════════════════════════════════════════════════════════
  _updateInteriorCamera() {
    if (!this.currentModel) return;

    // Smooth yaw/pitch interior
    const lerpSpeed = 0.08;
    this.smoothYaw   += (this.orbitYaw   - this.smoothYaw)   * lerpSpeed;
    this.smoothPitch += (this.orbitPitch - this.smoothPitch) * lerpSpeed;

    const carRotY = this.currentModel.rotation.y;

    // ── Offset poziție (scaun șofer) rotit cu mașina ──
    const camOff = CAR_INTERIOR_CAM_OFFSET.clone();
    camOff.applyEuler(new THREE.Euler(0, carRotY, 0));

    // ── Target privire ──
    // Privire de bază: înainte în mașină
    const baseForward = CAR_INTERIOR_LOOKAT_OFFSET.clone();
    baseForward.applyEuler(new THREE.Euler(0, carRotY, 0));

    // Adaugă yaw/pitch-ul interactiv al șoferului
    const lookYaw   = carRotY + this.smoothYaw;
    const lookX = Math.sin(lookYaw) * Math.cos(this.smoothPitch);
    const lookY = Math.sin(this.smoothPitch);
    const lookZ = -Math.cos(lookYaw) * Math.cos(this.smoothPitch);
    const lookDir = new THREE.Vector3(lookX, lookY, lookZ).multiplyScalar(150);

    // Poziție cameră = offset șofer
    const targetCamPos = camOff.clone();
    // Target privire = direcție relativă față de poziția camerei
    const targetLookAt = camOff.clone().add(lookDir);
    targetLookAt.y += 38; // înălțimea ochilor

    // ── Lerp smooth ──
    if (this._camPosLerp.lengthSq() === 0) {
      this._camPosLerp.copy(targetCamPos);
      this._camLookLerp.copy(targetLookAt);
    }
    this._camPosLerp.lerp(targetCamPos, 0.12);
    this._camLookLerp.lerp(targetLookAt, 0.12);

    this.camera.position.copy(this._camPosLerp);
    this.camera.lookAt(this._camLookLerp);
  }

}
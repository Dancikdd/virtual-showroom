// ══════════════════════════════════════════════════════════════
//  MODEL LOADER
//  Încarcă modele GLB, le cache-uiește și le pregătește pentru scenă
//  Pentru a adăuga un model nou → doar adaugă în roomConfig.js
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { ROOM_CONFIG } from './roomConfig.js'; // shared/roomConfig.js

export class ModelLoader {
  constructor(scene) {
    this.scene      = scene;
    this.modelCache = {};

    this.loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    this.loader.setDRACOLoader(dracoLoader);

    this._preloadAll();
  }

  // ══════════════════════════════════════════════════════════════
  //  PRELOAD SILENȚIOS — toate modelele din config
  // ══════════════════════════════════════════════════════════════
  _preloadAll() {
    Object.entries(ROOM_CONFIG).forEach(([doorKey, config]) => {
      if (config.modelPath && !this.modelCache[doorKey]) {
        this._loadSilent(doorKey, config);
      }
    });
  }

  _loadSilent(doorKey, config) {
    this.loader.load(
      config.modelPath,
      (gltf) => {
        const entry = this._processGltf(gltf, config);
        this.modelCache[doorKey] = entry;
        console.log(`[Preload] Model cached: ${doorKey}`);
      },
      undefined,
      (err) => {
        console.warn(`[Preload] Nu am putut încărca ${doorKey}:`, err);
      }
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  LOAD (cu callback) — folosit la enter()
  // ══════════════════════════════════════════════════════════════
  load(doorKey, config, onReady) {
    if (this.modelCache[doorKey]) {
      const cached = this.modelCache[doorKey];
      // Recreează mixer la fiecare intrare (starea animației se resetează)
      if (cached.gltf?.animations?.length > 0) {
        cached.mixer = new THREE.AnimationMixer(cached.object);
        if (config.animation !== 'car_showroom') {
          this._playAnimations(cached.mixer, cached.gltf.animations);
        }
      }
      onReady(cached);
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
        const entry = this._processGltf(gltf, config);
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

  // ══════════════════════════════════════════════════════════════
  //  PROCESARE GLTF
  // ══════════════════════════════════════════════════════════════
  _processGltf(gltf, config) {
    const group = gltf.scene;

    const box     = new THREE.Box3().setFromObject(group);
    const center  = box.getCenter(new THREE.Vector3());
    const size    = box.getSize(new THREE.Vector3());
    const maxDim  = Math.max(size.x, size.y, size.z);
    const autoScale = (120 / maxDim) * config.scale;

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
    if (gltf.animations?.length > 0) {
      mixer = new THREE.AnimationMixer(group);
      console.log('Animații disponibile:');
      gltf.animations.forEach(clip => console.log(' -', clip.name));

      if (config.animation !== 'car_showroom') {
        this._playAnimations(mixer, gltf.animations);
      }
    }

    return { object: group, mixer, gltf };
  }

  _playAnimations(mixer, animations) {
    animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.reset();
      action.play();
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  PLACEHOLDER (când modelPath e null sau loading eșuat)
  // ══════════════════════════════════════════════════════════════
  _makePlaceholder(config) {
    const geo  = new THREE.BoxGeometry(80, 80, 80);
    const mat  = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.3, metalness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 40 + config.offsetY, 0);
    mesh.visible = false;
    this.scene.add(mesh);
    return { object: mesh, mixer: null, gltf: null };
  }

  // ══════════════════════════════════════════════════════════════
  //  BOOST MATERIALE MAȘINĂ
  // ══════════════════════════════════════════════════════════════
  _boostCarMaterials(group) {
    group.traverse((child) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (!m) return;
        if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
          m.envMapIntensity  = 1.0;
          m.roughness        = 0.55;
          m.metalness        = Math.min(m.metalness, 0.6);
          if (!m.emissive || m.emissive.getHex() === 0) {
            m.emissive = m.color ? m.color.clone().multiplyScalar(0.04) : new THREE.Color(0x080808);
          } else {
            m.emissive.multiplyScalar(0.3);
          }
          m.emissiveIntensity = 0.4;
          m.needsUpdate = true;
        }
        if (m.isMeshPhongMaterial)   { m.shininess = 60;  m.needsUpdate = true; }
        if (m.isMeshLambertMaterial) { m.needsUpdate = true; }
      });
    });
  }

  // ── Ascunde toate modelele din cache ──
  hideAll() {
    Object.values(this.modelCache).forEach(entry => {
      if (entry?.object) entry.object.visible = false;
    });
  }
}

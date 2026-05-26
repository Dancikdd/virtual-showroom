// ══════════════════════════════════════════════════════════════
//  MODEL LOADER
//  Încarcă modele GLB, le cache-uiește și le pregătește pentru scenă
//  Pentru a adăuga un model nou → doar adaugă în roomConfig.js
//  Pentru mai multe modele per ușă → folosește extraModels[] în config
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { ROOM_CONFIG } from './roomConfig.js'; 

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
  //  Suportă extraModels[] pentru mai multe GLB-uri per ușă
  // ══════════════════════════════════════════════════════════════
  load(doorKey, config, onReady) {
    if (this.modelCache[doorKey]) {
      const cached = this.modelCache[doorKey];
      if (cached.gltf?.animations?.length > 0) {
        cached.mixer = new THREE.AnimationMixer(cached.object);
        if (config.animation !== 'car_showroom' && config.animation !== 'ocean') {
          this._playAnimations(cached.mixer, cached.gltf.animations);
        }
      }
      onReady(cached);
      return;
    }

    if (!config.modelPath) {
    const entry = { object: null, mixer: null, gltf: null, extras: [] };
    this.modelCache[doorKey] = entry;
    onReady(entry);
    return;
    }

    // ── Câte modele trebuie încărcate? ──
    const extraModels = config.extraModels || [];
    const totalExtras = extraModels.length;

    this.loader.load(
      config.modelPath,
      (gltf) => {
        const entry = this._processGltf(gltf, config);

        // Dacă nu sunt extra modele, gata
        if (totalExtras === 0) {
          this.modelCache[doorKey] = entry;
          onReady(entry);
          return;
        }

        // Altfel încarcă și extra modelele
        entry.extras = [];
        let loaded = 0;

        extraModels.forEach((extra) => {
          this.loader.load(
            extra.modelPath,
            (extraGltf) => {
              const extraEntry = this._processGltf(extraGltf, {
                scale:          extra.scale    ?? 1,
                offsetY:        extra.offsetY  ?? 0,
                animation:      config.animation,
                staticOptimize: extra.staticOptimize ?? config.staticOptimize ?? false,
              });

              // Poziționare custom per model extra
              if (extra.position) {
                extraEntry.object.position.set(
                  extra.position.x ?? 0,
                  extra.position.y ?? 0,
                  extra.position.z ?? 0
                );
              }
              if (extra.rotation) {
                extraEntry.object.rotation.set(
                  extra.rotation.x ?? 0,
                  extra.rotation.y ?? 0,
                  extra.rotation.z ?? 0
                );
              }

              entry.extras.push(extraEntry);
              loaded++;

              if (loaded === totalExtras) {
                this.modelCache[doorKey] = entry;
                onReady(entry);
              }
            },
            undefined,
            (err) => {
              console.warn(`[Extra] Nu am putut încărca ${extra.modelPath}:`, err);
              loaded++;
              if (loaded === totalExtras) {
                this.modelCache[doorKey] = entry;
                onReady(entry);
              }
            }
          );
        });
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
    if (config.rawPlacement) {
      // Let the environment module control position entirely
      group.position.set(0, 0, 0);
    } else {
      group.position.set(
        -center.x * autoScale,
        -box.min.y * autoScale + config.offsetY,
        -center.z * autoScale
      );
    }
    group.visible = false;
    this.scene.add(group);

    if (config.animation === 'car_showroom') {
      this._boostCarMaterials(group);
    }

    if (config.staticOptimize) {
      group.traverse((child) => {
        if (!child.isMesh) return;
        child.matrixAutoUpdate = false;
        child.updateMatrix();
        child.frustumCulled = true;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => {
          if (!m) return;
          m.precision = 'lowp';
          if (m.isMeshStandardMaterial) {
            m.roughness = 1;
            m.metalness = 0;
            m.envMapIntensity = 0;
          }
          m.needsUpdate = true;
        });
      });
    }

    let mixer = null;
    if (gltf.animations?.length > 0) {
      mixer = new THREE.AnimationMixer(group);
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
  //  PLACEHOLDER
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

  // ── Ascunde toate modelele din cache (inclusiv extras) ──
  hideAll() {
    Object.values(this.modelCache).forEach(entry => {
      if (entry?.object) entry.object.visible = false;
      if (entry?.extras) entry.extras.forEach(e => { if (e?.object) e.object.visible = false; });
    });
  }
}
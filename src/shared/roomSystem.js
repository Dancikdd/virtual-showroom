// ══════════════════════════════════════════════════════════════
//  ROOM SYSTEM — coordonator principal
//  Încarcă modulele specifice fiecărei uși dinamic
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass }      from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ROOM_CONFIG }   from './roomConfig.js';
import { RoomUI }        from './ui.js';
import { RoomCamera }    from './camera.js';
import { ModelLoader }   from './modelLoader.js';
import { CarControls }   from './carControls.js';
import { GrassControls } from './grassControls.js';
import { DoorModelManager } from '../doorManager.js';

// ── Module per ușă ──
import { AstroLights }      from '../rooms/floor1-door1/floor1-door1.lights.js';
import { AstroEnvironment } from '../rooms/floor1-door1/floor1-door1.environment.js';
import { GrassLights }      from '../rooms/floor1-door2/floor1-door2.lights.js';
import { GrassEnvironment } from '../rooms/floor1-door2/floor1-door2.environment.js';
import { CarLights }        from '../rooms/floor2-door1/floor2-door1.lights.js';
import { CarEnvironment }   from '../rooms/floor2-door1/floor2-door1.environment.js';

// ── Lumini globale (ambient, spot general) ──
const GLOBAL_AMBIENT_INTENSITY = 0.8;

export class RoomSystem {
  constructor(renderer, onExit) {
    this.renderer = renderer;
    this.onExit   = onExit;
    this.active   = false;

    this.currentModel         = null;
    this.mixer                = null;
    this.currentDoorKey       = null;
    this.currentAnimationType = 'rotate';

    this.clock = new THREE.Clock();

    // ── Scenă ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x00010a);
    this.scene.fog = new THREE.FogExp2(0x00010a, 0.00005);

    // ── Lumini globale ──
    this._setupGlobalLights();

    // ── Module shared ──
    this.ui          = new RoomUI();
    this.modelLoader = new ModelLoader(this.scene);
    this.doorManager = new DoorModelManager(this.scene);

    this.camSystem = new RoomCamera(this.ui.overlay);
    this.camSystem.bindMouse(
      () => this.currentAnimationType,
      () => this.currentModel
    );

    this.carControls  = new CarControls(() => this._toggleInterior());
    this.grassControls = new GrassControls();

    // ── Free mouse look for grass room ──
    this._grassMouseMove = (e) => {
      if (this.currentDoorKey !== 'floor1_door_002') return;
      if (!document.pointerLockElement) return;
      const dx = e.movementX;
      const dy = e.movementY;
      this.camSystem.orbitYaw   += dx * 0.002;
      this.camSystem.orbitPitch -= dy * 0.002;
      this.camSystem.orbitPitch  = Math.max(-1.2, Math.min(1.2, this.camSystem.orbitPitch));
    };
    window.addEventListener('mousemove', this._grassMouseMove);

    // Pointer lock change — ESC pauses look, click re-locks, not exit
    document.addEventListener('pointerlockchange', () => {
      if (this.currentDoorKey !== 'floor1_door_002') return;
      if (!document.pointerLockElement) {
        // Show the circle cursor, not the hand
        this.ui.clearCursor();
        document.body.style.cursor = 'default';
      }
    });

    // Click to re-lock is added/removed per room (see enable/disable below)

    // ── Module per ușă ──
    this.astroLights      = new AstroLights(this.scene);
    this.astroEnvironment = new AstroEnvironment(this.scene);

    this.grassLights      = new GrassLights(this.scene);
    this.grassEnvironment = new GrassEnvironment(this.scene);
    this.grassEnvironment.setLights(this.grassLights);
    
    this.carLights      = new CarLights(this.scene);
    this.carEnvironment = new CarEnvironment(this.scene);

    // ── Post-processing (grass DOF blur) ──
    this._grassComposer = new EffectComposer(renderer);
    this._grassComposer.addPass(new RenderPass(this.scene, this.camSystem.camera));
    this._grassComposer.addPass(new BokehPass(this.scene, this.camSystem.camera, {
      focus:    400,
      aperture: 0.00001,
      maxblur:  0.004,
    }));

    // ── Stinge tot la start ──
    this.astroLights.off();
    this.grassLights.off();
    this.carLights.off();
    this.astroEnvironment.setVisible(false);
    this.grassEnvironment.setVisible(false);
    this.carEnvironment.setVisible(false);
  }

  // ══════════════════════════════════════════════════════════════
  //  LUMINI GLOBALE
  // ══════════════════════════════════════════════════════════════
  _setupGlobalLights() {
    this.scene.add(new THREE.AmbientLight(0x101010, GLOBAL_AMBIENT_INTENSITY));

    const topLight = new THREE.PointLight(0xffffff, 3, 1000);
    topLight.position.set(0, 500, 0);
    this.scene.add(topLight);

    const spotLight = new THREE.SpotLight(0xffffff, 4, 800, Math.PI / 6, 0.3);
    spotLight.position.set(0, 400, 200);
    spotLight.target.position.set(0, 0, 0);
    this.scene.add(spotLight);
    this.scene.add(spotLight.target);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(200, 300, 100);
    keyLight.target.position.set(0, 50, 0);
    this.scene.add(keyLight);
    this.scene.add(keyLight.target);
  }

  // ══════════════════════════════════════════════════════════════
  //  TOGGLE INTERIOR
  // ══════════════════════════════════════════════════════════════
  _toggleInterior() {
    this.camSystem.toggleInterior(
      () => {
        this.ui.showInteriorHUD();
        this.carLights.cabinLight.intensity = 1.8;
        this.carControls.setInteriorMode(true);
      },
      () => {
        this.ui.hideInteriorHUD();
        this.carLights.cabinLight.intensity = 0;
        this.carControls.setInteriorMode(false);
      }
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  ENTER
  // ══════════════════════════════════════════════════════════════
  enter(doorKey) {
    if (this.active) return;

    this.active               = true;
    const config              = ROOM_CONFIG[doorKey];
    this.currentAnimationType = config?.animation || 'rotate';
    this.currentDoorKey       = doorKey;

    const isCar       = this.currentAnimationType === 'car_showroom';
    const isAstronaut = doorKey === 'floor1_door_001';
    const isGrass     = doorKey === 'floor1_door_002';

    if (!isCar) this.ui.setCursorGrab();
    else        this.ui.clearCursor();
    this.ui.hideSystemCursor();

    this.carControls.reset();
    this.camSystem.reset(this.currentAnimationType);

    if (isGrass) {
      this.camSystem.camera.position.set(0, 60, 200);
      this.grassControls.enable(this.camSystem.camera);
      document.body.requestPointerLock();
      this._grassClickLock = () => {
        if (!document.pointerLockElement) document.body.requestPointerLock();
      };
      window.addEventListener('click', this._grassClickLock);
    }

    this.ui.setOverlayOpaque();

    this.modelLoader.load(doorKey, config, (entry) => {
      if (!this.active) return;

      this.camSystem.flash(this.currentAnimationType, true, () => {
        // ── Stinge tot ──
        this.astroLights.off();
        this.grassLights.off();
        this.carLights.off();
        this.astroEnvironment.setVisible(false);
        this.grassEnvironment.setVisible(false);
        this.carEnvironment.setVisible(false);
        this.scene.background = new THREE.Color(0x00010a);
        this.scene.fog = new THREE.FogExp2(0x00010a, 0.00005);

        // ── Activează ce trebuie ──
        if (isAstronaut) {
          this.astroLights.on();
          this.astroEnvironment.setVisible(true);
        }
        if (isGrass) {
          this.grassLights.on();
          this.grassEnvironment.setVisible(true);
          this.scene.background = new THREE.Color(0x87ceeb);
          this.scene.fog = new THREE.FogExp2(0xc8e8f0, 0.00008);
        }
        if (isCar) {
          this.carLights.on();
          this.carEnvironment.setVisible(true);
          this.carControls.show();
        } else {
          this.carControls.hide();
        }

        // ── Model ──
        this.modelLoader.hideAll();
        this.currentModel = null;
        this.mixer        = null;

        this.ui.showLabel(config?.label || doorKey);

        if (entry.object) {
          entry.object.visible = true;
          this.currentModel    = entry.object;
          this.mixer           = entry.mixer;
        } else {
          this.currentModel = null;
          this.mixer        = null;
        }

        if (entry.extras) {
          entry.extras.forEach(e => { if (e?.object) e.object.visible = true; });
        }

        if (isCar && entry.gltf) {
          this.carControls.setupDoorAnimations(entry.gltf, this.mixer);
        }

        this.clock.getDelta();
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  EXIT
  // ══════════════════════════════════════════════════════════════
  exit() {
    if (!this.active) return;

    this.ui.hideLabel();
    this.ui.hideInteriorHUD();
    this.ui.hideLoading();
    this.carControls.hide();
    this.carLights.cabinLight.intensity = 0;
    this.grassControls.disable();
    if (document.pointerLockElement) document.exitPointerLock();
    if (this._grassClickLock) {
      window.removeEventListener('click', this._grassClickLock);
      this._grassClickLock = null;
    }

    requestAnimationFrame(() => {
      this.ui.fadeIn(150, () => {
        this.active = false;

        if (this.currentModel) {
          this.currentModel.visible = false;
          this.currentModel = null;
        }
        this.mixer = null;

        this.astroLights.off();
        this.grassLights.off();
        this.carLights.off();
        this.astroEnvironment.setVisible(false);
        this.grassEnvironment.setVisible(false);
        this.carEnvironment.setVisible(false);

        this.camSystem.camera.fov = 60;
        this.camSystem.camera.updateProjectionMatrix();
        this.camSystem.isInsideCar = false;

        this.scene.background = new THREE.Color(0x00010a);
        this.scene.fog = new THREE.FogExp2(0x00010a, 0.00005);
        this.ui.clearCursor();
        this.ui.showSystemCursor();

        if (typeof this.onExit === 'function') this.onExit();

        this.ui.fadeOut(400);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  UPDATE LOOP
  // ══════════════════════════════════════════════════════════════
  update(time) {
    if (!this.active) return;

    this.renderer.autoClear = true;

    const delta = Math.min(this.clock.getDelta(), 0.1);
    if (this.mixer) this.mixer.update(delta);

    // ── Cameră ──
    if (this.currentDoorKey === 'floor1_door_002') {
      // Manually smooth yaw/pitch without letting camSystem reset position
      const lerpSpeed = 0.04;
      this.camSystem.smoothYaw   += (this.camSystem.orbitYaw   - this.camSystem.smoothYaw)   * lerpSpeed;
      this.camSystem.smoothPitch += (this.camSystem.orbitPitch - this.camSystem.smoothPitch) * lerpSpeed;
      const sy = this.camSystem.smoothYaw;
      const sp = this.camSystem.smoothPitch;
      const cam = this.camSystem.camera;
      this.grassControls.update(delta, cam);
      cam.position.y = 60;
      cam.lookAt(
        cam.position.x + Math.sin(sy) * 100,
        60             + Math.sin(sp) * 100,
        cam.position.z - Math.cos(sy) * 100,
      );
    } else {
      this.camSystem.update(this.currentAnimationType, this.currentModel);
    }

    // ── Model ──
    if (this.currentModel) {
      if (this.currentAnimationType === 'orbit' && this.currentDoorKey === 'floor1_door_001') {
        const t = time * 0.18;
        this.camSystem._orbitR += (this.camSystem._orbitRTarget - this.camSystem._orbitR) * 0.08;
        this.camSystem._orbitRTarget += (170 - this.camSystem._orbitRTarget) * 0.002;
        const r = this.camSystem._orbitR;
        this.currentModel.position.set(
          Math.sin(t) * r,
          80 + Math.sin(t * 0.7 + 1.2) * r * 0.45,
          Math.cos(t * 0.9 + 0.5) * r
        );
        this.currentModel.rotation.y = time * 0.5;
        this.currentModel.rotation.x = Math.sin(time * 0.9) * 0.04;
        this.currentModel.rotation.z = Math.sin(time * 0.7 + 1.7) * 0.03;

      } else if (this.currentDoorKey === 'floor1_door_002') {
        this.currentModel.position.set(0, 0, 0);

      } else if (this.currentAnimationType === 'car_showroom') {
        this.currentModel.position.set(0, 0, 0);
        const cc = this.carControls;
        if (cc.isCarRunning && (!this.camSystem.isInsideCar || cc.isCarRunning)) {
          this.currentModel.rotation.y += cc.carRotationTarget;
        }

      } else {
        this.currentModel.position.set(0, 80, -150);
        this.currentModel.rotation.y = time * 0.5;
      }
    }

    // ── Medii ──
    this.astroEnvironment.update(time);
    this.grassEnvironment.update(delta);
    this.carEnvironment.update(time, this.carControls.isCarRunning, this.carControls.carRotationTarget);

    // ── Lumini cabin ──
    this.carLights.updateCabin(this.camSystem.isInsideCar, this.carControls.isCarRunning, time);

    // ── Render ──
    if (this.currentDoorKey === 'floor1_door_002') {
      this._grassComposer.render();
    } else {
      this.renderer.render(this.scene, this.camSystem.camera);
    }
  }
}
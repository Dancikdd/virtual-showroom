// ══════════════════════════════════════════════════════════════
//  ROOM SYSTEM — coordonator principal
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ROOM_CONFIG } from './roomConfig.js';
import { RoomUI } from './ui.js';
import { RoomCamera } from './camera.js';
import { ModelLoader } from './modelLoader.js';
import { CarControls } from './carControls.js';
import { GrassControls } from './grassControls.js';

import { AstroLights }      from '../rooms/floor1-door1/floor1-door1.lights.js';
import { AstroEnvironment } from '../rooms/floor1-door1/floor1-door1.environment.js';
import { GrassLights }      from '../rooms/floor1-door2/floor1-door2.lights.js';
import { GrassEnvironment } from '../rooms/floor1-door2/floor1-door2.environment.js';
import { CarLights }        from '../rooms/floor2-door1/floor2-door1.lights.js';
import { CarEnvironment }   from '../rooms/floor2-door1/floor2-door1.environment.js';
import { SwordLights }      from '../rooms/floor2-door2/floor2-door2.lights.js';
import { SwordEnvironment } from '../rooms/floor2-door2/floor2-door2.environment.js';
import { SwordControls }    from '../rooms/floor2-door2/floor2-door2.swordControls.js';
import { OceanLights }      from '../rooms/floor1-door3/floor1-door3.lights.js';
import { OceanEnvironment } from '../rooms/floor1-door3/floor1-door3.environment.js';
import { WalleLights }      from '../rooms/floor1-door4/floor1-door4.lights.js';
import { WalleEnvironment } from '../rooms/floor1-door4/floor1-door4.environment.js';
import { WalleHeadMove }    from '../rooms/floor1-door4/floor1-door4.headmove.js';

const GLOBAL_AMBIENT_INTENSITY = 0.8;
const SWORD_DOOR_KEY  = 'floor2_door_004';
const OCEAN_DOOR_KEY  = 'floor1_door_003';
const WALLE_DOOR_KEY  = 'floor1_door_004';

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
    this._bobY = 60;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x00010a);
    this.scene.fog = new THREE.FogExp2(0x00010a, 0.00005);

    this._setupGlobalLights();

    this.ui          = new RoomUI();
    this.modelLoader = new ModelLoader(this.scene);

    this.camSystem = new RoomCamera(this.ui.overlay);
    this.camSystem.bindMouse(
      () => this.currentAnimationType,
      () => this.currentModel,
      () => this.currentDoorKey
    );

    this.carControls   = new CarControls(() => this._toggleInterior());
    this.grassControls = new GrassControls();

    this._grassMouseMove = (e) => {
      if (this.currentDoorKey !== 'floor1_door_002') return;
      if (!document.pointerLockElement) return;
      this.camSystem.orbitYaw   += e.movementX * 0.002;
      this.camSystem.orbitPitch -= e.movementY * 0.002;
      this.camSystem.orbitPitch  = Math.max(-1.2, Math.min(1.2, this.camSystem.orbitPitch));
    };
    window.addEventListener('mousemove', this._grassMouseMove);

    document.addEventListener('pointerlockchange', () => {
      if (this.currentDoorKey !== 'floor1_door_002') return;
      if (!document.pointerLockElement) {
        this.ui.clearCursor();
        document.body.style.cursor = 'default';
      }
    });

    // ── Room modules ──────────────────────────────────────────
    this.astroLights      = new AstroLights(this.scene);
    this.astroEnvironment = new AstroEnvironment(this.scene);

    this.grassLights      = new GrassLights(this.scene);
    this.grassEnvironment = new GrassEnvironment(this.scene);
    this.grassEnvironment.setLights(this.grassLights);

    this.carLights      = new CarLights(this.scene);
    this.carEnvironment = new CarEnvironment(this.scene);

    this.swordLights      = new SwordLights(this.scene);
    this.swordEnvironment = new SwordEnvironment(this.scene);
    this.swordControls    = new SwordControls(this.scene);

    this.oceanLights      = new OceanLights(this.scene);
    this.oceanEnvironment = new OceanEnvironment(this.scene);
    this.oceanEnvironment.setLights(this.oceanLights);

    this.walleLights      = new WalleLights(this.scene);
    this.walleEnvironment = new WalleEnvironment(this.scene);
    this.walleHeadMove    = new WalleHeadMove();
    this.walleHeadMove.setLights(this.walleLights);

    // ── Post-processing ───────────────────────────────────────
    this._grassComposer = new EffectComposer(renderer);
    this._grassComposer.addPass(new RenderPass(this.scene, this.camSystem.camera));
    this._grassComposer.addPass(new BokehPass(this.scene, this.camSystem.camera, {
      focus: 400, aperture: 0.00001, maxblur: 0.004,
    }));

    // ── Start everything off ──────────────────────────────────
    this.astroLights.off();
    this.grassLights.off();
    this.carLights.off();
    this.swordLights.off();
    this.oceanLights.off();
    this.walleLights.off();

    this.astroEnvironment.setVisible(false);
    this.grassEnvironment.setVisible(false);
    this.carEnvironment.setVisible(false);
    this.swordEnvironment.setVisible(false);
    this.oceanEnvironment.setVisible(false);
    this.walleEnvironment.setVisible(false);
  }

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

    const config = ROOM_CONFIG[doorKey];
    if (!config) {
      console.error('[ROOM ERROR] Nu există config pentru:', doorKey);
      return;
    }

    this.active               = true;
    this.currentAnimationType = config.animation || 'rotate';
    this.currentDoorKey       = doorKey;

    const isCar       = this.currentAnimationType === 'car_showroom';
    const isAstronaut = doorKey === 'floor1_door_001';
    const isGrass     = doorKey === 'floor1_door_002';
    const isSword     = doorKey === SWORD_DOOR_KEY;
    const isOcean     = doorKey === OCEAN_DOOR_KEY;
    const isWalle     = doorKey === WALLE_DOOR_KEY;

    if (!isCar) this.ui.setCursorGrab();
    else        this.ui.clearCursor();
    this.ui.hideSystemCursor();

    this.carControls.reset();
    this.camSystem.reset(this.currentAnimationType);

    if (isSword) {
      this.camSystem.camera.position.set(0, 88, 165);
      this.camSystem.camera.lookAt(0, 54, 0);
    }

    if (isOcean) {
      this.camSystem.camera.position.set(0, 60, 420);
      this.camSystem.camera.lookAt(0, 60, 0);
    }

    if (isWalle) {
      this.camSystem.camera.position.set(0, 60, 350);
      this.camSystem.camera.lookAt(0, 60, 0);
    }

    if (isGrass) {
      this.camSystem.camera.position.set(0, 60, 200);
      this._bobY = 60;
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

        // ── Kill everything ──────────────────────────────────
        this.astroLights.off();
        this.grassLights.off();
        this.carLights.off();
        this.swordLights.off();
        this.oceanLights.off();
        this.walleLights.off();

        this.astroEnvironment.setVisible(false);
        this.grassEnvironment.setVisible(false);
        this.carEnvironment.setVisible(false);
        this.swordEnvironment.setVisible(false);
        this.oceanEnvironment.setVisible(false);
        this.walleEnvironment.setVisible(false);

        this.walleHeadMove.setActive(false);

        this.swordControls.hide();

        this.scene.background = new THREE.Color(0x00010a);
        this.scene.fog = new THREE.FogExp2(0x00010a, 0.00005);

        // ── Activate the right room ──────────────────────────
        if (isAstronaut) {
          this.astroLights.on();
          this.astroEnvironment.setVisible(true);
        }

        if (isGrass) {
          this.grassLights.on();
          this.grassEnvironment.setVisible(true);
          this.scene.background = new THREE.Color(0x87ceeb);
          this.scene.fog = new THREE.FogExp2(0xc8e8f0, 0.00008);
          this.ui.showGrassHint(3500);
        }

        if (isCar) {
          this.carLights.on();
          this.carEnvironment.setVisible(true);
          this.carControls.show();
        } else {
          this.carControls.hide();
        }

        if (isSword) {
          this.swordLights.on();
          this.swordEnvironment.setVisible(true);
          this.scene.background = new THREE.Color(0x0a0010);
          this.scene.fog = new THREE.FogExp2(0x0a0010, 0.00006);
        }

        if (isOcean) {
          this.oceanLights.on();
          this.oceanEnvironment.setVisible(true);
          this.scene.background = new THREE.Color(0x000d1a);
          this.scene.fog = new THREE.FogExp2(0x001428, 0.00055);
        }

        if (isWalle) {
          this.walleLights.on();
          this.walleEnvironment.setVisible(true);
        }

        // ── Model ────────────────────────────────────────────
        this.modelLoader.hideAll();
        this.currentModel = null;
        this.mixer        = null;

        this.ui.showLabel(config.label || doorKey);

        if (entry.object) {
          entry.object.visible = true;
          this.currentModel    = entry.object;
          this.mixer           = entry.mixer;
        }

        if (entry.extras) {
          entry.extras.forEach(e => { if (e?.object) e.object.visible = true; });
        }

        if (isCar && entry.gltf) {
          this.carControls.setupDoorAnimations(entry.gltf, this.mixer);
        }

        if (isSword && this.currentModel) {
          this.currentModel.position.set(0, 40, 0);
          this.currentModel.rotation.set(0, 0, 0);
          this.swordControls.attach(this.currentModel);
          this.swordControls.show();
        }

        if (isOcean && this.currentModel) {
          this.oceanEnvironment.setWhale(this.currentModel);
        }

        // ── Wall-E: pass model to head tracker ───────────────
        if (isWalle && this.currentModel) {
          this.currentModel.rotation.y = Math.PI; // ← adaugă asta
          this.walleHeadMove.setModel(this.currentModel);
          this.walleHeadMove.setActive(true);
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
    this.ui.hideGrassHint();

    this.carControls.hide();
    this.carLights.cabinLight.intensity = 0;
    this.grassControls.disable();
    this.swordControls.hide();
    this.swordControls.detach();

    this.oceanEnvironment.setWhale(null);

    // ── Wall-E cleanup ────────────────────────────────────────
    this.walleHeadMove.setActive(false);
    this.walleHeadMove.setModel(null);

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
        this.swordLights.off();
        this.oceanLights.off();
        this.walleLights.off();

        this.astroEnvironment.setVisible(false);
        this.grassEnvironment.setVisible(false);
        this.carEnvironment.setVisible(false);
        this.swordEnvironment.setVisible(false);
        this.oceanEnvironment.setVisible(false);
        this.walleEnvironment.setVisible(false);

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
  //  UPDATE
  // ══════════════════════════════════════════════════════════════
  update(time) {
    if (!this.active) return;

    this.renderer.autoClear = true;
    const delta = Math.min(this.clock.getDelta(), 0.1);
    if (this.mixer) this.mixer.update(delta);

    // ── Camera per-room ───────────────────────────────────────
    if (this.currentDoorKey === 'floor1_door_002') {
      const lerpSpeed = 0.04;
      this.camSystem.smoothYaw   += (this.camSystem.orbitYaw   - this.camSystem.smoothYaw)   * lerpSpeed;
      this.camSystem.smoothPitch += (this.camSystem.orbitPitch - this.camSystem.smoothPitch) * lerpSpeed;

      const sy  = this.camSystem.smoothYaw;
      const sp  = this.camSystem.smoothPitch;
      const cam = this.camSystem.camera;

      this.grassControls.update(delta, cam);

      const bobTarget = this.grassControls._w
        ? 60 + Math.sin(Date.now() * 0.006) * 2.5
        : 60;
      this._bobY += (bobTarget - this._bobY) * 0.1;
      cam.position.y = this._bobY;

      cam.lookAt(
        cam.position.x + Math.sin(sy) * 100,
        60 + Math.sin(sp) * 100,
        cam.position.z - Math.cos(sy) * 100
      );

    } else if (this.currentDoorKey === OCEAN_DOOR_KEY) {
      const cam    = this.camSystem.camera;
      const driftX = Math.sin(time * 0.04) * 60;
      const driftY = 60 + Math.sin(time * 0.07) * 18;
      const driftZ = 420 + Math.sin(time * 0.055) * 30;

      cam.position.x += (driftX - cam.position.x) * 0.012;
      cam.position.y += (driftY - cam.position.y) * 0.012;
      cam.position.z += (driftZ - cam.position.z) * 0.012;

      if (this.currentModel) {
        const tx = this.currentModel.position.x;
        const ty = this.currentModel.position.y;
        const tz = this.currentModel.position.z;
        cam.lookAt(
          cam.position.x + (tx - cam.position.x) * 0.08,
          cam.position.y + (ty - cam.position.y) * 0.08,
          cam.position.z + (tz - cam.position.z) * 0.08 - 80,
        );
      } else {
        cam.lookAt(0, 60, 0);
      }

    } else if (this.currentDoorKey === SWORD_DOOR_KEY) {
      this.camSystem.update(this.currentAnimationType, this.currentModel, this.currentDoorKey);
    } else {
      this.camSystem.update(this.currentAnimationType, this.currentModel, this.currentDoorKey);
    }

    // ── Model per-room ────────────────────────────────────────
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

      } else if (this.currentDoorKey === OCEAN_DOOR_KEY) {
        // Position driven entirely by OceanEnvironment.update()

      } else if (this.currentDoorKey === SWORD_DOOR_KEY) {
        // Sword controls handle position

      } else if (this.currentDoorKey === WALLE_DOOR_KEY) {

      } else {
        this.currentModel.position.set(0, 80, -150);
        this.currentModel.rotation.y = time * 0.5;
      }
    }

    // ── Environment updates ───────────────────────────────────
    this.astroEnvironment.update(time);
    this.grassEnvironment.update(delta, this.camSystem.camera);
    this.carEnvironment.update(time, this.carControls.isCarRunning, this.carControls.carRotationTarget);
    this.swordEnvironment.update(time);
    this.swordControls.update(delta);
    this.oceanEnvironment.update(time);
    this.walleEnvironment.update(time);
    this.walleHeadMove.update(time);

    this.carLights.updateCabin(this.camSystem.isInsideCar, this.carControls.isCarRunning, time);

    // ── Render ────────────────────────────────────────────────
    if (this.currentDoorKey === 'floor1_door_002') {
      this._grassComposer.render();
    } else {
      this.renderer.render(this.scene, this.camSystem.camera);
    }
  }
}
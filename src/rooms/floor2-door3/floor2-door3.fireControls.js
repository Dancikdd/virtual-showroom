import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class FireControls {
  constructor() {
    this.enabled = true;
    this.visible = false;

    this._ui = null;

    this._model = null;
    this._light = null;
    this._mixer = null;

    this._clock = new THREE.Clock();

    this._loader = new GLTFLoader();

    this._onKeyDown = (e) => {
      if (e.code === 'KeyE') {
        this.toggle();
      }
    };
  }

  setModel(fireplaceModel) {
    if (!fireplaceModel) return;

    // dacă există deja focul, îl ștergem
    if (this._model?.parent) {
      this._model.parent.remove(this._model);
    }

    this._loader.load('/products/little_fire.glb', (gltf) => {

      this._model = gltf.scene;

      this._model.name = 'LittleFire';

      this._model.position.set(0, 15, 115);

      this._model.scale.set(25, 25, 25);

      this._model.rotation.set(0, 0, 0);

      this._model.traverse((child) => {
        if (child.isMesh) {

          child.frustumCulled = false;

          if (child.material) {

            child.material.transparent = true;

            child.material.depthWrite = false;

            child.material.side = THREE.DoubleSide;

            child.material.needsUpdate = true;

            // foc mai roșu
            child.material.emissive = new THREE.Color(0xff2200);

            child.material.emissiveIntensity = 4;

            child.material.color = new THREE.Color(0xff3300);
          }
        }
      });

      // animații GLB
      if (gltf.animations && gltf.animations.length > 0) {

        this._mixer = new THREE.AnimationMixer(this._model);

        gltf.animations.forEach((clip) => {

          const action = this._mixer.clipAction(clip);

          action.play();
        });
      }

      // lumină foc
      this._light = new THREE.PointLight(
        0xff3300,
        3,
        150
      );

      this._light.position.set(0, 10, 0);

      this._model.add(this._light);

      // IMPORTANT:
      // adăugăm în scena șemineului
      const parentScene = fireplaceModel.parent;

      if (parentScene) {
        parentScene.add(this._model);
      } else {
        fireplaceModel.add(this._model);
      }

      this._model.visible = this.enabled;

      console.log('Little fire loaded');
    });
  }

  show() {
    this.visible = true;

    this.enabled = true;

    if (this._model) {
      this._model.visible = true;
    }

    if (this._light) {
      this._light.visible = true;
    }

    this._buildUI();

    window.addEventListener(
      'keydown',
      this._onKeyDown
    );
  }

  hide() {
    this.visible = false;

    window.removeEventListener(
      'keydown',
      this._onKeyDown
    );

    // ștergem focul când ieșim
    if (this._model?.parent) {
      this._model.parent.remove(this._model);
    }

    this._model = null;

    this._light = null;

    this._mixer = null;

    if (this._ui?.parentNode) {
      this._ui.parentNode.removeChild(this._ui);
    }

    this._ui = null;
  }

  toggle() {
    this.enabled = !this.enabled;

    if (this._model) {
      this._model.visible = this.enabled;
    }

    if (this._light) {
      this._light.visible = this.enabled;
    }

    this._updateText();
  }

  update() {
    if (!this._model || !this.enabled) return;

    const delta = this._clock.getDelta();

    // animații GLB
    if (this._mixer) {
      this._mixer.update(delta);
    }

    // flicker lumină
    if (this._light) {
      this._light.intensity =
        2.5 + Math.random() * 1.5;
    }
  }

  _buildUI() {
    if (this._ui) return;

    this._ui = document.createElement('div');

    Object.assign(this._ui.style, {
      position: 'fixed',
      bottom: '90px',
      left: '50%',
      transform: 'translateX(-50%)',

      padding: '12px 22px',

      borderRadius: '14px',

      background: 'rgba(20,10,5,0.75)',

      border: '1px solid rgba(255,160,80,0.4)',

      color: '#ffd6a0',

      fontFamily: 'serif',

      fontSize: '16px',

      letterSpacing: '2px',

      zIndex: '1000',

      pointerEvents: 'none',
    });

    document.body.appendChild(this._ui);

    this._updateText();
  }

  _updateText() {
    if (!this._ui) return;

    this._ui.textContent = this.enabled
      ? '[ E ] Oprește focul'
      : '[ E ] Pornește focul';
  }
}
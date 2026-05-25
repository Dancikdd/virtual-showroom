// ══════════════════════════════════════════════════════════════
//  CAMERA
//  Gestionează: orbit view, interior cockpit, flash tranziție,
//  animație de intrare, mouse drag
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Offset-uri în spațiul LOCAL al mașinii
const CAR_INTERIOR_CAM_OFFSET    = new THREE.Vector3(0, 30, 0);
const CAR_INTERIOR_LOOKAT_OFFSET = new THREE.Vector3(0, 30, -120);

export class RoomCamera {
  constructor(overlay) {
    this.overlay = overlay;

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
    this.camera.position.set(0, 80, 400);
    this.camera.lookAt(0, 80, 0);

    this.orbitYaw    = 0;
    this.orbitPitch  = 0;
    this.smoothYaw   = 0;
    this.smoothPitch = 0;

    this._orbitR       = 170;
    this._orbitRTarget = 170;

    this.isInsideCar            = false;
    this._interiorTransitioning = false;
    this._camPosLerp  = new THREE.Vector3();
    this._camLookLerp = new THREE.Vector3();

    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.raycaster = new THREE.Raycaster();
    this.mouse2D   = new THREE.Vector2();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  MOUSE EVENTS (apelat din roomSystem cu referință la model și animType)
  // ══════════════════════════════════════════════════════════════
  bindMouse(getAnimType, getCurrentModel) {
    this._getAnimType     = getAnimType;
    this._getCurrentModel = getCurrentModel;

    window.addEventListener('mousedown', this._onMouseDown.bind(this));
    window.addEventListener('mousemove', this._onMouseMove.bind(this));
    window.addEventListener('mouseup',   this._onMouseUp.bind(this));
  }

  _onMouseDown(e) {
    const animType = this._getAnimType?.();

    if (this.isInsideCar) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      document.body.classList.add('room-grabbing');
      return;
    }
    if (animType === 'car_showroom') return;

    const model = this._getCurrentModel?.();
    if (model) {
      this.mouse2D.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      this.mouse2D.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse2D, this.camera);
      if (this.raycaster.intersectObject(model, true).length > 0) {
        this._orbitRTarget += 80;
        return;
      }
    }

    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    document.body.classList.remove('room-grab');
    document.body.classList.add('room-grabbing');
  }

  _onMouseMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    if (this.isInsideCar) {
      this.orbitYaw   -= dx * 0.0025;
      this.orbitPitch += dy * 0.0025;
      this.orbitPitch  = Math.max(-1.4, Math.min(1.4, this.orbitPitch));
      return;
    }
    if (this._getAnimType?.() === 'car_showroom') return;

    this.orbitYaw   -= dx * 0.003;
    this.orbitPitch += dy * 0.003;
    this.orbitPitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.orbitPitch));
  }

  _onMouseUp() {
    this.isDragging = false;
    document.body.classList.remove('room-grabbing');
    if (!this.isInsideCar && this._getAnimType?.() !== 'car_showroom') {
      document.body.classList.add('room-grab');
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  RESET la fiecare enter
  // ══════════════════════════════════════════════════════════════
  reset(animType) {
    this.orbitYaw       = 0;
    this.orbitPitch     = 0;
    this.smoothYaw      = 0;
    this.smoothPitch    = 0;
    this._orbitR        = 170;
    this._orbitRTarget  = 170;
    this.isInsideCar    = false;
    this._interiorTransitioning = false;
    this._camPosLerp.set(0, 0, 0);
    this._camLookLerp.set(0, 0, 0);

    if (animType === 'car_showroom') {
      this.camera.position.set(0, 60, 200);
      this.camera.lookAt(0, 20, 0);
    } else {
      this.camera.position.set(0, 80, 250);
    }
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
  }

  // ══════════════════════════════════════════════════════════════
  //  TOGGLE INTERIOR
  // ══════════════════════════════════════════════════════════════
  toggleInterior(onEnter, onExit) {
    if (this._interiorTransitioning) return;
    this.isInsideCar = !this.isInsideCar;
    this._interiorTransitioning = true;

    this.overlay.style.transition = 'opacity 0.18s ease-in';
    this.overlay.style.opacity    = '0.85';

    setTimeout(() => {
      if (this.isInsideCar) {
        this.camera.fov = 80;
        this.camera.updateProjectionMatrix();
        this.orbitYaw = this.orbitPitch = this.smoothYaw = this.smoothPitch = 0;
        onEnter?.();
      } else {
        this.camera.fov = 60;
        this.camera.updateProjectionMatrix();
        onExit?.();
      }

      this.overlay.style.transition = 'opacity 0.3s ease-out';
      this.overlay.style.opacity    = '0';
      setTimeout(() => { this._interiorTransitioning = false; }, 300);
    }, 180);
  }

  // ══════════════════════════════════════════════════════════════
  //  FLASH + ANIMATE ENTRY
  // ══════════════════════════════════════════════════════════════
  flash(animType, isModelReady, onMidpoint) {
    this.overlay.style.transition = 'none';
    this.overlay.style.opacity    = '0';

    if (animType === 'car_showroom') {
      this.camera.position.set(0, 60, 200);
      this.camera.lookAt(0, 20, 0);
    } else {
      this.camera.position.set(0, 80, 250);
    }
    this.camera.fov = 75;
    this.camera.updateProjectionMatrix();

    const isCar     = animType === 'car_showroom';
    const fadeInMs  = isCar ? 80  : (isModelReady ? 200 : 400);
    const fadeOutMs = isCar ? 120 : (isModelReady ? 300 : 600);

    requestAnimationFrame(() => {
      this.overlay.style.transition = `opacity ${fadeInMs / 1000}s ease-in`;
      this.overlay.style.opacity    = '1';

      setTimeout(() => {
        onMidpoint();
        this.overlay.style.transition = `opacity ${fadeOutMs / 1000}s ease-out`;
        this.overlay.style.opacity    = '0';
        this._animateEntry(animType);
      }, fadeInMs);
    });
  }

  _animateEntry(animType) {
    const isCar    = animType === 'car_showroom';
    const duration = isCar ? 450  : 1200;
    const startZ   = isCar ? 350  : 4000;
    const endZ     = isCar ? 200  : 150;
    const startFov = isCar ? 65   : 72;
    const endFov   = 60;
    const start    = performance.now();

    this.camera.position.z = startZ;
    this.camera.fov = startFov;
    this.camera.updateProjectionMatrix();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      this.camera.position.z = startZ + (endZ - startZ) * e;
      this.camera.fov        = startFov + (endFov - startFov) * e;
      this.camera.updateProjectionMatrix();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ══════════════════════════════════════════════════════════════
  //  UPDATE (apelat din update loop)
  // ══════════════════════════════════════════════════════════════
  update(animType, currentModel) {
    if (animType === 'car_showroom') {
      if (this.isInsideCar && currentModel) {
        this._updateInteriorCamera(currentModel);
      } else {
        this.camera.position.set(0, 60, 200);
        this.camera.lookAt(0, 20, 0);
      }
    } else {
      const lerpSpeed = 0.04;
      this.smoothYaw   += (this.orbitYaw   - this.smoothYaw)   * lerpSpeed;
      this.smoothPitch += (this.orbitPitch - this.smoothPitch) * lerpSpeed;
      const lookX = Math.sin(this.smoothYaw)  * Math.cos(this.smoothPitch);
      const lookY = Math.sin(this.smoothPitch);
      const lookZ = -Math.cos(this.smoothYaw) * Math.cos(this.smoothPitch);
      this.camera.position.set(0, 80, 0);
      this.camera.lookAt(lookX * 100, 80 + lookY * 100, lookZ * 100);
    }
  }

  _updateInteriorCamera(model) {
    const lerpSpeed = 0.08;
    this.smoothYaw   += (this.orbitYaw   - this.smoothYaw)   * lerpSpeed;
    this.smoothPitch += (this.orbitPitch - this.smoothPitch) * lerpSpeed;

    const carRotY  = model.rotation.y;
    const camOff   = CAR_INTERIOR_CAM_OFFSET.clone().applyEuler(new THREE.Euler(0, carRotY, 0));

    const lookYaw  = carRotY + this.smoothYaw;
    const lookDir  = new THREE.Vector3(
      Math.sin(lookYaw) * Math.cos(this.smoothPitch),
      Math.sin(this.smoothPitch),
      -Math.cos(lookYaw) * Math.cos(this.smoothPitch)
    ).multiplyScalar(150);

    const targetPos    = camOff.clone();
    const targetLookAt = camOff.clone().add(lookDir);
    targetLookAt.y += 38;

    if (this._camPosLerp.lengthSq() === 0) {
      this._camPosLerp.copy(targetPos);
      this._camLookLerp.copy(targetLookAt);
    }
    this._camPosLerp.lerp(targetPos, 0.12);
    this._camLookLerp.lerp(targetLookAt, 0.12);

    this.camera.position.copy(this._camPosLerp);
    this.camera.lookAt(this._camLookLerp);
  }
}

// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 4 — Wall-E Head Tracking
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

const HEAD_YAW_MAX   = 0.60;
const HEAD_PITCH_MAX = 0.40;
const STEP_SIZE      = 0.07;
const STEP_SPEED     = 0.14;
const GEAR_SPEED     = 0.44;

// ── Creează textură glow circulară ───────────────────────────
function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0,   'rgba(180, 230, 255, 1.0)');
  grad.addColorStop(0.3, 'rgba(100, 180, 255, 0.8)');
  grad.addColorStop(0.7, 'rgba(50,  120, 255, 0.3)');
  grad.addColorStop(1,   'rgba(0,   80,  255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export class WalleHeadMove {
  constructor() {
    this._head      = null;
    this._eyes      = null;
    this._neck      = null;
    this._pipe      = null;
    this._cyl1      = null;
    this._cyl2      = null;

    this._eyeSpriteL = null;
    this._eyeSpriteR = null;

    this._lights    = null;
    this._active    = false;

    this._headYaw   = 0;
    this._headPitch = 0;
    this._gearRot   = 0;

    this._mouseNDC  = new THREE.Vector2(0, 0);

    this._onMouseMove = (e) => {
      this._mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      this._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
  }

  setModel(model) {
    this._head = null;
    this._eyes = null;
    this._neck = null;
    this._pipe = null;
    this._cyl1 = null;
    this._cyl2 = null;

    // Curăță sprite-urile vechi
    if (this._eyeSpriteL) { this._eyeSpriteL.parent?.remove(this._eyeSpriteL); this._eyeSpriteL = null; }
    if (this._eyeSpriteR) { this._eyeSpriteR.parent?.remove(this._eyeSpriteR); this._eyeSpriteR = null; }

    if (!model) return;

    model.traverse((child) => {
      const n = child.name.toUpperCase();
      if (n === 'HEAD'      && !this._head) this._head = child;
      if (n === 'EYES'      && !this._eyes) this._eyes = child;
      if ((n === 'NECK.001' || n === 'NECK' || n.startsWith('NECK')) && !this._neck) this._neck = child;
      if (n === 'PIPE'      && !this._pipe) this._pipe = child;
      if (n === 'CYLINDER1' && !this._cyl1) this._cyl1 = child;
      if (n === 'CYLINDER2' && !this._cyl2) this._cyl2 = child;
    });

    // ── Eye sprites — atașate pe EYES node ───────────────────
    if (this._eyes) {
      const tex = makeGlowTexture();
      const matL = new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const matR = matL.clone();

      this._eyeSpriteL = new THREE.Sprite(matL);
      this._eyeSpriteR = new THREE.Sprite(matR);

      // Dimensiune glow
      this._eyeSpriteL.scale.set(1, 1, 1);
      this._eyeSpriteR.scale.set(1, 1, 1);

      // Poziție relativă față de EYES node (stânga/dreapta)
      this._eyeSpriteL.position.set(-0.4, 1.15, 1.7);
      this._eyeSpriteR.position.set( 0.4, 1.15, 1.7);

      this._eyes.add(this._eyeSpriteL);
      this._eyes.add(this._eyeSpriteR);
    }

    console.log('[WalleHeadMove] head:', this._head?.name,
                '| eyes:', this._eyes?.name,
                '| neck:', this._neck?.name,
                '| pipe:', this._pipe?.name,
                '| cyl1:', this._cyl1?.name,
                '| cyl2:', this._cyl2?.name);
  }

  setLights(lights) {
    this._lights = lights;
  }

  setActive(active) {
    this._active = active;
    if (active) {
      window.addEventListener('mousemove', this._onMouseMove);
    } else {
      window.removeEventListener('mousemove', this._onMouseMove);
      this._resetHead();
    }
  }

  update(time) {
    if (!this._active) return;

    const targetYaw   = Math.round((-this._mouseNDC.x * HEAD_YAW_MAX)  / STEP_SIZE) * STEP_SIZE;
    const targetPitch = Math.round(( this._mouseNDC.y * HEAD_PITCH_MAX) / STEP_SIZE) * STEP_SIZE;

    const prevYaw = this._headYaw;

    this._headYaw   += (targetYaw   - this._headYaw)   * STEP_SPEED;
    this._headPitch += (targetPitch - this._headPitch) * STEP_SPEED;

    const yaw   = this._headYaw;
    const pitch = this._headPitch;

    // HEAD
    if (this._head) {
      this._head.rotation.z = -yaw;
      this._head.rotation.x =  pitch;
    }

    // EYES
    if (this._eyes) {
      this._eyes.rotation.z = -yaw;
      this._eyes.rotation.x =  pitch;
    }

    // NECK
    if (this._neck) {
      this._neck.rotation.x = -pitch * 0.6;
      this._neck.rotation.z =  yaw   * 0.6;
    }

    // PIPE
    if (this._pipe) {
      this._pipe.rotation.x = -pitch * 0.4;
    }

    // GEAR
    const delta    = this._headYaw - prevYaw;
    this._gearRot += delta * GEAR_SPEED;
    if (this._cyl1) this._cyl1.rotation.z =  this._gearRot;
    if (this._cyl2) this._cyl2.rotation.z = -this._gearRot;

    // Eye glow pulse
    const pulse = 0.85 + Math.sin(time * 2.1) * 0.15;
    if (this._eyeSpriteL) this._eyeSpriteL.material.opacity = pulse;
    if (this._eyeSpriteR) this._eyeSpriteR.material.opacity = pulse;

    // Lumini punctuale
    if (this._lights && this._head) {
      const headWorld = new THREE.Vector3();
      this._head.getWorldPosition(headWorld);
      this._lights.eyeGlowL.position.set(headWorld.x - 8, headWorld.y + 4, headWorld.z + 10);
      this._lights.eyeGlowR.position.set(headWorld.x + 8, headWorld.y + 4, headWorld.z + 10);
      this._lights.update(time);
    }
  }

  dispose() {
    window.removeEventListener('mousemove', this._onMouseMove);
    this._resetHead();
  }

  _resetHead() {
    this._headYaw   = 0;
    this._headPitch = 0;
    this._gearRot   = 0;

    if (this._head) { this._head.rotation.set(0, 0, 0); }
    if (this._eyes) { this._eyes.rotation.set(0, 0, 0); }
    if (this._neck) { this._neck.rotation.set(0, 0, 0); }
    if (this._pipe) { this._pipe.rotation.set(0, 0, 0); }
    if (this._cyl1) { this._cyl1.rotation.z = 0; }
    if (this._cyl2) { this._cyl2.rotation.z = 0; }
  }
}
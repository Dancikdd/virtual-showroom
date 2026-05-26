// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 4 — Wall-E Head Tracking
//
//    HEAD     → Y (stânga/dreapta în jurul axei proprii)
//    EYES     → Y + X împreună cu HEAD
//    NECK.001 → X (sus/jos)
//    PIPE     → X (sus/jos, mai puţin)
//    CYLINDER1→ Z (rotaţie gear)
//    CYLINDER2→ Z (rotaţie gear, sens invers)
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ── Config ────────────────────────────────────────────────────
const HEAD_YAW_MAX   = 0.55;   // stânga/dreapta max (~31°)
const HEAD_PITCH_MAX = 0.30;   // sus/jos max (~17°)
const STEP_SIZE      = 0.07;   // treaptă mecanică (radiani)
const STEP_SPEED     = 0.18;   // viteză snap spre treaptă
const GEAR_SPEED     = 0.7;    // multiplicator viteză rotaţie gear

export class WalleHeadMove {
  constructor() {
    this._head      = null;   // HEAD     — Y (stânga/dreapta)
    this._eyes      = null;   // EYES     — Y + X cu HEAD
    this._neck      = null;   // NECK.001 — X
    this._pipe      = null;   // PIPE     — X
    this._cyl1      = null;   // CYLINDER1 — Z gear
    this._cyl2      = null;   // CYLINDER2 — Z gear invers

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

  // ── Wiring ────────────────────────────────────────────────────

  setModel(model) {
    this._head = null;
    this._eyes = null;
    this._neck = null;
    this._pipe = null;
    this._cyl1 = null;
    this._cyl2 = null;

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

    console.log('[WalleHeadMove] head:',  this._head?.name,
                '| eyes:', this._eyes?.name,
                '| neck:', this._neck?.name,
                '| pipe:', this._pipe?.name,
                '| cyl1:', this._cyl1?.name,
                '| cyl2:', this._cyl2?.name);
  }

  setLights(lights) {
    this._lights = lights;
  }

  // ── Activare / dezactivare ────────────────────────────────────

  setActive(active) {
    this._active = active;
    if (active) {
      window.addEventListener('mousemove', this._onMouseMove);
    } else {
      window.removeEventListener('mousemove', this._onMouseMove);
      this._resetHead();
    }
  }

  // ── Update ───────────────────────────────────────────────────
update(time) {
  if (!this._active) return;

  const targetYaw   = Math.round((-this._mouseNDC.x * HEAD_YAW_MAX)  / STEP_SIZE) * STEP_SIZE;
  const targetPitch = Math.round(( this._mouseNDC.y * HEAD_PITCH_MAX) / STEP_SIZE) * STEP_SIZE;

  const prevYaw   = this._headYaw;
  const prevPitch = this._headPitch;

  this._headYaw   += (targetYaw   - this._headYaw)   * STEP_SPEED;
  this._headPitch += (targetPitch - this._headPitch) * STEP_SPEED;

  const yaw   = this._headYaw;
  const pitch = this._headPitch;

// HEAD — rotaţie pe Z în loc de Y
if (this._head) {
  this._head.rotation.z = -yaw;
  this._head.rotation.x = pitch;
}

// EYES — la fel
if (this._eyes) {
  this._eyes.rotation.z = -yaw;
  this._eyes.rotation.x = pitch;
}

  // NECK — sus/jos pe X
  if (this._neck) {
    this._neck.rotation.x = -pitch * 0.6;

  if (this._neck) {
    this._neck.rotation.z = yaw * 0.6;
    }
  }

  // PIPE — sus/jos pe X
  if (this._pipe) {
    this._pipe.rotation.x = pitch * 0.4;
  }

  // GEAR
  const delta    = (this._headYaw - prevYaw);
  this._gearRot += delta * GEAR_SPEED;
  if (this._cyl1) this._cyl1.rotation.z =  this._gearRot;
  if (this._cyl2) this._cyl2.rotation.z = -this._gearRot;

  // Lumini
  if (this._lights && this._head) {
    const headWorld = new THREE.Vector3();
    this._head.getWorldPosition(headWorld);
    this._lights.eyeGlowL.position.set(headWorld.x - 8, headWorld.y + 4, headWorld.z + 10);
    this._lights.eyeGlowR.position.set(headWorld.x + 8, headWorld.y + 4, headWorld.z + 10);
    this._lights.update(time);
  }
}

  // ── Cleanup ──────────────────────────────────────────────────

  dispose() {
    window.removeEventListener('mousemove', this._onMouseMove);
    this._resetHead();
  }

  // ── Privat ───────────────────────────────────────────────────

  _resetHead() {
    this._headYaw   = 0;
    this._headPitch = 0;
    this._gearRot   = 0;

    if (this._head) { this._head.rotation.y = 0; }
    if (this._eyes) { this._eyes.rotation.y = 0; this._eyes.rotation.x = 0; }
    if (this._neck) { this._neck.rotation.x = 0; }
    if (this._pipe) { this._pipe.rotation.x = 0; }
    if (this._cyl1) { this._cyl1.rotation.z = 0; }
    if (this._cyl2) { this._cyl2.rotation.z = 0; }
  }
}
// ══════════════════════════════════════════════════════════════
//  GRASS CONTROLS — W to walk forward in a straight line
// ══════════════════════════════════════════════════════════════

import { CameraBobbing } from './camera-bobbing.js';

export class GrassControls {
  constructor() {
    this._w     = false;
    this._speed = 120;

    this._startX = 0;
    this._startZ = 200;

    this._treeX = 0;
    this._treeZ = -1700;
    this._teleportRadius = 150;

    this._bob = new CameraBobbing();

    this._onKeyDown = (e) => { if (e.code === 'KeyW') this._w = true;  };
    this._onKeyUp   = (e) => { if (e.code === 'KeyW') this._w = false; };
  }

  enable(camera) {
    this._startX = camera.position.x;
    this._startZ = camera.position.z;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  disable() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    this._w = false;
    this._bob.reset();
  }

  update(delta, camera) {
    if (this._w) {
      camera.position.z -= this._speed * delta;

      const dx = camera.position.x - this._treeX;
      const dz = camera.position.z - this._treeZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < this._teleportRadius) {
        camera.position.x = this._startX;
        camera.position.z = this._startZ;
      }
    }

    this._bob.update(delta, this._w, camera);
  }
}
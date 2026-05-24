// ══════════════════════════════════════════════════════════════
//  GRASS CONTROLS — W to walk forward in a straight line
// ══════════════════════════════════════════════════════════════

export class GrassControls {
  constructor() {
    this._w     = false;
    this._speed = 120;

    this._startX = 0;
    this._startZ = 200;

    // Tree position — match what you set in _loadTree()
    this._treeX = 0;
    this._treeZ = -1700;
    this._teleportRadius = 150; // how close before teleport

    this._onKeyDown = (e) => { if (e.code === 'KeyW') this._w = true;  };
    this._onKeyUp   = (e) => { if (e.code === 'KeyW') this._w = false; };
  }

  enable(camera) {
    // Capture starting position when room is entered
    this._startX = camera.position.x;
    this._startZ = camera.position.z;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  disable() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    this._w = false;
  }

  update(delta, camera) {
    if (!this._w) return;

    camera.position.z -= this._speed * delta;

    // Check distance to tree
    const dx = camera.position.x - this._treeX;
    const dz = camera.position.z - this._treeZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < this._teleportRadius) {
      camera.position.x = this._startX;
      camera.position.z = this._startZ;
    }
  }
}
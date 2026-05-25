// ══════════════════════════════════════════════════════════════
//  CAMERA BOBBING
// ══════════════════════════════════════════════════════════════

export class CameraBobbing {
  constructor() {
    this._t         = 0;
    this._intensity = 0;

    this.speed     = 6.0;
    this.amplitude = 0.35;
    this.swayAmp   = 0.12;
    this.smoothing = 8.0;
  }

  update(delta, isMoving, camera) {
    const target = isMoving ? 1.0 : 0.0;
    this._intensity += (target - this._intensity) * Math.min(1, delta * this.smoothing);

    if (this._intensity < 0.001) return;

    this._t += delta * this.speed * this._intensity;

    // Two bobs per stride cycle — feels like actual footsteps
    camera.position.y += Math.sin(this._t * 2) * this.amplitude * this._intensity;
    camera.position.x += Math.sin(this._t)     * this.swayAmp   * this._intensity;
  }

  reset() {
    this._t         = 0;
    this._intensity = 0;
  }
}
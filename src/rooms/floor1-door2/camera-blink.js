// ══════════════════════════════════════════════════════════════
//  CAMERA BLINK
//  Covers instant camera teleportation with an organic blink
//  effect — fast close, brief hold in darkness, slower open.
//
//  Usage:
//    const blink = new CameraBlink();
//    blink.trigger(() => { camera.position.set(...) });   // callback runs at peak darkness
//
//  The overlay div is appended to document.body and removed
//  automatically after each blink to keep the DOM clean.
// ══════════════════════════════════════════════════════════════

export class CameraBlink {
  constructor() {
    this._overlay  = null;
    this._busy     = false;
    this._onPeak   = null;   // callback executed at full darkness
    this._raf      = null;

    // Timing (ms) — tune these to taste
    this.closeMs   = 120;   // eyelid-down: fast
    this.holdMs    = 80;    // peak darkness hold
    this.openMs    = 260;   // eyelid-up: slow, dreamy

    this._build();
  }

  // ── DOM ─────────────────────────────────────────────────────
  _build() {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position:        'fixed',
      inset:           '0',
      background:      '#000',
      opacity:         '0',
      pointerEvents:   'none',
      zIndex:          '9999',
      backgroundImage: 'radial-gradient(ellipse 120% 80% at 50% 110%, #1a0a00 0%, #000 60%)',
      transition:      'none',
    });
    document.body.appendChild(el);
    this._overlay = el;
  }

  // ── PUBLIC ───────────────────────────────────────────────────
  /**
   * Trigger a blink.
   * @param {Function} onPeak  — called at peak darkness (do your teleport here)
   * @param {Object}   opts    — optional override: { closeMs, holdMs, openMs }
   */
  trigger(onPeak, opts = {}) {
    if (this._busy) return;
    this._busy   = true;
    this._onPeak = onPeak;

    const close = opts.closeMs ?? this.closeMs;
    const hold  = opts.holdMs  ?? this.holdMs;
    const open  = opts.openMs  ?? this.openMs;

    this._animate(close, hold, open);
  }

  /** True while a blink is in progress. */
  get busy() { return this._busy; }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
  }

  // ── INTERNAL ─────────────────────────────────────────────────
  _animate(closeMs, holdMs, openMs) {
    const el    = this._overlay;
    const start = performance.now();

    // Easing helpers
    const easeIn  = t => t * t * t;               
    const easeOut = t => 1 - Math.pow(1 - t, 2.6); 
    let peakFired = false;

    const tick = (now) => {
      const elapsed = now - start;

      if (elapsed < closeMs) {
        // ── Closing ──────────────────────────────────────────
        const t = elapsed / closeMs;
        el.style.opacity = easeIn(t).toFixed(4);

      } else if (elapsed < closeMs + holdMs) {
        // ── Peak darkness ────────────────────────────────────
        el.style.opacity = '1';

        if (!peakFired) {
          peakFired = true;
          try { if (typeof this._onPeak === 'function') this._onPeak(); }
          catch (e) { console.error('[CameraBlink] onPeak error:', e); }
        }

      } else {
        // ── Opening ──────────────────────────────────────────
        const t = Math.min(1, (elapsed - closeMs - holdMs) / openMs);
        el.style.opacity = (1 - easeOut(t)).toFixed(4);

        if (t >= 1) {
          el.style.opacity = '0';
          this._busy = false;
          return; // done — stop RAF loop
        }
      }

      this._raf = requestAnimationFrame(tick);
    };

    this._raf = requestAnimationFrame(tick);
  }
}
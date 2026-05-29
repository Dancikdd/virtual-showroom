// ══════════════════════════════════════════════════════════════
//  UI
//  Gestionează toate elementele DOM: overlay, label, loading,
//  HUD interior cockpit, cursor custom
//  NOTE: Stilurile sunt definite în styles.css — nu se mai
//        injectează dinamic și nu se mai aplică inline.
// ══════════════════════════════════════════════════════════════

export class RoomUI {
  constructor() {
    this.overlay          = this._getOrCreate('room-overlay');
    this.label            = this._getOrCreate('room-label');
    this.loadingIndicator = this._getOrCreate('room-loading', this._buildLoading.bind(this));
    this.interiorHUD      = this._getOrCreate('room-interior-hud', this._buildInteriorHUD.bind(this));
    this.grassHint        = this._getOrCreate('room-grass-hint', this._buildGrassHint.bind(this));
  }

  // ── Helpers de creare DOM ──────────────────────────────────

  /** Returnează elementul dacă există deja în DOM, altfel îl creează. */
  _getOrCreate(id, builderFn) {
    let el = document.getElementById(id);
    if (!el) {
      el = builderFn ? builderFn(id) : this._createElement(id);
      document.body.appendChild(el);
    }
    return el;
  }

  _createElement(id) {
    const el = document.createElement('div');
    el.id = id;
    return el;
  }

  _buildLoading(id) {
    const el = document.createElement('div');
    el.id = id;
    el.innerHTML = `
      <div class="loading-icon">⟳</div>
      <div>SE ÎNCARCĂ...</div>
    `;
    return el;
  }

  _buildInteriorHUD(id) {
    const el = document.createElement('div');
    el.id = id;
    const vignette = document.createElement('div');
    vignette.className = 'vignette';
    el.appendChild(vignette);
    return el;
  }

  _buildGrassHint(id) {
    const el = document.createElement('div');
    el.id = id;

    const key = document.createElement('span');
    key.className = 'hint-key';
    key.textContent = 'W';

    const text = document.createElement('span');
    text.className = 'hint-text';
    text.textContent = 'to move forward';

    el.appendChild(key);
    el.appendChild(text);
    return el;
  }

  // ── Label produs ───────────────────────────────────────────

  showLabel(text) {
    this.label.textContent = text;
    this.label.style.opacity = '1';
  }

  hideLabel() {
    this.label.style.opacity = '0';
  }

  // ── Interior HUD ───────────────────────────────────────────

  showInteriorHUD() {
    this.interiorHUD.style.opacity = '1';
  }

  hideInteriorHUD() {
    this.interiorHUD.style.opacity = '0';
  }

  // ── Loading indicator ──────────────────────────────────────

  showLoading() {
    this.loadingIndicator.style.opacity = '1';
  }

  hideLoading() {
    this.loadingIndicator.style.opacity = '0';
  }

  // ── Overlay fade ───────────────────────────────────────────

  fadeIn(durationMs = 200, callback) {
    this.overlay.style.transition = `opacity ${durationMs / 1000}s ease-in`;
    this.overlay.style.opacity = '1';
    if (callback) setTimeout(callback, durationMs);
  }

  fadeOut(durationMs = 400) {
    this.overlay.style.transition = `opacity ${durationMs / 1000}s ease-out`;
    this.overlay.style.opacity = '0';
  }

  setOverlayOpaque() {
    this.overlay.style.transition = 'none';
    this.overlay.style.opacity = '1';
  }

  setOverlayTransparent() {
    this.overlay.style.transition = 'none';
    this.overlay.style.opacity = '0';
  }

  // ── Cursor ─────────────────────────────────────────────────

  setCursorGrab() {
    document.body.classList.replace('room-grabbing', 'room-grab') ||
    document.body.classList.add('room-grab');
  }

  setCursorGrabbing() {
    document.body.classList.replace('room-grab', 'room-grabbing') ||
    document.body.classList.add('room-grabbing');
  }

  clearCursor() {
    document.body.classList.remove('room-grab', 'room-grabbing');
  }

  showSystemCursor() {
    document.body.style.cursor = 'none';
    const cc = document.getElementById('cursor');
    if (cc) cc.style.display = 'block';
  }

  hideSystemCursor() {
    document.body.style.cursor = '';
    const cc = document.getElementById('cursor');
    if (cc) cc.style.display = 'none';
  }

  // ── Grass hint ─────────────────────────────────────────────

  showGrassHint() {
    this.grassHint.style.opacity = '1';
  }

  hideGrassHint() {
    this.grassHint.style.opacity = '0';
  }
}
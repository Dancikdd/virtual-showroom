// ══════════════════════════════════════════════════════════════
//  UI
//  Gestionează toate elementele DOM: overlay, label, loading,
//  HUD interior cockpit, cursor custom
// ══════════════════════════════════════════════════════════════

export class RoomUI {
  constructor() {
    this._injectCursorStyle();
    this.overlay           = this._createOverlay();
    this.label             = this._createLabel();
    this.loadingIndicator  = this._createLoadingIndicator();
    this.interiorHUD       = this._createInteriorHUD();
  }

  // ── Cursor custom ──
  _injectCursorStyle() {
    if (document.getElementById('room-cursor-style')) return;
    const style = document.createElement('style');
    style.id = 'room-cursor-style';
    style.textContent = `
      .room-grab     { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg fill='white' stroke='%23333' stroke-width='1.5'%3E%3Crect x='13' y='2' width='4' height='14' rx='2'/%3E%3Crect x='18' y='4' width='4' height='12' rx='2'/%3E%3Crect x='8' y='5' width='4' height='12' rx='2'/%3E%3Crect x='23' y='7' width='4' height='10' rx='2'/%3E%3Crect x='6' y='15' width='20' height='12' rx='3'/%3E%3C/g%3E%3C/svg%3E") 10 4, grab; }
      .room-grabbing { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg fill='white' stroke='%23333' stroke-width='1.5'%3E%3Crect x='8' y='10' width='4' height='10' rx='2'/%3E%3Crect x='13' y='8' width='4' height='12' rx='2'/%3E%3Crect x='18' y='8' width='4' height='12' rx='2'/%3E%3Crect x='23' y='10' width='4' height='10' rx='2'/%3E%3Crect x='6' y='18' width='20' height='10' rx='3'/%3E%3C/g%3E%3C/svg%3E") 10 4, grabbing; }
    `;
    document.head.appendChild(style);
  }

  // ── Overlay fade (negru) ──
  _createOverlay() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      inset: 0;
      background: #00010a;
      opacity: 0;
      pointer-events: none;
      z-index: 100;
      transition: none;
    `;
    document.body.appendChild(el);
    return el;
  }

  // ── Label produs (titlu sus) ──
  _createLabel() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 22px;
      font-family: sans-serif;
      letter-spacing: 3px;
      text-transform: uppercase;
      opacity: 0;
      transition: opacity 0.8s ease;
      z-index: 50;
      pointer-events: none;
    `;
    document.body.appendChild(el);
    return el;
  }

  // ── Indicator loading ──
  _createLoadingIndicator() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ff6600;
      font-size: 16px;
      font-family: sans-serif;
      letter-spacing: 4px;
      text-transform: uppercase;
      opacity: 0;
      z-index: 200;
      pointer-events: none;
      transition: opacity 0.3s ease;
      text-align: center;
    `;
    el.innerHTML = `
      <div style="margin-bottom:12px;font-size:28px;">⟳</div>
      <div>SE ÎNCARCĂ...</div>
    `;
    document.body.appendChild(el);
    return el;
  }

  // ── HUD interior cockpit (vignetă) ──
  _createInteriorHUD() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 60;
      opacity: 0;
      transition: opacity 0.6s ease;
    `;

    const vignette = document.createElement('div');
    vignette.style.cssText = `
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center,
        transparent 45%,
        rgba(0,0,0,0.40) 75%,
        rgba(0,0,0,0.82) 100%
      );
    `;
    el.appendChild(vignette);
    document.body.appendChild(el);
    return el;
  }

  // ── Helpers publice ──
  showLabel(text) {
    this.label.textContent = text;
    this.label.style.opacity = '1';
    this.label.style.color = '#ffffff';
  }

  hideLabel() {
    this.label.style.opacity = '0';
  }

  showInteriorHUD() {
    this.interiorHUD.style.opacity = '1';
  }

  hideInteriorHUD() {
    this.interiorHUD.style.opacity = '0';
  }

 showLoading(text = 'SE ÎNCARCĂ...') {

  this.loadingIndicator.innerHTML = `

    <div class="room-spinner"></div>

    <div style="
      margin-top:18px;
      color:white;
      font-size:14px;
      letter-spacing:3px;
      font-family:sans-serif;
    ">
      ${text}
    </div>
  `;

  this.loadingIndicator.style.opacity = '1';

  if (!document.getElementById('room-spinner-style')) {

    const style = document.createElement('style');

    style.id = 'room-spinner-style';

    style.innerHTML = `

      .room-spinner {

        width: 70px;
        height: 70px;

        border-radius: 50%;

        border: 5px solid rgba(255,255,255,0.15);

        border-top-color: white;

        animation: roomSpin 0.8s linear infinite;
      }

      @keyframes roomSpin {

        from {
          transform: rotate(0deg);
        }

        to {
          transform: rotate(360deg);
        }
      }
    `;

    document.head.appendChild(style);
  }
}
  hideLoading() {
    this.loadingIndicator.style.opacity = '0';
  }

  fadeIn(durationMs = 150, callback) {
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

  setCursorGrab() {
    document.body.classList.remove('room-grabbing');
    document.body.classList.add('room-grab');
  }

  setCursorGrabbing() {
    document.body.classList.remove('room-grab');
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
}

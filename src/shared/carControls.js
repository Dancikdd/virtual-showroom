// ══════════════════════════════════════════════════════════════
//  CAR CONTROLS
//  Butoane: START/STOP motor, DESCHIDE/ÎNCHIDE uși, INTRĂ/IEȘi
//  Gestionează animațiile ușilor și starea motorului
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class CarControls {
  constructor(onToggleInterior) {
    this.onToggleInterior = onToggleInterior;

    this.isCarRunning    = false;
    this.carRotationSpeed  = 0;
    this.carRotationTarget = 0.005;

    this.doorsOpen   = false;
    this.doorActions = [];
    this._doorDuration = 1;

    this.container = this._createContainer();
    this.btnStart    = this._createStartBtn();
    this.btnDoors    = this._createDoorsBtn();
    this.btnInterior = this._createInteriorBtn();

    this.container.appendChild(this.btnStart);
    this.container.appendChild(this.btnDoors);
    this.container.appendChild(this.btnInterior);
    document.body.appendChild(this.container);
  }

  // ══════════════════════════════════════════════════════════════
  //  DOM
  // ══════════════════════════════════════════════════════════════
  _createContainer() {
    const el = document.createElement('div');
    el.id = 'car-controls';
    el.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 15px;
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    return el;
  }

  _btn(text, borderColor, bgColor, textColor) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 10px 28px;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 3px;
      text-transform: uppercase;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.25s ease;
      font-family: sans-serif;
      backdrop-filter: blur(4px);
      border: 1px solid ${borderColor};
      background: ${bgColor};
      color: ${textColor};
    `;
    return btn;
  }

  _createStartBtn() {
    const btn = this._btn('START',
      'rgba(255,100,0,0.6)', 'rgba(255,100,0,0.08)', 'rgba(255,120,30,0.9)'
    );
    btn.id = 'car-start-btn';
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleEngine(); });
    return btn;
  }

  _createDoorsBtn() {
    const btn = this._btn('DESCHIDE UȘILE',
      'rgba(60,160,255,0.6)', 'rgba(60,160,255,0.08)', 'rgba(80,170,255,0.9)'
    );
    btn.id = 'doors-btn';
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleDoors(); });
    return btn;
  }

  _createInteriorBtn() {
    const btn = this._btn('INTRĂ ÎN MAȘINĂ',
      'rgba(0,210,140,0.6)', 'rgba(0,210,140,0.08)', 'rgba(0,220,150,0.9)'
    );
    btn.id = 'car-interior-btn';
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.onToggleInterior(); });
    return btn;
  }

  // ══════════════════════════════════════════════════════════════
  //  VIZIBILITATE
  // ══════════════════════════════════════════════════════════════
  show() {
    this.container.style.opacity      = '1';
    this.container.style.pointerEvents = 'auto';
  }

  hide() {
    this.container.style.opacity      = '0';
    this.container.style.pointerEvents = 'none';
  }

  // ══════════════════════════════════════════════════════════════
  //  MOTOR
  // ══════════════════════════════════════════════════════════════
  toggleEngine() {
    this.isCarRunning = !this.isCarRunning;
    this.btnStart.textContent = this.isCarRunning ? 'STOP' : 'START';
    this.btnStart.style.background = this.isCarRunning
      ? 'rgba(255,102,0,0.4)'
      : 'rgba(255,102,0,0.08)';
  }

  // ══════════════════════════════════════════════════════════════
  //  UȘI
  // ══════════════════════════════════════════════════════════════
  setupDoorAnimations(gltf, mixer) {
    this.doorActions  = [];
    this._mixer       = mixer;

    if (!gltf?.animations?.length) {
      console.warn('Modelul nu are animații de uși.');
      return;
    }

    let clips = gltf.animations.filter(c => c.name.toLowerCase().includes('door'));
    if (!clips.length) clips = gltf.animations;

    clips.forEach(clip => {
      let minTime = Infinity, maxTime = -Infinity;
      clip.tracks.forEach(t => {
        minTime = Math.min(minTime, t.times[0]);
        maxTime = Math.max(maxTime, t.times[t.times.length - 1]);
      });
      if (minTime === Infinity)  minTime = 0;
      if (maxTime === -Infinity) maxTime = clip.duration;

      const fps = 30;
      const subClip = THREE.AnimationUtils.subclip(
        clip, clip.name + '_doors',
        Math.floor(minTime * fps), Math.ceil(maxTime * fps), fps
      );
      this._doorDuration = subClip.duration;
      console.log(`Subclip: ${subClip.name} | ${subClip.duration.toFixed(2)}s`);

      const action = mixer.clipAction(subClip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.stop();
      this.doorActions.push(action);
    });
  }

  toggleDoors() {
    this.doorsOpen = !this.doorsOpen;
    this.btnDoors.textContent = this.doorsOpen ? 'ÎNCHIDE UȘILE' : 'DESCHIDE UȘILE';
    this.btnDoors.style.background = this.doorsOpen
      ? 'rgba(68,170,255,0.5)'
      : 'rgba(68,170,255,0.08)';

    if (!this.doorActions?.length) {
      console.warn('Nicio animație de uși disponibilă.');
      return;
    }

    const SPEED = 3.0;
    const endT  = this._doorDuration;
    this.doorActions.forEach(action => {
      action.paused = false;
      if (this.doorsOpen) {
        action.timeScale = SPEED;
        action.reset();
        action.play();
      } else {
        action.timeScale = -SPEED;
        action.reset();
        action.time = endT;
        action.play();
      }
      if (this._mixer) this._mixer.update(0);
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  BUTON INTERIOR — stare vizuală
  // ══════════════════════════════════════════════════════════════
  setInteriorMode(inside) {
    if (inside) {
      this.btnInterior.textContent      = 'IEȘi DIN MAȘINĂ';
      this.btnInterior.style.background = 'rgba(0,255,170,0.3)';
      this.btnInterior.style.boxShadow  = '0 0 12px rgba(0,255,170,0.4)';
      this.btnStart.style.opacity       = '0';
      this.btnStart.style.pointerEvents = 'none';
    } else {
      this.btnInterior.textContent      = 'INTRĂ ÎN MAȘINĂ';
      this.btnInterior.style.background = 'rgba(0,255,170,0.08)';
      this.btnInterior.style.boxShadow  = 'none';
      this.btnStart.style.opacity       = '1';
      this.btnStart.style.pointerEvents = 'auto';
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  RESET (la fiecare enter/exit)
  // ══════════════════════════════════════════════════════════════
  reset() {
    this.isCarRunning    = false;
    this.carRotationSpeed = 0;
    this.doorsOpen       = false;
    this.doorActions     = [];

    this.btnStart.textContent    = 'START';
    this.btnStart.style.background = 'rgba(255,102,0,0.08)';
    this.btnStart.style.opacity    = '1';
    this.btnStart.style.pointerEvents = 'auto';

    this.btnDoors.textContent    = 'DESCHIDE UȘILE';
    this.btnDoors.style.background = 'rgba(68,170,255,0.08)';

    this.btnInterior.textContent      = 'INTRĂ ÎN MAȘINĂ';
    this.btnInterior.style.background = 'rgba(0,255,170,0.08)';
    this.btnInterior.style.boxShadow  = 'none';
  }
}

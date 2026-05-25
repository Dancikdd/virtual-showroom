import * as THREE from 'three';

export class SwordControls {
  constructor(scene) {
    this.scene = scene;

    this.rootModel = null;
    this.model = null;

    this.progress = 0;

    this.visible = false;

    this._qteActive = false;

    this._qteAngle = 0;

    this._qteSpeed = 2.2;

    this._qteZoneStart = 0;

    this._qteZoneSize = 1.25;

    this._qteTimer = 0;

    this._qteInterval = 4.0;

    this._swordBaseY = 0;

    this._maxLift = 0.6;

    this._overlay = null;

    this._canvas = null;

    this._ctx = null;

    this._spaceHeld = false;

    this._won = false;

    this._onKeyDown = (e) => {

      if (e.code === 'Space') {

        e.preventDefault();

        this._spaceHeld = true;
      }
    };

    this._onKeyUp = (e) => {

      if (e.code === 'Space') {

        this._spaceHeld = false;
      }
    };

    this._onClick = () => this._handleClick();
  }

  attach(model) {

    this.rootModel = model;

    this.model = null;

    const swordParts = [];

    if (model) {

      model.traverse((child) => {

        const n = child.name.toLowerCase();

        if (
          child.isMesh &&
          n.startsWith('sword_')
        ) {
          swordParts.push(child);
        }
      });
    }

    if (swordParts.length > 0) {

      const group = new THREE.Group();

      group.name = 'ExcaliburSwordGroup';

      model.add(group);

      swordParts.forEach((part) => {

        group.attach(part);
      });

      this.model = group;

    } else {

      console.warn(
        '[SwordControls] Nu am găsit piese sword_.'
      );

      this.model = model;
    }

    this._swordBaseY = this.model.position.y;

    this.progress = 0;

    if (
      localStorage.getItem(
        'excalibur_pulled'
      ) === 'true'
    ) {

      this.progress = 1;
    }

    this._qteTimer = this._qteInterval;

    this._qteActive = false;

    this._spawnQteZone();
  }

  detach() {

    this.rootModel = null;

    this.model = null;

    this.progress = 0;

    this._qteActive = false;

    this._spaceHeld = false;
  }

  show() {

    this.visible = true;

    this._buildUI();

    window.addEventListener(
      'keydown',
      this._onKeyDown
    );

    window.addEventListener(
      'keyup',
      this._onKeyUp
    );

    window.addEventListener(
      'click',
      this._onClick
    );
  }

  hide() {

    this.visible = false;

    window.removeEventListener(
      'keydown',
      this._onKeyDown
    );

    window.removeEventListener(
      'keyup',
      this._onKeyUp
    );

    window.removeEventListener(
      'click',
      this._onClick
    );

    if (
      this._overlay &&
      this._overlay.parentNode
    ) {

      this._overlay.parentNode.removeChild(
        this._overlay
      );
    }

    this._overlay = null;

    this._canvas = null;

    this._ctx = null;

    this._spaceHeld = false;
  }

  _buildUI() {

    if (this._overlay) return;

    this._overlay =
      document.createElement('div');

    Object.assign(
      this._overlay.style,
      {
        position: 'fixed',

        bottom: '80px',

        left: '50%',

        transform:
          'translateX(-50%)',

        display: 'flex',

        flexDirection: 'column',

        alignItems: 'center',

        gap: '16px',

        pointerEvents: 'none',

        zIndex: '1000',
      }
    );

    this._barWrap =
      document.createElement('div');

    Object.assign(
      this._barWrap.style,
      {
        width: '220px',

        height: '12px',

        background:
          'rgba(255,255,255,0.15)',

        borderRadius: '6px',

        overflow: 'hidden',

        border:
          '1px solid rgba(150,100,255,0.4)',
      }
    );

    this._barFill =
      document.createElement('div');

    Object.assign(
      this._barFill.style,
      {
        height: '100%',

        width: '0%',

        background:
          'linear-gradient(90deg, #6600ff, #aa44ff)',

        transition: 'width 0.1s',

        borderRadius: '6px',
      }
    );

    this._barWrap.appendChild(
      this._barFill
    );

    this._hint =
      document.createElement('div');

    Object.assign(
      this._hint.style,
      {
        color:
          'rgba(200,180,255,0.8)',

        fontSize: '13px',

        fontFamily: 'serif',

        letterSpacing: '2px',
      }
    );

    this._hint.textContent =
      '[ SPACE ] Trage sabia';

    this._canvas =
      document.createElement('canvas');

    this._canvas.width = 160;

    this._canvas.height = 160;

    this._canvas.style.display =
      'none';

    this._ctx =
      this._canvas.getContext('2d');

    this._overlay.appendChild(
      this._canvas
    );

    this._overlay.appendChild(
      this._barWrap
    );

    this._overlay.appendChild(
      this._hint
    );

    document.body.appendChild(
      this._overlay
    );
  }

  _spawnQteZone() {

    this._qteZoneStart =
      Math.random() * Math.PI * 2;

    this._qteAngle = 0;

    this._qteSpeed =
      1.8 + this.progress * 1.5;
  }

  _handleClick() {

    if (!this._qteActive) return;

    const a =
      (
        (
          this._qteAngle %
          (Math.PI * 2)
        ) +
        Math.PI * 2
      ) %
      (Math.PI * 2);

    const zs = this._qteZoneStart;

    const ze =
      (
        zs +
        this._qteZoneSize
      ) %
      (Math.PI * 2);

    const inZone =
      zs < ze
        ? a >= zs && a <= ze
        : a >= zs || a <= ze;

    if (inZone) {

      this._qteActive = false;

      this._qteTimer =
        this._qteInterval *
        (
          0.7 +
          Math.random() * 0.6
        );

      this._canvas.style.display =
        'none';

    } else {

      this._qteActive = false;

      this._qteTimer =
        this._qteInterval;

      this._canvas.style.display =
        'none';

      this.progress = 0;

      this._spaceHeld = false;
    }
  }

  update(delta) {

    if (!this.visible) return;

    if (
      this._spaceHeld &&
      !this._qteActive
    ) {

      this.progress = Math.min(
        1,
        this.progress +
          delta * 0.12
      );
    }

    if (
      !this._qteActive &&
      this.progress > 0 &&
      this.progress < 1
    ) {

      this._qteTimer -= delta;

      if (this._qteTimer <= 0) {

        this._qteActive = true;

        this._spawnQteZone();

        if (this._canvas) {

          this._canvas.style.display =
            'block';
        }
      }
    }

    if (this._qteActive) {

      this._qteAngle +=
        this._qteSpeed * delta;

      this._drawQTE();
    }

    if (this.model) {

      const targetY =
        this._swordBaseY +
        this.progress *
          this._maxLift;

      this.model.position.y +=
        (
          targetY -
          this.model.position.y
        ) *
        0.08;
    }

    if (this._barFill) {

      this._barFill.style.width =
        `${
          (
            this.progress * 100
          ).toFixed(1)
        }%`;
    }

    if (
      this.progress >= 1 &&
      !this._won
    ) {

      this._won = true;

      localStorage.setItem(
        'excalibur_pulled',
        'true'
      );

      const msg =
        document.createElement(
          'div'
        );

      Object.assign(
        msg.style,
        {
          position: 'fixed',

          top: '80px',

          left: '50%',

          transform:
            'translateX(-50%)',

          padding: '16px 34px',

          background:
            'rgba(25,15,45,0.92)',

          border:
            '1px solid rgba(170,120,255,0.45)',

          borderRadius: '16px',

          color: '#ffe082',

          fontSize: '28px',

          fontFamily: 'serif',

          fontWeight: 'bold',

          boxShadow:
            '0 0 30px rgba(120,0,255,0.35)',

          zIndex: '999999',

          pointerEvents: 'auto',
        }
      );

      msg.textContent =
        '⚔️ Excalibur eliberat!';

      const retry =
        document.createElement(
          'button'
        );

     retry.innerText =
  'Reset';

      retry.style.pointerEvents =
        'auto';

      Object.assign(
        retry.style,
        {
          marginTop: '18px',

          padding: '14px 26px',

          borderRadius: '14px',

          border:
            '1px solid rgba(255,255,255,0.2)',

          background: '#666666',

          color: 'white',

          cursor: 'pointer',

          fontWeight: 'bold',

          fontSize: '16px',

         boxShadow:
  '0 0 20px rgba(0,0,0,0.35)',

          transition:
            'all 0.2s ease',
        }
      );

      retry.onmouseenter = () => {

        retry.style.transform =
          'scale(1.06)';

        retry.style.background =
          '#ff6666';
      };

      retry.onmouseleave = () => {

        retry.style.transform =
          'scale(1)';

        retry.style.background =
          '#ff4444';
      };

      retry.onclick = () => {

        localStorage.removeItem(
          'excalibur_pulled'
        );

        this.progress = 0;

        this._won = false;

        this._spaceHeld = false;

        this._qteActive = false;

        this._qteTimer =
          this._qteInterval;

        if (this.model) {

          this.model.position.y =
            this._swordBaseY;
        }

        if (this._barFill) {

          this._barFill.style.width =
            '0%';
        }

        msg.remove();
      };

      msg.appendChild(
        document.createElement('br')
      );

      msg.appendChild(retry);

      document.body.appendChild(msg);
    }

    if (this.progress < 1) {

      this._won = false;
    }
  }

  _drawQTE() {

    if (!this._ctx) return;

    const ctx = this._ctx;

    const cx = 80;

    const cy = 80;

    const r = 65;

    ctx.clearRect(
      0,
      0,
      160,
      160
    );

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      r,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle =
      'rgba(100,60,200,0.3)';

    ctx.lineWidth = 10;

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      r,
      this._qteZoneStart,
      this._qteZoneStart +
        this._qteZoneSize
    );

    ctx.strokeStyle =
      'rgba(100,255,150,0.9)';

    ctx.lineWidth = 10;

    ctx.stroke();

    const ix =
      cx +
      Math.cos(
        this._qteAngle
      ) *
        r;

    const iy =
      cy +
      Math.sin(
        this._qteAngle
      ) *
        r;

    ctx.beginPath();

    ctx.moveTo(cx, cy);

    ctx.lineTo(ix, iy);

    ctx.strokeStyle =
      '#ffffff';

    ctx.lineWidth = 3;

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
      ix,
      iy,
      6,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      '#ffffff';

    ctx.fill();

    ctx.fillStyle =
      'rgba(200,180,255,0.9)';

    ctx.font =
      'bold 13px serif';

    ctx.textAlign =
      'center';

    ctx.fillText(
      'CLICK!',
      cx,
      cy + 5
    );
  }
}
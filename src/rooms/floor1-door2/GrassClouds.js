// ══════════════════════════════════════════════════════════════
//  GRASS CLOUDS  —  cinematic edition
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export class GrassClouds {
  constructor(scene) {
    this.scene   = scene;
    this.objects = [];
    this.clouds  = [];
    this._build();
  }

  // ─── texture builder ───────────────────────────────────────
  // Each cloud gets its own unique procedural texture so no two
  // look alike. puffDefs is an array of puff descriptors that
  // define the silhouette; lighting is added on top.
  _makeTexture(puffDefs) {
    const W = 1024, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // ── 1. Build a soft alpha mask for the whole cloud shape ──
    // We draw into an offscreen canvas, then use it as a mask.
    const mask = document.createElement('canvas');
    mask.width = W; mask.height = H;
    const mctx = mask.getContext('2d');

    puffDefs.forEach(({ cx, cy, rx, ry }) => {
      // Elliptical radial gradient — fades from opaque to fully
      // transparent well inside the canvas boundary.
      const r = Math.max(rx, ry);
      const g = mctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,    'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
      g.addColorStop(0.82, 'rgba(0,0,0,0.30)');
      g.addColorStop(1,    'rgba(0,0,0,0)');
      mctx.save();
      mctx.translate(cx, cy);
      mctx.scale(rx / r, ry / r);
      mctx.translate(-cx, -cy);
      mctx.fillStyle = g;
      mctx.fillRect(0, 0, W, H);
      mctx.restore();
    });

    // ── 2. Paint the cloud colour layers ──────────────────────
    // Use the mask as a clipping shape via destination-in so
    // nothing bleeds outside the soft silhouette.

    // 2a. Underside warm shadow (bottom third)
    const shadowGrad = ctx.createLinearGradient(0, H * 0.45, 0, H);
    shadowGrad.addColorStop(0,   'rgba(210,220,235,0)');
    shadowGrad.addColorStop(0.5, 'rgba(195,208,228,0.55)');
    shadowGrad.addColorStop(1,   'rgba(178,195,220,0.80)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, W, H);

    // 2b. Main body — bright white core
    const bodyGrad = ctx.createRadialGradient(W/2, H*0.28, 0, W/2, H*0.38, W*0.62);
    bodyGrad.addColorStop(0,    'rgba(255,255,255,1)');
    bodyGrad.addColorStop(0.30, 'rgba(253,253,255,0.97)');
    bodyGrad.addColorStop(0.60, 'rgba(248,250,255,0.80)');
    bodyGrad.addColorStop(0.85, 'rgba(240,244,252,0.40)');
    bodyGrad.addColorStop(1,    'rgba(235,240,250,0)');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(0, 0, W, H);

    // 2c. Highlight rim along the top — slightly warm
    const rimGrad = ctx.createLinearGradient(0, 0, 0, H * 0.35);
    rimGrad.addColorStop(0,   'rgba(255,253,248,0.70)');
    rimGrad.addColorStop(1,   'rgba(255,253,248,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, W, H);

    // 2d. Per-puff specular brightspot at each lobe crown
    puffDefs.forEach(({ cx, cy, rx, ry }) => {
      const specY = cy - ry * 0.45;
      const specR = Math.min(rx, ry) * 0.55;
      const sg = ctx.createRadialGradient(cx, specY, 0, cx, specY, specR);
      sg.addColorStop(0,   'rgba(255,255,255,0.55)');
      sg.addColorStop(0.4, 'rgba(255,255,255,0.20)');
      sg.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
    });

    // 2e. Clip everything to the mask shape
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    return new THREE.CanvasTexture(canvas);
  }

  _makeStratusTexture() {
    const W = 1024, H = 256;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Several overlapping wispy ellipses offset horizontally
    const wisps = [
      { cx: W*0.50, cy: H*0.5, rx: W*0.48, ry: H*0.30, op: 0.18 },
      { cx: W*0.35, cy: H*0.5, rx: W*0.32, ry: H*0.22, op: 0.14 },
      { cx: W*0.68, cy: H*0.5, rx: W*0.28, ry: H*0.20, op: 0.13 },
      { cx: W*0.20, cy: H*0.5, rx: W*0.20, ry: H*0.16, op: 0.10 },
      { cx: W*0.82, cy: H*0.5, rx: W*0.18, ry: H*0.14, op: 0.09 },
    ];
    wisps.forEach(({ cx, cy, rx, ry, op }) => {
      const r = Math.max(rx, ry);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,    `rgba(248,250,255,${op})`);
      g.addColorStop(0.55, `rgba(248,250,255,${op * 0.5})`);
      g.addColorStop(1,    'rgba(248,250,255,0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx / r, ry / r);
      ctx.translate(-cx, -cy);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    });
    return new THREE.CanvasTexture(canvas);
  }

  // ─── puff layout presets ───────────────────────────────────
  // Each preset is a different cloud silhouette.
  _puffPresets() {
    // Coords are in 0–1024 x 0–512 space
    return [
      // wide anvil
      [
        { cx:512, cy:280, rx:340, ry:220 },
        { cx:310, cy:310, rx:230, ry:180 },
        { cx:714, cy:305, rx:220, ry:175 },
        { cx:512, cy:175, rx:200, ry:175 },
        { cx:370, cy:200, rx:150, ry:140 },
        { cx:655, cy:195, rx:145, ry:138 },
      ],
      // tall puffy tower
      [
        { cx:512, cy:300, rx:280, ry:210 },
        { cx:512, cy:155, rx:210, ry:190 },
        { cx:380, cy:250, rx:190, ry:170 },
        { cx:644, cy:245, rx:185, ry:165 },
        { cx:512, cy:85,  rx:160, ry:150 },
      ],
      // low and wide — classic cartoon cloud
      [
        { cx:512, cy:320, rx:380, ry:180 },
        { cx:300, cy:290, rx:220, ry:175 },
        { cx:724, cy:288, rx:210, ry:170 },
        { cx:512, cy:220, rx:195, ry:165 },
        { cx:390, cy:240, rx:145, ry:130 },
        { cx:634, cy:238, rx:140, ry:128 },
        { cx:512, cy:160, rx:120, ry:120 },
      ],
      // asymmetric drift
      [
        { cx:480, cy:295, rx:310, ry:200 },
        { cx:680, cy:280, rx:240, ry:185 },
        { cx:290, cy:310, rx:200, ry:165 },
        { cx:560, cy:175, rx:185, ry:165 },
        { cx:730, cy:175, rx:155, ry:140 },
      ],
      // compact fluffy
      [
        { cx:512, cy:290, rx:260, ry:195 },
        { cx:360, cy:300, rx:195, ry:160 },
        { cx:664, cy:298, rx:190, ry:158 },
        { cx:512, cy:175, rx:180, ry:160 },
        { cx:400, cy:200, rx:130, ry:118 },
        { cx:622, cy:198, rx:125, ry:115 },
      ],
    ];
  }

  // ─── build ─────────────────────────────────────────────────
  _build() {
    const presets = this._puffPresets();
    // Build a unique texture for each cumulus cloud
    const cumuTextures = presets.map(p => this._makeTexture(p));
    const stratTex     = this._makeStratusTexture();

    const cloudData = [
      // cumulus — varied sizes, spread around the scene
      { x: -600, y: 620, z: -400, w: 820,  h: 330, type: 'cumulus', ti: 0 },
      { x:  480, y: 700, z: -680, w: 700,  h: 280, type: 'cumulus', ti: 1 },
      { x:  780, y: 590, z:  200, w: 760,  h: 305, type: 'cumulus', ti: 2 },
      { x: -310, y: 750, z:  560, w: 640,  h: 256, type: 'cumulus', ti: 3 },
      { x:  140, y: 670, z: -200, w: 730,  h: 292, type: 'cumulus', ti: 4 },
      { x:  980, y: 630, z: -120, w: 680,  h: 272, type: 'cumulus', ti: 0 },
      { x: -860, y: 655, z:  330, w: 700,  h: 280, type: 'cumulus', ti: 2 },

    ];

    cloudData.forEach(({ x, y, z, w, h, type, ti }, idx) => {
      const tex = type === 'stratus' ? stratTex : cumuTextures[ti % cumuTextures.length];
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false,
        opacity: type === 'stratus' ? 0.72 : 1.0,
        blending: THREE.NormalBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(w, h, 1);
      sprite.position.set(x, y, z);
      sprite.frustumCulled = false;
      this.scene.add(sprite);
      this.objects.push(sprite);
      this.clouds.push({
        sprite, baseY: y,
        driftSpeed: type === 'stratus'
          ? 0.06 + Math.random() * 0.05
          : 0.02 + Math.random() * 0.022,
        bobAmp:   type === 'cumulus' ? 14 : 5,
        bobFreq:  0.04 + Math.random() * 0.035,
        bobPhase: idx * 1.13,
        limit:    type === 'stratus' ? 1900 : 1500,
      });
    });
  }

  // ─── day/night tint ────────────────────────────────────────
  tint(ambT) {
    // Day: pure white. Dusk: peachy warm. Night: deep blue-grey.
    const night = new THREE.Color(0x1a2540);
    const dusk  = new THREE.Color(0xe8b490);
    const day   = new THREE.Color(0xffffff);
    const col = new THREE.Color();
    if (ambT < 0.5) {
      col.lerpColors(night, dusk, ambT * 2);
    } else {
      col.lerpColors(dusk, day, (ambT - 0.5) * 2);
    }
    this.clouds.forEach(c => c.sprite.material.color.copy(col));
  }

  setVisible(v) { this.objects.forEach(o => { o.visible = v; }); }

  update(time) {
    this.clouds.forEach(c => {
      c.sprite.position.x += c.driftSpeed;
      if (c.sprite.position.x > c.limit) c.sprite.position.x = -c.limit;
      c.sprite.position.y = c.baseY + Math.sin(time * c.bobFreq + c.bobPhase) * c.bobAmp;
    });
  }
}
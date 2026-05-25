// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 2 — Lights + Day/Night Cycle
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ── HELPERS ────────────────────────────────────────────────
function lerpColor(a, b, t) {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

function makeSunRaysTexture(size = 2048) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';

  function drawRay(length, halfBaseWidth, colorStops) {
    const grad = ctx.createLinearGradient(0, 0, length, 0);
    colorStops.forEach(([s, c]) => grad.addColorStop(s, c));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -halfBaseWidth);
    ctx.lineTo(length, 0);
    ctx.lineTo(0,  halfBaseWidth);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 24; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((Math.PI * 2 * i) / 24);
    drawRay(size * 0.32, size * 0.016, [
      [0.00, 'rgba(255, 252, 220, 0.58)'],
      [0.18, 'rgba(255, 248, 210, 0.26)'],
      [0.45, 'rgba(255, 238, 185, 0.08)'],
      [0.75, 'rgba(255, 228, 165, 0.02)'],
      [1.00, 'rgba(255, 228, 165, 0.00)'],
    ]);
    ctx.restore();
  }

  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((Math.PI * 2 * i) / 12 + Math.PI / 12);
    drawRay(size * 0.26, size * 0.028, [
      [0.00, 'rgba(255, 245, 200, 0.28)'],
      [0.22, 'rgba(255, 238, 185, 0.10)'],
      [0.55, 'rgba(255, 222, 155, 0.02)'],
      [1.00, 'rgba(255, 222, 155, 0.00)'],
    ]);
    ctx.restore();
  }

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.30);
  glow.addColorStop(0.00, 'rgba(255, 252, 230, 0.95)');
  glow.addColorStop(0.22, 'rgba(255, 242, 200, 0.52)');
  glow.addColorStop(0.48, 'rgba(255, 228, 165, 0.18)');
  glow.addColorStop(0.72, 'rgba(255, 215, 130, 0.05)');
  glow.addColorStop(1.00, 'rgba(255, 215, 130, 0.00)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function makeSunHaloTexture(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);
  const halo = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.50);
  halo.addColorStop(0.00, 'rgba(255, 248, 200, 0.00)');
  halo.addColorStop(0.30, 'rgba(255, 240, 180, 0.18)');
  halo.addColorStop(0.55, 'rgba(255, 225, 140, 0.10)');
  halo.addColorStop(0.78, 'rgba(255, 210, 100, 0.03)');
  halo.addColorStop(1.00, 'rgba(255, 210, 100, 0.00)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function makeMoonGlareTexture(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';

  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.42);
  bloom.addColorStop(0.00, 'rgba(220, 235, 255, 0.80)');
  bloom.addColorStop(0.12, 'rgba(200, 220, 255, 0.40)');
  bloom.addColorStop(0.30, 'rgba(180, 210, 255, 0.14)');
  bloom.addColorStop(0.55, 'rgba(160, 195, 255, 0.04)');
  bloom.addColorStop(1.00, 'rgba(140, 180, 255, 0.00)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, size, size);

  const ring = ctx.createRadialGradient(cx, cy, size * 0.22, cx, cy, size * 0.38);
  ring.addColorStop(0.00, 'rgba(200, 215, 255, 0.00)');
  ring.addColorStop(0.40, 'rgba(210, 230, 255, 0.08)');
  ring.addColorStop(0.65, 'rgba(230, 220, 255, 0.05)');
  ring.addColorStop(1.00, 'rgba(200, 215, 255, 0.00)');
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const streak = ctx.createLinearGradient(0, 0, size * 0.46, 0);
    streak.addColorStop(0.00, 'rgba(230, 240, 255, 0.22)');
    streak.addColorStop(0.12, 'rgba(210, 228, 255, 0.10)');
    streak.addColorStop(0.35, 'rgba(190, 215, 255, 0.03)');
    streak.addColorStop(1.00, 'rgba(190, 215, 255, 0.00)');
    ctx.fillStyle = streak;
    ctx.fillRect(0, -size * 0.010, size * 0.46, size * 0.020);
    ctx.restore();
  }

  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// ── STAR TEXTURE — soft round glowing dot ──────────────────
function makeStarTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0.00, 'rgba(255, 255, 255, 1.00)');
  grad.addColorStop(0.12, 'rgba(240, 248, 255, 1.00)');
  grad.addColorStop(0.30, 'rgba(200, 225, 255, 0.55)');
  grad.addColorStop(0.60, 'rgba(160, 200, 255, 0.12)');
  grad.addColorStop(1.00, 'rgba(120, 170, 255, 0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// Sky colour keyframes  0=midnight  0.25=dawn  0.5=noon  0.75=dusk  1=midnight
const SKY_KEYS = [
  { t: 0.00, top: new THREE.Color(0x020818), bot: new THREE.Color(0x050d2a) },
  { t: 0.20, top: new THREE.Color(0x0a1a3a), bot: new THREE.Color(0x0d2050) },
  { t: 0.25, top: new THREE.Color(0xf4845f), bot: new THREE.Color(0xfcd490) },
  { t: 0.30, top: new THREE.Color(0xc8dff7), bot: new THREE.Color(0xeef6ff) },
  { t: 0.50, top: new THREE.Color(0xb8d4f5), bot: new THREE.Color(0xe8f3ff) },
  { t: 0.70, top: new THREE.Color(0xc8dff7), bot: new THREE.Color(0xeef6ff) },
  { t: 0.75, top: new THREE.Color(0xe8632a), bot: new THREE.Color(0xf9b87a) },
  { t: 0.80, top: new THREE.Color(0x0a1a3a), bot: new THREE.Color(0x0d2050) },
  { t: 1.00, top: new THREE.Color(0x020818), bot: new THREE.Color(0x050d2a) },
];

export function sampleSkyGradient(phase) {
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (phase >= SKY_KEYS[i].t && phase <= SKY_KEYS[i + 1].t) {
      const local = (phase - SKY_KEYS[i].t) / (SKY_KEYS[i + 1].t - SKY_KEYS[i].t);
      return {
        top: lerpColor(SKY_KEYS[i].top, SKY_KEYS[i + 1].top, local),
        bot: lerpColor(SKY_KEYS[i].bot, SKY_KEYS[i + 1].bot, local),
      };
    }
  }
  return { top: SKY_KEYS[0].top, bot: SKY_KEYS[0].bot };
}

export class GrassLights {
  constructor(scene) {
    this.scene   = scene;
    this.objects = [];

    // ── Static scene lights (on/off) ──────────────────────────
    this.ambient    = new THREE.AmbientLight(0xd4eaff, 0);
    this.sunLight   = new THREE.DirectionalLight(0xfff4cc, 0);
    this.skyFill    = new THREE.HemisphereLight(0x88ccff, 0x4a7c2f, 0);
    this.rimLight   = new THREE.PointLight(0x90ff70, 0, 800);
    this.warmAccent = new THREE.PointLight(0xffcc66, 0, 600);

    this.sunLight.position.set(300, 500, 200);
    this.sunLight.target.position.set(0, 0, 0);
    this.rimLight.position.set(-200, 150, -200);
    this.warmAccent.position.set(250, 80, 100);

    this.scene.add(this.ambient);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
    this.scene.add(this.skyFill);
    this.scene.add(this.rimLight);
    this.scene.add(this.warmAccent);

    this.objects.push(this.ambient, this.sunLight, this.skyFill, this.rimLight, this.warmAccent);

    // ── Day/night dynamic lights ──────────────────────────────
    this._ambLight  = new THREE.AmbientLight(0xffffff, 0.4);
    this._dirSun    = new THREE.DirectionalLight(0xfff5e0, 0);
    this._dirMoon   = new THREE.DirectionalLight(0x8899cc, 0);

    this._dirSun.position.set(0, 1, 0);
    this._dirMoon.position.set(0, 1, 0);

    this.scene.add(this._ambLight);
    this.scene.add(this._dirSun);
    this.scene.add(this._dirMoon);

    this.objects.push(this._ambLight, this._dirSun, this._dirMoon);

    // ── Sun disc + point light ────────────────────────────────
    const sunGeo = new THREE.CircleGeometry(90, 64);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfffde8, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this._sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this._sunMesh.frustumCulled = false;
    this.scene.add(this._sunMesh);
    this.objects.push(this._sunMesh);

    this._sunPoint = new THREE.PointLight(0xfff5e0, 0, 12000, 0.4);
    this._sunPoint.decay = 1.2;
    this._sunMesh.add(this._sunPoint);

    // ── Sun rays mesh ─────────────────────────────────────────
    const sunRaysTex = makeSunRaysTexture(2048);
    const sunRaysMaterial = new THREE.MeshBasicMaterial({
      map: sunRaysTex,
      color: 0xfff5e0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.90,
      side: THREE.DoubleSide,
    });
    this._sunRaysSprite = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200), sunRaysMaterial);
    this._sunMesh.add(this._sunRaysSprite);
    this.objects.push(this._sunRaysSprite);

    // ── Sun outer halo mesh ───────────────────────────────────
    const sunHaloTex = makeSunHaloTexture(1024);
    const sunHaloMat = new THREE.MeshBasicMaterial({
      map: sunHaloTex,
      color: 0xffe8a0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.60,
      side: THREE.DoubleSide,
    });
    this._sunHaloSprite = new THREE.Mesh(new THREE.PlaneGeometry(5500, 5500), sunHaloMat);
    this._sunMesh.add(this._sunHaloSprite);
    this.objects.push(this._sunHaloSprite);

    // ── Moon disc ─────────────────────────────────────────────
    const moonGeo = new THREE.CircleGeometry(60, 64);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xdde8ff, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this._moonMesh.frustumCulled = false;
    this.scene.add(this._moonMesh);
    this.objects.push(this._moonMesh);

    this._moonPoint = new THREE.PointLight(0xdde8ff, 0, 9000, 0.5);
    this._moonPoint.decay = 1.0;
    this._moonMesh.add(this._moonPoint);
    this.objects.push(this._moonPoint);

    // ── Moon glare mesh ───────────────────────────────────────
    const moonGlareTex = makeMoonGlareTexture(1024);
    const moonGlareMat = new THREE.MeshBasicMaterial({
      map: moonGlareTex,
      color: 0xc8dcff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    this._moonGlareSprite = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), moonGlareMat);
    this._moonMesh.add(this._moonGlareSprite);
    this.objects.push(this._moonGlareSprite);

    // ── Moon outer halo mesh ──────────────────────────────────
    const moonHaloTex = makeSunHaloTexture(512);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      map: moonHaloTex,
      color: 0x9ab8ff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    this._moonHaloSprite = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200), moonHaloMat);
    this._moonMesh.add(this._moonHaloSprite);
    this.objects.push(this._moonHaloSprite);

    // ── Stars ─────────────────────────────────────────────────
    this._stars = this._createStars();
    this.objects.push(this._stars);
  }

  // ── STARS ─────────────────────────────────────────────────
  // Placed on the upper hemisphere of the sky sphere so they
  // sit behind everything and never appear below the horizon.
  _createStars() {
    const STAR_COUNT = 800;
    const SKY_R      = 3800; // just inside the sky sphere (r=4000)

    const positions = new Float32Array(STAR_COUNT * 3);
    const colors    = new Float32Array(STAR_COUNT * 3);
    const sizes     = new Float32Array(STAR_COUNT);

    // Subtle colour palette: mostly white-blue, occasional warm tints
    const STAR_COLORS = [
      new THREE.Color(1.00, 1.00, 1.00), // white
      new THREE.Color(0.85, 0.92, 1.00), // blue-white
      new THREE.Color(0.95, 0.95, 1.00), // pale blue
      new THREE.Color(1.00, 0.95, 0.85), // warm white
      new THREE.Color(0.90, 0.85, 1.00), // lavender
      new THREE.Color(1.00, 0.88, 0.75), // faint amber
    ];

    for (let i = 0; i < STAR_COUNT; i++) {
      // Spherical coords — only upper hemisphere (y > 0) + a small band below
      // horizon so the sky sphere edge looks populated
      const theta = Math.random() * Math.PI * 2;          // azimuth
      const phi   = Math.acos(Math.random() * 1.15 - 0.15); // polar: biased upward

      positions[i * 3 + 0] = SKY_R * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = SKY_R * Math.cos(phi);
      positions[i * 3 + 2] = SKY_R * Math.sin(phi) * Math.sin(theta);

      const col = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
      colors[i * 3 + 0] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      // Not used for rendering (PointsMaterial ignores the attribute),
      // kept for potential custom shader upgrade later
      sizes[i] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const mat = new THREE.PointsMaterial({
      map:             makeStarTexture(64),
      vertexColors:    true,
      sizeAttenuation: false,  // screen-space pixels — won't shrink with distance
      size:            7.0,    // pixels; much brighter/larger dots
      transparent:     true,
      depthWrite:      false,
      blending:        THREE.AdditiveBlending,
      opacity:         0,      // driven by update()
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.scene.add(points);
    return points;
  }

  // ── on / off (called by RoomSystem) ──────────────────────
  on() {
    this.ambient.intensity    = 1.2;
    this.sunLight.intensity   = 8.0;
    this.skyFill.intensity    = 1.5;
    this.rimLight.intensity   = 20;
    this.warmAccent.intensity = 15;
  }

  off() {
    this.ambient.intensity    = 0;
    this.sunLight.intensity   = 0;
    this.skyFill.intensity    = 0;
    this.rimLight.intensity   = 0;
    this.warmAccent.intensity = 0;
    this._ambLight.intensity  = 0;
    this._dirSun.intensity    = 0;
    this._dirMoon.intensity   = 0;
    this._sunPoint.intensity  = 0;
    this._sunMesh.visible     = false;
    this._moonMesh.visible    = false;
    if (this._stars) this._stars.visible = false;
  }

  update(cycle, scene) {
    const p = cycle;
    const { top, bot } = sampleSkyGradient(p);

    // Fog + background
    if (scene.fog)        scene.fog.color.copy(lerpColor(bot, top, 0.15));
    if (scene.background) scene.background.copy(bot);

    // Sun arc
    const sunAngle = (p - 0.25) * Math.PI * 2;
    const sunR     = 3200;
    this._sunMesh.position.set(
      Math.cos(sunAngle) * sunR * 0.8,
      Math.sin(sunAngle) * sunR,
      -sunR * 0.3
    );
    const sunVis = Math.max(0, Math.min(1, Math.sin((p - 0.2) / 0.6 * Math.PI)));
    this._sunMesh.material.opacity = sunVis;
    this._sunMesh.visible = true;
    this._sunMesh.lookAt(0, 0, 0);

    if (this._sunRaysSprite) {
      this._sunRaysSprite.material.opacity = sunVis * 0.92;
      this._sunRaysSprite.visible = sunVis > 0.02;
    }
    if (this._sunHaloSprite) {
      const goldenPeak = Math.max(0, 1 - Math.abs(p - 0.5) * 5.5);
      this._sunHaloSprite.material.opacity = sunVis * (0.35 + goldenPeak * 0.45);
      this._sunHaloSprite.visible = sunVis > 0.02;
      const haloColor = lerpColor(new THREE.Color(0xffe8a0), new THREE.Color(0xff9944), goldenPeak);
      this._sunHaloSprite.material.color.copy(haloColor);
    }

    this._dirSun.position.copy(this._sunMesh.position).normalize();
    this._dirSun.intensity = sunVis * 6.0;

    const goldenHour = 1 - Math.abs(p - 0.5) * 4;
    const sunColor   = lerpColor(new THREE.Color(0xfff5e0), new THREE.Color(0xff8833), Math.max(0, goldenHour));
    this._dirSun.color.copy(sunColor);
    this._sunPoint.color.copy(sunColor);
    this._sunPoint.intensity = sunVis * 18.0;

    // Moon arc
    const moonAngle = sunAngle + Math.PI;
    this._moonMesh.position.set(
      Math.cos(moonAngle) * sunR * 0.8,
      Math.sin(moonAngle) * sunR,
      -sunR * 0.3
    );
    const moonVis = Math.max(0, Math.min(1, Math.sin(moonAngle) * 1.4));
    this._moonMesh.material.opacity = moonVis * 0.85;
    this._moonMesh.visible = true;
    this._moonMesh.lookAt(0, 0, 0);

    if (this._moonGlareSprite) {
      this._moonGlareSprite.material.opacity = moonVis * 0.78;
      this._moonGlareSprite.visible = moonVis > 0.02;
    }
    if (this._moonHaloSprite) {
      this._moonHaloSprite.material.opacity = moonVis * 0.22;
      this._moonHaloSprite.visible = moonVis > 0.05;
    }

    this._dirMoon.position.copy(this._moonMesh.position).normalize();
    this._dirMoon.intensity = moonVis * 0.8;
    this._moonPoint.intensity = moonVis * 2.4;
    this._moonPoint.visible = moonVis > 0.02;

    // ── Stars visibility ──────────────────────────────────────
    if (this._stars) {
      const nightT    = 1 - sunVis;
      const starBase  = Math.pow(nightT, 1.2);              // ease in — visible earlier after sunset
      const twinkle   = 1 + 0.08 * Math.sin(Date.now() * 0.0014);
      this._stars.material.opacity = Math.min(1, starBase * twinkle);
      this._stars.visible = starBase > 0.01;
    }

    // Ambient
    const ambT = Math.max(0, Math.sin(p * Math.PI * 2 - Math.PI * 0.5) * 0.5 + 0.5);
    this._ambLight.color.copy(lerpColor(new THREE.Color(0x0a1535), new THREE.Color(0xfff8e8), ambT));
    this._ambLight.intensity = 0.20 + ambT * 0.85;

    return { top, bot, ambT };
  }
}
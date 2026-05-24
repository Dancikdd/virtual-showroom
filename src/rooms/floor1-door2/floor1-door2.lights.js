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

// Sky colour keyframes  0=midnight  0.25=dawn  0.5=noon  0.75=dusk  1=midnight
const SKY_KEYS = [
  { t: 0.00, top: new THREE.Color(0x020818), bot: new THREE.Color(0x050d2a) },
  { t: 0.20, top: new THREE.Color(0x0a1a3a), bot: new THREE.Color(0x0d2050) },
  { t: 0.25, top: new THREE.Color(0xf4845f), bot: new THREE.Color(0xfcd490) },
  { t: 0.30, top: new THREE.Color(0x6eaadc), bot: new THREE.Color(0xc9e8f8) },
  { t: 0.50, top: new THREE.Color(0x3a8ecf), bot: new THREE.Color(0x87ceeb) },
  { t: 0.70, top: new THREE.Color(0x6eaadc), bot: new THREE.Color(0xc9e8f8) },
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

    this._sunPoint = new THREE.PointLight(0xfff5e0, 0, 8000, 0.5);
    this._sunMesh.add(this._sunPoint);

    // ── Moon disc ─────────────────────────────────────────────
    const moonGeo = new THREE.CircleGeometry(60, 64);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xdde8ff, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this._moonMesh.frustumCulled = false;
    this.scene.add(this._moonMesh);
    this.objects.push(this._moonMesh);
  }

  // ── on / off (called by RoomSystem) ──────────────────────
  on() {
    this.ambient.intensity    = 1.2;
    this.sunLight.intensity   = 4.0;
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
    const sunVis   = Math.max(0, Math.min(1, Math.sin((p - 0.2) / 0.6 * Math.PI)));
    this._sunMesh.material.opacity = sunVis;
    this._sunMesh.visible = true;
    this._sunMesh.lookAt(0, 0, 0);
    this._dirSun.position.copy(this._sunMesh.position).normalize();
    this._dirSun.intensity = sunVis * 3.0;

    const goldenHour = 1 - Math.abs(p - 0.5) * 4;
    const sunColor   = lerpColor(new THREE.Color(0xfff5e0), new THREE.Color(0xff8833), Math.max(0, goldenHour));
    this._dirSun.color.copy(sunColor);
    this._sunPoint.color.copy(sunColor);
    this._sunPoint.intensity = sunVis * 4.0;

    // Moon arc
    const moonAngle = sunAngle + Math.PI;
    this._moonMesh.position.set(
      Math.cos(moonAngle) * sunR * 0.8,
      Math.sin(moonAngle) * sunR,
      -sunR * 0.3
    );
    const moonVis = Math.max(0, Math.min(1, Math.sin((p + 0.3) / 0.6 * Math.PI + Math.PI)));
    this._moonMesh.material.opacity = moonVis * 0.85;
    this._moonMesh.visible = true;
    this._moonMesh.lookAt(0, 0, 0);
    this._dirMoon.position.copy(this._moonMesh.position).normalize();
    this._dirMoon.intensity = moonVis * 0.4;

    // Ambient
    const ambT = Math.max(0, Math.sin(p * Math.PI * 2 - Math.PI * 0.5) * 0.5 + 0.5);
    this._ambLight.color.copy(lerpColor(new THREE.Color(0x0a1535), new THREE.Color(0xfff8e8), ambT));
    this._ambLight.intensity = 0.15 + ambT * 0.85;

    return { top, bot, ambT };
  }
}
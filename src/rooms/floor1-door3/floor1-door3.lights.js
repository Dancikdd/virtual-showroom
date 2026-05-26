// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 3 — Ocean Lights
//  Deep underwater lighting with caustics shimmer,
//  god-ray fill, bioluminescent accent, and a slow
//  depth-driven ambient cycle (shallow → abyss).
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ── CAUSTICS TEXTURE ─────────────────────────────────────────
// Baked interference pattern that scrolls over time to simulate
// light refracting through the surface above.
export function makeCausticsTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  function h(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function fbm(x, y, oct = 4) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) {
      v += a * (Math.sin(x * f * 0.8) * Math.cos(y * f * 0.8) * 0.5 + 0.5);
      f *= 2.1; a *= 0.48;
    }
    return v;
  }

  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * 6;
      const v = y / size * 6;
      const val = Math.pow(fbm(u, v), 1.4);
      const bright = Math.round(val * 255);
      const i = (y * size + x) * 4;
      d[i] = bright; d[i+1] = bright; d[i+2] = bright; d[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  return tex;
}

export class OceanLights {
  constructor(scene) {
    this.scene   = scene;
    this.objects = [];

    // ── Ambient — deep blue-green base ────────────────────────
    this.ambient = new THREE.AmbientLight(0x001a2e, 0);
    scene.add(this.ambient);
    this.objects.push(this.ambient);

    // ── Sun shaft — single directional from above ─────────────
    this.sunShaft = new THREE.DirectionalLight(0x40c8ff, 0);
    this.sunShaft.position.set(0.3, 1, 0.2);
    scene.add(this.sunShaft);
    scene.add(this.sunShaft.target);
    this.objects.push(this.sunShaft);

    // ── Caustic shimmer — point that moves slightly ───────────
    this.causticLight = new THREE.PointLight(0x00e5ff, 0, 1800, 1.2);
    this.causticLight.position.set(0, 900, 0);
    scene.add(this.causticLight);
    this.objects.push(this.causticLight);

    // ── Bioluminescence — soft teal glow from below ───────────
    this.bioLight = new THREE.PointLight(0x00ffcc, 0, 2200, 1.4);
    this.bioLight.position.set(0, -400, 0);
    scene.add(this.bioLight);
    this.objects.push(this.bioLight);

    // ── Rim / fill from the side (gives volume to the whale) ──
    this.rimLight = new THREE.DirectionalLight(0x0088cc, 0);
    this.rimLight.position.set(-1, 0.2, 0.5);
    scene.add(this.rimLight);
    scene.add(this.rimLight.target);
    this.objects.push(this.rimLight);

    // ── Warm accent (very faint — simulates distant surface) ──
    this.warmAccent = new THREE.HemisphereLight(0x004466, 0x000d1a, 0);
    scene.add(this.warmAccent);
    this.objects.push(this.warmAccent);
  }

  on() {
    this.ambient.intensity      = 2.2;

    this.sunShaft.intensity     = 6.5;
    this.sunShaft.color.set(0x7fe7ff);

    this.causticLight.intensity = 7.0;
    this.causticLight.color.set(0x66f2ff);

    this.bioLight.intensity     = 3.0;

    this.rimLight.intensity     = 3.5;

    this.warmAccent.intensity   = 1.4;
  }

  off() {
    this.ambient.intensity      = 0;
    this.sunShaft.intensity     = 0;
    this.causticLight.intensity = 0;
    this.bioLight.intensity     = 0;
    this.rimLight.intensity     = 0;
    this.warmAccent.intensity   = 0;
  }

  // Called every frame from OceanEnvironment.update()
  update(time) {
    // Caustic shimmer — small random offsets
    const cx = Math.sin(time * 0.11) * 180 + Math.sin(time * 0.27) * 80;
    const cz = Math.cos(time * 0.13) * 180 + Math.cos(time * 0.19) * 60;
    this.causticLight.position.set(cx, 900, cz);
        this.causticLight.intensity =
        6.5 +
        Math.sin(time * 1.7) * 1.2 +
        Math.sin(time * 3.1) * 0.6;

        this.bioLight.intensity =
        2.6 + Math.sin(time * 0.6 + 1.2) * 0.9;

        this.sunShaft.intensity =
        6.0 + Math.sin(time * 0.22) * 0.8;
    }
}
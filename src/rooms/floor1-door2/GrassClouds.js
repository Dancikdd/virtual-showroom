// ══════════════════════════════════════════════════════════════
//  GRASS CLOUDS  —  3D volumetric puff clusters
//  Puffs use a baked noise texture (not a sphere SDF) so they
//  look lumpy and organic, never round.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ── BAKE PUFF TEXTURE ─────────────────────────────────────────
// Returns a CanvasTexture: greyscale, alpha = cloud density.
// Each texture is unique (seed) so no two puffs look identical.
function bakePuffTex(seed = 0, W = 64, H = 64) {
  // simple deterministic noise
  function h(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453;
    return s - Math.floor(s);
  }
  function valueNoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
    return (h(xi,yi)*(1-u) + h(xi+1,yi)*u)*(1-v)
         + (h(xi,yi+1)*(1-u) + h(xi+1,yi+1)*u)*v;
  }
  function fbm(x, y, oct) {
    let val=0, amp=0.5, f=1;
    for (let i=0;i<oct;i++){val+=amp*valueNoise(x*f,y*f);f*=2;amp*=0.5;}
    return val;
  }

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d   = img.data;

  // Ellipse aspect ratio — randomised per seed so puffs aren't all round
  const ax = 0.38 + h(seed, 1) * 0.22;   // x half-extent in UV [0.38..0.60]
  const ay = 0.30 + h(seed, 2) * 0.18;   // y half-extent
  const cx = 0.5 + (h(seed, 3) - 0.5) * 0.06;
  const cy = 0.5 + (h(seed, 4) - 0.5) * 0.06;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;

      // Normalised ellipse distance [0..1], 0=centre
      const dx = (u - cx) / ax;
      const dy = (v - cy) / ay;
      const ed = Math.sqrt(dx*dx + dy*dy);   // 1.0 = ellipse edge

      // Warp the edge with fbm noise for lumpiness
      const warpScale = 3.5;
      const warp = fbm(u * warpScale + seed*0.37, v * warpScale + seed*0.51, 4) - 0.5;
      const warpAmt = 0.30 + h(seed*2, 7) * 0.18;  // how lumpy
      const warped = ed + warp * warpAmt;

      // Soft density: 1 inside, 0 outside, smooth falloff
      const density = Math.max(0, 1 - Math.pow(Math.max(0, warped), 1.4));
      const bright  = Math.round(density * 255);

      const i = (y * W + x) * 4;
      d[i] = d[i+1] = d[i+2] = 255;   // white
      d[i+3] = bright;                 // alpha = density
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Pre-bake a pool of textures (reused across clouds)
const TEX_POOL_SIZE = 16;
let _texPool = null;
function getTexPool() {
  if (!_texPool) _texPool = Array.from({length: TEX_POOL_SIZE}, (_, i) => bakePuffTex(i * 3.7 + 1));
  return _texPool;
}

// ── SHADERS ───────────────────────────────────────────────────
// Each puff is a billboard quad textured with its noise shape.
// We use ONE ShaderMaterial per cloud but store the tex index
// as an instance attribute so each puff picks a different texture.
// (WebGL 1 doesn't allow dynamic texture array indexing easily,
// so we pick ONE texture per *cloud* draw call — each cloud mesh
// is split into groups of same-texture puffs, or we just assign
// one tex per Cloud3D instance. Simplest: each Cloud3D picks one
// tex from the pool but uses a different seed per puff via uv offset.)

const VERT = /* glsl */`
attribute vec3  instOffset;
attribute float instRadius;
attribute float instTexOff;   // UV x-offset into the atlas (0..1 step)

uniform vec3  uCamPos;
uniform float uTime;
uniform float uPhase;
uniform float uBreath;

varying vec2  vUv;
varying vec3  vWorld;
varying vec3  vCenter;
varying float vRadius;
varying float vTexOff;

void main() {
  vRadius  = instRadius;
  vCenter  = instOffset;
  vTexOff  = instTexOff;

  float breath = 1.0 + sin(uTime * 0.00033 + uPhase) * uBreath;
  float r = instRadius * breath * 1.08;

  vec3 toCam = normalize(uCamPos - instOffset);
  vec3 right  = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 up     = cross(toCam, right);

  vec3 worldPos = instOffset + right * position.x * r + up * position.y * r;

  vUv   = uv;                 // [0..1] across the quad
  vWorld = worldPos;
  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
`;

const FRAG = /* glsl */`
uniform sampler2D uTex;       // noise texture atlas (16 cols × 1 row)
uniform float     uAtlasCols; // = 16.0
uniform vec3  uCamPos;
uniform vec3  uTint;
uniform float uOpacity;
uniform float uHazeStart;
uniform float uHazeEnd;

varying vec2  vUv;
varying vec3  vWorld;
varying vec3  vCenter;
varying float vRadius;
varying float vTexOff;

void main() {
  // Sample the puff's column in the atlas
  float col  = vTexOff;                              // 0..1 (normalised column)
  float wide = 1.0 / uAtlasCols;
  vec2  uv   = vec2(col + vUv.x * wide, vUv.y);
  float density = texture2D(uTex, uv).a;

  // Each puff contributes a small fraction — they ADD UP in the core
  float alpha = density * density * 0.38;            // pow≈2, max 0.38
  if (alpha < 0.003) discard;

  // Vertical shading based on quad UV (top = bright, bottom = shadow)
  float ht  = vUv.y;   // 0=bottom, 1=top
  vec3  clr = mix(vec3(0.84, 0.87, 0.93), vec3(1.0, 1.0, 1.0),
                  smoothstep(0.2, 0.9, ht)) * uTint;

  float dist = length(vCenter - uCamPos);
  float haze = 1.0 - smoothstep(uHazeStart, uHazeEnd, dist);

  gl_FragColor = vec4(clr, alpha * uOpacity * haze);
}
`;

// ── HELPERS ───────────────────────────────────────────────────
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ── PUFF LAYOUT ───────────────────────────────────────────────
function buildPuffLayout(seed) {
  const rng = (s) => hash(seed + s * 7.31, seed * 3.17 + s);
  const puffs = [];

  const CORE = [
    [  0.00,  0.00,  0.00, 1.00 ],
    [ -0.55,  0.10,  0.15, 0.85 ],
    [  0.55,  0.08, -0.12, 0.83 ],
    [  0.00,  0.45,  0.04, 0.75 ],
    [ -0.28,  0.42, -0.18, 0.65 ],
    [  0.30,  0.40,  0.22, 0.63 ],
    [  0.95, -0.05, -0.08, 0.72 ],
    [ -0.95, -0.04,  0.08, 0.70 ],
    [  0.00, -0.22,  0.00, 0.88 ],
    [  0.45,  0.65, -0.05, 0.55 ],
    [ -0.40,  0.68,  0.10, 0.53 ],
    [  0.00,  0.80,  0.00, 0.48 ],
  ];

  CORE.forEach(([x, y, z, r], ci) => {
    puffs.push({
      x: x + (rng(ci*4)   - 0.5) * 0.12,
      y: y + (rng(ci*4+1) - 0.5) * 0.12,
      z: z + (rng(ci*4+2) - 0.5) * 0.20,
      r: r * (0.90 + rng(ci*4+3) * 0.20),
      t: Math.floor(rng(ci*4+4) * TEX_POOL_SIZE),  // texture index
    });
  });

  for (let i = 0; i < 22; i++) {
    const base = CORE[Math.floor(rng(i*5) * CORE.length)];
    const a  = rng(i*3.7) * Math.PI * 2;
    const el = (rng(i*2.3) - 0.5) * Math.PI * 0.5;
    const d  = 0.38 + rng(i*1.1) * 0.42;
    puffs.push({
      x: base[0] + Math.cos(el) * Math.cos(a) * d,
      y: base[1] + Math.sin(el) * d * 0.65 + 0.08,
      z: base[2] + Math.cos(el) * Math.sin(a) * d * 0.70,
      r: base[3] * (0.18 + rng(i*4.9) * 0.22),
      t: Math.floor(rng(i*7+3) * TEX_POOL_SIZE),
    });
  }

  return puffs;
}

// ── BUILD ATLAS ───────────────────────────────────────────────
// Pack all puff textures side-by-side into one wide canvas.
function buildAtlas(pool) {
  const N = pool.length;
  const W = 64, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width  = W * N;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  pool.forEach((tex, i) => ctx.drawImage(tex.image, i * W, 0));
  const atlas = new THREE.CanvasTexture(canvas);
  atlas.needsUpdate = true;
  return atlas;
}

// ── CLOUD ENTITY ──────────────────────────────────────────────
class Cloud3D {
  constructor(scene, puffLayout, cloudPos, sizeScale, seed, atlas) {
    this.scene  = scene;
    this.baseY  = cloudPos.y;
    this.limit  = 2800;

    this.windSpd  = 0.08 + hash(seed,        seed+1) * 0.12;
    this.windFreq = 0.00005 + hash(seed+2,   seed+3) * 0.00005;
    this.windPh   = hash(seed+4, seed+5) * 1000;
    this.bobAmp   = 8  + hash(seed+6,  seed+7) * 10;
    this.bobFreq  = 0.00020 + hash(seed+8,   seed+9) * 0.00018;
    this.bobPh    = seed * 1.37;

    const N       = puffLayout.length;
    const offsets = new Float32Array(N * 3);
    const radii   = new Float32Array(N);
    const texOffs = new Float32Array(N);

    puffLayout.forEach((p, i) => {
      offsets[i*3]     = cloudPos.x + p.x * sizeScale;
      offsets[i*3 + 1] = cloudPos.y + p.y * sizeScale * 0.72;
      offsets[i*3 + 2] = cloudPos.z + p.z * sizeScale * 0.60;
      radii[i]         = p.r * sizeScale * 0.82;
      texOffs[i]       = (p.t % TEX_POOL_SIZE) / TEX_POOL_SIZE;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0]), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(
      new Float32Array([0,0, 1,0, 1,1, 0,1]), 2));
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2, 0,2,3]), 1));

    const oAttr = new THREE.InstancedBufferAttribute(offsets, 3);
    const rAttr = new THREE.InstancedBufferAttribute(radii,   1);
    const tAttr = new THREE.InstancedBufferAttribute(texOffs, 1);
    oAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('instOffset', oAttr);
    geo.setAttribute('instRadius', rAttr);
    geo.setAttribute('instTexOff', tAttr);
    geo.instanceCount = N;

    this._offsets = offsets;
    this._oAttr   = oAttr;
    this._N       = N;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTex:       { value: atlas },
        uAtlasCols: { value: TEX_POOL_SIZE },
        uCamPos:    { value: new THREE.Vector3() },
        uTint:      { value: new THREE.Color(1,1,1) },
        uOpacity:   { value: 1.0 },
        uHazeStart: { value: 1800 },
        uHazeEnd:   { value: 5000 },
        uTime:      { value: 0 },
        uPhase:     { value: hash(seed+10, seed+11) * Math.PI * 2 },
        uBreath:    { value: 0.008 + hash(seed+12, seed+13) * 0.010 },
      },
      vertexShader:   VERT,
      fragmentShader: FRAG,
      transparent:    true,
      depthWrite:     false,
      side:           THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    this.mesh = mesh;
    this.mat  = mat;
  }

  setTint(col)  { this.mat.uniforms.uTint.value.copy(col); }
  setVisible(v) { this.mesh.visible = v; }

  update(time, camera) {
    const u = this.mat.uniforms;
    u.uCamPos.value.copy(camera.position);
    u.uTime.value = time;

    const w     = this.windSpd + Math.sin(time * this.windFreq + this.windPh) * 0.04;
    const bob   = Math.sin(time * this.bobFreq + this.bobPh) * this.bobAmp;
    const currY = this.baseY + bob;
    const dy    = currY - (this._lastY !== undefined ? this._lastY : currY);
    this._lastY = currY;

    const off = this._offsets;
    for (let i = 0; i < this._N; i++) {
      off[i*3]     += w;
      off[i*3 + 1] += dy;
      if (off[i*3] >  this.limit) off[i*3] -= this.limit * 2;
      if (off[i*3] < -this.limit) off[i*3] += this.limit * 2;
    }
    this._oAttr.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.scene.remove(this.mesh);
  }
}

// ── PUBLIC API ────────────────────────────────────────────────
export class GrassClouds {
  constructor(scene, camera) {
    this.scene   = scene;
    this.camera  = camera || null;
    this.clouds  = [];
    this._tint   = new THREE.Color(1,1,1);
    this._sunDir = new THREE.Vector3(0.45, 0.85, 0.25).normalize();

    // Build texture atlas once
    this._atlas = buildAtlas(getTexPool());
    this._build();
  }

  setCamera(camera) { this.camera = camera; }
  setSunDir(dir)    { this._sunDir.copy(dir).normalize(); }

  _build() {
    const templates = [0,1,2,3,4,5].map(s => buildPuffLayout(s * 53.7));
    const sizeOpts  = [320, 360, 400, 440, 480, 520];
    const gSpX = 1100, gSpZ = 1200;
    const gRX  = 2200, gRZ  = 2400;

    let seed = 0;
    for (let gx = -gRX; gx <= gRX; gx += gSpX) {
      for (let gz = -gRZ; gz <= gRZ; gz += gSpZ) {
        const jx  = (hash(seed, seed+1) - 0.5) * 340;
        const jz  = (hash(seed+2, seed+3) - 0.5) * 340;
        const y   = 940 + hash(seed+4, seed+5) * 180;
        const sz  = sizeOpts[Math.floor(hash(seed+6, seed+7) * sizeOpts.length)];
        const tpl = templates[Math.floor(hash(seed+8, seed+9) * templates.length)];
        this.clouds.push(new Cloud3D(this.scene, tpl,
          new THREE.Vector3(gx+jx, y, gz+jz), sz, seed, this._atlas));
        seed++;
      }
    }
  }

  tint(ambT) {
    const night = new THREE.Color(0x6070a0);
    const dusk  = new THREE.Color(0xffd0a0);
    const day   = new THREE.Color(0xffffff);
    if (ambT < 0.5) this._tint.lerpColors(night, dusk, ambT * 2);
    else            this._tint.lerpColors(dusk,  day,  (ambT - 0.5) * 2);
    this.clouds.forEach(c => c.setTint(this._tint));
  }

  setVisible(v) { this.clouds.forEach(c => c.setVisible(v)); }

  update(time, camera) {
    const cam = camera || this.camera;
    if (!cam) return;
    this.clouds.forEach(c => c.update(time, cam));
  }

  dispose() {
    this.clouds.forEach(c => c.dispose());
    this._atlas.dispose();
    this.clouds = [];
  }
}
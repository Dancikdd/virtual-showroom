import * as THREE from 'three';
import { OceanLights, makeCausticsTexture } from './floor1-door3.lights.js';

// ── Whale ─────────────────────────────────────────────────────
const WHALE_ORBIT_Y = 80;

// ── Bubble streams ────────────────────────────────────────────
const BUBBLE_COUNT = 280;

// ── God rays ──────────────────────────────────────────────────
const RAY_COUNT = 9;

export class OceanEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this._isVisible = false;
    this._time = 0;

    this._whale = null;
    this._whaleDummy = new THREE.Object3D();

    this._createVolumeFog();
    this._createSeabed();
    this._createGodRays();
    this._createCausticsMesh();
    this._createBubbles();
    this._createDarkVignette();

    this._lights = null;

    this.setVisible(false);
  }

  setLights(lights) {
    this._lights = lights;
  }

  setWhale(object) {
    this._whale = object;

    if (object) {
      object.position.set(0, WHALE_ORBIT_Y, 0);
      console.log('[Ocean] Whale attached, scale:', object.scale.x, 'pos:', object.position);
    }
  }

  // ── WATER VOLUME ────────────────────────────────────────────
  _createVolumeFog() {
    // Sferă mai mare — colțurile dispar în fog
    const geo = new THREE.SphereGeometry(12000, 32, 16);

    const count = geo.attributes.position.count;
    const cols = new Float32Array(count * 3);
    const posArr = geo.attributes.position.array;

    const deep    = new THREE.Color(0x000000);
    const mid     = new THREE.Color(0x000810);
    const surface = new THREE.Color(0x000d1a);

    for (let i = 0; i < count; i++) {
      const y = posArr[i * 3 + 1];
      const t = Math.max(0, Math.min(1, (y + 12000) / 24000));

      const c = t < 0.5
        ? deep.clone().lerp(mid, t * 2)
        : mid.clone().lerp(surface, (t - 0.5) * 2);

      cols[i * 3]     = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

    this._skyMesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
      })
    );

    this._skyMesh.frustumCulled = false;
    this.scene.add(this._skyMesh);
    this.objects.push(this._skyMesh);
  }

  // ── DARK VIGNETTE SHELLS ─────────────────────────────────────
  // Sfere concentrice negre semi-transparente — întunecă marginile
  _createDarkVignette() {
    const radii   = [900, 1400, 2200, 3500];
    const opacity = [0.55, 0.45, 0.35, 0.25];

    radii.forEach((r, i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 24, 12),
        new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: opacity[i],
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.NormalBlending,
        })
      );
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.objects.push(mesh);
    });
  }

  // ── SEABED ──────────────────────────────────────────────────
  _createSeabed() {
    const geo = new THREE.PlaneGeometry(5000, 5000, 140, 140);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);

      const noise =
        Math.sin(x * 0.015) * Math.cos(z * 0.013) * 6 +
        Math.sin(x * 0.04 + 2.0) * Math.sin(z * 0.035) * 3 +
        (Math.random() - 0.5) * 1.5;

      pos.setZ(i, noise);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const seabed = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0xc2b280,
        roughness: 1.0,
        metalness: 0.0,
      })
    );

    seabed.rotation.x = -Math.PI / 2;
    seabed.position.y = -520;
    seabed.receiveShadow = true;

    this.scene.add(seabed);
    this.objects.push(seabed);
    this._seabed = seabed;

    this._causticsOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(4800, 4800),
      new THREE.MeshBasicMaterial({
        map: makeCausticsTexture(256),
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );

    this._causticsOverlay.rotation.x = -Math.PI / 2;
    this._causticsOverlay.position.y = -500;

    this.scene.add(this._causticsOverlay);
    this.objects.push(this._causticsOverlay);
  }

  // ── CAUSTICS CEILING ────────────────────────────────────────
  _createCausticsMesh() {
    this._causticsCeiling = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.MeshBasicMaterial({
        map: makeCausticsTexture(128),
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );

    this._causticsCeiling.rotation.x = -Math.PI / 2;
    this._causticsCeiling.position.y = 800;

    this.scene.add(this._causticsCeiling);
    this.objects.push(this._causticsCeiling);
  }

  // ── GOD RAYS ────────────────────────────────────────────────
  _createGodRays() {
    this._rays = [];

    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = (i / RAY_COUNT) * Math.PI * 2;

      const r      = 200 + (i % 3) * 80;
      const height = 1100 + (i % 4) * 80;
      const width  = 28 + (i % 5) * 14;

      const geo = new THREE.CylinderGeometry(width * 0.3, width, height, 6, 1, true);

      const mat = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.03,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const ray = new THREE.Mesh(geo, mat);

      ray.position.set(
        Math.cos(angle) * r,
        800 - height / 2,
        Math.sin(angle) * r
      );

      ray.rotation.z = Math.sin(angle) * 0.08;
      ray.rotation.x = -Math.cos(angle) * 0.08;

      this.scene.add(ray);
      this.objects.push(ray);

      this._rays.push({
        mesh: ray,
        baseAngle: angle,
        baseX: Math.cos(angle) * r,
        baseZ: Math.sin(angle) * r,
      });
    }
  }

  // ── BUBBLE TEXTURE ──────────────────────────────────────────
  _createCircleTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0,   'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(180,220,255,0.9)');
    gradient.addColorStop(1,   'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  // ── BUBBLES ─────────────────────────────────────────────────
  _createBubbles() {
    const pos   = new Float32Array(BUBBLE_COUNT * 3);
    const sizes = new Float32Array(BUBBLE_COUNT);

    this._bubbleData = Array.from({ length: BUBBLE_COUNT }, (_, i) => {
      const bx = (Math.random() - 0.5) * 800;
      const bz = (Math.random() - 0.5) * 800;
      const by = -100 + Math.random() * 800;

      pos[i * 3]     = bx;
      pos[i * 3 + 1] = by;
      pos[i * 3 + 2] = bz;

      sizes[i] = 4 + Math.random() * 6;

      return {
        bx, bz,
        speed:     0.4 + Math.random() * 1.0,
        sway:      0.3 + Math.random() * 0.5,
        phase:     Math.random() * Math.PI * 2,
        life:      Math.random(),
        lifeSpeed: 0.003 + Math.random() * 0.006,
      };
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));

    this._bubblePos  = pos;
    this._bubbleSizes = sizes;
    this._bubbleGeo  = geo;

    const mat = new THREE.PointsMaterial({
      map: this._createCircleTexture(),
      color: 0xaaddff,
      size: 8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      alphaTest: 0.01,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._bubbles = new THREE.Points(geo, mat);
    this._bubbles.frustumCulled = false;

    this.scene.add(this._bubbles);
    this.objects.push(this._bubbles);
  }

  // ── VISIBILITY ──────────────────────────────────────────────
  setVisible(v) {
    this._isVisible = v;
    this.objects.forEach(o => { o.visible = v; });
  }

  // ── UPDATE ──────────────────────────────────────────────────
  update(time) {
    if (!this._isVisible) return;

    this._time = time;

    if (this._causticsOverlay?.material?.map) {
      this._causticsOverlay.material.map.offset.x = time * 0.012;
      this._causticsOverlay.material.map.offset.y = time * 0.009;
      this._causticsOverlay.material.map.needsUpdate = true;
    }

    this._rays.forEach((r, i) => {
      const sway = Math.sin(time * 0.07 + r.baseAngle * 1.3) * 18;
      r.mesh.position.x = r.baseX + sway;
      r.mesh.material.opacity = 0.03 * (0.8 + Math.sin(time * 0.31 + i * 0.7) * 0.2);
    });

    const bTop = 600;

    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const b = this._bubbleData[i];

      this._bubblePos[i * 3]     = b.bx + Math.sin(time * b.sway + b.phase) * 14;
      this._bubblePos[i * 3 + 1] += b.speed * 0.25;
      this._bubblePos[i * 3 + 2] = b.bz + Math.cos(time * b.sway * 0.8 + b.phase) * 10;

      if (this._bubblePos[i * 3 + 1] > bTop) {
        b.bx = (Math.random() - 0.5) * 800;
        b.bz = (Math.random() - 0.5) * 800;
        this._bubblePos[i * 3]     = b.bx;
        this._bubblePos[i * 3 + 1] = -400 - Math.random() * 200;
        this._bubblePos[i * 3 + 2] = b.bz;
      }
    }

    this._bubbleGeo.attributes.position.needsUpdate = true;

    if (this._whale) {
      this._whale.position.set(
        Math.sin(time * 0.15) * 8,
        WHALE_ORBIT_Y + Math.sin(time * 0.4) * 6,
        Math.sin(time * 0.08) * 5
      );

      this._whale.rotation.y = Math.sin(time * 0.15) * 0.12;
      this._whale.rotation.x = Math.sin(time * 0.4)  * 0.04;
      this._whale.rotation.z = Math.sin(time * 0.22) * 0.06;
    }

    if (this._lights) {
      this._lights.update(time);
    }
  }
}
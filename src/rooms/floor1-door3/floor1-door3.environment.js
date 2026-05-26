// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 3 — Ocean Environment
//  Full underwater scene:
//    • Water-volume fog + deep gradient sky sphere
//    • Scrolling caustics projection on the seabed
//    • 3-layer god-ray shafts from above
//    • Floating particle soup (plankton / debris)
//    • Bubble streams
//    • Whale lazy figure-8 swim path with banking
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { OceanLights, makeCausticsTexture } from './floor1-door3.lights.js';

// ── Whale swim path ───────────────────────────────────────────
const WHALE_ORBIT_R   = 340;   // horizontal radius
const WHALE_ORBIT_Y   = 80;    // base height
const WHALE_BOB_AMP   = 45;    // vertical oscillation amplitude
const WHALE_SPEED     = 0.09;  // radians/sec

// ── Particle field ────────────────────────────────────────────
const PARTICLE_COUNT  = 3200;
const PARTICLE_FIELD  = 1400;

// ── Bubble streams ────────────────────────────────────────────
const BUBBLE_COUNT    = 280;

// ── God rays ──────────────────────────────────────────────────
const RAY_COUNT       = 9;

export class OceanEnvironment {
  constructor(scene) {
    this.scene      = scene;
    this.objects    = [];
    this._isVisible = false;
    this._time      = 0;

    // Whale reference set by RoomSystem
    this._whale     = null;
    this._whaleDummy = new THREE.Object3D();

    this._createVolumeFog();
    this._createSeabed();
    this._createGodRays();
    this._createCausticsMesh();
    this._createParticles();
    this._createBubbles();

    // Note: lights passed in by RoomSystem via setLights()
    this._lights = null;

    this.setVisible(false);
  }

  setLights(lights) {
    this._lights = lights;
  }

  // Called by RoomSystem once the whale model is loaded
  setWhale(object) {
    this._whale = object;
    if (object) {
      // Place immediately at t=0 so it's visible on first frame
      object.position.set(0, WHALE_ORBIT_Y, 0);
      console.log('[Ocean] Whale attached, scale:', object.scale.x, 'pos:', object.position);
    }
  }

  // ── WATER VOLUME (gradient sphere) ───────────────────────────
  _createVolumeFog() {
    const geo   = new THREE.SphereGeometry(4200, 32, 16);
    const count = geo.attributes.position.count;
    const cols  = new Float32Array(count * 3);
    const posArr = geo.attributes.position.array;

    const deep    = new THREE.Color(0x000d1a);
    const mid     = new THREE.Color(0x003355);
    const surface = new THREE.Color(0x006688);

    for (let i = 0; i < count; i++) {
      const y = posArr[i * 3 + 1];
      const t = Math.max(0, Math.min(1, (y + 4200) / 8400));
      const c = t < 0.5
        ? deep.clone().lerp(mid, t * 2)
        : mid.clone().lerp(surface, (t - 0.5) * 2);
      cols[i * 3]     = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this._skyMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
    }));
    this._skyMesh.frustumCulled = false;
    this.scene.add(this._skyMesh);
    this.objects.push(this._skyMesh);
  }

  // ── SEABED ───────────────────────────────────────────────────
  _createSeabed() {
    // Bumpy seabed via displacement (fake it with vertex colors + roughness)
    const geo = new THREE.PlaneGeometry(5000, 5000, 80, 80);
    const pos = geo.attributes.position;

    // Random bumps
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getY(i);
      const bump = Math.sin(x * 0.02) * Math.cos(z * 0.018) * 18
                 + Math.sin(x * 0.055 + 1.3) * Math.sin(z * 0.04) * 9
                 + (Math.random() - 0.5) * 6;
      pos.setZ(i, bump);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({
      color: 0x0a1f14,
    });

    const seabed = new THREE.Mesh(geo, mat);
    seabed.rotation.x = -Math.PI / 2;
    seabed.position.y = -520;
    seabed.receiveShadow = true;
    this.scene.add(seabed);
    this.objects.push(seabed);
    this._seabed = seabed;

    // Caustics overlay — separate plane just above seabed
    this._causticsOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(4800, 4800),
      new THREE.MeshBasicMaterial({
        map:         makeCausticsTexture(256),
        transparent: true,
        opacity:     0.18,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
      })
    );
    this._causticsOverlay.rotation.x = -Math.PI / 2;
    this._causticsOverlay.position.y = -514;
    this.scene.add(this._causticsOverlay);
    this.objects.push(this._causticsOverlay);
  }

  // ── CAUSTICS MESH (ceiling projection) ───────────────────────
  _createCausticsMesh() {
    // A large plane near the top of view — projected caustics from above
    this._causticsCeiling = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.MeshBasicMaterial({
        map:         makeCausticsTexture(128),
        transparent: true,
        opacity:     0.10,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
        side:        THREE.DoubleSide,
      })
    );
    this._causticsCeiling.rotation.x = -Math.PI / 2;
    this._causticsCeiling.position.y = 800;
    this.scene.add(this._causticsCeiling);
    this.objects.push(this._causticsCeiling);
  }

  // ── GOD RAYS ─────────────────────────────────────────────────
  _createGodRays() {
    this._rays = [];

    for (let i = 0; i < RAY_COUNT; i++) {
      const angle  = (i / RAY_COUNT) * Math.PI * 2;
      const r      = 80 + (i % 3) * 55;
      const height = 1100 + (i % 4) * 80;
      const width  = 28  + (i % 5) * 14;

      // Each ray is a thin tall box with additive blending
      const geo = new THREE.CylinderGeometry(width * 0.3, width, height, 6, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color:       0x00aaff,
        transparent: true,
        opacity:     0.025 + (i % 3) * 0.008,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
        side:        THREE.DoubleSide,
      });

      const ray = new THREE.Mesh(geo, mat);
      ray.position.set(
        Math.cos(angle) * r,
        800 - height / 2,
        Math.sin(angle) * r
      );
      // Slight inward tilt so rays converge toward centre
      ray.rotation.z = Math.sin(angle) * 0.08;
      ray.rotation.x = -Math.cos(angle) * 0.08;

      this.scene.add(ray);
      this.objects.push(ray);
      this._rays.push({ mesh: ray, baseAngle: angle, baseX: Math.cos(angle) * r, baseZ: Math.sin(angle) * r });
    }
  }

  // ── PARTICLES (plankton / debris) ────────────────────────────
  _createParticles() {
    const pos   = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const cols  = new Float32Array(PARTICLE_COUNT * 3);

    // Colour palette: white, pale cyan, pale teal, pale yellow
    const palette = [
      new THREE.Color(1.0, 1.0, 1.0),
      new THREE.Color(0.6, 1.0, 1.0),
      new THREE.Color(0.4, 0.9, 0.8),
      new THREE.Color(1.0, 1.0, 0.7),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i*3]     = (Math.random() - 0.5) * PARTICLE_FIELD;
      pos[i*3 + 1] = (Math.random() - 0.5) * PARTICLE_FIELD * 0.8;
      pos[i*3 + 2] = (Math.random() - 0.5) * PARTICLE_FIELD;
      sizes[i]     = 2 + Math.random() * 4;
      const c = palette[Math.floor(Math.random() * palette.length)];
      cols[i*3] = c.r; cols[i*3+1] = c.g; cols[i*3+2] = c.b;
    }

    // Per-particle velocity & phase
    this._particleData = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      vx: (Math.random() - 0.5) * 0.8,
      vy: 0.15 + Math.random() * 0.4,
      vz: (Math.random() - 0.5) * 0.8,
      phase: Math.random() * Math.PI * 2,
    }));

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,   3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color',    new THREE.BufferAttribute(cols,  3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    this._particlePos = pos;
    this._particleGeo = geo;

    const mat = new THREE.PointsMaterial({
      vertexColors:    true,
      size:            4,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.55,
      depthWrite:      false,
      blending:        THREE.AdditiveBlending,
    });

    this._particles = new THREE.Points(geo, mat);
    this._particles.frustumCulled = false;
    this.scene.add(this._particles);
    this.objects.push(this._particles);
  }

  // ── BUBBLES ──────────────────────────────────────────────────
  _createBubbles() {
    const pos   = new Float32Array(BUBBLE_COUNT * 3);
    const sizes = new Float32Array(BUBBLE_COUNT);

    this._bubbleData = Array.from({ length: BUBBLE_COUNT }, (_, i) => {
      const bx = (Math.random() - 0.5) * 600;
      const bz = (Math.random() - 0.5) * 600;
      pos[i*3]     = bx;
      pos[i*3 + 1] = (Math.random() - 0.5) * 800;
      pos[i*3 + 2] = bz;
      sizes[i]     = 3 + Math.random() * 6;
      return {
        bx, bz,
        speed:  0.6 + Math.random() * 1.2,
        sway:   0.4 + Math.random() * 0.6,
        phase:  Math.random() * Math.PI * 2,
      };
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,   3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    this._bubblePos = pos;
    this._bubbleGeo = geo;

    const mat = new THREE.PointsMaterial({
      color:           0xaaddff,
      size:            5,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.35,
      depthWrite:      false,
      blending:        THREE.AdditiveBlending,
    });

    this._bubbles = new THREE.Points(geo, mat);
    this._bubbles.frustumCulled = false;
    this.scene.add(this._bubbles);
    this.objects.push(this._bubbles);
  }

  // ── VISIBILITY ───────────────────────────────────────────────
  setVisible(v) {
    this._isVisible = v;
    this.objects.forEach(o => { o.visible = v; });
  }

  // ── UPDATE ───────────────────────────────────────────────────
  update(time) {
    if (!this._isVisible) return;
    this._time = time;

    // ── Caustics scroll ────────────────────────────────────────
    if (this._causticsOverlay?.material?.map) {
      this._causticsOverlay.material.map.offset.x = time * 0.012;
      this._causticsOverlay.material.map.offset.y = time * 0.009;
      this._causticsOverlay.material.map.needsUpdate = true;
    }
    if (this._causticsCeiling?.material?.map) {
      this._causticsCeiling.material.map.offset.x = -time * 0.008;
      this._causticsCeiling.material.map.offset.y =  time * 0.010;
      this._causticsCeiling.material.map.needsUpdate = true;
      // Pulse opacity with caustic light flicker
      this._causticsCeiling.material.opacity = 0.08 + Math.sin(time * 1.8) * 0.03;
    }

    // ── God rays sway & flicker ────────────────────────────────
    this._rays.forEach((r, i) => {
      const sway = Math.sin(time * 0.07 + r.baseAngle * 1.3) * 18;
      r.mesh.position.x = r.baseX + sway;
      r.mesh.material.opacity = (0.02 + (i % 3) * 0.007)
        * (0.8 + Math.sin(time * 0.31 + i * 0.7) * 0.2);
    });

    // ── Particles drift upward, loop ──────────────────────────
    const half = PARTICLE_FIELD * 0.4;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const d = this._particleData[i];
      this._particlePos[i*3]     += d.vx * 0.016 + Math.sin(time * 0.3 + d.phase) * 0.05;
      this._particlePos[i*3 + 1] += d.vy * 0.016;
      this._particlePos[i*3 + 2] += d.vz * 0.016 + Math.cos(time * 0.25 + d.phase) * 0.05;
      // wrap y
      if (this._particlePos[i*3 + 1] >  half) this._particlePos[i*3 + 1] = -half;
    }
    this._particleGeo.attributes.position.needsUpdate = true;

    // ── Bubbles rise ──────────────────────────────────────────
    const bTop = 600;
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const b = this._bubbleData[i];
      this._bubblePos[i*3]     = b.bx + Math.sin(time * b.sway + b.phase) * 12;
      this._bubblePos[i*3 + 1] += b.speed * 0.016 * 60 * 0.016;
      this._bubblePos[i*3 + 2] = b.bz + Math.cos(time * b.sway * 0.8 + b.phase) * 8;
      if (this._bubblePos[i*3 + 1] > bTop) {
        this._bubblePos[i*3 + 1] = -500 - Math.random() * 100;
      }
    }
    this._bubbleGeo.attributes.position.needsUpdate = true;

    // ── Whale swim path — lazy figure-8 ──────────────────────
    if (this._whale) {
      const t  = time * WHALE_SPEED;
      // Lissajous figure-8: x = R·sin(t), z = R·sin(2t)/2
      const wx = Math.sin(t)       * WHALE_ORBIT_R;
      const wy = WHALE_ORBIT_Y + Math.sin(t * 0.7 + 0.8) * WHALE_BOB_AMP;
      const wz = Math.sin(t * 2)   * WHALE_ORBIT_R * 0.55;

      this._whale.position.set(wx, wy, wz);

      // Face direction of travel
      const dt   = 0.04;
      const nx   = Math.sin(t + dt)       * WHALE_ORBIT_R;
      const nz   = Math.sin((t + dt) * 2) * WHALE_ORBIT_R * 0.55;
      this._whaleDummy.position.set(nx, wy, nz);
      this._whale.lookAt(this._whaleDummy.position);

      // Bank into turns
      const dx    = nx - wx;
      const dz    = nz - wz;
      const bank  = Math.atan2(dz, dx) * 0.18;
      this._whale.rotation.z = -bank;
    }

    // ── Lights ────────────────────────────────────────────────
    if (this._lights) this._lights.update(time);
  }
}
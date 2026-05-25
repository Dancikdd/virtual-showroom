import * as THREE from 'three';

// ── CONFIG ─────────────────────────────────────────────────
const PETAL_COUNT  = 150;
const SPAWN_RADIUS = 2600;
const SPAWN_HEIGHT = 1600;

// ── PROCEDURAL PETAL GEOMETRY ──────────────────────────────
function createPetalGeometry() {
  const SEGMENTS = 8;   // angular slices around the petal width
  const STEPS    = 6;   // lengthwise subdivisions for curvature

  const verts    = [];
  const indices  = [];
  const uvs      = [];
  const normals  = [];

  function halfWidth(t) {
    return Math.sin(t * Math.PI) * (1 - Math.pow(t - 0.3, 2) * 0.6);
  }

  // Slight upward cup (bend along length)
  function curvature(t) {
    return Math.sin(t * Math.PI) * 1.2;
  }

  // Generate a grid of vertices
  for (let s = 0; s <= STEPS; s++) {
    const t  = s / STEPS;
    const y  = curvature(t);           // local Y = cup height
    const z  = t * 10;                 // length along petal (0..10)
    const hw = halfWidth(t) * 3.5;     // half-width at this slice

    for (let a = 0; a <= SEGMENTS; a++) {
      const u  = a / SEGMENTS;
      const x  = (u * 2 - 1) * hw;    // -hw .. +hw

      // Slightly pinch side edges downward for a natural cup
      const pinch = Math.cos(u * Math.PI) * 0.4 * Math.sin(t * Math.PI);

      verts.push(x, y + pinch, z);
      uvs.push(u, t);
      normals.push(0, 1, 0);          // rough normal; lighting not critical
    }
  }

  // Build indices
  const cols = SEGMENTS + 1;
  for (let s = 0; s < STEPS; s++) {
    for (let a = 0; a < SEGMENTS; a++) {
      const base = s * cols + a;
      indices.push(base,         base + 1,        base + cols);
      indices.push(base + 1,     base + cols + 1, base + cols);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ── PETAL RAIN ─────────────────────────────────────────────
export class PetalRain {
  constructor(scene) {
    this.scene      = scene;
    this._time      = 0;
    this._visible   = false;
    this._mesh      = null;

    // Per-instance simulation state
    this._data = [];

    this._build();
  }

  _build() {
    const geo = createPetalGeometry();

    // Warm pink / magenta petal material — double sided so flips look right
    const mat = new THREE.MeshLambertMaterial({
      color:       0xf472b6,
      emissive:    new THREE.Color(0x7c2d52).multiplyScalar(0.15),
      side:        THREE.DoubleSide,
      transparent: true,
      opacity:     0.88,
    });

    this._mesh = new THREE.InstancedMesh(geo, mat, PETAL_COUNT);
    this._mesh.frustumCulled = false;
    this._mesh.visible = false;
    this.scene.add(this._mesh);

    this._dummy = new THREE.Object3D();

    // Seed per-petal data
    for (let i = 0; i < PETAL_COUNT; i++) {
      this._data.push({
        x:      (Math.random() - 0.5) * SPAWN_RADIUS * 2,
        y:      Math.random() * SPAWN_HEIGHT,
        z:      (Math.random() - 0.5) * SPAWN_RADIUS * 2,
        startX: 0,
        startZ: 0,
        rotX:   Math.random() * Math.PI * 2,
        rotY:   Math.random() * Math.PI * 2,
        rotZ:   Math.random() * Math.PI * 2,
        speed:  0.18 + Math.random() * 0.10,
        sway:   0.18 + Math.random() * 0.14,
        phase:  Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.018,
        rotSpdX: (Math.random() - 0.5) * 0.015,
        rotSpdZ: (Math.random() - 0.5) * 0.015,
        swayT:   Math.random() * Math.PI * 2,
        scale:  0.7  + Math.random() * 0.6,
      });
      const d = this._data[i];
      d.startX = d.x;
      d.startZ = d.z;
    }

    // Initial placement
    this._updateInstances(0);
  }

  _updateInstances(delta) {
    for (let i = 0; i < PETAL_COUNT; i++) {
      const d = this._data[i];

      d.y -= 48 * delta;

      d.x = d.startX;
      d.z = d.startZ;

      // Tumble
      d.rotX += d.rotSpdX;
      d.rotY += d.rotSpd;
      d.rotZ += d.rotSpdZ;

      // Respawn above when hitting ground
      if (d.y < 2) {
        d.y     = SPAWN_HEIGHT + Math.random() * 60;
        d.x     = (Math.random() - 0.5) * SPAWN_RADIUS * 2;
        d.z     = (Math.random() - 0.5) * SPAWN_RADIUS * 2;
        d.startX = d.x;
        d.startZ = d.z;
      }

      this._dummy.position.set(d.x, d.y, d.z);
      this._dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
      this._dummy.scale.setScalar(d.scale);
      this._dummy.updateMatrix();
      this._mesh.setMatrixAt(i, this._dummy.matrix);
    }

    this._mesh.instanceMatrix.needsUpdate = true;
  }

  // ── PUBLIC API ─────────────────────────────────────────────
  setVisible(v) {
    this._visible = v;
    if (this._mesh) this._mesh.visible = v;
  }

  update(delta) {
    if (!this._visible || !this._mesh) return;
    this._time += delta * 0.016;
    this._updateInstances(delta);
  }

  dispose() {
    if (!this._mesh) return;
    this._mesh.geometry.dispose();
    this._mesh.material.dispose();
    this.scene.remove(this._mesh);
    this._mesh = null;
  }
}
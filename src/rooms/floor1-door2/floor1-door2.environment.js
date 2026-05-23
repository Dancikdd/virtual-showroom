import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const GRASS_COUNT  = 80000;
const FIELD_RADIUS = 2000;

export class GrassEnvironment {
  constructor(scene) {
    this.scene      = scene;
    this.objects    = [];
    this._isVisible = false;
    this._dummy     = new THREE.Object3D();
    this._iMesh     = null;
    this._grassData = [];

    this._createGround();
    this._createSky();
    this._createClouds();
    this._loadAndScatterGrass();

    this.setVisible(false);
  }

  // ── SUPRAFATA VERDE ─────────────────────────────────────────
  _createGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD_RADIUS * 2 + 600, FIELD_RADIUS * 2 + 600),
      new THREE.MeshLambertMaterial({ color: 0x3a9e22 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.scene.add(ground);
    this.objects.push(ground);
  }

_loadAndScatterGrass() {
  const SEGMENTS = 6;

  const makeBladeGeo = () => {
    const positions = [];
    const normals   = [];
    const uvs       = [];
    const indices   = [];

    const w    = 0.6 + Math.random() * 0.4;
    const h    = 6   + Math.random() * 8;
    const lean = 0.3 + Math.random() * 0.5;
    const curve = 0.5 + Math.random() * 0.5;

    for (let i = 0; i <= SEGMENTS; i++) {
      const t    = i / SEGMENTS;
      const segW = w * (1 - t * 0.85);
      const x    = lean * Math.pow(t, curve) * h;
      const y    = t * h;

      positions.push(-segW + x, y, 0,  segW + x, y, 0);
      normals.push(0, 0, 1,  0, 0, 1);
      uvs.push(0, t,  1, t);

      if (i < SEGMENTS) {
        const b = i * 2;
        indices.push(b, b+1, b+2,  b+1, b+3, b+2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  };

  const COLORS = [0x2d8c1a, 0x3a9e22, 0x4db32a, 0x228b22, 0x56c43a];

  this._grassData = [];
  this._bladeMeshes = [];

  // Grupăm câte ~500 instanțe per geometrie pt performanță
  const BATCH = 500;
  const batches = Math.ceil(GRASS_COUNT / BATCH);

  for (let b = 0; b < batches; b++) {
    const count = Math.min(BATCH, GRASS_COUNT - b * BATCH);
    const geo = makeBladeGeo();
    const color = COLORS[b % COLORS.length];
    const mat = new THREE.MeshLambertMaterial({
      color,
      side: THREE.DoubleSide,
    });

    const iMesh = new THREE.InstancedMesh(geo, mat, count);
    iMesh.frustumCulled = false;

    const d = this._dummy;
    for (let i = 0; i < count; i++) {
      const globalIdx = b * BATCH + i;
      const x = (Math.random() - 0.5) * FIELD_RADIUS * 2;
      const z = (Math.random() - 0.5) * FIELD_RADIUS * 2;
      const rotY = Math.random() * Math.PI * 2;
      const scale = 0.9 + Math.random() * 0.8;

      this._grassData.push({
        x, z, rotY, scale,
        phase: Math.random() * Math.PI * 2,
        speed: 0.9 + Math.random() * 0.9,
        lean:  0.04 + Math.random() * 0.06,
        batchIdx: b,
        localIdx: i,
      });

      d.position.set(x, 0, z);
      d.rotation.set(0, rotY, 0);
      d.scale.setScalar(scale);
      d.updateMatrix();
      iMesh.setMatrixAt(i, d.matrix);
    }

    iMesh.instanceMatrix.needsUpdate = true;
    iMesh.castShadow = true;
    iMesh.visible = this._isVisible;

    this.scene.add(iMesh);
    this.objects.push(iMesh);
    this._bladeMeshes.push(iMesh);
  }

  console.log(`[Grass] ${GRASS_COUNT} fire procedurale generate`);
}

  // ── CER ────────────────────────────────────────────────────
  _createSky() {
    const geo    = new THREE.SphereGeometry(4000, 32, 16);
    const colors = [];
    const pos    = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const t = Math.max(0, Math.min(1, (pos[i+1] + 4000) / 8000));
      colors.push(0.4 + t*0.1, 0.65 + t*0.1, 0.9 + t*0.05);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
    this.scene.add(this.sky);
    this.objects.push(this.sky);
  }

  // ── NORI ───────────────────────────────────────────────────
  _createClouds() {
    this.clouds = [];
    const cloudData = [
      { x: -600, y: 350, z: -400, scale: 1.4 },
      { x:  400, y: 420, z: -600, scale: 1.0 },
      { x:  700, y: 300, z:  200, scale: 1.2 },
      { x: -300, y: 480, z:  500, scale: 0.8 },
      { x:  100, y: 390, z: -200, scale: 1.1 },
    ];
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    cloudData.forEach(({ x, y, z, scale }) => {
      const group = new THREE.Group();
      [
        { ox: 0,   oy: 0,  oz: 0,  r: 60 },
        { ox: 55,  oy: -8, oz: 10, r: 45 },
        { ox: -50, oy: -5, oz: -5, r: 42 },
        { ox: 20,  oy: 22, oz: 5,  r: 38 },
      ].forEach(p => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 10, 8), mat.clone());
        mesh.position.set(p.ox, p.oy, p.oz);
        group.add(mesh);
      });
      group.position.set(x, y, z);
      group.scale.setScalar(scale);
      this.scene.add(group);
      this.clouds.push({ group, baseY: y, speed: 0.04 + Math.random() * 0.03 });
      this.objects.push(group);
    });
  }

  // ── VIZIBILITATE ───────────────────────────────────────────
        setVisible(v) {
        this._isVisible = v;
        this.objects.forEach(o => { o.visible = v; });
        if (this._bladeMeshes) this._bladeMeshes.forEach(m => { m.visible = v; });
        }

  // ── UPDATE ─────────────────────────────────────────────────
        update(time) {
            // Vant subtil pe fiecare fir
        if (this._bladeMeshes?.length && this._grassData.length) {
        const d = this._dummy;
        this._grassData.forEach((p, i) => {
            const wind = Math.sin(time * p.speed + p.phase + p.x * 0.003) * p.lean;
            d.position.set(p.x, 0, p.z);
            d.rotation.set(wind * 0.3, p.rotY, wind);
            d.scale.setScalar(p.scale);
            d.updateMatrix();
            this._bladeMeshes[p.batchIdx].setMatrixAt(p.localIdx, d.matrix);
        });
        this._bladeMeshes.forEach(m => { m.instanceMatrix.needsUpdate = true; });
        }

    this.clouds.forEach((c, i) => {
      c.group.position.x += c.speed;
      c.group.position.y  = c.baseY + Math.sin(time * 0.12 + i) * 12;
      if (c.group.position.x > 1200) c.group.position.x = -1200;
    });
  }
}
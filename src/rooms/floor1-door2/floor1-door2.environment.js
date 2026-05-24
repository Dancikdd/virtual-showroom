// ══════════════════════════════════════════════════════════════
//  FLOOR 1 - DOOR 2 — Grass Environment
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { PetalRain }         from './PetalRain.js';
import { GrassClouds }       from './GrassClouds.js';
import { GrassLights, sampleSkyGradient } from './floor1-door2.lights.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const GRASS_COUNT    = 600000;
const FIELD_RADIUS   = 2500;
const CYCLE_DURATION = 60; // seconds per full day

// ── SHADERS ────────────────────────────────────────────────
const GRASS_VERT = `
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float time;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 terrPosi;
attribute float angle;
attribute float lean;
attribute float heightScale;

varying float vHeight;

vec3 rotateY(vec3 v, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec3(c * v.x - s * v.z, v.y, s * v.x + c * v.z);
}

void main() {
    vHeight = uv.y;
    vec3 p = position;
    p.y *= heightScale;
    p.x += lean * p.y * 1.2;
    float wind = vHeight * vHeight * 0.25;
    float phase = time * 0.0010 + terrPosi.x * 0.9 + terrPosi.z * 0.7;
    p.x += sin(phase + angle) * wind * 1.8;
    p.z += cos(phase * 0.8) * wind * 1.3;
    p.x += sin(time * 0.0018 + angle * 1.9) * vHeight * 0.12;
    p = rotateY(p, angle);
    p += terrPosi;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const GRASS_FRAG = `
precision mediump float;
varying float vHeight;
uniform float uDarkness;
void main() {
    vec3 baseColor = vec3(0.03, 0.18, 0.02);
    vec3 midColor  = vec3(0.08, 0.60, 0.06);
    vec3 tipColor  = vec3(0.22, 0.92, 0.10);
    vec3 color;
    if (vHeight < 0.4) {
        color = mix(baseColor, midColor, vHeight / 0.4);
    } else {
        color = mix(midColor, tipColor, (vHeight - 0.4) / 0.6);
    }
    vec3 shadow = color * vec3(0.42, 0.54, 0.36);
    color = mix(color, shadow, uDarkness);
    color *= mix(1.0, 0.56, uDarkness);
    gl_FragColor = vec4(color, 1.0);
}
`;

export class GrassEnvironment {
  constructor(scene) {
    this.scene      = scene;
    this.objects    = [];
    this._isVisible = false;
    this._grassMesh = null;
    this._time      = 0;
    this._cycle     = 0.35; // start just after dawn

    // Stores { mesh, originalColor } for each tree mesh child
    this._treeMeshes = [];

    this._createGround();
    this._createSky();
    this._createGrass();
    this._loadTree();

    this._clouds    = new GrassClouds(scene);
    this._petalRain = new PetalRain(scene);

    // Note: GrassLights is created by RoomSystem and passed in via setLights()
    this._lights = null;

    this.setVisible(false);
  }

  // Called by RoomSystem after construction
  setLights(grassLights) {
    this._lights = grassLights;
  }

  // ── GROUND ─────────────────────────────────────────────────
  _createGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD_RADIUS * 2 + 600, FIELD_RADIUS * 2 + 600),
      new THREE.MeshLambertMaterial({ color: 0x0a2a06 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.objects.push(ground);
  }

  // ── SKY SPHERE ─────────────────────────────────────────────
  _createSky() {
    const geo   = new THREE.SphereGeometry(4000, 32, 16);
    const count = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this._sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
    }));
    this._sky.frustumCulled = false;
    this.scene.add(this._sky);
    this.objects.push(this._sky);
    this._skyPos = geo.attributes.position.array;
  }

  // ── GRASS ──────────────────────────────────────────────────
  _createGrass() {
    const bladeW = 3.5, bladeH = 28;
    const positions    = [bladeW,0,0, -bladeW,0,0, 0,bladeH,0];
    const uvs          = [1,0, 0,0, 0.5,1];
    const indices      = [0,1,2];
    const terrPosis=[], angles=[], leans=[], heightScales=[];

    for (let i = 0; i < GRASS_COUNT; i++) {
      terrPosis.push((Math.random()-0.5)*FIELD_RADIUS*2, 0, (Math.random()-0.5)*FIELD_RADIUS*2);
      angles.push(Math.random()*Math.PI*2);
      leans.push((Math.random()-0.5)*0.2);
      heightScales.push(0.6+Math.random()*0.8);
    }

    const geo = new THREE.InstancedBufferGeometry();
    geo.instanceCount = GRASS_COUNT;
    geo.setAttribute('position',    new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv',          new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.setAttribute('terrPosi',    new THREE.InstancedBufferAttribute(new Float32Array(terrPosis), 3));
    geo.setAttribute('angle',       new THREE.InstancedBufferAttribute(new Float32Array(angles), 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('lean',        new THREE.InstancedBufferAttribute(new Float32Array(leans), 1));
    geo.setAttribute('heightScale', new THREE.InstancedBufferAttribute(new Float32Array(heightScales), 1));

    const mat = new THREE.RawShaderMaterial({
      uniforms: {
        time:      { value: 0 },
        uDarkness: { value: 0 },
      },
      vertexShader:   GRASS_VERT,
      fragmentShader: GRASS_FRAG,
      side: THREE.DoubleSide,
    });

    this._grassMesh = new THREE.Mesh(geo, mat);
    this._grassMesh.frustumCulled = false;
    this._grassMesh.visible = false;
    this.scene.add(this._grassMesh);
    this.objects.push(this._grassMesh);
  }

  // ── LOAD TREE MODEL ────────────────────────────────────────
  _loadTree() {
    const loader = new GLTFLoader();
    loader.load('/products/jabami_anime_tree_v2.glb', (gltf) => {
      const tree = gltf.scene;
      tree.position.set(0, 0, -1700);
      tree.scale.setScalar(40.0);

      tree.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;

          // Clone material so we don't mutate shared GLTF materials
          child.material = child.material.clone();

          // Ensure the material supports color tinting
          if (!child.material.color) {
            child.material.color = new THREE.Color(1, 1, 1);
          }

          // Store original color for lerping
          this._treeMeshes.push({
            mesh:          child,
            originalColor: child.material.color.clone(),
          });
        }
      });

      this.scene.add(tree);
      this.objects.push(tree);
    });
  }

  // ── TREE NIGHT TINT ────────────────────────────────────────
  // ambT: 0 = full night, 1 = full day
  _updateTreeDarkness(ambT) {
    if (this._treeMeshes.length === 0) return;

    // Night color: deep teal-indigo so the tree stays readable and a bit magical
    const nightColor = new THREE.Color(0x0d1f2e);
    // Gentle curve — never fully crushes the color
    const t = Math.pow(ambT, 0.9) * 0.75 + 0.25;

    for (const { mesh, originalColor } of this._treeMeshes) {
      mesh.material.color.r = nightColor.r + (originalColor.r - nightColor.r) * t;
      mesh.material.color.g = nightColor.g + (originalColor.g - nightColor.g) * t;
      mesh.material.color.b = nightColor.b + (originalColor.b - nightColor.b) * t;
    }
  }

  // ── SKY COLOURS ────────────────────────────────────────────
  _updateSky(top, bot) {
    const pos  = this._skyPos;
    const cols = this._sky.geometry.attributes.color;
    for (let i = 0; i < cols.count; i++) {
      const t = Math.max(0, Math.min(1, (pos[i*3+1] + 4000) / 8000));
      cols.setXYZ(i,
        bot.r + (top.r - bot.r) * t,
        bot.g + (top.g - bot.g) * t,
        bot.b + (top.b - bot.b) * t,
      );
    }
    cols.needsUpdate = true;
  }

  // ── VISIBILITY ─────────────────────────────────────────────
  setVisible(v) {
    this._isVisible = v;
    this.objects.forEach(o => { o.visible = v; });
    this._clouds.setVisible(v);
    if (this._petalRain) this._petalRain.setVisible(v);
  }

  // ── UPDATE ─────────────────────────────────────────────────
  update(delta, camera) {
    this._time  += delta;
    this._cycle  = (this._cycle + delta / CYCLE_DURATION) % 1;

    if (this._grassMesh) {
      this._grassMesh.material.uniforms.time.value = this._time * 1000;
    }

    this._clouds.update(this._time, camera);

    if (this._isVisible && this._lights) {
      const { top, bot, ambT } = this._lights.update(this._cycle, this.scene);
      this._updateSky(top, bot);
      this._clouds.tint(ambT);
      this._updateTreeDarkness(ambT);
      if (this._grassMesh) {
        const rawDark = 1.0 - ambT;
        const fastDark = Math.pow(rawDark, 0.72);
        this._grassMesh.material.uniforms.uDarkness.value = THREE.MathUtils.clamp(fastDark, 0, 1);
      }
    }

    if (this._petalRain) this._petalRain.update(delta);
  }
}
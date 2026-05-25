import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class DoorModelManager {
  constructor(scene) {
    this.scene = scene;
    this.config = null;
    this.modelCache = {};

    this.loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/gltf/');
    this.loader.setDRACOLoader(draco);
  }

  setConfig(config) {
  this.config = config;
}

setupScene() {
  switch (this.config.theme) {
    case 'underwater':
      this.scene.background = new THREE.Color(0x001133);
      this.scene.fog = new THREE.FogExp2(0x001133, 0.002);
      break;
    case 'forest':
      this.scene.background = new THREE.Color(0x0a1a0a);
      this.scene.fog = new THREE.FogExp2(0x0a1a0a, 0.003);
      break;
    default:
      this.scene.background = new THREE.Color(0x050508); // spațiu
      break;
  }
}

  load(doorKey, onReady) {
    if (this.modelCache[doorKey]) return onReady(this.modelCache[doorKey]);

    if (!this.config.modelPath) {
      const entry = this._makePlaceholder();
      this.modelCache[doorKey] = entry;
      return onReady(entry);
    }

    this.loader.load(
      this.config.modelPath,
      (gltf) => {
        const group = gltf.scene;
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const autoScale = (120 / maxDim) * this.config.scale;

        group.scale.setScalar(autoScale);
        group.position.set(
          -center.x * autoScale,
          -box.min.y * autoScale + this.config.offsetY,
          -center.z * autoScale
        );
        group.visible = false;
        this.scene.add(group);

        let mixer = null;
        if (gltf.animations?.length) {
          mixer = new THREE.AnimationMixer(group);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        }

        const entry = { object: group, mixer };
        this.modelCache[doorKey] = entry;
        onReady(entry);
      },
      undefined,
      (err) => {
        console.warn(`Eroare model ${doorKey}:`, err);
        const entry = this._makePlaceholder();
        this.modelCache[doorKey] = entry;
        onReady(entry);
      }
    );
  }

  _makePlaceholder() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(80, 80, 80),
      new THREE.MeshStandardMaterial({
        color: this.config.color,
        roughness: 0.3,
        metalness: 0.7,
      })
    );
    mesh.position.set(0, 40 + this.config.offsetY, 0);
    mesh.visible = false;
    this.scene.add(mesh);
    return { object: mesh, mixer: null };
  }
}
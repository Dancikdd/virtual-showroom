import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyCorridor } from './corridor.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1410);

// ===== CANVAS =====
const canvas = document.getElementById('canvas');

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

document.body.style.margin = 0;
document.body.style.overflow = 'hidden';

// ===== LIGHTS =====
const ambientLight = new THREE.AmbientLight(0xffe8d6, 0.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffd9b3, 0.9);
mainLight.position.set(10, 8, 15);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 4096;
mainLight.shadow.mapSize.height = 4096;
mainLight.shadow.camera.far = 100;
mainLight.shadow.camera.left = -50;
mainLight.shadow.camera.right = 50;
mainLight.shadow.camera.top = 50;
mainLight.shadow.camera.bottom = -50;
mainLight.shadow.bias = -0.001;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xb0c4ff, 0.4);
fillLight.position.set(-20, 5, -10);
scene.add(fillLight);

const skyLight = new THREE.HemisphereLight(0xd4e6f1, 0xc4a574, 0.5);
scene.add(skyLight);

// ===== CURSOR =====
const cursor = document.createElement('div');
cursor.style.cssText = `
  position: fixed;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 999;
  mix-blend-mode: difference;
`;
document.body.appendChild(cursor);
document.body.style.cursor = 'none';

// ===== RAYCASTER =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const infoBox = document.createElement('div');
infoBox.style.cssText = `
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.75);
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 13px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
`;
infoBox.textContent = 'Se încarcă modelul...';
document.body.appendChild(infoBox);

// ===== MOUSE =====
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;

  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ===== LOAD MODEL =====
const loader = new GLTFLoader();
let corridor = null;
let initialYaw = Math.PI / 2;

loader.load(
  '/models/corridor.glb',

  (gltf) => {
    corridor = gltf.scene;
    corridor.rotation.y = Math.PI / 2;
    corridor.updateMatrixWorld(true);

    corridor.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    applyCorridor(corridor, scene);
    scene.add(corridor);

    // ===== CAMERA SPAWN =====
    const box = new THREE.Box3().setFromObject(corridor);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const eyeHeight = size.y * 0.65;

    camera.position.set(
      box.max.x - 50,
      box.min.y + eyeHeight,
      center.z
    );

    camera.rotation.order = 'YXZ';
    camera.rotation.y = Math.PI / 2;
    camera.rotation.x = 0;

    initialYaw = camera.rotation.y;

    // ===== PERETE SPAWN =====
    const wallGeometry = new THREE.BoxGeometry(5, size.y, size.z * 2);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0ebe3,
      roughness: 0.9,
      metalness: 0.0,
      emissive: 0xf0ebe3,
      emissiveIntensity: 0.05
    });
    const spawnWall = new THREE.Mesh(wallGeometry, wallMaterial);
    spawnWall.position.set(
      box.max.x,
      box.min.y + size.y / 2,
      center.z
    );
    spawnWall.receiveShadow = true;
    spawnWall.castShadow = true;
    scene.add(spawnWall);

    // lumină pentru peretele din spate
    const spawnLight = new THREE.PointLight(0xffe8d6, 1.5, 300);
    spawnLight.position.set(box.max.x - 30, box.min.y + eyeHeight, center.z);
    scene.add(spawnLight);

    console.log('✓ Corridor loaded');
    console.log('Spawn:', camera.position);
    console.log('Box min:', box.min);
    console.log('Box max:', box.max);
    console.log('Size:', size);
  },

  (progress) => {
    if (progress.total) {
      const percent = Math.round(
        (progress.loaded / progress.total) * 100
      );
      infoBox.textContent = `Încărcare: ${percent}%`;
    }
  },

  (error) => {
    console.error('Error loading model:', error);
    infoBox.textContent = 'Eroare la încărcare';
  }
);

// ===== RESIZE =====
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== LOOP =====
function animate() {
  requestAnimationFrame(animate);

  const targetYaw = initialYaw + (-mouseX * Math.PI * 0.3);
  const targetPitch = -mouseY * Math.PI * 0.15;

  camera.rotation.order = 'YXZ';
  camera.rotation.y += (targetYaw - camera.rotation.y) * 0.05;
  camera.rotation.x += (targetPitch - camera.rotation.x) * 0.05;

  // ===== RAYCASTER =====
  if (corridor) {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(
      corridor.children,
      true
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      const pos = hit.point;
      infoBox.textContent =
        `Mesh: "${hit.object.name || 'fără nume'}"` +
        ` | X:${pos.x.toFixed(0)}` +
        ` Y:${pos.y.toFixed(0)}` +
        ` Z:${pos.z.toFixed(0)}`;
    } else {
      infoBox.textContent = 'Nimic selectat';
    }
  }

  renderer.render(scene, camera);
}

animate();
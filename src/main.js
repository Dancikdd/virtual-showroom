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

// ===== NAVIGARE =====
let currentStop = 0;
let targetPosition = null;
let isMoving = false;
let stops = [];
let centerGlobal = new THREE.Vector3();
let initialYaw = Math.PI / 2;

// ===== UI BUTOANE =====
const navContainer = document.createElement('div');
navContainer.style.cssText = `
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
`;
document.body.appendChild(navContainer);

const btnStyle = `
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  color: white;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, border 0.2s;
  user-select: none;
`;

const btnBack = document.createElement('div');
btnBack.style.cssText = btnStyle;
btnBack.innerHTML = '&#8593;';

const btnForward = document.createElement('div');
btnForward.style.cssText = btnStyle;
btnForward.innerHTML = '&#8595;';

navContainer.appendChild(btnBack);
navContainer.appendChild(btnForward);

function updateButtons() {
  btnBack.style.opacity = currentStop < stops.length - 1 ? '1' : '0.25';
  btnBack.style.pointerEvents = currentStop < stops.length - 1 ? 'auto' : 'none';
  btnForward.style.opacity = currentStop > 0 ? '1' : '0.25';
  btnForward.style.pointerEvents = currentStop > 0 ? 'auto' : 'none';
}

function moveTo(index) {
  if (isMoving) return;
  currentStop = index;
  targetPosition = stops[currentStop].clone();
  isMoving = true;

  // ultimul stop = în lift -> întoarce 180°
  if (index === stops.length - 1) {
    initialYaw = Math.PI / 2 + Math.PI;
  } else {
    initialYaw = Math.PI / 2;
  }

  updateButtons();
}

btnBack.addEventListener('click', () => {
  if (currentStop < stops.length - 1) moveTo(currentStop + 1);
});

btnForward.addEventListener('click', () => {
  if (currentStop > 0) moveTo(currentStop - 1);
});

[btnBack, btnForward].forEach((btn) => {
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(255,255,255,0.2)';
    btn.style.border = '2px solid rgba(255,255,255,0.7)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'rgba(0,0,0,0.6)';
    btn.style.border = '2px solid rgba(255,255,255,0.3)';
  });
});

// ===== LOAD MODEL =====
const loader = new GLTFLoader();
let corridor = null;

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

    const box = new THREE.Box3().setFromObject(corridor);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const eyeHeight = size.y * 0.65;
    centerGlobal.copy(center);

    // ===== STOPS CUSTOM =====
    stops = [
      new THREE.Vector3(box.max.x - 50,  box.min.y + eyeHeight, center.z), // stop 0 - start
      new THREE.Vector3(box.max.x - 300, box.min.y + eyeHeight, center.z), // stop 1
      new THREE.Vector3(box.max.x - 600, box.min.y + eyeHeight, center.z), // stop 2
      new THREE.Vector3(box.max.x - 900, box.min.y + eyeHeight, center.z), // stop 3 - lift
    ];

    currentStop = 0;
    camera.position.copy(stops[0]);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = Math.PI / 2;
    camera.rotation.x = 0;
    initialYaw = Math.PI / 2;

    // ===== PERETE SPAWN =====
    const wallGeometry = new THREE.BoxGeometry(5, size.y, size.z * 2);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0ebe3,
      roughness: 0.9,
      metalness: 0.0,
      emissive: 0xf0ebe3,
      emissiveIntensity: 0.1,
    });
    const spawnWall = new THREE.Mesh(wallGeometry, wallMaterial);
    spawnWall.position.set(box.max.x, box.min.y + size.y / 2, center.z);
    spawnWall.receiveShadow = true;
    spawnWall.castShadow = true;
    scene.add(spawnWall);

    const spawnLight = new THREE.PointLight(0xffe8d6, 1.5, 300);
    spawnLight.position.set(box.max.x - 30, box.min.y + eyeHeight, center.z);
    scene.add(spawnLight);

    updateButtons();

    console.log('✓ Corridor loaded');
    console.log('box.max.x:', box.max.x);
    console.log('box.min.y:', box.min.y);
    console.log('eyeHeight:', eyeHeight);
    console.log('Stops:', stops);
  },

  (progress) => {
    if (progress.total) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
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

  if (isMoving && targetPosition) {
    camera.position.lerp(targetPosition, 0.08);

    if (camera.position.distanceTo(targetPosition) < 1) {
      camera.position.copy(targetPosition);
      isMoving = false;
    }
  }

  const currentTargetYaw = initialYaw + (-mouseX * Math.PI * 0.15);
  const targetPitch = -mouseY * Math.PI * 0.15;

  camera.rotation.order = 'YXZ';
  camera.rotation.y += (currentTargetYaw - camera.rotation.y) * 0.05;
  camera.rotation.x += (targetPitch - camera.rotation.x) * 0.05;

  if (corridor) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(corridor.children, true);

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
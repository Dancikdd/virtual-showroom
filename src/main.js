import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyCorridor } from './corridor.js';
import { DoorSystem } from './doorSystem.js';

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
const ambientLight = new THREE.AmbientLight(0xffe8d6, 0.2);
scene.add(ambientLight);

const purpleAmbient = new THREE.AmbientLight(0x6b35c8, 0.8);
scene.add(purpleAmbient);

const mainLight = new THREE.DirectionalLight(0xffd9b3, 0.4);
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

const fillLight = new THREE.DirectionalLight(0xb0c4ff, 0.2);
fillLight.position.set(-20, 5, -10);
scene.add(fillLight);

const skyLight = new THREE.HemisphereLight(0xd4e6f1, 0xc4a574, 0.2);
scene.add(skyLight);

// ===== CURSOR =====
const cursor = document.createElement('div');
cursor.id = 'cursor';
document.body.appendChild(cursor);
document.body.style.cursor = 'none';

document.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});

// ===== RAYCASTER =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ===== INFO BOX =====
const infoBox = document.createElement('div');
infoBox.id = 'info-box';
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

// ===== UI NAVIGARE =====
const navContainer = document.createElement('div');
navContainer.id = 'nav-container';
document.body.appendChild(navContainer);

const btnBack = document.createElement('div');
btnBack.className = 'nav-btn';
btnBack.innerHTML = `<svg viewBox="0 0 100 55" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,50 L50,0 L100,50 L75,50 L50,28 L25,50 Z" fill="white"/>
</svg>`;

const btnForward = document.createElement('div');
btnForward.className = 'nav-btn';
btnForward.innerHTML = `<svg viewBox="0 0 100 55" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,5 L50,55 L100,5 L75,5 L50,27 L25,5 Z" fill="white"/>
</svg>`;

navContainer.appendChild(btnBack);
navContainer.appendChild(btnForward);

// ===== UI DOOR ACTIONS =====
const doorActions = document.createElement('div');
doorActions.id = 'door-actions';
document.body.appendChild(doorActions);

const btnEnter = document.createElement('div');
btnEnter.className = 'door-btn';
btnEnter.innerHTML = `<svg viewBox="0 0 100 55" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,50 L50,0 L100,50 L75,50 L50,28 L25,50 Z" fill="white"/>
</svg>`;

const btnClose = document.createElement('div');
btnClose.className = 'door-btn';
btnClose.innerHTML = `<svg viewBox="0 0 100 55" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,5 L50,55 L100,5 L75,5 L50,27 L25,5 Z" fill="white"/>
</svg>`;

doorActions.appendChild(btnEnter);
doorActions.appendChild(btnClose);

btnClose.addEventListener('click', () => {
  if (doorSystem && doorSystem.lastOpenedDoor) {
    const door = doorSystem.lastOpenedDoor;
    door.state = 'closed';
    door.targetAngle = 0;
    door.light.intensity = 0;
    doorSystem.lastOpenedDoor = null;
  }
  isMoving = false;
  moveTo(currentStop);
  doorActions.style.opacity = '0';
  doorActions.style.pointerEvents = 'none';

  navContainer.style.opacity = '1';
  navContainer.style.pointerEvents = 'auto';
});

// ===== FUNCTII NAVIGARE =====
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

// ===== DOOR SYSTEM =====
let doorSystem = null;

window.addEventListener('click', () => {
  if (doorSystem) {
    doorSystem.onClick(raycaster, mouse, camera, (doorPos) => {
      const offsetX = 80;
      const targetZ = doorPos.z > 0 ? doorPos.z - offsetX : doorPos.z + offsetX;

      targetPosition = new THREE.Vector3(doorPos.x, camera.position.y, targetZ);
      isMoving = true;
      initialYaw = doorPos.z > 0 ? Math.PI : 0;

      doorActions.style.opacity = '1';
      doorActions.style.pointerEvents = 'auto';

      navContainer.style.opacity = '0';
      navContainer.style.pointerEvents = 'none';
    });
  }
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

    stops = [
      new THREE.Vector3(box.max.x - 50,  box.min.y + eyeHeight, center.z),
      new THREE.Vector3(box.max.x - 450, box.min.y + eyeHeight, center.z),
      new THREE.Vector3(box.max.x - 650, box.min.y + eyeHeight, center.z),
      new THREE.Vector3(box.max.x - 900, box.min.y + eyeHeight, center.z),
    ];

    currentStop = 0;
    camera.position.copy(stops[0]);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = Math.PI / 2;
    camera.rotation.x = 0;
    initialYaw = Math.PI / 2;

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

    // ===== PURPLE ATMOSPHERE LIGHTS =====
    const purpleLight1 = new THREE.PointLight(0x7b2fff, 3, 800);
    purpleLight1.position.set(box.max.x - 300, box.min.y + eyeHeight, center.z);
    scene.add(purpleLight1);

    const purpleLight2 = new THREE.PointLight(0x7b2fff, 3, 800);
    purpleLight2.position.set(box.max.x - 600, box.min.y + eyeHeight, center.z);
    scene.add(purpleLight2);

    const purpleLight3 = new THREE.PointLight(0x9b3fff, 2.5, 600);
    purpleLight3.position.set(box.max.x - 450, box.min.y + size.y * 0.9, center.z);
    scene.add(purpleLight3);

    doorSystem = new DoorSystem(scene, camera);
    doorSystem.register(corridor);

    updateButtons();
    infoBox.textContent = 'Nimic selectat';

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
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.005;

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

  if (doorSystem) {
    doorSystem.update(raycaster, mouse, camera);
    doorSystem.updateVoids(time);
  }

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
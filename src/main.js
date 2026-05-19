import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyCorridor } from './corridor.js';
import { DoorSystem } from './doorSystem.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1410);

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

// LIGHTS
scene.add(new THREE.AmbientLight(0xffe8d6, 0.2));
scene.add(new THREE.AmbientLight(0x6b35c8, 0.8));

const mainLight = new THREE.DirectionalLight(0xffd9b3, 0.4);
mainLight.position.set(10, 8, 15);
mainLight.castShadow = true;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xb0c4ff, 0.2);
fillLight.position.set(-20, 5, -10);
scene.add(fillLight);

scene.add(new THREE.HemisphereLight(0xd4e6f1, 0xc4a574, 0.2));

// CURSOR
const cursor = document.createElement('div');
cursor.id = 'cursor';
document.body.appendChild(cursor);
document.body.style.cursor = 'none';

// RAYCASTER
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// INFO BOX
const infoBox = document.createElement('div');
infoBox.id = 'info-box';
infoBox.textContent = 'Se încarcă modelul...';
document.body.appendChild(infoBox);

// FLOOR INDICATOR
const floorIndicator = document.createElement('div');
floorIndicator.id = 'floor-indicator';
floorIndicator.textContent = 'Etajul 1';
document.body.appendChild(floorIndicator);

// MOUSE
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

// NAVIGARE
let currentStop = 0;
let targetPosition = null;
let isMoving = false;
let stops = [];
let initialYaw = Math.PI / 2;

let floor = 1;
const FLOOR_HEIGHT = 900;

let corridorFloor1 = null;
let corridorFloor2 = null;

let doorSystemFloor1 = null;
let doorSystemFloor2 = null;
let activeDoorSystem = null;

let elevatorIsChangingFloor = false;

const ELEVATOR_CLOSE_TIME = 3000;
const ELEVATOR_WAIT_TIME = 3000;
const ELEVATOR_OPEN_TIME = 3000;

// UI NAVIGARE
const navContainer = document.createElement('div');
navContainer.id = 'nav-container';
document.body.appendChild(navContainer);

const btnBack = document.createElement('div');
btnBack.className = 'nav-btn';
btnBack.innerHTML = `
<svg viewBox="0 0 100 55" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,50 L50,0 L100,50 L75,50 L50,28 L25,50 Z" fill="white"/>
</svg>`;

const btnForward = document.createElement('div');
btnForward.className = 'nav-btn';
btnForward.innerHTML = `
<svg viewBox="0 0 100 55" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,5 L50,55 L100,5 L75,5 L50,27 L25,5 Z" fill="white"/>
</svg>`;

navContainer.appendChild(btnBack);
navContainer.appendChild(btnForward);

// UI DOOR ACTIONS
const doorActions = document.createElement('div');
doorActions.id = 'door-actions';
document.body.appendChild(doorActions);

const btnEnter = document.createElement('div');
btnEnter.className = 'door-btn';
btnEnter.innerHTML = `
<svg viewBox="0 0 100 55" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,50 L50,0 L100,50 L75,50 L50,28 L25,50 Z" fill="white"/>
</svg>`;

const btnClose = document.createElement('div');
btnClose.className = 'door-btn';
btnClose.innerHTML = `
<svg viewBox="0 0 100 55" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,5 L50,55 L100,5 L75,5 L50,27 L25,5 Z" fill="white"/>
</svg>`;

doorActions.appendChild(btnEnter);
doorActions.appendChild(btnClose);

// UI LIFT
const elevatorUI = document.createElement('div');
elevatorUI.id = 'elevator-ui';
elevatorUI.innerHTML = `
  <button id="floor1">Etajul 1</button>
  <button id="floor2">Etajul 2</button>
`;
document.body.appendChild(elevatorUI);

elevatorUI.style.opacity = '0';
elevatorUI.style.pointerEvents = 'none';

document.getElementById('floor1').addEventListener('click', (e) => {
  e.stopPropagation();
  goToFloor(1);
});

document.getElementById('floor2').addEventListener('click', (e) => {
  e.stopPropagation();
  goToFloor(2);
});

function updateFloorIndicator() {
  floorIndicator.textContent = `Etajul ${floor}`;
}

function updateButtons() {
  btnBack.style.opacity = currentStop < stops.length - 1 ? '1' : '0.25';
  btnBack.style.pointerEvents = currentStop < stops.length - 1 ? 'auto' : 'none';

  btnForward.style.opacity = currentStop > 0 ? '1' : '0.25';
  btnForward.style.pointerEvents = currentStop > 0 ? 'auto' : 'none';
}

function getFloorOffset() {
  return floor === 2 ? FLOOR_HEIGHT : 0;
}

function moveTo(index) {
  if (isMoving || elevatorIsChangingFloor) return;

  currentStop = index;

  const baseStop = stops[currentStop].clone();
  baseStop.y += getFloorOffset();

  targetPosition = baseStop;
  isMoving = true;

  initialYaw = index === stops.length - 1
    ? Math.PI / 2 + Math.PI
    : Math.PI / 2;

  updateButtons();
}

btnBack.addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentStop < stops.length - 1) moveTo(currentStop + 1);
});

btnForward.addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentStop > 0) moveTo(currentStop - 1);
});

btnClose.addEventListener('click', (e) => {
  e.stopPropagation();

  if (activeDoorSystem && activeDoorSystem.lastOpenedDoor) {
    const door = activeDoorSystem.lastOpenedDoor;
    door.state = 'closed';
    door.targetAngle = 0;
    door.light.intensity = 0;
    activeDoorSystem.lastOpenedDoor = null;
  }

  isMoving = false;
  moveTo(currentStop);

  doorActions.style.opacity = '0';
  doorActions.style.pointerEvents = 'none';

  navContainer.style.opacity = '1';
  navContainer.style.pointerEvents = 'auto';
});

btnEnter.addEventListener('click', (e) => {
  e.stopPropagation();

  doorActions.style.opacity = '0';
  doorActions.style.pointerEvents = 'none';
});

function goToFloor(targetFloor) {
  if (!activeDoorSystem) return;
  if (floor === targetFloor) return;
  if (elevatorIsChangingFloor) return;

  elevatorIsChangingFloor = true;

  elevatorUI.style.opacity = '0';
  elevatorUI.style.pointerEvents = 'none';

  navContainer.style.opacity = '0';
  navContainer.style.pointerEvents = 'none';

  activeDoorSystem.setElevatorLocked(true);

  // 1. Ușile se închid lent
  activeDoorSystem.closeElevatorDoorsSlow();

  setTimeout(() => {
    // 2. După ce s-au închis, stai 3 secunde în lift
    setTimeout(() => {
      // 3. Schimbă etajul
      floor = targetFloor;
      updateFloorIndicator();

      activeDoorSystem = floor === 1 ? doorSystemFloor1 : doorSystemFloor2;

      camera.position.y = stops[currentStop].y + getFloorOffset();

      activeDoorSystem.setElevatorLocked(true);

      // 4. La etajul nou, ușile pornesc închise și se deschid lent
      activeDoorSystem.openElevatorDoorsSlow();

      setTimeout(() => {
        activeDoorSystem.setElevatorLocked(false);
        activeDoorSystem.clearElevatorManualAnimation();

        elevatorIsChangingFloor = false;

        navContainer.style.opacity = '1';
        navContainer.style.pointerEvents = 'auto';
      }, ELEVATOR_OPEN_TIME);
    }, ELEVATOR_WAIT_TIME);
  }, ELEVATOR_CLOSE_TIME);
}

// CLICK PE UȘI
window.addEventListener('click', (e) => {
  if (e.target.closest('#nav-container')) return;
  if (e.target.closest('#door-actions')) return;
  if (e.target.closest('#elevator-ui')) return;
  if (elevatorIsChangingFloor) return;

  if (!activeDoorSystem) return;

  activeDoorSystem.onClick(raycaster, mouse, camera, (doorPos) => {
    const offsetX = 80;
    const targetZ = doorPos.z > 0 ? doorPos.z - offsetX : doorPos.z + offsetX;

    targetPosition = new THREE.Vector3(
      doorPos.x,
      camera.position.y,
      targetZ
    );

    isMoving = true;
    initialYaw = doorPos.z > 0 ? Math.PI : 0;

    doorActions.style.opacity = '1';
    doorActions.style.pointerEvents = 'auto';

    navContainer.style.opacity = '0';
    navContainer.style.pointerEvents = 'none';
  });
});

// LOAD MODEL
const loader = new GLTFLoader();

loader.load(
  '/models/corridor.glb',

  (gltf) => {
    corridorFloor1 = gltf.scene;
    corridorFloor1.rotation.y = Math.PI / 2;
    corridorFloor1.updateMatrixWorld(true);

    corridorFloor2 = corridorFloor1.clone(true);
    corridorFloor2.position.y += FLOOR_HEIGHT;
    corridorFloor2.updateMatrixWorld(true);

    applyCorridor(corridorFloor1);
    applyCorridor(corridorFloor2);

    scene.add(corridorFloor1);
    scene.add(corridorFloor2);

    const box = new THREE.Box3().setFromObject(corridorFloor1);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const eyeHeight = size.y * 0.65;

    stops = [
      new THREE.Vector3(box.max.x - 50, box.min.y + eyeHeight, center.z),
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
      metalness: 0,
      emissive: 0xf0ebe3,
      emissiveIntensity: 0.1,
    });

    const spawnWall1 = new THREE.Mesh(wallGeometry, wallMaterial);
    spawnWall1.position.set(box.max.x, box.min.y + size.y / 2, center.z);
    scene.add(spawnWall1);

    const spawnWall2 = spawnWall1.clone();
    spawnWall2.position.y += FLOOR_HEIGHT;
    scene.add(spawnWall2);

    const spawnLight1 = new THREE.PointLight(0xffe8d6, 1.5, 300);
    spawnLight1.position.set(box.max.x - 30, box.min.y + eyeHeight, center.z);
    scene.add(spawnLight1);

    const spawnLight2 = spawnLight1.clone();
    spawnLight2.position.y += FLOOR_HEIGHT;
    scene.add(spawnLight2);

    const purpleLight1 = new THREE.PointLight(0x7b2fff, 3, 800);
    purpleLight1.position.set(box.max.x - 300, box.min.y + eyeHeight, center.z);
    scene.add(purpleLight1);

    const purpleLight2 = purpleLight1.clone();
    purpleLight2.position.y += FLOOR_HEIGHT;
    scene.add(purpleLight2);

    const purpleLight3 = new THREE.PointLight(0x9b3fff, 2.5, 600);
    purpleLight3.position.set(box.max.x - 450, box.min.y + size.y * 0.9, center.z);
    scene.add(purpleLight3);

    const purpleLight4 = purpleLight3.clone();
    purpleLight4.position.y += FLOOR_HEIGHT;
    scene.add(purpleLight4);

    doorSystemFloor1 = new DoorSystem(scene, camera);
    doorSystemFloor1.register(corridorFloor1);

    doorSystemFloor2 = new DoorSystem(scene, camera);
    doorSystemFloor2.register(corridorFloor2);

    activeDoorSystem = doorSystemFloor1;

    updateButtons();
    updateFloorIndicator();

    infoBox.textContent = 'Nimic selectat';
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

// RESIZE
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function checkElevatorUI() {
  if (elevatorIsChangingFloor) return;
  if (!activeDoorSystem || activeDoorSystem.elevatorDoors.length === 0) return;

  const elevator = activeDoorSystem.elevatorDoors[0];

  const dx = camera.position.x - elevator.centerPos.x;
  const dz = camera.position.z - elevator.centerPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < 120) {
    elevatorUI.style.opacity = '1';
    elevatorUI.style.pointerEvents = 'auto';
  } else {
    elevatorUI.style.opacity = '0';
    elevatorUI.style.pointerEvents = 'none';
  }
}

// LOOP
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

  if (doorSystemFloor1) {
    doorSystemFloor1.update(raycaster, mouse, camera);
    doorSystemFloor1.updateVoids(time);
  }

  if (doorSystemFloor2) {
    doorSystemFloor2.update(raycaster, mouse, camera);
    doorSystemFloor2.updateVoids(time);
  }

  checkElevatorUI();

  if (corridorFloor1 && corridorFloor2) {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(
      [corridorFloor1, corridorFloor2],
      true
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      const pos = hit.point;

      infoBox.textContent =
        `Etaj: ${floor}` +
        ` | Mesh: "${hit.object.name || 'fără nume'}"` +
        ` | X:${pos.x.toFixed(0)}` +
        ` Y:${pos.y.toFixed(0)}` +
        ` Z:${pos.z.toFixed(0)}`;
    } else {
      infoBox.textContent = `Etaj: ${floor} | Nimic selectat`;
    }
  }

  renderer.render(scene, camera);
}

animate();
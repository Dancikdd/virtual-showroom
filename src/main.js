import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyCorridor } from './corridor.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1410);

const canvas = document.getElementById('canvas');
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// ====== ILUMINARE ======
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

// ====== CURSOR CUSTOM ======
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

// ====== RAYCASTER INSPECTOR ======
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
document.body.appendChild(infoBox);

// ====== MOUSE ======
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

// ====== SCROLL ======
let velocity = 0;
window.addEventListener('wheel', (e) => {
    velocity += e.deltaY * 0.01;
});

// ====== ÎNCARCĂ MODELUL ======
const loader = new GLTFLoader();
const corridors = [];
let corridorLength = 0;
let startZ = 0;

loader.load('/models/corridor_hotel2.glb', (gltf) => {
    const original = gltf.scene;
    original.rotation.y = Math.PI / 2;

    // Forțează actualizarea matricei înainte de a calcula box-ul
    original.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(original);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Acum size.z e lungimea reală a coridorului pe axa de mers
    corridorLength = size.z * 0.96; // Mică ajustare pentru a preveni gap-uri vizibile

    console.log('Size după rotație:', size);
    console.log('corridorLength (Z):', corridorLength);

    const EYE_HEIGHT = size.y * 0.55;
    camera.position.set(center.x - 270, box.min.y + EYE_HEIGHT, center.z + corridorLength + 1700);
    startZ = camera.position.z;

    for (let i = 0; i < 3; i++) {
        const clone = original.clone();
        clone.position.z = center.z - i * corridorLength; 
        scene.add(clone);
        applyCorridor(clone, scene);
        corridors.push(clone);
    }

    console.log('✓ Model încărcat! corridorLength:', corridorLength);
},

(progress) => {
    const percent = Math.round((progress.loaded / progress.total) * 100);
    console.log(`Încărcare: ${percent}%`);
},
(error) => {
    console.error('❌ Eroare:', error);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ====== LOOP ======
function animate() {
    requestAnimationFrame(animate);

    const targetYaw = -mouseX * Math.PI * 0.4;
    const targetPitch = -mouseY * Math.PI * 0.15;
    camera.rotation.order = 'YXZ';
    camera.rotation.y += (targetYaw - camera.rotation.y) * 0.05;
    camera.rotation.x += (targetPitch - camera.rotation.x) * 0.05;

    camera.position.z -= velocity * 5;
    velocity *= 0.9;
    if (Math.abs(velocity) < 0.001) velocity = 0;

    const totalLength = corridorLength * corridors.length;

    if (corridorLength > 0) {
        corridors.forEach((c) => {
            if (c.position.z - camera.position.z > totalLength * 0.6) {
                c.position.z -= totalLength;
            }
            if (camera.position.z - c.position.z > totalLength * 0.6) {
                c.position.z += totalLength;
            }
        });
    }

    // ====== RAYCASTER UPDATE ======
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        const hit = intersects[0];
        const pos = hit.point;
        infoBox.textContent = `Mesh: "${hit.object.name}" | X: ${pos.x.toFixed(0)} Y: ${pos.y.toFixed(0)} Z: ${pos.z.toFixed(0)}`;
    } else {
        infoBox.textContent = 'Nimic selectat';
    }

    renderer.render(scene, camera);
}

animate();
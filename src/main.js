import * as THREE from 'three'
import { createCorridor } from './corridor.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x222222)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 2, 10)

const canvas = document.getElementById('canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)

// Lumini
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)
const pointLight = new THREE.PointLight(0xffffff, 1, 50)
pointLight.position.set(0, 3, 0)
scene.add(pointLight)

// Cream 3 coridoare identice unul dupa altul
const CORRIDOR_LENGTH = 30  // lungimea unui coridor
const corridors = []

for (let i = -1; i <= 1; i++) {
  const group = new THREE.Group()
  group.position.z = i * CORRIDOR_LENGTH
  scene.add(group)
  createCorridor(group)  // fiecare coridor intr-un group separat
  corridors.push(group)
}

// Mouse
let mouseX = 0
let mouseY = 0
document.addEventListener('mousemove', e => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2
})

// Cursor custom
const cursor = document.createElement('div')
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
`
document.body.appendChild(cursor)
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px'
  cursor.style.top = e.clientY + 'px'
})
document.body.style.cursor = 'none'

// Scroll
let velocity = 0
window.addEventListener('wheel', e => {
  velocity += e.deltaY * 0.01
})

function animate() {
  requestAnimationFrame(animate)

  // Camera mouse smooth
  const targetYaw = -mouseX * Math.PI * 0.4
  const targetPitch = -mouseY * Math.PI * 0.15
  camera.rotation.order = 'YXZ'
  camera.rotation.y += (targetYaw - camera.rotation.y) * 0.05
  camera.rotation.x += (targetPitch - camera.rotation.x) * 0.05

  // Miscare scroll
  const yaw = camera.rotation.y
  camera.position.x -= Math.sin(yaw) * velocity * 0.1
  camera.position.z -= Math.cos(yaw) * velocity * 0.1
  velocity *= 0.9
  if (Math.abs(velocity) < 0.001) velocity = 0

  // ── Infinit loop ──
if (camera.position.z < -15) camera.position.z += 30
if (camera.position.z > 15) camera.position.z -= 30

  renderer.render(scene, camera)
}
animate()
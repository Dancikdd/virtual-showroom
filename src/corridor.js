import * as THREE from 'three'

export function createCorridor(group) {
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    side: THREE.DoubleSide
  })

  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    side: THREE.DoubleSide
  })

  // Podea
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 30),
    new THREE.MeshStandardMaterial({ color: 0xcccccc })
  )
  floor.rotation.x = -Math.PI / 2
  group.add(floor)

  // Tavan
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 30),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
  )
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = 4
  group.add(ceiling)

  const doors = []

  function createWallSegment(x, y, z, width, height, rotationY) {
    const segment = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      wallMaterial
    )
    segment.position.set(x, y, z)
    segment.rotation.y = rotationY
    group.add(segment)
    return segment
  }

  function createDoor(x, y, z, rotationY) {
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 0.1),
      doorMaterial
    )
    doorFrame.position.set(x, y, z)
    doorFrame.rotation.y = rotationY
    group.add(doorFrame)

    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 2),
      doorMaterial
    )
    door.position.set(x, y, z)
    door.rotation.y = rotationY
    group.add(door)

    doors.push({ position: new THREE.Vector3(x, y, z), rotation: rotationY })
    return door
  }

  // Pereti stanga/dreapta
  const wallSegments = [
    createWallSegment(-3, 2, -12, 6, 4, Math.PI / 2),
    createWallSegment(-3, 2, -2, 6, 4, Math.PI / 2),
    createWallSegment(-3, 2, 8, 6, 4, Math.PI / 2),
    createWallSegment(3, 2, -12, 6, 4, -Math.PI / 2),
    createWallSegment(3, 2, -2, 6, 4, -Math.PI / 2),
    createWallSegment(3, 2, 8, 6, 4, -Math.PI / 2),
  ]

  // Usi laterale
  const sideDoors = [
    createDoor(-3, 1.5, -7, Math.PI / 2),
    createDoor(-3, 1.5, 3, Math.PI / 2),
    createDoor(-3, 1.5, 13, Math.PI / 2),
    createDoor(3, 1.5, -7, -Math.PI / 2),
    createDoor(3, 1.5, 3, -Math.PI / 2),
    createDoor(3, 1.5, 13, -Math.PI / 2),
  ]

  // ── Perete FAȚĂ (capăt z = +15) cu ușă centrată ──
  const frontWallLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 4),
    wallMaterial
  )
  frontWallLeft.position.set(-1.8, 2, 15)
  group.add(frontWallLeft)

  const frontWallRight = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 4),
    wallMaterial
  )
  frontWallRight.position.set(1.8, 2, 15)
  group.add(frontWallRight)

  const frontWallTop = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.8),  // deasupra usii
    wallMaterial
  )
  frontWallTop.position.set(0, 3.1, 15)
  group.add(frontWallTop)

  const frontDoor = createDoor(0, 1.1, 15, 0)  // usa centrata

  // ── Perete SPATE (capăt z = -15) cu ușă centrată ──
  const backWallLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 4),
    wallMaterial
  )
  backWallLeft.position.set(-1.8, 2, -15)
  backWallLeft.rotation.y = Math.PI
  group.add(backWallLeft)

  const backWallRight = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 4),
    wallMaterial
  )
  backWallRight.position.set(1.8, 2, -15)
  backWallRight.rotation.y = Math.PI
  group.add(backWallRight)

  const backWallTop = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.8),
    wallMaterial
  )
  backWallTop.position.set(0, 3.1, -15)
  backWallTop.rotation.y = Math.PI
  group.add(backWallTop)

  const backDoor = createDoor(0, 1.1, -15, Math.PI)  // usa centrata

  return { floor, ceiling, wallSegments, sideDoors, frontDoor, backDoor, doors }
}
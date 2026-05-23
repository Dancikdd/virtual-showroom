import * as THREE from 'three';

const DOOR_EXCLUDES = ['frame', 'tocul', 'rama', 'casing'];

const DOOR_DIRECTION_OVERRIDES = {
  'floor1_door_001': -1,
  'floor1_door_004': -1,
  'floor1_door_005': -1,
  'floor1_door_006': -1,
  'floor2_door_001': -1,
  'floor2_door_004': -1,
  'floor2_door_005': -1,
  'floor2_door_006': -1,
};

const DOOR_PIVOT_OVERRIDES = {
  'floor1_door_001': 'min',
  'floor1_door_004': 'max',
  'floor1_door_005': 'min',
  'floor1_door_006': 'max',
  'floor2_door_001': 'min',
  'floor2_door_004': 'max',
  'floor2_door_005': 'min',
  'floor2_door_006': 'max',
};

const HOVER_ANGLE = Math.PI / 20;
const OPEN_ANGLE = Math.PI / 2.3;

const NORMAL_DOOR_SPEED = 0.03;
const ELEVATOR_DOOR_SPEED = 0.08;

function getDoorNumber(name) {
  const match = name.match(/(\d{3})/);
  return match ? match[1] : null;
}

function getElevatorKey(name) {
  const n = name.toLowerCase();
  if (!n.includes('elevator')) return null;

  const side = n.includes('left') ? 'left' : n.includes('right') ? 'right' : 'center';
  const loc = n.includes('inside') ? 'inside' : 'outside';

  return `elevator_${loc}_${side}`;
}

function createVoidEffect(scene, centerPos, doorSize) {
  const zDir = centerPos.z > 0 ? 1 : -1;

  const voidW = doorSize.x * 3;
  const voidH = doorSize.y * 2;
  const voidDepth = 400;
  const wallOffset = 60;

  const starCount = 200;
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = centerPos.x + (Math.random() - 0.5) * voidW;
    positions[i * 3 + 1] = centerPos.y + (Math.random() - 0.5) * voidH;
    positions[i * 3 + 2] = centerPos.z + zDir * (wallOffset + Math.random() * voidDepth);
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.8,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
  });

  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const colorCount = 200;
  const colorGeo = new THREE.BufferGeometry();
  const colorPos = new Float32Array(colorCount * 3);

  for (let i = 0; i < colorCount; i++) {
    colorPos[i * 3] = centerPos.x + (Math.random() - 0.5) * voidW;
    colorPos[i * 3 + 1] = centerPos.y + (Math.random() - 0.5) * voidH;
    colorPos[i * 3 + 2] = centerPos.z + zDir * (wallOffset + Math.random() * voidDepth);
  }

  colorGeo.setAttribute('position', new THREE.BufferAttribute(colorPos, 3));

  const colorMat = new THREE.PointsMaterial({
    color: 0xaa77ff,
    size: 2.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
  });

  const colorStars = new THREE.Points(colorGeo, colorMat);
  scene.add(colorStars);

  const voidLight = new THREE.PointLight(0x6600ff, 0, 300);
  voidLight.position.set(centerPos.x, centerPos.y, centerPos.z + zDir * 50);
  scene.add(voidLight);

  return { stars, colorStars, voidLight };
}

export class DoorSystem {
  constructor(scene, camera, floorId = 'floor1') {
    this.scene = scene;
    this.camera = camera;
    this.doors = [];
    this.elevatorDoors = [];
    this.hoveredDoor = null;
    this.voidSystems = [];
    this.lastOpenedDoor = null;
    this.elevatorLocked = false;
    this.floorId = floorId;
  }

  register(corridor) {
    const buckets = {};
    const elevatorBuckets = {};

    corridor.traverse((node) => {
      if (!node.isMesh) return;

      const n = node.name.toLowerCase();
      if (!n.includes('door')) return;
      if (DOOR_EXCLUDES.some((ex) => n.includes(ex))) return;

      const elevatorKey = getElevatorKey(node.name);

      if (elevatorKey) {
        if (!elevatorBuckets[elevatorKey]) elevatorBuckets[elevatorKey] = [];
        elevatorBuckets[elevatorKey].push(node);
        return;
      }

      const num = getDoorNumber(node.name);
      const key = num ? `${this.floorId}_door_${num}` : null;
      
      if (!key) return;

      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(node);
    });

    Object.entries(buckets).forEach(([key, meshes]) => {
      this._createNormalDoor(corridor, key, meshes);
    });

    Object.entries(elevatorBuckets).forEach(([key, meshes]) => {
      this._createElevatorDoor(corridor, key, meshes);
    });
  }

  _createNormalDoor(corridor, key, meshes) {
    const combinedBox = new THREE.Box3();
    meshes.forEach((m) => combinedBox.union(new THREE.Box3().setFromObject(m)));

    const center = combinedBox.getCenter(new THREE.Vector3());
    const size = combinedBox.getSize(new THREE.Vector3());
    const widerOnZ = size.z > size.x;

    const pivotX = (() => {
      if (DOOR_PIVOT_OVERRIDES[key] === 'min') return combinedBox.min.x;
      if (DOOR_PIVOT_OVERRIDES[key] === 'max') return combinedBox.max.x;
      return center.x > 0 ? combinedBox.min.x : combinedBox.max.x;
    })();

    const pivotWorld = widerOnZ
      ? new THREE.Vector3(
          center.x,
          combinedBox.min.y,
          center.z > 0 ? combinedBox.max.z : combinedBox.min.z
        )
      : new THREE.Vector3(pivotX, combinedBox.min.y, center.z);

    const pivotGroup = new THREE.Group();
    pivotGroup.position.copy(corridor.worldToLocal(pivotWorld.clone()));
    corridor.add(pivotGroup);

    meshes.forEach((mesh) => {
      mesh.updateWorldMatrix(true, false);

      const wPos = new THREE.Vector3();
      const wQuat = new THREE.Quaternion();
      const wScale = new THREE.Vector3();

      mesh.matrixWorld.decompose(wPos, wQuat, wScale);

      pivotGroup.add(mesh);
      mesh.position.copy(pivotGroup.worldToLocal(wPos.clone()));

      const gQuat = new THREE.Quaternion();
      pivotGroup.getWorldQuaternion(gQuat);

      mesh.quaternion.copy(gQuat.clone().invert().multiply(wQuat));
      mesh.scale.copy(wScale);
    });

    const light = new THREE.PointLight(0xffe8aa, 0, 300);
    light.position.set(center.x, center.y + 50, center.z);
    this.scene.add(light);

    const voidSystem = createVoidEffect(this.scene, center.clone(), size);
    this.voidSystems.push(voidSystem);

    this.doors.push({
      key,
      meshes,
      group: pivotGroup,
      light,
      targetAngle: 0,
      state: 'closed',
      centerPos: center.clone(),
      widerOnZ,
      isLeftSide: center.z < 0,
    });
  }

  _createElevatorDoor(corridor, key, meshes) {
    const combinedBox = new THREE.Box3();
    meshes.forEach((m) => combinedBox.union(new THREE.Box3().setFromObject(m)));

    const center = combinedBox.getCenter(new THREE.Vector3());
    const size = combinedBox.getSize(new THREE.Vector3());
    const widerOnZ = size.z > size.x;

    const pivotWorld = widerOnZ
      ? new THREE.Vector3(
          center.x,
          combinedBox.min.y,
          center.z > 0 ? combinedBox.max.z : combinedBox.min.z
        )
      : new THREE.Vector3(center.x, combinedBox.min.y, center.z);

    const pivotGroup = new THREE.Group();
    pivotGroup.position.copy(corridor.worldToLocal(pivotWorld.clone()));
    corridor.add(pivotGroup);

    meshes.forEach((mesh) => {
      mesh.updateWorldMatrix(true, false);

      const wPos = new THREE.Vector3();
      const wQuat = new THREE.Quaternion();
      const wScale = new THREE.Vector3();

      mesh.matrixWorld.decompose(wPos, wQuat, wScale);

      pivotGroup.add(mesh);
      mesh.position.copy(pivotGroup.worldToLocal(wPos.clone()));

      const gQuat = new THREE.Quaternion();
      pivotGroup.getWorldQuaternion(gQuat);

      mesh.quaternion.copy(gQuat.clone().invert().multiply(wQuat));
      mesh.scale.copy(wScale);
    });

    const light = new THREE.PointLight(0xffe8aa, 0, 300);
    light.position.set(center.x, center.y + 50, center.z);
    this.scene.add(light);

    const slideAxis = widerOnZ ? 'x' : 'z';
    const slideDir = key.includes('left') ? -1 : 1;
    const slideDistance = 50;

    const openPosition = pivotGroup.position.clone();
    const closedPosition = openPosition.clone();

    closedPosition[slideAxis] -= slideDir * slideDistance;

    pivotGroup.position.copy(closedPosition);
    pivotGroup.updateMatrixWorld(true);

    this.elevatorDoors.push({
      key,
      elevatorKey: key,
      meshes,
      group: pivotGroup,
      light,
      state: 'closed',
      centerPos: center.clone(),
      widerOnZ,
      closedPosition,
      openPosition,
      manualTargetPosition: null,
    });
  }

  _getDirection(door) {
    if (DOOR_DIRECTION_OVERRIDES[door.key] !== undefined) {
      return DOOR_DIRECTION_OVERRIDES[door.key];
    }

    return door.centerPos.z > 0 ? 1 : -1;
  }

  setElevatorLocked(value) {
    this.elevatorLocked = value;
  }

  closeElevatorDoorsSlow() {
    this.elevatorDoors.forEach((door) => {
      door.manualTargetPosition = door.closedPosition.clone();
    });
  }

  openElevatorDoorsSlow() {
    this.elevatorDoors.forEach((door) => {
      door.group.position.copy(door.closedPosition);
      door.manualTargetPosition = door.openPosition.clone();
    });
  }

  clearElevatorManualAnimation() {
    this.elevatorDoors.forEach((door) => {
      door.manualTargetPosition = null;
    });
  }

  updateVoids(time) {
    this.voidSystems.forEach(({ stars, colorStars, voidLight }, i) => {
      const door = this.doors[i];
      const isOpen = door && door.state === 'open';

      stars.material.opacity += (
        (isOpen ? 0.85 + Math.sin(time + i) * 0.1 : 0) - stars.material.opacity
      ) * 0.05;

      colorStars.material.opacity += (
        (isOpen ? 0.7 + Math.sin(time * 1.3 + i) * 0.15 : 0) - colorStars.material.opacity
      ) * 0.05;

      voidLight.intensity += ((isOpen ? 1.5 : 0) - voidLight.intensity) * 0.05;
    });
  }

  update(raycaster, mouse, camera) {
    if (this.doors.length === 0 && this.elevatorDoors.length === 0) return;

    const allMeshes = this.doors.flatMap((d) => d.meshes);

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(allMeshes, false);

    let hitDoor = null;

    if (hits.length > 0) {
      hitDoor = this.doors.find((d) => d.meshes.includes(hits[0].object));
    }

    this.doors.forEach((door) => {
      if (door.state === 'open') {
        door.group.rotation.y += (door.targetAngle - door.group.rotation.y) * NORMAL_DOOR_SPEED;
        door.light.intensity += (2 - door.light.intensity) * 0.05;
        return;
      }

      if (door === hitDoor && door.state !== 'hover') {
        door.state = 'hover';
        door.targetAngle = HOVER_ANGLE * this._getDirection(door);
      } else if (door !== hitDoor && door.state === 'hover') {
        door.state = 'closed';
        door.targetAngle = 0;
      }

      door.light.intensity += (
        (door.state === 'hover' ? 1.5 : 0) - door.light.intensity
      ) * 0.08;

      door.group.rotation.y += (door.targetAngle - door.group.rotation.y) * NORMAL_DOOR_SPEED;
    });

    this.elevatorDoors.forEach((door) => {
      let targetPos = null;

      if (door.manualTargetPosition) {
        targetPos = door.manualTargetPosition;
        door.light.intensity += (2 - door.light.intensity) * 0.05;
      } else if (!this.elevatorLocked) {
        const dx = camera.position.x - door.centerPos.x;
        const dz = camera.position.z - door.centerPos.z;
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

        const openDistance = 200;
        const closeDistance = 220;

        let openRatio = 0;

        if (horizontalDistance <= openDistance) {
          openRatio = 1;
        } else if (horizontalDistance < closeDistance) {
          openRatio = (closeDistance - horizontalDistance) / (closeDistance - openDistance);
        }

        targetPos = door.closedPosition.clone().lerp(door.openPosition, openRatio);

        door.light.intensity += (
          (openRatio > 0 ? 2 : 0) - door.light.intensity
        ) * 0.05;
      }

      if (targetPos) {
        door.group.position.lerp(targetPos, ELEVATOR_DOOR_SPEED);

        if (door.group.position.distanceTo(targetPos) < 0.1) {
          door.group.position.copy(targetPos);
        }
      }
    });

    this.hoveredDoor = hitDoor || null;
  }

  onClick(raycaster, mouse, camera, onDoorOpen) {
    if (!this.hoveredDoor) return;

    const door = this.hoveredDoor;

    if (door.state === 'open') return;
    if (this.lastOpenedDoor) return;

    door.state = 'open';
    door.targetAngle = OPEN_ANGLE * this._getDirection(door);
    door.light.intensity = 3;
    this.lastOpenedDoor = door;

    if (typeof onDoorOpen === 'function') {
      onDoorOpen(door.centerPos);
    }
  }
}
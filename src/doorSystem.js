import * as THREE from 'three';

const DOOR_EXCLUDES = ['frame', 'tocul', 'rama', 'casing'];

// ─────────────────────────────────────────────────────────────
// DIRECȚIE: 1 sau -1 pentru fiecare ușă
// ─────────────────────────────────────────────────────────────
const DOOR_DIRECTION_OVERRIDES = {
  'door_001': -1,
  'door_004': -1,
  'door_005': -1,
  'door_006': -1,
};

// ─────────────────────────────────────────────────────────────
// PIVOT (BALAMALE): 'min' sau 'max' pe axa X
// 'min' = marginea stângă, 'max' = marginea dreaptă
// ─────────────────────────────────────────────────────────────
const DOOR_PIVOT_OVERRIDES = {
  'door_001': 'min',
  'door_004': 'max',
  'door_005': 'min',
  'door_006': 'max',
};

// ─────────────────────────────────────────────────────────────
// UNGHI DESCHIDERE
// HOVER_ANGLE  = deschidere mică la hover (radiani)
// OPEN_ANGLE   = deschidere completă la click (radiani)
// Math.PI / 20 ≈ 9°  |  Math.PI / 1.8 ≈ 100°
// ─────────────────────────────────────────────────────────────
const HOVER_ANGLE = Math.PI / 20;   // 9°  — modifică după gust
const OPEN_ANGLE  = Math.PI / 1.8;  // 100° — modifică după gust

function getDoorNumber(name) {
  const match = name.match(/(\d{3})/);
  return match ? match[1] : null;
}

function getElevatorKey(name) {
  const n = name.toLowerCase();
  if (!n.includes('elevator')) return null;
  const side = n.includes('left') ? 'left' : n.includes('right') ? 'right' : 'center';
  const loc  = n.includes('inside') ? 'inside' : 'outside';
  return `elevator_${loc}_${side}`;
}

export class DoorSystem {
  constructor(scene, camera) {
    this.scene         = scene;
    this.camera        = camera;
    this.doors         = [];
    this.elevatorDoors = [];
    this.hoveredDoor   = null;
  }

  register(corridor) {
    const buckets = {};
    const elevatorBuckets = {};

    corridor.traverse((node) => {
      if (!node.isMesh) return;
      const n = node.name.toLowerCase();
      if (!n.includes('door')) return;
      if (DOOR_EXCLUDES.some(ex => n.includes(ex))) return;

      const elevatorKey = getElevatorKey(node.name);
      if (elevatorKey) {
        if (!elevatorBuckets[elevatorKey]) elevatorBuckets[elevatorKey] = [];
        elevatorBuckets[elevatorKey].push(node);
        return;
      }

      const num = getDoorNumber(node.name);
      const key = num ? `door_${num}` : null;
      if (!key) return;

      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(node);
    });

    Object.entries(buckets).forEach(([key, meshes]) => {
      if (meshes.length === 0) return;

      const combinedBox = new THREE.Box3();
      meshes.forEach((m) => combinedBox.union(new THREE.Box3().setFromObject(m)));
      const center = combinedBox.getCenter(new THREE.Vector3());
      const size   = combinedBox.getSize(new THREE.Vector3());

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
        : new THREE.Vector3(
            pivotX,
            combinedBox.min.y,
            center.z
          );

      const pivotGroup = new THREE.Group();
      pivotGroup.position.copy(corridor.worldToLocal(pivotWorld.clone()));
      corridor.add(pivotGroup);

      meshes.forEach((mesh) => {
        mesh.updateWorldMatrix(true, false);
        const wPos   = new THREE.Vector3();
        const wQuat  = new THREE.Quaternion();
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

      this.doors.push({
        key,
        meshes,
        group:       pivotGroup,
        light,
        targetAngle: 0,
        state:       'closed',
        centerPos:   center.clone(),
        widerOnZ,
        isLeftSide:  center.z < 0,
      });

      console.log(`🚪 "${key}":`, meshes.map(m => m.name).join(' + '),
        `| widerOnZ: ${widerOnZ} | pivot:`, pivotWorld,
        `| pivotOverride: ${DOOR_PIVOT_OVERRIDES[key] || 'auto'}`);
    });

    Object.entries(elevatorBuckets).forEach(([key, meshes]) => {
      if (meshes.length === 0) return;

      const combinedBox = new THREE.Box3();
      meshes.forEach((m) => combinedBox.union(new THREE.Box3().setFromObject(m)));
      const center = combinedBox.getCenter(new THREE.Vector3());
      const size   = combinedBox.getSize(new THREE.Vector3());

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
        : new THREE.Vector3(
            pivotX,
            combinedBox.min.y,
            center.z
          );

      const pivotGroup = new THREE.Group();
      pivotGroup.position.copy(corridor.worldToLocal(pivotWorld.clone()));
      corridor.add(pivotGroup);

      meshes.forEach((mesh) => {
        mesh.updateWorldMatrix(true, false);
        const wPos   = new THREE.Vector3();
        const wQuat  = new THREE.Quaternion();
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
        group:           pivotGroup,
        light,
        targetAngle:     0,
        state:           'closed',
        centerPos:       center.clone(),
        widerOnZ,
        closedPosition,
        openPosition,
      });

      console.log(`🛗 "${key}":`, meshes.map(m => m.name).join(' + '),
        `| widerOnZ: ${widerOnZ} | pivot:`, pivotWorld);
    });

    console.log(`Total grupuri uși: ${this.doors.length} | elevator doors: ${this.elevatorDoors.length}`);
  }

  _getDirection(door) {
    if (door.elevatorKey) {
      if (door.elevatorKey.includes('left')) return -1;
      if (door.elevatorKey.includes('right')) return 1;
      return door.centerPos.z > 0 ? 1 : -1;
    }

    if (DOOR_DIRECTION_OVERRIDES[door.key] !== undefined) {
      return DOOR_DIRECTION_OVERRIDES[door.key];
    }
    return door.centerPos.z > 0 ? 1 : -1;
  }

  update(raycaster, mouse, camera) {
        
    if (this.doors.length === 0 && this.elevatorDoors.length === 0) return;

    const allMeshes = this.doors.flatMap(d => d.meshes);

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(allMeshes, false);

    let hitDoor = null;
    if (hits.length > 0) {
      hitDoor = this.doors.find(d => d.meshes.includes(hits[0].object));
    }

    this.doors.forEach((door) => {

      if (door.state === 'open') {
        door.group.rotation.y += (door.targetAngle - door.group.rotation.y) * 0.07;
        door.light.intensity  += (2 - door.light.intensity) * 0.05;
        return;
      }

      if (door === hitDoor && door.state !== 'hover') {
        door.state = 'hover';
        door.targetAngle = HOVER_ANGLE * this._getDirection(door);
      }
      else if (door !== hitDoor && door.state === 'hover') {
        door.state = 'closed';
        door.targetAngle = 0;
      }

      door.light.intensity += (
        (door.state === 'hover' ? 1.5 : 0) - door.light.intensity
      ) * 0.08;

      door.group.rotation.y += (door.targetAngle - door.group.rotation.y) * 0.05;
    });

    this.elevatorDoors.forEach((door) => {
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

      const targetPos = door.closedPosition.clone().lerp(door.openPosition, openRatio);

      if (!door.group.position.equals(targetPos)) {
        door.group.position.lerp(targetPos, 0.25);
        if (door.group.position.distanceTo(targetPos) < 0.1) {
          door.group.position.copy(targetPos);
        }
      }

      door.light.intensity += (
        (openRatio > 0 ? 2 : 0) - door.light.intensity
      ) * 0.05;
    });

    this.hoveredDoor = hitDoor || null;
  }

    onClick(raycaster, mouse, camera, onDoorOpen) {
    if (!this.hoveredDoor) return;
    const door = this.hoveredDoor;
    if (door.state === 'open') return;
    
    // ← blochează dacă există deja o ușă deschisă
    if (this.lastOpenedDoor) return;

    door.state       = 'open';
    door.targetAngle = OPEN_ANGLE * this._getDirection(door);
    door.light.intensity = 3;
    this.lastOpenedDoor = door;

    if (typeof onDoorOpen === 'function') {
        onDoorOpen(door.centerPos);
    }
    }
    
}
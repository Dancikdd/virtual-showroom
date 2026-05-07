import * as THREE from 'three';

export function applyCorridor(corridor, scene) {
    const box = new THREE.Box3().setFromObject(corridor);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const materialPalette = {
        walls:   { color: 0xe8dcc8, roughness: 0.85, metalness: 0.0 },
        floor:   { color: 0xa89068, roughness: 0.6,  metalness: 0.0 },
        ceiling: { color: 0xf5f1ed, roughness: 0.8,  metalness: 0.0 },
        metal:   { color: 0xc0a080, roughness: 0.3,  metalness: 0.8 },
        door:    { color: 0x5c4a35, roughness: 0.5,  metalness: 0.1 },
        glass:   { color: 0xe6f2ff, roughness: 0.1,  metalness: 0.3, transparent: true, opacity: 0.7 }
    };

    corridor.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            
        if (node.name === 'Plane020_teto_0') {
            node.visible = false;
        }
            const n = node.name.toLowerCase();
            let mat;

            if (n.includes('wall') || n.includes('paret')) {
                mat = new THREE.MeshStandardMaterial(materialPalette.walls);
            } else if (n.includes('floor') || n.includes('podea')) {
                mat = new THREE.MeshStandardMaterial(materialPalette.floor);
            } else if (n.includes('ceiling') || n.includes('plafon')) {
                mat = new THREE.MeshStandardMaterial(materialPalette.ceiling);
            } else if (n.includes('door') || n.includes('usa')) {
                mat = new THREE.MeshStandardMaterial(materialPalette.door);
            } else if (n.includes('metal') || n.includes('brass') || n.includes('handle')) {
                mat = new THREE.MeshStandardMaterial(materialPalette.metal);
            } else if (n.includes('glass') || n.includes('window')) {
                mat = new THREE.MeshStandardMaterial(materialPalette.glass);
            } else {
                mat = new THREE.MeshStandardMaterial(materialPalette.walls);
            }

            node.material = mat;
        }
    });

    // Tavan
    const ceilingGeo = new THREE.PlaneGeometry(size.x * 2, 99999);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf5f1ed, roughness: 0.8, metalness: 0.0 });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(center.x, box.max.y, center.z);
    ceilingMesh.receiveShadow = true;
    corridor.add(ceilingMesh);

    return { box, center, size };
}
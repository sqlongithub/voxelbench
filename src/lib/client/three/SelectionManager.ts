import * as THREE from 'three';

export class SelectionManager {
    private selectionGroup: THREE.Group;
    private originalObject: THREE.Object3D | null = null;

    constructor(private scene: THREE.Scene) {
        this.selectionGroup = new THREE.Group();
        this.selectionGroup.name = 'selection-wireframe';
        this.scene.add(this.selectionGroup);
    }

    selectObject(object: THREE.Object3D): void {
        this.clearSelection();
        
        if (object instanceof THREE.Mesh) {
            this.originalObject = object;
            this.createSelectionVisualization(object);
        }
    }

    private createSelectionVisualization(mesh: THREE.Mesh): void {
        // Create edges (cleaner than full wireframe)
        const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, 15); // 15-degree threshold
        const edgesMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffa500,
        linewidth: 2
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        
        // Create vertex points
        const vertices = this.getUniqueVertices(mesh.geometry);
        const pointsGeometry = new THREE.BufferGeometry();
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const pointsMaterial = new THREE.PointsMaterial({
        color: 0xffa500,
        size: 6,
        sizeAttenuation: false
        });
        
        const points = new THREE.Points(pointsGeometry, pointsMaterial);
        
        // Apply transforms
        [edges, points].forEach(obj => {
        obj.position.copy(mesh.position);
        obj.rotation.copy(mesh.rotation);
        obj.scale.copy(mesh.scale);
        });
        
        this.selectionGroup.add(edges);
        this.selectionGroup.add(points);
    }

    private getUniqueVertices(geometry: THREE.BufferGeometry): number[] {
        const positions = geometry.attributes.position.array;
        const uniqueVertices: number[] = [];
        const vertexMap = new Map<string, boolean>();
        
        for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
        
        if (!vertexMap.has(key)) {
            vertexMap.set(key, true);
            uniqueVertices.push(x, y, z);
        }
        }
        
        return uniqueVertices;
    }

    clearSelection(): void {
        this.selectionGroup.clear();
        this.originalObject = null;
    }

    updateSelection(): void {
        if (this.originalObject instanceof THREE.Mesh) {
            this.selectObject(this.originalObject);
        }
    }
}
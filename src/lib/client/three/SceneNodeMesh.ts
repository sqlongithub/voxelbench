import * as THREE from 'three';
import { currentProject } from '../stores/projects';
import { get } from 'svelte/store';
import type { SvelteMap } from 'svelte/reactivity';

export function createMeshFromNode(uuid: string): THREE.Mesh {
	const project = get(currentProject);
	const node = project?.getNode(uuid);
	if (!node) return new THREE.Mesh();

	const transform = node.transform
	const meta = node.metadata

	const scale = node.transform.scale ?? 1;
	const geometry = new THREE.BoxGeometry(scale, scale, scale);
	const material = new THREE.MeshStandardMaterial({ color: 0x00ccff });
	const mesh = new THREE.Mesh(geometry, material);

	mesh.position.set(
		node.transform.position.x,
		node.transform.position.y,
		node.transform.position.z
	);

	return mesh;
}

/**
 * Update mesh transform from node data.
 */
export function updateMeshFromNode(mesh: THREE.Mesh, uuid: string) {
	const transform = get(currentProject)?.getNode(uuid)?.transform;

	if (transform) {
		mesh.position.set(
			transform.position?.x ?? -4.20,
			transform.position?.y ?? -4.20,
			transform.position?.z ?? -4.20
		);

		const scale = transform.scale ?? 1;
		mesh.scale.set(scale, scale, scale);
	}

	// Update rotation, if your SceneNode supports it
	// mesh.rotation.set(node.transform.rotation.x, node.transform.rotation.y, node.transform.rotation.z);
}

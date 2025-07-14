import { NodeType, type BlockNodeMetadata } from '$lib/common/types/object';
import { get } from 'svelte/store';
import * as THREE from 'three';
import { currentProject } from '../stores/projects';
import { getBlockstateVariants } from './blockstates';
import { loadBlockModel, type BlockModel } from './models';
import type { ThreeManager } from './ThreeManager';
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js';
import { merge } from 'lodash-es';
import { te } from 'date-fns/locale';

function resolveTextureReferences(textures: Record<string, string>): Record<string, string> {
	const resolved: Record<string, string> = {};
	for (const key in textures) {
		let value = textures[key];
		const visited = new Set<string>();
		while (value.startsWith('#')) {
			const refKey = value.slice(1);
			if (visited.has(refKey)) break;
			visited.add(refKey);
			value = textures[refKey] ?? value;
		}
		resolved[key] = value;
	}
	return resolved;
}

async function recursivelyMergeModel(model: BlockModel): Promise<BlockModel> {
	let mergedParent: BlockModel | undefined = undefined;
	if (model.parent) {
		const rawParent = await loadBlockModel(model.parent.split('/')[1]);
		mergedParent = await recursivelyMergeModel(rawParent);
	}

	const mergedTextures = resolveTextureReferences({
		...(mergedParent?.textures ?? {}),
		...(model.textures ?? {})
	});

	const mergedElements = model.elements ?? mergedParent?.elements;
	const clonedElements = mergedElements ? JSON.parse(JSON.stringify(mergedElements)) : undefined;

	if (clonedElements) {
		clonedElements.forEach((element: { faces: { [x: string]: { texture: string } } }) => {
			for (const faceKey in element.faces) {
				const texRef = element.faces[faceKey].texture;
				if (typeof texRef === 'string' && texRef.startsWith('#')) {
					const texName = texRef.slice(1);
					element.faces[faceKey].texture = mergedTextures[texName] ?? texRef;
				}
			}
		});
	}

	return {
		name: model.name,
		textures: mergedTextures,
		elements: clonedElements
	};
}

export async function createObjectFromNode(
	threeManager: ThreeManager,
	uuid: string
): Promise<THREE.Object3D> {
	const project = get(currentProject);
	const node = project?.getNode(uuid);
	if (!node) return new THREE.Mesh();

	const transform = node.transform;
	const scale = transform.scale ?? 1;

	if (node.metadata.type === NodeType.BLOCK) {
		const blockId = (node.metadata as BlockNodeMetadata).blockType;
		const variants = await getBlockstateVariants(blockId);
		const variantData = Object.values(variants)[0] as any;
		const modelName = Array.isArray(variantData) ? variantData[0].model : variantData.model;

		const model = await loadBlockModel(modelName.split('/')[1]);
		const mergedModel = await recursivelyMergeModel(model);

		const usedTexturePaths = new Set<string>();
		const tintIndicies = new Map<string, number | null | undefined>();
		if (mergedModel.elements) {
			mergedModel.elements.forEach((element) => {
				for (const [faceName, faceData] of Object.entries(element.faces || {})) {
					const texturePath = faceData.texture;
					if (texturePath && !texturePath.startsWith('#')) {
						usedTexturePaths.add(texturePath);
					}
					if (faceData.tintindex !== undefined) {
						tintIndicies.set(texturePath, faceData.tintindex);
					} else {
					}
				}
			});
		}

		const loadedTextures: Record<string, THREE.Texture> = {};
		for (const texturePath of usedTexturePaths) {
			const cleanPath = texturePath.includes(':') ? texturePath.split(':')[1] : texturePath;
			try {
				const texture = await threeManager.loadTexture(cleanPath);
				loadedTextures[texturePath] = texture;
			} catch (err) {
				console.error(`Error loading texture for path "${cleanPath}":`, err);
			}
		}

		const materialMap = new Map<string, THREE.Material>();
		const materials: THREE.Material[] = [];

		function getMaterialIndex(texturePath: string): number {
			if (!materialMap.has(texturePath)) {
				const texture = loadedTextures[texturePath];
				if (texture) {
					texture.magFilter = THREE.NearestFilter;
					texture.minFilter = THREE.NearestFilter;
					texture.wrapS = THREE.ClampToEdgeWrapping;
					texture.wrapT = THREE.ClampToEdgeWrapping;
					texture.colorSpace = THREE.SRGBColorSpace;
				}

				let mat: THREE.Material | undefined = undefined;

				if (texture) {
					if (tintIndicies.has(texturePath)) {
						//console.log('tint indicies ! ! ! ! ! 1');
						mat = new THREE.MeshStandardMaterial({
							map: texture,
							alphaTest: 0.1,
							depthWrite: true,
							depthTest: true,
							color: 0x91bd59
						});
					} else {
						mat = new THREE.MeshStandardMaterial({
							map: texture,
							alphaTest: 0.1,
							depthWrite: true,
							depthTest: true
						});
					}
				} else {
					mat = new THREE.MeshStandardMaterial({
						color: 0xff00ff,
						depthWrite: true,
						depthTest: true
					});
				}

				materialMap.set(texturePath, mat);
				materials.push(mat);
				//console.log(`Material ${materials.length - 1}: ${texturePath}`);
				if ((mat as any).map) {
				//	console.log(
				//		`  Texture map source for material ${materials.length - 1}:`,
				//		(mat as any).map.image?.src || (mat as any).map.image
				//	);
				}
			}
			return materials.indexOf(materialMap.get(texturePath)!);
		}

		// Create a group to hold all meshes
		const meshGroup = new THREE.Group();

		const faceToGeometryIndex = {
			east: 0, // right
			west: 1, // left
			up: 2, // top
			down: 3, // bottom
			south: 4, // front
			north: 5 // back
		};

		for (const [elementIndex, element] of (mergedModel.elements ?? []).entries()) {
			const [x1, y1, z1] = element.from;
			const [x2, y2, z2] = element.to;
			const width = x2 - x1;
			const height = y2 - y1;
			const depth = z2 - z1;

			const geometry = new THREE.BoxGeometry(width, height, depth);
			//geometry.translate(width / 2, height / 2, depth / 2);
			geometry.scale(1 / 16, 1 / 16, 1 / 16);

			const uvAttr = geometry.attributes.uv;
			const uvArray = uvAttr.array as Float32Array;

			// Each cube face = 4 vertices = 8 floats (u,v per vertex)
			// face order: right, left, top, bottom, front, back
			const faceOrder = ['east', 'west', 'up', 'down', 'south', 'north'];

			faceOrder.forEach((faceName, faceIndex) => {
				const faceData = element.faces?.[faceName];
				if (!faceData || !faceData.uv) return;

				const [u1, v1, u2, v2] = faceData.uv.map((v) => v / 16); // normalize 0–1

				// Each face has 4 vertices → start offset in UV array
				const uvOffset = faceIndex * 8;

				// Match Three.js face vertex order
				// Two triangles per face → 4 UVs
				// [A, B, D, C] in MC maps to:
				// 0: A (u1, v2)
				// 1: B (u2, v2)
				// 2: C (u2, v1)
				// 3: D (u1, v1)

				uvArray[uvOffset + 0] = u1;
				uvArray[uvOffset + 1] = v2;
				uvArray[uvOffset + 2] = u2;
				uvArray[uvOffset + 3] = v2;
				uvArray[uvOffset + 4] = u1;
				uvArray[uvOffset + 5] = v1;
				uvArray[uvOffset + 6] = u2;
				uvArray[uvOffset + 7] = v1;
			});

			uvAttr.needsUpdate = true;

			// Create material array for this cube (6 faces)
			const cubeMaterials: THREE.Material[] = new Array(6);
			let hasAnyFaces = false;

			// Get default material for faces that aren't defined
			const defaultMaterialIndex = getMaterialIndex('default'); // or some default texture path
			const defaultMaterial = materials[defaultMaterialIndex];

			// Fill all faces with default material first
			cubeMaterials.fill(defaultMaterial);

			// Override with specific face materials if they exist
			Object.entries(faceToGeometryIndex).forEach(([faceName, geometryIndex]) => {
				const faceData = element.faces?.[faceName];
				if (faceData) {
					const texturePath = faceData.texture;
					const materialIndex = getMaterialIndex(texturePath);
					cubeMaterials[geometryIndex] = materials[materialIndex];
					hasAnyFaces = true;
				}
			});

			// Create individual mesh for this cube
			const mesh = new THREE.Mesh(geometry, cubeMaterials);

			// Position the mesh based on the element's position
			mesh.position.set((x1 + width / 2) / 16, (y1 + height / 2) / 16, (z1 + depth / 2) / 16);

			meshGroup.add(mesh);
		}

		// Apply transformations to the entire group
		meshGroup.scale.set(scale, scale, scale);
		meshGroup.position.set(transform.position.x, transform.position.y, transform.position.z);

		console.log(
			`Final model: ${meshGroup.children.length} individual meshes, ${materials.length} total materials`
		);

		return meshGroup; // Return the group instead of a single mesh
	}

	// fallback simple mesh
	const geometry = new THREE.BoxGeometry(1, 1, 1);
	geometry.translate(0.5, 0.5, 0.5);
	const material = new THREE.MeshStandardMaterial({ color: 0x00ccff });
	const mesh = new THREE.Mesh(geometry, material);
	mesh.scale.set(scale, scale, scale);
	mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
	return mesh;
}

/**
 * Update mesh transform from node data.
 */
export function updateObjectFromNode(object: THREE.Object3D, uuid: string) {
	const transform = get(currentProject)?.getNode(uuid)?.transform;
	if (transform) {
		object.position.set(
			transform.position?.x ?? -4.2,
			transform.position?.y ?? -4.2,
			transform.position?.z ?? -4.2
		);
		const scale = transform.scale ?? 1;
		object.scale.set(scale, scale, scale);
		object.updateMatrix();
		object.updateMatrixWorld();
	}
}

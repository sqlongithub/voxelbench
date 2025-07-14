import * as THREE from 'three';
import { X_AXIS_COLOR, Y_AXIS_COLOR, Z_AXIS_COLOR } from './ThreeManager';
import { currentProject } from '../stores/projects';
import { get } from 'svelte/store';

// Selection visualization constants
const SELECTION_COLOR = 0xffa500;
const SELECTION_LINE_WIDTH = 2;
const SELECTION_POINT_SIZE = 6;
const EDGES_THRESHOLD_ANGLE = 15; // degrees

// Arrow geometry constants
const ARROW_HEAD_LENGTH_RATIO = 0.2;
const ARROW_HEAD_RADIUS_RATIO = 2.5;
const ARROW_SHAFT_SEGMENTS = 12;
const ARROW_HEAD_SEGMENTS = 12;

const AXIS_LENGTH_TO_MESH_SIZE_RATIO = 0.8;
const AXIS_RADIUS_TO_LENGTH_RATIO = 0.03;
const AXIS_SCALE_MULTIPLIER = 0.8;
const AXIS_RENDER_ORDER = 9999;
const AXIS_HEAD_LENGTH_RATIO = 0.12;
const AXIS_OFFSET_RATIO = 0.12;

// Collision area constants
const COLLISION_RADIUS_MULTIPLIER = 4.0;
const COLLISION_HEAD_RADIUS_MULTIPLIER = 2.5;

// Vertex precision for deduplication
const VERTEX_PRECISION_DIGITS = 6;

export enum TransformDirection {
	FORWARDS = 'forwards',
	UP = 'up',
	RIGHT = 'right'
}

export function getDirectionRelativeToObject(
	direction: TransformDirection,
	object: THREE.Object3D
): THREE.Vector3 {
	const worldDirection = new THREE.Vector3();

	switch (direction) {
		case TransformDirection.FORWARDS:
			worldDirection.set(1, 0, 0);
			break;
		case TransformDirection.UP:
			worldDirection.set(0, 1, 0);
			break;
		case TransformDirection.RIGHT:
			worldDirection.set(0, 0, 1);
			break;
	}

	const worldQuaternion = new THREE.Quaternion();
	object.getWorldQuaternion(worldQuaternion);

	return worldDirection.applyQuaternion(worldQuaternion.invert()).normalize();
}

export class SelectionManager {
	selectionGroup: THREE.Group;

	private forwardsAxis: THREE.Group | null = null;
	private upAxis: THREE.Group | null = null;
	private rightAxis: THREE.Group | null = null;
	private edges: THREE.LineSegments | null = null;
	private points: THREE.Points | null = null;

	private originalObject: THREE.Object3D | null = null;

	// Cache previous transform state to detect changes
	private lastPosition = new THREE.Vector3();
	private lastRotation = new THREE.Euler();
	private lastScale = new THREE.Vector3();

	constructor(private scene: THREE.Scene) {
		this.selectionGroup = new THREE.Group();
		this.selectionGroup.name = 'selection-wireframe';
		this.scene.add(this.selectionGroup);
	}

	selectObject(object: THREE.Object3D): void {
		// If selecting the same object, just update it
		if (this.originalObject === object) {
			this.updateSelectionTransforms(object);
			return;
		}

		this.clearSelection();

		// Accept both meshes and groups
		if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
			this.originalObject = object;
			this.createSelectionVisualization(object);
			this.cacheTransformState(object);
		}
	}

	private cacheTransformState(object: THREE.Object3D): void {
		this.lastPosition.copy(object.position);
		this.lastRotation.copy(object.rotation);
		this.lastScale.copy(object.scale);
	}

	private hasTransformChanged(object: THREE.Object3D): boolean {
		return (
			!this.lastPosition.equals(object.position) ||
			!this.lastRotation.equals(object.rotation) ||
			!this.lastScale.equals(object.scale)
		);
	}

	private getObjectSize(object: THREE.Object3D): number {
		// Get the bounding box of the object (works for both meshes and groups)
		const box = new THREE.Box3().setFromObject(object);
		const size = box.getSize(new THREE.Vector3());

		// Use the maximum dimension to handle scaled objects
		return Math.max(size.x, size.y, size.z);
	}

	private calculateArrowDimensions(object: THREE.Object3D): {
		length: number;
		radius: number;
		offset: number;
	} {
		const objectSize = this.getObjectSize(object);
		const length = objectSize * AXIS_LENGTH_TO_MESH_SIZE_RATIO * AXIS_SCALE_MULTIPLIER;
		const radius = length * AXIS_RADIUS_TO_LENGTH_RATIO;
		const offset = objectSize * AXIS_OFFSET_RATIO;

		return { length, radius, offset };
	}

	private createArrow(
		direction: THREE.Vector3,
		origin: THREE.Vector3,
		length: number,
		color: number,
		shaftRadius: number,
		headLengthRatio = ARROW_HEAD_LENGTH_RATIO,
		headRadiusRatio = ARROW_HEAD_RADIUS_RATIO
	): THREE.Group {
		const group = new THREE.Group();

		const dirNorm = direction.clone().normalize();
		const shaftLength = length * (1 - headLengthRatio);
		const headLength = length * headLengthRatio;
		const headRadius = shaftRadius * headRadiusRatio;

		// Create visual components (what the user sees)
		const visualGroup = new THREE.Group();

		// Shaft geometry
		const shaftGeometry = new THREE.CylinderGeometry(
			shaftRadius,
			shaftRadius,
			shaftLength,
			ARROW_SHAFT_SEGMENTS
		);
		const shaftMaterial = new THREE.MeshBasicMaterial({
			color,
			depthTest: false,
			depthWrite: false
		});
		const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
		shaft.position.y = shaftLength / 2;
		shaft.renderOrder = AXIS_RENDER_ORDER;

		// Head geometry
		const headGeometry = new THREE.ConeGeometry(headRadius, headLength, ARROW_HEAD_SEGMENTS);
		const headMaterial = new THREE.MeshBasicMaterial({
			color,
			depthTest: false,
			depthWrite: false
		});
		const head = new THREE.Mesh(headGeometry, headMaterial);
		head.position.y = shaftLength + headLength / 2;
		head.renderOrder = AXIS_RENDER_ORDER;

		visualGroup.add(shaft);
		visualGroup.add(head);

		// Create invisible collision meshes (larger, for easier dragging)
		const collisionGroup = new THREE.Group();

		// Collision shaft (invisible, larger)
		const collisionShaftRadius = shaftRadius * COLLISION_RADIUS_MULTIPLIER;
		const collisionShaftGeometry = new THREE.CylinderGeometry(
			collisionShaftRadius,
			collisionShaftRadius,
			shaftLength,
			8
		);
		const collisionShaftMaterial = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0,
			depthTest: false,
			depthWrite: false
		});
		const collisionShaft = new THREE.Mesh(collisionShaftGeometry, collisionShaftMaterial);
		collisionShaft.position.y = shaftLength / 2;
		collisionShaft.renderOrder = AXIS_RENDER_ORDER;
		collisionShaft.userData.isCollisionMesh = true;

		// Collision head (invisible, larger)
		const collisionHeadRadius = headRadius * COLLISION_HEAD_RADIUS_MULTIPLIER;
		const collisionHeadGeometry = new THREE.ConeGeometry(collisionHeadRadius, headLength, 8);
		const collisionHeadMaterial = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0,
			depthTest: false,
			depthWrite: false
		});
		const collisionHead = new THREE.Mesh(collisionHeadGeometry, collisionHeadMaterial);
		collisionHead.position.y = shaftLength + headLength / 2;
		collisionHead.renderOrder = AXIS_RENDER_ORDER;
		collisionHead.userData.isCollisionMesh = true;

		collisionGroup.add(collisionShaft);
		collisionGroup.add(collisionHead);

		// Add both visual and collision groups to main group
		group.add(visualGroup);
		group.add(collisionGroup);

		// Orient group to direction
		group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);

		// Position group at origin
		group.position.copy(origin);

		return group;
	}

	private updateArrowTransform(
		arrow: THREE.Group,
		object: THREE.Object3D,
		direction: THREE.Vector3,
		offset: number
	): void {
		// Update position with size-based offset
		arrow.position.copy(object.position.clone().add(direction.clone().multiplyScalar(offset)));

		// Re-orient arrow based on object rotation
		const worldQuaternion = new THREE.Quaternion();
		object.getWorldQuaternion(worldQuaternion);
		const rotatedDirection = direction.clone().applyQuaternion(worldQuaternion);
		arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rotatedDirection.normalize());
	}

	private getAllMeshesFromObject(object: THREE.Object3D): THREE.Mesh[] {
		const meshes: THREE.Mesh[] = [];

		object.traverse((child) => {
			if (child instanceof THREE.Mesh) {
				meshes.push(child);
			}
		});

		return meshes;
	}

	private createSelectionVisualization(object: THREE.Object3D): void {
		// Get all meshes from the object (handles both single meshes and groups)
		const meshes = this.getAllMeshesFromObject(object);

		if (meshes.length === 0) {
			console.warn('No meshes found in selected object');
			return;
		}

		// Create combined edges for all meshes
		const allEdges: THREE.LineSegments[] = [];
		const allVertices: number[] = [];

		meshes.forEach((mesh) => {
			// Create edges for this mesh
			const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, EDGES_THRESHOLD_ANGLE);
			const edgesMaterial = new THREE.LineBasicMaterial({
				color: SELECTION_COLOR,
				linewidth: SELECTION_LINE_WIDTH
			});
			const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

			// Apply mesh transforms to edges
			edges.position.copy(mesh.position);
			edges.rotation.copy(mesh.rotation);
			edges.scale.copy(mesh.scale);

			// For groups, we need to account for the mesh's local transform within the group
			if (object instanceof THREE.Group && mesh.parent !== object) {
				// Handle nested transforms
				const worldMatrix = new THREE.Matrix4();
				mesh.updateWorldMatrix(true, false);
				worldMatrix.copy(mesh.matrixWorld);

				// Remove the object's world transform to get relative transform
				const objectWorldMatrix = new THREE.Matrix4();
				object.updateWorldMatrix(true, false);
				objectWorldMatrix.copy(object.matrixWorld);
				objectWorldMatrix.invert();

				worldMatrix.premultiply(objectWorldMatrix);
				edges.applyMatrix4(worldMatrix);
			}

			allEdges.push(edges);

			// Collect vertices for points
			const vertices = this.getUniqueVertices(mesh.geometry);
			allVertices.push(...vertices);
		});

		// Create a group for all edges
		const edgesGroup = new THREE.Group();
		allEdges.forEach((edges) => edgesGroup.add(edges));
		this.edges = edgesGroup as any; // Type assertion since we're storing a group

		// Create combined vertex points
		if (allVertices.length > 0) {
			const pointsGeometry = new THREE.BufferGeometry();
			pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));

			const pointsMaterial = new THREE.PointsMaterial({
				color: SELECTION_COLOR,
				size: SELECTION_POINT_SIZE,
				sizeAttenuation: false
			});

			this.points = new THREE.Points(pointsGeometry, pointsMaterial);
		}

		// Apply initial transforms
		this.updateSelectionTransforms(object);
		if (this.edges) {
			this.selectionGroup.add(this.edges);
		}

		// Calculate arrow dimensions based on object size
		if (get(currentProject)) {
			const { length, radius, offset } = this.calculateArrowDimensions(object);

			// Create draggable axes with size-dependent dimensions
			this.forwardsAxis = this.createArrow(
				new THREE.Vector3(1, 0, 0),
				object.position.clone().add(new THREE.Vector3(offset, 0, 0)),
				length,
				X_AXIS_COLOR,
				radius,
				AXIS_HEAD_LENGTH_RATIO,
				ARROW_HEAD_RADIUS_RATIO
			);
			this.forwardsAxis.name = TransformDirection.FORWARDS;

			this.upAxis = this.createArrow(
				new THREE.Vector3(0, 1, 0),
				object.position.clone().add(new THREE.Vector3(0, offset, 0)),
				length,
				Y_AXIS_COLOR,
				radius,
				AXIS_HEAD_LENGTH_RATIO,
				ARROW_HEAD_RADIUS_RATIO
			);
			this.upAxis.name = TransformDirection.UP;

			this.rightAxis = this.createArrow(
				new THREE.Vector3(0, 0, 1),
				object.position.clone().add(new THREE.Vector3(0, 0, offset)),
				length,
				Z_AXIS_COLOR,
				radius,
				AXIS_HEAD_LENGTH_RATIO,
				ARROW_HEAD_RADIUS_RATIO
			);
			this.rightAxis.name = TransformDirection.RIGHT;

			// Add to selection group
			this.selectionGroup.add(this.forwardsAxis);
			this.selectionGroup.add(this.upAxis);
			this.selectionGroup.add(this.rightAxis);
		}
	}

	private updateSelectionTransforms(object: THREE.Object3D): void {
		// Update edges - for groups, edges are already positioned relative to their meshes
		if (this.edges) {
			if (object instanceof THREE.Mesh) {
				// For single meshes, apply transforms directly
				this.edges.position.copy(object.position);
				this.edges.rotation.copy(object.rotation);
				this.edges.scale.copy(object.scale);
			} else if (object instanceof THREE.Group) {
				// For groups, the edges are already positioned correctly relative to their meshes
				// We just need to apply the group's transform
				this.edges.position.copy(object.position);
				this.edges.rotation.copy(object.rotation);
				this.edges.scale.copy(object.scale);
			}
		}

		if (this.points) {
			this.points.position.copy(object.position);
			this.points.rotation.copy(object.rotation);
			this.points.scale.copy(object.scale);
		}

		// Calculate arrow dimensions based on current object size
		const { length, radius, offset } = this.calculateArrowDimensions(object);

		// Update arrows if they exist
		if (this.forwardsAxis && this.upAxis && this.rightAxis) {
			// Remove old arrows
			this.selectionGroup.remove(this.forwardsAxis);
			this.selectionGroup.remove(this.upAxis);
			this.selectionGroup.remove(this.rightAxis);

			// Create new arrows with updated dimensions
			this.forwardsAxis = this.createArrow(
				new THREE.Vector3(1, 0, 0),
				object.position.clone().add(new THREE.Vector3(offset, 0, 0)),
				length,
				X_AXIS_COLOR,
				radius,
				AXIS_HEAD_LENGTH_RATIO,
				ARROW_HEAD_RADIUS_RATIO
			);
			this.forwardsAxis.name = TransformDirection.FORWARDS;

			this.upAxis = this.createArrow(
				new THREE.Vector3(0, 1, 0),
				object.position.clone().add(new THREE.Vector3(0, offset, 0)),
				length,
				Y_AXIS_COLOR,
				radius,
				AXIS_HEAD_LENGTH_RATIO,
				ARROW_HEAD_RADIUS_RATIO
			);
			this.upAxis.name = TransformDirection.UP;

			this.rightAxis = this.createArrow(
				new THREE.Vector3(0, 0, 1),
				object.position.clone().add(new THREE.Vector3(0, 0, offset)),
				length,
				Z_AXIS_COLOR,
				radius,
				AXIS_HEAD_LENGTH_RATIO,
				ARROW_HEAD_RADIUS_RATIO
			);
			this.rightAxis.name = TransformDirection.RIGHT;

			// Add updated arrows back to selection group
			this.selectionGroup.add(this.forwardsAxis);
			this.selectionGroup.add(this.upAxis);
			this.selectionGroup.add(this.rightAxis);
		}
	}

	private getUniqueVertices(geometry: THREE.BufferGeometry): number[] {
		const positions = geometry.attributes.position.array;
		const uniqueVertices: number[] = [];
		const vertexMap = new Map<string, boolean>();

		for (let i = 0; i < positions.length; i += 3) {
			const x = positions[i];
			const y = positions[i + 1];
			const z = positions[i + 2];
			const key = `${x.toFixed(VERTEX_PRECISION_DIGITS)},${y.toFixed(VERTEX_PRECISION_DIGITS)},${z.toFixed(VERTEX_PRECISION_DIGITS)}`;

			if (!vertexMap.has(key)) {
				vertexMap.set(key, true);
				uniqueVertices.push(x, y, z);
			}
		}

		return uniqueVertices;
	}

	getTransformAxis(object: THREE.Object3D): TransformDirection | null {
		if (!object) return null;

		let checkObject = object;

		// If this is a collision mesh, traverse up to find the arrow group
		if (object.userData?.isCollisionMesh) {
			checkObject = object.parent?.parent || object;
		}

		if (checkObject === this.forwardsAxis || checkObject.parent === this.forwardsAxis) {
			return TransformDirection.FORWARDS;
		} else if (checkObject === this.upAxis || checkObject.parent === this.upAxis) {
			return TransformDirection.UP;
		} else if (checkObject === this.rightAxis || checkObject.parent === this.rightAxis) {
			return TransformDirection.RIGHT;
		}

		return null;
	}

	clearSelection(): void {
		this.selectionGroup.clear();
		this.originalObject = null;
		this.forwardsAxis = null;
		this.upAxis = null;
		this.rightAxis = null;
		this.edges = null;
		this.points = null;
	}

	updateSelection(): void {
		if (this.originalObject) {
			// Only update if transforms actually changed
			if (this.hasTransformChanged(this.originalObject)) {
				this.updateSelectionTransforms(this.originalObject);
				this.cacheTransformState(this.originalObject);
			}
		}
	}

	tick(): void {
		this.updateSelection();
	}
}

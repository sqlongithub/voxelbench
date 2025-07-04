import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createMeshFromNode, updateMeshFromNode } from './SceneNodeMesh';
import { SvelteMap } from 'svelte/reactivity';
import CameraController from './CameraController';
import { SelectionManager, TransformDirection } from './SelectionManager';
	import type { Transform } from '$lib/common/types/object';
import { int } from 'three/tsl';
import { get } from 'svelte/store';
import { currentProject } from '../stores/projects';

export interface ThreeManagerOptions {
	canvas: HTMLCanvasElement;
	initialCameraPosition?: THREE.Vector3;
	backgroundColor?: number | string;
}

export const X_AXIS_COLOR = 0xe57373; // Red
export const Y_AXIS_COLOR = 0x78cf7c; // Green
export const Z_AXIS_COLOR = 0x64b5f6; // Blue

export class ThreeManager {
	
	private scene: THREE.Scene;
	public cameraController: CameraController;
	private renderer: THREE.WebGLRenderer;
	private animationId?: number;
	private canvas: HTMLCanvasElement;
	public meshMap: SvelteMap<THREE.Mesh, string> = new SvelteMap();
	private raycaster = new THREE.Raycaster();
	private selectionManager: SelectionManager | undefined;

	private resizeObserver = new ResizeObserver(entries => {
		this.debounce(this.resize, 1)
	});

	private createAxisLine(start: THREE.Vector3, end: THREE.Vector3, material: THREE.Material): void {
		const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
		const line = new THREE.Line(geometry, material);
		this.scene.add(line);
	}

	constructor(options: ThreeManagerOptions) {
		const { canvas, initialCameraPosition = new THREE.Vector3(2, 0, 5), backgroundColor = 0xaaaaaa } = options;
		this.canvas = canvas;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(backgroundColor);

		this.selectionManager = new SelectionManager(this.scene);

		let camera = new THREE.PerspectiveCamera(
			50,
			canvas.clientWidth / canvas.clientHeight,
			0.1,
			1000
		);
		camera.position.copy(initialCameraPosition);

		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);

		this.scene.fog = new THREE.Fog(backgroundColor, 20, 50);
		let light = new THREE.HemisphereLight(0xffffff, 0x404040, 0.6);
		this.scene.add(light);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(10, 10, 5);
		directionalLight.castShadow = true;

		// Configure shadow properties for crisp shadows
		directionalLight.shadow.mapSize.width = 2048;
		directionalLight.shadow.mapSize.height = 2048;
		directionalLight.shadow.camera.near = 0.1;
		directionalLight.shadow.camera.far = 50;
		directionalLight.shadow.camera.left = -10;
		directionalLight.shadow.camera.right = 10;
		directionalLight.shadow.camera.top = 10;
		directionalLight.shadow.camera.bottom = -10;

		this.scene.add(directionalLight);

		const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
		fillLight.position.set(-5, 0, -5);
		this.scene.add(fillLight);

		let controls = new OrbitControls(camera, this.renderer.domElement);
		controls.enableDamping = true;
		controls.zoomSpeed = 2;

		this.cameraController = new CameraController(camera, controls);
		this.resize();

        this.resizeObserver.observe(canvas);


		const majorGrid = new THREE.GridHelper(1000, 1000, 0x393939, 0x393939);
		majorGrid.material.opacity = 0.3;
		majorGrid.material.transparent = false;
		majorGrid.renderOrder = 1;


		// Minor grid lines (darker, more divisions)
		const minorGrid = new THREE.GridHelper(1000, 10000, 0x222222, 0x222222);
		minorGrid.material.opacity = 0.6;
		minorGrid.material.transparent = false;
		minorGrid.renderOrder = 0;

		this.scene.add(majorGrid);
		this.scene.add(minorGrid);

		const axisLength = 255;
		const axisOffset = 1e-2;

		this.createAxisLine(
			new THREE.Vector3(-axisLength, axisOffset, 0),
			new THREE.Vector3(axisLength, axisOffset, 0),
			new THREE.LineBasicMaterial({ color: X_AXIS_COLOR, linewidth: 3 })
		)
		this.createAxisLine(
			new THREE.Vector3(0, -axisLength, 0),
			new THREE.Vector3(0, axisLength, 0),
			new THREE.LineBasicMaterial({ color: Y_AXIS_COLOR, linewidth: 3 })
		)
		this.createAxisLine(
			new THREE.Vector3(0, axisOffset, -axisLength),
			new THREE.Vector3(0, axisOffset, axisLength),
			new THREE.LineBasicMaterial({ color: Z_AXIS_COLOR, linewidth: 3 })
		);
	}

    private debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		return ((...args: any[]) => {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => fn(...args), delay);
		}) as T;
	}

	getUuid(mesh: THREE.Mesh): string | undefined {
		return this.meshMap.get(mesh);
	}

	getMesh(uuid: string): THREE.Mesh | undefined {
		for (const [mesh, meshUuid] of this.meshMap) {
			if (meshUuid === uuid) {
				return mesh;
			}
		}
		return undefined;
	}

	updateMeshTransform(meshUuid: string, transform: Transform) {
		const mesh = this.getMesh(meshUuid);
		if (mesh) {
			updateMeshFromNode(mesh, meshUuid);
		}
	}

	resize = () => {
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;
		if (width === 0 || height === 0) return;

		this.renderer.setSize(width, height, false);
		this.cameraController.resize(width, height);
	};

    addNode(uuid: string) {
        if(this.meshMap.values().some(meshUuid => meshUuid === uuid)) return;

        const mesh = createMeshFromNode(uuid);
		console.log("made mesh", mesh);
		this.scene.add(mesh);

        this.meshMap.set(mesh, uuid);
    }

	selectNode(uuid: string) {
		const mesh = this.getMesh(uuid);
		if (!mesh) return;

		this.selectionManager?.selectObject(mesh);
	}

	deselectNode() {
		this.selectionManager?.clearSelection();
	}

	getSelectedMesh(): THREE.Mesh | null {
		for (const [mesh, meshUuid] of this.meshMap) {
			if (get(currentProject)?.selectedNode === meshUuid) {
				return mesh;
			}
		}
		return null;
	}

	updateSelection() {
		//console.log("Updating selection in ThreeManager");
		this.selectionManager?.updateSelection();
	}

	getIntersectingNodes(mouse: THREE.Vector2): THREE.Intersection[] {
		this.raycaster.setFromCamera(mouse, this.cameraController.camera);
		const intersects = this.raycaster.intersectObjects(Array.from(this.meshMap.keys()), true);
		return intersects
	}

	getIntersectingTransformAxis(mouse: THREE.Vector2): TransformDirection | null {
		this.raycaster.setFromCamera(mouse, this.cameraController.camera);
		const intersects = this.raycaster.intersectObjects(
			(() => {
				const objects: THREE.Object3D[] = [];
				this.selectionManager?.selectionGroup?.traverse(obj => objects.push(obj));
				return objects;
			})(),
			true
		);

		//console.log("Intersect object names: ", intersects.map(intersect => intersect.object.name));

		if (intersects.length === 0) return null;

		const firstAxis = intersects.find(intersect =>
			this.selectionManager?.getTransformAxis(intersect.object)
		);

		//console.log("First axis found: ", firstAxis);
		return this.selectionManager?.getTransformAxis(firstAxis?.object as THREE.Mesh) ?? null;
	}

    removeNode(uuid: string) {
        this.meshMap.forEach((meshUuid, mesh) => {
			if (meshUuid === uuid) {
				this.scene.remove(mesh);
				this.meshMap.delete(mesh);
			}
		});
    }

	animate = () => {
		this.animationId = requestAnimationFrame(this.animate);
		this.cameraController.update();
		this.selectionManager?.tick();
		this.renderer.render(this.scene, this.cameraController.camera);
	}

	dispose = () => {
		if (this.animationId) cancelAnimationFrame(this.animationId);
		this.cameraController.dispose();
        this.resizeObserver.disconnect();
	}
}
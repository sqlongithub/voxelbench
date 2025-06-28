import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createMeshFromNode } from './SceneNodeMesh';
import { SvelteMap } from 'svelte/reactivity';
import CameraController from './CameraController';
import { SelectionManager } from './SelectionManager';

export interface ThreeManagerOptions {
	canvas: HTMLCanvasElement;
	initialCameraPosition?: THREE.Vector3;
	backgroundColor?: number | string;
}

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

	constructor(options: ThreeManagerOptions) {
		const { canvas, initialCameraPosition = new THREE.Vector3(2, 0, 5), backgroundColor = 0x111111 } = options;
		this.canvas = canvas;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(backgroundColor);

		this.selectionManager = new SelectionManager(this.scene);

		let camera = new THREE.PerspectiveCamera(
			75,
			canvas.clientWidth / canvas.clientHeight,
			0.1,
			1000
		);
		camera.position.copy(initialCameraPosition);

		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);

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

		this.cameraController = new CameraController(camera, controls);
		this.resize();

        this.resizeObserver.observe(canvas);
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

	updateSelection() {
		console.log("Updating selection in ThreeManager");
		this.selectionManager?.updateSelection();
	}

	getIntersectingObjects(mouse: THREE.Vector2): THREE.Object3D[] {
		this.raycaster.setFromCamera(mouse, this.cameraController.camera);
		const intersects = this.raycaster.intersectObjects(this.scene.children, true);
		return intersects.map(intersect => intersect.object);
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
		this.renderer.render(this.scene, this.cameraController.camera);
	}

	dispose = () => {
		if (this.animationId) cancelAnimationFrame(this.animationId);
		this.cameraController.dispose();
        this.resizeObserver.disconnect();
	}
}
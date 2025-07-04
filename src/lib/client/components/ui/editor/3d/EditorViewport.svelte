<script lang="ts">
	import { currentProject } from '$lib/client/stores/projects';
	import { BlockSize, type SceneNodeMetadata } from '$lib/common/types/object';
	import { add } from 'date-fns';
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import * as THREE from 'three';
	// @ts-ignore
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import * as TWEEN from '@tweenjs/tween.js';
	import { ThreeManager } from '$lib/client/three/ThreeManager';
	import { storageBackend } from '$lib/client/storage';
	import { getDirectionRelativeToObject, type TransformDirection } from '$lib/client/three/SelectionManager';
	import { select } from 'three/tsl';
	import { debounce } from 'lodash-es';

	let canvasElement: HTMLCanvasElement

	let threeManager: ThreeManager;

	$effect(() => {
		if(canvasElement) {
			threeManager = new ThreeManager({
				canvas: canvasElement,
				initialCameraPosition: new THREE.Vector3(2, 3, 2),
				backgroundColor: 0x0f0f0f,
		});
		}
	})

	$effect(() => {
		if($currentProject?.metadata.lastModified) {
			storageBackend.saveProjectLater($currentProject.getSnapshot())
		}
	})

	let isLoading = $state(true);

	function animate() {
		threeManager.animate();
	}

	function resize() {
		threeManager.resize();
	}



	function addNodeToScene(uuid: string) {
		console.log("adding node to scene")
		threeManager.addNode(uuid);
	}

	onMount(() => {
		if (!canvasElement) return;

		animate();

		const handleResize = debounce(() => {
			const rect = canvasElement.getBoundingClientRect();

			resize()
		}, 1);

		const resizeObserver = new ResizeObserver(entries => {
			handleResize()
		});
		resizeObserver.observe(canvasElement);

		isLoading = false;

		return () => {
			resizeObserver.disconnect()
			threeManager.dispose();
		};
	});

	const raycaster = new THREE.Raycaster();
	const mouseDownPos = new THREE.Vector2();
	const canvasMouse = new THREE.Vector2();

	let draggingAxis: TransformDirection | null = null;
	let dragPlane = new THREE.Plane();
	let dragStartPoint = new THREE.Vector3();
	let objectStartPosition = new THREE.Vector3();
	let objectEndPosition = new THREE.Vector3();
	let cameraDirection = new THREE.Vector3();
	let tempVector = new THREE.Vector3(); // Add this - was missing

	function updateMousePosition(event: MouseEvent) {
		const rect = canvasElement.getBoundingClientRect();
		canvasMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		canvasMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
	}

	function onMouseDown(event: MouseEvent) {
		event.preventDefault();
		mouseDownPos.x = event.x;
		mouseDownPos.y = event.y;

		updateMousePosition(event);

		const axis = threeManager.getIntersectingTransformAxis(canvasMouse);
		if(axis) {
			//console.log("Dragging axis: ", axis);
			draggingAxis = axis;

			const selectedMesh = threeManager.getSelectedMesh();
			if (!selectedMesh) return;

			threeManager.cameraController.camera.getWorldDirection(cameraDirection);
			objectStartPosition.copy(selectedMesh.position);

			dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, objectStartPosition);

			raycaster.setFromCamera(canvasMouse, threeManager.cameraController.camera);
			const intersection = raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3());
			if (intersection) {
				dragStartPoint.copy(intersection);
			} else {
				draggingAxis = null;
				return;
			}

			threeManager.cameraController.disableOrbitControls();
		}
	}

	function onMouseUp(event: MouseEvent) {
		event.preventDefault();
		const dx = event.x - mouseDownPos.x;
		const dy = event.y - mouseDownPos.y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < 5) {
			handleClick(event);
		}
		// FIX: Don't call handleDrag on mouse up - the drag is already complete
		threeManager.cameraController.enableOrbitControls();
		draggingAxis = null;
	}

	function onMouseMove(event: MouseEvent) {
		if (draggingAxis) {
			handleDrag(event);
		}
	}

	function nearestToInterval(num: number, interval: number) {
		return Math.round(num / interval) * interval;
	}

	function handleDrag(event: MouseEvent) {
		if (!draggingAxis) return;
		
		const selectedMesh = threeManager.getSelectedMesh();
		if (!selectedMesh) return;
		
		updateMousePosition(event);
		raycaster.setFromCamera(canvasMouse, threeManager.cameraController.camera);
		
		// FIX: intersectPlane returns the point, doesn't modify tempVector
		const currentPoint = raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3());
		if (!currentPoint) return;
		
		// Calculate movement delta
		const dragDelta = currentPoint.clone().sub(dragStartPoint);
		const dragDirection = getDirectionRelativeToObject(draggingAxis, selectedMesh);
		
		// Project delta onto the drag axis
		const projectedDistance = dragDelta.dot(dragDirection);
		// FIX: Don't modify dragDirection in place - it's reused
		const movement = dragDirection.clone().multiplyScalar(projectedDistance);
		
		const newPosition = objectStartPosition.clone().add(movement)
		if (selectedNodeTransform) {
			if(Math.abs(movement.x) * 1.1 >= selectedNodeTransform.snapInterval) {
				selectedNodeTransform.position.x = nearestToInterval(newPosition.x, selectedNodeTransform.snapInterval);
			}
			if(Math.abs(movement.y) * 1.1 >= selectedNodeTransform.snapInterval) {
				selectedNodeTransform.position.y = nearestToInterval(newPosition.y, selectedNodeTransform.snapInterval);
			}
			if(Math.abs(movement.z) * 1.1 >= selectedNodeTransform.snapInterval) {
				selectedNodeTransform.position.z = nearestToInterval(newPosition.z, selectedNodeTransform.snapInterval);
			}
		}
	}

	function handleClick(event: MouseEvent) {
		const rect = canvasElement.getBoundingClientRect();

		// Normalize mouse coordinates (-1 to +1)
		canvasMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		canvasMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		const intersects = threeManager.getIntersectingNodes(canvasMouse);
		//console.log("Intersects found: ", intersects.length);
		if(intersects.length > 0) {
			const sortedIntersects = intersects.sort((a, b) => {
				if (!(a.object instanceof THREE.Mesh) || !(b.object instanceof THREE.Mesh)) return 0;

				const distanceDiff = a.distance - b.distance;

				// If distances are significantly different, sort by distance
				if (Math.abs(distanceDiff) > 0.0001) {
					return distanceDiff;
				}

				// Otherwise use metadata timestamp as tiebreaker
				const aUuid = threeManager.getUuid(a.object as THREE.Mesh);
				const bUuid = threeManager.getUuid(b.object as THREE.Mesh);
				if (!aUuid || !bUuid) return 0;

				const aNode = $currentProject?.getNode(aUuid);
				const bNode = $currentProject?.getNode(bUuid);
				if (!aNode || !bNode) return 0;

				const aTimestamp = aNode.metadata?.createdTimestamp ?? 0;
				const bTimestamp = bNode.metadata?.createdTimestamp ?? 0;

				return bTimestamp - aTimestamp; 
			});
			const selectedMesh = sortedIntersects[0].object as THREE.Mesh;
			const selectedUuid = threeManager.getUuid(selectedMesh);
			if (selectedUuid) {
				$currentProject?.selectNode(selectedUuid);
				threeManager.cameraController.tweenToTarget(selectedMesh.position, 600);
			}
		} else {
			$currentProject?.deselectNode();
		}
	}

	$effect(() => {
		if (threeManager && $currentProject) {
			if (!$currentProject.selectedNode) {
				//console.log("No node selected, deselecting in ThreeManager. node: ", $currentProject.selectedNode);
				threeManager.deselectNode();
				return;
			}
			//console.log("Selecting node in ThreeManager: ", $currentProject.selectedNode);
			threeManager.selectNode($currentProject.selectedNode);
		}
	})

	let selectedNodeTransform = $derived.by(() => {
		if (!$currentProject || !$currentProject.selectedNode) return null;
		return $currentProject.nodeTransforms.get($currentProject.selectedNode);
	});

	$effect(() => {
		console.log("New object added/removed externally")
		Array.from($currentProject?.nodeMetadata.keys() || [])
			.filter(n => !threeManager.getMesh(n))
			.forEach(addNodeToScene)
		Array.from(threeManager.meshMap.values())
			.filter(n => !$currentProject?.nodeMetadata.has(n))
			.forEach(uuid => {
				threeManager.removeNode(uuid);
			});
	})

	$effect(() => {
		threeManager.meshMap.forEach((meshUuid, mesh) => {
			const node = $currentProject?.getNode(meshUuid);
			if (node && node.transform) {
				threeManager.updateMeshTransform(meshUuid, node.transform);
			} else {
				console.warn(`Node with UUID ${meshUuid} not found or has no transform.`);
			}
		});
	})
				
	onDestroy(() => {
		threeManager.dispose();
	});
</script>

<div class="w-full h-full relative bg-surface-0" data-viewport={true}>
	{#if isLoading}
		<div class="absolute inset-0 flex items-center justify-center z-10 text-white">
			Loading 3D Viewport...
		</div>
	{/if}

	<canvas onmousedown={onMouseDown} onmousemove={onMouseMove} onmouseup={onMouseUp} bind:this={canvasElement} class="w-full h-full block"></canvas>
</div>
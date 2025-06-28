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

  let canvasElement: HTMLCanvasElement

  let threeManager: ThreeManager;

  $effect(() => {
    if(canvasElement) {
      threeManager = new ThreeManager({
        canvas: canvasElement,
        initialCameraPosition: new THREE.Vector3(2, 2, 2),
        backgroundColor: 0x0f0f0f,
    });
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

    function debounce(fn: () => void, delay: number) {
      let timeout: number | undefined;
      return () => {
        clearTimeout(timeout);
        timeout = window.setTimeout(fn, delay);
      };
    }

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
  const mouse = new THREE.Vector2();

  function onMouseDown(event: MouseEvent) {
    event.preventDefault();
    mouse.x = event.x;
    mouse.y = event.y;
  }

  function onMouseUp(event: MouseEvent) {
    event.preventDefault();
    const dx = event.x - mouse.x;
    const dy = event.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) {
      handleClick(event);
    } else {

    }
  }

  function handleClick(event: MouseEvent) {
    const rect = canvasElement.getBoundingClientRect();
  
    // Normalize mouse coordinates (-1 to +1)
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    

    const intersects = threeManager.getIntersectingObjects(mouse);
    if(intersects.length > 0) {
      const sortedIntersects = intersects.sort((a, b) => {
        const aUuid = threeManager.getUuid(a as THREE.Mesh);
        const bUuid = threeManager.getUuid(b as THREE.Mesh);
        if (!aUuid || !bUuid) return 0;
        const aNode = $currentProject?.getNode(aUuid);
        const bNode = $currentProject?.getNode(bUuid);
        if (!aNode || !bNode) return 0;
        const aTimestamp = aNode.metadata?.createdTimestamp ?? 0;
        const bTimestamp = bNode.metadata?.createdTimestamp ?? 0;
        return aTimestamp - bTimestamp;
      });
      const selectedMesh = sortedIntersects[0] as THREE.Mesh;
      const selectedUuid = threeManager.getUuid(selectedMesh);
      //console.log("clicked on mesh with uuid:", selectedUuid);
      if (selectedUuid) {
        $currentProject?.selectNode(selectedUuid);
        threeManager.cameraController.tweenToTarget(selectedMesh.position, 600);
      }
    } else {
      //console.log("No mesh intersected");
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
    console.log("New object added externally")
    Array.from($currentProject?.nodeMetadata.keys() || [])
      .filter(n => !threeManager.getMesh(n))
      .forEach(addNodeToScene)
  })

  $effect(() => {
    threeManager.meshMap.forEach((meshUuid, mesh) => {
      const node = $currentProject?.getNode(meshUuid);
      if (node && node.transform) {
        mesh.position.set(
          node.transform.position.x,
          node.transform.position.y,
          node.transform.position.z
        );
        mesh.scale.set(node.transform.scale, node.transform.scale, node.transform.scale);
      }
      if(meshUuid === $currentProject?.selectedNode) {
        threeManager.updateSelection();
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

  <canvas onmousedown={onMouseDown} onmouseup={onMouseUp} bind:this={canvasElement} class="w-full h-full block"></canvas>
</div>
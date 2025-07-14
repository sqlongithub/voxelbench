<script lang="ts">
    import { NodeType, type BlockNodeMetadata, type SceneNodeMetadata } from "$lib/common/types/object";
	import { getContext, onMount, setContext } from "svelte";
	import RightClickAction from "../../context-menu/RightClickAction.svelte";
	import RightClickMenu from "../../context-menu/RightClickMenu.svelte";
	import RightClickSeparator from "../../context-menu/RightClickSeparator.svelte";
    import TreeNode from './TreeNode.svelte';
	import type { Writable } from "svelte/store";
	import { quintOut } from "svelte/easing";
	import { fade, fly, slide, type TransitionConfig } from "svelte/transition";
	import { currentProject } from "$lib/client/stores/projects";
	import { clickOutside } from "$lib/client/actions/clickOutside";
	import { deselectNode, deleteNodeAction } from "$lib/client/actions/deselectNode";

    const { nodeMetadata, indentation = 0 } = $props<{ nodeMetadata: SceneNodeMetadata; indentation?: number }>();

    let contextMenuRef: RightClickMenu;

    function onRightClickNode(event: MouseEvent) {
        event.preventDefault();
        setTimeout(() => contextMenuRef.show(event), 0);
    }

    let dragging: Writable<string> = getContext("dragging");
    let mousePos: Writable<[number, number]> = getContext("mouse-pos")
    let dropNode: Writable<string | null> = getContext("drop-node");

    let dragStartPos: { x: number; y: number; } | null = null;
    let dragThreshold = 5; // pixels

    let expanded = $state(false)
    function toggleExpanded() {
        expanded = !expanded;
    }

    onMount(() => {
        /* document.addEventListener('keydown', (e) => {
            if(e.key == 'Delete') {
                deleteNode()
            }
        }) */
    })
    
    function mouseMove(event: MouseEvent) {
        if (!dragStartPos) return;
        
        const distance = Math.sqrt(
            Math.pow(event.x - dragStartPos.x, 2) + 
            Math.pow(event.y - dragStartPos.y, 2)
        );
        
        if (distance > dragThreshold) {
            dragging.set(nodeMetadata.uuid)
            document.addEventListener('mouseup', stopDragging);
        }
    }

    function startDragging(event: MouseEvent) {
        if(event.button != 0) return;
        dragging.set("")
        dragStartPos = { x: event.x, y: event.y };
    }

    function stopDragging() {
        if($dragging.length == 0) {
            // click
            dragStartPos = null;
            return;
        }

        if ($dropNode !== null && $dropNode !== nodeMetadata.uuid) {
            $currentProject?.makeNodeChildOf(nodeMetadata.uuid, $dropNode ?? "")
        }

        dragging.set("")
        dropNode.set("")
        document.removeEventListener('mouseup', stopDragging);
        dragStartPos = null;
        
    }

    function deleteNode() {
        console.log("Deleting node " + nodeMetadata.name);
        $currentProject?.removeNode(nodeMetadata.uuid);
        console.log("Current project metas ", $currentProject?.nodeMetadata.values)
    }

    interface FlySlideParams {
        delay?: number;
        duration?: number;
        easing?: (t: number) => number;
        y?: number;
    }
    
    export function flySlide(
        node: Element,
        {
            delay = 0,
            duration = 300,
            easing = quintOut,
            y = 10
        }: FlySlideParams = {}
    ): TransitionConfig {
        const element = node as HTMLElement;
        const style = getComputedStyle(element);
        const opacity = parseFloat(style.opacity);
        const height = element.scrollHeight;

        return {
            delay,
            duration,
            easing,
            css: (t) => `
            height: ${t * height}px;
            opacity: ${t * opacity};
            overflow: hidden;
            `
        };
    }
</script>

<li oncontextmenu={onRightClickNode} >
    <div
        use:deselectNode={() => { $currentProject?.deselectNode() }}
        use:deleteNodeAction={() => { deleteNode() }}
        role="button"
        tabindex="0"
        aria-label="Tree node group"
        onmousedown={startDragging}
        onmouseup={stopDragging}
        onmousemove={mouseMove}
        onmouseenter={stopDragging}
        class="h-6 flex flex-row items-center pl-2 rounded-md
        transition-colors duration-80 outline-blue-500 
        {($currentProject?.selectedNode == nodeMetadata.uuid) ? 'bg-sky-700' : 'hover:bg-surface-0'}
        {($dropNode == nodeMetadata?.uuid) ? 'bg-surface-0 outline-2' : ''}
        {$dragging == nodeMetadata.uuid ? 'opacity-65' : 'text-white opacity-100'}"
    >
        <div class="w-full h-full flex items-center flex-row gap-1" style="margin-left: {indentation * 16}px">
            <div class="flex items-center size-4" >
                {#if nodeMetadata.children && nodeMetadata.children.length > 0}
                    <button out:fade={{ duration: 100 }} onclick={toggleExpanded} aria-label="Toggle node children visible"  class="mb-[2px] transition-transform duration-200 ease-out {expanded ? 'rotate-90' : 'rotate-0'}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#bcbcbc" class="size-4" >
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                {/if}
            </div>
            <button class="w-full h-full flex flex-row items-center gap-1.5 py-1" data-drop-id={nodeMetadata.uuid} onclick={() => $currentProject?.selectNode(nodeMetadata.uuid)}>
                <img
                    class="select-none h-full" draggable="false"
                    src={`/blocks_and_items/${nodeMetadata.type == NodeType.BLOCK ? (nodeMetadata as BlockNodeMetadata).blockType : ''}.avif`}
                    alt="Grass block icon representing a node in the hierarchy"
                />
                <p class="text-xs text-center mb-[1px] select-none">{nodeMetadata.name}</p>
            </button>
        </div>
    </div>
        

    {#if $dragging == nodeMetadata.uuid}
    <div class="fixed" style="left: {$mousePos[0] - 20}px; top: {$mousePos[1] - 10}px">
        <div class="w-full pr-2 h-5 flex flex-row gap-1.5 py-1 pl-1 rounded-md bg-surface-0 items-center translate-0">
            <img
                class="select-none h-full"
                src={`/blocks_and_items/${nodeMetadata.type == NodeType.BLOCK ? (nodeMetadata as BlockNodeMetadata).blockType : ''}.avif`}
                alt="Grass block icon representing a node in the hierarchy"
            />
            <p class="text-xs text-center select-none">{nodeMetadata.name}</p>
        </div>
    </div>
    {/if}
    
    <RightClickMenu bind:this={contextMenuRef}>
        <RightClickAction>Rename</RightClickAction>
        <RightClickAction>Properties</RightClickAction>
        <RightClickSeparator />
        <RightClickAction danger onClick={deleteNode}>Delete</RightClickAction>

        
    </RightClickMenu>
</li>

{#if nodeMetadata.children && nodeMetadata.children.length > 0 && expanded} 
    <ul class="pointer-events-none animate-enable-hover origin-top" transition:flySlide={{ y: -20, duration: 400, easing: quintOut }}>
        {#each nodeMetadata.children as childId}
            {#if $currentProject?.getNode(childId)?.metadata}
                <TreeNode nodeMetadata={$currentProject.getNode(childId).metadata} indentation={indentation + 1}/>
            {/if}
        {/each}
    </ul>
{/if}

<style>
    @keyframes enable-hover {
        99% { pointer-events: none; }
        100% { pointer-events: auto; }
    }
    
    .animate-enable-hover {
        animation: enable-hover 200ms forwards;
    }
</style>
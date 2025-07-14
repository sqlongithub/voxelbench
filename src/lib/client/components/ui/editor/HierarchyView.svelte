<script lang="ts">
	import { type Project } from "$lib/common/types/project.svelte";
	import { getContext, onMount } from "svelte";
	import { get, type Writable } from "svelte/store";
	import Sidebar from "./sidebar/Sidebar.svelte";
	import SidebarSeparator from "./sidebar/SidebarSeparator.svelte";
	import SidebarContent from "./sidebar/SidebarContent.svelte";
	import Tree from "./tree/Tree.svelte";
	import Dropdown from "../dropdown/Dropdown.svelte";
	import DropdownContent from "../dropdown/DropdownContent.svelte";
	import DropdownItem from "../dropdown/DropdownItem.svelte";
	import DropdownTrigger from "../dropdown/DropdownTrigger.svelte";
	import Picker from "./picker/Picker.svelte";
	import PickerItem from "./picker/PickerItem.svelte";
	import { BlockSize, NodeType, SnappingMode, type BlockNodeMetadata } from "$lib/common/types/object";
	import EditorViewport from "./3d/EditorViewport.svelte";
	import { currentProject } from "$lib/client/stores/projects";
    import { beginDeselectNode } from "$lib/client/actions/deselectNode";


    type MCItemOrBlock = { id: number, name: string, displayName: string, image: string }

    
 
    let blockPicker = $state<Picker>();

    function addBlock(block: MCItemOrBlock, event: MouseEvent) {
        //console.log("adding " + block.displayName)
        if(!event.shiftKey) {
            console.log("closing")
            blockPicker?.close();
        }

        if ($currentProject) {
            console.log("project exists")
            console.log("current project:", $currentProject)
            $currentProject.addNode({
                uuid: crypto.randomUUID(),
                type: NodeType.BLOCK,
                name: block.displayName + " Block",
                blockType: block.name,
                createdTimestamp: Date.now()
            } as BlockNodeMetadata, {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: BlockSize.MEDIUM,
                snapMode: SnappingMode.SCALE,
                snapInterval: BlockSize.MEDIUM,
            })
        }
    }
    let blocks = getContext<MCItemOrBlock[]>("blocks")
</script>

{#if $currentProject != null}
<div class="h-screen {/* fixed */ ""} top-0 left-0 z-10" data-hierarchy={true} use:beginDeselectNode>
    <Sidebar resizable dragSide="right">
        <SidebarContent>
            <div class="">
                <h3 class="font-sans font-semibold text-lg ">{$currentProject?.metadata.name} <span class="text-neutral-500 text-xs ml-1">1.21.6</span></h3>
                <p class="text-sm font-light">5 objects</p>
            </div>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarContent grow >
            <div class="h-full" data-top-level="true">
                <div class="mb-2 flex flex-row justify-between items-center">
                    <h4 class="">Hierarchy View</h4>
                    <Dropdown>
                        <Picker align="center" bind:this={blockPicker} items={blocks.map(block => ({
                            name: block.displayName,
                            image: block.image,
                            onClick: (event: MouseEvent) => { addBlock(block, event) }
                        }))}>
                        </Picker>
                        <DropdownTrigger>
                            <div class="rounded-md hover:scale-110 hover:shadow-[0_0_12px_rgba(0,0,0,0.7)] transition-all duration-150">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </div>
                        </DropdownTrigger>
                        <DropdownContent align="center">
                            <DropdownItem onClick={() => { blockPicker?.open() }}>Block</DropdownItem>
                            <DropdownItem onClick={() => {}}>Item</DropdownItem>
                            <DropdownItem onClick={() => {}}>Text</DropdownItem>
                            <DropdownItem onClick={() => {}}>Armor Stand</DropdownItem>
                            <DropdownItem onClick={() => {}}>Block</DropdownItem>
                        </DropdownContent>
                    </Dropdown>
                </div>
                <Tree/>
            </div>
        </SidebarContent>
    </Sidebar>
</div>

{/if}
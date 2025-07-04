<script lang="ts">
    import { currentProject } from "$lib/client/stores/projects";
    import { BlockSize, SnappingMode, type Transform } from "$lib/common/types/object";
	import { values } from "lodash-es";
    import Sidebar from "../sidebar/Sidebar.svelte";
    import SidebarContent from "../sidebar/SidebarContent.svelte";
    import SidebarSeparator from "../sidebar/SidebarSeparator.svelte";
	import PropertyDropdown from "./PropertyDropdown.svelte";
	import PropertyInput from "./PropertyInput.svelte";

    let { transform = $bindable() } = $props<{
        transform: Transform;
    }>();
    
    function setTransform() {
        if ($currentProject == null) return;
        $currentProject.nodeTransforms.set($currentProject.selectedNode ?? "", transform);
    }


</script>


<div class="flex flex-col gap-4 h-full">
    <div>
        <h3 class="text-lg">Transform</h3>
    </div>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2 text-sm">
            <p class="font-light">Position</p>
            <div class="flex flex-row gap-2 items-center">
                <PropertyInput
                    type="number"
                    placeholder="0"
                    bind:value={transform.position.x}
                >X</PropertyInput>  
                <PropertyInput
                    type="number"
                    placeholder="0"
                    bind:value={transform.position.y}
                >Y</PropertyInput>
                <PropertyInput
                    type="number"
                    placeholder="0"
                    bind:value={transform.position.z}
                >Z</PropertyInput>
            </div>
        </div>
        <div class="flex flex-col gap-2 text-sm">
            <p class="font-light">Rotation</p>
            <div class="flex flex-row gap-2 items-center">
                <PropertyInput
                    type="number"
                    placeholder="0"
                    bind:value={transform.rotation.x}
                >X</PropertyInput>  
                <PropertyInput
                    type="number"
                    placeholder="0"
                    bind:value={transform.rotation.y}
                >Y</PropertyInput>
                <PropertyInput
                    type="number"
                    placeholder="0"
                    bind:value={transform.rotation.z}
                >Z</PropertyInput>
            </div>
        </div>
        <div class="flex flex-col gap-2 text-sm">
            <div class="flex flex-row gap-2 items-center">
                <div class="flex flex-col flex-1 gap-2">
                    <p class="font-light">Scale</p>
                    <PropertyDropdown
                        optionNames={["Very Small", "Small", "Medium", "Large", "Solid"]}
                        optionValues={[BlockSize.VERY_SMALL, BlockSize.SMALL, BlockSize.MEDIUM, BlockSize.LARGE, BlockSize.SOLID]}
                        bind:value={transform.scale}
                    />
                </div>
                <div class="flex flex-col flex-1 gap-2">
                    <p class="font-light">Snapping</p>
                    <div class="flex flex-row gap-1 items-center">
                        <PropertyDropdown
                            optionNames={["Scale", "Grid", "Custom"]}
                            optionValues={[SnappingMode.SCALE, SnappingMode.GRID, SnappingMode.CUSTOM]}
                            bind:value={transform.snapMode}
                            onChange={(value) => {
                                if(value == SnappingMode.SCALE) {
                                    transform.snapInterval = transform.scale
                                } else {
                                    transform.snapInterval = 0.1
                                }
                            }}
                        />
                        {#if transform.snapMode === SnappingMode.CUSTOM}
                            <PropertyInput type="number" bind:value={transform.snapInterval}>Snapping Interval</PropertyInput> 
                        {:else if transform.snapMode === SnappingMode.SCALE}
                            <PropertyDropdown
                                optionNames={["Very Small", "Small", "Medium", "Large", "Solid"]}
                                optionValues={[BlockSize.VERY_SMALL, BlockSize.SMALL, BlockSize.MEDIUM, BlockSize.LARGE, BlockSize.SOLID]}
                                onChange={(value) => transform.snapInterval = value / 10 }
                            />
                        {:else}
                            <PropertyDropdown
                                optionNames={["1.0", "0.5", "0.25", "0.125", "0.1", "0.05", "0.06125", "0.005"]}
                                optionValues={[1.0, 0.5, 0.25, 0.125, 0.1, 0.05, 0.06125, 0.005]}
                                bind:value={transform.snapInterval}
                            />
                        {/if}
                    </div>
                </div>
                <div class="flex-1"></div>
            </div>
        </div>
    </div>
</div>
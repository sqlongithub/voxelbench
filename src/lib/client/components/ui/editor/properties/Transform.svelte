<script lang="ts">
    import { currentProject } from "$lib/client/stores/projects";
    import { BlockSize, type Transform } from "$lib/common/types/object";
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
            <p class="font-light">Scale</p>
            <div class="flex flex-row gap-2 items-center">
                <PropertyDropdown
                    optionNames={["Very Small", "Small", "Medium", "Large", "Solid"]}
                    optionValues={[BlockSize.VERY_SMALL, BlockSize.SMALL, BlockSize.MEDIUM, BlockSize.LARGE, BlockSize.SOLID]}
                    bind:value={transform.scale}
                />
            </div>
        </div>
    </div>
</div>
<script>
	import { currentProject } from "$lib/client/stores/projects";
    import { NodeType } from "$lib/common/types/object";
	import { string } from "three/tsl";
	import Sidebar from "../sidebar/Sidebar.svelte";
	import SidebarContent from "../sidebar/SidebarContent.svelte";
	import SidebarSeparator from "../sidebar/SidebarSeparator.svelte";
	import Transform from "./Transform.svelte";

    let node = $derived(
        $currentProject?.getNode($currentProject?.selectedNode ?? "")
    );
</script>

{#if $currentProject != null && node}
<div class="fixed top-0 right-0 h-screen">
    <Sidebar resizable dragSide="left">
        <SidebarContent>
            <div class="">
                <div class="flex flex-row items-center gap-3 h-6 align-middle mb-2">
                    {#if node.metadata && (node.metadata.type === NodeType.BLOCK || node.metadata.type === NodeType.ITEM) }
                        {#if 'blockType' in node.metadata}
                            <img class="h-full" src={"/blocks_and_items/" + node.metadata.blockType + ".avif"} alt={String(node.metadata.blockType)} />
                        {/if}
                    {/if}
                    <div class="relative pb-0.5">
                        <h2 class="text-lg align-middle pb-[1px]">{node.metadata.name}</h2>
                        <p class="absolute left-0 top-9/10 text-xs font-light text-neutral-400 pl-[0.5px]">Properties</p>
                    </div>
                </div>
            </div>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarContent grow={true}>
            <div class="flex flex-col gap-4 h-full">
                {#if node?.transform}
                    <Transform bind:transform={node.transform} />
                {/if}
            </div>
        </SidebarContent>
    </Sidebar>
</div>
{/if}
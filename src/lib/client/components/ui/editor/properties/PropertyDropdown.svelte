<script lang="ts">
	import { transform } from "lodash-es";
	import Dropdown from "../../dropdown/Dropdown.svelte";
	import DropdownContent from "../../dropdown/DropdownContent.svelte";
	import DropdownItem from "../../dropdown/DropdownItem.svelte";
	import DropdownTrigger from "../../dropdown/DropdownTrigger.svelte";
	import { currentProject } from "$lib/client/stores/projects";

    let { optionNames, optionValues, value = $bindable(), onChange = (value: any) => {} } = $props<{
        optionNames?: string[];
        optionValues?: any[];
        value?: any;
        onChange?: (value: any) => void;
    }>();

    $effect(() => {
        //console.log("snap interval ", $currentProject?.getNode($currentProject.selectedNode).transform.snapInterval)
    })


</script>
<div class="flex flex-row gap-1 items-center">
    <Dropdown>
        <DropdownTrigger>
            <div class="flex flex-row gap-1 items-center border-surface-2 border-2 px-2 py-1 rounded-md">
                <span class="text-nowrap">{optionNames[optionValues.indexOf(value)]}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="size-3 pt-0.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </div>
        </DropdownTrigger>
        <DropdownContent align="left">
            {#each optionNames as name, i}
                <DropdownItem onClick={(event: MouseEvent) => { value = optionValues[i]; onChange(value); }}>
                    {name}
                </DropdownItem>
            {/each}
        </DropdownContent>
    </Dropdown>

</div>
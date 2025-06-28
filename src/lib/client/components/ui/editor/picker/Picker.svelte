<script lang="ts">
	import { clickOutside } from "$lib/client/actions/clickOutside";
	import { distance } from "fastest-levenshtein";
	import type { Snippet } from "svelte";
	import PickerItem from "./PickerItem.svelte";
	import Fuse from "fuse.js";

    // Define the type for children, e.g., as a function returning any or a specific type
    export type PickableItem = {
      name: string;
      image: string;
      onClick: (event: MouseEvent) => any;
    }
    
    type PickerProps = {
        align: "left" | "right" | "center";
        items: PickableItem[];
    };
    let { align, items }: PickerProps = $props();

    const fuse = new Fuse(items, {
      keys: ['name']
    })

    let visible = $state(false);

    export function open() {
        visible = true;
    }

    export function close() {
        visible = false;
    }
    


    let searchQuery = $state("");


</script>

{#if visible}
<div
  use:clickOutside={close}
  class="select-none absolute top-full 
         {align == 'right' ? 'right-0' : (align == 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2')}
         mt-1 p-2 bg-surface-1 border-2 border-surface-3 
         rounded-lg shadow-lg z-50 inline-block"
>
  <div class="flex flex-col gap-2.5">
    <div>
      <input
        class="w-full bg-surface-1 rounded-md placeholder-neutral-500 border-surface-4 border-2 "
        placeholder="Block Name"
        bind:value={searchQuery}
      />
    </div>
    <div class="scrollbar-thin pr-1 scrollbar-thumb-surface-2 scrollbar-hover:scrollbar-thumb-surface-3 [&::-webkit-scrollbar-button]:hidden scrollbar-track-transparent grid gap-0.5 grid-cols-5 max-h-120 overflow-y-scroll" style="grid-template-columns: repeat(5, minmax(5rem, max-content));" >
      {#each (searchQuery == "" ? items : fuse.search(searchQuery).map(result => result.item)) as item}
        <PickerItem name={item.name} image={item.image} onclick={item.onClick} />
      {/each}
    </div>
  </div>
</div>
{/if}
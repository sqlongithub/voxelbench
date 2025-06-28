<script lang="ts">
	import { getContext } from "svelte";
	import { any } from "three/tsl";

  let { children, onClick, icon = null, ...props } = $props();
  
  const dropdown = getContext<{ toggle: () => void }>('dropdown');

  function handleClick(event: MouseEvent) {
    dropdown.toggle();
    onClick?.(event);
  }
</script>

<div 
  class="select-none px-3 py-[0.31rem] flex flex-row text-nowrap items-center text-left gap-2.5 hover:bg-sky-600 transition-all duration-200 rounded-md cursor-pointer"
  onclick={handleClick}
  {...props}
>
  {#if icon}
    <div class="h-full">
        <img src={icon} alt="icon" class="h-full"/>
    </div>
  {/if}
  {@render children()}
</div>
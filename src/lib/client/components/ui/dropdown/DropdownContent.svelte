<script>
  import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
  
  let { children, align, ...props } = $props();
  
  const dropdown = getContext('dropdown');
</script>

{#if dropdown.open()}
  <div 
    class="flex flex-col gap-1 select-none absolute top-full {align == "right" ? "right-0" : (align == "left" ? "left-0" : "left-1/2 -translate-x-1/2")} mt-1 p-1.5 bg-surface-1 border-2 border-surface-3 rounded-lg shadow-lg z-50"
    {...props}
    transition:fade={{ duration: 50 }}
  >
    {@render children()}
  </div>
{/if}
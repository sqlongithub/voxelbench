<script lang="ts">
  import { getContext, type Snippet } from 'svelte';
  
  let { children }: { children?: Snippet } = $props();
  
  const dropdown = getContext<{ toggle: () => void }>('dropdown');
  if (!dropdown) {
    throw new Error('DropdownTrigger must be used within a Dropdown component');
  }
</script>

<button onclick={dropdown.toggle}>
  {#if children}
    {@render children()}
  {:else}
    Toggle
  {/if}
</button>
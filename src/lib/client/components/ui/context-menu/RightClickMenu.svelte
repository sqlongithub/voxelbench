<script lang="ts">
  import { writable } from 'svelte/store';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import Portal from 'svelte-portal';
	import { hideAllMenus, triggerHideMenus } from '$lib/client/stores/right-click';

  export let visible = writable(false);
  export let position = writable({ x: 0, y: 0 });

  function showMenu(event: MouseEvent) {
    event.preventDefault();
    visible.set(true);
    position.set({ x: event.clientX - 1, y: event.clientY - 5 });
  }

  function hideMenu() {
    visible.set(false);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') hideMenu();
  }

  const unsubscribe = hideAllMenus.subscribe(() => {
    if (visible) {
      hideMenu();
    }
  });

  onMount(() => {
    document.addEventListener('click', hideMenu);
    document.addEventListener('keydown', onKeyDown);

    onDestroy(() => {
      document.removeEventListener('click', hideMenu);
      document.removeEventListener('keydown', onKeyDown)
      unsubscribe();
    });
  });

  

  $: menuStyle = $position ? `top: ${$position.y}px; left: ${$position.x}px;` : '';

  // Expose method to parent components
  export function show(event: MouseEvent) {
    showMenu(event);
  }
</script>

{#if $visible}
  <Portal>
    <div
      class="fixed border-surface-3 border bg-surface-1 shadow-lg rounded-md min-w-[150px] z-100 p-1.5 mt-1 flex flex-col gap-0"
      style={menuStyle}
      role="menu"
    >
      <slot />
    </div>
  </Portal>
{/if}

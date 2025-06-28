<script lang="ts">
	import { currentProject } from "$lib/client/stores/projects";
	import { onMount } from "svelte"
	import { RGBA_ASTC_10x5_Format } from "three";

    const { size = 250, dragSide = "right", resizable = false, children } = $props();

    let sidebarWidth = $state(320);
    let resizing = false;

    let startX = 0;
    let startWidth = 320;

    

    function startResizing(event: MouseEvent) {
        startX = event.x
        startWidth = sidebarWidth
        resizing = true;
        document.body.style.cursor = "ew-resize"
        event.preventDefault()
    }

    function stopResizing(event: MouseEvent) {
        resizing = false;
        document.body.style.cursor = ""
        event.preventDefault()
    }

    function onMouseMove(event: MouseEvent) {
        if(resizing) {
            //console.log("resizing to " + (event.x - 2))
            sidebarWidth = Math.max(270, Math.min(800, Math.round(startWidth + (dragSide == "right" ? (event.x - startX) : (startX - event.x)))))
        }
    }

    onMount(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stopResizing);

        return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', stopResizing);
        };
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
{#if dragSide === "left"}
  <div class="flex h-screen" data-sidebar="left">
    {#if resizable}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="w-4 bg-transparent cursor-ew-resize flex items-center justify-end group"
        onmousedown={startResizing}
        role="separator"
        aria-orientation="vertical"
      >
        <div class="translate-0 w-[1.5px] h-full bg-surface-2 group-hover:bg-blue-600 transition-colors duration-200"></div>
      </div>
    {/if}
    <div
      style="width: {sidebarWidth}px"
      class="bg-surface-1 pt-2 flex flex-col"
    >
      {@render children()}
    </div>
  </div>
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="flex h-screen" data-sidebar="right">
    <div
      style="width: {sidebarWidth}px"
      class="bg-surface-1 pt-2 flex flex-col"
    >
      {@render children()}
    </div>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    {#if resizable}
      <div
        class="w-4 bg-transparent cursor-ew-resize flex items-center group"
        onmousedown={startResizing}
        role="separator"
        aria-orientation="vertical"
      >
        <div class="translate-0 w-[1.5px] h-full bg-surface-2 group-hover:bg-blue-600 transition-colors duration-200"></div>
      </div>
    {/if}
  </div>
{/if}
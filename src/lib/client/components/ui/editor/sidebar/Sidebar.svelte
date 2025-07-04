<script lang="ts">
	import { currentProject } from "$lib/client/stores/projects";
	import { onMount } from "svelte"
	import { RGBA_ASTC_10x5_Format } from "three";

    const { minWidth = 270, maxWidth = 800, size = minWidth, dragSide = "right", resizable = false, children } = $props();

    let sidebarWidth = $state(size);
    let resizing = false;

    let startX = 0;

    function startResizing(event: MouseEvent) {
        startX = event.x
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
            sidebarWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(size + (dragSide == "right" ? (event.x - startX) : (startX - event.x)))))
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
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
{#if dragSide === "right"}
  <div class="flex h-screen relative" data-sidebar="left">
    <div
      style="width: {sidebarWidth}px"
      class="bg-surface-1 pt-2 flex flex-col ml-auto"
    >
      {@render children()}
    </div>
    {#if resizable}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="absolute top-0 w-4 h-full bg-transparent cursor-ew-resize flex items-center justify-center group z-10"
        style="right: -8px;"
        onmousedown={startResizing}
        role="separator"
        aria-orientation="vertical"
      >
        <div class="w-[1.5px] h-full bg-surface-2 group-hover:bg-blue-600 transition-colors duration-200"></div>
      </div>
    {/if}
  </div>
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="flex h-screen relative" data-sidebar="right">
    <div
      style="width: {sidebarWidth}px"
      class="bg-surface-1 pt-2 flex flex-col"
    >
      {@render children()}
    </div>
    {#if resizable}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="absolute top-0 w-4 h-full bg-transparent cursor-ew-resize flex items-center justify-center group z-10"
        style="left: -8px;"
        onmousedown={startResizing}
        role="separator"
        aria-orientation="vertical"
      >
        <div class="w-[1.5px] h-full bg-surface-2 group-hover:bg-blue-600 transition-colors duration-200"></div>
      </div>
    {/if}
  </div>
{/if}
<script lang="ts">
	import { clickOutside } from "$lib/client/actions/clickOutside";
	import { setContext } from "svelte";

    let { children, open = $bindable(false), ...props } = $props();

    let triggerElement: HTMLElement | null = $state(null);

    function toggle() {
        open = !open;
        console.log("Dropdown toggled:", open);
    }

    function close() {
        open = false;
    }

    // Provide context to child components
    setContext('dropdown', {
        open: () => open,
        toggle,
        close,
        triggerElement: () => triggerElement,
        setTriggerElement: (el: HTMLElement | null) => triggerElement = el
    });

    $effect(() => {
        if (!open) return;
        
        function handleClickOutside(event: MouseEvent) {
            console.log("Click outside detected:", event);
            if (triggerElement && !triggerElement.contains(event.target as Node)) {
                console.log("Closing dropdown due to outside click");
                close();
            }
        }
        
        document.addEventListener('click', handleClickOutside);
        
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });

</script>

<div class="relative flex justify-center items-center" use:clickOutside={close}>
  {@render children()}
</div>
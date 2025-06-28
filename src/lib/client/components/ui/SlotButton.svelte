<script lang="ts">
    let { children, ...props } = $props();
</script>

<button class="select-none flex flex-row items-center justify-center px-4 gap-1 py-2 rounded-full border-surface-3 border-2 cursor-pointer" {...props}>
    {@render children()}
</button>
<script lang="ts">
    export let grow: boolean = false;
</script>

<div class="py-6 px-8 {grow ? 'flex-1' : ''}">
    <slot />
</div>
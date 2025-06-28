<script lang="ts">
  export let danger = false;
  export let onClick: () => void = () => {};
</script>

<button
  class="{danger ? "text-red-400" : "text-white" } select-none px-3 text-sm py-1.5 w-full flex flex-row text-nowrap items-center text-left gap-2.5 hover:bg-surface-2 transition-all duration-200 rounded-md cursor-pointer"
  on:click={() => onClick()}
>
  <slot />
</button>
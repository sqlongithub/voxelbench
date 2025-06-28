<script lang="ts">
    export let image, onclick, name;
</script>

<button class="hover:bg-surface-0 rounded-md p-1 inline-flex w-20" on:click={onclick}>
  <div class="flex flex-col items-center w-full gap-1">
    <!-- svelte-ignore a11y_missing_attribute -->
    <img src={image} class="p-0.5 w-16 h-16 object-contain" loading="lazy" />
    <p class="line-clamp-2 text-center break-words whitespace-normal w-full leading-4 font-sans text-xs">
      {name}
    </p>
  </div>
</button>

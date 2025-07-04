<script lang="ts">
	import type { Snippet } from "svelte";

    let { onChange = (value: any) => {}, type, placeholder, value = $bindable(), children } = $props<{
        onChange?: (value: any) => void;
        type: "number" | "string";
        placeholder?: string;
        value?: any;
        children?: Snippet;
    }>();

    function onInputChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if(!input.value) {
            onChange(0);
            return;
        }
        const value = parseFloat(input.value);
        onChange(value);
    }

    let focus = $state(false);

    $effect(() => {

    })
</script>

<div class="flex flex-row gap-1 items-center w-full">
    <div class="bg-surface-2 w-full flex flex-row items-center gap-1 pl-2 py-1 rounded-md {focus ? "outline-blue-500 outline-2" : ""}">
        <div class="select-none text-neutral-400">
            {@render children?.()}
        </div>
        <input onfocus={() => focus = true} onblur={() => focus = false} onchange={onInputChange} {type} {placeholder} class="focus:outline-none focus:ring-0  box-border border-none w-full flex-1 text-left text-sm pl-1.5 bg-transparent h-4 rounded-md placeholder-neutral-500" bind:value={value} />
    </div>
</div>
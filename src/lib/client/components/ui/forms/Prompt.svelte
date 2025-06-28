<script lang="ts">
    import { fade } from 'svelte/transition';
	import { setContext, type Component } from "svelte";
    import { INPUT_REGISTRY, type InputRegistry } from "./form-context";
	import { cubicIn, expoIn, linear, quadIn, sineIn } from 'svelte/easing';

    let { children, title, onsubmit, visible = false, ...props } = $props();

    export function show() {
        visible = true;
    }

	const inputs: { name: string, validate: () => boolean, reset: () => void }[] = [];

	function register(name: string, validate: () => boolean, reset: () => void) {
        console.log("Registering")
		inputs.push({ name, validate, reset });
	}

    function unregister(name: string) {
        const index = inputs.findIndex(item => item.name === name);
        if (index !== -1) {
            inputs.splice(index, 1);
        }
    }

	setContext<InputRegistry>(INPUT_REGISTRY, { register, unregister });

    export function hide() {
        visible = false;
        inputs.forEach(({ reset }) => {
            if (reset) {
                reset();
            }
        });
    }

    function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
        console.log(inputs.length)

		let allValid = inputs.every(({ name, validate }) => validate?.());

		if (allValid) {
			onsubmit?.(event);
		} else {
            
        }
	}

</script>

{#if visible}
<div
    transition:fade={{ duration: 200, delay: 10, easing: linear }}
    class="absolute top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black/50 backdrop-blur-[2px]">

    <div class="bg-surface-1 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 class="text-xl font-semibold mb-4">{title}</h2>
        <form onsubmit={handleSubmit} {...props} novalidate>
            {@render children()}
            <div class="flex justify-end mt-4">
                <button type="button" class="px-4 py-2 mr-2 border-surface-3 border-2 text-white rounded hover:bg-surface-2 transition-colors" onclick={hide}>
                    Cancel
                </button>
                <button type="submit" class="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors">Submit</button>
            </div>
        </form>
    </div>
</div>
{/if}
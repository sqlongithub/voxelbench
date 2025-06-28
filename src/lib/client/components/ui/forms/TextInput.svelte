<script lang="ts">
    import { onMount, getContext, onDestroy } from 'svelte';
    import { INPUT_REGISTRY, type InputRegistry } from './form-context';
    let { required = false, name, placeholder = 'Enter text', type="text", ...props } = $props();

    let valid = $state(true);
    let value = $state('');

    function onblur() {
        validate();
    }

    function oninput(event: Event) {
        if(!valid) {
            validate();
        }
    }

    const inputRegistry = getContext<InputRegistry>(INPUT_REGISTRY) ?? {};

    onMount(() => {
        inputRegistry.register?.(name, validate, reset);
    });
    
    onDestroy(() => {
        inputRegistry.unregister?.(name);
    });

    export function validate() {
        if (required && !value.trim()) {
            valid = false;
            return false;
        }
        valid = true;
        return true;
    }

    export function reset() {
        value = '';
        valid = true;
    }
</script>

<input
    {required}
    autocomplete="off"
    name={name}
    {type}
    bind:value={value}
    {onblur}
    {oninput}
    placeholder={placeholder}
    class="{!valid ? 'border-red-500' : 'border-surface-3'} 
            transition-[color,background-color,border-color,text-decoration-color,fill,stroke] duration-200 
            ring-0 
            placeholder-surface-4 
            border-2 
            bg-surface-1 
            p-2 
            rounded 
            w-full"
/>

<script lang="ts">
    import { onMount } from 'svelte';
    import { projects } from '$lib/client/stores/projects';
    import ProjectsContainer from '$lib/client/components/projects/ProjectsContainer.svelte';
   
    onMount(() => {
        
    });
</script>

<ProjectsContainer />
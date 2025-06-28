<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import ProjectCard from './ProjectCard.svelte';
	import type { Project } from '$lib/common/types/project.svelte';
    
    
    export let onClick
</script>

<ProjectCard 
    isNewProject={true}
    title="New project"
    image="add.svg"
    imageAlt="Create new project"
    {onClick}
/>
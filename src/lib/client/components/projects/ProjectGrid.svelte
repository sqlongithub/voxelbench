<script lang="ts">
    import type { Project, ProjectMetadata } from '$lib/common/types/project.svelte';
    import ProjectCard from './ProjectCard.svelte';
    import NewProjectCard from './NewProjectCard.svelte';
	import Prompt from '../ui/forms/Prompt.svelte';
    
    export let projects: ProjectMetadata[] = [];
    export let prompt: Prompt

    function handleNewProjectClick() {
        console.log('Create new project');
        // Handle new project creation
    }
</script>

<div class="relative overflow-auto flex-1 scrollbar-thin pr-1 scrollbar-thumb-surface-2 scrollbar-hover:scrollbar-thumb-surface-3 [&::-webkit-scrollbar-button]:hidden scrollbar-track-transparent">
    <div class="overflow-visible p-2 min-h-full">
        <div class="grid auto-rows-fr
                    grid-cols-2
                    sm:grid-cols-3
                    lg:grid-cols-4 lg:grid-rows-2
                    gap-4 md:gap-6 lg:gap-8
                    flex-1 min-h-0 overflow-visible relative">
        
            {#each projects as project}
                <ProjectCard {project} />
            {/each}

            {#if !projects || projects.length < 5}
                <NewProjectCard onClick={(event: MouseEvent) => {
                    prompt.show();
                    event?.preventDefault()
                }} /> 
            {/if}
        </div>
    </div>      
</div>

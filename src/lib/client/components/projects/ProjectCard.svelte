<script lang="ts">
    import { formatTimeSinceLastModified, type Project, type ProjectMetadata } from '$lib/common/types/project.svelte';
    import { formatDistanceToNow } from 'date-fns';
	import Dropdown from '../ui/dropdown/Dropdown.svelte';
	import DropdownContent from '../ui/dropdown/DropdownContent.svelte';
	import DropdownTrigger from '../ui/dropdown/DropdownTrigger.svelte';
	import DropdownItem from '../ui/dropdown/DropdownItem.svelte';
	import RightClickMenu from '../ui/context-menu/RightClickMenu.svelte';
	import RightClickAction from '../ui/context-menu/RightClickAction.svelte';
	import RightClickSeparator from '../ui/context-menu/RightClickSeparator.svelte';
	import { storageBackend } from '$lib/client/storage';
	import { redirect } from '@sveltejs/kit';
    
    export let project: ProjectMetadata | null = null;
    export let isNewProject: boolean = false;
    export let title: string = project?.name || 'New project';
    export let image: string = project?.image || 'chair.png';
    export let imageAlt: string = project ? `Preview of ${project.name}` : 'Create new project';

    export let onClick = undefined

    let contextMenuRef: RightClickMenu;

    function onRightClickCard(event: MouseEvent) {
        event.preventDefault();
        setTimeout(() => contextMenuRef.show(event), 0);
    }

    function deleteProject() {
        if (project?.id) {
            storageBackend.deleteProject(project.id);
        }
    }

    function rename() {

    }


	function openProject(): void {
		
	}


	function openProjectInNewTab(): void {
		
	}

</script>

<a
    class="flex flex-col border border-surface-3 rounded-md
        duration-200 hover:shadow-lg shadow-surface-0 hover:scale-104 hover:z-20 group origin-center transition-all cursor-pointer
        min-h-[200px] md:min-h-[240px]"
    class:border-dashed={isNewProject}
    class:hover:border-solid={isNewProject}
    class:hover:bg-surface-1={isNewProject}
    onclick={isNewProject ? onClick : openProject}
    onkeydown={(e) => e.key === 'Enter' && openProject()}
    role="button"
    tabindex="0"
    oncontextmenu={onRightClickCard}
    href="/project/{project?.id}"
>
   
    <div
		class="absolute inset-0 rounded-md pointer-events-none opacity-0
			group-hover:opacity-100 transition-opacity
			bg-gradient-to-bl from-neutral-600/10 to-surface-2/10"
	></div>

    <div class="bg-surface-1 rounded-t-md flex-1 flex items-center justify-center p-4 md:p-6">
        <div class="aspect-square w-full max-w-[120px] md:max-w-[150px] flex items-center justify-center">
            <img
                src={image}
                alt={imageAlt}
                class="select-none object-contain w-full h-full"
            />
        </div>
    </div>
   
    <div class="bg-surface-2 rounded-b-md px-3 py-2 md:px-4 md:py-3
               border-surface-3 border-t flex-shrink-0 leading-snug text-sm">
        <div class="flex justify-between">
            <h4 class="select-none font-bold truncate">{title}</h4>
        </div>
        <p class="select-none font-extralight text-xs md:text-sm line-clamp-1">
            {#if isNewProject}
                Create a new project
            {:else}
                Last modified: <span class="font-medium">{formatTimeSinceLastModified(project)}</span>
            {/if}
        </p>
    </div>

    <RightClickMenu bind:this={contextMenuRef}>
        <RightClickAction onClick={openProject}>Open</RightClickAction>
        <RightClickAction onClick={openProjectInNewTab}>Open in new tab</RightClickAction>
        <RightClickSeparator />
        <RightClickAction onClick={rename}>Rename</RightClickAction>
        <RightClickAction danger onClick={deleteProject}>Delete</RightClickAction>
        
    </RightClickMenu>
</a>
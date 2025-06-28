<script lang="ts">
    import { projects } from '$lib/client/stores/projects';
	import PlusIcon from '../ui/PlusIcon.svelte';
	import Prompt from '../ui/forms/Prompt.svelte';
	import SlotButton from '../ui/SlotButton.svelte';
    import ProjectGrid from './ProjectGrid.svelte';
	import TextInput from '../ui/forms/TextInput.svelte';
	import { createProjectWithName, storageBackend } from '$lib/client/storage';
	import type { Project } from '$lib/common/types/project.svelte';

    let prompt: Prompt | null = $state(null);

    async function createProject(event: SubmitEvent) {
        event.preventDefault();

        const formData = new FormData(event.target as HTMLFormElement);
        const projectName = formData.get('project-name') as string;

        if (projectName) {
            console.log('Creating project:', projectName);
  
            let project = await createProjectWithName(projectName);
            console.log(`Project created with id ${project.metadata.id}, saving.`);
            console.log("project: ", project)
            storageBackend.saveProject(project.getSnapshot());

            prompt?.hide();
        } else {
            console.error('Project name is required');
        }
    }

</script>

<div class="flex justify-center items-center min-h-screen p-16">
    <div class="bg-surface-1 border border-surface-3 flex flex-col gap-6 md:gap-8 lg:gap-10
                rounded-xl min-w-3xl max-w-7xl w-full
                max-h-[90vh] md:max-h-[71vh] px-10 py-8">
       
        
        <div class="flex flex-row justify-between">
            <h3 class="text-2xl md:text-3xl lg:text-4xl font-semibold text-center md:text-left">
                Your projects
            </h3>
            <SlotButton onclick={() => { prompt?.show(); }}>
                <PlusIcon />
                <span class="hidden md:inline">New project</span>
            </SlotButton>
            <Prompt bind:this={prompt} visible={false} title="Create New Project" onsubmit={createProject}>
                <TextInput required name="project-name" placeholder="Enter project name" />
            </Prompt>
            <!-- <Dropdown>
                <DropdownTrigger>
                    {#snippet trigger({ onclick })}
                        <SlotButton {onclick}>
                            <PlusIcon />
                            <span class="hidden md:inline">New project</span>
                        </SlotButton>
                    {/snippet}
                </DropdownTrigger>
                <DropdownContent>
                    <DropdownItem icon="cube.svg" onclick={() => {/* handle new model creation here */}}>
                        New Model
                    </DropdownItem>
                    <DropdownItem icon="scene2.svg" onclick={() => {/* handle new scene creation here */}}>
                        New Scene
                    </DropdownItem>
                </DropdownContent>
            </Dropdown> -->
        </div>

        <ProjectGrid projects={$projects} {prompt} />
    </div>
</div>
<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { storageBackend } from '$lib/client/storage';
	import { Project } from '$lib/common/types/project.svelte';
	import HierarchyView from '$lib/client/components/ui/editor/HierarchyView.svelte';
	import { get, writable, type Writable } from 'svelte/store';
	import type { PageProps } from './$types';
	import EditorViewport from '$lib/client/components/ui/editor/3d/EditorViewport.svelte';
	import { currentProject } from '$lib/client/stores/projects';
	import PropertiesView from '$lib/client/components/ui/editor/properties/PropertiesView.svelte';

	let { data }: PageProps = $props();
	
	const { id, blocks } = data;
	setContext("blocks", blocks)



	onMount(async () => {
		if (!browser) return;

		let start = performance.now();
		let result = await storageBackend.loadProject(id);
		let end = performance.now();

			if (result.success) {
				currentProject.set(result.data)
				console.log('Successfully loaded project with ' + result.data.nodeMetadata.size + ' nodes in ' + (end - start) + ' ms.');
				console.log('Project nodes: ', result.data.nodeMetadata.values().toArray());

		} else {
			console.log(result.error);
			goto('/');
		}

		if (!$currentProject) {
			goto('/');
		}
	});
</script>

{#if browser}
	<!-- Optionally, show loading state -->
	{#if currentProject}
		<div class="flex w-screen flex-row h-screen">
			<HierarchyView></HierarchyView>
			<div class="flex-1 flex flex-col h-full min-w-0">
				<EditorViewport></EditorViewport>
			</div>
			{#if $currentProject?.selectedNode && $currentProject.selectedNode != ""}
				<PropertiesView />
			{/if}
		</div>
		<!-- Render project details here -->
	{:else}
		<div class="w-screen h-screen flex justify-center items-center">
			<h1>Loading Project...</h1>
		</div>
	{/if}
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { storageBackend } from '$lib/client/storage';
	import { projects } from '$lib/client/stores/projects';
	import { triggerHideMenus } from '$lib/client/stores/right-click';

	let { children } = $props();
	onMount(async () => {
		await storageBackend.init();
		const result = await storageBackend.loadProjectMetadataList();
		if (result.success) {
			projects.set(result.data);
		} else {
			projects.set([]);
			console.error('Failed to load project metadata:', result.error);
		}
	})

</script>

<div oncontextmenu={(e) => {
	triggerHideMenus()
}} role="region">
	{@render children()}
</div>
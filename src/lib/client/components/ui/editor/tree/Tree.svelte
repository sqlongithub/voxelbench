<script lang="ts">
	import { onMount, setContext } from "svelte";
	import TreeNode from "./TreeNode.svelte";
	import { writable } from "svelte/store";
	import { set } from "date-fns";
	import { currentProject } from "$lib/client/stores/projects";
	import type { SceneNodeMetadata } from "$lib/common/types/object";
	import { SvelteMap } from "svelte/reactivity";
	import type { Scene } from "three";

    let dropNode = writable("");
    let dragging = writable("")
    let mousePos = writable([0, 0])
    setContext("mouse-pos", mousePos)
    setContext("dragging", dragging)
    setContext("drop-node", dropNode)

    function mouseMove(event: MouseEvent) {
        mousePos.set([event.x, event.y])

        if ($dragging.length == 0) return;

        const elements = document.elementsFromPoint(event.x, event.y);
        const dropZone = elements.find(el => el.hasAttribute("data-drop-id") || el.hasAttribute("data-top-level"))

        if (dropZone) {
            if(dropZone.hasAttribute("data-top-level")) {
                console.log("top level")
                dropNode.set("");
                return
            }
            const dropId = dropZone.getAttribute('data-drop-id');
            if(dropId == $dropNode) return;
            dropNode.set(dropId ?? "");
        } else {

        }
    }

    onMount(() => {
        document.addEventListener("mousemove", mouseMove);
    })


    let nodes: SceneNodeMetadata[] = $derived(
        $currentProject?.nodeMetadata.values().filter(node => !node.parent || node.parent == "").toArray() ?? [ ]
    )
    
    $effect(() => {
        console.log("nodes changed: ", nodes)
        console.log("Heres the values ", $currentProject?.nodeMetadata.values())
        console.log("heres how many where !node", $currentProject?.nodeMetadata.values().filter(node => !node).toArray().length)
        console.log("heres how many where !node.parent", $currentProject?.nodeMetadata.values().filter(node => !node.parent || node.parent === undefined).toArray().length)
        console.log("heres how many where filter works", $currentProject?.nodeMetadata.values().filter(node => !node.parent || node.parent == "").toArray().length)
        console.log("Parent values:", 
    $currentProject?.nodeMetadata.values().toArray().map(node => ({
      hasParent: 'parent' in node,
      parent: node.parent,
      parentStrict: node.parent === undefined,
      parentLoose: node.parent == null,
      parentTruthy: !node.parent
    }))
  );
    })

</script>

<ul class="text-xs">
    {#each Array.from(nodes) as nodeMetadata}
        <TreeNode {nodeMetadata} indentation={0} />
    {/each}
</ul>
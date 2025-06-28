import { formatDistanceToNow } from "date-fns";
import { NodeType, BlockSize, type SceneNodeMetadata, type Transform } from "./object";
import type { Result } from "./result";
import { get } from "svelte/store";


// stores/projects.ts
import { writable } from 'svelte/store';
import type { SnapshotProjectData } from "$lib/client/storage/indexeddb-backend";
import { SvelteMap } from "svelte/reactivity";

export type ProjectId = string & { readonly __brand: 'ProjectId' };

export const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' as const;

export interface ProjectMetadata {
    id: ProjectId;
    name: string;
    lastModified: Date;
    image: string;
}

export function formatTimeSinceLastModified(project: ProjectMetadata | null): String {
    if (!project) return 'once upon a time';
    const date = project.lastModified

    const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) {
		return 'just now';
	}

	return formatDistanceToNow(date, { addSuffix: true });
}

export class Project {
    metadata: ProjectMetadata;
    nodeMetadata: SvelteMap<string, SceneNodeMetadata> = $state(new SvelteMap());
    nodeTransforms: SvelteMap<string, Transform> = $state(new SvelteMap());
    selectedNode = $state("")
    
    valueConstructor(value: any) {
        const a = $state(value)
        return a
    }

    constructor(metadata: ProjectMetadata, nodeMetadata?: SvelteMap<string, SceneNodeMetadata>, transforms?: SvelteMap<string, Transform>) {
        this.metadata = $state(metadata);
        if (nodeMetadata) {
            this.nodeMetadata.clear();
            for (const [key, value] of nodeMetadata) {
                this.nodeMetadata.set(key, this.valueConstructor(value));
            }
        }
        
        if (transforms) {
            this.nodeTransforms.clear();
            for (const [key, value] of transforms) {
                this.nodeTransforms.set(key, this.valueConstructor(value));
            }
        }
    }

    getSnapshot(): SnapshotProjectData {
        return {
            metadata: $state.snapshot(this.metadata),
            nodeMetadata: $state.snapshot(this.nodeMetadata),
            transforms: $state.snapshot(this.nodeTransforms),
        }
    }

    getNode(uuid: string): { metadata: SceneNodeMetadata, transform: Transform } {
        return {
            metadata: this.nodeMetadata.get(uuid)!,
            transform: this.nodeTransforms.get(uuid)!
        }
    }

    selectNode(uuid: string) {
        this.selectedNode = uuid
    }

    deselectNode() {
        this.selectedNode = ""
    }

    addNode(meta: SceneNodeMetadata, transform: Transform) {
        this.nodeMetadata.set(meta.uuid, this.valueConstructor(meta))
        this.nodeTransforms.set(meta.uuid, this.valueConstructor(transform))
        console.log("changed node, ", this.nodeMetadata, this.nodeTransforms)
    }

    removeNode(uuid: string) {
        
    }

    // This function makes the node with uuid {node} a child of the node with uuid {parent}.
    makeNodeChildOf(nodeUuid: string, parentUuid: string) {
        let node = this.nodeMetadata.get(nodeUuid)
        let parent = this.nodeMetadata.get(parentUuid)
        if (!node) return
        
        // Prevent making a node a child of itself or creating cycles
        if (nodeUuid === parentUuid || (parent && (parent.parent === nodeUuid))) return
        
        console.log(`Before: node ${nodeUuid} parent was "${node.parent}", parent ${parentUuid} had children:`, parent?.children)
        
        // Remove from current parent (if it has one)
        if (node.parent && node.parent !== "") {
            let currentParent = this.nodeMetadata.get(node.parent)
            if (currentParent?.children) {
                // Create new array instead of mutating
                currentParent.children = currentParent.children.filter(childId => childId !== nodeUuid)
            }
        }
        
        // Set new parent
        node.parent = parentUuid
        
        // Add to new parent's children
        if (parent && !parent.children) {
            parent.children = []
        }
        
        // Avoid duplicates
        if (parent && (!parent.children || !parent.children.includes(nodeUuid))) {
            // Create new array instead of mutating for better reactivity
            parent.children = [...(parent.children ?? []), nodeUuid]
        }
        
        console.log(`After: node ${nodeUuid} parent is "${node.parent}", parent ${parentUuid} has children: ${parent?.children ? parent?.children : ""}`)

    }

    
}

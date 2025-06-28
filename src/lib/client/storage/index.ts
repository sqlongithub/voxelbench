import { Project, type ProjectId } from '$lib/common/types/project.svelte';
import { get } from 'svelte/store';
import { projects } from '../stores/projects.js';
import { IndexedDBStorageBackend } from './indexeddb-backend.js';
import type ProjectGrid from '../components/projects/ProjectGrid.svelte';

export const storageBackend = new IndexedDBStorageBackend();

function generateShortId(length = 8): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

export async function generateUniqueProjectId(): Promise<ProjectId> {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const id = generateShortId();
            
            // Check if ID already exists
            const existing = get(projects).some(p => p.id == id)
            if (!existing) {
                // ID doesn't exist, we can use it
                return id as ProjectId;
            }
            
            attempts++;
        }
        
        // Fallback to UUID if we can't find a unique short ID
        return crypto.randomUUID() as ProjectId;
    }
export async function createProjectWithName(projectName: string): Promise<Project> {
    let id = await generateUniqueProjectId()

    return new Project({
        id: id,
        name: projectName,
        lastModified: new Date(),
        image: "",
    })
    
}


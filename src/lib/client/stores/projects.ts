
import { Project, type ProjectMetadata } from '$lib/common/types/project.svelte';
import { writable } from 'svelte/store';

export const projects = writable<ProjectMetadata[]>([]);
export const currentProject = writable<Project | null>(null)
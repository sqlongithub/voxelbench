import type { Project, ProjectMetadata } from "$lib/common/types/project.svelte";
import type { Result } from "$lib/common/types/result";
import type { SnapshotProjectData } from "../storage/indexeddb-backend";

export interface StorageBackend {
    forceSaveProject(project: SnapshotProjectData): Promise<Result<void>>
    saveProjectLater(project: SnapshotProjectData): void
    
    loadProject(uuid: string): Promise<Result<Project>>
    deleteProject(uuid: string): Promise<Result<void>>
    duplicateProject(uuid: string, newName: string): Promise<Result<Project>>;
    
    loadProjectMetadataList(): Promise<Result<ProjectMetadata[]>>
    updateProjectMetadata(metadata: ProjectMetadata): Promise<Result<void>>;
}
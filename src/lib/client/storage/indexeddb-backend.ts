import type { SceneNodeMetadata, Transform } from "$lib/common/types/object";
import { Project, type ProjectMetadata } from "$lib/common/types/project.svelte";
import type { Result } from "$lib/common/types/result";
import type { StorageBackend } from "$lib/client/stores/storage-backend";
import { struct } from "three/tsl";
import { generateUniqueProjectId } from ".";
import { projects } from "../stores/projects";
import { SvelteMap } from "svelte/reactivity";


export type SnapshotProjectData = {
    metadata: ProjectMetadata
    nodeMetadata: Map<string, SceneNodeMetadata>;
    transforms: Map<string, Transform>;
}

export class IndexedDBStorageBackend implements StorageBackend {
    private dbName = 'BlenderCloneDB';
    private dbVersion = 3;
    private db: IDBDatabase | null = null;
    
    // Store names
    private readonly METADATA_STORE = 'projectMetadata';
    private readonly PROJECTS_STORE = 'projects';

    
    async init(): Promise<Result<void>> {
        return new Promise((resolve) => {
            
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => resolve({ 
                success: false, 
                error: new Error('Failed to open IndexedDB') 
            });
            
            request.onsuccess = () => {
                this.db = request.result;
                
                const tx = this.db.transaction(this.METADATA_STORE, 'readonly');
                const metadataStore = tx.objectStore(this.METADATA_STORE);
                const metaReq = metadataStore.getAll();

                metaReq.onsuccess = () => {
                    projects.set(metaReq.result);
                    resolve({ success: true, data: undefined });
                };

                metaReq.onerror = () => {
                    console.error('Failed to load metadata:', metaReq.error);
                    resolve({ success: false, error: new Error("Failed to load metadata from db") });
                };

            };
            
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                console.log("upgrade")
                
                // Create metadata store (lightweight, for quick loading)
                if (!db.objectStoreNames.contains(this.METADATA_STORE)) {
                    const metadataStore = db.createObjectStore(this.METADATA_STORE, { 
                        keyPath: 'id' // Primary key
                    });
                    
                    // Create indices for efficient querying
                    // Index on 'lastModified' allows fast sorting by date
                    metadataStore.createIndex('lastModified', 'lastModified', { unique: false });
                    
                    // Index on 'name' allows fast searching by project name
                    metadataStore.createIndex('name', 'name', { unique: false });
                    
                    // Compound index for more complex queries (optional)
                    metadataStore.createIndex('nameAndDate', ['name', 'lastModified'], { unique: false });
                }
                
                // Create projects store (heavy data)
                if (!db.objectStoreNames.contains(this.PROJECTS_STORE)) {
                    db.createObjectStore(this.PROJECTS_STORE, { 
                        keyPath: 'metadata.id' 
                    });
                }
            };
            
        });
        
    }
    
    async saveProject(project: SnapshotProjectData): Promise<Result<void>> {
        console.log(project)
        if (!this.db) {
            console.error("saveProject: Database not initialized");
            return { success: false, error: new Error('Database not initialized') };
        }

        const transaction = this.db.transaction([this.METADATA_STORE, this.PROJECTS_STORE], 'readwrite');

        // Debug: Track transaction state
        transaction.oncomplete = () => console.log("Transaction completed successfully");
        transaction.onerror = (e) => console.error("Transaction error:", transaction.error);
        transaction.onabort = () => console.warn("Transaction aborted");

        try {
            // Update timestamp
            project.metadata.lastModified = new Date();
            console.log("saveProject: Updated metadata timestamp", project.metadata.lastModified);

            // Debug: Validate keyPath
            if (!project.metadata.id) {
                console.error("saveProject: Missing metadata.id", project.metadata);
                throw new Error("Metadata is missing required 'id' key");
            }

            // Save metadata
            console.log("saveProject: Saving metadata", project.metadata);
            const metadataStore = transaction.objectStore(this.METADATA_STORE);
            await this.promisifyRequest(metadataStore.put(project.metadata));
            console.log("saveProject: Metadata saved");

            // Save full project
            console.log("saveProject: Saving project data", project);
            const projectsStore = transaction.objectStore(this.PROJECTS_STORE);
            await this.promisifyRequest(projectsStore.put(project));
            console.log("saveProject: Project data saved");
            
            projects.set(await this.promisifyRequest(metadataStore.getAll()))

            return { success: true, data: undefined };
        } catch (error) {
            console.error("saveProject: Caught exception", error);
            return {
                success: false,
                error: new Error(`Failed to save project: ${error instanceof Error ? error.message : String(error)}`),
            };
        }
    }
    
    async loadProjectMetadataList(): Promise<Result<ProjectMetadata[]>> {
        if (!this.db) return { success: false, error: new Error('Database not initialized') };
        
        try {
            const transaction = this.db.transaction([this.METADATA_STORE], 'readonly');
            const store = transaction.objectStore(this.METADATA_STORE);
            const index = store.index('lastModified');
            
            // Use the index to get records in reverse chronological order
            // This is MUCH faster than getting all records and sorting in JS
            const metadata: ProjectMetadata[] = [];
            
            // Open cursor in reverse order (newest first)
            const cursorRequest = index.openCursor(null, 'prev');
            
            return new Promise((resolve) => {
                cursorRequest.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest).result;
                    if (cursor) {
                        metadata.push(cursor.value);
                        cursor.continue();
                    } else {
                        // Done iterating
                        resolve({ success: true, data: metadata });
                    }
                };
                
                cursorRequest.onerror = () => {
                    resolve({ 
                        success: false, 
                        error: new Error('Failed to load metadata list')
                    });
                };
            });
        } catch (error) {
            return { 
                success: false, 
                error: new Error(`Failed to load metadata list: ${error}`)
            };
        }
    }
    
    // Example of using name index for search
    async searchProjectsByName(searchTerm: string): Promise<Result<ProjectMetadata[]>> {
        if (!this.db) return { success: false, error: new Error('Database not initialized') };
        
        try {
            const transaction = this.db.transaction([this.METADATA_STORE], 'readonly');
            const store = transaction.objectStore(this.METADATA_STORE);
            const index = store.index('name');
            
            const results: ProjectMetadata[] = [];
            
            // Use index to efficiently find matching names
            const range = IDBKeyRange.bound(
                searchTerm.toLowerCase(),
                searchTerm.toLowerCase() + '\uffff',
                false,
                false
            );
            
            const cursorRequest = index.openCursor(range);
            
            return new Promise((resolve) => {
                cursorRequest.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest).result;
                    if (cursor) {
                        const project = cursor.value as ProjectMetadata;
                        if (project.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                            results.push(project);
                        }
                        cursor.continue();
                    } else {
                        resolve({ success: true, data: results });
                    }
                };
                
                cursorRequest.onerror = () => {
                    resolve({ 
                        success: false, 
                        error: new Error('Search failed') 
                    });
                };
            });
        } catch (error) {
            return { 
                success: false, 
                error: new Error(`Search failed: ${error}`) 
            };
        }
    }
    
    async loadProject(id: string): Promise<Result<Project>> {
        if (!this.db) {
            console.log("initting db")
            await this.init()
        }

        if(!this.db) {
            return {
                success: false,
                error: new Error("DB wasnt initialized")
            }
        }
        
        try {
            const transaction = this.db.transaction([this.PROJECTS_STORE], 'readonly');
            const store = transaction.objectStore(this.PROJECTS_STORE);
            const request = store.get(id);
            const projectData = await this.promisifyRequest(request);
            
            if (!projectData) {
                return { 
                    success: false, 
                    error: new Error('Project not found') 
                };
            }
            
            // Reconstruct Project instance
            const project = new Project(projectData.metadata, projectData.nodes);
            
            return { success: true, data: project };
        } catch (error) {
            return { 
                success: false, 
                error: new Error(`Failed to load project: ${error}`)
            };
        }
    }
    
    async deleteProject(id: string): Promise<Result<void>> {
        if (!this.db) return { success: false, error: new Error('Database not initialized') };
        
        const transaction = this.db.transaction([this.METADATA_STORE, this.PROJECTS_STORE], 'readwrite');
        
        try {
            // Delete from both stores
            const metadataStore = transaction.objectStore(this.METADATA_STORE);
            await this.promisifyRequest(metadataStore.delete(id));
            
            const projectsStore = transaction.objectStore(this.PROJECTS_STORE);
            await this.promisifyRequest(projectsStore.delete(id));
            
            projects.set(await this.promisifyRequest(metadataStore.getAll()))
            return { success: true, data: undefined };
        } catch (error) {
            return { 
                success: false, 
                error: new Error(`Failed to delete project: ${error}` )
            };
        }
    }
    
    async duplicateProject(id: string, newName: string): Promise<Result<Project>> {
        const projectResult = await this.loadProject(id);
        if (!projectResult.success) return projectResult;
        
        const originalProject = projectResult.data;
        
        // Create new project with new id and name
        const newMetadata: ProjectMetadata = {
            ...originalProject.metadata,
            id: await generateUniqueProjectId(),
            name: newName,
            lastModified: new Date()
        };

        // Clone the nodes Map (assuming the property is called 'nodeMap')
        const originalNodes: SvelteMap<string, SceneNodeMetadata> = (originalProject as any).nodeMap ?? new SvelteMap();
        const clonedNodes = new SvelteMap(originalNodes);

        const newProject = new Project(
            newMetadata,
            clonedNodes
        );

        const saveResult = await this.saveProject(newProject.getSnapshot());
        if (!saveResult.success) return saveResult;

        return { success: true, data: newProject };
    }
    
    async updateProjectMetadata(metadata: ProjectMetadata): Promise<Result<void>> {
        if (!this.db) return { success: false, error: new Error('Database not initialized') };
        
        try {
            const transaction = this.db.transaction([this.METADATA_STORE], 'readwrite');
            const store = transaction.objectStore(this.METADATA_STORE);
            
            metadata.lastModified = new Date();
            await this.promisifyRequest(store.put(metadata));
            
            return { success: true, data: undefined };
        } catch (error) {
            return { 
                success: false, 
                error: new Error(`Failed to update metadata: ${error}`)
            };
        }
    }
    
    private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Usage example in your app
export class ProjectManager {
    private storage: StorageBackend;
    
    constructor(storage: StorageBackend) {
        this.storage = storage;
    }
    
    // Fast loading for homepage
    async getProjectList(): Promise<Result<ProjectMetadata[]>> {
        return await this.storage.loadProjectMetadataList();
    }
    
    // Load full project when user clicks
    async openProject(uuid: string): Promise<Result<Project>> {
        return await this.storage.loadProject(uuid);
    }
    
    // Auto-save with debouncing
    private saveTimer: ReturnType<typeof setTimeout> | null = null;    
    scheduleAutoSave(project: Project, delay = 2000) {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        
        this.saveTimer = setTimeout(async () => {
            await this.storage.saveProject(project.getSnapshot());
            this.saveTimer = null;
        }, delay);
    }
    
    async saveProjectNow(project: Project): Promise<Result<void>> {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        return await this.storage.saveProject(project.getSnapshot());
    }
}

export enum NodeType {
    BLOCK = 'block',
    ITEM = 'item',
    ENTITY = 'entity',
    PARTICLE = 'particle',
    LIGHT = 'light',
    SOUND = 'sound',
    TEXT = 'text'
}

export interface SceneNodeMetadata {
    uuid: `${string}-${string}-${string}-${string}-${string}`;
    name: string;
    type: NodeType;
    children?: string[];
    parent?: string | null;
    createdTimestamp: number;
}

export interface BlockNodeMetadata extends SceneNodeMetadata {
    type: NodeType.BLOCK;
    blockType: string;
}

export interface TextNodeMetadata extends SceneNodeMetadata {
    type: NodeType.TEXT;
    text: string;
    color: string;
}

export interface ItemNodeMetadata extends SceneNodeMetadata {
    type: NodeType.ITEM;
    itemType: string;
    enchanted?: boolean;
}

export enum ItemSize {
    TINY = 0.294,
    HAND = 0.3745,
    SMALL = 0.469,
    MEDIUM = 0.625,
}

export enum BlockSize {
    VERY_SMALL = 0.294,
    SMALL = 0.3745,
    MEDIUM = 0.469,
    LARGE = 0.625,
    SOLID = 1
}

export interface Float3 {
    x: number,
    y: number,
    z: number,
}

export enum SnappingMode {
    GRID, // snap to a grid interval like 0.1, 0.5
    SCALE, // based on a scale value
    CUSTOM // custom number
}

export interface Transform {
    position: Float3;
    rotation: Float3;
    scale: ItemSize | BlockSize;
    snapMode: SnappingMode;
    snapInterval: number;
}
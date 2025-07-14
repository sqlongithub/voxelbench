const blockModules = import.meta.glob('$lib/assets/mcAssets/models/block/*.json');
const itemModules = import.meta.glob('$lib/assets/mcAssets/models/item/*.json');

const blockModels: Record<string, () => Promise<any>> = {};
const itemModels: Record<string, () => Promise<any>> = {};

for (const path in blockModules) {
  const name = path.split('/').pop()?.replace('.json', '')!;
  blockModels[name] = blockModules[path];
}

for (const path in itemModules) {
  const name = path.split('/').pop()?.replace('.json', '')!;
  itemModels[name] = itemModules[path];
}

async function loadBlockModel(name: string): Promise<BlockModel> {
  const loader = blockModels[name];
  if (!loader) throw new Error(`Block model "${name}" not found`);

  const module = await loader();
  const model = module.default ?? module;

  const blockModel: BlockModel = {
    name,
    parent: model.parent,
    textures: model.textures,
    elements: model.elements,
    display: model.display,
  };

  return blockModel
}

async function loadItemModel(name: string) {
  const loader = itemModels[name];
  if (!loader) throw new Error(`Item model "${name}" not found`);
  const module = await loader();
  return module.default ?? module;
}

export interface Face {
  texture: string;
  cullface?: string;
  uv?: number[]; // optional UV coordinates [u1, v1, u2, v2]
  rotation?: number; // optional rotation for texture (0, 90, 180, 270)
  tintindex?: number; // optional tint index
}

export interface Element {
  from: [number, number, number]; // [x, y, z]
  to: [number, number, number];   // [x, y, z]
  faces: {
    [faceName: string]: Face; // faceName like "north", "south", "up", "down", "east", "west"
  };
  rotation?: {
    origin: [number, number, number];
    axis: 'x' | 'y' | 'z';
    angle: number; // typically 0, 22.5, 45, 90, etc.
    rescale?: boolean;
  };
  shade?: boolean; // optional shading flag
}

export interface Textures {
  [key: string]: string; // e.g. "all": "minecraft:block/stone", or "particle": "minecraft:block/stone"
}

export interface BlockModel {
  name: string
  parent?: string;
  textures?: Textures;
  elements?: Element[];
  display?: Record<string, any>; // optional, can add if you want (GUI, hand etc.)
}
export { loadBlockModel, loadItemModel };

import mcData from 'minecraft-data';
import type { PageServerLoad } from './$types';

type McItem = {
  id: number;
  name: string;
  displayName: string;
};

const mc = mcData('1.21.6');

const excludeList = new Set([
  'torch',
  'wall_torch',
  'soul_torch',
  'soul_wall_torch',
  'redstone_torch',
  'redstone_wall_torch',
  'fire',
  'soul_fire',
  'water',
  'lava',
  'air',
  'cave_air',
  'void_air',
  'end_gateway',
  'end_portal',
  'nether_portal',
  'barrier',
  'structure_void',
  'structure_block',
  'light', // invisible light source
  'jigsaw',
  'command_block',
  'repeating_command_block',
  'chain_command_block',
  'piston_head',
  'moving_piston',
  'tripwire',
  'bubble_column'
]);


export const load: PageServerLoad = async ({params}) => {
    // 1. Get all items and blocks
  const allItems: McItem[] = Object.values(mc.items);
  const allBlocks: McItem[] = Object.values(mc.blocks).filter(block => !excludeList.has(block.name));

  // 2. Make a Set of all item names for fast lookup
  const itemNames = new Set<string>(allItems.map(item => item.name));

  // 3. Filter blocks that also exist as item names
  const blockItems: McItem[] = allBlocks.filter(block => itemNames.has(block.name));

  // 4. Include specific wearable items (e.g., heads, pumpkins)
  const additionalWearables: McItem[] = [
    'carved_pumpkin',
    'player_head',
    'creeper_head',
    'zombie_head',
    'skeleton_skull',
    'wither_skeleton_skull',
    'dragon_head'
  ]
    .map(name => mc.itemsByName[name] as McItem | undefined)
    .filter((item): item is McItem => !!item); // Type guard to remove undefined

  // 5. Combine both sets of wearable items
  const wearableItems: McItem[] = [
    ...blockItems.map(block => mc.itemsByName[block.name] as McItem),
    ...additionalWearables
  ];

  // 6. Map to your desired format (if needed)
  const blocksList = wearableItems.map(item => ({
    id: item.id,
    name: item.name,
    displayName: item.displayName,
    image: `/blocks_and_items/${item.name}.avif`
  }));

  return {
    id: params.id,
    blocks: blocksList
  };
}
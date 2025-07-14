const modules = import.meta.glob('$lib/assets/mcAssets/blockstates/*.json', { eager: false });

const blockstates: Record<string, any> = {};

const getBlockstateVariants = async (name: string) => {
	const module = modules[`/src/lib/assets/mcAssets/blockstates/${name}.json`];
	if (!module) throw new Error('Blockstate not found');
	return ((await module()) as { variants: any }).variants;
};

export { getBlockstateVariants };

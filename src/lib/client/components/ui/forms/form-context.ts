export const INPUT_REGISTRY = Symbol('form-input-registry');
export type InputRegistry = {
    register?: (name: string, validate: () => boolean, reset: () => void) => void;
    unregister?: (name: string) => void;
};
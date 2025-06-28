import { writable } from 'svelte/store';

// This store will hold a boolean or a timestamp just to trigger all menus to hide
export const hideAllMenus = writable(0);

export function triggerHideMenus() {
  hideAllMenus.update(n => n + 1);
}
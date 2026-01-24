import { writable } from 'svelte/store';

/**
 * Store to manage z-index stacking for floating panels.
 * When a panel is clicked, it should come to the front.
 */

const BASE_Z_INDEX = 1000;
let currentMaxZIndex = BASE_Z_INDEX;

export const panelZIndices = writable<Record<string, number>>({});

/**
 * Bring a panel to the front by giving it the highest z-index.
 * @param panelId Unique identifier for the panel
 * @returns The new z-index value
 */
export function bringPanelToFront(panelId: string): number {
  currentMaxZIndex++;
  panelZIndices.update(indices => ({
    ...indices,
    [panelId]: currentMaxZIndex
  }));
  return currentMaxZIndex;
}

/**
 * Get the current z-index for a panel, or the base z-index if not set.
 * @param panelId Unique identifier for the panel
 * @returns The z-index value
 */
export function getPanelZIndex(panelId: string): number {
  let result = BASE_Z_INDEX;
  panelZIndices.subscribe(indices => {
    result = indices[panelId] ?? BASE_Z_INDEX;
  })();
  return result;
}

/**
 * Reset all panel z-indices to the base value.
 */
export function resetPanelZIndices(): void {
  currentMaxZIndex = BASE_Z_INDEX;
  panelZIndices.set({});
}

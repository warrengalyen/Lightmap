/**
 * Service for handling selection logic.
 * Extracts duplicated toggle logic from appStore.
 */
export class SelectionService {
    /**
     * Select or toggle an item in a selection set.
     *
     * @param currentSelection - The current selection set
     * @param item - The item to select/toggle
     * @param addToSelection - If true, toggle the item; if false, replace selection
     * @returns A new selection set
     */
    selectItem<T>(currentSelection: Set<T>, item: T, addToSelection: boolean): Set<T> {
        if (addToSelection) {
            const newSelection = new Set(currentSelection);
            if (newSelection.has(item)) {
                newSelection.delete(item); // Toggle off if already selected
            } else {
                newSelection.add(item);
            }
            return newSelection;
        }
        return new Set([item]);
    }
}

// Singleton instance for convenience
export const selectionService = new SelectionService();

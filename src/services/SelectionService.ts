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

    /**
     * Deselect an item from a selection set.
     *
     * @param currentSelection - The current selection set
     * @param item - The item to deselect
     * @returns A new selection set without the item
     */
    deselectItem<T>(currentSelection: Set<T>, item: T): Set<T> {
        const newSelection = new Set(currentSelection);
        newSelection.delete(item);
        return newSelection;
    }

    /**
     * Add multiple items to a selection set.
     *
     * @param currentSelection - The current selection set
     * @param items - Items to add
     * @param addToSelection - If true, add to existing; if false, replace
     * @returns A new selection set
     */
    selectMultiple<T>(currentSelection: Set<T>, items: T[], addToSelection: boolean): Set<T> {
        if (addToSelection) {
            const newSelection = new Set(currentSelection);
            for (const item of items) {
                newSelection.add(item);
            }
            return newSelection;
        }
        return new Set(items);
    }

    /**
     * Check if an item is selected.
     */
    isSelected<T>(selection: Set<T>, item: T): boolean {
        return selection.has(item);
    }

    /**
     * Clear a selection.
     */
    clearSelection<T>(): Set<T> {
        return new Set<T>();
    }
}

// Singleton instance for convenience
export const selectionService = new SelectionService();

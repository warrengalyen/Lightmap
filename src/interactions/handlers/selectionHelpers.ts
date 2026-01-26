import type { Vector2 } from '../../types';

/**
 * Configuration for a selectable item type.
 */
export interface SelectableItemConfig<TId> {
  /** Find item at position, returns item ID and position if found */
  findItemAtPosition: (pos: Vector2, tolerance: number) => { id: TId; position: Vector2 } | null;
  /** Check if item is already selected */
  isSelected: (id: TId) => boolean;
  /** Get count of other selected items (for multi-selection logic) */
  getOtherSelectedCount: () => number;
  /** Hit tolerance in feet */
  hitTolerance: number;
}

/**
 * Result of a selection attempt.
 */
export interface SelectionAttemptResult<TId> {
  /** Whether an item was found at the position */
  found: boolean;
  /** The item ID if found */
  itemId: TId | null;
  /** Whether item was already selected before this attempt */
  wasAlreadySelected: boolean;
  /** Whether this is a multi-selection scenario (multiple items already selected) */
  isMultiSelect: boolean;
}

/**
 * Attempts to find a selectable item at a position.
 * This helper extracts the common hit-testing and state checking logic.
 * The caller is responsible for handling the actual selection and drag operations.
 */
export function attemptItemSelection<TId>(
  pos: Vector2,
  config: SelectableItemConfig<TId>
): SelectionAttemptResult<TId> {
  const result = config.findItemAtPosition(pos, config.hitTolerance);

  if (!result) {
    return {
      found: false,
      itemId: null,
      wasAlreadySelected: false,
      isMultiSelect: false,
    };
  }

  const wasAlreadySelected = config.isSelected(result.id);
  const otherSelectedCount = config.getOtherSelectedCount();
  const isMultiSelect = wasAlreadySelected && otherSelectedCount > 0;

  return {
    found: true,
    itemId: result.id,
    wasAlreadySelected,
    isMultiSelect,
  };
}

/**
 * Checks if a toggle-off occurred after a shift-click selection.
 * Used internally by handleSelectionAction.
 */
function checkToggleOff<TId>(
  itemId: TId,
  isSelectedNow: (id: TId) => boolean
): boolean {
  return !isSelectedNow(itemId);
}

/**
 * Callbacks for handling selection after item is found.
 */
export interface SelectionActionCallbacks<TId> {
  /** Select the item */
  onSelect: (id: TId, addToSelection: boolean) => void;
  /** Clear the "other" selection type (e.g., clear lights when selecting vertex) */
  onClearOtherSelection: () => void;
  /** Clear wall selection */
  onClearWallSelection: () => void;
  /** Clear door selection */
  onClearDoorSelection: () => void;
  /** Check if item is still selected after toggle operation */
  isSelectedNow: (id: TId) => boolean;
  /** Start drag operation for the item */
  startDrag: (id: TId) => void;
}

/**
 * Handle the common selection action flow after finding an item.
 * This reduces duplication between trySelectVertex and trySelectLight.
 *
 * Returns true if the selection was handled (caller should return { handled: true }).
 */
export function handleSelectionAction<TId>(
  attempt: SelectionAttemptResult<TId>,
  addToSelection: boolean,
  callbacks: SelectionActionCallbacks<TId>
): boolean {
  if (!attempt.found || attempt.itemId === null) {
    return false;
  }

  const itemId = attempt.itemId;

  // Shift+click toggles item in/out of selection
  if (addToSelection) {
    callbacks.onSelect(itemId, true);

    // Check if item was toggled off
    if (checkToggleOff(itemId, callbacks.isSelectedNow)) {
      callbacks.onClearWallSelection();
      return true;
    }

    callbacks.startDrag(itemId);
  }
  // Click on already-selected item with multiple items: start multi-drag
  else if (attempt.isMultiSelect) {
    callbacks.startDrag(itemId);
  }
  // Normal single item selection
  else {
    callbacks.onSelect(itemId, false);
    callbacks.onClearOtherSelection();
    callbacks.startDrag(itemId);
  }

  callbacks.onClearWallSelection();
  callbacks.onClearDoorSelection();
  return true;
}

import type { Vector2 } from "../types";
import type { SnapController } from "../controllers/SnapController";
import { DEFAULT_GRID_SIZE_FT } from "../constants/editor";

export interface GridSnapConfig {
    snapController: SnapController;
    getGridSnapEnabled: () => boolean;
    getGridSize: () => number;
}

/**
 * Applies grid snapping to a position if enabled.
 * @param pos - The position to potentially snap
 * @param config - Grid snap configuration
 * @returns The snapped position (or original if snapping is disabled)
 */
export function applyGridSnap(pos: Vector2, config: GridSnapConfig): Vector2 {
    const gridSize = config.getGridSize() || DEFAULT_GRID_SIZE_FT;
    if (config.getGridSnapEnabled() && gridSize > 0) {
        return config.snapController.snapToGrid(pos, gridSize);
    }
    return pos;
}

/**
 * Gets the effective grid size, with fallback to default.
 * @param getGridSize - Function to get the configured grid size
 * @returns The grid size to use
 */
export function getEffectiveGridSize(getGridSize: () => number): number {
    return getGridSize() || DEFAULT_GRID_SIZE_FT;
}

/**
 * Checks if grid snapping should be applied.
 * @param config - Grid snap configuration
 * @returns True if grid snapping is enabled and grid size is valid
 */
export function shouldApplyGridSnap(
    config: Pick<GridSnapConfig, "getGridSnapEnabled" | "getGridSize">,
): boolean {
    const gridSize = config.getGridSize() || DEFAULT_GRID_SIZE_FT;
    return config.getGridSnapEnabled() && gridSize > 0;
}

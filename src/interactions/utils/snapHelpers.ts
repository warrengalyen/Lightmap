import type { Vector2 } from '../../types';
import type { AxisLock } from '../../types/interaction';
import type { SnapController } from '../../controllers';

export interface GridSnapConfig {
  snapController: SnapController;
  getGridSnapEnabled: () => boolean;
  getGridSize: () => number;
}

interface GridSnapResult {
  position: Vector2;
  wasSnapped: boolean;
}

/**
 * Apply grid snap to a position, respecting axis lock constraints.
 * When axis locked, only snaps the free axis while keeping the locked axis at the original position.
 */
export function applyGridSnap(
  targetPos: Vector2,
  startPosition: Vector2,
  axisLock: AxisLock,
  config: GridSnapConfig,
  defaultGridSize: number
): GridSnapResult {
  if (!config.getGridSnapEnabled()) {
    return { position: targetPos, wasSnapped: false };
  }

  const gridSize = config.getGridSize() || defaultGridSize;
  if (gridSize <= 0) {
    return { position: targetPos, wasSnapped: false };
  }

  const snapped = config.snapController.snapToGrid(targetPos, gridSize);

  if (axisLock === 'none') {
    // No axis lock - snap both axes
    return { position: snapped, wasSnapped: true };
  }

  // Axis lock active - only snap the free axis
  if (axisLock === 'x') {
    // X-axis movement (horizontal) - only snap X, keep Y at original
    return {
      position: { x: snapped.x, y: startPosition.y },
      wasSnapped: true,
    };
  } else {
    // Y-axis movement (vertical) - only snap Y, keep X at original
    return {
      position: { x: startPosition.x, y: snapped.y },
      wasSnapped: true,
    };
  }
}

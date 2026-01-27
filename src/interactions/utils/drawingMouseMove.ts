import type { Vector2 } from '../../types';
import type { WallBuilder } from '../../geometry/WallBuilder';
import type { SnapController } from '../../controllers/SnapController';

export interface DrawingMouseMoveCallbacks {
  onSetPhantomLine: (from: Vector2 | null, to: Vector2 | null) => void;
  onSetPreviewVertex: (pos: Vector2 | null) => void;
  onSnapChange: (snapType: string) => void;
}

/**
 * Shared mouse-move logic for drawing handlers (room + obstacle).
 * Handles preview vertex, phantom line, grid snapping, and angle snapping.
 * Returns whether the event was consumed.
 */
export function handleDrawingMouseMove(
  worldPos: Vector2,
  wallBuilder: WallBuilder,
  snapController: SnapController,
  isGridSnapActive: boolean,
  gridSize: number,
  callbacks: DrawingMouseMoveCallbacks
): boolean {
  if (!wallBuilder.drawing) {
    // Show preview vertex at cursor when not actively drawing
    if (isGridSnapActive) {
      callbacks.onSetPreviewVertex(snapController.snapToGrid(worldPos, gridSize));
    } else {
      callbacks.onSetPreviewVertex(worldPos);
    }
    return false;
  }

  const lastVertex = wallBuilder.lastVertex;
  if (!lastVertex) {
    callbacks.onSetPreviewVertex(null);
    return false;
  }

  // Grid snap mode - bypass angle snapping entirely
  if (isGridSnapActive) {
    const gridPos = snapController.snapToGrid(worldPos, gridSize);
    callbacks.onSetPhantomLine(lastVertex, gridPos);
    callbacks.onSetPreviewVertex(gridPos);
    return true;
  }

  // Normal mode with angle snapping
  const snappedPos = wallBuilder.continueDrawing(worldPos);
  callbacks.onSetPhantomLine(lastVertex, snappedPos);
  callbacks.onSetPreviewVertex(snappedPos);

  const snap = wallBuilder.currentSnap;
  if (snap) {
    callbacks.onSnapChange(snap.snapType);
  }

  return true;
}

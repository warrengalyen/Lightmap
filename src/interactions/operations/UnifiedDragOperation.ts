import type { Vector2, WallSegment } from '../../types';
import type {
  DragStartContext,
  DragUpdateContext,
  SelectionState,
} from '../../types/interaction';
import type { SnapGuide } from '../../controllers/SnapController';
import type { DragManagerCallbacks } from '../DragManager';
import type { BaseDragConfig } from '../types';
import { BaseDragOperation } from '../DragOperation';
import { DEFAULT_GRID_SIZE_FT } from '../../constants/editor';
import { isPointInPolygon } from '../../utils/geometry';
import { applyGridSnap } from '../utils';

/**
 * Configuration for unified drag operations.
 * Extends BaseDragConfig with no additional properties.
 */
export type UnifiedDragConfig = BaseDragConfig;

export interface UnifiedDragCallbacks extends DragManagerCallbacks {
  onMeasurementUpdate?: (delta: Vector2) => void;
}

/**
 * Handles unified dragging of multiple vertices and/or lights.
 * Supports axis locking, grid snapping, and vertex/light alignment snapping.
 */
export class UnifiedDragOperation extends BaseDragOperation {
  readonly type = 'unified';

  private originalVertexPositions: Map<number, Vector2> = new Map();
  private originalLightPositions: Map<string, Vector2> = new Map();
  private anchorVertexIndex: number | null = null;
  private anchorLightId: string | null = null;
  private selection: SelectionState | null = null;
  private config: UnifiedDragConfig;
  private callbacks: UnifiedDragCallbacks;

  constructor(config: UnifiedDragConfig, callbacks: UnifiedDragCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Set the anchor point for the drag operation.
   * The anchor is the item that was clicked to initiate the drag.
   */
  setAnchor(vertexIndex: number | null, lightId: string | null): void {
    this.anchorVertexIndex = vertexIndex;
    this.anchorLightId = lightId;
  }

  start(context: DragStartContext): void {
    this._isActive = true;
    this.selection = context.selection;

    const vertices = this.config.getVertices();

    // Store original positions of all selected vertices
    this.originalVertexPositions.clear();
    for (const idx of context.selection.selectedVertexIndices) {
      if (vertices[idx]) {
        this.originalVertexPositions.set(idx, { ...vertices[idx] });
      }
    }

    // Store original positions of all selected lights
    this.originalLightPositions.clear();
    const lights = this.config.getLights();
    for (const id of context.selection.selectedLightIds) {
      const light = lights.find(l => l.id === id);
      if (light) {
        this.originalLightPositions.set(id, { ...light.position });
      }
    }

    // Set startPosition to the anchor's actual position (not mouse position)
    // This ensures axis lock works correctly relative to the item's original position
    if (this.anchorVertexIndex !== null && this.originalVertexPositions.has(this.anchorVertexIndex)) {
      this.startPosition = { ...this.originalVertexPositions.get(this.anchorVertexIndex)! };
    } else if (this.anchorLightId !== null && this.originalLightPositions.has(this.anchorLightId)) {
      this.startPosition = { ...this.originalLightPositions.get(this.anchorLightId)! };
    } else {
      // Fallback to mouse position if no anchor (shouldn't happen)
      this.startPosition = { ...context.position };
    }
  }

  update(context: DragUpdateContext): void {
    if (!this._isActive || !this.startPosition || !this.selection) return;

    let targetPos = context.position;

    // SHIFT alignment takes priority - snap to other vertices/lights (only for single item)
    if (context.modifiers.shiftKey) {
      const guides = this.handleShiftSnapping(targetPos, context.axisLock);
      targetPos = guides.snappedPos;
      if (context.axisLock !== 'none') {
        targetPos = this.applyAxisConstraint(targetPos, context.axisLock, this.startPosition);
        // Don't clear guides - axis lock guides are managed by DragManager
      } else {
        this.callbacks.onSetSnapGuides(guides.guides);
      }
    }
    // Grid snap - apply when SHIFT is not held
    else {
      const gridResult = applyGridSnap(
        targetPos,
        this.startPosition,
        context.axisLock,
        this.config,
        DEFAULT_GRID_SIZE_FT
      );

      if (gridResult.wasSnapped) {
        targetPos = gridResult.position;
        // Clear snap guides only when no axis lock (axis lock guides managed by DragManager)
        if (context.axisLock === 'none') {
          this.callbacks.onSetSnapGuides([]);
        }
      } else if (context.axisLock !== 'none') {
        // No grid snap - just apply axis lock
        targetPos = this.applyAxisConstraint(targetPos, context.axisLock, this.startPosition);
      } else {
        this.callbacks.onSetSnapGuides([]);
      }
    }

    // Calculate delta from anchor point
    const delta = this.calculateDeltaFromAnchor(targetPos);

    // Move all selected vertices
    this.moveSelectedVertices(delta);

    // Move all selected lights
    this.moveSelectedLights(delta);

    // Notify measurement update if callback provided
    if (this.callbacks.onMeasurementUpdate) {
      this.callbacks.onMeasurementUpdate(delta);
    }
  }

  commit(): void {
    if (!this._isActive) return;

    this._isActive = false;
    this.cleanup();
  }

  cancel(): void {
    if (!this._isActive) return;

    // Restore original vertex positions
    for (const [idx, originalPos] of this.originalVertexPositions) {
      this.callbacks.onUpdateVertexPosition(idx, originalPos);
    }

    // Restore original light positions
    if (this.originalLightPositions.size > 0) {
      this.callbacks.onUpdateLightPositions(new Map(this.originalLightPositions));
    }

    this._isActive = false;
    this.cleanup();
  }

  private handleShiftSnapping(
    targetPos: Vector2,
    _axisLock: string
  ): { snappedPos: Vector2; guides: SnapGuide[] } {
    if (!this.selection) {
      return { snappedPos: targetPos, guides: [] };
    }

    // Only snap for single vertex selection
    if (this.selection.selectedVertexIndices.size === 1 &&
        this.selection.selectedLightIds.size === 0 &&
        this.anchorVertexIndex !== null) {
      const vertices = this.config.getVertices();
      return this.config.snapController.snapToVertices(targetPos, vertices, this.anchorVertexIndex);
    }

    // Only snap for single light selection
    if (this.selection.selectedLightIds.size === 1 &&
        this.selection.selectedVertexIndices.size === 0 &&
        this.anchorLightId !== null) {
      const lights = this.config.getLights();
      return this.config.snapController.snapToLights(targetPos, lights, this.anchorLightId);
    }

    return { snappedPos: targetPos, guides: [] };
  }

  private calculateDeltaFromAnchor(targetPos: Vector2): Vector2 {
    let delta = { x: 0, y: 0 };

    if (this.anchorVertexIndex !== null && this.originalVertexPositions.has(this.anchorVertexIndex)) {
      const anchorOriginal = this.originalVertexPositions.get(this.anchorVertexIndex)!;
      delta = {
        x: targetPos.x - anchorOriginal.x,
        y: targetPos.y - anchorOriginal.y,
      };
    } else if (this.anchorLightId !== null && this.originalLightPositions.has(this.anchorLightId)) {
      const anchorOriginal = this.originalLightPositions.get(this.anchorLightId)!;
      delta = {
        x: targetPos.x - anchorOriginal.x,
        y: targetPos.y - anchorOriginal.y,
      };
    }

    return delta;
  }

  private moveSelectedVertices(delta: Vector2): void {
    for (const [idx, originalPos] of this.originalVertexPositions) {
      const newPos = {
        x: originalPos.x + delta.x,
        y: originalPos.y + delta.y,
      };
      this.callbacks.onUpdateVertexPosition(idx, newPos);
    }
  }

  private moveSelectedLights(delta: Vector2): void {
    if (this.originalLightPositions.size === 0) return;

    const walls = this.config.getWalls();
    const isClosed = this.config.isRoomClosed();
    const updates = new Map<string, Vector2>();

    for (const [id, originalPos] of this.originalLightPositions) {
      const newPos = {
        x: originalPos.x + delta.x,
        y: originalPos.y + delta.y,
      };

      // Only move if inside room (when room is closed)
      if (!isClosed || this.isPointInsideRoom(newPos, walls)) {
        updates.set(id, newPos);
      }
    }

    if (updates.size > 0) {
      this.callbacks.onUpdateLightPositions(updates);
    }
  }

  private isPointInsideRoom(point: Vector2, walls: WallSegment[]): boolean {
    if (walls.length < 3) return false;
    const vertices = walls.map(w => w.start);
    return isPointInPolygon(point, vertices);
  }

  private cleanup(): void {
    this.originalVertexPositions.clear();
    this.originalLightPositions.clear();
    this.anchorVertexIndex = null;
    this.anchorLightId = null;
    this.selection = null;
    this.startPosition = null;
  }

}

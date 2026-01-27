import type { Vector2 } from '../../types';
import type {
  DragStartContext,
  DragUpdateContext,
  SelectionState,
} from '../../types/interaction';
import type { DragManagerCallbacks } from '../DragManager';
import type { BaseDragConfig } from '../types';
import { BaseDragOperation } from '../DragOperation';
import {
  calculateDelta,
  checkPointInRoom,
  processTargetWithSnapping,
} from './grabModeHelpers';

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

    const snapResult = processTargetWithSnapping(
      context.position,
      this.startPosition,
      context,
      this.config,
      {
        selection: this.selection,
        anchorVertexIndex: this.anchorVertexIndex,
        anchorLightId: this.anchorLightId,
        getVertices: this.config.getVertices,
        getLights: this.config.getLights,
      },
      this.applyAxisConstraint.bind(this)
    );

    if (snapResult.guides.length > 0) {
      this.callbacks.onSetSnapGuides(snapResult.guides);
    } else if (snapResult.clearGuides) {
      this.callbacks.onSetSnapGuides([]);
    }

    // Calculate delta from anchor point
    const delta = this.calculateDeltaFromAnchor(snapResult.position);

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

  private calculateDeltaFromAnchor(targetPos: Vector2): Vector2 {
    if (this.anchorVertexIndex !== null && this.originalVertexPositions.has(this.anchorVertexIndex)) {
      return calculateDelta(this.originalVertexPositions.get(this.anchorVertexIndex)!, targetPos);
    }
    if (this.anchorLightId !== null && this.originalLightPositions.has(this.anchorLightId)) {
      return calculateDelta(this.originalLightPositions.get(this.anchorLightId)!, targetPos);
    }
    return { x: 0, y: 0 };
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
      if (!isClosed || checkPointInRoom(newPos, walls)) {
        updates.set(id, newPos);
      }
    }

    if (updates.size > 0) {
      this.callbacks.onUpdateLightPositions(updates);
    }
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

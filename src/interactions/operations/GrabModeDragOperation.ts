import type { Vector2 } from '../../types';
import type {
  DragStartContext,
  DragUpdateContext,
  SelectionState,
} from '../../types/interaction';
import type { SnapGuide } from '../../controllers/SnapController';
import type { DragManagerCallbacks } from '../DragManager';
import type { BaseDragConfig, RoomStateWithDoors } from '../types';
import { BaseDragOperation } from '../DragOperation';
import { DEFAULT_GRID_SIZE_FT } from '../../constants/editor';
import { doorPositioningService } from '../../services';
import {
  calculateGrabOffset,
  applyGrabOffset,
  findAnchorPosition,
  calculateDelta,
  applyDelta,
  checkPointInRoom,
  captureOriginalPositions,
} from './grabModeHelpers';
import { applyGridSnap } from '../utils';

/**
 * Configuration for grab mode drag operations.
 * Extends BaseDragConfig with door access and mouse position.
 */
export interface GrabModeConfig extends BaseDragConfig, RoomStateWithDoors {
  getCurrentMousePos: () => Vector2;
}

/**
 * Handles grab mode (G key) which allows moving selected items
 * by moving the mouse without clicking and dragging.
 *
 * The offset between the mouse and the anchor object is preserved,
 * so the object follows the mouse at a fixed distance.
 */
export class GrabModeDragOperation extends BaseDragOperation {
  readonly type = 'grabMode';

  private originalVertexPositions: Map<number, Vector2> = new Map();
  private originalLightPositions: Map<string, Vector2> = new Map();
  private originalWallVertices: { start: Vector2; end: Vector2 } | null = null;
  private originalDoorPosition: number | null = null;
  private anchorVertexIndex: number | null = null;
  private anchorLightId: string | null = null;
  private wallId: string | null = null;
  private doorId: string | null = null;
  private selection: SelectionState | null = null;
  private config: GrabModeConfig;
  private callbacks: DragManagerCallbacks;

  // Offset from mouse position to anchor object position when grab started
  private grabOffset: Vector2 | null = null;

  constructor(config: GrabModeConfig, callbacks: DragManagerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  start(context: DragStartContext): void {
    this._isActive = true;
    this.selection = context.selection;

    const currentMousePos = this.config.getCurrentMousePos();

    // Capture original positions for all selected items
    const captured = captureOriginalPositions(
      context.selection,
      this.config.getVertices,
      this.config.getLights,
      this.config.getWallById,
      this.config.getDoorById
    );

    this.originalVertexPositions = captured.vertexPositions;
    this.originalLightPositions = captured.lightPositions;
    this.originalWallVertices = captured.wallVertices;
    this.originalDoorPosition = captured.doorPosition;

    // Find anchor position
    const anchor = findAnchorPosition(
      context.selection,
      this.config.getVertices,
      this.config.getLights,
      this.config.getWallById,
      this.config.getDoorById
    );

    // Store anchor identifiers
    if (anchor.anchorType === 'vertex') {
      this.anchorVertexIndex = anchor.anchorId as number;
    } else if (anchor.anchorType === 'light') {
      this.anchorLightId = anchor.anchorId as string;
    } else if (anchor.anchorType === 'wall') {
      this.wallId = anchor.anchorId as string;
    } else if (anchor.anchorType === 'door') {
      this.doorId = anchor.anchorId as string;
    }

    if (anchor.anchorPos) {
      this.grabOffset = calculateGrabOffset(anchor.anchorPos, currentMousePos);
      this.startPosition = { ...anchor.anchorPos };
    }
  }

  update(context: DragUpdateContext): void {
    if (!this._isActive || !this.grabOffset || !this.startPosition) return;

    // Adjust position with offset (as if we clicked on the object)
    const adjustedPos = applyGrabOffset(context.position, this.grabOffset);

    // Handle door separately if only door is selected
    if (this.doorId && this.originalDoorPosition !== null &&
        this.originalVertexPositions.size === 0 && this.originalLightPositions.size === 0 &&
        !this.wallId) {
      this.updateDoor(context.position);
    }
    // Handle wall separately if only wall is selected
    else if (this.wallId && this.originalWallVertices &&
        this.originalVertexPositions.size === 0 && this.originalLightPositions.size === 0) {
      this.updateWall(adjustedPos, context);
    } else {
      this.updateVerticesAndLights(adjustedPos, context);
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

    // Restore original wall position
    if (this.wallId && this.originalWallVertices) {
      this.callbacks.onMoveWall(
        this.wallId,
        this.originalWallVertices.start,
        this.originalWallVertices.end
      );
    }

    // Restore original door position
    if (this.doorId && this.originalDoorPosition !== null) {
      this.callbacks.onUpdateDoorPosition(this.doorId, this.originalDoorPosition);
    }

    this._isActive = false;
    this.cleanup();
  }

  private updateVerticesAndLights(adjustedPos: Vector2, context: DragUpdateContext): void {
    if (!this.startPosition || !this.selection) return;

    let targetPos = adjustedPos;

    // SHIFT alignment takes priority - snap to other vertices/lights (only for single item)
    if (context.modifiers.shiftKey) {
      const result = this.handleShiftSnapping(targetPos);
      targetPos = result.snappedPos;
      if (context.axisLock !== 'none') {
        targetPos = this.applyAxisConstraint(targetPos, context.axisLock, this.startPosition);
      } else {
        this.callbacks.onSetSnapGuides(result.guides);
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

    // Move vertices
    for (const [idx, originalPos] of this.originalVertexPositions) {
      const newPos = applyDelta(originalPos, delta);
      this.callbacks.onUpdateVertexPosition(idx, newPos);
    }

    // Move lights
    if (this.originalLightPositions.size > 0) {
      const walls = this.config.getWalls();
      const isClosed = this.config.isRoomClosed();
      const updates = new Map<string, Vector2>();

      for (const [id, originalPos] of this.originalLightPositions) {
        const newPos = applyDelta(originalPos, delta);

        if (!isClosed || checkPointInRoom(newPos, walls)) {
          updates.set(id, newPos);
        }
      }

      if (updates.size > 0) {
        this.callbacks.onUpdateLightPositions(updates);
      }
    }
  }

  private updateWall(adjustedPos: Vector2, context: DragUpdateContext): void {
    if (!this.wallId || !this.originalWallVertices || !this.startPosition) return;

    let constrainedPos = adjustedPos;

    if (context.axisLock !== 'none') {
      constrainedPos = this.applyAxisConstraint(adjustedPos, context.axisLock, this.startPosition);
    }

    const delta = calculateDelta(this.startPosition, constrainedPos);

    let newStart = applyDelta(this.originalWallVertices.start, delta);
    let newEnd = applyDelta(this.originalWallVertices.end, delta);

    if (context.modifiers.shiftKey) {
      const result = this.handleWallSnapping(newStart, newEnd);
      newStart = result.snappedStart;
      newEnd = result.snappedEnd;
      if (context.axisLock === 'none') {
        this.callbacks.onSetSnapGuides(result.guides);
      }
    } else if (context.axisLock === 'none') {
      this.callbacks.onSetSnapGuides([]);
    }

    this.callbacks.onMoveWall(this.wallId, newStart, newEnd);
  }

  private updateDoor(mousePos: Vector2): void {
    if (!this.doorId || this.originalDoorPosition === null) return;

    const door = this.config.getDoorById(this.doorId);
    if (!door) return;

    const wall = this.config.getWallById(door.wallId);
    if (!wall) return;

    // Calculate new position using the service
    const existingDoors = this.config.getDoorsByWallId(door.wallId);
    const newPosition = doorPositioningService.calculateDragPosition(
      mousePos,
      wall,
      door.width,
      existingDoors,
      this.doorId
    );

    this.callbacks.onUpdateDoorPosition(this.doorId, newPosition);
  }

  private handleShiftSnapping(
    targetPos: Vector2
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

  private handleWallSnapping(
    newStart: Vector2,
    newEnd: Vector2
  ): { snappedStart: Vector2; snappedEnd: Vector2; guides: SnapGuide[] } {
    if (!this.wallId) {
      return { snappedStart: newStart, snappedEnd: newEnd, guides: [] };
    }

    const walls = this.config.getWalls();
    const wallIndex = walls.findIndex(w => w.id === this.wallId);

    if (wallIndex === -1) {
      return { snappedStart: newStart, snappedEnd: newEnd, guides: [] };
    }

    const vertices = this.config.getVertices();
    const numWalls = walls.length;
    const excludeIndices = [wallIndex, (wallIndex + 1) % numWalls];

    return this.config.snapController.snapWallToVertices(newStart, newEnd, vertices, excludeIndices);
  }

  private calculateDeltaFromAnchor(targetPos: Vector2): Vector2 {
    if (this.anchorVertexIndex !== null && this.originalVertexPositions.has(this.anchorVertexIndex)) {
      const anchorOriginal = this.originalVertexPositions.get(this.anchorVertexIndex)!;
      return calculateDelta(anchorOriginal, targetPos);
    }

    if (this.anchorLightId !== null && this.originalLightPositions.has(this.anchorLightId)) {
      const anchorOriginal = this.originalLightPositions.get(this.anchorLightId)!;
      return calculateDelta(anchorOriginal, targetPos);
    }

    return { x: 0, y: 0 };
  }

  private cleanup(): void {
    this.originalVertexPositions.clear();
    this.originalLightPositions.clear();
    this.originalWallVertices = null;
    this.originalDoorPosition = null;
    this.anchorVertexIndex = null;
    this.anchorLightId = null;
    this.wallId = null;
    this.doorId = null;
    this.selection = null;
    this.startPosition = null;
    this.grabOffset = null;
  }
}

import type { Vector2, WallSegment } from '../../types';
import type {
  DragStartContext,
  DragUpdateContext,
} from '../../types/interaction';
import type { SnapController } from '../../controllers/SnapController';
import type { DragManagerCallbacks } from '../DragManager';
import { BaseDragOperation } from '../DragOperation';
import { applyWallSnappingWithGuides } from './grabModeHelpers';

export interface WallDragConfig {
  snapController: SnapController;
  getVertices: () => Vector2[];
  getWalls: () => WallSegment[];
  getWallById: (id: string) => WallSegment | undefined;
}

/**
 * Handles dragging a wall (moves both endpoints together).
 * Supports axis locking and snapping to vertices.
 */
export class WallDragOperation extends BaseDragOperation {
  readonly type = 'wall';

  private wallId: string | null = null;
  private originalStart: Vector2 | null = null;
  private originalEnd: Vector2 | null = null;
  private config: WallDragConfig;
  private callbacks: DragManagerCallbacks;

  constructor(config: WallDragConfig, callbacks: DragManagerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Set the wall to be dragged.
   */
  setWallId(wallId: string): void {
    this.wallId = wallId;
  }

  start(context: DragStartContext): void {
    if (!this.wallId) return;

    const wall = this.config.getWallById(this.wallId);
    if (!wall) return;

    this._isActive = true;
    this.startPosition = { ...context.position };
    this.originalStart = { ...wall.start };
    this.originalEnd = { ...wall.end };
  }

  update(context: DragUpdateContext): void {
    if (!this._isActive || !this.wallId || !this.startPosition ||
        !this.originalStart || !this.originalEnd) return;

    let constrainedPos = context.position;

    // Apply axis lock
    if (context.axisLock !== 'none') {
      constrainedPos = this.applyAxisConstraint(context.position, context.axisLock, this.startPosition);
    }

    // Calculate delta from start position
    const delta = this.calculateDelta(this.startPosition, constrainedPos);

    // Calculate new wall positions and apply snapping
    const baseStart = this.applyDelta(this.originalStart, delta);
    const baseEnd = this.applyDelta(this.originalEnd, delta);

    const { start: newStart, end: newEnd } = applyWallSnappingWithGuides(
      baseStart,
      baseEnd,
      this.wallId,
      context,
      this.config,
      this.callbacks.onSetSnapGuides
    );

    this.callbacks.onMoveWall(this.wallId, newStart, newEnd);
  }

  commit(): void {
    if (!this._isActive) return;

    this._isActive = false;
    this.cleanup();
  }

  cancel(): void {
    if (!this._isActive || !this.wallId || !this.originalStart || !this.originalEnd) return;

    // Restore original wall position
    this.callbacks.onMoveWall(this.wallId, this.originalStart, this.originalEnd);

    this._isActive = false;
    this.cleanup();
  }

  private cleanup(): void {
    this.wallId = null;
    this.originalStart = null;
    this.originalEnd = null;
    this.startPosition = null;
  }
}

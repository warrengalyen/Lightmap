import type { Vector2, WallSegment } from '../../types';
import type {
  DragStartContext,
  DragUpdateContext,
} from '../../types/interaction';
import type { SnapController, SnapGuide } from '../../controllers/SnapController';
import type { DragManagerCallbacks } from '../DragManager';
import { BaseDragOperation } from '../DragOperation';

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

    // Calculate new wall positions
    let newStart = this.applyDelta(this.originalStart, delta);
    let newEnd = this.applyDelta(this.originalEnd, delta);

    // Snap when holding Shift
    if (context.modifiers.shiftKey) {
      const result = this.handleWallSnapping(newStart, newEnd, context.axisLock);
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

  private handleWallSnapping(
    newStart: Vector2,
    newEnd: Vector2,
    _axisLock: string
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

  private cleanup(): void {
    this.wallId = null;
    this.originalStart = null;
    this.originalEnd = null;
    this.startPosition = null;
  }
}

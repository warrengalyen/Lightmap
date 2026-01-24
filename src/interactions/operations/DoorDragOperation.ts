import type { WallSegment, Door } from '../../types';
import type {
  DragStartContext,
  DragUpdateContext,
} from '../../types/interaction';
import type { DragManagerCallbacks } from '../DragManager';
import { BaseDragOperation } from '../DragOperation';

export interface DoorDragConfig {
  getWallById: (id: string) => WallSegment | undefined;
  getDoorById: (id: string) => Door | undefined;
  getDoorsByWallId: (wallId: string) => Door[];
}

/**
 * Handles dragging a door along its wall.
 * The door position is constrained to stay within the wall bounds
 * and not overlap with other doors on the same wall.
 */
export class DoorDragOperation extends BaseDragOperation {
  readonly type = 'door';

  private doorId: string | null = null;
  private originalPosition: number | null = null;
  private config: DoorDragConfig;
  private callbacks: DragManagerCallbacks;

  constructor(config: DoorDragConfig, callbacks: DragManagerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Set the door to be dragged.
   */
  setDoorId(doorId: string): void {
    this.doorId = doorId;
  }

  start(context: DragStartContext): void {
    if (!this.doorId) return;

    const door = this.config.getDoorById(this.doorId);
    if (!door) return;

    this._isActive = true;
    this.startPosition = { ...context.position };
    this.originalPosition = door.position;
  }

  update(context: DragUpdateContext): void {
    if (!this._isActive || !this.doorId || !this.startPosition || this.originalPosition === null) return;

    const door = this.config.getDoorById(this.doorId);
    if (!door) return;

    const wall = this.config.getWallById(door.wallId);
    if (!wall) return;

    // Calculate wall properties
    const wallDir = {
      x: wall.end.x - wall.start.x,
      y: wall.end.y - wall.start.y,
    };
    const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.y * wallDir.y);
    if (wallLength === 0) return;

    const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };

    // Project mouse position onto the wall to get new door position
    const mouseToWallStart = {
      x: context.position.x - wall.start.x,
      y: context.position.y - wall.start.y,
    };

    // Dot product gives position along wall
    let newPosition = mouseToWallStart.x * normalizedDir.x + mouseToWallStart.y * normalizedDir.y;

    // Constrain position to wall bounds (accounting for door width)
    const halfWidth = door.width / 2;
    const minPosition = halfWidth;
    const maxPosition = wallLength - halfWidth;

    newPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));

    // Check for overlap with other doors on the same wall
    const otherDoors = this.config.getDoorsByWallId(door.wallId).filter(d => d.id !== this.doorId);
    newPosition = this.avoidDoorOverlap(newPosition, door.width, otherDoors, minPosition, maxPosition);

    this.callbacks.onUpdateDoorPosition(this.doorId, newPosition);
  }

  commit(): void {
    if (!this._isActive) return;

    this._isActive = false;
    this.cleanup();
  }

  cancel(): void {
    if (!this._isActive || !this.doorId || this.originalPosition === null) return;

    // Restore original door position
    this.callbacks.onUpdateDoorPosition(this.doorId, this.originalPosition);

    this._isActive = false;
    this.cleanup();
  }

  /**
   * Adjust position to avoid overlapping with other doors.
   * Returns the closest valid position to the target.
   */
  private avoidDoorOverlap(
    targetPosition: number,
    doorWidth: number,
    otherDoors: Door[],
    minPos: number,
    maxPos: number
  ): number {
    const halfWidth = doorWidth / 2;
    const minGap = 0.1; // Minimum gap between doors in feet

    for (const other of otherDoors) {
      const otherHalfWidth = other.width / 2;
      const minDistance = halfWidth + otherHalfWidth + minGap;

      const distance = Math.abs(targetPosition - other.position);

      if (distance < minDistance) {
        // Overlap detected - push to the nearest valid side
        if (targetPosition < other.position) {
          // Moving door is to the left of other door
          const newPos = other.position - minDistance;
          if (newPos >= minPos) {
            targetPosition = newPos;
          } else {
            // Can't fit on the left, try right
            targetPosition = Math.min(maxPos, other.position + minDistance);
          }
        } else {
          // Moving door is to the right of other door
          const newPos = other.position + minDistance;
          if (newPos <= maxPos) {
            targetPosition = newPos;
          } else {
            // Can't fit on the right, try left
            targetPosition = Math.max(minPos, other.position - minDistance);
          }
        }
      }
    }

    return targetPosition;
  }

  private cleanup(): void {
    this.doorId = null;
    this.originalPosition = null;
    this.startPosition = null;
  }
}

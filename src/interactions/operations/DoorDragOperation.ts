import type { WallSegment, Door } from '../../types';
import type {
    DragStartContext,
    DragUpdateContext,
} from '../../types/interaction';
import type { DragManagerCallbacks } from '../DragManager';
import { BaseDragOperation } from '../DragOperation';
import { doorPositioningService } from '../../services';

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

    // Calculate new position using the service
    const existingDoors = this.config.getDoorsByWallId(door.wallId);
    const newPosition = doorPositioningService.calculateDragPosition(
      context.position,
      wall,
            door.width,
      existingDoors,
      this.doorId
        );

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

  private cleanup(): void {
    this.doorId = null;
    this.originalPosition = null;
    this.startPosition = null;
  }
}

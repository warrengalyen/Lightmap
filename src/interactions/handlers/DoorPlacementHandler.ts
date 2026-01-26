import type { InputEvent } from '../../core/InputManager';
import type { Door, DoorSwingDirection, DoorSwingSide, WallSegment, Vector2 } from '../../types';
import type { InteractionContext } from '../../types/interaction';
import { BaseInteractionHandler } from '../InteractionHandler';
import { generateId } from '../../utils/id';
import { doorPositioningService } from '../../services';
import { DOOR_PLACEMENT_TOLERANCE_FT } from '../../constants/editor';

export interface DoorPlacementHandlerCallbacks {
  onDoorPlaced: (door: Door) => void;
  onDoorPreview: (door: Door | null, wall: WallSegment | null, canPlace: boolean) => void;
}

export interface DoorPlacementHandlerConfig {
  getWalls: () => WallSegment[];
  getDoors: () => Door[];
  getWallAtPosition: (pos: Vector2, walls: WallSegment[], tolerance: number) => WallSegment | null;
  getSelectedDoorWidth: () => number;
  getSelectedDoorSwingDirection: () => DoorSwingDirection;
  getSelectedDoorSwingSide: () => DoorSwingSide;
  canPlaceDoors: () => boolean;
}

// Standard door widths in feet
export const DOOR_WIDTHS = {
  '2\'6"': 2.5,
  '2\'8"': 2.67,
  '3\'0"': 3.0,
  '3\'6"': 3.5,
} as const;

export const DEFAULT_DOOR_WIDTH = DOOR_WIDTHS['3\'0"'];

/**
 * Handles door placement mode.
 * Places doors on walls at clicked positions.
 */
export class DoorPlacementHandler extends BaseInteractionHandler {
  readonly name = 'doorPlacement';
  readonly priority = 85;

  private config: DoorPlacementHandlerConfig;
  private callbacks: DoorPlacementHandlerCallbacks;

  constructor(config: DoorPlacementHandlerConfig, callbacks: DoorPlacementHandlerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  canHandle(_event: InputEvent, context: InteractionContext): boolean {
    return context.isPlacingDoors && this.config.canPlaceDoors();
  }

  handleClick(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isPlacingDoors || !this.config.canPlaceDoors()) {
      return false;
    }

    const walls = this.config.getWalls();
    const pos = event.worldPos;

    // Find wall at click position
    const wall = this.config.getWallAtPosition(pos, walls, DOOR_PLACEMENT_TOLERANCE_FT);
    if (!wall) {
      return true; // Consumed the event but didn't place
    }

    // Get selected door settings
    const doorWidth = this.config.getSelectedDoorWidth();
    const swingDirection = this.config.getSelectedDoorSwingDirection();
    const swingSide = this.config.getSelectedDoorSwingSide();

    // Calculate door position using the service
    const existingDoors = this.config.getDoors();
    const result = doorPositioningService.calculateDoorPosition(pos, wall, doorWidth, existingDoors);

    if (!result.canPlace) {
      return true; // Consumed the event but couldn't place
    }

    const positionOnWall = result.position;

    // Create door with selected settings
    const newDoor: Door = {
      id: generateId(),
      wallId: wall.id,
      position: positionOnWall,
      width: doorWidth,
      swingDirection,
      swingSide,
    };

    // Clear preview before placing
    this.callbacks.onDoorPreview(null, null, false);
    this.callbacks.onDoorPlaced(newDoor);
    return true;
  }

  handleMouseMove(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isPlacingDoors || !this.config.canPlaceDoors()) {
      this.callbacks.onDoorPreview(null, null, false);
      return false;
    }

    const walls = this.config.getWalls();
    const pos = event.worldPos;

    // Find wall at mouse position
    const wall = this.config.getWallAtPosition(pos, walls, DOOR_PLACEMENT_TOLERANCE_FT);
    if (!wall) {
      this.callbacks.onDoorPreview(null, null, false);
      return false;
    }

    // Get selected door settings
    const doorWidth = this.config.getSelectedDoorWidth();
    const swingDirection = this.config.getSelectedDoorSwingDirection();
    const swingSide = this.config.getSelectedDoorSwingSide();

    // Calculate door position using the service
    const existingDoors = this.config.getDoors();
    const result = doorPositioningService.calculateDoorPosition(pos, wall, doorWidth, existingDoors);

    // Create preview door (always show, but indicate if it can be placed)
    const previewDoor: Door = {
      id: 'preview',
      wallId: wall.id,
      position: result.position,
      width: doorWidth,
      swingDirection,
      swingSide,
    };

    this.callbacks.onDoorPreview(previewDoor, wall, result.canPlace);
    return false; // Don't consume the event, let other handlers process if needed
  }
}

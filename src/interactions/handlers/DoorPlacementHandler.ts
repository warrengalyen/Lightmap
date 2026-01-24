import type { InputEvent } from '../../core/InputManager';
import type { Door, DoorSwingDirection, DoorSwingSide, WallSegment, Vector2 } from '../../types';
import type { InteractionContext } from '../../types/interaction';
import { BaseInteractionHandler } from '../InteractionHandler';
import { generateId } from '../../utils/id';
import { vectorSubtract, vectorDot, vectorLength } from '../../utils/math';

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
export const DOOR_PLACEMENT_TOLERANCE = 0.5; // feet

/**
 * Projects a point onto a wall and returns the distance from the wall's start.
 */
function projectPointOntoWall(point: Vector2, wall: WallSegment): number {
  const wallDir = vectorSubtract(wall.end, wall.start);
  const wallLength = vectorLength(wallDir);
  if (wallLength === 0) return 0;

  const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };
  const toPoint = vectorSubtract(point, wall.start);
  const projection = vectorDot(toPoint, normalizedDir);

  // Clamp to wall bounds
  return Math.max(0, Math.min(wallLength, projection));
}

/**
 * Clamps a door position to valid wall bounds.
 * Returns the clamped position that keeps the door within the wall.
 */
function clampDoorPositionToWall(
  wall: WallSegment,
  position: number,
  width: number
): number {
  const halfWidth = width / 2;
  const margin = 0.25; // 3 inches from corners

  const minPosition = halfWidth + margin;
  const maxPosition = wall.length - halfWidth - margin;

  // If the wall is too short for the door, center it
  if (minPosition > maxPosition) {
    return wall.length / 2;
  }

  return Math.max(minPosition, Math.min(maxPosition, position));
}

/**
 * Checks if a door overlaps with existing doors on the same wall.
 * Returns false if there's an overlap.
 */
function checkDoorOverlap(
  wallId: string,
  position: number,
  width: number,
  existingDoors: Door[]
): boolean {
  const halfWidth = width / 2;
  const doorsOnWall = existingDoors.filter(d => d.wallId === wallId);

  for (const door of doorsOnWall) {
    const doorHalfWidth = door.width / 2;
    const doorStart = door.position - doorHalfWidth;
    const doorEnd = door.position + doorHalfWidth;
    const newDoorStart = position - halfWidth;
    const newDoorEnd = position + halfWidth;

    // Check for overlap (with small gap requirement)
    const gap = 0.1; // Small gap between doors
    if (!(newDoorEnd + gap < doorStart || newDoorStart - gap > doorEnd)) {
      return false; // Overlap detected
    }
  }

  return true; // No overlap
}

/**
 * Checks if a door can be placed at the given position on a wall.
 * Returns false if the wall is too short or there's overlap with existing doors.
 */
function canPlaceDoorAtPosition(
  wall: WallSegment,
  position: number,
  width: number,
  existingDoors: Door[]
): boolean {
  const margin = 0.25;

  // Check if wall is long enough for the door
  if (wall.length < width + margin * 2) {
    return false;
  }

  return checkDoorOverlap(wall.id, position, width, existingDoors);
}

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
    const wall = this.config.getWallAtPosition(pos, walls, DOOR_PLACEMENT_TOLERANCE);
    if (!wall) {
      return true; // Consumed the event but didn't place
    }

    // Get selected door settings
    const doorWidth = this.config.getSelectedDoorWidth();
    const swingDirection = this.config.getSelectedDoorSwingDirection();
    const swingSide = this.config.getSelectedDoorSwingSide();

    // Project click point onto wall and clamp to valid bounds
    const rawPosition = projectPointOntoWall(pos, wall);
    const positionOnWall = clampDoorPositionToWall(wall, rawPosition, doorWidth);

    // Validate door fits (check overlap with existing doors)
    const existingDoors = this.config.getDoors();
    if (!canPlaceDoorAtPosition(wall, positionOnWall, doorWidth, existingDoors)) {
      return true; // Consumed the event but couldn't place
    }

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
    const wall = this.config.getWallAtPosition(pos, walls, DOOR_PLACEMENT_TOLERANCE);
    if (!wall) {
      this.callbacks.onDoorPreview(null, null, false);
      return false;
    }

    // Get selected door settings
    const doorWidth = this.config.getSelectedDoorWidth();
    const swingDirection = this.config.getSelectedDoorSwingDirection();
    const swingSide = this.config.getSelectedDoorSwingSide();

    // Project mouse point onto wall and clamp to valid bounds
    const rawPosition = projectPointOntoWall(pos, wall);
    const positionOnWall = clampDoorPositionToWall(wall, rawPosition, doorWidth);

    // Check if door can be placed (wall long enough and no overlap)
    const margin = 0.25;
    const wallLongEnough = wall.length >= doorWidth + margin * 2;
    const existingDoors = this.config.getDoors();
    const noOverlap = checkDoorOverlap(wall.id, positionOnWall, doorWidth, existingDoors);
    const canPlace = wallLongEnough && noOverlap;

    // Create preview door (always show, but indicate if it can be placed)
    const previewDoor: Door = {
      id: 'preview',
      wallId: wall.id,
      position: positionOnWall,
      width: doorWidth,
      swingDirection,
      swingSide,
    };

    this.callbacks.onDoorPreview(previewDoor, wall, canPlace);
    return false; // Don't consume the event, let other handlers process if needed
  }
}

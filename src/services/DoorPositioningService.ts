import type { Vector2, WallSegment, Door } from '../types';
import { vectorSubtract, vectorDot, vectorLength } from '../utils/math';
import { getWallDirection } from '../utils/geometry';

/**
 * Constants for door positioning
 */
export const DOOR_MIN_GAP = 0.1; // Minimum gap between doors in feet
export const DOOR_CORNER_MARGIN = 0.25; // Margin from wall corners (3 inches)

export interface DoorPositionResult {
  position: number;
  canPlace: boolean;
  clampedToWall: boolean;
  adjustedForOverlap: boolean;
}

/**
 * Service for calculating door positions on walls.
 * Centralizes door positioning logic used across placement, dragging, and grab mode.
 */
export class DoorPositioningService {
  /**
   * Projects a point onto a wall and returns the distance from the wall's start.
   */
  projectPointOntoWall(point: Vector2, wall: WallSegment): number {
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
   * @param wallLength Length of the wall
   * @param doorWidth Width of the door
   * @param rawPosition Raw position along the wall
   * @param cornerMargin Margin from corners (default: DOOR_CORNER_MARGIN)
   */
  clampDoorPosition(
    wallLength: number,
    doorWidth: number,
    rawPosition: number,
    cornerMargin: number = DOOR_CORNER_MARGIN
  ): number {
    const halfWidth = doorWidth / 2;
    const minPosition = halfWidth + cornerMargin;
    const maxPosition = wallLength - halfWidth - cornerMargin;

    // If the wall is too short for the door, center it
    if (minPosition > maxPosition) {
      return wallLength / 2;
    }

    return Math.max(minPosition, Math.min(maxPosition, rawPosition));
  }

  /**
   * Checks if a door overlaps with existing doors on the same wall.
   * Returns true if there's NO overlap (i.e., placement is valid).
   * @param wallId ID of the wall to check
   * @param position Position along the wall
   * @param doorWidth Width of the door being placed
   * @param existingDoors Array of existing doors
   * @param excludeDoorId Optional door ID to exclude (for dragging existing door)
   * @param minGap Minimum gap between doors (default: DOOR_MIN_GAP)
   */
  checkOverlap(
    wallId: string,
    position: number,
    doorWidth: number,
    existingDoors: Door[],
    excludeDoorId?: string,
    minGap: number = DOOR_MIN_GAP
  ): boolean {
    const halfWidth = doorWidth / 2;
    const doorsOnWall = existingDoors.filter(
      d => d.wallId === wallId && d.id !== excludeDoorId
    );

    for (const door of doorsOnWall) {
      const doorHalfWidth = door.width / 2;
      const doorStart = door.position - doorHalfWidth;
      const doorEnd = door.position + doorHalfWidth;
      const newDoorStart = position - halfWidth;
      const newDoorEnd = position + halfWidth;

      // Check for overlap (with gap requirement)
      if (!(newDoorEnd + minGap < doorStart || newDoorStart - minGap > doorEnd)) {
        return false; // Overlap detected
      }
    }

    return true; // No overlap
  }

  /**
   * Adjusts a door position to avoid overlapping with other doors.
   * Returns the closest valid position to the target.
   * @param targetPosition Desired position
   * @param doorWidth Width of the door
   * @param otherDoors Other doors to avoid
   * @param minPos Minimum valid position
   * @param maxPos Maximum valid position
   * @param minGap Minimum gap between doors (default: DOOR_MIN_GAP)
   */
  avoidOverlap(
    targetPosition: number,
    doorWidth: number,
    otherDoors: Door[],
    minPos: number,
    maxPos: number,
    minGap: number = DOOR_MIN_GAP
  ): number {
    const halfWidth = doorWidth / 2;

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

  /**
   * Calculates a door position from a mouse position, handling clamping and overlap avoidance.
   * @param mousePos Mouse position in world coordinates
   * @param wall Wall to place door on
   * @param doorWidth Width of the door
   * @param existingDoors Existing doors to check for overlap
   * @param excludeDoorId Optional door ID to exclude (for dragging)
   */
  calculateDoorPosition(
    mousePos: Vector2,
    wall: WallSegment,
    doorWidth: number,
    existingDoors: Door[],
    excludeDoorId?: string
  ): DoorPositionResult {
    const { length: wallLength } = getWallDirection(wall);
    if (wallLength === 0) {
      return { position: 0, canPlace: false, clampedToWall: false, adjustedForOverlap: false };
    }

    // Project mouse onto wall
    const rawPosition = this.projectPointOntoWall(mousePos, wall);

    // Clamp to wall bounds
    const clampedPosition = this.clampDoorPosition(wallLength, doorWidth, rawPosition);
    const clampedToWall = Math.abs(clampedPosition - rawPosition) > 0.001;

    // Get doors on this wall excluding the one being dragged
    const otherDoors = existingDoors.filter(
      d => d.wallId === wall.id && d.id !== excludeDoorId
    );

    // Avoid overlap with other doors
    const halfWidth = doorWidth / 2;
    const minPos = halfWidth;
    const maxPos = wallLength - halfWidth;
    const finalPosition = this.avoidOverlap(clampedPosition, doorWidth, otherDoors, minPos, maxPos);
    const adjustedForOverlap = Math.abs(finalPosition - clampedPosition) > 0.001;

    // Check if door can actually be placed
    const canPlace = this.canPlaceDoor(wall, finalPosition, doorWidth, existingDoors, excludeDoorId);

    return {
      position: finalPosition,
      canPlace,
      clampedToWall,
      adjustedForOverlap,
    };
  }

  /**
   * Checks if a door can be placed at the given position.
   * @param wall Wall to check
   * @param position Position on the wall
   * @param doorWidth Width of the door
   * @param existingDoors Existing doors
   * @param excludeDoorId Optional door ID to exclude
   */
  canPlaceDoor(
    wall: WallSegment,
    position: number,
    doorWidth: number,
    existingDoors: Door[],
    excludeDoorId?: string
  ): boolean {
    // Check if wall is long enough for the door
    if (wall.length < doorWidth + DOOR_CORNER_MARGIN * 2) {
      return false;
    }

    return this.checkOverlap(wall.id, position, doorWidth, existingDoors, excludeDoorId);
  }

  /**
   * Calculates a door position for dragging operations (no corner margin constraint).
   * @param mousePos Mouse position in world coordinates
   * @param wall Wall the door is on
   * @param doorWidth Width of the door
   * @param existingDoors Existing doors
   * @param excludeDoorId Door ID being dragged
   */
  calculateDragPosition(
    mousePos: Vector2,
    wall: WallSegment,
    doorWidth: number,
    existingDoors: Door[],
    excludeDoorId: string
  ): number {
    const { normalized, length: wallLength } = getWallDirection(wall);
    if (wallLength === 0) return 0;

    // Project mouse position onto the wall
    const mouseToWallStart = {
      x: mousePos.x - wall.start.x,
      y: mousePos.y - wall.start.y,
    };
    let newPosition = mouseToWallStart.x * normalized.x + mouseToWallStart.y * normalized.y;

    // Constrain position to wall bounds (no corner margin for dragging)
    const halfWidth = doorWidth / 2;
    const minPosition = halfWidth;
    const maxPosition = wallLength - halfWidth;
    newPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));

    // Avoid overlap with other doors
    const otherDoors = existingDoors.filter(
      d => d.wallId === wall.id && d.id !== excludeDoorId
    );
    newPosition = this.avoidOverlap(newPosition, doorWidth, otherDoors, minPosition, maxPosition);

    return newPosition;
  }
}

// Singleton instance
export const doorPositioningService = new DoorPositioningService();

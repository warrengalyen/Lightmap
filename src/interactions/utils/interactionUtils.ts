import type { Vector2, LightFixture, WallSegment, Door } from '../../types';
import type { InputModifiers, SelectionState } from '../../types/interaction';
import type { InputEvent } from '../../core/InputManager';
import { getWallDirection } from '../../utils/geometry';

/**
 * Default empty modifiers object for drag operations.
 */
export const EMPTY_MODIFIERS: InputModifiers = {
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
};

/**
 * Extracts modifier keys from an input event.
 */
export function extractModifiers(event: InputEvent): InputModifiers {
  return {
    shiftKey: event.shiftKey ?? false,
    ctrlKey: event.ctrlKey ?? false,
    altKey: event.altKey ?? false,
  };
}

/**
 * Checks if any item is selected.
 */
export function hasSelection(selection: SelectionState): boolean {
  return (
    selection.selectedVertexIndices.size > 0 ||
    selection.selectedLightIds.size > 0 ||
    selection.selectedWallId !== null ||
    selection.selectedDoorId !== null
  );
}

/**
 * Configuration for getting selection origin.
 */
export interface SelectionOriginConfig {
  getVertices: () => Vector2[];
  getLights: () => LightFixture[];
  getWalls: () => WallSegment[];
  getWallById: (id: string) => WallSegment | undefined;
  getDoorById: (id: string) => Door | undefined;
}

/**
 * Gets the position of the first selected object.
 * Used for axis lock guides and grab mode offset calculation.
 */
export function getSelectionOrigin(
  selection: SelectionState,
  config: SelectionOriginConfig
): Vector2 | null {
  // Check vertices first
  if (selection.selectedVertexIndices.size > 0) {
    const vertices = config.getVertices();
    const firstIndex = Array.from(selection.selectedVertexIndices)[0];
    if (vertices[firstIndex]) {
      return { ...vertices[firstIndex] };
    }
  }

  // Check lights
  if (selection.selectedLightIds.size > 0) {
    const lights = config.getLights();
    const firstId = Array.from(selection.selectedLightIds)[0];
    const light = lights.find(l => l.id === firstId);
    if (light) {
      return { ...light.position };
    }
  }

  // Check wall
  if (selection.selectedWallId) {
    const wall = config.getWallById(selection.selectedWallId);
    if (wall) {
      return { ...wall.start };
    }
  }

  // Check door
  if (selection.selectedDoorId) {
    const door = config.getDoorById(selection.selectedDoorId);
    if (door) {
      const wall = config.getWallById(door.wallId);
      if (wall) {
        const { normalized, length } = getWallDirection(wall);
        if (length > 0) {
          return {
            x: wall.start.x + normalized.x * door.position,
            y: wall.start.y + normalized.y * door.position,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Gets selection origin using RoomState directly (for handlers that have context).
 */
export function getSelectionOriginFromRoomState(
  selection: SelectionState,
  vertices: Vector2[],
  lights: LightFixture[],
  walls: WallSegment[],
  doors: Door[]
): Vector2 | undefined {
  // Check vertices first
  if (selection.selectedVertexIndices.size > 0) {
    const firstIndex = Array.from(selection.selectedVertexIndices)[0];
    if (vertices[firstIndex]) {
      return vertices[firstIndex];
    }
  }

  // Check lights
  if (selection.selectedLightIds.size > 0) {
    const firstId = Array.from(selection.selectedLightIds)[0];
    const light = lights.find(l => l.id === firstId);
    if (light) {
      return light.position;
    }
  }

  // Check wall - use midpoint
  if (selection.selectedWallId) {
    const wall = walls.find(w => w.id === selection.selectedWallId);
    if (wall) {
      return {
        x: (wall.start.x + wall.end.x) / 2,
        y: (wall.start.y + wall.end.y) / 2,
      };
    }
  }

  // Check door
  if (selection.selectedDoorId) {
    const door = doors.find(d => d.id === selection.selectedDoorId);
    if (door) {
      const wall = walls.find(w => w.id === door.wallId);
      if (wall) {
        const { normalized, length } = getWallDirection(wall);
        if (length > 0) {
          return {
            x: wall.start.x + normalized.x * door.position,
            y: wall.start.y + normalized.y * door.position,
          };
        }
      }
    }
  }

  return undefined;
}

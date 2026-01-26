import type { Vector2, WallSegment, Door, LightFixture } from '../../types';
import type { SelectionState } from '../../types/interaction';
import { getWallDirection, isPointInPolygon } from '../../utils/geometry';

/**
 * Calculates the grab offset (distance from mouse to anchor object) when grab mode starts.
 */
export function calculateGrabOffset(anchorPos: Vector2, mousePos: Vector2): Vector2 {
  return {
    x: anchorPos.x - mousePos.x,
    y: anchorPos.y - mousePos.y,
  };
}

/**
 * Adjusts a mouse position by the grab offset.
 */
export function applyGrabOffset(mousePos: Vector2, offset: Vector2): Vector2 {
  return {
    x: mousePos.x + offset.x,
    y: mousePos.y + offset.y,
  };
}

/**
 * Finds the anchor position for the selection.
 * Returns the position of the first selected item.
 */
export function findAnchorPosition(
  selection: SelectionState,
  getVertices: () => Vector2[],
  getLights: () => LightFixture[],
  getWallById: (id: string) => WallSegment | undefined,
  getDoorById: (id: string) => Door | undefined
): {
  anchorPos: Vector2 | null;
  anchorType: 'vertex' | 'light' | 'wall' | 'door' | null;
  anchorId: number | string | null;
} {
  const vertices = getVertices();
  const lights = getLights();

  // Check vertices first
  if (selection.selectedVertexIndices.size > 0) {
    const anchorIndex = Array.from(selection.selectedVertexIndices)[0];
    if (vertices[anchorIndex]) {
      return {
        anchorPos: { ...vertices[anchorIndex] },
        anchorType: 'vertex',
        anchorId: anchorIndex,
      };
    }
  }

  // Check lights
  if (selection.selectedLightIds.size > 0) {
    const anchorId = Array.from(selection.selectedLightIds)[0];
    const light = lights.find(l => l.id === anchorId);
    if (light) {
      return {
        anchorPos: { ...light.position },
        anchorType: 'light',
        anchorId,
      };
    }
  }

  // Check wall
  if (selection.selectedWallId) {
    const wall = getWallById(selection.selectedWallId);
    if (wall) {
      return {
        anchorPos: { ...wall.start },
        anchorType: 'wall',
        anchorId: selection.selectedWallId,
      };
    }
  }

  // Check door
  if (selection.selectedDoorId) {
    const door = getDoorById(selection.selectedDoorId);
    if (door) {
      const wall = getWallById(door.wallId);
      if (wall) {
        const { normalized, length } = getWallDirection(wall);
        if (length > 0) {
          return {
            anchorPos: {
              x: wall.start.x + normalized.x * door.position,
              y: wall.start.y + normalized.y * door.position,
            },
            anchorType: 'door',
            anchorId: selection.selectedDoorId,
          };
        }
      }
    }
  }

  return { anchorPos: null, anchorType: null, anchorId: null };
}

/**
 * Calculates the movement delta from the original anchor position to the target position.
 */
export function calculateDelta(originalPos: Vector2, targetPos: Vector2): Vector2 {
  return {
    x: targetPos.x - originalPos.x,
    y: targetPos.y - originalPos.y,
  };
}

/**
 * Applies a movement delta to a position.
 */
export function applyDelta(pos: Vector2, delta: Vector2): Vector2 {
  return {
    x: pos.x + delta.x,
    y: pos.y + delta.y,
  };
}

/**
 * Checks if a point is inside the room polygon.
 */
export function checkPointInRoom(point: Vector2, walls: WallSegment[]): boolean {
  if (walls.length < 3) return false;
  const vertices = walls.map(w => w.start);
  return isPointInPolygon(point, vertices);
}

/**
 * Stores original positions from a selection for later restoration.
 */
export function captureOriginalPositions(
  selection: SelectionState,
  getVertices: () => Vector2[],
  getLights: () => LightFixture[],
  getWallById: (id: string) => WallSegment | undefined,
  getDoorById: (id: string) => Door | undefined
): {
  vertexPositions: Map<number, Vector2>;
  lightPositions: Map<string, Vector2>;
  wallVertices: { start: Vector2; end: Vector2 } | null;
  doorPosition: number | null;
} {
  const vertices = getVertices();
  const lights = getLights();

  const vertexPositions = new Map<number, Vector2>();
  for (const idx of selection.selectedVertexIndices) {
    if (vertices[idx]) {
      vertexPositions.set(idx, { ...vertices[idx] });
    }
  }

  const lightPositions = new Map<string, Vector2>();
  for (const id of selection.selectedLightIds) {
    const light = lights.find(l => l.id === id);
    if (light) {
      lightPositions.set(id, { ...light.position });
    }
  }

  let wallVertices: { start: Vector2; end: Vector2 } | null = null;
  if (selection.selectedWallId) {
    const wall = getWallById(selection.selectedWallId);
    if (wall) {
      wallVertices = { start: { ...wall.start }, end: { ...wall.end } };
    }
  }

  let doorPosition: number | null = null;
  if (selection.selectedDoorId) {
    const door = getDoorById(selection.selectedDoorId);
    if (door) {
      doorPosition = door.position;
    }
  }

  return { vertexPositions, lightPositions, wallVertices, doorPosition };
}

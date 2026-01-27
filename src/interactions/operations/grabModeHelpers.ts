import type { Vector2, WallSegment, Door, LightFixture } from '../../types';
import type { SelectionState, AxisLock } from '../../types/interaction';
import type { SnapGuide, SnapController } from '../../controllers/SnapController';
import { getWallDirection, isPointInPolygon } from '../../utils/geometry';
import { applyGridSnap, type GridSnapConfig } from '../utils/snapHelpers';
import { DEFAULT_GRID_SIZE_FT } from '../../constants/editor';

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

/**
 * Handle shift-key snapping for single vertex or light selection.
 */
export function handleShiftSnapping(
  targetPos: Vector2,
  selection: SelectionState | null,
  anchorVertexIndex: number | null,
  anchorLightId: string | null,
  snapController: SnapController,
  getVertices: () => Vector2[],
  getLights: () => LightFixture[]
): { snappedPos: Vector2; guides: SnapGuide[] } {
  if (!selection) {
    return { snappedPos: targetPos, guides: [] };
  }

  // Only snap for single vertex selection
  if (selection.selectedVertexIndices.size === 1 &&
      selection.selectedLightIds.size === 0 &&
      anchorVertexIndex !== null) {
    return snapController.snapToVertices(targetPos, getVertices(), anchorVertexIndex);
  }

  // Only snap for single light selection
  if (selection.selectedLightIds.size === 1 &&
      selection.selectedVertexIndices.size === 0 &&
      anchorLightId !== null) {
    return snapController.snapToLights(targetPos, getLights(), anchorLightId);
  }

  return { snappedPos: targetPos, guides: [] };
}

/**
 * Apply grid snap or axis constraint to a target position.
 * Returns the snapped position and whether snap guides should be cleared.
 */
export function applyGridSnapOrAxisLock(
  targetPos: Vector2,
  startPosition: Vector2,
  axisLock: AxisLock,
  config: GridSnapConfig,
  applyAxisConstraint: (pos: Vector2, lock: AxisLock, origin: Vector2) => Vector2
): { position: Vector2; clearGuides: boolean } {
  const gridResult = applyGridSnap(
    targetPos,
    startPosition,
    axisLock,
    config,
    DEFAULT_GRID_SIZE_FT
  );

  if (gridResult.wasSnapped) {
    return {
      position: gridResult.position,
      clearGuides: axisLock === 'none',
    };
  }

  if (axisLock !== 'none') {
    return {
      position: applyAxisConstraint(targetPos, axisLock, startPosition),
      clearGuides: false,
    };
  }

  return { position: targetPos, clearGuides: true };
}

export interface ShiftSnapContext {
  selection: SelectionState | null;
  anchorVertexIndex: number | null;
  anchorLightId: string | null;
  getVertices: () => Vector2[];
  getLights: () => LightFixture[];
}

/**
 * Process target position with shift snapping or grid snap + axis lock.
 * Returns the final position and any snap guides to display.
 */
export function processTargetWithSnapping(
  targetPos: Vector2,
  startPosition: Vector2,
  context: { axisLock: AxisLock; modifiers: { shiftKey: boolean } },
  config: GridSnapConfig,
  shiftSnapContext: ShiftSnapContext,
  applyAxisConstraint: (pos: Vector2, lock: AxisLock, origin: Vector2) => Vector2
): { position: Vector2; guides: SnapGuide[]; clearGuides: boolean } {
  // SHIFT alignment takes priority
  if (context.modifiers.shiftKey) {
    const result = handleShiftSnapping(
      targetPos,
      shiftSnapContext.selection,
      shiftSnapContext.anchorVertexIndex,
      shiftSnapContext.anchorLightId,
      config.snapController,
      shiftSnapContext.getVertices,
      shiftSnapContext.getLights
    );
    let snappedPos = result.snappedPos;
    if (context.axisLock !== 'none') {
      snappedPos = applyAxisConstraint(snappedPos, context.axisLock, startPosition);
      return { position: snappedPos, guides: [], clearGuides: false };
    }
    return { position: snappedPos, guides: result.guides, clearGuides: false };
  }

  // Grid snap - apply when SHIFT is not held
  const gridResult = applyGridSnapOrAxisLock(
    targetPos,
    startPosition,
    context.axisLock,
    config,
    applyAxisConstraint
  );
  return {
    position: gridResult.position,
    guides: [],
    clearGuides: gridResult.clearGuides,
  };
}

export interface WallSnapConfig {
  getWalls: () => WallSegment[];
  getVertices: () => Vector2[];
  snapController: SnapController;
}

/**
 * Apply wall snapping when shift is held, and manage snap guides.
 * Returns the final wall start/end positions.
 */
export function applyWallSnappingWithGuides(
  newStart: Vector2,
  newEnd: Vector2,
  wallId: string | null,
  context: { axisLock: AxisLock; modifiers: { shiftKey: boolean } },
  config: WallSnapConfig,
  onSetSnapGuides: (guides: SnapGuide[]) => void
): { start: Vector2; end: Vector2 } {
  let finalStart = newStart;
  let finalEnd = newEnd;

  if (context.modifiers.shiftKey) {
    const result = handleWallSnapping(
      newStart,
      newEnd,
      wallId,
      config.getWalls,
      config.getVertices,
      config.snapController
    );
    finalStart = result.snappedStart;
    finalEnd = result.snappedEnd;
    if (context.axisLock === 'none') {
      onSetSnapGuides(result.guides);
    }
  } else if (context.axisLock === 'none') {
    onSetSnapGuides([]);
  }

  return { start: finalStart, end: finalEnd };
}

/**
 * Handle wall snapping to vertices (excluding the wall's own vertices).
 */
export function handleWallSnapping(
  newStart: Vector2,
  newEnd: Vector2,
  wallId: string | null,
  getWalls: () => WallSegment[],
  getVertices: () => Vector2[],
  snapController: SnapController
): { snappedStart: Vector2; snappedEnd: Vector2; guides: SnapGuide[] } {
  if (!wallId) {
    return { snappedStart: newStart, snappedEnd: newEnd, guides: [] };
  }

  const walls = getWalls();
  const wallIndex = walls.findIndex(w => w.id === wallId);

  if (wallIndex === -1) {
    return { snappedStart: newStart, snappedEnd: newEnd, guides: [] };
  }

  const vertices = getVertices();
  const numWalls = walls.length;
  const excludeIndices = [wallIndex, (wallIndex + 1) % numWalls];

  return snapController.snapWallToVertices(newStart, newEnd, vertices, excludeIndices);
}

import type { Vector2, LightFixture, WallSegment, Door } from '../../types';
import type {
  DragStartContext,
  DragUpdateContext,
  SelectionState,
} from '../../types/interaction';
import type { SnapController, SnapGuide } from '../../controllers/SnapController';
import type { DragManagerCallbacks } from '../DragManager';
import { BaseDragOperation } from '../DragOperation';
import { DEFAULT_GRID_SIZE_FT } from '../../constants/editor';
import { isPointInPolygon } from '../../utils/geometry';

export interface GrabModeConfig {
  snapController: SnapController;
  getGridSnapEnabled: () => boolean;
  getGridSize: () => number;
  getVertices: () => Vector2[];
  getLights: () => LightFixture[];
  getWalls: () => WallSegment[];
  getWallById: (id: string) => WallSegment | undefined;
  getDoors: () => Door[];
  getDoorById: (id: string) => Door | undefined;
  getDoorsByWallId: (wallId: string) => Door[];
  isRoomClosed: () => boolean;
  getCurrentMousePos: () => Vector2;
}

/**
 * Handles grab mode (G key) which allows moving selected items
 * by moving the mouse without clicking and dragging.
 *
 * The offset between the mouse and the anchor object is preserved,
 * so the object follows the mouse at a fixed distance.
 */
export class GrabModeDragOperation extends BaseDragOperation {
  readonly type = 'grabMode';

  private originalVertexPositions: Map<number, Vector2> = new Map();
  private originalLightPositions: Map<string, Vector2> = new Map();
  private originalWallVertices: { start: Vector2; end: Vector2 } | null = null;
  private originalDoorPosition: number | null = null;
  private anchorVertexIndex: number | null = null;
  private anchorLightId: string | null = null;
  private wallId: string | null = null;
  private doorId: string | null = null;
  private selection: SelectionState | null = null;
  private config: GrabModeConfig;
  private callbacks: DragManagerCallbacks;

  // Offset from mouse position to anchor object position when grab started
  private grabOffset: Vector2 | null = null;

  constructor(config: GrabModeConfig, callbacks: DragManagerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  start(context: DragStartContext): void {
    this._isActive = true;
    this.selection = context.selection;

    const vertices = this.config.getVertices();
    const lights = this.config.getLights();
    const currentMousePos = this.config.getCurrentMousePos();

    // Store original positions of all selected vertices
    this.originalVertexPositions.clear();
    for (const idx of context.selection.selectedVertexIndices) {
      if (vertices[idx]) {
        this.originalVertexPositions.set(idx, { ...vertices[idx] });
      }
    }

    // Store original positions of all selected lights
    this.originalLightPositions.clear();
    for (const id of context.selection.selectedLightIds) {
      const light = lights.find(l => l.id === id);
      if (light) {
        this.originalLightPositions.set(id, { ...light.position });
      }
    }

    // Determine anchor and calculate offset from mouse to anchor
    let anchorPos: Vector2 | null = null;

    if (context.selection.selectedVertexIndices.size > 0) {
      this.anchorVertexIndex = Array.from(context.selection.selectedVertexIndices)[0];
      anchorPos = this.originalVertexPositions.get(this.anchorVertexIndex)!;
    } else if (context.selection.selectedLightIds.size > 0) {
      this.anchorLightId = Array.from(context.selection.selectedLightIds)[0];
      anchorPos = this.originalLightPositions.get(this.anchorLightId)!;
    } else if (context.selection.selectedWallId) {
      this.wallId = context.selection.selectedWallId;
      const wall = this.config.getWallById(this.wallId);
      if (wall) {
        this.originalWallVertices = { start: { ...wall.start }, end: { ...wall.end } };
        anchorPos = wall.start;
      }
    } else if (context.selection.selectedDoorId) {
      this.doorId = context.selection.selectedDoorId;
      const door = this.config.getDoorById(this.doorId);
      if (door) {
        this.originalDoorPosition = door.position;
        // Calculate door's world position for offset calculation
        const wall = this.config.getWallById(door.wallId);
        if (wall) {
          const wallDir = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y,
          };
          const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.y * wallDir.y);
          if (wallLength > 0) {
            const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };
            anchorPos = {
              x: wall.start.x + normalizedDir.x * door.position,
              y: wall.start.y + normalizedDir.y * door.position,
            };
          }
        }
      }
    }

    if (anchorPos) {
      // Offset = anchor position - mouse position
      this.grabOffset = {
        x: anchorPos.x - currentMousePos.x,
        y: anchorPos.y - currentMousePos.y,
      };
      this.startPosition = { ...anchorPos };
    }
  }

  update(context: DragUpdateContext): void {
    if (!this._isActive || !this.grabOffset || !this.startPosition) return;

    // Adjust position with offset (as if we clicked on the object)
    const adjustedPos = {
      x: context.position.x + this.grabOffset.x,
      y: context.position.y + this.grabOffset.y,
    };

    // Handle door separately if only door is selected
    if (this.doorId && this.originalDoorPosition !== null &&
        this.originalVertexPositions.size === 0 && this.originalLightPositions.size === 0 &&
        !this.wallId) {
      this.updateDoor(context.position);
    }
    // Handle wall separately if only wall is selected
    else if (this.wallId && this.originalWallVertices &&
        this.originalVertexPositions.size === 0 && this.originalLightPositions.size === 0) {
      this.updateWall(adjustedPos, context);
    } else {
      this.updateVerticesAndLights(adjustedPos, context);
    }
  }

  commit(): void {
    if (!this._isActive) return;

    this._isActive = false;
    this.cleanup();
  }

  cancel(): void {
    if (!this._isActive) return;

    // Restore original vertex positions
    for (const [idx, originalPos] of this.originalVertexPositions) {
      this.callbacks.onUpdateVertexPosition(idx, originalPos);
    }

    // Restore original light positions
    if (this.originalLightPositions.size > 0) {
      this.callbacks.onUpdateLightPositions(new Map(this.originalLightPositions));
    }

    // Restore original wall position
    if (this.wallId && this.originalWallVertices) {
      this.callbacks.onMoveWall(
        this.wallId,
        this.originalWallVertices.start,
        this.originalWallVertices.end
      );
    }

    // Restore original door position
    if (this.doorId && this.originalDoorPosition !== null) {
      this.callbacks.onUpdateDoorPosition(this.doorId, this.originalDoorPosition);
    }

    this._isActive = false;
    this.cleanup();
  }

  private updateVerticesAndLights(adjustedPos: Vector2, context: DragUpdateContext): void {
    if (!this.startPosition || !this.selection) return;

    let targetPos = adjustedPos;

    // Grid snap - apply before axis lock, but only to the free axis when locked
    const gridSize = this.config.getGridSize() || DEFAULT_GRID_SIZE_FT;
    if (this.config.getGridSnapEnabled() && gridSize > 0) {
      if (context.axisLock === 'none') {
        // No axis lock - snap both axes
        targetPos = this.config.snapController.snapToGrid(targetPos, gridSize);
        this.callbacks.onSetSnapGuides([]);
      } else {
        // Axis lock active - only snap the free axis
        const snapped = this.config.snapController.snapToGrid(targetPos, gridSize);
        if (context.axisLock === 'x') {
          // X-axis movement (horizontal) - only snap X, keep Y at original
          targetPos = { x: snapped.x, y: this.startPosition.y };
        } else {
          // Y-axis movement (vertical) - only snap Y, keep X at original
          targetPos = { x: this.startPosition.x, y: snapped.y };
        }
      }
    }
    // Shift snapping for single items
    else if (context.modifiers.shiftKey) {
      const result = this.handleShiftSnapping(targetPos);
      targetPos = result.snappedPos;
      if (context.axisLock !== 'none') {
        targetPos = this.applyAxisConstraint(targetPos, context.axisLock, this.startPosition);
      }
      if (context.axisLock === 'none') {
        this.callbacks.onSetSnapGuides(result.guides);
      }
    } else {
      // No grid snap, no shift snap - just apply axis lock if active
      if (context.axisLock !== 'none') {
        targetPos = this.applyAxisConstraint(targetPos, context.axisLock, this.startPosition);
      }
      if (context.axisLock === 'none') {
        this.callbacks.onSetSnapGuides([]);
      }
    }

    // Calculate delta from anchor point
    const delta = this.calculateDeltaFromAnchor(targetPos);

    // Move vertices
    for (const [idx, originalPos] of this.originalVertexPositions) {
      const newPos = {
        x: originalPos.x + delta.x,
        y: originalPos.y + delta.y,
      };
      this.callbacks.onUpdateVertexPosition(idx, newPos);
    }

    // Move lights
    if (this.originalLightPositions.size > 0) {
      const walls = this.config.getWalls();
      const isClosed = this.config.isRoomClosed();
      const updates = new Map<string, Vector2>();

      for (const [id, originalPos] of this.originalLightPositions) {
        const newPos = {
          x: originalPos.x + delta.x,
          y: originalPos.y + delta.y,
        };

        if (!isClosed || this.isPointInsideRoom(newPos, walls)) {
          updates.set(id, newPos);
        }
      }

      if (updates.size > 0) {
        this.callbacks.onUpdateLightPositions(updates);
      }
    }
  }

  private updateWall(adjustedPos: Vector2, context: DragUpdateContext): void {
    if (!this.wallId || !this.originalWallVertices || !this.startPosition) return;

    let constrainedPos = adjustedPos;

    // Apply axis lock using the original position
    if (context.axisLock !== 'none') {
      constrainedPos = this.applyAxisConstraint(adjustedPos, context.axisLock, this.startPosition);
    }

    const delta = this.calculateDelta(this.startPosition, constrainedPos);

    let newStart = this.applyDelta(this.originalWallVertices.start, delta);
    let newEnd = this.applyDelta(this.originalWallVertices.end, delta);

    // Snap when holding Shift
    if (context.modifiers.shiftKey) {
      const result = this.handleWallSnapping(newStart, newEnd);
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

  private updateDoor(mousePos: Vector2): void {
    if (!this.doorId || this.originalDoorPosition === null) return;

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
      x: mousePos.x - wall.start.x,
      y: mousePos.y - wall.start.y,
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

  /**
   * Adjust position to avoid overlapping with other doors.
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
          const newPos = other.position - minDistance;
          if (newPos >= minPos) {
            targetPosition = newPos;
          } else {
            targetPosition = Math.min(maxPos, other.position + minDistance);
          }
        } else {
          const newPos = other.position + minDistance;
          if (newPos <= maxPos) {
            targetPosition = newPos;
          } else {
            targetPosition = Math.max(minPos, other.position - minDistance);
          }
        }
      }
    }

    return targetPosition;
  }

  private handleShiftSnapping(
    targetPos: Vector2
  ): { snappedPos: Vector2; guides: SnapGuide[] } {
    if (!this.selection) {
      return { snappedPos: targetPos, guides: [] };
    }

    // Only snap for single vertex selection
    if (this.selection.selectedVertexIndices.size === 1 &&
        this.selection.selectedLightIds.size === 0 &&
        this.anchorVertexIndex !== null) {
      const vertices = this.config.getVertices();
      return this.config.snapController.snapToVertices(targetPos, vertices, this.anchorVertexIndex);
    }

    // Only snap for single light selection
    if (this.selection.selectedLightIds.size === 1 &&
        this.selection.selectedVertexIndices.size === 0 &&
        this.anchorLightId !== null) {
      const lights = this.config.getLights();
      return this.config.snapController.snapToLights(targetPos, lights, this.anchorLightId);
    }

    return { snappedPos: targetPos, guides: [] };
  }

  private handleWallSnapping(
    newStart: Vector2,
    newEnd: Vector2
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

  private calculateDeltaFromAnchor(targetPos: Vector2): Vector2 {
    let delta = { x: 0, y: 0 };

    if (this.anchorVertexIndex !== null && this.originalVertexPositions.has(this.anchorVertexIndex)) {
      const anchorOriginal = this.originalVertexPositions.get(this.anchorVertexIndex)!;
      delta = {
        x: targetPos.x - anchorOriginal.x,
        y: targetPos.y - anchorOriginal.y,
      };
    } else if (this.anchorLightId !== null && this.originalLightPositions.has(this.anchorLightId)) {
      const anchorOriginal = this.originalLightPositions.get(this.anchorLightId)!;
      delta = {
        x: targetPos.x - anchorOriginal.x,
        y: targetPos.y - anchorOriginal.y,
      };
    }

    return delta;
  }

  private isPointInsideRoom(point: Vector2, walls: WallSegment[]): boolean {
    if (walls.length < 3) return false;
    const vertices = walls.map(w => w.start);
    return isPointInPolygon(point, vertices);
  }

  private cleanup(): void {
    this.originalVertexPositions.clear();
    this.originalLightPositions.clear();
    this.originalWallVertices = null;
    this.originalDoorPosition = null;
    this.anchorVertexIndex = null;
    this.anchorLightId = null;
    this.wallId = null;
    this.doorId = null;
    this.selection = null;
    this.startPosition = null;
    this.grabOffset = null;
  }
}

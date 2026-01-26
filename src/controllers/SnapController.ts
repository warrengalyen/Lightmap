import type { Vector2, LightFixture } from '../types';

export interface SnapGuide {
  axis: 'x' | 'y';
  value: number;
  from: Vector2;
  to: Vector2;
}

export interface SnapResult {
  snappedPos: Vector2;
  guides: SnapGuide[];
}

export interface WallSnapResult {
  snappedStart: Vector2;
  snappedEnd: Vector2;
  guides: SnapGuide[];
}

const DEFAULT_SNAP_THRESHOLD = 0.5; // feet

/**
 * Handles snapping logic for vertices, lights, and walls.
 * Provides alignment snapping with visual guide generation.
 */
export class SnapController {
  private snapThreshold: number;

  constructor(snapThreshold: number = DEFAULT_SNAP_THRESHOLD) {
    this.snapThreshold = snapThreshold;
  }

    /**
   * Snaps a position to align with other vertices.
   * @param pos - The position to snap
   * @param vertices - All vertices to check alignment against
   * @param excludeIndex - Index of vertex to exclude (usually the one being dragged)
   */
  snapToVertices(pos: Vector2, vertices: Vector2[], excludeIndex: number): SnapResult {
    const guides: SnapGuide[] = [];
    let snappedX = pos.x;
    let snappedY = pos.y;
    let snapXTarget: Vector2 | null = null;
    let snapYTarget: Vector2 | null = null;

    for (let i = 0; i < vertices.length; i++) {
      if (i === excludeIndex) continue;

      const v = vertices[i];

      // Check X alignment
      if (Math.abs(pos.x - v.x) < this.snapThreshold) {
        if (!snapXTarget || Math.abs(pos.x - v.x) < Math.abs(pos.x - snapXTarget.x)) {
          snappedX = v.x;
          snapXTarget = v;
        }
      }

      // Check Y alignment
      if (Math.abs(pos.y - v.y) < this.snapThreshold) {
        if (!snapYTarget || Math.abs(pos.y - v.y) < Math.abs(pos.y - snapYTarget.y)) {
          snappedY = v.y;
          snapYTarget = v;
        }
      }
    }

    // Create guide lines
    if (snapXTarget) {
      guides.push(this.createVerticalGuide(snappedX, pos.y, snapXTarget.y));
    }

    if (snapYTarget) {
      guides.push(this.createHorizontalGuide(snappedY, pos.x, snapYTarget.x));
    }

    return {
      snappedPos: { x: snappedX, y: snappedY },
      guides,
    };
  }

  /**
   * Snaps a position to align with other lights.
   * @param pos - The position to snap
   * @param lights - All lights to check alignment against
   * @param excludeLightId - ID of light to exclude (usually the one being dragged)
   */
  snapToLights(pos: Vector2, lights: LightFixture[], excludeLightId: string): SnapResult {
    const guides: SnapGuide[] = [];
    let snappedX = pos.x;
    let snappedY = pos.y;
    let snapXTarget: Vector2 | null = null;
    let snapYTarget: Vector2 | null = null;

    for (const light of lights) {
      if (light.id === excludeLightId) continue;

      const p = light.position;

      // Check X alignment
      if (Math.abs(pos.x - p.x) < this.snapThreshold) {
        if (!snapXTarget || Math.abs(pos.x - p.x) < Math.abs(pos.x - snapXTarget.x)) {
          snappedX = p.x;
          snapXTarget = p;
        }
      }

      // Check Y alignment
      if (Math.abs(pos.y - p.y) < this.snapThreshold) {
        if (!snapYTarget || Math.abs(pos.y - p.y) < Math.abs(pos.y - snapYTarget.y)) {
          snappedY = p.y;
          snapYTarget = p;
        }
      }
    }

    // Create guide lines
    if (snapXTarget) {
      guides.push(this.createVerticalGuide(snappedX, pos.y, snapXTarget.y));
    }

    if (snapYTarget) {
      guides.push(this.createHorizontalGuide(snappedY, pos.x, snapYTarget.x));
    }

    return {
      snappedPos: { x: snappedX, y: snappedY },
      guides,
    };
  }

  /**
   * Snaps a wall (both endpoints) to align with other vertices.
   * @param start - Wall start position
   * @param end - Wall end position
   * @param vertices - All vertices to check alignment against
   * @param excludeIndices - Indices of vertices to exclude (the wall's own vertices)
   */
  snapWallToVertices(
    start: Vector2,
    end: Vector2,
    vertices: Vector2[],
    excludeIndices: number[]
  ): WallSnapResult {
    const guides: SnapGuide[] = [];

    let snapDeltaX: number | null = null;
    let snapDeltaY: number | null = null;
    let snapXTarget: Vector2 | null = null;
    let snapYTarget: Vector2 | null = null;
    let snapFromStart = true;

    // Check alignment for both endpoints
    for (let i = 0; i < vertices.length; i++) {
      if (excludeIndices.includes(i)) continue;
      const v = vertices[i];

      // X alignment for start
      if (Math.abs(start.x - v.x) < this.snapThreshold) {
        if (snapDeltaX === null || Math.abs(start.x - v.x) < Math.abs(snapDeltaX)) {
          snapDeltaX = v.x - start.x;
          snapXTarget = v;
          snapFromStart = true;
        }
      }

      // Y alignment for start
      if (Math.abs(start.y - v.y) < this.snapThreshold) {
        if (snapDeltaY === null || Math.abs(start.y - v.y) < Math.abs(snapDeltaY)) {
          snapDeltaY = v.y - start.y;
          snapYTarget = v;
          snapFromStart = true;
        }
      }

      // X alignment for end
      if (Math.abs(end.x - v.x) < this.snapThreshold) {
        if (snapDeltaX === null || Math.abs(end.x - v.x) < Math.abs(snapDeltaX)) {
          snapDeltaX = v.x - end.x;
          snapXTarget = v;
          snapFromStart = false;
        }
      }

      // Y alignment for end
      if (Math.abs(end.y - v.y) < this.snapThreshold) {
        if (snapDeltaY === null || Math.abs(end.y - v.y) < Math.abs(snapDeltaY)) {
          snapDeltaY = v.y - end.y;
          snapYTarget = v;
          snapFromStart = false;
        }
      }
    }

    // Apply snapping
    const snappedStart = { ...start };
    const snappedEnd = { ...end };

    if (snapDeltaX !== null) {
      snappedStart.x += snapDeltaX;
      snappedEnd.x += snapDeltaX;
    }
    if (snapDeltaY !== null) {
      snappedStart.y += snapDeltaY;
      snappedEnd.y += snapDeltaY;
    }

    // Create guide lines
    if (snapXTarget) {
      const refPoint = snapFromStart ? snappedStart : snappedEnd;
      guides.push(this.createVerticalGuide(snapXTarget.x, refPoint.y, snapXTarget.y));
    }

    if (snapYTarget) {
      const refPoint = snapFromStart ? snappedStart : snappedEnd;
      guides.push(this.createHorizontalGuide(snapYTarget.y, refPoint.x, snapYTarget.x));
    }

    return { snappedStart, snappedEnd, guides };
  }

  /**
   * Snaps a position to a regular grid.
   * @param pos - The position to snap
   * @param gridSize - The grid cell size in feet
   */
  snapToGrid(pos: Vector2, gridSize: number): Vector2 {
    // Validate inputs to prevent NaN
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number' || !gridSize || gridSize <= 0) {
      return pos;
    }
    return {
      x: Math.round(pos.x / gridSize) * gridSize,
      y: Math.round(pos.y / gridSize) * gridSize,
    };
  }

  private createVerticalGuide(x: number, y1: number, y2: number): SnapGuide {
    return {
      axis: 'x',
      value: x,
      from: { x, y: Math.min(y1, y2) - 1 },
      to: { x, y: Math.max(y1, y2) + 1 },
    };
  }

  private createHorizontalGuide(y: number, x1: number, x2: number): SnapGuide {
    return {
      axis: 'y',
      value: y,
      from: { x: Math.min(x1, x2) - 1, y },
      to: { x: Math.max(x1, x2) + 1, y },
    };
  }
}

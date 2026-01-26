import type { Vector2, WallSegment, Door } from '../types';
import { distancePointToSegment, vectorSubtract, vectorLength, vectorNormalize } from './math';

/**
 * Gets the direction vector and length of a wall segment.
 * @param wall - The wall segment to analyze
 * @returns Object containing the direction vector, normalized direction, and wall length
 */
export function getWallDirection(wall: WallSegment): {
    direction: Vector2;
    normalized: Vector2;
    length: number;
} {
    const direction = vectorSubtract(wall.end, wall.start);
    const length = vectorLength(direction);
    const normalized = length > 0 ? vectorNormalize(direction) : { x: 0, y: 0 };
    return { direction, normalized, length };
}

/**
 * Gets the start and end positions of a door on its wall.
 * Optionally includes the hinge position based on swing direction.
 */
export function getDoorEndpoints(
    door: Door,
  wall: WallSegment
): { start: Vector2; end: Vector2; hingePos: Vector2 } {
    const { normalized, length } = getWallDirection(wall);
    if (length === 0) {
        return { start: wall.start, end: wall.start, hingePos: wall.start };
    }

    const halfWidth = door.width / 2;

    const start = {
        x: wall.start.x + normalized.x * (door.position - halfWidth),
        y: wall.start.y + normalized.y * (door.position - halfWidth),
    };
    const end = {
        x: wall.start.x + normalized.x * (door.position + halfWidth),
        y: wall.start.y + normalized.y * (door.position + halfWidth),
    };

    // Hinge position depends on swing direction
  const hingePos = door.swingDirection === 'right' ? start : end;

    return { start, end, hingePos };
}

/**
 * Determines if a point lies inside a polygon using the ray casting algorithm.
 * Works for both convex and concave polygons.
 */
export function isPointInPolygon(point: Vector2, vertices: Vector2[]): boolean {
    if (vertices.length < 3) return false;

    let inside = false;
    const n = vertices.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = vertices[i].x;
        const yi = vertices[i].y;
        const xj = vertices[j].x;
        const yj = vertices[j].y;

        if (
            yi > point.y !== yj > point.y &&
            point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
        ) {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * Determines if a point lies inside a room defined by wall segments.
 */
export function isPointInRoom(point: Vector2, walls: WallSegment[]): boolean {
    if (walls.length < 3) return false;
    const vertices = walls.map((w) => w.start);
    return isPointInPolygon(point, vertices);
}

/**
 * Calculates the area of a polygon using the shoelace formula.
 * Returns the absolute area regardless of vertex winding order.
 */
export function calculatePolygonArea(vertices: Vector2[]): number {
    if (vertices.length < 3) return 0;

    let area = 0;
    const n = vertices.length;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }

    return Math.abs(area) / 2;
}

/**
 * Calculates the area of a room defined by wall segments.
 */
export function calculateRoomArea(walls: WallSegment[]): number {
    if (walls.length < 3) return 0;
    const vertices = walls.map((w) => w.start);
    return calculatePolygonArea(vertices);
}

/**
 * Finds the minimum distance from a point to any wall segment.
 */
export function getDistanceToNearestWall(point: Vector2, walls: WallSegment[]): number {
    let minDist = Infinity;

    for (const wall of walls) {
        const dist = distancePointToSegment(point, wall.start, wall.end);
        if (dist < minDist) {
            minDist = dist;
        }
    }

    return minDist;
}

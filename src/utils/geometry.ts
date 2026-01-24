import type { Vector2, WallSegment } from '../types';
import { distancePointToSegment } from './math';

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

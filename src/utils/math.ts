import type { Vector2 } from '../types';

export function vectorAdd(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x + b.x, y: a.y + b.y };
}

export function vectorSubtract(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x - b.x, y: a.y - b.y };
}

export function vectorScale(v: Vector2, scalar: number): Vector2 {
    return { x: v.x * scalar, y: v.y * scalar };
}

export function vectorLength(v: Vector2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vectorNormalize(v: Vector2): Vector2 {
    const len = vectorLength(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}

export function vectorDot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y;
}

export function vectorCross(a: Vector2, b: Vector2): number {
    return a.x * b.y - a.y * b.x;
}

export function vectorPerpendicular(v: Vector2): Vector2 {
    return { x: -v.y, y: v.x };
}

export function distancePointToPoint(a: Vector2, b: Vector2): number {
    return vectorLength(vectorSubtract(b, a));
}

export function angleBetween(a: Vector2, b: Vector2): number {
    const dot = vectorDot(a, b);
    const lenA = vectorLength(a);
    const lenB = vectorLength(b);
    if (lenA === 0 || lenB === 0) return 0;
    const cosAngle = Math.max(-1, Math.min(1, dot / (lenA * lenB)));
    return Math.acos(cosAngle);
}

export function projectPointOntoLine(
  point: Vector2,
  lineStart: Vector2,
  lineDir: Vector2
): Vector2 {
    const toPoint = vectorSubtract(point, lineStart);
    const t = vectorDot(toPoint, lineDir);
    return vectorAdd(lineStart, vectorScale(lineDir, t));
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

export function degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

export function radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
}

export function lineSegmentsIntersect(
  a1: Vector2,
  a2: Vector2,
  b1: Vector2,
  b2: Vector2
): boolean {
    const d1 = vectorSubtract(a2, a1);
    const d2 = vectorSubtract(b2, b1);
    const d3 = vectorSubtract(b1, a1);

    const cross = vectorCross(d1, d2);
    if (Math.abs(cross) < 1e-10) return false;

    const t = vectorCross(d3, d2) / cross;
    const u = vectorCross(d3, d1) / cross;

    return t > 0 && t < 1 && u > 0 && u < 1;
}

export function raySegmentIntersect(
    rayOrigin: Vector2,
    rayDir: Vector2,
    segStart: Vector2,
  segEnd: Vector2
): { t: number; point: Vector2 } | null {
    const segDir = vectorSubtract(segEnd, segStart);
    const cross = vectorCross(rayDir, segDir);

    if (Math.abs(cross) < 1e-10) return null;

    const d = vectorSubtract(segStart, rayOrigin);
    const t = vectorCross(d, segDir) / cross;
    const u = vectorCross(d, rayDir) / cross;

    if (t < 0 || u < 0 || u > 1) return null;

    return {
        t,
        point: vectorAdd(rayOrigin, vectorScale(rayDir, t)),
    };
}

/**
 * Projects a point onto a line segment, clamped to segment bounds.
 * Returns the closest point on the segment to the given point.
 */
export function projectPointOntoSegment(
  point: Vector2,
  segStart: Vector2,
  segEnd: Vector2
): Vector2 {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return { ...segStart };

  const t = clamp(
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq,
    0,
    1
  );

    return {
        x: segStart.x + t * dx,
        y: segStart.y + t * dy,
    };
}

/**
 * Projects a point onto a line segment for vertex insertion.
 * Clamped to 0.1-0.9 to keep distance from endpoints.
 */
export function projectPointOntoSegmentForInsertion(
  point: Vector2,
  segStart: Vector2,
  segEnd: Vector2
): Vector2 {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return { ...segStart };

  const t = clamp(
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq,
    0.1,
    0.9
  );

    return {
        x: segStart.x + t * dx,
        y: segStart.y + t * dy,
    };
}

/**
 * Calculates the distance from a point to a line segment.
 */
export function distancePointToSegment(
  point: Vector2,
  segStart: Vector2,
  segEnd: Vector2
): number {
    const projected = projectPointOntoSegment(point, segStart, segEnd);
    return distancePointToPoint(point, projected);
}

/**
 * Finds the index of a vertex at or near a given position.
 * Returns null if no vertex is within the tolerance.
 */
export function findVertexAtPosition(
  pos: Vector2,
  vertices: Vector2[],
  tolerance: number
): number | null {
    for (let i = 0; i < vertices.length; i++) {
        if (distancePointToPoint(pos, vertices[i]) <= tolerance) {
            return i;
        }
    }
    return null;
}

/**
 * Finds all vertex indices that fall within a rectangular box.
 * @param vertices - Array of vertices to test
 * @param boxStart - One corner of the selection box
 * @param boxEnd - Opposite corner of the selection box
 * @returns Array of indices of vertices within the box
 */
export function findVerticesInBox(
  vertices: Vector2[],
  boxStart: Vector2,
  boxEnd: Vector2
): number[] {
  const minX = Math.min(boxStart.x, boxEnd.x);
  const maxX = Math.max(boxStart.x, boxEnd.x);
  const minY = Math.min(boxStart.y, boxEnd.y);
  const maxY = Math.max(boxStart.y, boxEnd.y);

  const result: number[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    if (v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY) {
      result.push(i);
    }
  }
  return result;
}

/**
 * Finds all light IDs that fall within a rectangular box.
 * @param lights - Array of light fixtures to test
 * @param boxStart - One corner of the selection box
 * @param boxEnd - Opposite corner of the selection box
 * @returns Array of light IDs within the box
 */
export function findLightsInBox(
  lights: Array<{ id: string; position: Vector2 }>,
  boxStart: Vector2,
  boxEnd: Vector2
): string[] {
  const minX = Math.min(boxStart.x, boxEnd.x);
  const maxX = Math.max(boxStart.x, boxEnd.x);
  const minY = Math.min(boxStart.y, boxEnd.y);
  const maxY = Math.max(boxStart.y, boxEnd.y);

  const result: string[] = [];
  for (const light of lights) {
    const pos = light.position;
    if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
      result.push(light.id);
    }
  }
  return result;
}
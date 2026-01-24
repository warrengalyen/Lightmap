import type { Vector2, WallSegment, Door, UnitFormat } from '../types';
import { vectorAdd, vectorScale, vectorSubtract, vectorNormalize, vectorPerpendicular } from '../utils/math';
import { formatImperial } from '../utils/format';

export interface DimensionLabelData {
  position: Vector2;
  text: string;
  angle: number;
}

export interface LabelOptions {
  offset?: number;
  useDecimal?: boolean;
  unitFormat?: UnitFormat;
}

export function getDimensionLabel(
  wall: WallSegment,
  options: LabelOptions = {}
): DimensionLabelData {
  const { offset = 0.5, useDecimal = false, unitFormat = 'feet-inches' } = options;

  const midpoint = vectorScale(vectorAdd(wall.start, wall.end), 0.5);
  const dir = vectorNormalize(vectorSubtract(wall.end, wall.start));
  const perp = vectorPerpendicular(dir);
  const labelPos = vectorAdd(midpoint, vectorScale(perp, offset));

  let angle = Math.atan2(dir.y, dir.x);
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;

  return {
    position: labelPos,
    text: formatImperial(wall.length, { decimal: useDecimal, format: unitFormat }),
    angle,
  };
}

/**
 * Generate dimension labels for a wall segment (start to end points with a given length).
 */
export function getSegmentDimensionLabel(
  start: Vector2,
  end: Vector2,
  length: number,
  options: LabelOptions = {}
): DimensionLabelData {
  const { offset = 0.5, useDecimal = false, unitFormat = 'feet-inches' } = options;

  const midpoint = vectorScale(vectorAdd(start, end), 0.5);
  const dir = vectorNormalize(vectorSubtract(end, start));
  const perp = vectorPerpendicular(dir);
  const labelPos = vectorAdd(midpoint, vectorScale(perp, offset));

  let angle = Math.atan2(dir.y, dir.x);
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;

  return {
    position: labelPos,
    text: formatImperial(length, { decimal: useDecimal, format: unitFormat }),
    angle,
  };
}

/**
 * Get dimension labels for a wall, accounting for doors.
 * If the wall has doors, returns multiple labels (one per visible segment).
 * If no doors, returns a single label for the full wall.
 */
export function getWallDimensionLabels(
  wall: WallSegment,
  doors: Door[],
  options: LabelOptions = {}
): DimensionLabelData[] {
  // Get doors on this wall, sorted by position
  const doorsOnWall = doors
    .filter(d => d.wallId === wall.id)
    .sort((a, b) => a.position - b.position);

  if (doorsOnWall.length === 0) {
    // No doors - return single label for full wall
    return [getDimensionLabel(wall, options)];
  }

  const wallDir = {
    x: wall.end.x - wall.start.x,
    y: wall.end.y - wall.start.y,
  };
  const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.y * wallDir.y);
  if (wallLength === 0) return [];

  const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };

  const labels: DimensionLabelData[] = [];
  let currentStart = 0;

  for (const door of doorsOnWall) {
    const doorStart = door.position - door.width / 2;
    const doorEnd = door.position + door.width / 2;

    // Add label for segment from current position to door start
    if (doorStart > currentStart + 0.1) { // Min segment length to show label
      const segmentStart = {
        x: wall.start.x + normalizedDir.x * currentStart,
        y: wall.start.y + normalizedDir.y * currentStart,
      };
      const segmentEnd = {
        x: wall.start.x + normalizedDir.x * doorStart,
        y: wall.start.y + normalizedDir.y * doorStart,
      };
      labels.push(getSegmentDimensionLabel(
        segmentStart,
        segmentEnd,
        doorStart - currentStart,
        options
      ));
    }

    // Move past the door
    currentStart = doorEnd;
  }

  // Add label for final segment from last door to wall end
  if (wallLength > currentStart + 0.1) {
    const segmentStart = {
      x: wall.start.x + normalizedDir.x * currentStart,
      y: wall.start.y + normalizedDir.y * currentStart,
    };
    labels.push(getSegmentDimensionLabel(
      segmentStart,
      wall.end,
      wallLength - currentStart,
      options
    ));
  }

  return labels;
}

export function getAllDimensionLabels(
  walls: WallSegment[],
  options: LabelOptions = {}
): DimensionLabelData[] {
  return walls.map((wall) => getDimensionLabel(wall, options));
}

/**
 * Get all dimension labels for walls, accounting for doors on each wall.
 */
export function getAllDimensionLabelsWithDoors(
  walls: WallSegment[],
  doors: Door[],
  options: LabelOptions = {}
): DimensionLabelData[] {
  const labels: DimensionLabelData[] = [];
  for (const wall of walls) {
    labels.push(...getWallDimensionLabels(wall, doors, options));
  }
  return labels;
}

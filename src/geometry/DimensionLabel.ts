import type { Vector2, WallSegment, Door, UnitFormat } from '../types';
import { vectorAdd, vectorScale, vectorSubtract, vectorNormalize, vectorPerpendicular } from '../utils/math';
import { formatImperial } from '../utils/format';
import { getWallSegmentsWithDoors } from '../rendering/editorRendering';

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
  const segments = getWallSegmentsWithDoors(wall, doors);

  // Filter out segments too short to label (< 0.1 units)
  return segments
    .filter(seg => seg.length > 0.1)
    .map(seg => getSegmentDimensionLabel(seg.start, seg.end, seg.length, options));
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

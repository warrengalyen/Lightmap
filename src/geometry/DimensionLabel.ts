import type { Vector2, WallSegment, UnitFormat } from "../types";
import { vectorAdd, vectorScale, vectorSubtract, vectorNormalize, vectorPerpendicular } from "../utils/math";
import { formatImperial } from "../utils/format";

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

export function getDimensionLabel(wall: WallSegment, options: LabelOptions = {}): DimensionLabelData {
    const { offset = 0.5, useDecimal = false, unitFormat = "feet-inches" } = options;

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

export function getAllDimensionLabels(walls: WallSegment[], options: LabelOptions = {}): DimensionLabelData[] {
    return walls.map((wall) => getDimensionLabel(wall, options));
}

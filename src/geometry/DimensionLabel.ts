import type { Vector2, WallSegment } from "../types";
import { vectorAdd, vectorScale, vectorSubtract, vectorNormalize, vectorPerpendicular } from "../utils/math";
import { formatImperial } from "../utils/format";

export interface DimensionLabelData {
    position: Vector2;
    text: string;
    angle: number;
}

export function getDimensionLabel(
    wall: WallSegment,
    offset: number = 0.5,
    useDecimal: boolean = false,
): DimensionLabelData {
    const midpoint = vectorScale(vectorAdd(wall.start, wall.end), 0.5);
    const dir = vectorNormalize(vectorSubtract(wall.end, wall.start));
    const perp = vectorPerpendicular(dir);
    const labelPos = vectorAdd(midpoint, vectorScale(perp, offset));

    let angle = Math.atan2(dir.y, dir.x);
    if (angle > Math.PI / 2) angle -= Math.PI;
    if (angle < -Math.PI / 2) angle += Math.PI;

    return {
        position: labelPos,
        text: formatImperial(wall.length, { decimal: useDecimal }),
        angle,
    };
}

export function getAllDimensionLabels(
    walls: WallSegment[],
    offset: number = 0.5,
    useDecimal: boolean = false,
): DimensionLabelData[] {
    return walls.map((wall) => getDimensionLabel(wall, offset, useDecimal));
}

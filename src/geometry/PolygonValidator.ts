import type { Vector2, WallSegment } from "../types";
import { lineSegmentsIntersect, vectorCross, vectorSubtract } from "../utils/math";

export class PolygonValidator {
    isSelfIntersecting(walls: WallSegment[]): boolean {
        if (walls.length < 4) {
            return false;
        }

        for (let i = 0; i < walls.length; i++) {
            for (let j = i + 2; j < walls.length; j++) {
                if (i === 0 && j === walls.length - 1) {
                    continue;
                }

                if (lineSegmentsIntersect(walls[i].start, walls[i].end, walls[j].start, walls[j].end)) {
                    return true;
                }
            }
        }

        return false;
    }

    isValid(walls: WallSegment[]): boolean {
        if (walls.length < 3) {
            return false;
        }

        if (this.isSelfIntersecting(walls)) {
            return false;
        }

        return true;
    }

    isConvex(walls: WallSegment[]): boolean {
        if (walls.length < 3) {
            return false;
        }

        const vertices = walls.map((w) => w.start);
        let sign: number | null = null;

        for (let i = 0; i < vertices.length; i++) {
            const v0 = vertices[i];
            const v1 = vertices[(i + 1) % vertices.length];
            const v2 = vertices[(i + 2) % vertices.length];

            const d1 = vectorSubtract(v1, v0);
            const d2 = vectorSubtract(v2, v1);
            const cross = vectorCross(d1, d2);

            if (Math.abs(cross) > 1e-10) {
                if (sign === null) {
                    sign = cross > 0 ? 1 : -1;
                } else if ((cross > 0 ? 1 : -1) !== sign) {
                    return false;
                }
            }
        }

        return true;
    }

    getArea(walls: WallSegment[]): number {
        if (walls.length < 3) {
            return 0;
        }

        const vertices = walls.map((w) => w.start);
        let area = 0;

        for (let i = 0; i < vertices.length; i++) {
            const j = (i + 1) % vertices.length;
            area += vertices[i].x * vertices[j].y;
            area -= vertices[j].x * vertices[i].y;
        }

        return Math.abs(area) / 2;
    }

    isPointInside(point: Vector2, walls: WallSegment[]): boolean {
        if (walls.length < 3) {
            return false;
        }

        const vertices = walls.map((w) => w.start);
        let inside = false;

        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x;
            const yi = vertices[i].y;
            const xj = vertices[j].x;
            const yj = vertices[j].y;

            if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
                inside = !inside;
            }
        }

        return inside;
    }
}

export interface Vector2 {
    x: number;
    y: number;
}

export interface WallSegment {
    id: string;
    start: Vector2;
    end: Vector2;
    length: number;
}

export interface Polygon {
    vertices: Vector2[];
    walls: WallSegment[];
    isClosed: boolean;
}

export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export type SnapType = "parallel" | "perpendicular" | "closure" | "none";

export interface SnapResult {
    snappedPos: Vector2;
    snapType: SnapType;
}

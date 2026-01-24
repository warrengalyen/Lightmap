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

export type SnapType = 'parallel' | 'perpendicular' | 'closure' | 'none';

export interface SnapResult {
    snappedPos: Vector2;
    snapType: SnapType;
}
export type DoorSwingDirection = 'left' | 'right';
export type DoorSwingSide = 'inside' | 'outside';
export interface Door {
  id: string;
  wallId: string;              // Reference to parent wall
  position: number;            // Distance from wall start (in feet)
  width: number;               // Door width in feet (2.5, 2.67, 3.0, 3.5)
  swingDirection: DoorSwingDirection;  // Which side the hinge is on (left/right)
  swingSide: DoorSwingSide;            // Which side of wall door swings to (inside/outside)
}

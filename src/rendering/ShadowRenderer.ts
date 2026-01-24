import * as THREE from 'three';
import type { Vector2, WallSegment, LightFixture, BoundingBox, Door } from '../types';
import { raySegmentIntersect } from '../utils/math';
import { disposeMeshArray } from '../utils/three';

/**
 * Converts a door to a wall segment for shadow casting.
 */
function getDoorSegment(door: Door, wall: WallSegment): { start: Vector2; end: Vector2 } {
  const wallDir = {
    x: wall.end.x - wall.start.x,
    y: wall.end.y - wall.start.y,
  };
  const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.y * wallDir.y);
  if (wallLength === 0) {
    return { start: wall.start, end: wall.start };
  }

  const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };
  const halfWidth = door.width / 2;

  // Door endpoints on the wall
  const doorStart = {
    x: wall.start.x + normalizedDir.x * (door.position - halfWidth),
    y: wall.start.y + normalizedDir.y * (door.position - halfWidth),
  };
  const doorEnd = {
    x: wall.start.x + normalizedDir.x * (door.position + halfWidth),
    y: wall.start.y + normalizedDir.y * (door.position + halfWidth),
  };

  return { start: doorStart, end: doorEnd };
}

export class ShadowRenderer {
  private scene: THREE.Scene;
  private shadowMeshes: THREE.Mesh[] = [];
  private isVisible: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  computeVisibilityPolygon(lightPos: Vector2, walls: WallSegment[], bounds: BoundingBox, doors: Door[] = []): Vector2[] {
    const rays: { angle: number; point: Vector2 }[] = [];

    const boundaryPoints: Vector2[] = [
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY },
    ];

    const allPoints = [...boundaryPoints];
    for (const wall of walls) {
      allPoints.push(wall.start);
      allPoints.push(wall.end);
    }

    // Add door segment endpoints
    const doorSegments: { start: Vector2; end: Vector2 }[] = [];
    for (const door of doors) {
      const wall = walls.find(w => w.id === door.wallId);
      if (wall) {
        const segment = getDoorSegment(door, wall);
        doorSegments.push(segment);
        allPoints.push(segment.start);
        allPoints.push(segment.end);
      }
    }

    const boundaryWalls: WallSegment[] = [
      { id: 'b1', start: boundaryPoints[0], end: boundaryPoints[1], length: 0 },
      { id: 'b2', start: boundaryPoints[1], end: boundaryPoints[2], length: 0 },
      { id: 'b3', start: boundaryPoints[2], end: boundaryPoints[3], length: 0 },
      { id: 'b4', start: boundaryPoints[3], end: boundaryPoints[0], length: 0 },
    ];

    // Convert door segments to wall-like segments for ray casting
    const doorWalls: WallSegment[] = doorSegments.map((seg, i) => ({
      id: `door-${i}`,
      start: seg.start,
      end: seg.end,
      length: 0,
    }));

    const allWalls = [...walls, ...doorWalls, ...boundaryWalls];

    for (const point of allPoints) {
      const baseAngle = Math.atan2(point.y - lightPos.y, point.x - lightPos.x);

      for (const offset of [-0.0001, 0, 0.0001]) {
        const angle = baseAngle + offset;
        const dir = { x: Math.cos(angle), y: Math.sin(angle) };

        let closestT = Infinity;
        let closestPoint: Vector2 | null = null;

        for (const wall of allWalls) {
          const result = raySegmentIntersect(lightPos, dir, wall.start, wall.end);
          if (result && result.t > 0.001 && result.t < closestT) {
            closestT = result.t;
            closestPoint = result.point;
          }
        }

        if (closestPoint) {
          rays.push({ angle, point: closestPoint });
        }
      }
    }

    rays.sort((a, b) => a.angle - b.angle);

    const polygon: Vector2[] = [];
    for (const ray of rays) {
      if (polygon.length === 0 ||
          Math.abs(polygon[polygon.length - 1].x - ray.point.x) > 0.001 ||
          Math.abs(polygon[polygon.length - 1].y - ray.point.y) > 0.001) {
        polygon.push(ray.point);
      }
    }

    return polygon;
  }

  updateShadows(lights: LightFixture[], walls: WallSegment[], bounds: BoundingBox, doors: Door[] = []): void {
    disposeMeshArray(this.shadowMeshes, this.scene);

    const darkGeometry = new THREE.PlaneGeometry(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY
    );
    const darkMaterial = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.8,
    });
    const darkMesh = new THREE.Mesh(darkGeometry, darkMaterial);
    darkMesh.position.set(
      (bounds.minX + bounds.maxX) / 2,
      (bounds.minY + bounds.maxY) / 2,
      -0.04
    );
    darkMesh.visible = this.isVisible;
    this.scene.add(darkMesh);
    this.shadowMeshes.push(darkMesh);

    for (const light of lights) {
      const polygon = this.computeVisibilityPolygon(light.position, walls, bounds, doors);

      if (polygon.length >= 3) {
        const shape = new THREE.Shape();
        shape.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) {
          shape.lineTo(polygon[i].x, polygon[i].y);
        }
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffee,
          transparent: true,
          opacity: 0.6,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = -0.03;
        mesh.visible = this.isVisible;
        this.scene.add(mesh);
        this.shadowMeshes.push(mesh);
      }
    }
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    for (const mesh of this.shadowMeshes) {
      mesh.visible = visible;
    }
  }

  dispose(): void {
    disposeMeshArray(this.shadowMeshes, this.scene);
  }
}

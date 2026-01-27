import * as THREE from 'three';
import type { Vector2, WallSegment, LightFixture, BoundingBox, Door, Obstacle } from '../types';
import { raySegmentIntersect } from '../utils/math';
import { disposeMeshArray } from '../utils/three';
import { getDoorEndpoints } from '../utils/geometry';

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
        const segment = getDoorEndpoints(door, wall);
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

  updateShadows(lights: LightFixture[], walls: WallSegment[], bounds: BoundingBox, doors: Door[] = [], obstacles: Obstacle[] = [], ceilingHeight: number = 8): void {
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

    // Collect full-height obstacle walls (they block light like room walls)
    const fullHeightObstacleWalls: WallSegment[] = [];
    const partialHeightObstacles: Obstacle[] = [];

    for (const obstacle of obstacles) {
      if (obstacle.height >= ceilingHeight) {
        fullHeightObstacleWalls.push(...obstacle.walls);
      } else {
        partialHeightObstacles.push(obstacle);
      }
    }

    // Combine room walls with full-height obstacle walls for visibility computation
    const allBlockingWalls = [...walls, ...fullHeightObstacleWalls];

    for (const light of lights) {
      const polygon = this.computeVisibilityPolygon(light.position, allBlockingWalls, bounds, doors);

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

      // Render partial-height obstacle shadows
      for (const obstacle of partialHeightObstacles) {
        this.renderPartialShadow(light, obstacle, ceilingHeight);
      }
    }
  }

  /**
   * Renders a shadow trapezoid for a partial-height obstacle.
   * Shadow extends D = h * d / (H - h) feet beyond each obstacle edge.
   */
  private renderPartialShadow(light: LightFixture, obstacle: Obstacle, ceilingHeight: number): void {
    const h = obstacle.height;
    const H = ceilingHeight;
    if (h >= H || h <= 0) return;

    const lightPos = light.position;

    for (const wall of obstacle.walls) {
      // Determine if this wall edge faces away from the light (back-face)
      const wallMidX = (wall.start.x + wall.end.x) / 2;
      const wallMidY = (wall.start.y + wall.end.y) / 2;
      const wallDirX = wall.end.x - wall.start.x;
      const wallDirY = wall.end.y - wall.start.y;
      // Normal pointing "outward" (left of wall direction)
      const normalX = -wallDirY;
      const normalY = wallDirX;
      // Dot product of normal with light-to-wall vector
      const toLightX = lightPos.x - wallMidX;
      const toLightY = lightPos.y - wallMidY;
      const dot = normalX * toLightX + normalY * toLightY;

      // Only cast shadow from edges facing away from the light
      if (dot >= 0) continue;

      // Compute shadow extension for each endpoint
      const shadowPoints: Vector2[] = [];

      // Start with the wall edge (near side of trapezoid)
      shadowPoints.push(wall.end);
      shadowPoints.push(wall.start);

      // Compute extended shadow points
      for (const endpoint of [wall.start, wall.end]) {
        const dx = endpoint.x - lightPos.x;
        const dy = endpoint.y - lightPos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.001) continue;

        // Shadow extension distance: D = h * d / (H - h)
        const D = (h * d) / (H - h);
        const dirX = dx / d;
        const dirY = dy / d;

        shadowPoints.push({
          x: endpoint.x + dirX * D,
          y: endpoint.y + dirY * D,
        });
      }

      if (shadowPoints.length >= 3) {
        const shape = new THREE.Shape();
        shape.moveTo(shadowPoints[0].x, shadowPoints[0].y);
        for (let i = 1; i < shadowPoints.length; i++) {
          shape.lineTo(shadowPoints[i].x, shadowPoints[i].y);
        }
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);
        const opacity = 0.4 * (h / H); // Proportional to height ratio
        const material = new THREE.MeshBasicMaterial({
          color: 0x111111,
          transparent: true,
          opacity: Math.min(opacity, 0.5),
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = -0.035; // Between dark background and visibility cutout
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

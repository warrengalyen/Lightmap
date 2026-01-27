import * as THREE from 'three';
import type { Obstacle, UnitFormat } from '../types';
import { clearGroup, disposeObject3D } from '../utils/three';
import { Z_LAYERS, GEOMETRY } from '../constants/rendering';
import { calculatePolygonArea } from '../utils/geometry';
import { VERTEX_RADIUS_SELECTED, VERTEX_RADIUS_DEFAULT } from '../constants/editor';
import { getSegmentDimensionLabel } from '../geometry/DimensionLabel';
import { createDimensionLabel } from './editorRendering';

const OBSTACLE_COLOR = 0xd97706;          // Amber
const OBSTACLE_SELECTED_COLOR = 0xf59e0b; // Brighter amber
const OBSTACLE_VERTEX_COLOR = 0xd97706;
const OBSTACLE_VERTEX_SELECTED_COLOR = 0xfbbf24;
const OBSTACLE_FILL_OPACITY = 0.15;
const OBSTACLE_FILL_SELECTED_OPACITY = 0.25;
const OBSTACLE_LINE_WIDTH = 2;
const OBSTACLE_SELECTED_LINE_WIDTH = 3;

/**
 * Handles rendering of obstacle polygons with fill, walls, and height labels.
 */
export class ObstacleRenderer {
  private obstaclesGroup: THREE.Group;
  private labelsGroup: THREE.Group;
  private vertexMeshes: THREE.Mesh[] = [];
  private currentUnitFormat: UnitFormat = 'feet-inches';

  constructor(parentScene: THREE.Scene) {
    this.obstaclesGroup = new THREE.Group();
    this.labelsGroup = new THREE.Group();
    parentScene.add(this.obstaclesGroup);
    parentScene.add(this.labelsGroup);
  }

  update(
    obstacles: Obstacle[],
    selectedObstacleId: string | null,
    selectedObstacleVertexIndices: Set<number> = new Set()
  ): void {
    clearGroup(this.obstaclesGroup);
    clearGroup(this.labelsGroup);
    this.disposeVertexMeshes();

    for (const obstacle of obstacles) {
      const isSelected = obstacle.id === selectedObstacleId;
      this.renderObstacle(obstacle, isSelected);

      // Render vertex circles for the selected obstacle
      if (isSelected) {
        this.renderVertices(obstacle, selectedObstacleVertexIndices);
      }
    }
  }

  private renderObstacle(obstacle: Obstacle, isSelected: boolean): void {
    if (obstacle.walls.length < 3) return;

    const vertices = obstacle.walls.map(w => w.start);
    const color = isSelected ? OBSTACLE_SELECTED_COLOR : OBSTACLE_COLOR;

    // Render filled polygon
    this.renderFill(vertices, color, isSelected);

    // Render wall outlines
    this.renderWalls(obstacle, color, isSelected);

    // Render dimension labels on each wall (when selected)
    if (isSelected) {
      this.renderDimensionLabels(obstacle);
    }

    // Render height label at centroid
    this.renderLabel(vertices, obstacle.height, obstacle.label);
  }

  private renderFill(vertices: { x: number; y: number }[], color: number, isSelected: boolean): void {
    if (vertices.length < 3) return;

    const shape = new THREE.Shape();
    shape.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      shape.lineTo(vertices[i].x, vertices[i].y);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: isSelected ? OBSTACLE_FILL_SELECTED_OPACITY : OBSTACLE_FILL_OPACITY,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = Z_LAYERS.OBSTACLE_FILL;
    this.obstaclesGroup.add(mesh);
  }

  private renderWalls(obstacle: Obstacle, color: number, isSelected: boolean): void {
    for (const wall of obstacle.walls) {
      const points = [
        new THREE.Vector3(wall.start.x, wall.start.y, Z_LAYERS.OBSTACLE_WALL),
        new THREE.Vector3(wall.end.x, wall.end.y, Z_LAYERS.OBSTACLE_WALL),
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color,
        linewidth: isSelected ? OBSTACLE_SELECTED_LINE_WIDTH : OBSTACLE_LINE_WIDTH,
      });

      const line = new THREE.Line(geometry, material);
      this.obstaclesGroup.add(line);
    }
  }

  private renderLabel(vertices: { x: number; y: number }[], height: number, label?: string): void {
    // Calculate centroid
    let cx = 0;
    let cy = 0;
    for (const v of vertices) {
      cx += v.x;
      cy += v.y;
    }
    cx /= vertices.length;
    cy /= vertices.length;

    // Skip label if obstacle is too small
    const area = calculatePolygonArea(vertices);
    if (area < 1) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 128;
    canvas.height = label ? 64 : 32;

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#d97706';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (label) {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(label, canvas.width / 2, canvas.height / 3);
      ctx.font = '14px sans-serif';
      ctx.fillText(`${height}ft`, canvas.width / 2, (canvas.height * 2) / 3);
    } else {
      ctx.fillText(`${height}ft`, canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(cx, cy, Z_LAYERS.OBSTACLE_LABEL);
    const scale = label ? 1.0 : 0.5;
    sprite.scale.set(scale * 2, scale, 1);
    this.obstaclesGroup.add(sprite);
  }

  private renderDimensionLabels(obstacle: Obstacle): void {
    for (const wall of obstacle.walls) {
      if (wall.length < 0.1) continue;

      const labelData = getSegmentDimensionLabel(
        wall.start,
        wall.end,
        wall.length,
        { offset: 0.35, unitFormat: this.currentUnitFormat }
      );

      const sprite = createDimensionLabel(labelData.text);
      sprite.position.set(labelData.position.x, labelData.position.y, Z_LAYERS.DIMENSION_LABEL);
      this.labelsGroup.add(sprite);
    }
  }

  private renderVertices(obstacle: Obstacle, selectedVertexIndices: Set<number>): void {
    for (let i = 0; i < obstacle.walls.length; i++) {
      const vertex = obstacle.walls[i].start;
      const isSelected = selectedVertexIndices.has(i);

      const geometry = new THREE.CircleGeometry(
        isSelected ? VERTEX_RADIUS_SELECTED : VERTEX_RADIUS_DEFAULT,
        GEOMETRY.CIRCLE_SEGMENTS
      );
      const material = new THREE.MeshBasicMaterial({
        color: isSelected ? OBSTACLE_VERTEX_SELECTED_COLOR : OBSTACLE_VERTEX_COLOR,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(vertex.x, vertex.y, Z_LAYERS.VERTEX);
      mesh.userData.obstacleId = obstacle.id;
      mesh.userData.vertexIndex = i;
      this.obstaclesGroup.add(mesh);
      this.vertexMeshes.push(mesh);
    }
  }

  private disposeVertexMeshes(): void {
    for (const mesh of this.vertexMeshes) {
      disposeObject3D(mesh);
    }
    this.vertexMeshes = [];
  }

  setUnitFormat(format: UnitFormat): void {
    this.currentUnitFormat = format;
  }

  setVisible(visible: boolean): void {
    this.obstaclesGroup.visible = visible;
    this.labelsGroup.visible = visible;
  }

  dispose(): void {
    this.disposeVertexMeshes();
    clearGroup(this.obstaclesGroup);
    clearGroup(this.labelsGroup);
  }
}

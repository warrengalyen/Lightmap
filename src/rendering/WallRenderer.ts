import * as THREE from 'three';
import type { WallSegment, Door, UnitFormat } from '../types';
import { clearGroup, disposeObject3D } from '../utils/three';
import { Z_LAYERS } from '../constants/rendering';
import { getAllDimensionLabelsWithDoors } from '../geometry/DimensionLabel';
import {
  createWallLinesWithDoors,
  createVertexCircle,
  createDimensionLabel,
} from './editorRendering';

/**
 * Handles rendering of walls, vertices, and dimension labels.
 */
export class WallRenderer {
  private wallsGroup: THREE.Group;
  private labelsGroup: THREE.Group;
  private vertexMeshes: THREE.Mesh[] = [];
  private currentUnitFormat: UnitFormat = 'feet-inches';
  private currentWalls: WallSegment[] = [];
  private currentDoors: Door[] = [];

  constructor(parentScene: THREE.Scene) {
    this.wallsGroup = new THREE.Group();
    this.labelsGroup = new THREE.Group();
    parentScene.add(this.wallsGroup);
    parentScene.add(this.labelsGroup);
  }

  /**
   * Update walls, vertices, and labels.
   */
  update(
    walls: WallSegment[],
    selectedWallId: string | null,
    selectedVertexIndices: Set<number>,
    doors: Door[]
  ): void {
    clearGroup(this.wallsGroup);
    this.disposeVertexMeshes();

    const vertexList = this.buildVertexList(walls);

    this.currentWalls = walls;
    this.currentDoors = doors;
    this.renderWallLines(walls, selectedWallId, doors);
    this.renderVertices(vertexList, selectedVertexIndices);
    this.updateLabels();
  }

  private buildVertexList(walls: WallSegment[]): Array<{ x: number; y: number; index: number }> {
    return walls.map((wall, index) => ({
      x: wall.start.x,
      y: wall.start.y,
      index,
    }));
  }

  private renderWallLines(walls: WallSegment[], selectedWallId: string | null, doors: Door[]): void {
    for (const wall of walls) {
      const isSelected = wall.id === selectedWallId;
      const lines = createWallLinesWithDoors(wall, doors, isSelected);
      for (const line of lines) {
        this.wallsGroup.add(line);
      }
    }
  }

  private renderVertices(
    vertexList: Array<{ x: number; y: number; index: number }>,
    selectedVertexIndices: Set<number>
  ): void {
    for (const vertex of vertexList) {
      const isSelected = selectedVertexIndices.has(vertex.index);
      const mesh = createVertexCircle(
        { x: vertex.x, y: vertex.y },
        vertex.index,
        isSelected
      );
      this.wallsGroup.add(mesh);
      this.vertexMeshes.push(mesh);
    }
  }

  private disposeVertexMeshes(): void {
    for (const mesh of this.vertexMeshes) {
      disposeObject3D(mesh);
    }
    this.vertexMeshes = [];
  }

  private updateLabels(): void {
    clearGroup(this.labelsGroup);

    const labels = getAllDimensionLabelsWithDoors(this.currentWalls, this.currentDoors, {
      offset: 0.5,
      unitFormat: this.currentUnitFormat,
    });

    for (const label of labels) {
      const sprite = createDimensionLabel(label.text);
      sprite.position.set(label.position.x, label.position.y, Z_LAYERS.DIMENSION_LABEL);
      this.labelsGroup.add(sprite);
    }
  }

  setUnitFormat(format: UnitFormat): void {
    if (this.currentUnitFormat !== format) {
      this.currentUnitFormat = format;
      this.updateLabels();
    }
  }

  setVisible(visible: boolean): void {
    this.wallsGroup.visible = visible;
    this.labelsGroup.visible = visible;
  }

  dispose(): void {
    this.disposeVertexMeshes();
    clearGroup(this.wallsGroup);
    clearGroup(this.labelsGroup);
  }
}

import * as THREE from 'three';
import type { Vector2, WallSegment, LightFixture, UnitFormat, LightRadiusVisibility, Door, Obstacle } from '../types';
import type { SnapGuide } from '../controllers/SnapController';
import { distancePointToSegment } from '../utils/math';
import { WALL_HIT_TOLERANCE_FT } from '../constants/editor';
import { WallRenderer } from './WallRenderer';
import { DoorRenderer } from './DoorRenderer';
import { LightRenderer } from './LightRenderer';
import { ObstacleRenderer } from './ObstacleRenderer';
import { DrawingPreviewRenderer } from './DrawingPreviewRenderer';
import { OverlayRenderer } from './OverlayRenderer';
import { MeasurementRenderer } from './MeasurementRenderer';

/**
 * Handles rendering of the 2D editor view including walls, vertices,
 * lights, snap guides, and measurement tools.
 *
 * This is a facade that delegates to specialized sub-renderers.
 */
export class EditorRenderer {
  private wallRenderer: WallRenderer;
  private doorRenderer: DoorRenderer;
  private lightRenderer: LightRenderer;
  private obstacleRenderer: ObstacleRenderer;
  private drawingPreviewRenderer: DrawingPreviewRenderer;
  private overlayRenderer: OverlayRenderer;
  private measurementRenderer: MeasurementRenderer;

  constructor(scene: THREE.Scene) {
    this.wallRenderer = new WallRenderer(scene);
    this.doorRenderer = new DoorRenderer(scene);
    this.lightRenderer = new LightRenderer(scene);
    this.obstacleRenderer = new ObstacleRenderer(scene);
    this.drawingPreviewRenderer = new DrawingPreviewRenderer(scene);
    this.overlayRenderer = new OverlayRenderer(scene);
    this.measurementRenderer = new MeasurementRenderer(scene);
  }

  // ============================================
  // Wall Rendering
  // ============================================

  updateWalls(
    walls: WallSegment[],
    selectedWallId: string | null = null,
    selectedVertexIndices: Set<number> | number | null = null,
    doors: Door[] = []
  ): void {
    // Convert single index to Set for backwards compatibility
    let selectedSet: Set<number>;
    if (selectedVertexIndices === null) {
      selectedSet = new Set();
    } else if (typeof selectedVertexIndices === 'number') {
      selectedSet = new Set([selectedVertexIndices]);
    } else {
      selectedSet = selectedVertexIndices;
    }

    this.wallRenderer.update(walls, selectedWallId, selectedSet, doors);
  }

  // ============================================
  // Wall Hit Testing
  // ============================================

  getWallAtPosition(pos: Vector2, walls: WallSegment[], tolerance: number = WALL_HIT_TOLERANCE_FT): WallSegment | null {
    for (const wall of walls) {
      const dist = distancePointToSegment(pos, wall.start, wall.end);
      if (dist <= tolerance) {
        return wall;
      }
    }
    return null;
  }

  // ============================================
  // Unit Format
  // ============================================

  setUnitFormat(format: UnitFormat): void {
    this.wallRenderer.setUnitFormat(format);
    this.obstacleRenderer.setUnitFormat(format);
    this.measurementRenderer.setUnitFormat(format);
  }

  // ============================================
  // Drawing Preview (Phantom Line, Preview Vertex)
  // ============================================

  setPhantomLine(start: Vector2 | null, end: Vector2 | null): void {
    this.drawingPreviewRenderer.setPhantomLine(start, end);
  }

  setPreviewVertex(pos: Vector2 | null): void {
    this.drawingPreviewRenderer.setPreviewVertex(pos);
  }

  updateDrawingVertices(vertices: Vector2[]): void {
    this.drawingPreviewRenderer.updateDrawingVertices(vertices);
  }

  // ============================================
  // Light Preview
  // ============================================

  setPreviewLight(pos: Vector2 | null, isValid: boolean = true): void {
    this.lightRenderer.setPreview(pos, isValid);
  }

  // ============================================
  // Lights
  // ============================================

  updateLights(lights: LightFixture[], ceilingHeight: number, selectedIds: Set<string>): void {
    this.lightRenderer.update(lights, ceilingHeight, selectedIds);
  }

  setLightsVisible(visible: boolean): void {
    this.lightRenderer.setVisible(visible);
  }

  setLightRadiusVisibility(visibility: LightRadiusVisibility): void {
    this.lightRenderer.setRadiusVisibility(visibility);
  }

  // ============================================
  // Doors
  // ============================================

  updateDoors(doors: Door[], walls: WallSegment[], selectedDoorId: string | null): void {
    this.doorRenderer.update(doors, walls, selectedDoorId);
  }

  setDoorPreview(door: Door | null, wall: WallSegment | null, canPlace: boolean = true): void {
    this.doorRenderer.setPreview(door, wall, canPlace);
  }

  clearDoorPreview(): void {
    this.doorRenderer.clearPreview();
  }

  // ============================================
  // Obstacles
  // ============================================

  updateObstacles(
    obstacles: Obstacle[],
    selectedObstacleId: string | null,
    selectedObstacleVertexIndices: Set<number> = new Set()
  ): void {
    this.obstacleRenderer.update(obstacles, selectedObstacleId, selectedObstacleVertexIndices);
  }

  // ============================================
  // Snap Guides
  // ============================================

  setSnapGuides(guides: SnapGuide[]): void {
    this.overlayRenderer.setSnapGuides(guides);
  }

  // ============================================
  // Selection Box
  // ============================================

  setSelectionBox(start: Vector2 | null, end: Vector2 | null): void {
    this.overlayRenderer.setSelectionBox(start, end);
  }

  // ============================================
  // Measurement
  // ============================================

  setMeasurementLine(from: Vector2 | null, to: Vector2 | null): void {
    this.measurementRenderer.render(from, to);
  }

  // ============================================
  // Visibility
  // ============================================

  setVisible(visible: boolean): void {
    this.wallRenderer.setVisible(visible);
    this.doorRenderer.setVisible(visible);
    this.lightRenderer.setVisible(visible);
    this.obstacleRenderer.setVisible(visible);
    this.drawingPreviewRenderer.setVisible(visible);
    this.overlayRenderer.setVisible(visible);
    this.measurementRenderer.setVisible(visible);
  }

  dispose(): void {
    this.wallRenderer.dispose();
    this.doorRenderer.dispose();
    this.lightRenderer.dispose();
    this.obstacleRenderer.dispose();
    this.drawingPreviewRenderer.dispose();
    this.overlayRenderer.dispose();
    this.measurementRenderer.dispose();
  }
}

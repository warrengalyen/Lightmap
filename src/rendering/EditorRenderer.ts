import * as THREE from 'three';
import type { Vector2, WallSegment, LightFixture, UnitFormat, LightRadiusVisibility, Door } from '../types';
import type { SnapGuide } from '../controllers/SnapController';
import { LightIcon } from '../lighting/LightIcon';
import { getAllDimensionLabelsWithDoors } from '../geometry/DimensionLabel';
import { MeasurementRenderer } from './MeasurementRenderer';
import { distancePointToSegment } from '../utils/math';
import { clearGroup, disposeObject3D } from '../utils/three';
import { WALL_HIT_TOLERANCE_FT } from '../constants/editor';
import {
  createWallLinesWithDoors,
  createVertexCircle,
  createPhantomLine,
  createDrawingVertex,
  createDrawingLine,
  createSnapGuideLine,
  createSelectionBox,
  createDimensionLabel,
  createDoorGraphics,
} from './editorRendering';

/**
 * Handles rendering of the 2D editor view including walls, vertices,
 * lights, snap guides, and measurement tools.
 */
export class EditorRenderer {
  private scene: THREE.Scene;
  private wallsGroup: THREE.Group;
  private labelsGroup: THREE.Group;
  private lightsGroup: THREE.Group;
  private doorsGroup: THREE.Group;
  private doorPreviewGroup: THREE.Group;
  private phantomLine: THREE.Line | null = null;
  private drawingVerticesGroup: THREE.Group;
  private snapGuidesGroup: THREE.Group;
  private selectionBoxGroup: THREE.Group;
  private measurementRenderer: MeasurementRenderer;
  private lightIcons: Map<string, LightIcon> = new Map();
  private vertexMeshes: THREE.Mesh[] = [];
  private currentUnitFormat: UnitFormat = 'feet-inches';
  private currentWalls: WallSegment[] = [];
  private currentDoors: Door[] = [];
  private selectionBoxLine: THREE.Line | null = null;
  private lightRadiusVisibility: LightRadiusVisibility = 'selected';

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.wallsGroup = new THREE.Group();
    this.labelsGroup = new THREE.Group();
    this.lightsGroup = new THREE.Group();
    this.doorsGroup = new THREE.Group();
    this.doorPreviewGroup = new THREE.Group();
    this.drawingVerticesGroup = new THREE.Group();
    this.snapGuidesGroup = new THREE.Group();
    this.selectionBoxGroup = new THREE.Group();
    this.measurementRenderer = new MeasurementRenderer(scene);

    this.scene.add(this.wallsGroup);
    this.scene.add(this.labelsGroup);
    this.scene.add(this.lightsGroup);
    this.scene.add(this.doorsGroup);
    this.scene.add(this.doorPreviewGroup);
    this.scene.add(this.drawingVerticesGroup);
    this.scene.add(this.snapGuidesGroup);
    this.scene.add(this.selectionBoxGroup);
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
    clearGroup(this.wallsGroup);
    this.disposeVertexMeshes();

    const vertexList = this.buildVertexList(walls);

    // Convert single index to Set for backwards compatibility
    let selectedSet: Set<number>;
    if (selectedVertexIndices === null) {
      selectedSet = new Set();
    } else if (typeof selectedVertexIndices === 'number') {
      selectedSet = new Set([selectedVertexIndices]);
    } else {
      selectedSet = selectedVertexIndices;
    }

    this.currentDoors = doors;
    this.renderWallLines(walls, selectedWallId, doors);
    this.renderVertices(vertexList, selectedSet);
    this.updateLabels(walls, doors);
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
      // Create wall lines with gaps for doors
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
  // Labels
  // ============================================

  private updateLabels(walls: WallSegment[], doors: Door[] = []): void {
    this.currentWalls = walls;
    this.currentDoors = doors;
    clearGroup(this.labelsGroup);

    const labels = getAllDimensionLabelsWithDoors(walls, doors, {
      offset: 0.5,
      unitFormat: this.currentUnitFormat,
    });

    for (const label of labels) {
      const sprite = createDimensionLabel(label.text);
      sprite.position.set(label.position.x, label.position.y, 0.2);
      this.labelsGroup.add(sprite);
    }
  }

  setUnitFormat(format: UnitFormat): void {
    if (this.currentUnitFormat !== format) {
      this.currentUnitFormat = format;
      this.updateLabels(this.currentWalls, this.currentDoors);
      this.measurementRenderer.setUnitFormat(format);
    }
  }

  // ============================================
  // Phantom Line (Drawing Preview)
  // ============================================

  setPhantomLine(start: Vector2 | null, end: Vector2 | null): void {
    if (this.phantomLine) {
      this.scene.remove(this.phantomLine);
      disposeObject3D(this.phantomLine);
      this.phantomLine = null;
    }

    if (start && end) {
      this.phantomLine = createPhantomLine(start, end);
      this.scene.add(this.phantomLine);
    }
  }

  // ============================================
  // Drawing Vertices (During Wall Creation)
  // ============================================

  updateDrawingVertices(vertices: Vector2[]): void {
    clearGroup(this.drawingVerticesGroup);

    if (vertices.length === 0) return;

    this.renderDrawingVertexMarkers(vertices);

    if (vertices.length >= 2) {
      this.renderDrawingVertexLines(vertices);
    }
  }

  private renderDrawingVertexMarkers(vertices: Vector2[]): void {
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      const isStart = i === 0;
      const mesh = createDrawingVertex(v, isStart);
      this.drawingVerticesGroup.add(mesh);
    }
  }

  private renderDrawingVertexLines(vertices: Vector2[]): void {
    for (let i = 0; i < vertices.length - 1; i++) {
      const line = createDrawingLine(vertices[i], vertices[i + 1]);
      this.drawingVerticesGroup.add(line);
    }
  }

  // ============================================
  // Lights
  // ============================================

  updateLights(lights: LightFixture[], ceilingHeight: number, selectedIds: Set<string>): void {
    const currentIds = new Set(lights.map((l) => l.id));

    // Remove lights that no longer exist
    for (const [id, icon] of this.lightIcons) {
      if (!currentIds.has(id)) {
        this.lightsGroup.remove(icon.mesh);
        icon.dispose();
        this.lightIcons.delete(id);
      }
    }

    // Add or update lights
    for (const light of lights) {
      let icon = this.lightIcons.get(light.id);

      if (!icon) {
        icon = new LightIcon(light, ceilingHeight);
        this.lightIcons.set(light.id, icon);
        this.lightsGroup.add(icon.mesh);
      } else {
        icon.updateProperties(light, ceilingHeight);
      }

      icon.setSelected(selectedIds.has(light.id));
      icon.setRadiusVisibility(this.lightRadiusVisibility);
    }
  }

  setLightsVisible(visible: boolean): void {
    this.lightsGroup.visible = visible;
  }

  setLightRadiusVisibility(visibility: LightRadiusVisibility): void {
    this.lightRadiusVisibility = visibility;
    for (const icon of this.lightIcons.values()) {
      icon.setRadiusVisibility(visibility);
    }
  }

  // ============================================
  // Doors
  // ============================================

  updateDoors(doors: Door[], walls: WallSegment[], selectedDoorId: string | null): void {
    clearGroup(this.doorsGroup);

    for (const door of doors) {
      const wall = walls.find(w => w.id === door.wallId);
      if (!wall) continue;

      const isSelected = door.id === selectedDoorId;
      const graphics = createDoorGraphics(door, wall, isSelected);
      for (const obj of graphics) {
        this.doorsGroup.add(obj);
      }
    }
  }

  /**
   * Show a preview of a door being placed.
   * @param door The door to preview
   * @param wall The wall the door is on
   * @param canPlace Whether the door can be placed at this position (false = show in red)
   */
  setDoorPreview(door: Door | null, wall: WallSegment | null, canPlace: boolean = true): void {
    clearGroup(this.doorPreviewGroup);

    if (!door || !wall) return;

    // Create semi-transparent preview graphics
    const graphics = createDoorGraphics(door, wall, false);
    const invalidColor = 0xff4444; // Red color for invalid placement

    for (const obj of graphics) {
      // Make preview semi-transparent and red if can't place
      if (obj instanceof THREE.Line) {
        const material = obj.material as THREE.LineBasicMaterial | THREE.LineDashedMaterial;
        material.opacity = 0.6;
        material.transparent = true;
        if (!canPlace) {
          material.color.setHex(invalidColor);
        }
      } else if (obj instanceof THREE.Mesh) {
        const material = obj.material as THREE.MeshBasicMaterial;
        material.opacity = 0.6;
        material.transparent = true;
        if (!canPlace) {
          material.color.setHex(invalidColor);
        }
      }
      this.doorPreviewGroup.add(obj);
    }
  }

  /**
   * Clear the door preview.
   */
  clearDoorPreview(): void {
    clearGroup(this.doorPreviewGroup);
  }

  // ============================================
  // Snap Guides
  // ============================================

  setSnapGuides(guides: SnapGuide[]): void {
    clearGroup(this.snapGuidesGroup);

    for (const guide of guides) {
      const line = createSnapGuideLine(guide);
      this.snapGuidesGroup.add(line);
    }
  }

  // ============================================
  // Selection Box
  // ============================================

  setSelectionBox(start: Vector2 | null, end: Vector2 | null): void {
    if (this.selectionBoxLine) {
      this.selectionBoxGroup.remove(this.selectionBoxLine);
      disposeObject3D(this.selectionBoxLine);
      this.selectionBoxLine = null;
    }

    if (start && end) {
      this.selectionBoxLine = createSelectionBox(start, end);
      this.selectionBoxGroup.add(this.selectionBoxLine);
    }
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
    this.wallsGroup.visible = visible;
    this.labelsGroup.visible = visible;
    this.lightsGroup.visible = visible;
    this.doorsGroup.visible = visible;
    this.drawingVerticesGroup.visible = visible;
    this.snapGuidesGroup.visible = visible;
    this.selectionBoxGroup.visible = visible;
    this.measurementRenderer.setVisible(visible);
    if (this.phantomLine) {
      this.phantomLine.visible = visible;
    }
  }

  dispose(): void {
    for (const icon of this.lightIcons.values()) {
      icon.dispose();
    }
    this.lightIcons.clear();
    this.measurementRenderer.dispose();
  }
}

import * as THREE from 'three';
import type { Vector2 } from '../types';
import { clearGroup, disposeObject3D } from '../utils/three';
import { Z_LAYERS, GEOMETRY, PREVIEW_COLORS, OPACITY } from '../constants/rendering';
import {
  createPhantomLine,
  createDrawingVertex,
  createDrawingLine,
} from './editorRendering';

/**
 * Handles rendering of drawing previews including phantom lines,
 * preview vertices, and in-progress wall vertices.
 */
export class DrawingPreviewRenderer {
  private scene: THREE.Scene;
  private phantomLine: THREE.Line | null = null;
  private previewVertexMesh: THREE.Mesh | null = null;
  private drawingVerticesGroup: THREE.Group;

  constructor(parentScene: THREE.Scene) {
    this.scene = parentScene;
    this.drawingVerticesGroup = new THREE.Group();
    parentScene.add(this.drawingVerticesGroup);
  }

  /**
   * Show/hide the phantom line for wall drawing preview.
   */
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

  /**
   * Show/hide the preview vertex (ghost vertex at cursor).
   */
  setPreviewVertex(pos: Vector2 | null): void {
    if (this.previewVertexMesh) {
      this.drawingVerticesGroup.remove(this.previewVertexMesh);
      disposeObject3D(this.previewVertexMesh);
      this.previewVertexMesh = null;
    }

    if (pos) {
      const geometry = new THREE.CircleGeometry(GEOMETRY.PREVIEW_VERTEX_RADIUS, GEOMETRY.CIRCLE_SEGMENTS);
      const material = new THREE.MeshBasicMaterial({
        color: PREVIEW_COLORS.PREVIEW_VERTEX,
        opacity: OPACITY.PREVIEW_VERTEX,
        transparent: true,
      });
      this.previewVertexMesh = new THREE.Mesh(geometry, material);
      this.previewVertexMesh.position.set(pos.x, pos.y, Z_LAYERS.PREVIEW_VERTEX);
      this.drawingVerticesGroup.add(this.previewVertexMesh);
    }
  }

  /**
   * Update the in-progress drawing vertices and lines.
   */
  updateDrawingVertices(vertices: Vector2[]): void {
    clearGroup(this.drawingVerticesGroup);

    if (vertices.length === 0) return;

    // Render vertex markers
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      const isStart = i === 0;
      const mesh = createDrawingVertex(v, isStart);
      this.drawingVerticesGroup.add(mesh);
    }

    // Render connecting lines
    if (vertices.length >= 2) {
      for (let i = 0; i < vertices.length - 1; i++) {
        const line = createDrawingLine(vertices[i], vertices[i + 1]);
        this.drawingVerticesGroup.add(line);
      }
    }
  }

  setVisible(visible: boolean): void {
    this.drawingVerticesGroup.visible = visible;
    if (this.phantomLine) {
      this.phantomLine.visible = visible;
    }
  }

  dispose(): void {
    if (this.phantomLine) {
      this.scene.remove(this.phantomLine);
      disposeObject3D(this.phantomLine);
      this.phantomLine = null;
    }

    if (this.previewVertexMesh) {
      disposeObject3D(this.previewVertexMesh);
      this.previewVertexMesh = null;
    }

    clearGroup(this.drawingVerticesGroup);
  }
}

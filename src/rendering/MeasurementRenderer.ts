import * as THREE from 'three';
import type { Vector2, UnitFormat } from '../types';
import { formatImperial } from '../utils/format';
import { clearGroup, createTextSprite } from '../utils/three';
import {
  Z_LAYERS,
  GEOMETRY,
  DASH_PATTERNS,
  PREVIEW_COLORS,
  LABEL_SCALE,
} from '../constants/rendering';

interface MeasurementColors {
  main: number;
  xComponent: number;
  yComponent: number;
}

const DEFAULT_COLORS: MeasurementColors = {
  main: 0xff00ff,
  xComponent: PREVIEW_COLORS.SNAP_GUIDE_X,
  yComponent: PREVIEW_COLORS.SNAP_GUIDE_Y,
};

/**
 * Handles rendering of measurement lines and labels.
 * Displays diagonal measurement with X/Y component breakdown.
 */
export class MeasurementRenderer {
  private group: THREE.Group;
  private colors: MeasurementColors;
  private currentUnitFormat: UnitFormat = 'feet-inches';
  private currentMeasurement: { from: Vector2; to: Vector2 } | null = null;

  constructor(parentScene: THREE.Scene, colors: MeasurementColors = DEFAULT_COLORS) {
    this.group = new THREE.Group();
    this.colors = colors;
    parentScene.add(this.group);
  }

  setUnitFormat(format: UnitFormat): void {
    if (this.currentUnitFormat !== format) {
      this.currentUnitFormat = format;
      // Re-render with new format if measurement exists
      if (this.currentMeasurement) {
        this.render(this.currentMeasurement.from, this.currentMeasurement.to);
      }
    }
  }

  /**
   * Renders a measurement line between two points.
   * Shows diagonal line, X/Y components, and distance labels.
   */
  render(from: Vector2 | null, to: Vector2 | null): void {
    this.currentMeasurement = from && to ? { from, to } : null;
    this.clear();

    if (!from || !to) return;

    const deltaX = Math.abs(to.x - from.x);
    const deltaY = Math.abs(to.y - from.y);

    this.renderDiagonalLine(from, to);
    this.renderEndpointMarkers(from, to);

    if (deltaX > 0.1) {
      this.renderXComponent(from, to, deltaX);
    }

    if (deltaY > 0.1) {
      this.renderYComponent(from, to, deltaY);
    }
  }

  private renderDiagonalLine(from: Vector2, to: Vector2): void {
    const points = [
      new THREE.Vector3(from.x, from.y, Z_LAYERS.MEASUREMENT),
      new THREE.Vector3(to.x, to.y, Z_LAYERS.MEASUREMENT),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.colors.main,
      linewidth: 2,
    });
    this.group.add(new THREE.Line(geometry, material));
  }

  private renderEndpointMarkers(from: Vector2, to: Vector2): void {
    for (const point of [from, to]) {
      const geometry = new THREE.CircleGeometry(GEOMETRY.MEASUREMENT_MARKER_RADIUS, GEOMETRY.CIRCLE_SEGMENTS);
      const material = new THREE.MeshBasicMaterial({ color: this.colors.main });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.set(point.x, point.y, Z_LAYERS.MEASUREMENT + 0.01);
      this.group.add(marker);
    }
  }

  private renderComponent(
    lineStart: Vector2,
    lineEnd: Vector2,
    labelPos: Vector2,
    distance: number,
    color: number
  ): void {
    // Dashed line
    const points = [
      new THREE.Vector3(lineStart.x, lineStart.y, Z_LAYERS.MEASUREMENT),
      new THREE.Vector3(lineEnd.x, lineEnd.y, Z_LAYERS.MEASUREMENT),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color,
      dashSize: DASH_PATTERNS.MEASUREMENT_COMPONENT.dashSize,
      gapSize: DASH_PATTERNS.MEASUREMENT_COMPONENT.gapSize,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    this.group.add(line);

    // Label
    const label = this.createLabel(
      formatImperial(distance, { format: this.currentUnitFormat }),
      color
    );
    label.position.set(labelPos.x, labelPos.y, Z_LAYERS.MEASUREMENT + 0.01);
    this.group.add(label);
  }

  private renderXComponent(from: Vector2, to: Vector2, deltaX: number): void {
    this.renderComponent(
      from,
      { x: to.x, y: from.y },
      { x: (from.x + to.x) / 2, y: from.y - 0.4 },
      deltaX,
      this.colors.xComponent
    );
  }

  private renderYComponent(from: Vector2, to: Vector2, deltaY: number): void {
    this.renderComponent(
      { x: to.x, y: from.y },
      to,
      { x: to.x + 0.5, y: (from.y + to.y) / 2 },
      deltaY,
      this.colors.yComponent
    );
  }

  private createLabel(text: string, backgroundColor: number): THREE.Sprite {
    return createTextSprite(text, {
      fontSize: 20,
      padding: 6,
      fontWeight: 'bold',
      backgroundColor,
      textColor: 'white',
      scale: LABEL_SCALE.MEASUREMENT_LABEL,
    });
  }

  /**
   * Clears all measurement visuals.
   */
  clear(): void {
    clearGroup(this.group);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  dispose(): void {
    this.clear();
    this.group.parent?.remove(this.group);
  }
}

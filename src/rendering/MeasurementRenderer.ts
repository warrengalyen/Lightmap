import * as THREE from 'three';
import type { Vector2, UnitFormat } from '../types';
import { formatImperial } from '../utils/format';
import { clearGroup } from '../utils/three';

interface MeasurementColors {
  main: number;
  xComponent: number;
  yComponent: number;
}

const DEFAULT_COLORS: MeasurementColors = {
  main: 0xff00ff,
  xComponent: 0xff6600,
  yComponent: 0x0066ff,
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

    const z = 0.2;
    const deltaX = Math.abs(to.x - from.x);
    const deltaY = Math.abs(to.y - from.y);

    this.renderDiagonalLine(from, to, z);
    this.renderEndpointMarkers(from, to, z);

    if (deltaX > 0.1) {
      this.renderXComponent(from, to, deltaX, z);
    }

    if (deltaY > 0.1) {
      this.renderYComponent(from, to, deltaY, z);
    }
  }

  private renderDiagonalLine(from: Vector2, to: Vector2, z: number): void {
    const points = [
      new THREE.Vector3(from.x, from.y, z),
      new THREE.Vector3(to.x, to.y, z),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.colors.main,
      linewidth: 2,
    });
    this.group.add(new THREE.Line(geometry, material));
  }

  private renderEndpointMarkers(from: Vector2, to: Vector2, z: number): void {
    for (const point of [from, to]) {
      const geometry = new THREE.CircleGeometry(0.15, 16);
      const material = new THREE.MeshBasicMaterial({ color: this.colors.main });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.set(point.x, point.y, z + 0.01);
      this.group.add(marker);
    }
  }

  private renderXComponent(from: Vector2, to: Vector2, deltaX: number, z: number): void {
    // Horizontal dashed line
    const points = [
      new THREE.Vector3(from.x, from.y, z),
      new THREE.Vector3(to.x, from.y, z),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: this.colors.xComponent,
      dashSize: 0.15,
      gapSize: 0.1,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    this.group.add(line);

    // Label
    const label = this.createLabel(
      formatImperial(deltaX, { format: this.currentUnitFormat }),
      this.colors.xComponent
    );
    label.position.set((from.x + to.x) / 2, from.y - 0.4, z + 0.01);
    this.group.add(label);
  }

  private renderYComponent(from: Vector2, to: Vector2, deltaY: number, z: number): void {
    // Vertical dashed line
    const points = [
      new THREE.Vector3(to.x, from.y, z),
      new THREE.Vector3(to.x, to.y, z),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: this.colors.yComponent,
      dashSize: 0.15,
      gapSize: 0.1,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    this.group.add(line);

    // Label
    const label = this.createLabel(
      formatImperial(deltaY, { format: this.currentUnitFormat }),
      this.colors.yComponent
    );
    label.position.set(to.x + 0.5, (from.y + to.y) / 2, z + 0.01);
    this.group.add(label);
  }

  private createLabel(text: string, backgroundColor: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    const fontSize = 20;
    const padding = 6;
    context.font = `bold ${fontSize}px Arial`;
    const textWidth = context.measureText(text).width;

    canvas.width = Math.ceil(textWidth + padding * 2);
    canvas.height = fontSize + padding;

    // Draw background
    context.fillStyle = `#${backgroundColor.toString(16).padStart(6, '0')}`;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    context.font = `bold ${fontSize}px Arial`;
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    const aspectRatio = canvas.width / canvas.height;
    sprite.scale.set(aspectRatio * 0.4, 0.4, 1);

    return sprite;
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

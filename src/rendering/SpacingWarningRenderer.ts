import * as THREE from 'three';
import type { SpacingWarning } from '../types';
import { clearGroup } from '../utils/three';

export class SpacingWarningRenderer {
  private scene: THREE.Scene;
  private lineGroup: THREE.Group;
  private circleGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lineGroup = new THREE.Group();
    this.circleGroup = new THREE.Group();
    this.lineGroup.visible = false;
    this.circleGroup.visible = false;
    this.scene.add(this.lineGroup);
    this.scene.add(this.circleGroup);
  }

  updateWarnings(warnings: SpacingWarning[]): void {
    this.clearGeometry();

    for (const warning of warnings) {
      this.drawWarningLine(warning);
      this.drawWarningCircles(warning);
    }
  }

  private drawWarningLine(warning: SpacingWarning): void {
    const color = this.getLineColor(warning);
    const isDashed = warning.type === 'too_far';

    const points = [
      new THREE.Vector3(warning.light1Position.x, warning.light1Position.y, 0.01),
      new THREE.Vector3(warning.light2Position.x, warning.light2Position.y, 0.01),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    let material: THREE.LineBasicMaterial | THREE.LineDashedMaterial;

    if (isDashed) {
      material = new THREE.LineDashedMaterial({
        color,
        dashSize: 0.2,
        gapSize: 0.1,
        linewidth: 2,
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.lineGroup.add(line);
    } else {
      material = new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
      });
      const line = new THREE.Line(geometry, material);
      this.lineGroup.add(line);
    }
  }

  private drawWarningCircles(warning: SpacingWarning): void {
    const color = this.getCircleColor(warning);
    const radius = 0.3;
    const segments = 32;

    [warning.light1Position, warning.light2Position].forEach((pos) => {
      const geometry = new THREE.CircleGeometry(radius, segments);
      geometry.deleteAttribute('normal');
      geometry.deleteAttribute('uv');

      // Convert to ring geometry
      const positions = geometry.getAttribute('position');
      const ringPositions: number[] = [];

      for (let i = 1; i <= segments; i++) {
        ringPositions.push(
          positions.getX(i),
          positions.getY(i),
          0.01
        );
        ringPositions.push(
          positions.getX(i === segments ? 1 : i + 1),
          positions.getY(i === segments ? 1 : i + 1),
          0.01
        );
      }

      const ringGeometry = new THREE.BufferGeometry();
      ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ringPositions, 3));

      const material = new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
      });

      const ring = new THREE.LineSegments(ringGeometry, material);
      ring.position.set(pos.x, pos.y, 0);

      this.circleGroup.add(ring);
      geometry.dispose();
    });
  }

  private getLineColor(warning: SpacingWarning): number {
    if (warning.severity === 'high') {
      return 0xff0000; // Red
    }
    if (warning.type === 'too_close') {
      return 0xff8800; // Orange
    }
    return 0xffcc00; // Yellow for too_far
  }

  private getCircleColor(warning: SpacingWarning): number {
    if (warning.severity === 'high') {
      return 0xff0000;
    }
    return warning.type === 'too_close' ? 0xff8800 : 0xffcc00;
  }

  private clearGeometry(): void {
    clearGroup(this.lineGroup);
    clearGroup(this.circleGroup);
  }

  setVisible(visible: boolean): void {
    this.lineGroup.visible = visible;
    this.circleGroup.visible = visible;
  }

  dispose(): void {
    this.clearGeometry();
    this.scene.remove(this.lineGroup);
    this.scene.remove(this.circleGroup);
  }
}

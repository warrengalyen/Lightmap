import * as THREE from 'three';
import type { Vector2 } from '../types';
import type { SnapGuide } from '../controllers/SnapController';
import { clearGroup, disposeObject3D } from '../utils/three';
import {
  createSnapGuideLine,
  createSelectionBox,
} from './editorRendering';

/**
 * Handles rendering of overlays like snap guides and selection box.
 */
export class OverlayRenderer {
  private snapGuidesGroup: THREE.Group;
  private selectionBoxGroup: THREE.Group;
  private selectionBoxLine: THREE.Line | null = null;

  constructor(parentScene: THREE.Scene) {
    this.snapGuidesGroup = new THREE.Group();
    this.selectionBoxGroup = new THREE.Group();
    parentScene.add(this.snapGuidesGroup);
    parentScene.add(this.selectionBoxGroup);
  }

  /**
   * Set the snap guides to display.
   */
  setSnapGuides(guides: SnapGuide[]): void {
    clearGroup(this.snapGuidesGroup);

    for (const guide of guides) {
      const line = createSnapGuideLine(guide);
      this.snapGuidesGroup.add(line);
    }
  }

  /**
   * Set the selection box to display.
   */
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

  setVisible(visible: boolean): void {
    this.snapGuidesGroup.visible = visible;
    this.selectionBoxGroup.visible = visible;
  }

  dispose(): void {
    clearGroup(this.snapGuidesGroup);

    if (this.selectionBoxLine) {
      disposeObject3D(this.selectionBoxLine);
      this.selectionBoxLine = null;
    }

    clearGroup(this.selectionBoxGroup);
  }
}

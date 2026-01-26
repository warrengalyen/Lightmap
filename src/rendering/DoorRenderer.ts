import * as THREE from 'three';
import type { WallSegment, Door } from '../types';
import { clearGroup } from '../utils/three';
import { PREVIEW_COLORS, OPACITY } from '../constants/rendering';
import { createDoorGraphics } from './editorRendering';

/**
 * Handles rendering of doors and door previews.
 */
export class DoorRenderer {
  private doorsGroup: THREE.Group;
  private doorPreviewGroup: THREE.Group;

  constructor(parentScene: THREE.Scene) {
    this.doorsGroup = new THREE.Group();
    this.doorPreviewGroup = new THREE.Group();
    parentScene.add(this.doorsGroup);
    parentScene.add(this.doorPreviewGroup);
  }

  /**
   * Update door graphics.
   */
  update(doors: Door[], walls: WallSegment[], selectedDoorId: string | null): void {
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
   */
  setPreview(door: Door | null, wall: WallSegment | null, canPlace: boolean = true): void {
    clearGroup(this.doorPreviewGroup);

    if (!door || !wall) return;

    const graphics = createDoorGraphics(door, wall, false);

    for (const obj of graphics) {
      // Make preview semi-transparent and red if can't place
      if (obj instanceof THREE.Line) {
        const material = obj.material as THREE.LineBasicMaterial | THREE.LineDashedMaterial;
        material.opacity = OPACITY.DOOR_PREVIEW;
        material.transparent = true;
        if (!canPlace) {
          material.color.setHex(PREVIEW_COLORS.INVALID);
        }
      } else if (obj instanceof THREE.Mesh) {
        const material = obj.material as THREE.MeshBasicMaterial;
        material.opacity = OPACITY.DOOR_PREVIEW;
        material.transparent = true;
        if (!canPlace) {
          material.color.setHex(PREVIEW_COLORS.INVALID);
        }
      }
      this.doorPreviewGroup.add(obj);
    }
  }

  /**
   * Clear the door preview.
   */
  clearPreview(): void {
    clearGroup(this.doorPreviewGroup);
  }

  setVisible(visible: boolean): void {
    this.doorsGroup.visible = visible;
    this.doorPreviewGroup.visible = visible;
  }

  dispose(): void {
    clearGroup(this.doorsGroup);
    clearGroup(this.doorPreviewGroup);
  }
}

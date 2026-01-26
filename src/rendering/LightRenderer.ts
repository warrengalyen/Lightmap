import * as THREE from 'three';
import type { Vector2, LightFixture, LightRadiusVisibility } from '../types';
import { LightIcon } from '../lighting/LightIcon';
import { disposeObject3D } from '../utils/three';
import { Z_LAYERS, GEOMETRY, PREVIEW_COLORS, OPACITY } from '../constants/rendering';

/**
 * Handles rendering of lights and light previews.
 */
export class LightRenderer {
  private scene: THREE.Scene;
  private lightsGroup: THREE.Group;
  private previewLightGroup: THREE.Group | null = null;
  private lightIcons: Map<string, LightIcon> = new Map();
  private lightRadiusVisibility: LightRadiusVisibility = 'selected';

  constructor(parentScene: THREE.Scene) {
    this.scene = parentScene;
    this.lightsGroup = new THREE.Group();
    parentScene.add(this.lightsGroup);
  }

  /**
   * Update light icons.
   */
  update(lights: LightFixture[], ceilingHeight: number, selectedIds: Set<string>): void {
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

  /**
   * Show a preview of a light being placed.
   */
  setPreview(pos: Vector2 | null, isValid: boolean = true): void {
    if (this.previewLightGroup) {
      this.scene.remove(this.previewLightGroup);
      disposeObject3D(this.previewLightGroup);
      this.previewLightGroup = null;
    }

    if (pos) {
      this.previewLightGroup = new THREE.Group();

      const color = isValid ? PREVIEW_COLORS.VALID : PREVIEW_COLORS.INVALID;

      // Outer ring
      const outerGeometry = new THREE.RingGeometry(
        GEOMETRY.LIGHT_PREVIEW_INNER_RADIUS,
        GEOMETRY.LIGHT_PREVIEW_OUTER_RADIUS,
        GEOMETRY.CIRCLE_SEGMENTS_HIGH
      );
      const outerMaterial = new THREE.MeshBasicMaterial({
        color: color,
        opacity: OPACITY.PREVIEW_LIGHT_RING,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const outerRing = new THREE.Mesh(outerGeometry, outerMaterial);
      outerRing.position.set(pos.x, pos.y, Z_LAYERS.PREVIEW_LIGHT_RING);
      this.previewLightGroup.add(outerRing);

      // Center dot
      const dotGeometry = new THREE.CircleGeometry(GEOMETRY.LIGHT_PREVIEW_CENTER_RADIUS, GEOMETRY.CIRCLE_SEGMENTS);
      const dotMaterial = new THREE.MeshBasicMaterial({
        color: color,
        opacity: OPACITY.PREVIEW_LIGHT_CENTER,
        transparent: true,
      });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(pos.x, pos.y, Z_LAYERS.PREVIEW_LIGHT_CENTER);
      this.previewLightGroup.add(dot);

      this.scene.add(this.previewLightGroup);
    }
  }

  setRadiusVisibility(visibility: LightRadiusVisibility): void {
    this.lightRadiusVisibility = visibility;
    for (const icon of this.lightIcons.values()) {
      icon.setRadiusVisibility(visibility);
    }
  }

  setVisible(visible: boolean): void {
    this.lightsGroup.visible = visible;
  }

  dispose(): void {
    for (const icon of this.lightIcons.values()) {
      icon.dispose();
    }
    this.lightIcons.clear();

    if (this.previewLightGroup) {
      this.scene.remove(this.previewLightGroup);
      disposeObject3D(this.previewLightGroup);
      this.previewLightGroup = null;
    }
  }
}

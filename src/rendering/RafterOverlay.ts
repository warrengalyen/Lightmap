import * as THREE from 'three';
import type { BoundingBox, RafterConfig } from '../types';
import { clearGroup } from '../utils/three';

export class RafterOverlay {
  private scene: THREE.Scene;
  private rafterGroup: THREE.Group;
  private config: RafterConfig;

  constructor(scene: THREE.Scene, config: RafterConfig) {
    this.scene = scene;
    this.config = config;
    this.rafterGroup = new THREE.Group();
    this.rafterGroup.visible = config.visible;
    this.scene.add(this.rafterGroup);
  }

  updateConfig(config: Partial<RafterConfig>): void {
    this.config = { ...this.config, ...config };
    this.rafterGroup.visible = this.config.visible;
  }

  render(bounds: BoundingBox): void {
    clearGroup(this.rafterGroup);

    if (!this.config.visible) return;

    const material = new THREE.MeshBasicMaterial({
      color: 0xDEB887, // Lighter brown (burlywood)
      transparent: true,
      opacity: 0.6,
    });

    const rafterWidth = 1.5 / 12; // 1.5 inches in feet

    if (this.config.orientation === 'horizontal') {
      const startY = Math.ceil((bounds.minY - this.config.offsetY) / this.config.spacing) * this.config.spacing + this.config.offsetY;
      const length = bounds.maxX - bounds.minX;

      for (let y = startY; y <= bounds.maxY; y += this.config.spacing) {
        const geometry = new THREE.PlaneGeometry(length, rafterWidth);
        const mesh = new THREE.Mesh(geometry, material.clone());
        mesh.position.set((bounds.minX + bounds.maxX) / 2, y, 0.01);
        this.rafterGroup.add(mesh);
      }
    } else {
      const startX = Math.ceil((bounds.minX - this.config.offsetX) / this.config.spacing) * this.config.spacing + this.config.offsetX;
      const length = bounds.maxY - bounds.minY;

      for (let x = startX; x <= bounds.maxX; x += this.config.spacing) {
        const geometry = new THREE.PlaneGeometry(rafterWidth, length);
        const mesh = new THREE.Mesh(geometry, material.clone());
        mesh.position.set(x, (bounds.minY + bounds.maxY) / 2, 0.01);
        this.rafterGroup.add(mesh);
      }
    }
  }

  setVisible(visible: boolean): void {
    this.config.visible = visible;
    this.rafterGroup.visible = visible;
  }

  dispose(): void {
    clearGroup(this.rafterGroup);
    this.scene.remove(this.rafterGroup);
  }
}

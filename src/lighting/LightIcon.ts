import * as THREE from 'three';
import type { LightFixture, LightRadiusVisibility } from '../types';
import { kelvinToRGB } from '../utils/format';
import { degToRad } from '../utils/math';

const lightBulbIconPath = `${import.meta.env.BASE_URL}icons/light_bulb.png`;

export class LightIcon {
  readonly mesh: THREE.Group;
  private iconMesh: THREE.Mesh;
  private beamPreview: THREE.Line;
  private selectionRing: THREE.Line;
  private selected: boolean = false;
  private light: LightFixture;
  private ceilingHeight: number;
  private radiusVisibility: LightRadiusVisibility = 'selected';
  private static textureLoader = new THREE.TextureLoader();
  private static lightBulbTexture: THREE.Texture | null = null;

  constructor(light: LightFixture, ceilingHeight: number) {
    this.light = light;
    this.ceilingHeight = ceilingHeight;
    this.mesh = new THREE.Group();
    this.iconMesh = this.createIconMesh();
    this.beamPreview = this.createBeamPreview();
    this.selectionRing = this.createSelectionRing();

    this.mesh.add(this.iconMesh);
    this.mesh.add(this.beamPreview);
    this.mesh.add(this.selectionRing);
    this.updatePosition();

    // Load texture if not already loaded
    if (!LightIcon.lightBulbTexture) {
      LightIcon.textureLoader.load(lightBulbIconPath, (texture) => {
        LightIcon.lightBulbTexture = texture;
        this.updateIconTexture();
      });
    } else {
      this.updateIconTexture();
    }
  }

  private createIconMesh(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(0.6, 0.6);
    const rgb = kelvinToRGB(this.light.properties.warmth);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(rgb.r, rgb.g, rgb.b),
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.lightId = this.light.id;
    return mesh;
  }

  private updateIconTexture(): void {
    if (LightIcon.lightBulbTexture) {
      const material = this.iconMesh.material as THREE.MeshBasicMaterial;
      material.map = LightIcon.lightBulbTexture;
      material.needsUpdate = true;
    }
  }

  private createBeamPreview(): THREE.Line {
    const radius = this.getBeamRadius();
    const segments = 32;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.5,
    });

    return new THREE.Line(geometry, material);
  }

  private createSelectionRing(): THREE.Line {
    const radius = 0.5; // Fixed size ring around the light icon
    const segments = 32;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.05));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00aaff,
      linewidth: 2,
    });

    const ring = new THREE.Line(geometry, material);
    ring.visible = false; // Hidden by default
    return ring;
  }

  private getBeamRadius(): number {
    const halfBeamRad = degToRad(this.light.properties.beamAngle / 2);
    return this.ceilingHeight * Math.tan(halfBeamRad);
  }

  updatePosition(): void {
    this.mesh.position.set(this.light.position.x, this.light.position.y, 0.1);
  }

  updateProperties(light: LightFixture, ceilingHeight: number): void {
    this.light = light;
    this.ceilingHeight = ceilingHeight;

    const rgb = kelvinToRGB(light.properties.warmth);
    (this.iconMesh.material as THREE.MeshBasicMaterial).color.setRGB(rgb.r, rgb.g, rgb.b);

    this.updateBeamPreview();
    this.updatePosition();
  }

  private updateBeamPreview(): void {
    const radius = this.getBeamRadius();
    const segments = 32;
    const positions: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    }

    this.beamPreview.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
  }

  setSelected(selected: boolean): void {
    this.selected = selected;

    // Show/hide selection ring
    this.selectionRing.visible = selected;

    // Update beam preview appearance and visibility
    this.updateBeamPreviewVisibility();
    const lineMaterial = this.beamPreview.material as THREE.LineBasicMaterial;
    if (selected) {
      lineMaterial.color.setHex(0x00aaff);
      lineMaterial.opacity = 1;
    } else {
      lineMaterial.color.setHex(0x888888);
      lineMaterial.opacity = 0.5;
    }
  }

  setRadiusVisibility(visibility: LightRadiusVisibility): void {
    this.radiusVisibility = visibility;
    this.updateBeamPreviewVisibility();
  }

  private updateBeamPreviewVisibility(): void {
    switch (this.radiusVisibility) {
      case 'always':
        this.beamPreview.visible = true;
        break;
      case 'selected':
      default:
        this.beamPreview.visible = this.selected;
        break;
    }
  }

    dispose(): void {
    this.iconMesh.geometry.dispose();
    (this.iconMesh.material as THREE.Material).dispose();
    this.beamPreview.geometry.dispose();
    (this.beamPreview.material as THREE.Material).dispose();
    this.selectionRing.geometry.dispose();
    (this.selectionRing.material as THREE.Material).dispose();
  }
}

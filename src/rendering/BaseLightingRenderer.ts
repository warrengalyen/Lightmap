import * as THREE from 'three';
import type { LightFixture, BoundingBox } from '../types';

const MAX_LIGHTS = 32;

/**
 * Base class for lighting visualization renderers (heatmap, deadzone, etc.).
 * Provides common functionality for managing shader materials and light uniforms.
 */
export abstract class BaseLightingRenderer {
  protected scene: THREE.Scene;
  protected mesh: THREE.Mesh | null = null;
  protected material: THREE.ShaderMaterial;
  protected isVisible: boolean = false;
  protected abstract zPosition: number;

  constructor(scene: THREE.Scene, material: THREE.ShaderMaterial) {
    this.scene = scene;
    this.material = material;
  }

  updateBounds(bounds: BoundingBox): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    const geometry = new THREE.PlaneGeometry(width, height, 100, 100);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(centerX, centerY, this.zPosition);
    this.mesh.visible = this.isVisible;
    this.scene.add(this.mesh);
  }

  updateLights(lights: LightFixture[], ceilingHeight: number): void {
    const count = Math.min(lights.length, MAX_LIGHTS);

    for (let i = 0; i < MAX_LIGHTS; i++) {
      if (i < count) {
        this.material.uniforms.uLightPositions.value[i].set(
          lights[i].position.x,
          lights[i].position.y
        );
        this.material.uniforms.uLightLumens.value[i] = lights[i].properties.lumen;
        this.material.uniforms.uLightBeamAngles.value[i] = lights[i].properties.beamAngle;
      } else {
        this.material.uniforms.uLightPositions.value[i].set(0, 0);
        this.material.uniforms.uLightLumens.value[i] = 0;
        this.material.uniforms.uLightBeamAngles.value[i] = 60;
      }
    }

    this.material.uniforms.uLightCount.value = count;
    this.material.uniforms.uCeilingHeight.value = ceilingHeight;
    this.material.uniformsNeedUpdate = true;
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.mesh) {
      this.mesh.visible = visible;
    }
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.scene.remove(this.mesh);
    }
    this.material.dispose();
  }
}

import * as THREE from 'three';
import type { LightFixture, BoundingBox, DeadZoneConfig } from '../types';
import { createLightUniformArrays } from '../utils/three';

import heatmapVertexShader from './shaders/heatmap.vert?raw';
import deadzoneFragmentShader from './shaders/deadzone.frag?raw';

const MAX_LIGHTS = 32;

export class DeadZoneRenderer {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial;
  private isVisible: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const { positions, lumens, beamAngles } = createLightUniformArrays(MAX_LIGHTS);

    this.material = new THREE.ShaderMaterial({
      vertexShader: heatmapVertexShader,
      fragmentShader: deadzoneFragmentShader,
      transparent: true,
      uniforms: {
        uLightCount: { value: 0 },
        uLightPositions: { value: positions },
        uLightLumens: { value: lumens },
        uLightBeamAngles: { value: beamAngles },
        uCeilingHeight: { value: 8.0 },
        uThreshold: { value: 30.0 },
        uColor: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
        uOpacity: { value: 0.4 },
      },
    });
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
    this.mesh.position.set(centerX, centerY, -0.045);
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

  updateConfig(config: DeadZoneConfig): void {
    this.material.uniforms.uThreshold.value = config.threshold;
    this.material.uniforms.uColor.value.set(config.color.r, config.color.g, config.color.b);
    this.material.uniforms.uOpacity.value = config.opacity;
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

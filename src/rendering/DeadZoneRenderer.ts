import * as THREE from 'three';
import type { DeadZoneConfig } from '../types';
import { createLightUniformArrays } from '../utils/three';
import { BaseLightingRenderer } from './BaseLightingRenderer';

import heatmapVertexShader from './shaders/heatmap.vert?raw';
import deadzoneFragmentShader from './shaders/deadzone.frag?raw';

const MAX_LIGHTS = 32;

export class DeadZoneRenderer extends BaseLightingRenderer {
  protected zPosition = -0.045;

  constructor(scene: THREE.Scene) {
    const { positions, lumens, beamAngles } = createLightUniformArrays(MAX_LIGHTS);

    const material = new THREE.ShaderMaterial({
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

    super(scene, material);
  }

  updateConfig(config: DeadZoneConfig): void {
    this.material.uniforms.uThreshold.value = config.threshold;
    this.material.uniforms.uColor.value.set(config.color.r, config.color.g, config.color.b);
    this.material.uniforms.uOpacity.value = config.opacity;
    this.material.uniformsNeedUpdate = true;
  }
}

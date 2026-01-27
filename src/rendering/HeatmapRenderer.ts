import * as THREE from 'three';
import type { WallSegment, Obstacle } from '../types';
import { createLightUniformArrays } from '../utils/three';
import { BaseLightingRenderer } from './BaseLightingRenderer';

import heatmapVertexShader from './shaders/heatmap.vert?raw';
import heatmapFragmentShader from './shaders/heatmap.frag?raw';

const MAX_LIGHTS = 32;
const MAX_POLYGON_VERTICES = 64;
const MAX_OBSTACLES = 8;
const MAX_OBSTACLE_VERTICES = 64;

export class HeatmapRenderer extends BaseLightingRenderer {
  protected zPosition = -0.05;

  constructor(scene: THREE.Scene) {
    const { positions, lumens, beamAngles } = createLightUniformArrays(MAX_LIGHTS);

    // Create polygon vertex array for wall clipping
    const polygonVertices: THREE.Vector2[] = [];
    for (let i = 0; i < MAX_POLYGON_VERTICES; i++) {
      polygonVertices.push(new THREE.Vector2(0, 0));
    }

    // Create obstacle uniform arrays
    const obstacleVertexCounts = new Int32Array(MAX_OBSTACLES);
    const obstacleVertices: THREE.Vector2[] = [];
    for (let i = 0; i < MAX_OBSTACLE_VERTICES; i++) {
      obstacleVertices.push(new THREE.Vector2(0, 0));
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: heatmapVertexShader,
      fragmentShader: heatmapFragmentShader,
      transparent: true,
      uniforms: {
        uLightCount: { value: 0 },
        uLightPositions: { value: positions },
        uLightLumens: { value: lumens },
        uLightBeamAngles: { value: beamAngles },
        uCeilingHeight: { value: 8.0 },
        uVertexCount: { value: 0 },
        uPolygonVertices: { value: polygonVertices },
        uObstacleCount: { value: 0 },
        uObstacleVertexCounts: { value: obstacleVertexCounts },
        uObstacleVertices: { value: obstacleVertices },
      },
    });

    super(scene, material);
  }

  updateObstacles(obstacles: Obstacle[]): void {
    const count = Math.min(obstacles.length, MAX_OBSTACLES);
    let vertexOffset = 0;

    for (let i = 0; i < MAX_OBSTACLES; i++) {
      if (i < count) {
        const obs = obstacles[i];
        const vCount = Math.min(obs.walls.length, MAX_OBSTACLE_VERTICES - vertexOffset);
        this.material.uniforms.uObstacleVertexCounts.value[i] = vCount;

        for (let j = 0; j < vCount; j++) {
          if (vertexOffset + j < MAX_OBSTACLE_VERTICES) {
            this.material.uniforms.uObstacleVertices.value[vertexOffset + j].set(
              obs.walls[j].start.x,
              obs.walls[j].start.y
            );
          }
        }
        vertexOffset += vCount;
      } else {
        this.material.uniforms.uObstacleVertexCounts.value[i] = 0;
      }
    }

    this.material.uniforms.uObstacleCount.value = count;
    this.material.uniformsNeedUpdate = true;
  }

  updateWalls(walls: WallSegment[]): void {
    const count = Math.min(walls.length, MAX_POLYGON_VERTICES);

    // Extract vertices from wall segments (each wall's start point)
    for (let i = 0; i < MAX_POLYGON_VERTICES; i++) {
      if (i < count) {
        this.material.uniforms.uPolygonVertices.value[i].set(
          walls[i].start.x,
          walls[i].start.y
        );
      } else {
        this.material.uniforms.uPolygonVertices.value[i].set(0, 0);
      }
    }

    this.material.uniforms.uVertexCount.value = count;
    this.material.uniformsNeedUpdate = true;
  }
}

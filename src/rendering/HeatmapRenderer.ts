import * as THREE from "three";
import type { LightFixture, BoundingBox } from "../types";

import heatmapVertexShader from "./shaders/heatmap.vert?raw";
import heatmapFragmentShader from "./shaders/heatmap.frag?raw";

const MAX_LIGHTS = 32;

export class HeatmapRenderer {
    private scene: THREE.Scene;
    private mesh: THREE.Mesh | null = null;
    private material: THREE.ShaderMaterial;
    private isVisible: boolean = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        this.material = new THREE.ShaderMaterial({
            vertexShader: heatmapVertexShader,
            fragmentShader: heatmapFragmentShader,
            transparent: true,
            uniforms: {
                uLightCount: { value: 0 },
                uLightPositions: { value: new Array(MAX_LIGHTS).fill(new THREE.Vector2()) },
                uLightLumens: { value: new Array(MAX_LIGHTS).fill(0) },
                uLightBeamAngles: { value: new Array(MAX_LIGHTS).fill(60) },
                uCeilingHeight: { value: 8.0 },
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
        this.mesh.position.set(centerX, centerY, -0.05);
        this.mesh.visible = this.isVisible;
        this.scene.add(this.mesh);
    }

    updateLights(lights: LightFixture[], ceilingHeight: number): void {
        const positions: THREE.Vector2[] = [];
        const lumens: number[] = [];
        const beamAngles: number[] = [];

        const count = Math.min(lights.length, MAX_LIGHTS);

        for (let i = 0; i < MAX_LIGHTS; i++) {
            if (i < count) {
                positions.push(new THREE.Vector2(lights[i].position.x, lights[i].position.y));
                lumens.push(lights[i].properties.lumen);
                beamAngles.push(lights[i].properties.beamAngle);
            } else {
                positions.push(new THREE.Vector2(0, 0));
                lumens.push(0);
                beamAngles.push(60);
            }
        }

        this.material.uniforms.uLightCount.value = count;
        this.material.uniforms.uLightPositions.value = positions;
        this.material.uniforms.uLightLumens.value = lumens;
        this.material.uniforms.uLightBeamAngles.value = beamAngles;
        this.material.uniforms.uCeilingHeight.value = ceilingHeight;
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

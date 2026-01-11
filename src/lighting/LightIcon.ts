import * as THREE from "three";
import type { LightFixture } from "../types";
import { kelvinToRGB } from "../utils/format";
import { degToRad } from "../utils/math";

export class LightIcon {
    readonly mesh: THREE.Group;
    private iconMesh: THREE.Mesh;
    private beamPreview: THREE.Line;
    private selectionRing: THREE.Line;
    private selected: boolean = false;
    private light: LightFixture;
    private ceilingHeight: number;

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
    }

    private createIconMesh(): THREE.Mesh {
        const geometry = new THREE.CircleGeometry(0.3, 16);
        const rgb = kelvinToRGB(this.light.properties.warmth);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(rgb.r, rgb.g, rgb.b),
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.lightId = this.light.id;
        return mesh;
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

        this.beamPreview.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    }

    setSelected(selected: boolean): void {
        this.selected = selected;

        // Show/hide selection ring
        this.selectionRing.visible = selected;

        // Update beam preview appearance
        const lineMaterial = this.beamPreview.material as THREE.LineBasicMaterial;
        if (selected) {
            lineMaterial.color.setHex(0x00aaff);
            lineMaterial.opacity = 1;
        } else {
            lineMaterial.color.setHex(0x888888);
            lineMaterial.opacity = 0.5;
        }
    }

    isSelected(): boolean {
        return this.selected;
    }

    getLightId(): string {
        return this.light.id;
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

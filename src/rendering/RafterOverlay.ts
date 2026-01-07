import * as THREE from "three";
import type { BoundingBox, RafterConfig } from "../types";

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
        while (this.rafterGroup.children.length > 0) {
            const child = this.rafterGroup.children[0];
            this.rafterGroup.remove(child);
            if (child instanceof THREE.Line) {
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            }
        }

        if (!this.config.visible) return;

        const material = new THREE.LineBasicMaterial({
            color: 0x8b4513,
            transparent: true,
            opacity: 0.4,
        });

        if (this.config.orientation === "horizontal") {
            const startY =
                Math.ceil((bounds.minY - this.config.offsetY) / this.config.spacing) * this.config.spacing +
                this.config.offsetY;

            for (let y = startY; y <= bounds.maxY; y += this.config.spacing) {
                const points = [new THREE.Vector3(bounds.minX, y, 0.01), new THREE.Vector3(bounds.maxX, y, 0.01)];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, material.clone());
                this.rafterGroup.add(line);
            }
        } else {
            const startX =
                Math.ceil((bounds.minX - this.config.offsetX) / this.config.spacing) * this.config.spacing +
                this.config.offsetX;

            for (let x = startX; x <= bounds.maxX; x += this.config.spacing) {
                const points = [new THREE.Vector3(x, bounds.minY, 0.01), new THREE.Vector3(x, bounds.maxY, 0.01)];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, material.clone());
                this.rafterGroup.add(line);
            }
        }
    }

    setVisible(visible: boolean): void {
        this.config.visible = visible;
        this.rafterGroup.visible = visible;
    }

    dispose(): void {
        while (this.rafterGroup.children.length > 0) {
            const child = this.rafterGroup.children[0];
            this.rafterGroup.remove(child);
            if (child instanceof THREE.Line) {
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            }
        }
        this.scene.remove(this.rafterGroup);
    }
}

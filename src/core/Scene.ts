import * as THREE from "three";
import type { BoundingBox } from "../types";

export class Scene {
    readonly scene: THREE.Scene;
    readonly camera: THREE.OrthographicCamera;
    readonly renderer: THREE.WebGLRenderer;

    private container: HTMLElement;
    private zoom: number = 1;
    private panOffset: THREE.Vector2 = new THREE.Vector2(0, 0);

    constructor(container: HTMLElement) {
        this.container = container;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);

        const aspect = container.clientWidth / container.clientHeight;
        const frustumSize = 20;
        this.camera = new THREE.OrthographicCamera(
            (-frustumSize * aspect) / 2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000,
        );
        this.camera.position.z = 10;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        this.setupResizeHandler();
        this.addGrid();
    }

    private setupResizeHandler(): void {
        const resizeObserver = new ResizeObserver(() => {
            this.handleResize();
        });
        resizeObserver.observe(this.container);
    }

    private handleResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        const frustumSize = 20 / this.zoom;

        this.camera.left = (-frustumSize * aspect) / 2 + this.panOffset.x;
        this.camera.right = (frustumSize * aspect) / 2 + this.panOffset.x;
        this.camera.top = frustumSize / 2 + this.panOffset.y;
        this.camera.bottom = -frustumSize / 2 + this.panOffset.y;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    private addGrid(): void {
        const gridHelper = new THREE.GridHelper(100, 100, 0xcccccc, 0xe0e0e0);
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.position.z = -0.1;
        this.scene.add(gridHelper);
    }

    setZoom(zoom: number): void {
        this.zoom = Math.max(0.1, Math.min(10, zoom));
        this.handleResize();
    }

    getZoom(): number {
        return this.zoom;
    }

    pan(dx: number, dy: number): void {
        const scale = 20 / this.zoom;
        this.panOffset.x += dx * scale * 0.002;
        this.panOffset.y += dy * scale * 0.002;
        this.handleResize();
    }

    resetView(): void {
        this.zoom = 1;
        this.panOffset.set(0, 0);
        this.handleResize();
    }

    fitToBounds(bounds: BoundingBox, padding: number = 1.2): void {
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumWidth = Math.max(width, height * aspect) * padding;

        this.zoom = 20 / frustumWidth;
        this.panOffset.set(centerX, centerY);
        this.handleResize();
    }

    screenToWorld(screenX: number, screenY: number): THREE.Vector2 {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;

        const worldX = x * ((this.camera.right - this.camera.left) / 2) + (this.camera.right + this.camera.left) / 2;
        const worldY = y * ((this.camera.top - this.camera.bottom) / 2) + (this.camera.top + this.camera.bottom) / 2;

        return new THREE.Vector2(worldX, worldY);
    }

    render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    dispose(): void {
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    get domElement(): HTMLCanvasElement {
        return this.renderer.domElement;
    }
}

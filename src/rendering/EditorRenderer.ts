import * as THREE from "three";
import type { Vector2, WallSegment, LightFixture, UnitFormat } from "../types";
import type { SnapGuide } from "../controllers/SnapController";
import { LightIcon } from "../lighting/LightIcon";
import { getAllDimensionLabels } from "../geometry/DimensionLabel";
import { MeasurementRenderer } from "./MeasurementRenderer";
import { distancePointToSegment } from "../utils/math";

/**
 * Handles rendering of the 2D editor view including walls, vertices,
 * lights, snap guides, and measurement tools.
 */
export class EditorRenderer {
    private scene: THREE.Scene;
    private wallsGroup: THREE.Group;
    private labelsGroup: THREE.Group;
    private lightsGroup: THREE.Group;
    private phantomLine: THREE.Line | null = null;
    private drawingVerticesGroup: THREE.Group;
    private snapGuidesGroup: THREE.Group;
    private measurementRenderer: MeasurementRenderer;
    private lightIcons: Map<string, LightIcon> = new Map();
    private vertexMeshes: THREE.Mesh[] = [];
    private currentUnitFormat: UnitFormat = "feet-inches";
    private currentWalls: WallSegment[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        this.wallsGroup = new THREE.Group();
        this.labelsGroup = new THREE.Group();
        this.lightsGroup = new THREE.Group();
        this.drawingVerticesGroup = new THREE.Group();
        this.snapGuidesGroup = new THREE.Group();
        this.measurementRenderer = new MeasurementRenderer(scene);

        this.scene.add(this.wallsGroup);
        this.scene.add(this.labelsGroup);
        this.scene.add(this.lightsGroup);
        this.scene.add(this.drawingVerticesGroup);
        this.scene.add(this.snapGuidesGroup);
    }

    // ============================================
    // Wall Rendering
    // ============================================

    updateWalls(
        walls: WallSegment[],
        selectedWallId: string | null = null,
        selectedVertexIndex: number | null = null,
    ): void {
        this.clearGroup(this.wallsGroup);
        this.disposeVertexMeshes();

        const vertexList = this.buildVertexList(walls);

        this.renderWallLines(walls, selectedWallId);
        this.renderVertices(vertexList, selectedVertexIndex);
        this.updateLabels(walls);
    }

    private buildVertexList(walls: WallSegment[]): Array<{ x: number; y: number; index: number }> {
        return walls.map((wall, index) => ({
            x: wall.start.x,
            y: wall.start.y,
            index,
        }));
    }

    private renderWallLines(walls: WallSegment[], selectedWallId: string | null): void {
        for (const wall of walls) {
            const isSelected = wall.id === selectedWallId;
            const points = [
                new THREE.Vector3(wall.start.x, wall.start.y, 0),
                new THREE.Vector3(wall.end.x, wall.end.y, 0),
            ];

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: isSelected ? 0x0066cc : 0x000000,
                linewidth: isSelected ? 3 : 2,
            });
            const line = new THREE.Line(geometry, material);
            line.userData.wallId = wall.id;
            this.wallsGroup.add(line);
        }
    }

    private renderVertices(
        vertexList: Array<{ x: number; y: number; index: number }>,
        selectedVertexIndex: number | null,
    ): void {
        for (const vertex of vertexList) {
            const isSelected = vertex.index === selectedVertexIndex;
            const geometry = new THREE.CircleGeometry(isSelected ? 0.2 : 0.1, 16);
            const material = new THREE.MeshBasicMaterial({
                color: isSelected ? 0x00aa00 : 0x333333,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(vertex.x, vertex.y, 0.05);
            mesh.userData.vertexIndex = vertex.index;
            this.wallsGroup.add(mesh);
            this.vertexMeshes.push(mesh);
        }
    }

    private disposeVertexMeshes(): void {
        for (const mesh of this.vertexMeshes) {
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        }
        this.vertexMeshes = [];
    }

    // ============================================
    // Wall Hit Testing
    // ============================================

    getWallAtPosition(pos: Vector2, walls: WallSegment[], tolerance: number = 0.3): WallSegment | null {
        for (const wall of walls) {
            const dist = distancePointToSegment(pos, wall.start, wall.end);
            if (dist <= tolerance) {
                return wall;
            }
        }
        return null;
    }

    // ============================================
    // Labels
    // ============================================

    private updateLabels(walls: WallSegment[]): void {
        this.currentWalls = walls;
        this.clearGroup(this.labelsGroup, true);

        const labels = getAllDimensionLabels(walls, {
            offset: 0.5,
            unitFormat: this.currentUnitFormat,
        });

        for (const label of labels) {
            const sprite = this.createTextSprite(label.text);
            sprite.position.set(label.position.x, label.position.y, 0.2);
            this.labelsGroup.add(sprite);
        }
    }

    setUnitFormat(format: UnitFormat): void {
        if (this.currentUnitFormat !== format) {
            this.currentUnitFormat = format;
            this.updateLabels(this.currentWalls);
            this.measurementRenderer.setUnitFormat(format);
        }
    }

    private createTextSprite(text: string): THREE.Sprite {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;

        const fontSize = 24;
        const padding = 12;
        context.font = `${fontSize}px Arial`;
        const textWidth = context.measureText(text).width;

        canvas.width = Math.ceil(textWidth + padding * 2);
        canvas.height = fontSize + padding;

        context.font = `${fontSize}px Arial`;
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = "black";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);

        const aspectRatio = canvas.width / canvas.height;
        sprite.scale.set(aspectRatio * 0.5, 0.5, 1);

        return sprite;
    }

    // ============================================
    // Phantom Line (Drawing Preview)
    // ============================================

    setPhantomLine(start: Vector2 | null, end: Vector2 | null): void {
        if (this.phantomLine) {
            this.scene.remove(this.phantomLine);
            this.phantomLine.geometry.dispose();
            (this.phantomLine.material as THREE.Material).dispose();
            this.phantomLine = null;
        }

        if (start && end) {
            const points = [new THREE.Vector3(start.x, start.y, 0), new THREE.Vector3(end.x, end.y, 0)];

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineDashedMaterial({
                color: 0x0066cc,
                dashSize: 0.3,
                gapSize: 0.15,
            });

            this.phantomLine = new THREE.Line(geometry, material);
            this.phantomLine.computeLineDistances();
            this.scene.add(this.phantomLine);
        }
    }

    // ============================================
    // Drawing Vertices (During Wall Creation)
    // ============================================

    updateDrawingVertices(vertices: Vector2[]): void {
        this.clearGroup(this.drawingVerticesGroup);

        if (vertices.length === 0) return;

        this.renderDrawingVertexMarkers(vertices);

        if (vertices.length >= 2) {
            this.renderDrawingVertexLines(vertices);
        }
    }

    private renderDrawingVertexMarkers(vertices: Vector2[]): void {
        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];
            const isStart = i === 0;
            const geometry = new THREE.CircleGeometry(isStart ? 0.15 : 0.1, 16);
            const material = new THREE.MeshBasicMaterial({
                color: isStart ? 0x00aa00 : 0x0066cc,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(v.x, v.y, 0.1);
            this.drawingVerticesGroup.add(mesh);
        }
    }

    private renderDrawingVertexLines(vertices: Vector2[]): void {
        for (let i = 0; i < vertices.length - 1; i++) {
            const points = [
                new THREE.Vector3(vertices[i].x, vertices[i].y, 0.05),
                new THREE.Vector3(vertices[i + 1].x, vertices[i + 1].y, 0.05),
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x0066cc });
            const line = new THREE.Line(geometry, material);
            this.drawingVerticesGroup.add(line);
        }
    }

    // ============================================
    // Lights
    // ============================================

    updateLights(lights: LightFixture[], ceilingHeight: number, selectedId: string | null): void {
        const currentIds = new Set(lights.map((l) => l.id));

        // Remove lights that no longer exist
        for (const [id, icon] of this.lightIcons) {
            if (!currentIds.has(id)) {
                this.lightsGroup.remove(icon.mesh);
                icon.dispose();
                this.lightIcons.delete(id);
            }
        }

        // Add or update lights
        for (const light of lights) {
            let icon = this.lightIcons.get(light.id);

            if (!icon) {
                icon = new LightIcon(light, ceilingHeight);
                this.lightIcons.set(light.id, icon);
                this.lightsGroup.add(icon.mesh);
            } else {
                icon.updateProperties(light, ceilingHeight);
            }

            icon.setSelected(light.id === selectedId);
        }
    }

    setLightsVisible(visible: boolean): void {
        this.lightsGroup.visible = visible;
    }

    // ============================================
    // Snap Guides
    // ============================================

    setSnapGuides(guides: SnapGuide[]): void {
        this.clearGroup(this.snapGuidesGroup);

        for (const guide of guides) {
            const points = [
                new THREE.Vector3(guide.from.x, guide.from.y, 0.15),
                new THREE.Vector3(guide.to.x, guide.to.y, 0.15),
            ];

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineDashedMaterial({
                color: guide.axis === "x" ? 0xff6600 : 0x0066ff,
                dashSize: 0.2,
                gapSize: 0.1,
            });

            const line = new THREE.Line(geometry, material);
            line.computeLineDistances();
            this.snapGuidesGroup.add(line);
        }
    }

    // ============================================
    // Measurement
    // ============================================

    setMeasurementLine(from: Vector2 | null, to: Vector2 | null): void {
        this.measurementRenderer.render(from, to);
    }

    // ============================================
    // Visibility
    // ============================================

    setVisible(visible: boolean): void {
        this.wallsGroup.visible = visible;
        this.labelsGroup.visible = visible;
        this.lightsGroup.visible = visible;
        this.drawingVerticesGroup.visible = visible;
        this.snapGuidesGroup.visible = visible;
        this.measurementRenderer.setVisible(visible);
        if (this.phantomLine) {
            this.phantomLine.visible = visible;
        }
    }

    // ============================================
    // Utilities
    // ============================================

    private clearGroup(group: THREE.Group, isSprites: boolean = false): void {
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child);

            if (isSprites && child instanceof THREE.Sprite) {
                child.material.map?.dispose();
                child.material.dispose();
            } else if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            }
        }
    }

    dispose(): void {
        for (const icon of this.lightIcons.values()) {
            icon.dispose();
        }
        this.lightIcons.clear();
        this.measurementRenderer.dispose();
    }
}

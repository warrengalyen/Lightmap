import * as THREE from "three";
import type { Vector2, WallSegment, LightFixture, UnitFormat } from "../types";
import { LightIcon } from "../lighting/LightIcon";
import { getAllDimensionLabels } from "../geometry/DimensionLabel";
import { formatImperial } from "../utils/format";

interface SnapGuide {
    axis: "x" | "y";
    value: number;
    from: Vector2;
    to: Vector2;
}

export class EditorRenderer {
    private scene: THREE.Scene;
    private wallsGroup: THREE.Group;
    private labelsGroup: THREE.Group;
    private lightsGroup: THREE.Group;
    private phantomLine: THREE.Line | null = null;
    private drawingVerticesGroup: THREE.Group;
    private snapGuidesGroup: THREE.Group;
    private measurementGroup: THREE.Group;
    private lightIcons: Map<string, LightIcon> = new Map();
    private vertexMeshes: THREE.Mesh[] = [];
    private currentUnitFormat: UnitFormat = "feet-inches";
    private currentWalls: WallSegment[] = [];
    private currentMeasurement: { from: Vector2; to: Vector2 } | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        this.wallsGroup = new THREE.Group();
        this.labelsGroup = new THREE.Group();
        this.lightsGroup = new THREE.Group();
        this.drawingVerticesGroup = new THREE.Group();
        this.snapGuidesGroup = new THREE.Group();
        this.measurementGroup = new THREE.Group();

        this.scene.add(this.wallsGroup);
        this.scene.add(this.labelsGroup);
        this.scene.add(this.lightsGroup);
        this.scene.add(this.drawingVerticesGroup);
        this.scene.add(this.snapGuidesGroup);
        this.scene.add(this.measurementGroup);
    }

    updateWalls(
        walls: WallSegment[],
        selectedWallId: string | null = null,
        selectedVertexIndex: number | null = null,
    ): void {
        while (this.wallsGroup.children.length > 0) {
            const child = this.wallsGroup.children[0];
            this.wallsGroup.remove(child);
            if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            }
        }

        for (const mesh of this.vertexMeshes) {
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        }
        this.vertexMeshes = [];

        // Build vertex list with indices
        const vertexList: { x: number; y: number; index: number }[] = [];
        for (let i = 0; i < walls.length; i++) {
            vertexList.push({ x: walls[i].start.x, y: walls[i].start.y, index: i });
        }

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

        // Draw vertices with selection highlighting
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

        this.updateLabels(walls);
    }

    getWallAtPosition(pos: Vector2, walls: WallSegment[], tolerance: number = 0.3): WallSegment | null {
        for (const wall of walls) {
            const dist = this.distanceToSegment(pos, wall.start, wall.end);
            if (dist <= tolerance) {
                return wall;
            }
        }
        return null;
    }

    private distanceToSegment(point: Vector2, segStart: Vector2, segEnd: Vector2): number {
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq === 0) {
            return Math.sqrt(Math.pow(point.x - segStart.x, 2) + Math.pow(point.y - segStart.y, 2));
        }

        let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));

        const projX = segStart.x + t * dx;
        const projY = segStart.y + t * dy;

        return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
    }

    private updateLabels(walls: WallSegment[]): void {
        this.currentWalls = walls;

        while (this.labelsGroup.children.length > 0) {
            const child = this.labelsGroup.children[0];
            this.labelsGroup.remove(child);
            if (child instanceof THREE.Sprite) {
                child.material.map?.dispose();
                child.material.dispose();
            }
        }

        const labels = getAllDimensionLabels(walls, { offset: 0.5, unitFormat: this.currentUnitFormat });

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
            // Re-render measurement line with new unit format
            if (this.currentMeasurement) {
                this.setMeasurementLine(this.currentMeasurement.from, this.currentMeasurement.to);
            }
        }
    }

    private createTextSprite(text: string): THREE.Sprite {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;

        // Measure text to size canvas appropriately
        const fontSize = 24;
        const padding = 12;
        context.font = `${fontSize}px Arial`;
        const textWidth = context.measureText(text).width;

        canvas.width = Math.ceil(textWidth + padding * 2);
        canvas.height = fontSize + padding;

        // Redraw with correct canvas size
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

        // Scale sprite based on canvas aspect ratio
        const aspectRatio = canvas.width / canvas.height;
        sprite.scale.set(aspectRatio * 0.5, 0.5, 1);

        return sprite;
    }

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

    updateDrawingVertices(vertices: Vector2[]): void {
        // Clear existing drawing vertices
        while (this.drawingVerticesGroup.children.length > 0) {
            const child = this.drawingVerticesGroup.children[0];
            this.drawingVerticesGroup.remove(child);
            if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            }
        }

        if (vertices.length === 0) return;

        // Draw vertex markers
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

        // Draw lines between placed vertices
        if (vertices.length >= 2) {
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
    }

    updateLights(lights: LightFixture[], ceilingHeight: number, selectedId: string | null): void {
        const currentIds = new Set(lights.map((l) => l.id));

        for (const [id, icon] of this.lightIcons) {
            if (!currentIds.has(id)) {
                this.lightsGroup.remove(icon.mesh);
                icon.dispose();
                this.lightIcons.delete(id);
            }
        }

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

    setVisible(visible: boolean): void {
        this.wallsGroup.visible = visible;
        this.labelsGroup.visible = visible;
        this.lightsGroup.visible = visible;
        this.drawingVerticesGroup.visible = visible;
        this.snapGuidesGroup.visible = visible;
        this.measurementGroup.visible = visible;
        if (this.phantomLine) {
            this.phantomLine.visible = visible;
        }
    }

    setLightsVisible(visible: boolean): void {
        this.lightsGroup.visible = visible;
    }

    setSnapGuides(guides: SnapGuide[]): void {
        // Clear existing guides
        while (this.snapGuidesGroup.children.length > 0) {
            const child = this.snapGuidesGroup.children[0];
            this.snapGuidesGroup.remove(child);
            if (child instanceof THREE.Line) {
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            }
        }

        // Draw new guides
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

    setMeasurementLine(from: Vector2 | null, to: Vector2 | null): void {
        // Store current measurement for re-rendering on unit format change
        this.currentMeasurement = from && to ? { from, to } : null;

        // Clear existing measurement
        while (this.measurementGroup.children.length > 0) {
            const child = this.measurementGroup.children[0];
            this.measurementGroup.remove(child);
            if (child instanceof THREE.Line || child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
                if (child instanceof THREE.Sprite) {
                    child.material.map?.dispose();
                }
                if ("geometry" in child) {
                    child.geometry.dispose();
                }
                (child.material as THREE.Material).dispose();
            }
        }

        if (!from || !to) return;

        const z = 0.2;
        const deltaX = Math.abs(to.x - from.x);
        const deltaY = Math.abs(to.y - from.y);

        // Draw diagonal line (main measurement)
        const diagonalPoints = [new THREE.Vector3(from.x, from.y, z), new THREE.Vector3(to.x, to.y, z)];
        const diagonalGeom = new THREE.BufferGeometry().setFromPoints(diagonalPoints);
        const diagonalMat = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
        const diagonalLine = new THREE.Line(diagonalGeom, diagonalMat);
        this.measurementGroup.add(diagonalLine);

        // Draw X component (horizontal dashed line)
        if (deltaX > 0.1) {
            const xPoints = [new THREE.Vector3(from.x, from.y, z), new THREE.Vector3(to.x, from.y, z)];
            const xGeom = new THREE.BufferGeometry().setFromPoints(xPoints);
            const xMat = new THREE.LineDashedMaterial({
                color: 0xff6600,
                dashSize: 0.15,
                gapSize: 0.1,
            });
            const xLine = new THREE.Line(xGeom, xMat);
            xLine.computeLineDistances();
            this.measurementGroup.add(xLine);

            // X label
            const xLabel = this.createMeasurementLabel(
                formatImperial(deltaX, { format: this.currentUnitFormat }),
                0xff6600,
            );
            xLabel.position.set((from.x + to.x) / 2, from.y - 0.4, z + 0.01);
            this.measurementGroup.add(xLabel);
        }

        // Draw Y component (vertical dashed line)
        if (deltaY > 0.1) {
            const yPoints = [new THREE.Vector3(to.x, from.y, z), new THREE.Vector3(to.x, to.y, z)];
            const yGeom = new THREE.BufferGeometry().setFromPoints(yPoints);
            const yMat = new THREE.LineDashedMaterial({
                color: 0x0066ff,
                dashSize: 0.15,
                gapSize: 0.1,
            });
            const yLine = new THREE.Line(yGeom, yMat);
            yLine.computeLineDistances();
            this.measurementGroup.add(yLine);

            // Y label
            const yLabel = this.createMeasurementLabel(
                formatImperial(deltaY, { format: this.currentUnitFormat }),
                0x0066ff,
            );
            yLabel.position.set(to.x + 0.5, (from.y + to.y) / 2, z + 0.01);
            this.measurementGroup.add(yLabel);
        }

        // Draw endpoint markers
        for (const point of [from, to]) {
            const markerGeom = new THREE.CircleGeometry(0.15, 16);
            const markerMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
            const marker = new THREE.Mesh(markerGeom, markerMat);
            marker.position.set(point.x, point.y, z + 0.01);
            this.measurementGroup.add(marker);
        }
    }

    private createMeasurementLabel(text: string, color: number): THREE.Sprite {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;

        const fontSize = 20;
        const padding = 6;
        context.font = `bold ${fontSize}px Arial`;
        const textWidth = context.measureText(text).width;

        canvas.width = Math.ceil(textWidth + padding * 2);
        canvas.height = fontSize + padding;

        // Draw background
        context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw text
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = "white";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);

        const aspectRatio = canvas.width / canvas.height;
        sprite.scale.set(aspectRatio * 0.4, 0.4, 1);

        return sprite;
    }

    dispose(): void {
        for (const icon of this.lightIcons.values()) {
            icon.dispose();
        }
        this.lightIcons.clear();
    }
}

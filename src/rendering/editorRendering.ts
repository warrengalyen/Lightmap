import * as THREE from "three";
import type { Vector2, WallSegment } from "../types";
import type { SnapGuide } from "../controllers/SnapController";
import {
    VERTEX_RADIUS_SELECTED,
    VERTEX_RADIUS_DEFAULT,
    DRAWING_VERTEX_START_RADIUS,
    DRAWING_VERTEX_RADIUS,
} from "../constants/editor";

/**
 * Pure rendering functions for editor geometry.
 * These functions create THREE.js objects without side effects.
 */

export function createWallLine(wall: WallSegment, isSelected: boolean): THREE.Line {
    const points = [new THREE.Vector3(wall.start.x, wall.start.y, 0), new THREE.Vector3(wall.end.x, wall.end.y, 0)];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: isSelected ? 0xffff00 : 0xffffff,
        linewidth: isSelected ? 5 : 4,
    });
    const line = new THREE.Line(geometry, material);
    line.userData.wallId = wall.id;
    return line;
}

export function createVertexCircle(pos: Vector2, index: number, isSelected: boolean): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(isSelected ? VERTEX_RADIUS_SELECTED : VERTEX_RADIUS_DEFAULT, 16);
    const material = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xffff00 : 0xffffff,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y, 0.05);
    mesh.userData.vertexIndex = index;
    return mesh;
}

export function createPhantomLine(start: Vector2, end: Vector2): THREE.Line {
    const points = [new THREE.Vector3(start.x, start.y, 0), new THREE.Vector3(end.x, end.y, 0)];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color: 0x0066cc,
        dashSize: 0.3,
        gapSize: 0.15,
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
}

export function createDrawingVertex(pos: Vector2, isStart: boolean): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(isStart ? DRAWING_VERTEX_START_RADIUS : DRAWING_VERTEX_RADIUS, 16);
    const material = new THREE.MeshBasicMaterial({
        color: isStart ? 0x00aa00 : 0x0066cc,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y, 0.1);
    return mesh;
}

export function createDrawingLine(start: Vector2, end: Vector2): THREE.Line {
    const points = [new THREE.Vector3(start.x, start.y, 0.05), new THREE.Vector3(end.x, end.y, 0.05)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x0066cc });
    return new THREE.Line(geometry, material);
}

export function createSnapGuideLine(guide: SnapGuide): THREE.Line {
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
    return line;
}

export function createSelectionBox(start: Vector2, end: Vector2): THREE.Line {
    // Create a rectangle from the two corners
    const points = [
        new THREE.Vector3(start.x, start.y, 0.2),
        new THREE.Vector3(end.x, start.y, 0.2),
        new THREE.Vector3(end.x, end.y, 0.2),
        new THREE.Vector3(start.x, end.y, 0.2),
        new THREE.Vector3(start.x, start.y, 0.2), // Close the loop
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color: 0x0088ff,
        dashSize: 0.2,
        gapSize: 0.1,
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
}

export function createDimensionLabel(text: string): THREE.Sprite {
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

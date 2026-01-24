import type { Vector2, WallSegment, SnapResult } from '../types';
import { SnapEngine } from './SnapEngine';
import { generateId } from '../utils/id';
import { distancePointToPoint, vectorSubtract, vectorNormalize, vectorScale, vectorAdd } from '../utils/math';
import { MIN_WALL_LENGTH_FT, MIN_SEGMENT_LENGTH_FT } from '../constants/editor';

export class WallBuilder {
  private vertices: Vector2[] = [];
  private isDrawing = false;
  private manualLength: number | null = null;
  private snapEngine: SnapEngine;
  private currentSnapResult: SnapResult | null = null;

  constructor() {
    this.snapEngine = new SnapEngine();
  }

  startDrawing(point: Vector2): void {
    this.vertices = [point];
    this.isDrawing = true;
    this.manualLength = null;
    this.currentSnapResult = null;
  }

  get drawing(): boolean {
    return this.isDrawing;
  }

  get vertexCount(): number {
    return this.vertices.length;
  }

  get startVertex(): Vector2 | null {
    return this.vertices.length > 0 ? this.vertices[0] : null;
  }

  get lastVertex(): Vector2 | null {
    return this.vertices.length > 0 ? this.vertices[this.vertices.length - 1] : null;
  }

  get currentSnap(): SnapResult | null {
    return this.currentSnapResult;
  }

  getVertices(): Vector2[] {
    return [...this.vertices];
  }

  continueDrawing(mousePos: Vector2): Vector2 {
    if (!this.isDrawing || this.vertices.length === 0) {
      return mousePos;
    }

    const anchor = this.vertices[this.vertices.length - 1];
    const prevDir = this.getPreviousSegmentDirection();
    const startVertex = this.vertices.length >= 3 ? this.vertices[0] : null;

    this.currentSnapResult = this.snapEngine.snapToConstraint(prevDir, mousePos, startVertex, anchor);
    let snappedPos = this.currentSnapResult.snappedPos;

    if (this.manualLength !== null && this.currentSnapResult.snapType !== 'closure') {
      const dir = vectorNormalize(vectorSubtract(snappedPos, anchor));
      snappedPos = vectorAdd(anchor, vectorScale(dir, this.manualLength));
    }

    return snappedPos;
  }

  placeVertex(point: Vector2): WallSegment | null {
    if (!this.isDrawing || this.vertices.length === 0) {
      return null;
    }

    const start = this.vertices[this.vertices.length - 1];
    const length = distancePointToPoint(start, point);

    if (length < MIN_WALL_LENGTH_FT) {
      return null;
    }

    const segment: WallSegment = {
      id: generateId(),
      start: { ...start },
      end: { ...point },
      length,
    };

    this.vertices.push(point);
    this.manualLength = null;

    return segment;
  }

  setManualLength(length: number): void {
    this.manualLength = length > 0 ? length : null;
  }

  clearManualLength(): void {
    this.manualLength = null;
  }

  getManualLength(): number | null {
    return this.manualLength;
  }

  closeLoop(): WallSegment[] | null {
    if (!this.isDrawing || this.vertices.length < 3) {
      return null;
    }

    const segments: WallSegment[] = [];

    for (let i = 0; i < this.vertices.length; i++) {
      const start = this.vertices[i];
      const end = this.vertices[(i + 1) % this.vertices.length];
      const length = distancePointToPoint(start, end);

      if (length > MIN_SEGMENT_LENGTH_FT) {
        segments.push({
          id: generateId(),
          start: { ...start },
          end: { ...end },
          length,
        });
      }
    }

    this.reset();
    return segments;
  }

  cancel(): void {
    this.reset();
  }

  private reset(): void {
    this.vertices = [];
    this.isDrawing = false;
    this.manualLength = null;
    this.currentSnapResult = null;
  }

  private getPreviousSegmentDirection(): Vector2 | null {
    if (this.vertices.length < 2) {
      return null;
    }

    const prev = this.vertices[this.vertices.length - 2];
    const current = this.vertices[this.vertices.length - 1];
    return vectorNormalize(vectorSubtract(current, prev));
  }
}

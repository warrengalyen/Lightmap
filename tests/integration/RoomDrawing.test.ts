import { describe, it, expect, beforeEach } from 'vitest';
import { WallBuilder } from '../../src/geometry/WallBuilder';
import { PolygonValidator } from '../../src/geometry/PolygonValidator';
import { SnapEngine } from '../../src/geometry/SnapEngine';
import type { Vector2 } from '../../src/types';

describe('Room Drawing Integration', () => {
  let wallBuilder: WallBuilder;
  let validator: PolygonValidator;
  let snapEngine: SnapEngine;

  beforeEach(() => {
    wallBuilder = new WallBuilder();
    validator = new PolygonValidator();
    snapEngine = new SnapEngine();
  });

  it('completes full rectangular room drawing workflow', () => {
    wallBuilder.startDrawing({ x: 0, y: 0 });

    wallBuilder.placeVertex({ x: 10, y: 0 });
    wallBuilder.placeVertex({ x: 10, y: 12 });
    wallBuilder.placeVertex({ x: 0, y: 12 });

    const walls = wallBuilder.closeLoop();

    expect(walls).not.toBeNull();
    expect(walls!.length).toBe(4);
    expect(validator.isValid(walls!)).toBe(true);
    expect(validator.getArea(walls!)).toBe(120);
  });

  it('uses snap engine for perpendicular walls', () => {
    wallBuilder.startDrawing({ x: 0, y: 0 });
    wallBuilder.placeVertex({ x: 10, y: 0 });

    const mousePos: Vector2 = { x: 10.3, y: 8 };
    const anchor = wallBuilder.lastVertex!;
    const prevDir = { x: 1, y: 0 };

    const snapResult = snapEngine.snapToConstraint(prevDir, mousePos, null, anchor);
    expect(snapResult.snapType).toBe('perpendicular');
    expect(snapResult.snappedPos.x).toBeCloseTo(10, 1);
  });

  it('detects closure snap when near start vertex', () => {
    wallBuilder.startDrawing({ x: 0, y: 0 });
    wallBuilder.placeVertex({ x: 10, y: 0 });
    wallBuilder.placeVertex({ x: 10, y: 10 });
    wallBuilder.placeVertex({ x: 0, y: 10 });

    const mousePos: Vector2 = { x: 0.3, y: 0.3 };
    const startVertex = wallBuilder.startVertex!;
    const anchor = wallBuilder.lastVertex!;

    const snapResult = snapEngine.snapToConstraint(null, mousePos, startVertex, anchor);
    expect(snapResult.snapType).toBe('closure');
  });

  it('creates valid L-shaped room', () => {
    wallBuilder.startDrawing({ x: 0, y: 0 });
    wallBuilder.placeVertex({ x: 20, y: 0 });
    wallBuilder.placeVertex({ x: 20, y: 10 });
    wallBuilder.placeVertex({ x: 10, y: 10 });
    wallBuilder.placeVertex({ x: 10, y: 20 });
    wallBuilder.placeVertex({ x: 0, y: 20 });

    const walls = wallBuilder.closeLoop();

    expect(walls).not.toBeNull();
    expect(walls!.length).toBe(6);
    expect(validator.isValid(walls!)).toBe(true);
    expect(validator.isConvex(walls!)).toBe(false);
  });

  it('supports manual length constraint', () => {
    wallBuilder.startDrawing({ x: 0, y: 0 });
    wallBuilder.setManualLength(15);

    const snappedPos = wallBuilder.continueDrawing({ x: 100, y: 0 });

    expect(snappedPos.x).toBeCloseTo(15, 1);
    expect(snappedPos.y).toBeCloseTo(0, 1);
  });

  it('calculates correct wall lengths', () => {
    wallBuilder.startDrawing({ x: 0, y: 0 });

    const segment1 = wallBuilder.placeVertex({ x: 10, y: 0 });
    const segment2 = wallBuilder.placeVertex({ x: 10, y: 12 });
    const segment3 = wallBuilder.placeVertex({ x: 0, y: 12 });
    const walls = wallBuilder.closeLoop();

    expect(segment1?.length).toBe(10);
    expect(segment2?.length).toBe(12);
    expect(segment3?.length).toBe(10);
    expect(walls![3].length).toBe(12);
  });

  it('cancels drawing without creating walls', () => {
    wallBuilder.startDrawing({ x: 0, y: 0 });
    wallBuilder.placeVertex({ x: 10, y: 0 });
    wallBuilder.placeVertex({ x: 10, y: 10 });

    wallBuilder.cancel();

    expect(wallBuilder.drawing).toBe(false);
    expect(wallBuilder.vertexCount).toBe(0);
  });

  it('requires minimum 3 vertices to close', () => {
    wallBuilder.startDrawing({ x: 0, y: 0 });
    wallBuilder.placeVertex({ x: 10, y: 0 });

    const walls = wallBuilder.closeLoop();
    expect(walls).toBeNull();
  });
});

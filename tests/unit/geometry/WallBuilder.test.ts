import { describe, it, expect, beforeEach } from 'vitest';
import { WallBuilder } from '../../../src/geometry/WallBuilder';

describe('WallBuilder', () => {
  let builder: WallBuilder;

  beforeEach(() => {
    builder = new WallBuilder();
  });

  describe('startDrawing', () => {
    it('initializes drawing state', () => {
      builder.startDrawing({ x: 0, y: 0 });

      expect(builder.drawing).toBe(true);
      expect(builder.vertexCount).toBe(1);
      expect(builder.startVertex).toEqual({ x: 0, y: 0 });
    });
  });

  describe('placeVertex', () => {
    it('creates wall segment on vertex placement', () => {
      builder.startDrawing({ x: 0, y: 0 });
      const segment = builder.placeVertex({ x: 10, y: 0 });

      expect(segment).not.toBeNull();
      expect(segment!.length).toBe(10);
      expect(segment!.start).toEqual({ x: 0, y: 0 });
      expect(segment!.end).toEqual({ x: 10, y: 0 });
    });

    it('rejects very short segments', () => {
      builder.startDrawing({ x: 0, y: 0 });
      const segment = builder.placeVertex({ x: 0.05, y: 0 });

      expect(segment).toBeNull();
    });

    it('increments vertex count', () => {
      builder.startDrawing({ x: 0, y: 0 });
      builder.placeVertex({ x: 10, y: 0 });

      expect(builder.vertexCount).toBe(2);
    });
  });

  describe('manualLength', () => {
    it('applies manual length constraint', () => {
      builder.startDrawing({ x: 0, y: 0 });
      builder.setManualLength(12.5);

      const snapped = builder.continueDrawing({ x: 20, y: 0 });

      expect(snapped.x).toBeCloseTo(12.5, 5);
      expect(snapped.y).toBeCloseTo(0, 5);
    });

    it('preserves direction when applying manual length', () => {
      builder.startDrawing({ x: 0, y: 0 });
      builder.setManualLength(10);

      const snapped = builder.continueDrawing({ x: 7.07, y: 7.07 });

      const length = Math.sqrt(snapped.x ** 2 + snapped.y ** 2);
      expect(length).toBeCloseTo(10, 1);
    });

    it('clears manual length after placing vertex', () => {
      builder.startDrawing({ x: 0, y: 0 });
      builder.setManualLength(10);
      builder.placeVertex({ x: 10, y: 0 });

      expect(builder.getManualLength()).toBeNull();
    });
  });

  describe('closeLoop', () => {
    it('closes loop when returning to start', () => {
      builder.startDrawing({ x: 0, y: 0 });
      builder.placeVertex({ x: 10, y: 0 });
      builder.placeVertex({ x: 10, y: 10 });
      builder.placeVertex({ x: 0, y: 10 });

      const walls = builder.closeLoop();

      expect(walls).not.toBeNull();
      expect(walls!.length).toBe(4);
    });

    it('returns null if less than 3 vertices', () => {
      builder.startDrawing({ x: 0, y: 0 });
      builder.placeVertex({ x: 10, y: 0 });

      const walls = builder.closeLoop();

      expect(walls).toBeNull();
    });

    it('resets state after closing', () => {
      builder.startDrawing({ x: 0, y: 0 });
      builder.placeVertex({ x: 10, y: 0 });
      builder.placeVertex({ x: 10, y: 10 });
      builder.placeVertex({ x: 0, y: 10 });
      builder.closeLoop();

      expect(builder.drawing).toBe(false);
      expect(builder.vertexCount).toBe(0);
    });
  });

  describe('cancel', () => {
    it('resets all state', () => {
      builder.startDrawing({ x: 0, y: 0 });
      builder.placeVertex({ x: 10, y: 0 });
      builder.setManualLength(5);
      builder.cancel();

      expect(builder.drawing).toBe(false);
      expect(builder.vertexCount).toBe(0);
      expect(builder.getManualLength()).toBeNull();
    });
  });

  describe('getVertices', () => {
    it('returns copy of vertices array', () => {
      builder.startDrawing({ x: 0, y: 0 });
      builder.placeVertex({ x: 10, y: 0 });
      builder.placeVertex({ x: 10, y: 10 });

      const vertices = builder.getVertices();

      expect(vertices.length).toBe(3);
      expect(vertices[0]).toEqual({ x: 0, y: 0 });
      expect(vertices[1]).toEqual({ x: 10, y: 0 });
      expect(vertices[2]).toEqual({ x: 10, y: 10 });
    });
  });
});

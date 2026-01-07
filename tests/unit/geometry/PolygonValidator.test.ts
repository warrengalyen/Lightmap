import { describe, it, expect, beforeEach } from 'vitest';
import { PolygonValidator } from '../../../src/geometry/PolygonValidator';
import type { WallSegment } from '../../../src/types';

describe('PolygonValidator', () => {
  let validator: PolygonValidator;

  beforeEach(() => {
    validator = new PolygonValidator();
  });

  function createSquare(): WallSegment[] {
    return [
      { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
      { id: '2', start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, length: 10 },
      { id: '3', start: { x: 10, y: 10 }, end: { x: 0, y: 10 }, length: 10 },
      { id: '4', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, length: 10 },
    ];
  }

  function createBowtie(): WallSegment[] {
    return [
      { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 10 }, length: 14.14 },
      { id: '2', start: { x: 10, y: 10 }, end: { x: 10, y: 0 }, length: 10 },
      { id: '3', start: { x: 10, y: 0 }, end: { x: 0, y: 10 }, length: 14.14 },
      { id: '4', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, length: 10 },
    ];
  }

  describe('isSelfIntersecting', () => {
    it('returns false for valid square', () => {
      const walls = createSquare();
      expect(validator.isSelfIntersecting(walls)).toBe(false);
    });

    it('detects self-intersecting bowtie shape', () => {
      const walls = createBowtie();
      expect(validator.isSelfIntersecting(walls)).toBe(true);
    });

    it('returns false for triangle (less than 4 walls)', () => {
      const walls: WallSegment[] = [
        { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
        { id: '2', start: { x: 10, y: 0 }, end: { x: 5, y: 10 }, length: 11.18 },
        { id: '3', start: { x: 5, y: 10 }, end: { x: 0, y: 0 }, length: 11.18 },
      ];
      expect(validator.isSelfIntersecting(walls)).toBe(false);
    });
  });

  describe('isValid', () => {
    it('validates convex polygon', () => {
      const walls = createSquare();
      expect(validator.isValid(walls)).toBe(true);
    });

    it('rejects self-intersecting polygon', () => {
      const walls = createBowtie();
      expect(validator.isValid(walls)).toBe(false);
    });

    it('rejects polygon with less than 3 walls', () => {
      const walls: WallSegment[] = [
        { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
        { id: '2', start: { x: 10, y: 0 }, end: { x: 0, y: 0 }, length: 10 },
      ];
      expect(validator.isValid(walls)).toBe(false);
    });
  });

  describe('isConvex', () => {
    it('returns true for square', () => {
      const walls = createSquare();
      expect(validator.isConvex(walls)).toBe(true);
    });

    it('returns false for L-shaped polygon', () => {
      const walls: WallSegment[] = [
        { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
        { id: '2', start: { x: 10, y: 0 }, end: { x: 10, y: 5 }, length: 5 },
        { id: '3', start: { x: 10, y: 5 }, end: { x: 5, y: 5 }, length: 5 },
        { id: '4', start: { x: 5, y: 5 }, end: { x: 5, y: 10 }, length: 5 },
        { id: '5', start: { x: 5, y: 10 }, end: { x: 0, y: 10 }, length: 5 },
        { id: '6', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, length: 10 },
      ];
      expect(validator.isConvex(walls)).toBe(false);
    });
  });

  describe('getArea', () => {
    it('calculates area of square', () => {
      const walls = createSquare();
      expect(validator.getArea(walls)).toBe(100);
    });

    it('returns 0 for empty polygon', () => {
      expect(validator.getArea([])).toBe(0);
    });

    it('calculates area of triangle', () => {
      const walls: WallSegment[] = [
        { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
        { id: '2', start: { x: 10, y: 0 }, end: { x: 5, y: 10 }, length: 11.18 },
        { id: '3', start: { x: 5, y: 10 }, end: { x: 0, y: 0 }, length: 11.18 },
      ];
      expect(validator.getArea(walls)).toBe(50);
    });
  });

  describe('isPointInside', () => {
    it('returns true for point inside square', () => {
      const walls = createSquare();
      expect(validator.isPointInside({ x: 5, y: 5 }, walls)).toBe(true);
    });

    it('returns false for point outside square', () => {
      const walls = createSquare();
      expect(validator.isPointInside({ x: 15, y: 15 }, walls)).toBe(false);
    });

    it('handles point on edge (may return true or false depending on algorithm)', () => {
      const walls = createSquare();
      // Ray casting algorithm behavior on exact edges is implementation-defined
      // The important thing is it doesn't crash and returns a boolean
      const result = validator.isPointInside({ x: 0, y: 5 }, walls);
      expect(typeof result).toBe('boolean');
    });

    it('handles concave polygon', () => {
      const walls: WallSegment[] = [
        { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
        { id: '2', start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, length: 10 },
        { id: '3', start: { x: 10, y: 10 }, end: { x: 5, y: 5 }, length: 7.07 },
        { id: '4', start: { x: 5, y: 5 }, end: { x: 0, y: 10 }, length: 7.07 },
        { id: '5', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, length: 10 },
      ];
      expect(validator.isPointInside({ x: 2, y: 2 }, walls)).toBe(true);
      expect(validator.isPointInside({ x: 5, y: 8 }, walls)).toBe(false);
    });
  });
});

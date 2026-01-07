import { describe, it, expect } from 'vitest';
import {
  vectorAdd,
  vectorSubtract,
  vectorScale,
  vectorLength,
  vectorNormalize,
  vectorDot,
  vectorCross,
  vectorPerpendicular,
  distancePointToPoint,
  angleBetween,
  clamp,
  smoothstep,
  degToRad,
  radToDeg,
  lineSegmentsIntersect,
  raySegmentIntersect,
} from '../../../src/utils/math';

describe('Vector Math', () => {
  describe('vectorAdd', () => {
    it('adds two vectors', () => {
      const result = vectorAdd({ x: 1, y: 2 }, { x: 3, y: 4 });
      expect(result).toEqual({ x: 4, y: 6 });
    });

    it('handles negative values', () => {
      const result = vectorAdd({ x: -1, y: 2 }, { x: 3, y: -4 });
      expect(result).toEqual({ x: 2, y: -2 });
    });
  });

  describe('vectorSubtract', () => {
    it('subtracts two vectors', () => {
      const result = vectorSubtract({ x: 5, y: 7 }, { x: 2, y: 3 });
      expect(result).toEqual({ x: 3, y: 4 });
    });
  });

  describe('vectorScale', () => {
    it('scales a vector', () => {
      const result = vectorScale({ x: 2, y: 3 }, 2);
      expect(result).toEqual({ x: 4, y: 6 });
    });

    it('handles negative scalar', () => {
      const result = vectorScale({ x: 2, y: 3 }, -1);
      expect(result).toEqual({ x: -2, y: -3 });
    });
  });

  describe('vectorLength', () => {
    it('calculates length of vector', () => {
      expect(vectorLength({ x: 3, y: 4 })).toBe(5);
    });

    it('returns 0 for zero vector', () => {
      expect(vectorLength({ x: 0, y: 0 })).toBe(0);
    });
  });

  describe('vectorNormalize', () => {
    it('normalizes vectors correctly', () => {
      const v = vectorNormalize({ x: 3, y: 4 });
      expect(v.x).toBeCloseTo(0.6);
      expect(v.y).toBeCloseTo(0.8);
    });

    it('returns zero vector for zero input', () => {
      const v = vectorNormalize({ x: 0, y: 0 });
      expect(v).toEqual({ x: 0, y: 0 });
    });
  });

  describe('vectorDot', () => {
    it('calculates dot product', () => {
      expect(vectorDot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
      expect(vectorDot({ x: 1, y: 0 }, { x: 1, y: 0 })).toBe(1);
      expect(vectorDot({ x: 2, y: 3 }, { x: 4, y: 5 })).toBe(23);
    });
  });

  describe('vectorCross', () => {
    it('calculates 2D cross product', () => {
      expect(vectorCross({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(1);
      expect(vectorCross({ x: 0, y: 1 }, { x: 1, y: 0 })).toBe(-1);
    });
  });

  describe('vectorPerpendicular', () => {
    it('returns perpendicular vector', () => {
      const perp = vectorPerpendicular({ x: 1, y: 0 });
      expect(perp.x).toBeCloseTo(0);
      expect(perp.y).toBeCloseTo(1);
    });
  });

  describe('distancePointToPoint', () => {
    it('calculates distance between points', () => {
      expect(distancePointToPoint({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });

    it('returns 0 for same point', () => {
      expect(distancePointToPoint({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    });
  });

  describe('angleBetween', () => {
    it('returns 0 for parallel vectors', () => {
      const angle = angleBetween({ x: 1, y: 0 }, { x: 2, y: 0 });
      expect(angle).toBeCloseTo(0);
    });

    it('returns PI/2 for perpendicular vectors', () => {
      const angle = angleBetween({ x: 1, y: 0 }, { x: 0, y: 1 });
      expect(angle).toBeCloseTo(Math.PI / 2);
    });

    it('returns PI for opposite vectors', () => {
      const angle = angleBetween({ x: 1, y: 0 }, { x: -1, y: 0 });
      expect(angle).toBeCloseTo(Math.PI);
    });
  });

  describe('clamp', () => {
    it('clamps values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('smoothstep', () => {
    it('returns 0 below edge0', () => {
      expect(smoothstep(0, 1, -1)).toBe(0);
    });

    it('returns 1 above edge1', () => {
      expect(smoothstep(0, 1, 2)).toBe(1);
    });

    it('returns 0.5 at midpoint', () => {
      expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    });
  });

  describe('degToRad / radToDeg', () => {
    it('converts degrees to radians', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    });

    it('converts radians to degrees', () => {
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
    });
  });

  describe('lineSegmentsIntersect', () => {
    it('detects intersecting segments', () => {
      expect(
        lineSegmentsIntersect(
          { x: 0, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
          { x: 10, y: 0 }
        )
      ).toBe(true);
    });

    it('returns false for non-intersecting segments', () => {
      expect(
        lineSegmentsIntersect(
          { x: 0, y: 0 },
          { x: 5, y: 0 },
          { x: 0, y: 1 },
          { x: 5, y: 1 }
        )
      ).toBe(false);
    });

    it('returns false for parallel segments', () => {
      expect(
        lineSegmentsIntersect(
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 0, y: 5 },
          { x: 10, y: 5 }
        )
      ).toBe(false);
    });
  });

  describe('raySegmentIntersect', () => {
    it('finds intersection point', () => {
      const result = raySegmentIntersect(
        { x: 0, y: 5 },
        { x: 1, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 10 }
      );
      expect(result).not.toBeNull();
      expect(result!.point.x).toBeCloseTo(5);
      expect(result!.point.y).toBeCloseTo(5);
    });

    it('returns null for non-intersecting ray', () => {
      const result = raySegmentIntersect(
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 10 }
      );
      expect(result).toBeNull();
    });
  });
});

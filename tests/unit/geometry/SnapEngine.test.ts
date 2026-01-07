import { describe, it, expect, beforeEach } from 'vitest';
import { SnapEngine } from '../../../src/geometry/SnapEngine';

describe('SnapEngine', () => {
  let snapEngine: SnapEngine;

  beforeEach(() => {
    snapEngine = new SnapEngine();
  });

  describe('parallel snapping', () => {
    it('snaps to parallel when within 5 degrees', () => {
      const prevDir = { x: 1, y: 0 };
      const anchor = { x: 0, y: 0 };
      const mouse = { x: 10, y: 0.5 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, null, anchor);

      expect(result.snapType).toBe('parallel');
      expect(result.snappedPos.y).toBeCloseTo(0, 5);
    });

    it('does not snap when beyond threshold', () => {
      const prevDir = { x: 1, y: 0 };
      const anchor = { x: 0, y: 0 };
      const mouse = { x: 10, y: 2 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, null, anchor);

      expect(result.snapType).toBe('none');
    });

    it('snaps to parallel in negative direction', () => {
      const prevDir = { x: -1, y: 0 };
      const anchor = { x: 10, y: 0 };
      const mouse = { x: 0, y: 0.3 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, null, anchor);

      expect(result.snapType).toBe('parallel');
      expect(result.snappedPos.y).toBeCloseTo(0, 5);
    });
  });

  describe('perpendicular snapping', () => {
    it('snaps to perpendicular when within 5 degrees of 90 degrees', () => {
      const prevDir = { x: 1, y: 0 };
      const anchor = { x: 0, y: 0 };
      const mouse = { x: 0.5, y: 10 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, null, anchor);

      expect(result.snapType).toBe('perpendicular');
      expect(result.snappedPos.x).toBeCloseTo(0, 5);
    });

    it('snaps perpendicular in negative direction', () => {
      const prevDir = { x: 1, y: 0 };
      const anchor = { x: 5, y: 5 };
      const mouse = { x: 5.3, y: -5 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, null, anchor);

      expect(result.snapType).toBe('perpendicular');
      expect(result.snappedPos.x).toBeCloseTo(5, 5);
    });

    it('handles diagonal previous direction', () => {
      const prevDir = { x: 0.707, y: 0.707 };
      const anchor = { x: 5, y: 5 };
      const mouse = { x: 0, y: 10 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, null, anchor);

      expect(result.snapType).toBe('perpendicular');
    });
  });

  describe('closure snapping', () => {
    it('snaps to start vertex when within threshold', () => {
      const startVertex = { x: 0, y: 0 };
      const anchor = { x: 5, y: 5 };
      const mouse = { x: 0.3, y: 0.3 };

      const result = snapEngine.snapToConstraint(null, mouse, startVertex, anchor);

      expect(result.snapType).toBe('closure');
      expect(result.snappedPos).toEqual(startVertex);
    });

    it('does not snap closure when beyond threshold', () => {
      const startVertex = { x: 0, y: 0 };
      const anchor = { x: 5, y: 5 };
      const mouse = { x: 1, y: 1 };

      const result = snapEngine.snapToConstraint(null, mouse, startVertex, anchor);

      expect(result.snapType).toBe('none');
    });

    it('closure takes priority over parallel', () => {
      const prevDir = { x: 1, y: 0 };
      const startVertex = { x: 0, y: 0 };
      const anchor = { x: 5, y: 0 };
      const mouse = { x: 0.2, y: 0.2 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, startVertex, anchor);

      expect(result.snapType).toBe('closure');
    });
  });

  describe('no snapping', () => {
    it('returns none when no previous direction and not near start', () => {
      const mouse = { x: 5, y: 5 };
      const anchor = { x: 0, y: 0 };

      const result = snapEngine.snapToConstraint(null, mouse, null, anchor);

      expect(result.snapType).toBe('none');
      expect(result.snappedPos).toEqual(mouse);
    });

    it('returns none at intermediate angles', () => {
      const prevDir = { x: 1, y: 0 };
      const anchor = { x: 0, y: 0 };
      const mouse = { x: 10, y: 5 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, null, anchor);

      expect(result.snapType).toBe('none');
    });
  });

  describe('edge cases', () => {
    it('handles zero-length vector from anchor to mouse', () => {
      const prevDir = { x: 1, y: 0 };
      const anchor = { x: 5, y: 5 };
      const mouse = { x: 5, y: 5 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, null, anchor);

      expect(result.snapType).toBe('none');
    });

    it('handles very small movements', () => {
      const prevDir = { x: 1, y: 0 };
      const anchor = { x: 0, y: 0 };
      const mouse = { x: 0.0001, y: 0 };

      const result = snapEngine.snapToConstraint(prevDir, mouse, null, anchor);

      // Very small movements below threshold return 'none', but
      // if above threshold, they may snap based on direction
      expect(['none', 'parallel']).toContain(result.snapType);
    });
  });
});

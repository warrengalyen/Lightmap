import { describe, it, expect, beforeEach } from 'vitest';
import { WallBuilder } from '../../src/geometry/WallBuilder';
import type { Vector2 } from '../../src/types';

/**
 * Regression test for wall drawing event handling bug.
 *
 * Bug: When clicking to place a wall, the view would refresh and the wall
 * wouldn't appear. This was caused by:
 * 1. InputManager emitting 'drag' events instead of 'move' events when
 *    the mouse button was held down
 * 2. Canvas component only listening to 'move' events, not 'drag' events
 * 3. No visual feedback shown at the starting vertex on first click
 *
 * Fix:
 * - Canvas now listens to both 'move' and 'drag' events
 * - Drawing vertices are displayed immediately when drawing starts
 */
describe('Wall Drawing Event Handling (Regression)', () => {
  let wallBuilder: WallBuilder;

  beforeEach(() => {
    wallBuilder = new WallBuilder();
  });

  describe('Drawing state after first click', () => {
    it('should be in drawing mode after startDrawing is called', () => {
      const clickPos: Vector2 = { x: 5, y: 5 };

      wallBuilder.startDrawing(clickPos);

      expect(wallBuilder.drawing).toBe(true);
      expect(wallBuilder.vertexCount).toBe(1);
      expect(wallBuilder.startVertex).toEqual(clickPos);
      expect(wallBuilder.lastVertex).toEqual(clickPos);
    });

    it('should return vertices immediately after first click for rendering', () => {
      const clickPos: Vector2 = { x: 5, y: 5 };

      wallBuilder.startDrawing(clickPos);
      const vertices = wallBuilder.getVertices();

      expect(vertices).toHaveLength(1);
      expect(vertices[0]).toEqual(clickPos);
    });
  });

  describe('Mouse move handling during drawing', () => {
    it('should update snapped position on continueDrawing regardless of drag state', () => {
      wallBuilder.startDrawing({ x: 0, y: 0 });

      // Simulate mouse move (whether 'move' or 'drag' event)
      const mousePos: Vector2 = { x: 10, y: 0.5 };
      const snappedPos = wallBuilder.continueDrawing(mousePos);

      // Should return a valid position (may be snapped)
      expect(snappedPos).toBeDefined();
      expect(typeof snappedPos.x).toBe('number');
      expect(typeof snappedPos.y).toBe('number');
    });

    it('should provide lastVertex for phantom line rendering', () => {
      wallBuilder.startDrawing({ x: 0, y: 0 });

      const lastVertex = wallBuilder.lastVertex;

      expect(lastVertex).not.toBeNull();
      expect(lastVertex).toEqual({ x: 0, y: 0 });
    });

    it('should track snap state during mouse movement', () => {
      wallBuilder.startDrawing({ x: 0, y: 0 });
      wallBuilder.placeVertex({ x: 10, y: 0 });

      // Move mouse in a direction that should trigger perpendicular snap
      wallBuilder.continueDrawing({ x: 10.2, y: 5 });

      const snap = wallBuilder.currentSnap;
      expect(snap).not.toBeNull();
      expect(snap!.snapType).toBe('perpendicular');
    });
  });

  describe('Vertex placement and visual feedback', () => {
    it('should accumulate vertices as user clicks', () => {
      wallBuilder.startDrawing({ x: 0, y: 0 });
      expect(wallBuilder.getVertices()).toHaveLength(1);

      wallBuilder.placeVertex({ x: 10, y: 0 });
      expect(wallBuilder.getVertices()).toHaveLength(2);

      wallBuilder.placeVertex({ x: 10, y: 10 });
      expect(wallBuilder.getVertices()).toHaveLength(3);
    });

    it('should maintain vertices after partial drawing for rendering', () => {
      wallBuilder.startDrawing({ x: 0, y: 0 });
      wallBuilder.placeVertex({ x: 10, y: 0 });
      wallBuilder.placeVertex({ x: 10, y: 10 });

      const vertices = wallBuilder.getVertices();

      expect(vertices).toHaveLength(3);
      expect(vertices[0]).toEqual({ x: 0, y: 0 });
      expect(vertices[1]).toEqual({ x: 10, y: 0 });
      expect(vertices[2]).toEqual({ x: 10, y: 10 });
    });
  });

  describe('Drawing cancellation', () => {
    it('should clear all state when cancelled', () => {
      wallBuilder.startDrawing({ x: 0, y: 0 });
      wallBuilder.placeVertex({ x: 10, y: 0 });
      wallBuilder.placeVertex({ x: 10, y: 10 });

      wallBuilder.cancel();

      expect(wallBuilder.drawing).toBe(false);
      expect(wallBuilder.vertexCount).toBe(0);
      expect(wallBuilder.getVertices()).toHaveLength(0);
      expect(wallBuilder.startVertex).toBeNull();
      expect(wallBuilder.lastVertex).toBeNull();
      expect(wallBuilder.currentSnap).toBeNull();
    });
  });

  describe('Drawing completion', () => {
    it('should clear state after successful polygon closure', () => {
      wallBuilder.startDrawing({ x: 0, y: 0 });
      wallBuilder.placeVertex({ x: 10, y: 0 });
      wallBuilder.placeVertex({ x: 10, y: 10 });
      wallBuilder.placeVertex({ x: 0, y: 10 });

      const walls = wallBuilder.closeLoop();

      expect(walls).not.toBeNull();
      expect(walls).toHaveLength(4);
      expect(wallBuilder.drawing).toBe(false);
      expect(wallBuilder.getVertices()).toHaveLength(0);
    });
  });
});

describe('Event Handler Simulation', () => {
  it('should handle rapid click-move-click sequence', () => {
    const wallBuilder = new WallBuilder();

    // Simulate: click at origin
    wallBuilder.startDrawing({ x: 0, y: 0 });
    expect(wallBuilder.drawing).toBe(true);

    // Simulate: mouse move (could be 'move' or 'drag' event)
    // First segment has no snapping (no previous direction)
    let snapped = wallBuilder.continueDrawing({ x: 5, y: 0.1 });
    expect(wallBuilder.lastVertex).toEqual({ x: 0, y: 0 });

    // Simulate: click to place second vertex
    wallBuilder.placeVertex(snapped);
    expect(wallBuilder.vertexCount).toBe(2);
    // lastVertex is now the second placed vertex
    expect(wallBuilder.lastVertex).toEqual(snapped);

    // Simulate: more mouse moves - now snapping can occur
    snapped = wallBuilder.continueDrawing({ x: 5.1, y: 5 });
    // lastVertex stays at the last placed vertex until placeVertex is called
    expect(wallBuilder.lastVertex?.x).toBeCloseTo(5, 0);

    // Continue building...
    wallBuilder.placeVertex(snapped);
    expect(wallBuilder.vertexCount).toBe(3);
  });
});

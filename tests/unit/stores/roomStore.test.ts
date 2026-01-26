import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { roomStore, insertVertexOnWall, deleteVertex, getVertices } from '../../../src/stores/roomStore';

describe('roomStore vertex operations', () => {
  beforeEach(() => {
    // Set up a simple square room
    roomStore.set({
      ceilingHeight: 8,
      walls: [
        { id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
        { id: 'wall-2', start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, length: 10 },
        { id: 'wall-3', start: { x: 10, y: 10 }, end: { x: 0, y: 10 }, length: 10 },
        { id: 'wall-4', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, length: 10 },
      ],
      lights: [],
      doors: [],
      isClosed: true,
    });
  });

  describe('insertVertexOnWall', () => {
    it('inserts a vertex and splits wall into two', () => {
      const initialWallCount = get(roomStore).walls.length;

      const newIndex = insertVertexOnWall('wall-1', { x: 5, y: 0 });

      expect(newIndex).toBe(1);
      expect(get(roomStore).walls.length).toBe(initialWallCount + 1);
    });

    it('creates two walls with correct endpoints', () => {
      insertVertexOnWall('wall-1', { x: 5, y: 0 });

      const walls = get(roomStore).walls;
      // First new wall should go from (0,0) to (5,0)
      expect(walls[0].start).toEqual({ x: 0, y: 0 });
      expect(walls[0].end).toEqual({ x: 5, y: 0 });

      // Second new wall should go from (5,0) to (10,0)
      expect(walls[1].start).toEqual({ x: 5, y: 0 });
      expect(walls[1].end).toEqual({ x: 10, y: 0 });
    });

    it('calculates correct lengths for new walls', () => {
      insertVertexOnWall('wall-1', { x: 5, y: 0 });

      const walls = get(roomStore).walls;
      expect(walls[0].length).toBe(5);
      expect(walls[1].length).toBe(5);
    });

    it('returns null for non-existent wall', () => {
      const result = insertVertexOnWall('non-existent', { x: 5, y: 5 });
      expect(result).toBe(null);
    });

    it('does not insert when room is not closed', () => {
      roomStore.update(state => ({ ...state, isClosed: false }));

      const initialWallCount = get(roomStore).walls.length;
      insertVertexOnWall('wall-1', { x: 5, y: 0 });

      expect(get(roomStore).walls.length).toBe(initialWallCount);
    });
  });

  describe('deleteVertex', () => {
    it('deletes a vertex and merges two walls', () => {
      // First add a vertex so we have 5 walls
      insertVertexOnWall('wall-1', { x: 5, y: 0 });
      expect(get(roomStore).walls.length).toBe(5);

      // Delete the new vertex (index 1)
      const result = deleteVertex(1);

      expect(result).toBe(true);
      expect(get(roomStore).walls.length).toBe(4);
    });

    it('creates merged wall with correct endpoints', () => {
      // Add vertex at (5,0) on wall-1
      insertVertexOnWall('wall-1', { x: 5, y: 0 });

      // Delete it
      deleteVertex(1);

      const walls = get(roomStore).walls;
      // The first wall should now span from (0,0) to (10,0)
      expect(walls[0].start).toEqual({ x: 0, y: 0 });
      expect(walls[0].end).toEqual({ x: 10, y: 0 });
    });

    it('does not delete when only 3 vertices remain', () => {
      // Set up a triangle (minimum polygon)
      roomStore.set({
        ceilingHeight: 8,
        walls: [
          { id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
          { id: 'wall-2', start: { x: 10, y: 0 }, end: { x: 5, y: 10 }, length: 11.18 },
          { id: 'wall-3', start: { x: 5, y: 10 }, end: { x: 0, y: 0 }, length: 11.18 },
        ],
        lights: [],
        doors: [],
        isClosed: true,
      });

      const result = deleteVertex(0);

      expect(result).toBe(false);
      expect(get(roomStore).walls.length).toBe(3);
    });

    it('returns false for invalid vertex index', () => {
      const result = deleteVertex(99);
      expect(result).toBe(false);
    });

    it('does not delete when room is not closed', () => {
      roomStore.update(state => ({ ...state, isClosed: false }));

      const result = deleteVertex(0);
      expect(result).toBe(false);
    });
  });

  describe('getVertices', () => {
    it('returns all vertices of the room', () => {
      const vertices = getVertices(get(roomStore));

      expect(vertices.length).toBe(4);
      expect(vertices[0]).toEqual({ x: 0, y: 0 });
      expect(vertices[1]).toEqual({ x: 10, y: 0 });
      expect(vertices[2]).toEqual({ x: 10, y: 10 });
      expect(vertices[3]).toEqual({ x: 0, y: 10 });
    });

    it('returns empty array for room with no walls', () => {
      roomStore.set({
        ceilingHeight: 8,
        walls: [],
        lights: [],
        doors: [],
        isClosed: false,
      });

      const vertices = getVertices(get(roomStore));
      expect(vertices.length).toBe(0);
    });
  });
});

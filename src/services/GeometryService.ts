import type { Vector2, WallSegment, RoomState } from '../types';
import { distancePointToPoint } from '../utils/math';
import { generateId } from '../utils/id';

/**
 * Service for geometry operations on room state.
 * Provides pure functions that don't directly mutate stores.
 */
export class GeometryService {

  /**
   * Insert a vertex on a wall and return the new state and inserted index.
   */
  insertVertexOnWall(
    state: RoomState,
    wallId: string,
    position: Vector2
  ): { state: RoomState; insertedIndex: number | null } {
    if (!state.isClosed || state.walls.length === 0) {
      return { state, insertedIndex: null };
    }

    const wallIndex = state.walls.findIndex(w => w.id === wallId);
    if (wallIndex === -1) {
      return { state, insertedIndex: null };
    }

    const wall = state.walls[wallIndex];

    // Create two new walls from the split
    const newWall1: WallSegment = {
      id: generateId(),
      start: { ...wall.start },
      end: { ...position },
      length: distancePointToPoint(wall.start, position),
    };

    const newWall2: WallSegment = {
      id: generateId(),
      start: { ...position },
      end: { ...wall.end },
      length: distancePointToPoint(position, wall.end),
    };

    // Replace the old wall with two new walls
    const newWalls = [
      ...state.walls.slice(0, wallIndex),
      newWall1,
      newWall2,
      ...state.walls.slice(wallIndex + 1),
    ];

    // The new vertex is at index wallIndex + 1 (start of newWall2)
    const insertedIndex = wallIndex + 1;

    return {
      state: { ...state, walls: newWalls },
      insertedIndex,
    };
  }

  /**
   * Delete a vertex and return the new state.
   */
  deleteVertex(state: RoomState, vertexIndex: number): { state: RoomState; success: boolean } {
    if (!state.isClosed || state.walls.length <= 3) {
      return { state, success: false }; // Need at least 3 vertices for a polygon
    }

    const numWalls = state.walls.length;
    if (vertexIndex < 0 || vertexIndex >= numWalls) {
      return { state, success: false };
    }

    // The vertex at index i is the start of wall[i] and end of wall[i-1]
    // Deleting it means merging wall[i-1] and wall[i] into one wall
    const prevWallIndex = (vertexIndex - 1 + numWalls) % numWalls;
    const currentWallIndex = vertexIndex;

    const prevWall = state.walls[prevWallIndex];
    const currentWall = state.walls[currentWallIndex];

    // Create merged wall (from prevWall.start to currentWall.end)
    const mergedWall: WallSegment = {
      id: prevWall.id, // Keep the previous wall's id
      start: { ...prevWall.start },
      end: { ...currentWall.end },
      length: distancePointToPoint(prevWall.start, currentWall.end),
    };

    // Build new walls array
    const newWalls: WallSegment[] = [];
    for (let i = 0; i < numWalls; i++) {
      if (i === prevWallIndex) {
        newWalls.push(mergedWall);
      } else if (i === currentWallIndex) {
        // Skip this wall, it's been merged
      } else {
        newWalls.push(state.walls[i]);
      }
    }

    return {
      state: { ...state, walls: newWalls },
      success: true,
    };
  }

  /**
   * Get all vertices from a room state.
   */
  getVertices(state: RoomState): Vector2[] {
    if (state.walls.length === 0) return [];
    return state.walls.map(w => w.start);
  }

}

// Singleton instance for convenience
export const geometryService = new GeometryService();

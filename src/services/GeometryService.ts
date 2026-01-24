import type { Vector2, WallSegment, RoomState } from '../types';
import { distancePointToPoint } from '../utils/math';
import { generateId } from '../utils/id';

/**
 * Service for geometry operations on room state.
 * Provides pure functions that don't directly mutate stores.
 */
export class GeometryService {
  /**
   * Update a vertex position and return the new room state.
   */
  updateVertexPosition(state: RoomState, vertexIndex: number, newPosition: Vector2): RoomState {
    if (!state.isClosed || state.walls.length === 0) return state;

    const numWalls = state.walls.length;
    if (vertexIndex < 0 || vertexIndex >= numWalls) return state;

    const newWalls = [...state.walls];

    // The vertex at index i is the start of wall[i] and end of wall[i-1]
    // Update wall[vertexIndex].start
    const currentWall = newWalls[vertexIndex];
    const newLength = distancePointToPoint(newPosition, currentWall.end);
    newWalls[vertexIndex] = {
      ...currentWall,
      start: { ...newPosition },
      length: newLength,
    };

    // Update wall[(vertexIndex - 1 + numWalls) % numWalls].end
    const prevWallIndex = (vertexIndex - 1 + numWalls) % numWalls;
    const prevWall = newWalls[prevWallIndex];
    const prevLength = distancePointToPoint(prevWall.start, newPosition);
    newWalls[prevWallIndex] = {
      ...prevWall,
      end: { ...newPosition },
      length: prevLength,
    };

    return { ...state, walls: newWalls };
  }

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
   * Move a wall (both endpoints) and return the new state.
   */
  moveWall(state: RoomState, wallId: string, newStart: Vector2, newEnd: Vector2): RoomState {
    if (!state.isClosed || state.walls.length === 0) return state;

    const wallIndex = state.walls.findIndex(w => w.id === wallId);
    if (wallIndex === -1) return state;

    const numWalls = state.walls.length;
    const newWalls = [...state.walls];

    // Update the selected wall
    const wall = newWalls[wallIndex];
    newWalls[wallIndex] = {
      ...wall,
      start: { ...newStart },
      end: { ...newEnd },
      // Length stays the same since we're translating
    };

    // Update the previous wall's end point (it shares start vertex with this wall)
    const prevWallIndex = (wallIndex - 1 + numWalls) % numWalls;
    const prevWall = newWalls[prevWallIndex];
    const prevLength = distancePointToPoint(prevWall.start, newStart);
    newWalls[prevWallIndex] = {
      ...prevWall,
      end: { ...newStart },
      length: prevLength,
    };

    // Update the next wall's start point (it shares end vertex with this wall)
    const nextWallIndex = (wallIndex + 1) % numWalls;
    const nextWall = newWalls[nextWallIndex];
    const nextLength = distancePointToPoint(newEnd, nextWall.end);
    newWalls[nextWallIndex] = {
      ...nextWall,
      start: { ...newEnd },
      length: nextLength,
    };

    return { ...state, walls: newWalls };
  }

  /**
   * Get all vertices from a room state.
   */
  getVertices(state: RoomState): Vector2[] {
    if (state.walls.length === 0) return [];
    return state.walls.map(w => w.start);
  }

  /**
   * Get a wall by ID.
   */
  getWallById(state: RoomState, wallId: string): WallSegment | null {
    return state.walls.find(w => w.id
     === wallId) ?? null;
  }
}

// Singleton instance for convenience
export const geometryService = new GeometryService();

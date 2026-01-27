import { writable, derived } from 'svelte/store';
import type { RoomState, WallSegment, Vector2, Door, Obstacle } from '../types';
import { DEFAULT_ROOM_STATE } from '../types';
import { vectorSubtract, vectorNormalize, vectorAdd, vectorScale, distancePointToPoint } from '../utils/math';
import { geometryService } from '../services/GeometryService';

export const roomStore = writable<RoomState>({ ...DEFAULT_ROOM_STATE });

export const canPlaceLights = derived(roomStore, ($room) => $room.isClosed);
export const canPlaceDoors = derived(roomStore, ($room) => $room.isClosed);
export const canDrawObstacles = derived(roomStore, ($room) => $room.isClosed);

export const roomBounds = derived(roomStore, ($room) => {
  if ($room.walls.length === 0) {
    return { minX: -10, minY: -10, maxX: 10, maxY: 10 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const wall of $room.walls) {
    minX = Math.min(minX, wall.start.x, wall.end.x);
    minY = Math.min(minY, wall.start.y, wall.end.y);
    maxX = Math.max(maxX, wall.start.x, wall.end.x);
    maxY = Math.max(maxY, wall.start.y, wall.end.y);
  }

  const padding = 2;
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
});

export function resetRoom(): void {
  roomStore.set({ ...DEFAULT_ROOM_STATE });
}

export function updateWallLength(wallId: string, newLength: number): void {
  if (newLength <= 0) return;

  roomStore.update(state => {
    const wallIndex = state.walls.findIndex(w => w.id === wallId);
    if (wallIndex === -1) return state;

    const wall = state.walls[wallIndex];
    const direction = vectorNormalize(vectorSubtract(wall.end, wall.start));
    const newEnd = vectorAdd(wall.start, vectorScale(direction, newLength));

    const updatedWall: WallSegment = {
      ...wall,
      end: newEnd,
      length: newLength,
    };

    // Update this wall
    const newWalls = [...state.walls];
    newWalls[wallIndex] = updatedWall;

    // If the room is closed, we need to update the adjacent wall's start point
    if (state.isClosed) {
      const nextWallIndex = (wallIndex + 1) % state.walls.length;
      const nextWall = newWalls[nextWallIndex];

      // Update the next wall's start to match this wall's new end
      const nextWallLength = distancePointToPoint(newEnd, nextWall.end);

      newWalls[nextWallIndex] = {
        ...nextWall,
        start: { ...newEnd },
        length: nextWallLength,
      };
    }

    return { ...state, walls: newWalls };
  });
}

/**
 * Update a vertex in a closed wall loop: sets wall[vertexIndex].start and wall[prevIndex].end,
 * recalculating lengths for both affected walls. Mutates the provided walls array in place.
 */
function updateVertexInWalls(walls: WallSegment[], vertexIndex: number, newPosition: Vector2): void {
  const numWalls = walls.length;

  const currentWall = walls[vertexIndex];
  walls[vertexIndex] = {
    ...currentWall,
    start: { ...newPosition },
    length: distancePointToPoint(newPosition, currentWall.end),
  };

  const prevWallIndex = (vertexIndex - 1 + numWalls) % numWalls;
  const prevWall = walls[prevWallIndex];
  walls[prevWallIndex] = {
    ...prevWall,
    end: { ...newPosition },
    length: distancePointToPoint(prevWall.start, newPosition),
  };
}

export function getVertices(state: RoomState): Vector2[] {
  if (state.walls.length === 0) return [];
  return state.walls.map(w => w.start);
}

export function updateVertexPosition(vertexIndex: number, newPosition: Vector2): void {
  roomStore.update(state => {
    if (!state.isClosed || state.walls.length === 0) return state;

    const numWalls = state.walls.length;
    if (vertexIndex < 0 || vertexIndex >= numWalls) return state;

    const newWalls = [...state.walls];
    updateVertexInWalls(newWalls, vertexIndex, newPosition);
    return { ...state, walls: newWalls };
  });
}

export function insertVertexOnWall(wallId: string, position: Vector2): number | null {
  let insertedIndex: number | null = null;

  roomStore.update(state => {
    const result = geometryService.insertVertexOnWall(state, wallId, position);
    insertedIndex = result.insertedIndex;
    return result.state;
  });

  return insertedIndex;
}

export function moveWall(wallId: string, newStart: Vector2, newEnd: Vector2): void {
  roomStore.update(state => {
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
  });
}

export function deleteVertex(vertexIndex: number): boolean {
  let success = false;

  roomStore.update(state => {
    // Get the wall that will be deleted (needed for door cleanup)
    const deletedWallId = state.walls[vertexIndex]?.id;

    const result = geometryService.deleteVertex(state, vertexIndex);
    success = result.success;

    if (!result.success) return state;

    // Remove doors on the deleted wall
    const newDoors = deletedWallId
      ? result.state.doors.filter(d => d.wallId !== deletedWallId)
      : result.state.doors;

    return { ...result.state, doors: newDoors };
  });

  return success;
}

// ============================================
// Door Operations
// ============================================

export function addDoor(door: Door): void {
  roomStore.update(state => ({
    ...state,
    doors: [...state.doors, door],
  }));
}

export function updateDoor(doorId: string, updates: Partial<Omit<Door, 'id'>>): void {
  roomStore.update(state => ({
    ...state,
    doors: state.doors.map(door =>
      door.id === doorId ? { ...door, ...updates } : door
    ),
  }));
}

export function removeDoor(doorId: string): void {
  roomStore.update(state => ({
    ...state,
    doors: state.doors.filter(d => d.id !== doorId),
  }));
}

export function getDoorsByWallId(state: RoomState, wallId: string): Door[] {
  return state.doors.filter(d => d.wallId === wallId);
}

// ============================================
// Obstacle Operations
// ============================================

export function addObstacle(obstacle: Obstacle): void {
  roomStore.update(state => ({
    ...state,
    obstacles: [...(state.obstacles ?? []), obstacle],
  }));
}

export function updateObstacle(id: string, updates: Partial<Omit<Obstacle, 'id'>>): void {
  roomStore.update(state => ({
    ...state,
    obstacles: (state.obstacles ?? []).map(obs =>
      obs.id === id ? { ...obs, ...updates } : obs
    ),
  }));
}

export function removeObstacle(id: string): void {
  roomStore.update(state => ({
    ...state,
    obstacles: (state.obstacles ?? []).filter(obs => obs.id !== id),
  }));
}

export function updateObstacleVertexPosition(obstacleId: string, vertexIndex: number, newPosition: Vector2): void {
  roomStore.update(state => {
    const obstacles = state.obstacles ?? [];
    const obstacleIndex = obstacles.findIndex(o => o.id === obstacleId);
    if (obstacleIndex === -1) return state;

    const obstacle = obstacles[obstacleIndex];
    const numWalls = obstacle.walls.length;
    if (vertexIndex < 0 || vertexIndex >= numWalls) return state;

    const newWalls = [...obstacle.walls];
    updateVertexInWalls(newWalls, vertexIndex, newPosition);

    const newObstacles = [...obstacles];
    newObstacles[obstacleIndex] = { ...obstacle, walls: newWalls };

    return { ...state, obstacles: newObstacles };
  });
}

export function moveObstacle(obstacleId: string, vertexPositions: Map<number, Vector2>): void {
  roomStore.update(state => {
    const obstacles = state.obstacles ?? [];
    const obstacleIndex = obstacles.findIndex(o => o.id === obstacleId);
    if (obstacleIndex === -1) return state;

    const obstacle = obstacles[obstacleIndex];
    const newWalls = [...obstacle.walls];

    // Update each vertex position
    for (const [vertexIndex, newPosition] of vertexPositions) {
      const numWalls = newWalls.length;
      if (vertexIndex < 0 || vertexIndex >= numWalls) continue;

      const currentWall = newWalls[vertexIndex];
      newWalls[vertexIndex] = {
        ...currentWall,
        start: { ...newPosition },
      };

      const prevWallIndex = (vertexIndex - 1 + numWalls) % numWalls;
      const prevWall = newWalls[prevWallIndex];
      newWalls[prevWallIndex] = {
        ...prevWall,
        end: { ...newPosition },
      };
    }

    // Recalculate all wall lengths after all positions are updated
    for (let i = 0; i < newWalls.length; i++) {
      newWalls[i] = {
        ...newWalls[i],
        length: distancePointToPoint(newWalls[i].start, newWalls[i].end),
      };
    }

    const newObstacles = [...obstacles];
    newObstacles[obstacleIndex] = { ...obstacle, walls: newWalls };

    return { ...state, obstacles: newObstacles };
  });
}


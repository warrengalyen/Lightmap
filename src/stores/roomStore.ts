import { writable, derived } from 'svelte/store';
import type { RoomState, WallSegment, Vector2, Door } from '../types';
import { DEFAULT_ROOM_STATE } from '../types';
import { vectorSubtract, vectorNormalize, vectorAdd, vectorScale, distancePointToPoint } from '../utils/math';
import { generateId } from '../utils/id';

export const roomStore = writable<RoomState>({ ...DEFAULT_ROOM_STATE });

export const canPlaceLights = derived(roomStore, ($room) => $room.isClosed);
export const canPlaceDoors = derived(roomStore, ($room) => $room.isClosed);

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

export function getWallById(state: RoomState, wallId: string): WallSegment | null {
  return state.walls.find(w => w.id === wallId) ?? null;
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
  });
}

export function insertVertexOnWall(wallId: string, position: Vector2): number | null {
  let insertedIndex: number | null = null;

  roomStore.update(state => {
    if (!state.isClosed || state.walls.length === 0) return state;

    const wallIndex = state.walls.findIndex(w => w.id === wallId);
    if (wallIndex === -1) return state;

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
    insertedIndex = wallIndex + 1;

    return { ...state, walls: newWalls };
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
    if (!state.isClosed || state.walls.length <= 3) return state; // Need at least 3 vertices for a polygon

    const numWalls = state.walls.length;
    if (vertexIndex < 0 || vertexIndex >= numWalls) return state;

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

    success = true;
    // Remove doors on the deleted wall
    const newDoors = state.doors.filter(d => d.wallId !== currentWall.id);
    return { ...state, walls: newWalls, doors: newDoors };
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

export function removeDoorsOnWall(wallId: string): void {
  roomStore.update(state => ({
    ...state,
    doors: state.doors.filter(d => d.wallId !== wallId),
  }));
}

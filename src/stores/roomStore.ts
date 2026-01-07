import { writable, derived } from "svelte/store";
import type { RoomState, WallSegment } from "../types";
import { DEFAULT_ROOM_STATE } from "../types";
import { vectorSubtract, vectorNormalize, vectorAdd, vectorScale } from "../utils/math";

export const roomStore = writable<RoomState>({ ...DEFAULT_ROOM_STATE });

export const canPlaceLights = derived(roomStore, ($room) => $room.isClosed);

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

    roomStore.update((state) => {
        const wallIndex = state.walls.findIndex((w) => w.id === wallId);
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
            const nextWallLength = Math.sqrt(
                Math.pow(nextWall.end.x - newEnd.x, 2) + Math.pow(nextWall.end.y - newEnd.y, 2),
            );

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
    return state.walls.find((w) => w.id === wallId) ?? null;
}

export function getVertices(state: RoomState): import("../types").Vector2[] {
    if (state.walls.length === 0) return [];
    return state.walls.map((w) => w.start);
}

export function updateVertexPosition(vertexIndex: number, newPosition: import("../types").Vector2): void {
    roomStore.update((state) => {
        if (!state.isClosed || state.walls.length === 0) return state;

        const numWalls = state.walls.length;
        if (vertexIndex < 0 || vertexIndex >= numWalls) return state;

        const newWalls = [...state.walls];

        // The vertex at index i is the start of wall[i] and end of wall[i-1]
        // Update wall[vertexIndex].start
        const currentWall = newWalls[vertexIndex];
        const newLength = Math.sqrt(
            Math.pow(currentWall.end.x - newPosition.x, 2) + Math.pow(currentWall.end.y - newPosition.y, 2),
        );
        newWalls[vertexIndex] = {
            ...currentWall,
            start: { ...newPosition },
            length: newLength,
        };

        // Update wall[(vertexIndex - 1 + numWalls) % numWalls].end
        const prevWallIndex = (vertexIndex - 1 + numWalls) % numWalls;
        const prevWall = newWalls[prevWallIndex];
        const prevLength = Math.sqrt(
            Math.pow(newPosition.x - prevWall.start.x, 2) + Math.pow(newPosition.y - prevWall.start.y, 2),
        );
        newWalls[prevWallIndex] = {
            ...prevWall,
            end: { ...newPosition },
            length: prevLength,
        };

        return { ...state, walls: newWalls };
    });
}

export function insertVertexOnWall(wallId: string, position: import("../types").Vector2): number | null {
    let insertedIndex: number | null = null;

    roomStore.update((state) => {
        if (!state.isClosed || state.walls.length === 0) return state;

        const wallIndex = state.walls.findIndex((w) => w.id === wallId);
        if (wallIndex === -1) return state;

        const wall = state.walls[wallIndex];

        // Create two new walls from the split
        const newWall1: WallSegment = {
            id: crypto.randomUUID(),
            start: { ...wall.start },
            end: { ...position },
            length: Math.sqrt(Math.pow(position.x - wall.start.x, 2) + Math.pow(position.y - wall.start.y, 2)),
        };

        const newWall2: WallSegment = {
            id: crypto.randomUUID(),
            start: { ...position },
            end: { ...wall.end },
            length: Math.sqrt(Math.pow(wall.end.x - position.x, 2) + Math.pow(wall.end.y - position.y, 2)),
        };

        // Replace the old wall with two new walls
        const newWalls = [...state.walls.slice(0, wallIndex), newWall1, newWall2, ...state.walls.slice(wallIndex + 1)];

        // The new vertex is at index wallIndex + 1 (start of newWall2)
        insertedIndex = wallIndex + 1;

        return { ...state, walls: newWalls };
    });

    return insertedIndex;
}

export function moveWall(
    wallId: string,
    newStart: import("../types").Vector2,
    newEnd: import("../types").Vector2,
): void {
    roomStore.update((state) => {
        if (!state.isClosed || state.walls.length === 0) return state;

        const wallIndex = state.walls.findIndex((w) => w.id === wallId);
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
        const prevLength = Math.sqrt(
            Math.pow(newStart.x - prevWall.start.x, 2) + Math.pow(newStart.y - prevWall.start.y, 2),
        );
        newWalls[prevWallIndex] = {
            ...prevWall,
            end: { ...newStart },
            length: prevLength,
        };

        // Update the next wall's start point (it shares end vertex with this wall)
        const nextWallIndex = (wallIndex + 1) % numWalls;
        const nextWall = newWalls[nextWallIndex];
        const nextLength = Math.sqrt(Math.pow(nextWall.end.x - newEnd.x, 2) + Math.pow(nextWall.end.y - newEnd.y, 2));
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

    roomStore.update((state) => {
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
            length: Math.sqrt(
                Math.pow(currentWall.end.x - prevWall.start.x, 2) + Math.pow(currentWall.end.y - prevWall.start.y, 2),
            ),
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
        return { ...state, walls: newWalls };
    });

    return success;
}

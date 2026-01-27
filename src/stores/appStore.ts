import { writable, derived } from 'svelte/store';
import type { AppMode, ViewMode, Tool } from '../types';
import { selectionService } from '../services/SelectionService';

export const appMode = writable<AppMode>('drafting');
export const viewMode = writable<ViewMode>('editor');
export const activeTool = writable<Tool>('select');
export const selectedLightIds = writable<Set<string>>(new Set());
export const selectedWallId = writable<string | null>(null);
export const selectedVertexIndices = writable<Set<number>>(new Set());

// Signal to request camera fit (only used when loading/importing projects)
export const shouldFitCamera = writable<boolean>(false);

export function requestCameraFit(): void {
    shouldFitCamera.set(true);
}

// Derived store for backward compatibility - returns first selected vertex or null
export const selectedVertexIndex = derived(selectedVertexIndices, ($indices) =>
    $indices.size > 0 ? Array.from($indices)[0] : null
);

// Derived store for backward compatibility - returns first selected light or null
export const selectedLightId = derived(selectedLightIds, ($ids) =>
    $ids.size > 0 ? Array.from($ids)[0] : null
);

export const isDrawingEnabled = derived(
    [appMode, activeTool],
    ([$mode, $tool]) => $mode === 'drafting' && $tool === 'draw'
);

export const isLightPlacementEnabled = derived(
    [appMode, activeTool],
    ([$mode, $tool]) => $mode === 'drafting' && $tool === 'light'
);

export const selectedDoorId = writable<string | null>(null);

export const isDoorPlacementEnabled = derived(
    [appMode, activeTool],
    ([$mode, $tool]) => $mode === 'drafting' && $tool === 'door'
);

export const selectedObstacleId = writable<string | null>(null);
export const selectedObstacleVertexIndices = writable<Set<number>>(new Set());
export const isObstacleDrawingEnabled = derived(
    [appMode, activeTool],
    ([$mode, $tool]) => $mode === 'drafting' && $tool === 'obstacle'
);
export function setViewMode(mode: ViewMode): void {
    viewMode.set(mode);
    if (mode !== 'editor') {
        appMode.set('viewing');
    } else {
        appMode.set('drafting');
    }
}

export function setActiveTool(tool: Tool): void {
    activeTool.set(tool);
    selectedLightIds.set(new Set());
    selectedWallId.set(null);
    selectedDoorId.set(null);
    selectedObstacleId.set(null);
    selectedObstacleVertexIndices.set(new Set());
}

export function clearSelection(): void {
    selectedLightIds.set(new Set());
    selectedWallId.set(null);
    selectedVertexIndices.set(new Set());
    selectedDoorId.set(null);
    selectedObstacleId.set(null);
    selectedObstacleVertexIndices.set(new Set());
}

// Light selection helpers
export function selectLight(id: string, addToSelection: boolean = false): void {
    selectedLightIds.update((ids) => selectionService.selectItem(ids, id, addToSelection));
    selectedWallId.set(null);
    selectedVertexIndices.set(new Set());
}

export function clearLightSelection(): void {
    selectedLightIds.set(new Set());
}

// Vertex selection helpers
export function selectVertex(index: number, addToSelection: boolean = false): void {
    selectedVertexIndices.update((indices) =>
        selectionService.selectItem(indices, index, addToSelection)
    );
    selectedWallId.set(null);
    selectedLightIds.set(new Set());
}

export function clearVertexSelection(): void {
    selectedVertexIndices.set(new Set());
}

// Wall selection helpers
export function clearWallSelection(): void {
    selectedWallId.set(null);
}

// Door selection helpers
export function selectDoor(id: string): void {
    selectedDoorId.set(id);
    selectedWallId.set(null);
    selectedLightIds.set(new Set());
    selectedVertexIndices.set(new Set());
}

export function clearDoorSelection(): void {
    selectedDoorId.set(null);
}
// Obstacle selection helpers
export function selectObstacle(id: string): void {
    selectedObstacleId.set(id);
    selectedObstacleVertexIndices.set(new Set());
    selectedWallId.set(null);
    selectedLightIds.set(new Set());
    selectedVertexIndices.set(new Set());
    selectedDoorId.set(null);
}
export function clearObstacleSelection(): void {
    selectedObstacleId.set(null);
    selectedObstacleVertexIndices.set(new Set());
}
// Obstacle vertex selection helpers
export function selectObstacleVertex(
    obstacleId: string,
    vertexIndex: number,
    addToSelection: boolean = false
): void {
    selectedObstacleId.set(obstacleId);
    selectedObstacleVertexIndices.update((indices) =>
        selectionService.selectItem(indices, vertexIndex, addToSelection)
    );
    selectedWallId.set(null);
    selectedLightIds.set(new Set());
    selectedVertexIndices.set(new Set());
    selectedDoorId.set(null);
}
export function clearObstacleVertexSelection(): void {
    selectedObstacleVertexIndices.set(new Set());
}

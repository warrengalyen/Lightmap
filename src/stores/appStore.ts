import { writable, derived, get } from "svelte/store";
import type { AppMode, ViewMode, Tool } from "../types";

export const appMode = writable<AppMode>("drafting");
export const viewMode = writable<ViewMode>("editor");
export const activeTool = writable<Tool>("select");
export const selectedLightIds = writable<Set<string>>(new Set());
export const selectedWallId = writable<string | null>(null);
export const selectedVertexIndices = writable<Set<number>>(new Set());

// Derived store for backward compatibility - returns first selected vertex or null
export const selectedVertexIndex = derived(selectedVertexIndices, ($indices) =>
    $indices.size > 0 ? Array.from($indices)[0] : null,
);

// Derived store for backward compatibility - returns first selected light or null
export const selectedLightId = derived(selectedLightIds, ($ids) => ($ids.size > 0 ? Array.from($ids)[0] : null));

export const isDrawingEnabled = derived(
    [appMode, activeTool],
    ([$mode, $tool]) => $mode === "drafting" && $tool === "draw",
);

export const isLightPlacementEnabled = derived(
    [appMode, activeTool],
    ([$mode, $tool]) => $mode === "drafting" && $tool === "light",
);

export function setViewMode(mode: ViewMode): void {
    viewMode.set(mode);
    if (mode !== "editor") {
        appMode.set("viewing");
    } else {
        appMode.set("drafting");
    }
}

export function setActiveTool(tool: Tool): void {
    activeTool.set(tool);
    selectedLightIds.set(new Set());
    selectedWallId.set(null);
}

export function clearSelection(): void {
    selectedLightIds.set(new Set());
    selectedWallId.set(null);
    selectedVertexIndices.set(new Set());
}

// Light selection helpers
export function selectLight(id: string, addToSelection: boolean = false): void {
    if (addToSelection) {
        selectedLightIds.update((ids) => {
            const newIds = new Set(ids);
            if (newIds.has(id)) {
                newIds.delete(id); // Toggle off if already selected
            } else {
                newIds.add(id);
            }
            return newIds;
        });
    } else {
        selectedLightIds.set(new Set([id]));
    }
    selectedWallId.set(null);
    selectedVertexIndices.set(new Set());
}

export function deselectLight(id: string): void {
    selectedLightIds.update((ids) => {
        const newIds = new Set(ids);
        newIds.delete(id);
        return newIds;
    });
}

export function clearLightSelection(): void {
    selectedLightIds.set(new Set());
}

export function isLightSelected(id: string): boolean {
    return get(selectedLightIds).has(id);
}

// Vertex selection helpers
export function selectVertex(index: number, addToSelection: boolean = false): void {
    if (addToSelection) {
        selectedVertexIndices.update((indices) => {
            const newIndices = new Set(indices);
            if (newIndices.has(index)) {
                newIndices.delete(index); // Toggle off if already selected
            } else {
                newIndices.add(index);
            }
            return newIndices;
        });
    } else {
        selectedVertexIndices.set(new Set([index]));
    }
    selectedWallId.set(null);
    selectedLightIds.set(new Set());
}

export function clearVertexSelection(): void {
    selectedVertexIndices.set(new Set());
}

export function isVertexSelected(index: number): boolean {
    return get(selectedVertexIndices).has(index);
}

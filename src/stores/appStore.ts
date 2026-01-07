import { writable, derived } from "svelte/store";
import type { AppMode, ViewMode, Tool } from "../types";

export const appMode = writable<AppMode>("drafting");
export const viewMode = writable<ViewMode>("editor");
export const activeTool = writable<Tool>("draw");
export const selectedLightId = writable<string | null>(null);
export const selectedWallId = writable<string | null>(null);
export const selectedVertexIndex = writable<number | null>(null);

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
    selectedLightId.set(null);
    selectedWallId.set(null);
}

export function clearSelection(): void {
    selectedLightId.set(null);
    selectedWallId.set(null);
    selectedVertexIndex.set(null);
}

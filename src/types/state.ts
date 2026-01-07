import type { WallSegment } from "./geometry";
import type { LightFixture } from "./lighting";

export interface RoomState {
    ceilingHeight: number;
    walls: WallSegment[];
    lights: LightFixture[];
    isClosed: boolean;
}

export type AppMode = "drafting" | "viewing";
export type ViewMode = "editor" | "shadow" | "heatmap";
export type Tool = "select" | "draw" | "light";

export interface AppState {
    mode: AppMode;
    viewMode: ViewMode;
    activeTool: Tool;
    selectedLightId: string | null;
}

export interface RafterConfig {
    orientation: "horizontal" | "vertical";
    spacing: number;
    offsetX: number;
    offsetY: number;
    visible: boolean;
}

export interface DisplayPreferences {
    useFractions: boolean;
    snapThreshold: number;
}

export const DEFAULT_ROOM_STATE: RoomState = {
    ceilingHeight: 8.0,
    walls: [],
    lights: [],
    isClosed: false,
};

export const DEFAULT_APP_STATE: AppState = {
    mode: "drafting",
    viewMode: "editor",
    activeTool: "draw",
    selectedLightId: null,
};

export const DEFAULT_RAFTER_CONFIG: RafterConfig = {
    orientation: "horizontal",
    spacing: 1.333,
    offsetX: 0,
    offsetY: 0,
    visible: false,
};

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
    useFractions: true,
    snapThreshold: 0.5,
};

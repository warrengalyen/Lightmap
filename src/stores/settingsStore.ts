import { writable, get } from "svelte/store";
import type { RafterConfig, DisplayPreferences } from "../types";
import { DEFAULT_RAFTER_CONFIG, DEFAULT_DISPLAY_PREFERENCES } from "../types";
import { roomStore } from "./roomStore";

export const rafterConfig = writable<RafterConfig>({ ...DEFAULT_RAFTER_CONFIG });

export const displayPreferences = writable<DisplayPreferences>({
    ...DEFAULT_DISPLAY_PREFERENCES,
});

// Flag to prevent circular updates during initialization
let isInitializing = false;

// Sync settings to roomStore when they change
rafterConfig.subscribe((config) => {
    if (!isInitializing) {
        roomStore.update((state) => ({ ...state, rafterConfig: config }));
    }
});

displayPreferences.subscribe((prefs) => {
    if (!isInitializing) {
        roomStore.update((state) => ({ ...state, displayPreferences: prefs }));
    }
});

// Initialize settings from roomStore
export function initSettingsFromRoom(): void {
    isInitializing = true;
    const state = get(roomStore);
    if (state.rafterConfig) {
        // Merge with defaults to handle missing dields from old data
        rafterConfig.set({ ...DEFAULT_RAFTER_CONFIG, ...state.rafterConfig });
    }
    if (state.displayPreferences) {
        // Merge with defaults to handle missing fields from old data
        displayPreferences.set({ ...DEFAULT_DISPLAY_PREFERENCES, ...state.displayPreferences });
    }
    isInitializing = false;
}

export function toggleRafters(): void {
    rafterConfig.update((config) => ({ ...config, visible: !config.visible }));
}

export function setRafterOrientation(orientation: "horizontal" | "vertical"): void {
    rafterConfig.update((config) => ({ ...config, orientation }));
}

export function setRafterSpacing(spacing: number): void {
    rafterConfig.update((config) => ({ ...config, spacing }));
}

export function toggleUnitFormat(): void {
    displayPreferences.update((prefs) => ({
        ...prefs,
        unitFormat: prefs.unitFormat === "feet-inches" ? "inches" : "feet-inches",
    }));
}

export function setUnitFormat(format: "feet-inches" | "inches"): void {
    displayPreferences.update((prefs) => ({ ...prefs, unitFormat: format }));
}

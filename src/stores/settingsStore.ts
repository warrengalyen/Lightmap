import { writable } from "svelte/store";
import type { RafterConfig, DisplayPreferences } from "../types";
import { DEFAULT_RAFTER_CONFIG, DEFAULT_DISPLAY_PREFERENCES } from "../types";

export const rafterConfig = writable<RafterConfig>({ ...DEFAULT_RAFTER_CONFIG });

export const displayPreferences = writable<DisplayPreferences>({
    ...DEFAULT_DISPLAY_PREFERENCES,
});

export function toggleRafters(): void {
    rafterConfig.update((config) => ({ ...config, visible: !config.visible }));
}

export function setRafterOrientation(orientation: "horizontal" | "vertical"): void {
    rafterConfig.update((config) => ({ ...config, orientation }));
}

export function setRafterSpacing(spacing: number): void {
    rafterConfig.update((config) => ({ ...config, spacing }));
}

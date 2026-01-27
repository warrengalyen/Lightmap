import { writable, get } from 'svelte/store';
import type { RafterConfig, DisplayPreferences } from '../types';
import { DEFAULT_RAFTER_CONFIG, DEFAULT_DISPLAY_PREFERENCES } from '../types';
import { roomStore } from './roomStore';

export const rafterConfig = writable<RafterConfig>({ ...DEFAULT_RAFTER_CONFIG });

export const displayPreferences = writable<DisplayPreferences>({
  ...DEFAULT_DISPLAY_PREFERENCES,
});

// Flag to prevent circular updates during initialization from saved state
let isLoadingFromSavedState = false;

// Sync settings to roomStore when they change (but not during initial load)
rafterConfig.subscribe((config) => {
  if (!isLoadingFromSavedState) {
    roomStore.update(state => ({ ...state, rafterConfig: config }));
  }
});

displayPreferences.subscribe((prefs) => {
  if (!isLoadingFromSavedState) {
    roomStore.update(state => ({ ...state, displayPreferences: prefs }));
  }
});

// Initialize settings from roomStore (called when loading saved projects)
export function initSettingsFromRoom(): void {
  isLoadingFromSavedState = true;
  const state = get(roomStore);
  if (state.rafterConfig) {
    // Merge with defaults to handle missing fields from old data
    rafterConfig.set({ ...DEFAULT_RAFTER_CONFIG, ...state.rafterConfig });
  }
  if (state.displayPreferences) {
    // Merge with defaults to handle missing fields from old data
    const mergedPrefs = { ...DEFAULT_DISPLAY_PREFERENCES, ...state.displayPreferences };
    // Migrate legacy 'never' value to 'selected'
    if ((mergedPrefs.lightRadiusVisibility as string) === 'never') {
      mergedPrefs.lightRadiusVisibility = 'selected';
    }
    displayPreferences.set(mergedPrefs);
  }
  isLoadingFromSavedState = false;
}

export function toggleRafters(): void {
  rafterConfig.update((config) => ({ ...config, visible: !config.visible }));
}

export function setRafterOrientation(orientation: 'horizontal' | 'vertical'): void {
  rafterConfig.update((config) => ({ ...config, orientation }));
}

export function setRafterSpacing(spacing: number): void {
  rafterConfig.update((config) => ({ ...config, spacing }));
}

export function toggleUnitFormat(): void {
  displayPreferences.update((prefs) => ({
    ...prefs,
    unitFormat: prefs.unitFormat === 'feet-inches' ? 'inches' : 'feet-inches',
  }));
}


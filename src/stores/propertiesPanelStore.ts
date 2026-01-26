import { writable } from 'svelte/store';

export interface PropertiesPanelConfig {
  visible: boolean;
  position: { x: number; y: number };
}

const DEFAULT_CONFIG: PropertiesPanelConfig = {
  visible: false,
  position: { x: -1, y: -1 }, // -1 means use default CSS position
};

// Load saved position from localStorage
function loadConfig(): PropertiesPanelConfig {
  try {
    const saved = localStorage.getItem('propertiesPanelConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load properties panel config:', e);
  }
  return DEFAULT_CONFIG;
}

// Save position to localStorage
function saveConfig(config: PropertiesPanelConfig): void {
  try {
    localStorage.setItem('propertiesPanelConfig', JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save properties panel config:', e);
  }
}

export const propertiesPanelConfig = writable<PropertiesPanelConfig>(loadConfig());

// Subscribe to changes and save to localStorage
propertiesPanelConfig.subscribe((config) => {
  saveConfig(config);
});

export function togglePropertiesPanel(): void {
  propertiesPanelConfig.update((config) => ({
    ...config,
    visible: !config.visible,
  }));
}


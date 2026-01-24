import { writable } from 'svelte/store';
import type { DeadZoneConfig } from '../types';
import { DEFAULT_DEAD_ZONE_CONFIG } from '../types';

export const deadZoneConfig = writable<DeadZoneConfig>({
  ...DEFAULT_DEAD_ZONE_CONFIG,
});

export function toggleDeadZones(): void {
  deadZoneConfig.update((config) => ({
    ...config,
    enabled: !config.enabled,
  }));
}

export function setDeadZoneThreshold(threshold: number): void {
  deadZoneConfig.update((config) => ({
    ...config,
    threshold: Math.max(1, Math.min(100, threshold)),
  }));
}

export function setDeadZoneColor(r: number, g: number, b: number): void {
  deadZoneConfig.update((config) => ({
    ...config,
    color: { r, g, b },
  }));
}

export function setDeadZoneOpacity(opacity: number): void {
  deadZoneConfig.update((config) => ({
    ...config,
    opacity: Math.max(0.1, Math.min(1, opacity)),
  }));
}

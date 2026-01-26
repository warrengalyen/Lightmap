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


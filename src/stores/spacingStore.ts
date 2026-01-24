import { writable, derived } from 'svelte/store';
import type { SpacingConfig, SpacingWarning } from '../types';
import { DEFAULT_SPACING_CONFIG } from '../types';
import { roomStore } from './roomStore';
import { SpacingAnalyzer } from '../lighting/SpacingAnalyzer';

export const spacingConfig = writable<SpacingConfig>({
  ...DEFAULT_SPACING_CONFIG,
});

const analyzer = new SpacingAnalyzer();

export const spacingWarnings = derived(
  [roomStore, spacingConfig],
  ([$room, $config]): SpacingWarning[] => {
    if (!$config.enabled || $room.lights.length < 2) {
      return [];
    }

    return analyzer.analyzeSpacing($room.lights, $room.ceilingHeight, $config);
  }
);

export function toggleSpacingWarnings(): void {
  spacingConfig.update((config) => ({
    ...config,
    enabled: !config.enabled,
  }));
}

export function setOverlapFactor(factor: number): void {
  spacingConfig.update((config) => ({
    ...config,
    overlapFactor: Math.max(0.3, Math.min(1, factor)),
  }));
}

export function setGapTolerance(tolerance: number): void {
  spacingConfig.update((config) => ({
    ...config,
    gapTolerance: Math.max(0.1, Math.min(0.8, tolerance)),
  }));
}

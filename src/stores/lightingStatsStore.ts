import { writable, derived, type Readable } from 'svelte/store';
import type { LightingStatsConfig, LightingMetrics, RoomType } from '../types';
import { DEFAULT_LIGHTING_STATS_CONFIG } from '../types';
import { roomStore, roomBounds } from './roomStore';
import { LightingStatsCalculator } from '../lighting/LightingStatsCalculator';

export const lightingStatsConfig = writable<LightingStatsConfig>({
  ...DEFAULT_LIGHTING_STATS_CONFIG,
});

const calculator = new LightingStatsCalculator();

// Debounce helper - calls immediately with first value, then debounces updates
function debounce<T>(store: Readable<T>, delay: number): Readable<T> {
  return {
    subscribe(fn: (value: T) => void) {
      let timer: ReturnType<typeof setTimeout>;
      let lastValue: T;
      let initialized = false;

      return store.subscribe((value) => {
        lastValue = value;

        // Call immediately for first value
        if (!initialized) {
          initialized = true;
          fn(value);
          return;
        }

        clearTimeout(timer);
        timer = setTimeout(() => fn(lastValue), delay);
      });
    },
  };
}

// Combined store for inputs that affect metrics
const metricsInputs = derived(
  [roomStore, roomBounds, lightingStatsConfig],
  ([$room, $bounds, $config]) => ({
    lights: $room.lights,
    walls: $room.walls,
    ceilingHeight: $room.ceilingHeight,
    bounds: $bounds,
    gridSpacing: $config.gridSpacing,
    visible: $config.visible,
    roomType: $config.roomType,
  })
);

// Debounced version of inputs
const debouncedInputs = debounce(metricsInputs, 150);

// Derived store for calculated metrics
export const lightingMetrics = derived<typeof debouncedInputs, LightingMetrics | null>(
  debouncedInputs,
  ($inputs) => {
    if (!$inputs.visible) {
      return null;
    }

    return calculator.calculateMetrics(
      $inputs.lights,
      $inputs.walls,
      $inputs.bounds,
      $inputs.ceilingHeight,
      $inputs.gridSpacing,
      $inputs.roomType
    );
  }
);

export function toggleLightingStats(): void {
  lightingStatsConfig.update((config) => ({
    ...config,
    visible: !config.visible,
  }));
}

export function setRoomType(roomType: RoomType): void {
  lightingStatsConfig.update((config) => ({
    ...config,
    roomType,
  }));
}

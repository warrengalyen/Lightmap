import { writable, get } from 'svelte/store';
import { DOOR_WIDTHS, DEFAULT_DOOR_WIDTH } from '../interactions/handlers/DoorPlacementHandler';
import type { DoorSwingDirection, DoorSwingSide } from '../types';

export interface DoorPlacementSettings {
  width: number;
  swingDirection: DoorSwingDirection;
  swingSide: DoorSwingSide;
}

const DEFAULT_SETTINGS: DoorPlacementSettings = {
  width: DEFAULT_DOOR_WIDTH,
  swingDirection: 'right',
  swingSide: 'inside',
};

export const doorPlacementSettings = writable<DoorPlacementSettings>({ ...DEFAULT_SETTINGS });

export function setDoorWidth(width: number): void {
  doorPlacementSettings.update(s => ({ ...s, width }));
}

export function setDoorSwingDirection(direction: DoorSwingDirection): void {
  doorPlacementSettings.update(s => ({ ...s, swingDirection: direction }));
}

export function setDoorSwingSide(side: DoorSwingSide): void {
  doorPlacementSettings.update(s => ({ ...s, swingSide: side }));
}

export function getSelectedDoorWidth(): number {
  return get(doorPlacementSettings).width;
}

export function getDoorPlacementSettings(): DoorPlacementSettings {
  return get(doorPlacementSettings);
}

export { DOOR_WIDTHS, DEFAULT_DOOR_WIDTH };

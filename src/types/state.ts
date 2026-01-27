import type { WallSegment, Door, Obstacle } from './geometry';
import type { LightFixture } from './lighting';

export interface RoomState {
  ceilingHeight: number;
  walls: WallSegment[];
  lights: LightFixture[];
  doors: Door[];
  obstacles: Obstacle[];
  isClosed: boolean;
  rafterConfig?: RafterConfig;
  displayPreferences?: DisplayPreferences;
}

export type AppMode = 'drafting' | 'viewing';
export type ViewMode = 'editor' | 'shadow' | 'heatmap';
export type Tool = 'select' | 'draw' | 'light' | 'door' | 'obstacle';

export interface RafterConfig {
  orientation: 'horizontal' | 'vertical';
  spacing: number;
  offsetX: number;
  offsetY: number;
  visible: boolean;
}

export type UnitFormat = 'feet-inches' | 'inches';
export type LightRadiusVisibility = 'selected' | 'always';

export interface DisplayPreferences {
  useFractions: boolean;
  snapThreshold: number;
  unitFormat: UnitFormat;
  gridSnapEnabled: boolean;
  gridSize: number; // in feet
  lightRadiusVisibility: LightRadiusVisibility;
}

export interface PropertiesPanelConfig {
  visible: boolean;
  position: { x: number; y: number };
}

export const DEFAULT_ROOM_STATE: RoomState = {
  ceilingHeight: 8.0,
  walls: [],
  lights: [],
  doors: [],
  obstacles: [],
  isClosed: false,
};



export const DEFAULT_RAFTER_CONFIG: RafterConfig = {
  orientation: 'horizontal',
  spacing: 1.333,
  offsetX: 0,
  offsetY: 0,
  visible: false,
};

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  useFractions: true,
  snapThreshold: 0.5,
  unitFormat: 'feet-inches',
  gridSnapEnabled: false,
  gridSize: 0.5, // 6 inches
  lightRadiusVisibility: 'selected',
};

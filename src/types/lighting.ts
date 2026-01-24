import type { Vector2 } from './geometry';

export interface LightProperties {
  lumen: number;
  beamAngle: number;
  warmth: number;
}

export interface LightDefinition {
  id: string;
  name: string;
  lumen: number;
  beamAngle: number;
  warmth: number;
}

export interface LightFixture {
  id: string;
  position: Vector2;
  definitionId?: string;
  properties: LightProperties;
}

export const DEFAULT_LIGHT_PROPERTIES: LightProperties = {
  lumen: 800,
  beamAngle: 60,
  warmth: 2700,
};

export const DEFAULT_LIGHT_DEFINITIONS: LightDefinition[] = [
  { id: 'led-standard', name: 'LED Standard (800lm, 60°)', lumen: 800, beamAngle: 60, warmth: 2700 },
  { id: 'led-bright', name: 'LED Bright (1100lm, 60°)', lumen: 1100, beamAngle: 60, warmth: 3000 },
  { id: 'led-flood', name: 'LED Flood (925lm, 114°)', lumen: 925, beamAngle: 114, warmth: 3000 },
  { id: 'led-spot', name: 'LED Spot (600lm, 40°)', lumen: 600, beamAngle: 40, warmth: 2700 },
  { id: 'led-narrow', name: 'LED Narrow (750lm, 25°)', lumen: 750, beamAngle: 25, warmth: 3000 },
];

// Lighting Stats Types
export type RoomType = 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'office' | 'hallway';

export interface LightingMetrics {
  minLux: number;
  maxLux: number;
  avgLux: number;
  uniformityRatio: number;
  coverageGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  sampleCount: number;
  // New metrics
  roomArea: number;
  totalLumens: number;
  lumensPerSqFt: number;
  recommendedLumens: number;
  additionalLightsNeeded: number;
  roomType: RoomType;
}

// Lumens per square foot recommendations by room type
export const ROOM_LIGHTING_STANDARDS: Record<RoomType, { min: number; ideal: number; label: string }> = {
  living: { min: 10, ideal: 20, label: 'Living Room' },
  kitchen: { min: 30, ideal: 50, label: 'Kitchen' },
  bedroom: { min: 10, ideal: 20, label: 'Bedroom' },
  bathroom: { min: 40, ideal: 60, label: 'Bathroom' },
  office: { min: 30, ideal: 50, label: 'Home Office' },
  hallway: { min: 5, ideal: 10, label: 'Hallway' },
};

export interface LightingStatsConfig {
  visible: boolean;
  gridSpacing: number;
  roomType: RoomType;
}

export const DEFAULT_LIGHTING_STATS_CONFIG: LightingStatsConfig = {
  visible: false,
  gridSpacing: 0.5,
  roomType: 'living',
};

// Dead Zone Types
export interface DeadZoneConfig {
  enabled: boolean;
  threshold: number;
  color: { r: number; g: number; b: number };
  opacity: number;
}

export const DEFAULT_DEAD_ZONE_CONFIG: DeadZoneConfig = {
  enabled: false,
  threshold: 5,
  color: { r: 1.0, g: 0.0, b: 0.0 },
  opacity: 0.4,
};

// Spacing Warning Types
export type SpacingWarningType = 'too_close' | 'too_far';
export type SpacingSeverity = 'low' | 'medium' | 'high';

export interface SpacingWarning {
  light1Id: string;
  light2Id: string;
  light1Position: { x: number; y: number };
  light2Position: { x: number; y: number };
  type: SpacingWarningType;
  severity: SpacingSeverity;
  actualDistance: number;
  optimalDistance: number;
}

export interface SpacingConfig {
  enabled: boolean;
  overlapFactor: number;
  gapTolerance: number;
}

export const DEFAULT_SPACING_CONFIG: SpacingConfig = {
  enabled: false,
  overlapFactor: 0.7,
  gapTolerance: 0.3,
};

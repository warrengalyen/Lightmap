import type { RoomState, WallSegment, LightFixture, RafterConfig, DisplayPreferences, LightDefinition, Door, DoorSwingDirection, DoorSwingSide } from '../types';
import { mergeLightDefinitions } from '../stores/lightDefinitionsStore';
import type { ExportData } from './jsonExport';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateRoomState(data: unknown): RoomState {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid data format: expected an object');
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.ceilingHeight !== 'number' || obj.ceilingHeight <= 0) {
    throw new ValidationError('Invalid ceilingHeight: must be a positive number');
  }

  if (!Array.isArray(obj.walls)) {
    throw new ValidationError('Invalid walls: must be an array');
  }

  for (const wall of obj.walls) {
    validateWallSegment(wall);
  }

  if (!Array.isArray(obj.lights)) {
    throw new ValidationError('Invalid lights: must be an array');
  }

  for (const light of obj.lights) {
    validateLightFixture(light);
  }

  if (typeof obj.isClosed !== 'boolean') {
    throw new ValidationError('Invalid isClosed: must be a boolean');
  }

  // Validate doors (optional for backwards compatibility)
  let doors: Door[] = [];
  if (obj.doors !== undefined) {
    if (!Array.isArray(obj.doors)) {
      throw new ValidationError('Invalid doors: must be an array');
    }
    for (const door of obj.doors) {
      validateDoor(door);
    }
    // Apply migration: add swingSide if missing
    doors = (obj.doors as Door[]).map(door => ({
      ...door,
      swingSide: door.swingSide ?? 'inside',
    }));
  }

  const result: RoomState = {
    ceilingHeight: obj.ceilingHeight,
    walls: obj.walls as WallSegment[],
    lights: obj.lights as LightFixture[],
    doors,
    isClosed: obj.isClosed,
  };

  if (obj.rafterConfig !== undefined) {
    result.rafterConfig = validateRafterConfig(obj.rafterConfig);
  }

  if (obj.displayPreferences !== undefined) {
    result.displayPreferences = validateDisplayPreferences(obj.displayPreferences);
  }

  return result;
}

function validateWallSegment(data: unknown): void {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid wall segment: expected an object');
  }

  const wall = data as Record<string, unknown>;

  if (typeof wall.id !== 'string') {
    throw new ValidationError('Invalid wall id: must be a string');
  }

  validateVector2(wall.start, 'wall.start');
  validateVector2(wall.end, 'wall.end');

  if (typeof wall.length !== 'number' || wall.length < 0) {
    throw new ValidationError('Invalid wall length: must be a non-negative number');
  }
}

function validateLightFixture(data: unknown): void {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid light fixture: expected an object');
  }

  const light = data as Record<string, unknown>;

  if (typeof light.id !== 'string') {
    throw new ValidationError('Invalid light id: must be a string');
  }

  validateVector2(light.position, 'light.position');

  if (!light.properties || typeof light.properties !== 'object') {
    throw new ValidationError('Invalid light properties: must be an object');
  }

  const props = light.properties as Record<string, unknown>;

  if (typeof props.lumen !== 'number' || props.lumen < 0) {
    throw new ValidationError('Invalid lumen: must be a non-negative number');
  }

  if (typeof props.beamAngle !== 'number' || props.beamAngle <= 0 || props.beamAngle > 180) {
    throw new ValidationError('Invalid beamAngle: must be between 0 and 180');
  }

  if (typeof props.warmth !== 'number' || props.warmth < 1000 || props.warmth > 10000) {
    throw new ValidationError('Invalid warmth: must be between 1000K and 10000K');
  }
}

function validateDoor(data: unknown): void {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid door: expected an object');
  }

  const door = data as Record<string, unknown>;

  if (typeof door.id !== 'string') {
    throw new ValidationError('Invalid door id: must be a string');
  }

  if (typeof door.wallId !== 'string') {
    throw new ValidationError('Invalid door wallId: must be a string');
  }

  if (typeof door.position !== 'number' || door.position < 0) {
    throw new ValidationError('Invalid door position: must be a non-negative number');
  }

  if (typeof door.width !== 'number' || door.width <= 0) {
    throw new ValidationError('Invalid door width: must be a positive number');
  }

  const validSwingDirections: DoorSwingDirection[] = ['left', 'right'];
  if (!validSwingDirections.includes(door.swingDirection as DoorSwingDirection)) {
    throw new ValidationError('Invalid door swingDirection: must be "left" or "right"');
  }

  // swingSide is optional for backwards compatibility (defaults to 'inside')
  if (door.swingSide !== undefined) {
    const validSwingSides: DoorSwingSide[] = ['inside', 'outside'];
    if (!validSwingSides.includes(door.swingSide as DoorSwingSide)) {
      throw new ValidationError('Invalid door swingSide: must be "inside" or "outside"');
    }
  }
}

function validateRafterConfig(data: unknown): RafterConfig {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid rafter config: expected an object');
  }

  const config = data as Record<string, unknown>;

  if (config.orientation !== 'horizontal' && config.orientation !== 'vertical') {
    throw new ValidationError('Invalid rafter orientation: must be "horizontal" or "vertical"');
  }

  if (typeof config.spacing !== 'number' || config.spacing <= 0) {
    throw new ValidationError('Invalid rafter spacing: must be a positive number');
  }

  if (typeof config.offsetX !== 'number') {
    throw new ValidationError('Invalid rafter offsetX: must be a number');
  }

  if (typeof config.offsetY !== 'number') {
    throw new ValidationError('Invalid rafter offsetY: must be a number');
  }

  if (typeof config.visible !== 'boolean') {
    throw new ValidationError('Invalid rafter visible: must be a boolean');
  }

  return {
    orientation: config.orientation,
    spacing: config.spacing,
    offsetX: config.offsetX,
    offsetY: config.offsetY,
    visible: config.visible,
  };
}

function validateDisplayPreferences(data: unknown): DisplayPreferences {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid display preferences: expected an object');
  }

  const prefs = data as Record<string, unknown>;

  if (typeof prefs.useFractions !== 'boolean') {
    throw new ValidationError('Invalid useFractions: must be a boolean');
  }

  if (typeof prefs.snapThreshold !== 'number' || prefs.snapThreshold < 0) {
    throw new ValidationError('Invalid snapThreshold: must be a non-negative number');
  }

  if (prefs.unitFormat !== 'feet-inches' && prefs.unitFormat !== 'inches') {
    throw new ValidationError('Invalid unitFormat: must be "feet-inches" or "inches"');
  }

  // gridSnapEnabled and gridSize are optional for backwards compatibility
  const gridSnapEnabled = typeof prefs.gridSnapEnabled === 'boolean' ? prefs.gridSnapEnabled : false;
  const gridSize = typeof prefs.gridSize === 'number' && prefs.gridSize > 0 ? prefs.gridSize : 0.5;

  // lightRadiusVisibility is optional for backwards compatibility
  const validVisibilityValues = ['selected', 'always'];
  const rawVisibility = prefs.lightRadiusVisibility as string | undefined;
  const lightRadiusVisibility = rawVisibility && validVisibilityValues.includes(rawVisibility)
    ? (rawVisibility as 'selected' | 'always')
    : 'selected';

  return {
    useFractions: prefs.useFractions,
    snapThreshold: prefs.snapThreshold,
    unitFormat: prefs.unitFormat,
    gridSnapEnabled,
    gridSize,
    lightRadiusVisibility,
  };
}

function validateVector2(data: unknown, field: string): void {
  if (!data || typeof data !== 'object') {
    throw new ValidationError(`Invalid ${field}: expected an object`);
  }

  const vec = data as Record<string, unknown>;

  if (typeof vec.x !== 'number') {
    throw new ValidationError(`Invalid ${field}.x: must be a number`);
  }

  if (typeof vec.y !== 'number') {
    throw new ValidationError(`Invalid ${field}.y: must be a number`);
  }
}

export async function importFromJSON(file: File): Promise<RoomState> {
  const text = await file.text();
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new ValidationError('Invalid JSON format');
  }

  return processImportData(data);
}

export function importFromString(jsonString: string): RoomState {
  let data: unknown;

  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new ValidationError('Invalid JSON format');
  }

  return processImportData(data);
}

function processImportData(data: unknown): RoomState {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid data format: expected an object');
  }

  const obj = data as Record<string, unknown>;

  // Check if this is the new export format (version 1+)
  if (obj.version === 1 && obj.roomState) {
    // New format: { version, roomState, lightDefinitions }
    const exportData = data as ExportData;

    // Validate and merge light definitions first
    if (Array.isArray(exportData.lightDefinitions)) {
      const validDefinitions = exportData.lightDefinitions.filter(validateLightDefinition);
      if (validDefinitions.length > 0) {
        mergeLightDefinitions(validDefinitions);
      }
    }

    // Then validate and return the room state
    return validateRoomState(exportData.roomState);
  }

  // Legacy format: direct RoomState object
  return validateRoomState(data);
}

function validateLightDefinition(data: unknown): data is LightDefinition {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const def = data as Record<string, unknown>;

  return (
    typeof def.id === 'string' &&
    typeof def.name === 'string' &&
    typeof def.lumen === 'number' && def.lumen >= 0 &&
    typeof def.beamAngle === 'number' && def.beamAngle > 0 && def.beamAngle <= 180 &&
    typeof def.warmth === 'number' && def.warmth >= 1000 && def.warmth <= 10000
  );
}

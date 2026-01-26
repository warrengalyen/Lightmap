import type { Vector2, LightFixture, WallSegment, Door } from '../../types';
import type { SnapController } from '../../controllers/SnapController';

/**
 * Base configuration for accessing room state.
 * Used by operations and handlers that need to read current room data.
 */
export interface RoomStateAccessor {
  getVertices: () => Vector2[];
  getWalls: () => WallSegment[];
}

/**
 * Extended room state accessor with light access.
 */
export interface RoomStateWithLights extends RoomStateAccessor {
  getLights: () => LightFixture[];
}

/**
 * Extended room state accessor with wall lookup.
 */
export interface RoomStateWithWallLookup extends RoomStateAccessor {
  getWallById: (id: string) => WallSegment | undefined;
}

/**
 * Extended room state accessor with door access.
 */
export interface RoomStateWithDoors extends RoomStateWithWallLookup {
  getDoors: () => Door[];
  getDoorById: (id: string) => Door | undefined;
  getDoorsByWallId: (wallId: string) => Door[];
}

/**
 * Base configuration for snap-enabled operations.
 */
export interface SnapConfig {
  snapController: SnapController;
}

/**
 * Configuration for grid snap operations.
 */
export interface GridSnapEnabledConfig extends SnapConfig {
  getGridSnapEnabled: () => boolean;
  getGridSize: () => number;
}

/**
 * Combined config for operations that need room state and snapping.
 */
export interface BaseDragConfig extends GridSnapEnabledConfig, RoomStateWithLights {
  isRoomClosed: () => boolean;
}

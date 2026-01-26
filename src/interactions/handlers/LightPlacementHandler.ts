import type { InputEvent } from '../../core/InputManager';
import type { LightFixture, WallSegment, Vector2 } from '../../types';
import type { InteractionContext } from '../../types/interaction';
import type { LightManager } from '../../lighting/LightManager';
import type { PolygonValidator } from '../../geometry/PolygonValidator';
import type { SnapController } from '../../controllers/SnapController';
import { BaseInteractionHandler } from '../InteractionHandler';
import { DEFAULT_GRID_SIZE_FT } from '../../constants/editor';

export interface LightPlacementHandlerCallbacks {
  onLightPlaced: (light: LightFixture) => void;
  onSetPreviewLight: (pos: Vector2 | null, isValid?: boolean) => void;
}

export interface LightPlacementHandlerConfig {
  lightManager: LightManager;
  polygonValidator: PolygonValidator;
  snapController: SnapController;
  getSelectedDefinitionId: () => string | null;
  canPlaceLights: () => boolean;
  getWalls: () => WallSegment[];
  getGridSnapEnabled: () => boolean;
  getGridSize: () => number;
}

/**
 * Handles light placement mode.
 * Places lights at clicked positions within the room boundary.
 */
export class LightPlacementHandler extends BaseInteractionHandler {
  readonly name = 'lightPlacement';
  readonly priority = 90;

  private config: LightPlacementHandlerConfig;
  private callbacks: LightPlacementHandlerCallbacks;

  constructor(config: LightPlacementHandlerConfig, callbacks: LightPlacementHandlerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  canHandle(_event: InputEvent, context: InteractionContext): boolean {
    return context.isPlacingLights && this.config.canPlaceLights();
  }

  handleClick(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isPlacingLights || !this.config.canPlaceLights()) {
      return false;
    }

    const { lightManager, polygonValidator, snapController } = this.config;
    const walls = this.config.getWalls();
    let pos = event.worldPos;

    // Apply grid snapping if enabled
    const gridSize = this.config.getGridSize() || DEFAULT_GRID_SIZE_FT;
    if (this.config.getGridSnapEnabled() && gridSize > 0) {
      pos = snapController.snapToGrid(pos, gridSize);
    }

    // Only place lights inside the room
    if (!polygonValidator.isPointInside(pos, walls)) {
      return true; // Consumed the event but didn't place
    }

    const definitionId = this.config.getSelectedDefinitionId();
    const newLight = lightManager.addLight(pos, definitionId ?? undefined);
    this.callbacks.onLightPlaced(newLight);

    return true;
  }

  handleMouseMove(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isPlacingLights || !this.config.canPlaceLights()) {
      this.callbacks.onSetPreviewLight(null);
      return false;
    }

    const { polygonValidator, snapController } = this.config;
    const walls = this.config.getWalls();
    let pos = event.worldPos;

    // Apply grid snapping if enabled
    const gridSize = this.config.getGridSize() || DEFAULT_GRID_SIZE_FT;
    if (this.config.getGridSnapEnabled() && gridSize > 0) {
      pos = snapController.snapToGrid(pos, gridSize);
    }

    // Check if position is inside the room
    const isInside = polygonValidator.isPointInside(pos, walls);

    // Always show preview, but indicate validity with color
    this.callbacks.onSetPreviewLight(pos, isInside);

    return true;
  }
}

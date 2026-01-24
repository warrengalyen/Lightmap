import type { InputEvent } from '../../core/InputManager';
import type { LightFixture, WallSegment } from '../../types';
import type { InteractionContext } from '../../types/interaction';
import type { LightManager } from '../../lighting/LightManager';
import type { PolygonValidator } from '../../geometry/PolygonValidator';
import { BaseInteractionHandler } from '../InteractionHandler';

export interface LightPlacementHandlerCallbacks {
  onLightPlaced: (light: LightFixture) => void;
}

export interface LightPlacementHandlerConfig {
  lightManager: LightManager;
  polygonValidator: PolygonValidator;
  getSelectedDefinitionId: () => string | null;
  canPlaceLights: () => boolean;
  getWalls: () => WallSegment[];
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

    const { lightManager, polygonValidator } = this.config;
    const walls = this.config.getWalls();
    const pos = event.worldPos;

    // Only place lights inside the room
    if (!polygonValidator.isPointInside(pos, walls)) {
      return true; // Consumed the event but didn't place
    }

    const definitionId = this.config.getSelectedDefinitionId();
    const newLight = lightManager.addLight(pos, definitionId ?? undefined);
    this.callbacks.onLightPlaced(newLight);

    return true;
  }
}

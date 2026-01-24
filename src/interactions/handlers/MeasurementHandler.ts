import type { InputEvent } from '../../core/InputManager';
import type { Vector2, WallSegment } from '../../types';
import type { InteractionContext } from '../../types/interaction';
import type { MeasurementController, MeasurementData } from '../../controllers/MeasurementController';
import type { LightManager } from '../../lighting/LightManager';
import { BaseInteractionHandler } from '../InteractionHandler';
import { findVertexAtPosition } from '../../utils/math';
import {
  LIGHT_HIT_TOLERANCE_FT,
  WALL_CLICK_TOLERANCE_FT,
  MEASUREMENT_CLICK_TOLERANCE_FT,
} from '../../constants/editor';

export interface MeasurementHandlerCallbacks {
  onMeasurementUpdate: (data: MeasurementData | null) => void;
  onMeasurementClear: () => void;
  onSelectLight: (id: string) => void;
  onSelectVertex: (index: number, addToSelection: boolean) => void;
  onStartDrag: (vertexIndex: number | null, lightId: string | null, pos: Vector2) => void;
  getWallAtPosition: (pos: Vector2, walls: WallSegment[], tolerance: number) => WallSegment | null;
}

export interface MeasurementHandlerConfig {
  measurementController: MeasurementController;
  lightManager: LightManager;
  getWalls: () => WallSegment[];
}

/**
 * Handles measurement mode.
 * Supports measuring from vertices or lights to vertices, lights, or walls.
 */
export class MeasurementHandler extends BaseInteractionHandler {
  readonly name = 'measurement';
  readonly priority = 110;

  private config: MeasurementHandlerConfig;
  private callbacks: MeasurementHandlerCallbacks;

  constructor(config: MeasurementHandlerConfig, callbacks: MeasurementHandlerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  canHandle(_event: InputEvent, _context: InteractionContext): boolean {
    return this.config.measurementController.isActive;
  }

  handleClick(event: InputEvent, context: InteractionContext): boolean {
    const { measurementController } = this.config;
    if (!measurementController.isActive) return false;

    const vertices = context.vertices;
    const walls = this.config.getWalls();

    if (measurementController.isFromLight) {
      return this.handleClickFromLight(event, context, vertices, walls);
    } else {
      return this.handleClickFromVertex(event, context, vertices);
    }
  }

  handleKeyDown(event: InputEvent, _context: InteractionContext): boolean {
    const { measurementController } = this.config;

    if (event.key === 'Escape' && measurementController.isActive) {
      this.clearMeasurement();
      return true;
    }

    // M key toggles measurement mode
    if ((event.key === 'm' || event.key === 'M') && !event.ctrlKey && !event.altKey) {
      if (measurementController.isActive) {
        this.clearMeasurement();
        return true;
      }
      // Starting measurement is handled elsewhere (needs selection context)
    }

    return false;
  }

  /**
   * Start measurement from a vertex.
   */
  startFromVertex(index: number, position: Vector2): void {
    this.config.measurementController.startFromVertex(index, position);
    this.callbacks.onMeasurementUpdate(null);
  }

  /**
   * Start measurement from a light.
   */
  startFromLight(lightId: string, position: Vector2): void {
    this.config.measurementController.startFromLight(lightId, position);
    this.callbacks.onMeasurementUpdate(null);
  }

  /**
   * Clear the current measurement.
   */
  clearMeasurement(): void {
    this.config.measurementController.clear();
    this.callbacks.onMeasurementClear();
  }

  /**
   * Update the measurement display.
   */
  updateDisplay(): void {
    const data = this.config.measurementController.getMeasurementData();
    this.callbacks.onMeasurementUpdate(data);
  }

  /**
   * Get the measurement controller for external access.
   */
  getController(): MeasurementController {
    return this.config.measurementController;
  }

  private handleClickFromLight(
    event: InputEvent,
    _context: InteractionContext,
    vertices: Vector2[],
    walls: WallSegment[]
  ): boolean {
    const { measurementController, lightManager } = this.config;
    const clickedLight = lightManager.getLightAt(event.worldPos, LIGHT_HIT_TOLERANCE_FT);

    // Check if clicking on the source light to drag it
    if (clickedLight && clickedLight.id === measurementController.sourceLightId) {
      this.callbacks.onSelectLight(clickedLight.id);
      this.callbacks.onStartDrag(null, clickedLight.id, event.worldPos);
      return true;
    }

    // Check if clicking on another light to measure to it
    if (clickedLight && clickedLight.id !== measurementController.sourceLightId) {
      measurementController.setTargetLight(clickedLight.id, clickedLight.position);
      this.updateDisplay();
      return true;
    }

    // Check for wall click
    const wall = this.callbacks.getWallAtPosition(event.worldPos, walls, WALL_CLICK_TOLERANCE_FT);
    if (wall) {
      measurementController.setTargetWall(wall.id, wall);
      this.updateDisplay();
      return true;
    }

    // Check for vertex click
    const clickedVertexIndex = findVertexAtPosition(
      event.worldPos,
      vertices,
      MEASUREMENT_CLICK_TOLERANCE_FT
    );
    if (clickedVertexIndex !== null) {
      measurementController.setTargetVertex(clickedVertexIndex, vertices[clickedVertexIndex]);
      this.updateDisplay();
      return true;
    }

    return true;
  }

  private handleClickFromVertex(
    event: InputEvent,
    _context: InteractionContext,
    vertices: Vector2[]
  ): boolean {

    // Allow vertex selection for dragging
    const clickedVertexIndex = findVertexAtPosition(
      event.worldPos,
      vertices,
      MEASUREMENT_CLICK_TOLERANCE_FT
    );

    if (clickedVertexIndex !== null) {
      this.callbacks.onSelectVertex(clickedVertexIndex, false);
      this.callbacks.onStartDrag(clickedVertexIndex, null, event.worldPos);
      return true;
    }

    return true;
  }
}

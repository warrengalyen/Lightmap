import type { InputEvent } from '../../core/InputManager';
import type { Vector2 } from '../../types';
import type { InteractionContext, BoxSelectionState } from '../../types/interaction';
import { BaseInteractionHandler } from '../InteractionHandler';
import { findVerticesInBox, findLightsInBox } from '../../utils/math';

export interface BoxSelectionHandlerCallbacks {
  onBoxSelectionStart: (start: Vector2) => void;
  onBoxSelectionUpdate: (start: Vector2, current: Vector2) => void;
  onBoxSelectionComplete: (
    vertexIndices: number[],
    lightIds: string[],
    addToSelection: boolean
  ) => void;
  onBoxSelectionCancel: () => void;
}

export interface BoxSelectionHandlerConfig {
  getBoxSelectionState: () => BoxSelectionState;
  setBoxSelectionState: (state: BoxSelectionState) => void;
}

/**
 * Handles box (rectangle) selection.
 * Allows selecting multiple vertices and lights by drawing a rectangle.
 */
export class BoxSelectionHandler extends BaseInteractionHandler {
  readonly name = 'boxSelection';
  readonly priority = 40;

  private config: BoxSelectionHandlerConfig;
  private callbacks: BoxSelectionHandlerCallbacks;

  constructor(
    config: BoxSelectionHandlerConfig,
    callbacks: BoxSelectionHandlerCallbacks
  ) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  canHandle(_event: InputEvent, context: InteractionContext): boolean {
    const state = this.config.getBoxSelectionState();
    return state.isSelecting || (context.roomState.isClosed && !context.isDrawingEnabled && !context.isPlacingLights);
  }

  handleMouseMove(event: InputEvent, _context: InteractionContext): boolean {
    const state = this.config.getBoxSelectionState();
    if (!state.isSelecting || !state.startPosition) return false;

    const current = event.worldPos;
    this.config.setBoxSelectionState({
      ...state,
      currentPosition: current,
    });
    this.callbacks.onBoxSelectionUpdate(state.startPosition, current);

    return true;
  }

  handleMouseUp(event: InputEvent, context: InteractionContext): boolean {
    const state = this.config.getBoxSelectionState();
    if (!state.isSelecting || !state.startPosition || !state.currentPosition) {
      return false;
    }

    const addToSelection = event?.shiftKey ?? false;

    // Find items in box
    const vertices = context.vertices;
    const lights = context.roomState.lights;
    const indicesInBox = findVerticesInBox(vertices, state.startPosition, state.currentPosition);
    const lightIdsInBox = findLightsInBox(lights, state.startPosition, state.currentPosition);

    // Complete selection
    this.callbacks.onBoxSelectionComplete(indicesInBox, lightIdsInBox, addToSelection);

    // Reset state
    this.config.setBoxSelectionState({
      isSelecting: false,
      startPosition: null,
      currentPosition: null,
    });

    return true;
  }

  handleKeyDown(event: InputEvent, _context: InteractionContext): boolean {
    const state = this.config.getBoxSelectionState();
    if (!state.isSelecting) return false;

    if (event.key === 'Escape') {
      this.callbacks.onBoxSelectionCancel();
      this.config.setBoxSelectionState({
        isSelecting: false,
        startPosition: null,
        currentPosition: null,
      });
      return true;
    }

    return false;
  }

  /**
   * Start a box selection at the given position.
   * Called by SelectionHandler when clicking in empty space.
   */
  startBoxSelection(pos: Vector2): void {
    this.config.setBoxSelectionState({
      isSelecting: true,
      startPosition: { ...pos },
      currentPosition: { ...pos },
    });
    this.callbacks.onBoxSelectionStart(pos);
  }
}

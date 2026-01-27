import type { InputEvent } from '../../core/InputManager';
import type { Vector2, LightFixture, WallSegment, Door } from '../../types';
import type { InteractionContext, GrabModeState, SelectionState } from '../../types/interaction';
import type { DragManager } from '../DragManager';
import type { GrabModeDragOperation } from '../operations/GrabModeDragOperation';
import { BaseInteractionHandler } from '../InteractionHandler';
import {
  EMPTY_MODIFIERS,
  extractModifiers,
  hasSelection,
  getSelectionOrigin,
  handleAxisLockKey,
} from '../utils';

export interface GrabModeHandlerCallbacks {
  onGrabModeStart: () => void;
  onGrabModeConfirm: () => void;
  onGrabModeCancel: () => void;
}

export interface GrabModeHandlerConfig {
  dragManager: DragManager;
  createGrabOperation: () => GrabModeDragOperation;
  getGrabModeState: () => GrabModeState;
  setGrabModeActive: (active: boolean) => void;
  getSelection: () => SelectionState;
  getCurrentMousePos: () => Vector2;
  getVertices: () => Vector2[];
  getLights: () => LightFixture[];
  getWalls: () => WallSegment[];
  getDoors: () => Door[];
  getDoorById: (id: string) => Door | undefined;
  getWallById: (id: string) => WallSegment | undefined;
}

/**
 * Handles grab mode (G key).
 * Allows moving selected items by pressing G and moving the mouse.
 * Click or press Escape to confirm/cancel.
 */
export class GrabModeHandler extends BaseInteractionHandler {
  readonly name = 'grabMode';
  readonly priority = 120;

  private config: GrabModeHandlerConfig;
  private callbacks: GrabModeHandlerCallbacks;

  // Store the original selection origin when grab mode starts
  // This is used for axis lock guides to match the constraint behavior
  private originalSelectionOrigin: Vector2 | null = null;

  constructor(config: GrabModeHandlerConfig, callbacks: GrabModeHandlerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  canHandle(event: InputEvent, context: InteractionContext): boolean {
    return context.isGrabMode || this.shouldStartGrabMode(event, context);
  }

  handleClick(_event: InputEvent, context: InteractionContext): boolean {
    if (!context.isGrabMode) return false;

    // Confirm grab mode placement
    this.confirmGrabMode();
    return true;
  }

  handleMouseMove(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isGrabMode) return false;

    const { dragManager } = this.config;
    dragManager.updateDrag(event.worldPos, extractModifiers(event));

    return true;
  }

  handleKeyDown(event: InputEvent, context: InteractionContext): boolean {
    // Check for starting grab mode
    if (this.shouldStartGrabMode(event, context)) {
      this.startGrabMode();
      return true;
    }

    // Handle grab mode active
    if (context.isGrabMode) {
      if (event.key === 'Escape') {
        this.cancelGrabMode();
        return true;
      }

      // Axis lock handling
      if (handleAxisLockKey(event, {
        dragManager: this.config.dragManager,
        getGuideOrigin: () => this.originalSelectionOrigin ?? undefined,
        triggerImmediateUpdate: () => this.triggerImmediateUpdate(),
      })) {
        return true;
      }
    }

    return false;
  }

  private shouldStartGrabMode(event: InputEvent, context: InteractionContext): boolean {
    if (event.key?.toLowerCase() !== 'g') return false;
    if (event.ctrlKey || event.altKey) return false;
    if (context.isGrabMode) return false;

    return hasSelection(this.config.getSelection());
  }

  private startGrabMode(): void {
    const { dragManager, createGrabOperation, getSelection, getCurrentMousePos } = this.config;

    // Capture the original selection origin before any movement
    this.originalSelectionOrigin = this.computeSelectionOrigin();

    this.config.setGrabModeActive(true);

    const operation = createGrabOperation();
    const selection = getSelection();

    dragManager.startDrag(operation, {
      position: getCurrentMousePos(),
      modifiers: EMPTY_MODIFIERS,
      roomState: null, // Will be populated by the operation
      selection,
    });

    this.callbacks.onGrabModeStart();
  }

  private confirmGrabMode(): void {
    this.config.dragManager.commitDrag();
    this.config.setGrabModeActive(false);
    this.originalSelectionOrigin = null;
    this.callbacks.onGrabModeConfirm();
  }

  private cancelGrabMode(): void {
    this.config.dragManager.cancelDrag();
    this.config.setGrabModeActive(false);
    this.originalSelectionOrigin = null;
    this.callbacks.onGrabModeCancel();
  }

  /**
   * Trigger an immediate drag update with the current mouse position.
   * This ensures the object position updates immediately when axis lock changes,
   * rather than waiting for the next mouse move.
   */
  private triggerImmediateUpdate(): void {
    const currentPos = this.config.getCurrentMousePos();
    this.config.dragManager.updateDrag(currentPos, EMPTY_MODIFIERS);
  }

  /**
   * Get the current position of the first selected object.
   * Used to capture the original position when grab mode starts.
   */
  private computeSelectionOrigin(): Vector2 | null {
    return getSelectionOrigin(this.config.getSelection(), {
      getVertices: this.config.getVertices,
      getLights: this.config.getLights,
      getWalls: this.config.getWalls,
      getWallById: this.config.getWallById,
      getDoorById: this.config.getDoorById,
    });
  }
}

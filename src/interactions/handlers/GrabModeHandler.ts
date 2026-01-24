import type { InputEvent } from '../../core/InputManager';
import type { Vector2, LightFixture, WallSegment, Door } from '../../types';
import type { InteractionContext, GrabModeState, SelectionState } from '../../types/interaction';
import type { DragManager } from '../DragManager';
import type { GrabModeDragOperation } from '../operations/GrabModeDragOperation';
import { BaseInteractionHandler } from '../InteractionHandler';

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
    dragManager.updateDrag(event.worldPos, {
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
    });

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
      if (!event.ctrlKey && !event.altKey) {
        if (event.key?.toLowerCase() === 'x') {
          this.config.dragManager.setAxisLock('x');
          this.updateAxisLockGuides();
          this.triggerImmediateUpdate();
          return true;
        }
        if (event.key?.toLowerCase() === 'y') {
          this.config.dragManager.setAxisLock('y');
          this.updateAxisLockGuides();
          this.triggerImmediateUpdate();
          return true;
        }
      }
    }

    return false;
  }

  private shouldStartGrabMode(event: InputEvent, context: InteractionContext): boolean {
    if (event.key?.toLowerCase() !== 'g') return false;
    if (event.ctrlKey || event.altKey) return false;
    if (context.isGrabMode) return false;

    const selection = this.config.getSelection();
    return (
      selection.selectedVertexIndices.size > 0 ||
      selection.selectedLightIds.size > 0 ||
      selection.selectedWallId !== null ||
      selection.selectedDoorId !== null
    );
  }

  private startGrabMode(): void {
    const { dragManager, createGrabOperation, getSelection, getCurrentMousePos } = this.config;

    // Capture the original selection origin before any movement
    this.originalSelectionOrigin = this.getSelectionOrigin();

    this.config.setGrabModeActive(true);

    const operation = createGrabOperation();
    const selection = getSelection();

    dragManager.startDrag(operation, {
      position: getCurrentMousePos(),
      modifiers: { shiftKey: false, ctrlKey: false, altKey: false },
      roomState: null as any, // Will be populated by the operation
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
   * Update axis lock guides with the original selection origin.
   * Uses the position captured when grab mode started, so guides
   * match the axis constraint behavior (which uses original position).
   */
  private updateAxisLockGuides(): void {
    if (this.originalSelectionOrigin) {
      this.config.dragManager.updateAxisLockGuides(this.originalSelectionOrigin);
    }
  }

  /**
   * Trigger an immediate drag update with the current mouse position.
   * This ensures the object position updates immediately when axis lock changes,
   * rather than waiting for the next mouse move.
   */
  private triggerImmediateUpdate(): void {
    const currentPos = this.config.getCurrentMousePos();
    this.config.dragManager.updateDrag(currentPos, {
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
    });
  }

  /**
   * Get the current position of the first selected object (vertex, light, wall, or door).
   * Used to capture the original position when grab mode starts.
   */
  private getSelectionOrigin(): Vector2 | null {
    const selection = this.config.getSelection();

    // Check for selected vertices first
    if (selection.selectedVertexIndices.size > 0) {
      const vertices = this.config.getVertices();
      const firstIndex = Array.from(selection.selectedVertexIndices)[0];
      if (vertices[firstIndex]) {
        return { ...vertices[firstIndex] };
      }
    }

    // Check for selected lights
    if (selection.selectedLightIds.size > 0) {
      const lights = this.config.getLights();
      const firstId = Array.from(selection.selectedLightIds)[0];
      const light = lights.find(l => l.id === firstId);
      if (light) {
        return { ...light.position };
      }
    }

    // Check for selected wall
    if (selection.selectedWallId) {
      const walls = this.config.getWalls();
      const wall = walls.find(w => w.id === selection.selectedWallId);
      if (wall) {
        return { ...wall.start };
      }
    }

    // Check for selected door
    if (selection.selectedDoorId) {
      const door = this.config.getDoorById(selection.selectedDoorId);
      if (door) {
        const wall = this.config.getWallById(door.wallId);
        if (wall) {
          // Calculate door's world position on the wall
          const wallDir = {
            x: wall.end.x - wall.start.x,
            y: wall.end.y - wall.start.y,
          };
          const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.y * wallDir.y);
          if (wallLength > 0) {
            const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };
            return {
              x: wall.start.x + normalizedDir.x * door.position,
              y: wall.start.y + normalizedDir.y * door.position,
            };
          }
        }
      }
    }

    return null;
  }
}

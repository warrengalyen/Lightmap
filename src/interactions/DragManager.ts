import type { Vector2 } from '../types';
import type {
  IDragOperation,
  DragStartContext,
  DragUpdateContext,
  AxisLock,
  InputModifiers,
} from '../types/interaction';
import type { SnapGuide } from '../controllers/SnapController';
import { SNAP_GUIDE_LENGTH } from '../constants/editor';

export interface DragManagerCallbacks {
  onUpdateVertexPosition: (index: number, position: Vector2) => void;
  onUpdateLightPositions: (updates: Map<string, Vector2>) => void;
  onMoveWall: (wallId: string, newStart: Vector2, newEnd: Vector2) => void;
  onUpdateDoorPosition: (doorId: string, position: number) => void;
  onSetSnapGuides: (guides: SnapGuide[]) => void;
  onPauseHistory: () => void;
  onResumeHistory: () => void;
}

/**
 * Manages drag operations with support for axis locking and operation lifecycle.
 * Orchestrates drag operations and provides shared functionality.
 */
export class DragManager {
  private currentOperation: IDragOperation | null = null;
  private _axisLock: AxisLock = 'none';
  private callbacks: DragManagerCallbacks;
  private dragStartPos: Vector2 | null = null;

  constructor(callbacks: DragManagerCallbacks) {
    this.callbacks = callbacks;
  }

  get axisLock(): AxisLock {
    return this._axisLock;
  }

  get isActive(): boolean {
    return this.currentOperation !== null && this.currentOperation.isActive();
  }

  get startPosition(): Vector2 | null {
    return this.dragStartPos;
  }

  /**
   * Start a new drag operation.
   */
  startDrag(operation: IDragOperation, context: DragStartContext): void {
    if (this.currentOperation?.isActive()) {
      this.cancelDrag();
    }

    this.currentOperation = operation;
    this.dragStartPos = { ...context.position };
    this._axisLock = 'none';
    this.callbacks.onPauseHistory();
    operation.start(context);
  }

  /**
   * Update the current drag operation.
   */
  updateDrag(position: Vector2, modifiers: InputModifiers): void {
    if (!this.currentOperation?.isActive()) return;

    const context: DragUpdateContext = {
      position,
      modifiers,
      axisLock: this._axisLock,
    };

    this.currentOperation.update(context);
  }

  /**
   * Commit the current drag operation.
   */
  commitDrag(): void {
    if (!this.currentOperation?.isActive()) return;

    this.currentOperation.commit();
    this.cleanup();
  }

  /**
   * Cancel the current drag operation and restore original state.
   */
  cancelDrag(): void {
    if (!this.currentOperation) return;

    this.currentOperation.cancel();
    this.cleanup();
  }

  /**
   * Toggle axis lock.
   */
  setAxisLock(axis: AxisLock): void {
    this._axisLock = this._axisLock === axis ? 'none' : axis;
    this.updateAxisLockGuides();
  }

  /**
   * Clear axis lock.
   */
  clearAxisLock(): void {
    this._axisLock = 'none';
    this.callbacks.onSetSnapGuides([]);
  }

  /**
   * Update visual guides for axis lock.
   */
  updateAxisLockGuides(guideOrigin?: Vector2): void {
    if (this._axisLock === 'none') {
      this.callbacks.onSetSnapGuides([]);
      return;
    }

    const origin = guideOrigin || this.dragStartPos;
    if (!origin) return;

    const guides: SnapGuide[] = [];
    const guideLength = SNAP_GUIDE_LENGTH;

    if (this._axisLock === 'x') {
      guides.push({
        axis: 'x',
        value: origin.x,
        from: { x: origin.x - guideLength, y: origin.y },
        to: { x: origin.x + guideLength, y: origin.y },
      });
    } else if (this._axisLock === 'y') {
      guides.push({
        axis: 'y',
        value: origin.y,
        from: { x: origin.x, y: origin.y - guideLength },
        to: { x: origin.x, y: origin.y + guideLength },
      });
    }

    this.callbacks.onSetSnapGuides(guides);
  }

  /**
   * Get callbacks for operations to use.
   */
  getCallbacks(): DragManagerCallbacks {
    return this.callbacks;
  }

  private cleanup(): void {
    this.currentOperation = null;
    this._axisLock = 'none';
    this.dragStartPos = null;
    this.callbacks.onResumeHistory();
    this.callbacks.onSetSnapGuides([]);
  }
}

import type { Vector2 } from '../types';
import type {
  IDragOperation,
  DragStartContext,
  DragUpdateContext,
  AxisLock,
} from '../types/interaction';

/**
 * Abstract base class for drag operations.
 * Provides common functionality for all drag types.
 */
export abstract class BaseDragOperation implements IDragOperation {
  abstract readonly type: string;

  protected _isActive: boolean = false;
  protected startPosition: Vector2 | null = null;

  isActive(): boolean {
    return this._isActive;
  }

  abstract start(context: DragStartContext): void;
  abstract update(context: DragUpdateContext): void;
  abstract commit(): void;
  abstract cancel(): void;

  /**
   * Apply axis lock constraint to a position.
   */
  protected applyAxisConstraint(pos: Vector2, axisLock: AxisLock, origin: Vector2): Vector2 {
    if (axisLock === 'none' || !origin) return pos;

    if (axisLock === 'x') {
      return { x: pos.x, y: origin.y };
    } else if (axisLock === 'y') {
      return { x: origin.x, y: pos.y };
    }

    return pos;
  }

  /**
   * Calculate delta from start position to current position.
   */
  protected calculateDelta(from: Vector2, to: Vector2): Vector2 {
    return {
      x: to.x - from.x,
      y: to.y - from.y,
    };
  }

  /**
   * Apply a delta to a position.
   */
  protected applyDelta(position: Vector2, delta: Vector2): Vector2 {
    return {
      x: position.x + delta.x,
      y: position.y + delta.y,
    };
  }
}

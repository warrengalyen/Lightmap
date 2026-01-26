import type { InputEvent } from '../../core/InputManager';
import type { Vector2 } from '../../types';
import type { AxisLock } from '../../types/interaction';
import type { DragManager } from '../DragManager';

export interface AxisLockHandlerConfig {
  dragManager: DragManager;
  getGuideOrigin: () => Vector2 | undefined;
  triggerImmediateUpdate?: () => void;
}

/**
 * Get the axis from a key event.
 */
function getAxisFromKey(event: InputEvent): AxisLock | null {
  const key = event.key?.toLowerCase();
  if (key === 'x') return 'x';
  if (key === 'y') return 'y';
  return null;
}

/**
 * Handle axis lock key press.
 * Returns true if the event was handled.
 */
export function handleAxisLockKey(
  event: InputEvent,
  config: AxisLockHandlerConfig
): boolean {
  if (event.ctrlKey || event.altKey) return false;

  const axis = getAxisFromKey(event);
  if (!axis) return false;

  config.dragManager.setAxisLock(axis);

  const guideOrigin = config.getGuideOrigin();
  if (guideOrigin) {
    config.dragManager.updateAxisLockGuides(guideOrigin);
  }

  if (config.triggerImmediateUpdate) {
    config.triggerImmediateUpdate();
  }

  return true;
}

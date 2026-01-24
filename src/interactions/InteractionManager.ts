import type { InputEvent } from '../core/InputManager';
import type { IInteractionHandler, InteractionContext } from '../types/interaction';

/**
 * Orchestrates interaction handlers.
 * Routes events to appropriate handlers based on priority and canHandle.
 */
export class InteractionManager {
  private handlers: IInteractionHandler[] = [];

  /**
   * Register a handler. Handlers are sorted by priority (higher = first).
   */
  registerHandler(handler: IInteractionHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister a handler by name.
   */
  unregisterHandler(name: string): void {
    this.handlers = this.handlers.filter(h => h.name !== name);
  }

  /**
   * Handle a click event.
   */
  handleClick(event: InputEvent, context: InteractionContext): boolean {
    for (const handler of this.handlers) {
      if (handler.canHandle(event, context) && handler.handleClick) {
        const handled = handler.handleClick(event, context);
        if (handled) return true;
      }
    }
    return false;
  }

  /**
   * Handle a double click event.
   */
  handleDoubleClick(event: InputEvent, context: InteractionContext): boolean {
    for (const handler of this.handlers) {
      if (handler.canHandle(event, context) && handler.handleDoubleClick) {
        const handled = handler.handleDoubleClick(event, context);
        if (handled) return true;
      }
    }
    return false;
  }

  /**
   * Handle a mouse move event.
   */
  handleMouseMove(event: InputEvent, context: InteractionContext): boolean {
    for (const handler of this.handlers) {
      if (handler.canHandle(event, context) && handler.handleMouseMove) {
        const handled = handler.handleMouseMove(event, context);
        if (handled) return true;
      }
    }
    return false;
  }

  /**
   * Handle a mouse up event.
   */
  handleMouseUp(event: InputEvent, context: InteractionContext): boolean {
    for (const handler of this.handlers) {
      if (handler.canHandle(event, context) && handler.handleMouseUp) {
        const handled = handler.handleMouseUp(event, context);
        if (handled) return true;
      }
    }
    return false;
  }

  /**
   * Handle a key down event.
   */
  handleKeyDown(event: InputEvent, context: InteractionContext): boolean {
    for (const handler of this.handlers) {
      if (handler.canHandle(event, context) && handler.handleKeyDown) {
        const handled = handler.handleKeyDown(event, context);
        if (handled) return true;
      }
    }
    return false;
  }

  /**
   * Get all registered handlers.
   */
  getHandlers(): IInteractionHandler[] {
    return [...this.handlers];
  }

  /**
   * Get a handler by name.
   */
  getHandler<T extends IInteractionHandler>(name: string): T | undefined {
    return this.handlers.find(h => h.name === name) as T | undefined;
  }
}

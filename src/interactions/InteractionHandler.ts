import type { InputEvent } from '../core/InputManager';
import type { IInteractionHandler, InteractionContext } from '../types/interaction';

/**
 * Abstract base class for interaction handlers.
 * Provides default implementations that can be overridden.
 */
export abstract class BaseInteractionHandler implements IInteractionHandler {
  abstract readonly name: string;
  abstract readonly priority: number;

  abstract canHandle(event: InputEvent, context: InteractionContext): boolean;

  handleClick?(event: InputEvent, context: InteractionContext): boolean;
  handleMouseMove?(event: InputEvent, context: InteractionContext): boolean;
  handleMouseUp?(event: InputEvent, context: InteractionContext): boolean;
  handleKeyDown?(event: InputEvent, context: InteractionContext): boolean;
  handleDoubleClick?(event: InputEvent, context: InteractionContext): boolean;
}

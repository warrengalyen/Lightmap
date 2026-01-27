import type { InputEvent } from '../core/InputManager';
import type { KeyBinding, InteractionContext } from '../types/interaction';

/**
 * Manages keyboard shortcuts with declarative bindings.
 * Replaces switch/case keyboard handling with a registration-based approach.
 */
export class KeyboardShortcutManager {
  private bindings: KeyBinding[] = [];

  /**
   * Register a keyboard binding.
   */
  register(binding: KeyBinding): void {
    this.bindings.push(binding);
  }

  /**
   * Register multiple bindings at once.
   */
  registerAll(bindings: KeyBinding[]): void {
    for (const binding of bindings) {
      this.register(binding);
    }
  }

    /**
   * Handle a key down event.
   * Returns true if a binding was matched and executed.
   */
  handle(event: InputEvent, context: InteractionContext): boolean {
    if (!event.key) return false;

    for (const binding of this.bindings) {
      if (!this.matchesBinding(event, binding)) continue;

      // Check condition if provided
      if (binding.condition && !binding.condition(context)) continue;

      // Execute action
      binding.action(context);
      return true;
    }

    return false;
  }

  private matchesBinding(event: InputEvent, binding: KeyBinding): boolean {
    const eventKey = event.key?.toLowerCase() ?? '';
    const bindingKey = binding.key.toLowerCase();

    // Handle special keys
    if (bindingKey === 'escape' && eventKey === 'escape') {
      return this.matchesModifiers(event, binding);
    }
    if (bindingKey === 'delete' && (eventKey === 'delete' || eventKey === 'backspace')) {
      return this.matchesModifiers(event, binding);
    }

    // Regular key match
    if (eventKey !== bindingKey) return false;

    return this.matchesModifiers(event, binding);
  }

  private matchesModifiers(event: InputEvent, binding: KeyBinding): boolean {
    const ctrlMatch = (binding.ctrlKey ?? false) === event.ctrlKey;
    const shiftMatch = (binding.shiftKey ?? false) === event.shiftKey;
    const altMatch = (binding.altKey ?? false) === event.altKey;

    return ctrlMatch && shiftMatch && altMatch;
  }

    /**
   * Clear all bindings.
   */
  clear(): void {
    this.bindings = [];
  }
}

/**
 * Create default editor keyboard shortcuts.
 */
export function createDefaultKeyboardShortcuts(callbacks: {
  setViewMode: (mode: 'editor' | 'shadow' | 'heatmap') => void;
  toggleRafters: () => void;
  toggleUnitFormat: () => void;
  toggleMeasurement: () => void;
  toggleLightingStats: () => void;
  undo: () => void;
  redo: () => void;
  handleEscape: () => void;
  handleDelete: () => void;
  selectAllObstacleVertices?: () => void;
}): KeyBinding[] {
  return [
    // View mode shortcuts
    {
      key: '1',
      action: () => callbacks.setViewMode('editor'),
      description: 'Switch to editor view',
    },
    {
      key: '2',
      action: () => callbacks.setViewMode('shadow'),
      description: 'Switch to shadow view',
    },
    {
      key: '3',
      action: () => callbacks.setViewMode('heatmap'),
      description: 'Switch to heatmap view',
    },

    // Toggle shortcuts
    {
      key: 'r',
      action: () => callbacks.toggleRafters(),
      description: 'Toggle rafter overlay',
    },
    {
      key: 'u',
      action: () => callbacks.toggleUnitFormat(),
      description: 'Toggle unit format',
    },
    {
      key: 'm',
      action: () => callbacks.toggleMeasurement(),
      description: 'Toggle measurement mode',
    },
    {
      key: 'q',
      action: () => callbacks.toggleLightingStats(),
      description: 'Toggle lighting stats',
    },

    // Undo/Redo
    {
      key: 'z',
      ctrlKey: true,
      action: () => callbacks.undo(),
      description: 'Undo',
    },
    {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      action: () => callbacks.redo(),
      description: 'Redo',
    },
    {
      key: 'y',
      ctrlKey: true,
      action: () => callbacks.redo(),
      description: 'Redo',
    },

    // Select all
    {
      key: 'a',
      ctrlKey: true,
      action: () => callbacks.selectAllObstacleVertices?.(),
      condition: (ctx) => ctx.selection.selectedObstacleId !== null,
      description: 'Select all obstacle vertices',
    },

    // General
    {
      key: 'Escape',
      action: () => callbacks.handleEscape(),
      description: 'Cancel current action or clear selection',
    },
    {
      key: 'Delete',
      action: () => callbacks.handleDelete(),
      description: 'Delete selected items',
    },
  ];
}

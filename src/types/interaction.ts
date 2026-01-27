import type { Vector2, RoomState } from './index';
import type { InputEvent } from '../core/InputManager';

// ============================================
// Selection State
// ============================================

export interface SelectionState {
    selectedVertexIndices: Set<number>;
    selectedLightIds: Set<string>;
    selectedWallId: string | null;
  selectedDoorId: string | null;
  selectedObstacleId: string | null;
  selectedObstacleVertexIndices: Set<number>;
}

// ============================================
// Interaction Modes
// ============================================

// ============================================
// Drag State
// ============================================

export interface DragContext {
    originalVertexPositions: Map<number, Vector2>;
    originalLightPositions: Map<string, Vector2>;
    originalWallVertices: { start: Vector2; end: Vector2 } | null;
    axisLock: AxisLock;
    anchorVertexIndex: number | null;
    anchorLightId: string | null;
    dragStartPos: Vector2 | null;
}

export type AxisLock = 'none' | 'x' | 'y';

// ============================================
// Input Modifiers
// ============================================

export interface InputModifiers {
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
}

// ============================================
// Drag Operation Interface
// ============================================

export interface DragStartContext {
    position: Vector2;
    modifiers: InputModifiers;
    roomState: RoomState;
    selection: SelectionState;
}

export interface DragUpdateContext {
    position: Vector2;
    modifiers: InputModifiers;
    axisLock: AxisLock;
}

export interface IDragOperation {
    readonly type: string;
    start(context: DragStartContext): void;
    update(context: DragUpdateContext): void;
    commit(): void;
    cancel(): void;
    isActive(): boolean;
    getStartPosition(): Vector2 | null;
}

// ============================================
// Interaction Handler Interface
// ============================================

export interface InteractionContext {
    roomState: RoomState;
    selection: SelectionState;
    isDrawingEnabled: boolean;
    isPlacingLights: boolean;
  isPlacingDoors: boolean;
  isObstacleDrawing: boolean;
    isMeasuring: boolean;
    isGrabMode: boolean;
    isBoxSelecting: boolean;
    currentMousePos: Vector2;
    vertices: Vector2[];
}

export interface IInteractionHandler {
    readonly name: string;
    readonly priority: number;

    canHandle(event: InputEvent, context: InteractionContext): boolean;

    handleClick?(event: InputEvent, context: InteractionContext): boolean;
    handleMouseMove?(event: InputEvent, context: InteractionContext): boolean;
    handleMouseUp?(event: InputEvent, context: InteractionContext): boolean;
    handleKeyDown?(event: InputEvent, context: InteractionContext): boolean;
    handleDoubleClick?(event: InputEvent, context: InteractionContext): boolean;
}

// ============================================
// Keyboard Shortcut Types
// ============================================

export interface KeyBinding {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    action: (context: InteractionContext) => void;
    condition?: (context: InteractionContext) => boolean;
    description?: string;
}

// ============================================
// Box Selection State
// ============================================

export interface BoxSelectionState {
    isSelecting: boolean;
    startPosition: Vector2 | null;
    currentPosition: Vector2 | null;
}

// ============================================
// Grab Mode State
// ============================================

export interface GrabModeState {
    isActive: boolean;
    offset: Vector2 | null;
    originalPositions: DragContext;
}

// ============================================
// Handler Results
// ============================================

// ============================================
// Measurement State (for handlers)
// ============================================


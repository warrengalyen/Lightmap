import type { InputEvent } from '../../core/InputManager';
import type { Vector2, WallSegment, Door } from '../../types';
import type { InteractionContext, SelectionState } from '../../types/interaction';
import type { LightManager } from '../../lighting/LightManager';
import type { DragManager } from '../DragManager';
import type { UnifiedDragOperation } from '../operations/UnifiedDragOperation';
import type { WallDragOperation } from '../operations/WallDragOperation';
import type { DoorDragOperation } from '../operations/DoorDragOperation';
import type { BoxSelectionHandler } from './BoxSelectionHandler';
import { BaseInteractionHandler } from '../InteractionHandler';
import { findVertexAtPosition, projectPointOntoSegmentForInsertion, distancePointToSegment } from '../../utils/math';
import { getDoorEndpoints } from '../../utils/geometry';
import {
  LIGHT_HIT_TOLERANCE_FT,
  VERTEX_HIT_TOLERANCE_FT,
  DOOR_HIT_TOLERANCE_FT,
} from '../../constants/editor';
import { attemptItemSelection, handleSelectionAction } from './selectionHelpers';
import {
  EMPTY_MODIFIERS,
  hasSelection,
  getSelectionOriginFromRoomState,
  handleAxisLockKey,
} from '../utils';

export interface SelectionHandlerCallbacks {
  onSelectVertex: (index: number, addToSelection: boolean) => void;
  onSelectLight: (id: string, addToSelection: boolean) => void;
  onSelectWall: (id: string) => void;
  onSelectDoor: (id: string) => void;
  onClearSelection: () => void;
  onClearLightSelection: () => void;
  onClearVertexSelection: () => void;
  onClearWallSelection: () => void;
  onClearDoorSelection: () => void;
  onInsertVertex: (wallId: string, position: Vector2) => number | null;
  getSelectedVertexIndices: () => Set<number>;
  getSelectedLightIds: () => Set<string>;
  getWallAtPosition: (pos: Vector2, walls: WallSegment[], tolerance: number) => WallSegment | null;
  getDoors: () => Door[];
}

export interface SelectionHandlerConfig {
  lightManager: LightManager;
  dragManager: DragManager;
  boxSelectionHandler: BoxSelectionHandler;
  createUnifiedDragOperation: () => UnifiedDragOperation;
  createWallDragOperation: () => WallDragOperation;
  createDoorDragOperation: () => DoorDragOperation;
  getSelection: () => SelectionState;
  getCurrentMousePos: () => Vector2;
}

/**
 * Handles selection of vertices, lights, and walls.
 * Manages single click selection, shift-click multi-selection,
 * and initiates drag operations.
 */
export class SelectionHandler extends BaseInteractionHandler {
  readonly name = 'selection';
  readonly priority = 50;

  private config: SelectionHandlerConfig;
  private callbacks: SelectionHandlerCallbacks;

  constructor(config: SelectionHandlerConfig, callbacks: SelectionHandlerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  canHandle(_event: InputEvent, context: InteractionContext): boolean {
    // Selection handler is the fallback for click events in select mode
    return !context.isDrawingEnabled && !context.isPlacingLights && !context.isPlacingDoors && !context.isMeasuring;
  }

  handleClick(event: InputEvent, context: InteractionContext): boolean {
    const pos = event.worldPos;
    const addToSelection = event.shiftKey ?? false;
    const { roomState, vertices } = context;

    // Check vertices first (if room is closed)
    if (roomState.isClosed) {
      const vertexResult = this.trySelectVertex(pos, vertices, addToSelection);
      if (vertexResult.handled) return true;
    }

    // Check lights
    const lightResult = this.trySelectLight(pos, vertices, addToSelection, context);
    if (lightResult.handled) return true;

    // Check doors (if room is closed)
    if (roomState.isClosed) {
      const doorResult = this.trySelectDoor(pos, roomState.walls);
      if (doorResult.handled) return true;
    }

    // Check walls (if room is closed)
    if (roomState.isClosed) {
      const wallResult = this.trySelectWall(pos, roomState.walls);
      if (wallResult.handled) return true;
    }

    // Start box selection in empty space
    if (roomState.isClosed) {
      if (!addToSelection) {
        this.callbacks.onClearVertexSelection();
        this.callbacks.onClearLightSelection();
      }
      this.callbacks.onClearWallSelection();
      this.config.boxSelectionHandler.startBoxSelection(pos);
      return true;
    }

    // Clear selection if clicking on empty space (unless shift is held)
    if (!addToSelection) {
      this.callbacks.onClearSelection();
    }

    return true;
  }

  handleDoubleClick(event: InputEvent, context: InteractionContext): boolean {
    const { roomState } = context;
    if (!roomState.isClosed) return false;

    const wall = this.callbacks.getWallAtPosition(
      event.worldPos,
      roomState.walls,
      VERTEX_HIT_TOLERANCE_FT
    );

    if (wall) {
      const insertPos = projectPointOntoSegmentForInsertion(event.worldPos, wall.start, wall.end);
      const newVertexIndex = this.callbacks.onInsertVertex(wall.id, insertPos);

      if (newVertexIndex !== null) {
        this.callbacks.onSelectVertex(newVertexIndex, false);
        this.callbacks.onClearWallSelection();
        this.callbacks.onClearLightSelection();
      }
      return true;
    }

    return false;
  }

  handleMouseUp(_event: InputEvent, _context: InteractionContext): boolean {
    // Commit any active drag
    if (this.config.dragManager.isActive) {
      this.config.dragManager.commitDrag();
      return true;
    }
    return false;
  }

  handleKeyDown(event: InputEvent, context: InteractionContext): boolean {
    // Axis lock for selected objects (can be set before or during drag)
    const selection = this.config.getSelection();
    const selectionExists = hasSelection(selection);

    if (selectionExists && !context.isGrabMode) {
      if (handleAxisLockKey(event, {
        dragManager: this.config.dragManager,
        getGuideOrigin: () => this.config.dragManager.startPosition || this.getSelectionOrigin(context),
        // Only trigger immediate update if actively dragging
        triggerImmediateUpdate: this.config.dragManager.isActive
          ? () => this.triggerImmediateUpdate()
          : undefined,
      })) {
        return true;
      }
    }

    // Escape clears selection or axis lock
    if (event.key === 'Escape') {
      if (this.config.dragManager.axisLock !== 'none') {
        this.config.dragManager.clearAxisLock();
        return true;
      }
      if (selectionExists) {
        this.callbacks.onClearSelection();
        return true;
      }
    }

    return false;
  }

  private trySelectVertex(
    pos: Vector2,
    vertices: Vector2[],
    addToSelection: boolean
  ): { handled: boolean } {
    const selectedIndices = this.callbacks.getSelectedVertexIndices();
    const selectedLightIds = this.callbacks.getSelectedLightIds();

    const attempt = attemptItemSelection<number>(pos, {
      findItemAtPosition: (p, tolerance) => {
        const idx = findVertexAtPosition(p, vertices, tolerance);
        return idx !== null ? { id: idx, position: vertices[idx] } : null;
      },
      isSelected: (idx) => selectedIndices.has(idx),
      getOtherSelectedCount: () => selectedIndices.size - 1 + selectedLightIds.size,
      hitTolerance: VERTEX_HIT_TOLERANCE_FT,
    });

    const handled = handleSelectionAction(attempt, addToSelection, {
      onSelect: (idx, add) => this.callbacks.onSelectVertex(idx, add),
      onClearOtherSelection: () => this.callbacks.onClearLightSelection(),
      onClearWallSelection: () => this.callbacks.onClearWallSelection(),
      onClearDoorSelection: () => this.callbacks.onClearDoorSelection(),
      isSelectedNow: (idx) => this.callbacks.getSelectedVertexIndices().has(idx),
      startDrag: (idx) => this.startUnifiedDrag(idx, null, pos, vertices),
    });

    return { handled };
  }

  private trySelectLight(
    pos: Vector2,
    vertices: Vector2[],
    addToSelection: boolean,
    _context: InteractionContext
  ): { handled: boolean } {
    const selectedIndices = this.callbacks.getSelectedVertexIndices();
    const selectedLightIds = this.callbacks.getSelectedLightIds();

    const attempt = attemptItemSelection<string>(pos, {
      findItemAtPosition: (p, tolerance) => {
        const light = this.config.lightManager.getLightAt(p, tolerance);
        return light ? { id: light.id, position: light.position } : null;
      },
      isSelected: (id) => selectedLightIds.has(id),
      getOtherSelectedCount: () => selectedLightIds.size - 1 + selectedIndices.size,
      hitTolerance: LIGHT_HIT_TOLERANCE_FT,
    });

    const handled = handleSelectionAction(attempt, addToSelection, {
      onSelect: (id, add) => this.callbacks.onSelectLight(id, add),
      onClearOtherSelection: () => this.callbacks.onClearVertexSelection(),
      onClearWallSelection: () => this.callbacks.onClearWallSelection(),
      onClearDoorSelection: () => this.callbacks.onClearDoorSelection(),
      isSelectedNow: (id) => this.callbacks.getSelectedLightIds().has(id),
      startDrag: (id) => this.startUnifiedDrag(null, id, pos, vertices),
    });

    return { handled };
  }

  private trySelectDoor(pos: Vector2, walls: WallSegment[]): { handled: boolean } {
    const doors = this.callbacks.getDoors();
    const door = this.getDoorAtPosition(pos, doors, walls, DOOR_HIT_TOLERANCE_FT);
    if (!door) return { handled: false };

    this.callbacks.onSelectDoor(door.id);
    this.callbacks.onClearLightSelection();
    this.callbacks.onClearVertexSelection();
    this.callbacks.onClearWallSelection();

    // Start door drag
    const operation = this.config.createDoorDragOperation();
    operation.setDoorId(door.id);

    this.config.dragManager.startDrag(operation, {
      position: pos,
      modifiers: EMPTY_MODIFIERS,
      roomState: null as any,
      selection: this.config.getSelection(),
    });

    return { handled: true };
  }

  private getDoorAtPosition(pos: Vector2, doors: Door[], walls: WallSegment[], tolerance: number): Door | null {
    for (const door of doors) {
      const wall = walls.find(w => w.id === door.wallId);
      if (!wall) continue;

      const { start, end } = getDoorEndpoints(door, wall);

      // Check if click is near door segment
      const dist = distancePointToSegment(pos, start, end);
      if (dist <= tolerance) {
        return door;
      }
    }
    return null;
  }

  private trySelectWall(pos: Vector2, walls: WallSegment[]): { handled: boolean } {
    const wall = this.callbacks.getWallAtPosition(pos, walls, VERTEX_HIT_TOLERANCE_FT);
    if (!wall) return { handled: false };

    this.callbacks.onSelectWall(wall.id);
    this.callbacks.onClearLightSelection();
    this.callbacks.onClearVertexSelection();
    this.callbacks.onClearDoorSelection();

    // Start wall drag
    const operation = this.config.createWallDragOperation();
    operation.setWallId(wall.id);

    this.config.dragManager.startDrag(operation, {
      position: pos,
      modifiers: EMPTY_MODIFIERS,
      roomState: null as any,
      selection: this.config.getSelection(),
    });

    return { handled: true };
  }

  private startUnifiedDrag(
    vertexIndex: number | null,
    lightId: string | null,
    pos: Vector2,
    _vertices: Vector2[]
  ): void {
    const operation = this.config.createUnifiedDragOperation();
    operation.setAnchor(vertexIndex, lightId);

    this.config.dragManager.startDrag(operation, {
      position: pos,
      modifiers: EMPTY_MODIFIERS,
      roomState: null as any,
      selection: this.config.getSelection(),
    });
  }

  /**
   * Trigger an immediate drag update with the current mouse position.
   * This ensures the object position updates immediately when axis lock changes.
   */
  private triggerImmediateUpdate(): void {
    const currentPos = this.config.getCurrentMousePos();
    this.config.dragManager.updateDrag(currentPos, EMPTY_MODIFIERS);
  }

  private getSelectionOrigin(context: InteractionContext): Vector2 | undefined {
    const selection = this.config.getSelection();
    return getSelectionOriginFromRoomState(
      selection,
      context.vertices,
      context.roomState.lights,
      context.roomState.walls,
      context.roomState.doors
    );
  }
}

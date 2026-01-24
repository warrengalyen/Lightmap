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
import {
  LIGHT_HIT_TOLERANCE_FT,
  VERTEX_HIT_TOLERANCE_FT,
} from '../../constants/editor';

const DOOR_HIT_TOLERANCE_FT = 0.3;

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
    const hasSelection =
      selection.selectedVertexIndices.size > 0 ||
      selection.selectedLightIds.size > 0 ||
      selection.selectedWallId !== null ||
      selection.selectedDoorId !== null;

    if (hasSelection && !event.ctrlKey && !event.altKey && !context.isGrabMode) {
      if (event.key?.toLowerCase() === 'x') {
        this.config.dragManager.setAxisLock('x');
        this.config.dragManager.updateAxisLockGuides(this.getSelectionOrigin(context));
        return true;
      }
      if (event.key?.toLowerCase() === 'y') {
        this.config.dragManager.setAxisLock('y');
        this.config.dragManager.updateAxisLockGuides(this.getSelectionOrigin(context));
        return true;
      }
    }

    // Escape clears selection or axis lock
    if (event.key === 'Escape') {
      if (this.config.dragManager.axisLock !== 'none') {
        this.config.dragManager.clearAxisLock();
        return true;
      }
      if (hasSelection) {
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
    const vertexIndex = findVertexAtPosition(pos, vertices, VERTEX_HIT_TOLERANCE_FT);
    if (vertexIndex === null) return { handled: false };

    const selectedIndices = this.callbacks.getSelectedVertexIndices();
    const selectedLightIds = this.callbacks.getSelectedLightIds();
    const isAlreadySelected = selectedIndices.has(vertexIndex);

    // Shift+click toggles vertex in/out of selection
    if (addToSelection) {
      this.callbacks.onSelectVertex(vertexIndex, true);

      // Check if vertex was toggled off
      const updatedSelection = this.callbacks.getSelectedVertexIndices();
      if (!updatedSelection.has(vertexIndex)) {
        this.callbacks.onClearWallSelection();
        return { handled: true };
      }

      // Vertex was added, start drag
      this.startUnifiedDrag(vertexIndex, null, pos, vertices);
    }
    // Click on already-selected vertex with multiple items: start multi-drag
    else if (isAlreadySelected && (selectedIndices.size > 1 || selectedLightIds.size > 0)) {
      this.startUnifiedDrag(vertexIndex, null, pos, vertices);
    }
    // Normal single vertex selection
    else {
      this.callbacks.onSelectVertex(vertexIndex, false);
      this.callbacks.onClearLightSelection();
      this.startUnifiedDrag(vertexIndex, null, pos, vertices);
    }

    this.callbacks.onClearWallSelection();
    this.callbacks.onClearDoorSelection();
    return { handled: true };
  }

  private trySelectLight(
    pos: Vector2,
    vertices: Vector2[],
    addToSelection: boolean,
    _context: InteractionContext
  ): { handled: boolean } {
    const light = this.config.lightManager.getLightAt(pos, LIGHT_HIT_TOLERANCE_FT);
    if (!light) return { handled: false };

    const selectedIndices = this.callbacks.getSelectedVertexIndices();
    const selectedLightIds = this.callbacks.getSelectedLightIds();
    const isAlreadySelected = selectedLightIds.has(light.id);

    // Shift+click toggles light in/out of selection
    if (addToSelection) {
      this.callbacks.onSelectLight(light.id, true);

      // Check if light was toggled off
      const updatedSelection = this.callbacks.getSelectedLightIds();
      if (!updatedSelection.has(light.id)) {
        this.callbacks.onClearWallSelection();
        return { handled: true };
      }

      // Light was added, start drag
      this.startUnifiedDrag(null, light.id, pos, vertices);
    }
    // Click on already-selected light with multiple items: start multi-drag
    else if (isAlreadySelected && (selectedLightIds.size > 1 || selectedIndices.size > 0)) {
      this.startUnifiedDrag(null, light.id, pos, vertices);
    }
    // Normal single light selection
    else {
      this.callbacks.onSelectLight(light.id, false);
      this.callbacks.onClearVertexSelection();
      this.startUnifiedDrag(null, light.id, pos, vertices);
    }

    this.callbacks.onClearWallSelection();
    this.callbacks.onClearDoorSelection();
    return { handled: true };
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
      modifiers: { shiftKey: false, ctrlKey: false, altKey: false },
      roomState: null as any,
      selection: this.config.getSelection(),
    });

    return { handled: true };
  }

  private getDoorAtPosition(pos: Vector2, doors: Door[], walls: WallSegment[], tolerance: number): Door | null {
    for (const door of doors) {
      const wall = walls.find(w => w.id === door.wallId);
      if (!wall) continue;

      // Calculate door segment on wall
      const wallDir = {
        x: wall.end.x - wall.start.x,
        y: wall.end.y - wall.start.y,
      };
      const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.y * wallDir.y);
      if (wallLength === 0) continue;

      const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };
      const halfWidth = door.width / 2;

      const doorStart = {
        x: wall.start.x + normalizedDir.x * (door.position - halfWidth),
        y: wall.start.y + normalizedDir.y * (door.position - halfWidth),
      };
      const doorEnd = {
        x: wall.start.x + normalizedDir.x * (door.position + halfWidth),
        y: wall.start.y + normalizedDir.y * (door.position + halfWidth),
      };

      // Check if click is near door segment
      const dist = distancePointToSegment(pos, doorStart, doorEnd);
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
      modifiers: { shiftKey: false, ctrlKey: false, altKey: false },
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
      modifiers: { shiftKey: false, ctrlKey: false, altKey: false },
      roomState: null as any,
      selection: this.config.getSelection(),
    });
  }

  private getSelectionOrigin(context: InteractionContext): Vector2 | undefined {
    const selection = this.config.getSelection();
    const vertices = context.vertices;

    if (selection.selectedVertexIndices.size > 0) {
      const firstIdx = Array.from(selection.selectedVertexIndices)[0];
      return vertices[firstIdx];
    }

    if (selection.selectedLightIds.size > 0) {
      const firstId = Array.from(selection.selectedLightIds)[0];
      const light = context.roomState.lights.find(l => l.id === firstId);
      if (light) return light.position;
    }

    if (selection.selectedWallId) {
      const wall = context.roomState.walls.find(w => w.id === selection.selectedWallId);
      if (wall) {
        return {
          x: (wall.start.x + wall.end.x) / 2,
          y: (wall.start.y + wall.end.y) / 2,
        };
      }
    }

    if (selection.selectedDoorId) {
      const door = context.roomState.doors.find(d => d.id === selection.selectedDoorId);
      if (door) {
        const wall = context.roomState.walls.find(w => w.id === door.wallId);
        if (wall) {
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

    return undefined;
  }
}

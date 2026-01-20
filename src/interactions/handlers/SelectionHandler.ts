import type { InputEvent } from "../../core/InputManager";
import type { Vector2, WallSegment } from "../../types";
import type { InteractionContext, SelectionState } from "../../types/interaction";
import type { LightManager } from "../../lighting/LightManager";
import type { DragManager } from "../DragManager";
import type { UnifiedDragOperation } from "../operations/UnifiedDragOperation";
import type { WallDragOperation } from "../operations/WallDragOperation";
import type { BoxSelectionHandler } from "./BoxSelectionHandler";
import { BaseInteractionHandler } from "../InteractionHandler";
import { findVertexAtPosition, projectPointOntoSegmentForInsertion } from "../../utils/math";
import { LIGHT_HIT_TOLERANCE_FT, VERTEX_HIT_TOLERANCE_FT } from "../../constants/editor";

export interface SelectionHandlerCallbacks {
    onSelectVertex: (index: number, addToSelection: boolean) => void;
    onSelectLight: (id: string, addToSelection: boolean) => void;
    onSelectWall: (id: string) => void;
    onClearSelection: () => void;
    onClearLightSelection: () => void;
    onClearVertexSelection: () => void;
    onClearWallSelection: () => void;
    onInsertVertex: (wallId: string, position: Vector2) => number | null;
    getSelectedVertexIndices: () => Set<number>;
    getSelectedLightIds: () => Set<string>;
    getWallAtPosition: (pos: Vector2, walls: WallSegment[], tolerance: number) => WallSegment | null;
}

export interface SelectionHandlerConfig {
    lightManager: LightManager;
    dragManager: DragManager;
    boxSelectionHandler: BoxSelectionHandler;
    createUnifiedDragOperation: () => UnifiedDragOperation;
    createWallDragOperation: () => WallDragOperation;
    getSelection: () => SelectionState;
}

/**
 * Handles selection of vertices, lights, and walls.
 * Manages single click selection, shift-click multi-selection,
 * and initiates drag operations.
 */
export class SelectionHandler extends BaseInteractionHandler {
    readonly name = "selection";
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
        return !context.isDrawingEnabled && !context.isPlacingLights && !context.isMeasuring;
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

        const wall = this.callbacks.getWallAtPosition(event.worldPos, roomState.walls, VERTEX_HIT_TOLERANCE_FT);

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
            selection.selectedWallId !== null;

        if (hasSelection && !event.ctrlKey && !event.altKey && !context.isGrabMode) {
            if (event.key?.toLowerCase() === "x") {
                this.config.dragManager.setAxisLock("x");
                this.config.dragManager.updateAxisLockGuides(this.getSelectionOrigin(context));
                return true;
            }
            if (event.key?.toLowerCase() === "y") {
                this.config.dragManager.setAxisLock("y");
                this.config.dragManager.updateAxisLockGuides(this.getSelectionOrigin(context));
                return true;
            }
        }

        // Escape clears selection or axis lock
        if (event.key === "Escape") {
            if (this.config.dragManager.axisLock !== "none") {
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

    private trySelectVertex(pos: Vector2, vertices: Vector2[], addToSelection: boolean): { handled: boolean } {
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
        return { handled: true };
    }

    private trySelectLight(
        pos: Vector2,
        vertices: Vector2[],
        addToSelection: boolean,
        _context: InteractionContext,
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
        return { handled: true };
    }

    private trySelectWall(pos: Vector2, walls: WallSegment[]): { handled: boolean } {
        const wall = this.callbacks.getWallAtPosition(pos, walls, VERTEX_HIT_TOLERANCE_FT);
        if (!wall) return { handled: false };

        this.callbacks.onSelectWall(wall.id);
        this.callbacks.onClearLightSelection();
        this.callbacks.onClearVertexSelection();

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
        _vertices: Vector2[],
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
            const light = context.roomState.lights.find((l) => l.id === firstId);
            if (light) return light.position;
        }

        if (selection.selectedWallId) {
            const wall = context.roomState.walls.find((w) => w.id === selection.selectedWallId);
            if (wall) {
                return {
                    x: (wall.start.x + wall.end.x) / 2,
                    y: (wall.start.y + wall.end.y) / 2,
                };
            }
        }

        return undefined;
    }
}

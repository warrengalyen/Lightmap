import type { InputEvent } from "../../core/InputManager";
import type { Vector2, LightFixture, WallSegment } from "../../types";
import type { InteractionContext, GrabModeState, SelectionState } from "../../types/interaction";
import type { DragManager } from "../DragManager";
import type { GrabModeDragOperation } from "../operations/GrabModeDragOperation";
import { BaseInteractionHandler } from "../InteractionHandler";

export interface GrabModeHandlerCallbacks {
    onGrabModeStart: () => void;
    onGrabModeConfirm: () => void;
    onGrabModeCancel: () => void;
}

export interface GrabModeHandlerConfig {
    dragManager: DragManager;
    createGrabOperation: () => GrabModeDragOperation;
    getGrabModeState: () => GrabModeState;
    setGrabModeActive: (active: boolean) => void;
    getSelection: () => SelectionState;
    getCurrentMousePos: () => Vector2;
    getVertices: () => Vector2[];
    getLights: () => LightFixture[];
    getWalls: () => WallSegment[];
}

/**
 * Handles grab mode (G key).
 * Allows moving selected items by pressing G and moving the mouse.
 * Click or press Escape to confirm/cancel.
 */
export class GrabModeHandler extends BaseInteractionHandler {
    readonly name = "grabMode";
    readonly priority = 120;

    private config: GrabModeHandlerConfig;
    private callbacks: GrabModeHandlerCallbacks;

    constructor(
        config: GrabModeHandlerConfig,
        callbacks: GrabModeHandlerCallbacks,
    ) {
        super();
        this.config = config;
        this.callbacks = callbacks;
    }

    canHandle(event: InputEvent, context: InteractionContext): boolean {
        return context.isGrabMode || this.shouldStartGrabMode(event, context);
    }

    handleClick(_event: InputEvent, context: InteractionContext): boolean {
        if (!context.isGrabMode) return false;

        // Confirm grab mode placement
        this.confirmGrabMode();
        return true;
    }

    handleMouseMove(event: InputEvent, context: InteractionContext): boolean {
        if (!context.isGrabMode) return false;

        const { dragManager } = this.config;
        dragManager.updateDrag(event.worldPos, {
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
        });

        return true;
    }

    handleKeyDown(event: InputEvent, context: InteractionContext): boolean {
        // Check for starting grab mode
        if (this.shouldStartGrabMode(event, context)) {
            this.startGrabMode();
            return true;
        }

        // Handle grab mode active
        if (context.isGrabMode) {
            if (event.key === "Escape") {
                this.cancelGrabMode();
                return true;
            }

            // Axis lock handling
            if (!event.ctrlKey && !event.altKey) {
                if (event.key?.toLowerCase() === "x") {
                    this.config.dragManager.setAxisLock("x");
                    this.updateAxisLockGuides();
                    return true;
                }
                if (event.key?.toLowerCase() === "y") {
                    this.config.dragManager.setAxisLock("y");
                    this.updateAxisLockGuides();
                    return true;
                }
            }
        }

        return false;
    }

    private shouldStartGrabMode(
        event: InputEvent,
        context: InteractionContext,
    ): boolean {
        if (event.key?.toLowerCase() !== "g") return false;
        if (event.ctrlKey || event.altKey) return false;
        if (context.isGrabMode) return false;

        const selection = this.config.getSelection();
        return (
            selection.selectedVertexIndices.size > 0 ||
            selection.selectedLightIds.size > 0 ||
            selection.selectedWallId !== null
        );
    }

    private startGrabMode(): void {
        const {
            dragManager,
            createGrabOperation,
            getSelection,
            getCurrentMousePos,
        } = this.config;

        this.config.setGrabModeActive(true);

        const operation = createGrabOperation();
        const selection = getSelection();

        dragManager.startDrag(operation, {
            position: getCurrentMousePos(),
            modifiers: { shiftKey: false, ctrlKey: false, altKey: false },
            roomState: null as any, // Will be populated by the operation
            selection,
        });

        this.callbacks.onGrabModeStart();
    }

    private confirmGrabMode(): void {
        this.config.dragManager.commitDrag();
        this.config.setGrabModeActive(false);
        this.callbacks.onGrabModeConfirm();
    }

    private cancelGrabMode(): void {
        this.config.dragManager.cancelDrag();
        this.config.setGrabModeActive(false);
        this.callbacks.onGrabModeCancel();
    }

    /**
     * Update axis lock guides with the correct selection origin.
     * This ensures the visual guides are drawn from the object's position,
     * not the mouse position when grab mode started.
     */
    private updateAxisLockGuides(): void {
        const origin = this.getSelectionOrigin();
        if (origin) {
            this.config.dragManager.updateAxisLockGuides(origin);
        }
    }

    /**
     * Get the position of the first selected object (vertex, light, or wall).
     */
    private getSelectionOrigin(): Vector2 | null {
        const selection = this.config.getSelection();

        // Check for selected vertices first
        if (selection.selectedVertexIndices.size > 0) {
            const vertices = this.config.getVertices();
            const firstIndex = Array.from(selection.selectedVertexIndices)[0];
            if (vertices[firstIndex]) {
                return vertices[firstIndex];
            }
        }

        // Check for selected lights
        if (selection.selectedLightIds.size > 0) {
            const lights = this.config.getLights();
            const firstId = Array.from(selection.selectedLightIds)[0];
            const light = lights.find((l) => l.id === firstId);
            if (light) {
                return light.position;
            }
        }

        // Check for selected wall
        if (selection.selectedWallId) {
            const walls = this.config.getWalls();
            const wall = walls.find((w) => w.id === selection.selectedWallId);
            if (wall) {
                return wall.start;
            }
        }

        return null;
    }
}

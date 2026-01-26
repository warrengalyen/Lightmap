import type { InputEvent } from '../../core/InputManager';
import type { Vector2, WallSegment } from '../../types';
import type { InteractionContext } from '../../types/interaction';
import type { WallBuilder } from '../../geometry/WallBuilder';
import type { PolygonValidator } from '../../geometry/PolygonValidator';
import type { SnapController } from '../../controllers/SnapController';
import { BaseInteractionHandler } from '../InteractionHandler';
import { DEFAULT_GRID_SIZE_FT } from '../../constants/editor';

export interface DrawingHandlerCallbacks {
  onUpdateDrawingVertices: (vertices: Vector2[]) => void;
  onSetPhantomLine: (from: Vector2 | null, to: Vector2 | null) => void;
  onSetPreviewVertex: (pos: Vector2 | null) => void;
  onCloseRoom: (walls: WallSegment[]) => void;
  onSnapChange: (snapType: string) => void;
}

export interface DrawingHandlerConfig {
  wallBuilder: WallBuilder;
  polygonValidator: PolygonValidator;
  snapController: SnapController;
  getGridSnapEnabled: () => boolean;
  getGridSize: () => number;
}

/**
 * Handles wall drawing mode.
 * Manages vertex placement, angle snapping, grid snapping, and room closure.
 */
export class DrawingHandler extends BaseInteractionHandler {
  readonly name = 'drawing';
  readonly priority = 100;

  private config: DrawingHandlerConfig;
  private callbacks: DrawingHandlerCallbacks;

  constructor(config: DrawingHandlerConfig, callbacks: DrawingHandlerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  canHandle(_event: InputEvent, context: InteractionContext): boolean {
    return context.isDrawingEnabled;
  }

  handleClick(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isDrawingEnabled) return false;

    const { wallBuilder, polygonValidator, snapController } = this.config;
    const pos = event.worldPos;
    const gridSize = this.config.getGridSize() || DEFAULT_GRID_SIZE_FT;

    // Grid snap mode
    if (this.config.getGridSnapEnabled() && gridSize > 0) {
      const gridPos = snapController.snapToGrid(pos, gridSize);

      if (!wallBuilder.drawing) {
        wallBuilder.startDrawing(gridPos);
        this.callbacks.onUpdateDrawingVertices(wallBuilder.getVertices());
      } else {
        // Check for closure
        if (this.tryClosureWithGridSnap(gridPos, gridSize, wallBuilder, polygonValidator)) {
          return true;
        }

        wallBuilder.placeVertex(gridPos);
        this.callbacks.onUpdateDrawingVertices(wallBuilder.getVertices());
      }
      return true;
    }

    // Normal drawing with angle snapping
    if (!wallBuilder.drawing) {
      wallBuilder.startDrawing(pos);
      this.callbacks.onUpdateDrawingVertices(wallBuilder.getVertices());
    } else {
      const snappedPos = wallBuilder.continueDrawing(pos);
      const snap = wallBuilder.currentSnap;

      if (snap?.snapType === 'closure' && wallBuilder.vertexCount >= 3) {
        const walls = wallBuilder.closeLoop();
        if (walls && polygonValidator.isValid(walls)) {
          this.callbacks.onUpdateDrawingVertices([]);
          this.callbacks.onSetPhantomLine(null, null);
          this.callbacks.onCloseRoom(walls);
        } else {
          wallBuilder.cancel();
          this.callbacks.onUpdateDrawingVertices([]);
          this.callbacks.onSetPhantomLine(null, null);
        }
      } else {
        wallBuilder.placeVertex(snappedPos);
        this.callbacks.onUpdateDrawingVertices(wallBuilder.getVertices());
      }
    }

    return true;
  }

  handleMouseMove(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isDrawingEnabled) {
      this.callbacks.onSetPreviewVertex(null);
      return false;
    }

    const { wallBuilder, snapController } = this.config;
    if (!wallBuilder.drawing) {
      // Show preview vertex at cursor when not actively drawing
      const gridSize = this.config.getGridSize() || DEFAULT_GRID_SIZE_FT;
      if (this.config.getGridSnapEnabled() && gridSize > 0) {
        const gridPos = snapController.snapToGrid(event.worldPos, gridSize);
        this.callbacks.onSetPreviewVertex(gridPos);
      } else {
        this.callbacks.onSetPreviewVertex(event.worldPos);
      }
      return false;
    }

    const lastVertex = wallBuilder.lastVertex;
    if (!lastVertex) {
      this.callbacks.onSetPreviewVertex(null);
      return false;
    }

    const gridSize = this.config.getGridSize() || DEFAULT_GRID_SIZE_FT;

    // Grid snap mode - bypass angle snapping entirely
    if (this.config.getGridSnapEnabled() && gridSize > 0) {
      const gridPos = snapController.snapToGrid(event.worldPos, gridSize);
      this.callbacks.onSetPhantomLine(lastVertex, gridPos);
      this.callbacks.onSetPreviewVertex(gridPos);
      return true;
    }

    // Normal mode with angle snapping
    const snappedPos = wallBuilder.continueDrawing(event.worldPos);
    this.callbacks.onSetPhantomLine(lastVertex, snappedPos);
    this.callbacks.onSetPreviewVertex(snappedPos);

    const snap = wallBuilder.currentSnap;
    if (snap) {
      this.callbacks.onSnapChange(snap.snapType);
    }

    return true;
  }

  handleKeyDown(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isDrawingEnabled) return false;

    const { wallBuilder } = this.config;

    if (event.key === 'Escape' && wallBuilder.drawing) {
      wallBuilder.cancel();
      this.callbacks.onSetPhantomLine(null, null);
      this.callbacks.onSetPreviewVertex(null);
      this.callbacks.onUpdateDrawingVertices([]);
      return true;
    }

    return false;
  }

  private tryClosureWithGridSnap(
    gridPos: Vector2,
    gridSize: number,
    wallBuilder: WallBuilder,
    polygonValidator: PolygonValidator
  ): boolean {
    const startVertex = wallBuilder.startVertex;
    const closureThreshold = gridSize;

    if (startVertex && wallBuilder.vertexCount >= 3) {
      const dist = Math.hypot(gridPos.x - startVertex.x, gridPos.y - startVertex.y);
      if (dist < closureThreshold) {
        const walls = wallBuilder.closeLoop();
        if (walls && polygonValidator.isValid(walls)) {
          this.callbacks.onUpdateDrawingVertices([]);
          this.callbacks.onSetPhantomLine(null, null);
          this.callbacks.onCloseRoom(walls);
        } else {
          wallBuilder.cancel();
          this.callbacks.onUpdateDrawingVertices([]);
          this.callbacks.onSetPhantomLine(null, null);
        }
        return true;
      }
    }

    return false;
  }
}

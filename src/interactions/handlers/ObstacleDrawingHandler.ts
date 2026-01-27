import type { InputEvent } from '../../core/InputManager';
import type { Vector2, WallSegment } from '../../types';
import type { InteractionContext } from '../../types/interaction';
import type { WallBuilder } from '../../geometry/WallBuilder';
import type { PolygonValidator } from '../../geometry/PolygonValidator';
import type { SnapController } from '../../controllers/SnapController';
import { BaseInteractionHandler } from '../InteractionHandler';
import { DEFAULT_GRID_SIZE_FT } from '../../constants/editor';
import { isPointInRoom } from '../../utils/geometry';
import { handleDrawingMouseMove } from '../utils/drawingMouseMove';

export interface ObstacleDrawingHandlerCallbacks {
  onUpdateDrawingVertices: (vertices: Vector2[]) => void;
  onSetPhantomLine: (from: Vector2 | null, to: Vector2 | null) => void;
  onSetPreviewVertex: (pos: Vector2 | null) => void;
  onCloseObstacle: (walls: WallSegment[]) => void;
  onSnapChange: (snapType: string) => void;
}

export interface ObstacleDrawingHandlerConfig {
  wallBuilder: WallBuilder;
  polygonValidator: PolygonValidator;
  snapController: SnapController;
  getGridSnapEnabled: () => boolean;
  getGridSize: () => number;
}

/**
 * Handles drawing obstacles (internal polygons) inside a closed room.
 * Mirrors DrawingHandler but validates vertices are inside the room polygon.
 */
export class ObstacleDrawingHandler extends BaseInteractionHandler {
  readonly name = 'obstacle-drawing';
  readonly priority = 95; // Just below DrawingHandler (100)

  private config: ObstacleDrawingHandlerConfig;
  private callbacks: ObstacleDrawingHandlerCallbacks;

  constructor(config: ObstacleDrawingHandlerConfig, callbacks: ObstacleDrawingHandlerCallbacks) {
    super();
    this.config = config;
    this.callbacks = callbacks;
  }

  private getEffectiveGridSize(): number {
    return this.config.getGridSize() || DEFAULT_GRID_SIZE_FT;
  }

  private resetDrawingState(): void {
    this.callbacks.onUpdateDrawingVertices([]);
    this.callbacks.onSetPhantomLine(null, null);
  }

  private handleClosureAttempt(walls: WallSegment[] | null, roomWalls: WallSegment[]): void {
    if (walls && this.config.polygonValidator.isValid(walls)) {
      // Validate all vertices are inside the room
      const allInside = walls.every(w => isPointInRoom(w.start, roomWalls));
      if (allInside) {
        this.resetDrawingState();
        this.callbacks.onCloseObstacle(walls);
      } else {
        this.config.wallBuilder.cancel();
        this.resetDrawingState();
      }
    } else {
      this.config.wallBuilder.cancel();
      this.resetDrawingState();
    }
  }

  canHandle(_event: InputEvent, context: InteractionContext): boolean {
    return context.isObstacleDrawing;
  }

  handleClick(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isObstacleDrawing) return false;

    const { wallBuilder, snapController } = this.config;
    const pos = event.worldPos;
    const gridSize = this.getEffectiveGridSize();

    // Verify point is inside the room
    if (!isPointInRoom(pos, context.roomState.walls)) {
      return true; // Consume the event but don't place
    }

    // Grid snap mode
    if (this.config.getGridSnapEnabled() && gridSize > 0) {
      const gridPos = snapController.snapToGrid(pos, gridSize);

      if (!wallBuilder.drawing) {
        wallBuilder.startDrawing(gridPos);
        this.callbacks.onUpdateDrawingVertices(wallBuilder.getVertices());
      } else {
        if (this.tryClosureWithGridSnap(gridPos, gridSize, context.roomState.walls)) {
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
        this.handleClosureAttempt(wallBuilder.closeLoop(), context.roomState.walls);
      } else {
        wallBuilder.placeVertex(snappedPos);
        this.callbacks.onUpdateDrawingVertices(wallBuilder.getVertices());
      }
    }

    return true;
  }

  handleMouseMove(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isObstacleDrawing) {
      this.callbacks.onSetPreviewVertex(null);
      return false;
    }

    const gridSize = this.getEffectiveGridSize();
    return handleDrawingMouseMove(
      event.worldPos,
      this.config.wallBuilder,
      this.config.snapController,
      this.config.getGridSnapEnabled() && gridSize > 0,
      gridSize,
      this.callbacks
    );
  }

  handleKeyDown(event: InputEvent, context: InteractionContext): boolean {
    if (!context.isObstacleDrawing) return false;

    const { wallBuilder } = this.config;

    if (event.key === 'Escape' && wallBuilder.drawing) {
      wallBuilder.cancel();
      this.resetDrawingState();
      this.callbacks.onSetPreviewVertex(null);
      return true;
    }

    return false;
  }

  private tryClosureWithGridSnap(gridPos: Vector2, gridSize: number, roomWalls: WallSegment[]): boolean {
    const { wallBuilder } = this.config;
    const startVertex = wallBuilder.startVertex;

    if (startVertex && wallBuilder.vertexCount >= 3) {
      const dist = Math.hypot(gridPos.x - startVertex.x, gridPos.y - startVertex.y);
      if (dist < gridSize) {
        this.handleClosureAttempt(wallBuilder.closeLoop(), roomWalls);
        return true;
      }
    }

    return false;
  }
}

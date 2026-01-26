import type { Vector2, SnapResult } from '../types';
import {
  vectorSubtract,
  vectorNormalize,
  vectorDot,
  vectorScale,
  vectorAdd,
  vectorLength,
  distancePointToPoint,
} from '../utils/math';
import { PARALLEL_ANGLE_THRESHOLD_RAD, CLOSURE_SNAP_THRESHOLD_FT, MIN_VECTOR_LENGTH_FT } from '../constants/editor';

export class SnapEngine {
  private angleThreshold = PARALLEL_ANGLE_THRESHOLD_RAD;
  private closureThreshold = CLOSURE_SNAP_THRESHOLD_FT;

  snapToConstraint(
    prevSegmentDir: Vector2 | null,
    mousePos: Vector2,
    startVertex: Vector2 | null,
    anchorPoint: Vector2
  ): SnapResult {
    if (startVertex && distancePointToPoint(mousePos, startVertex) < this.closureThreshold) {
      return { snappedPos: startVertex, snapType: 'closure' };
    }

    const toMouse = vectorSubtract(mousePos, anchorPoint);
    const dist = vectorLength(toMouse);
    if (dist < MIN_VECTOR_LENGTH_FT) {
      return { snappedPos: mousePos, snapType: 'none' };
    }

    const currentDir = vectorNormalize(toMouse);

    if (prevSegmentDir) {
      const dot = Math.abs(vectorDot(prevSegmentDir, currentDir));

      if (dot > Math.cos(this.angleThreshold)) {
        const projectedLength = vectorDot(toMouse, prevSegmentDir);
        const snappedPos = vectorAdd(anchorPoint, vectorScale(prevSegmentDir, projectedLength));
        return { snappedPos, snapType: 'parallel' };
      }

      if (dot < Math.sin(this.angleThreshold)) {
        const perpDir = { x: -prevSegmentDir.y, y: prevSegmentDir.x };
        const projectedLength = vectorDot(toMouse, perpDir);
        const snappedPos = vectorAdd(anchorPoint, vectorScale(perpDir, projectedLength));
        return { snappedPos, snapType: 'perpendicular' };
      }
    }

    return { snappedPos: mousePos, snapType: 'none' };
  }

}

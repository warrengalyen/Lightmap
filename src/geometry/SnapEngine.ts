import type { Vector2, SnapResult, SnapType } from "../types";
import {
    vectorSubtract,
    vectorNormalize,
    vectorDot,
    vectorScale,
    vectorAdd,
    vectorLength,
    distancePointToPoint,
} from "../utils/math";

export class SnapEngine {
    private angleThreshold = 5 * (Math.PI / 180);
    private closureThreshold = 0.5;

    snapToConstraint(
        prevSegmentDir: Vector2 | null,
        mousePos: Vector2,
        startVertex: Vector2 | null,
        anchorPoint: Vector2,
    ): SnapResult {
        if (startVertex && distancePointToPoint(mousePos, startVertex) < this.closureThreshold) {
            return { snappedPos: startVertex, snapType: "closure" };
        }

        const toMouse = vectorSubtract(mousePos, anchorPoint);
        const dist = vectorLength(toMouse);
        if (dist < 0.001) {
            return { snappedPos: mousePos, snapType: "none" };
        }

        const currentDir = vectorNormalize(toMouse);

        if (prevSegmentDir) {
            const dot = Math.abs(vectorDot(prevSegmentDir, currentDir));

            if (dot > Math.cos(this.angleThreshold)) {
                const projectedLength = vectorDot(toMouse, prevSegmentDir);
                const snappedPos = vectorAdd(anchorPoint, vectorScale(prevSegmentDir, projectedLength));
                return { snappedPos, snapType: "parallel" };
            }

            if (dot < Math.sin(this.angleThreshold)) {
                const perpDir = { x: -prevSegmentDir.y, y: prevSegmentDir.x };
                const projectedLength = vectorDot(toMouse, perpDir);
                const snappedPos = vectorAdd(anchorPoint, vectorScale(perpDir, projectedLength));
                return { snappedPos, snapType: "perpendicular" };
            }
        }

        return { snappedPos: mousePos, snapType: "none" };
    }

    setClosureThreshold(threshold: number): void {
        this.closureThreshold = threshold;
    }

    setAngleThreshold(degrees: number): void {
        this.angleThreshold = degrees * (Math.PI / 180);
    }

    getSnapTypeLabel(snapType: SnapType): string {
        switch (snapType) {
            case "parallel":
                return "Parallel";
            case "perpendicular":
                return "Perpendicular";
            case "closure":
                return "Close";
            default:
                return "";
        }
    }
}

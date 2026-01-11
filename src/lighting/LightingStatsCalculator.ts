import type { Vector2, LightFixture, WallSegment, BoundingBox, LightingMetrics } from "../types";
import { LightCalculator } from "./LightCalculator";

export class LightingStatsCalculator {
    private lightCalculator: LightCalculator;
    private cachedMetrics: LightingMetrics | null = null;
    private cacheKey: string = "";

    constructor() {
        this.lightCalculator = new LightCalculator();
    }

    calculateMetrics(
        lights: LightFixture[],
        walls: WallSegment[],
        bounds: BoundingBox,
        ceilingHeight: number,
        gridSpacing: number = 0.5,
    ): LightingMetrics | null {
        if (lights.length === 0 || walls.length === 0) {
            return null;
        }

        const key = this.generateCacheKey(lights, walls, ceilingHeight, gridSpacing);
        if (key === this.cacheKey && this.cachedMetrics) {
            return this.cachedMetrics;
        }

        const samples = this.sampleLuxValues(lights, walls, bounds, ceilingHeight, gridSpacing);
        if (samples.length === 0) {
            return null;
        }

        // Sort samples for percentile calculations
        const sorted = [...samples].sort((a, b) => a - b);
        const n = sorted.length;

        // Use 5th percentile for min and 95th for max to exclude outliers
        const p5Index = Math.floor(n * 0.05);
        const p95Index = Math.floor(n * 0.95);

        const minLux = sorted[p5Index] ?? sorted[0];
        const maxLux = sorted[p95Index] ?? sorted[n - 1];
        const avgLux = samples.reduce((sum, v) => sum + v, 0) / n;

        // Uniformity: ratio of 5th percentile to average (more robust than absolute min)
        const uniformityRatio = avgLux > 0 ? minLux / avgLux : 0;
        const coverageGrade = this.calculateGrade(uniformityRatio, avgLux);

        const metrics: LightingMetrics = {
            minLux,
            maxLux,
            avgLux,
            uniformityRatio,
            coverageGrade,
            sampleCount: samples.length,
        };

        this.cachedMetrics = metrics;
        this.cacheKey = key;

        return metrics;
    }

    private sampleLuxValues(
        lights: LightFixture[],
        walls: WallSegment[],
        bounds: BoundingBox,
        ceilingHeight: number,
        gridSpacing: number,
    ): number[] {
        const samples: number[] = [];
        const wallMargin = 1.5; // Exclude points within 1.5ft of walls (standard practice)

        for (let x = bounds.minX; x <= bounds.maxX; x += gridSpacing) {
            for (let y = bounds.minY; y <= bounds.maxY; y += gridSpacing) {
                const point = { x, y };
                if (this.isPointInPolygon(point, walls) && this.getDistanceToNearestWall(point, walls) >= wallMargin) {
                    const lux = this.lightCalculator.calculateLux(point, lights, ceilingHeight);
                    samples.push(lux);
                }
            }
        }

        return samples;
    }

    private getDistanceToNearestWall(point: Vector2, walls: WallSegment[]): number {
        let minDist = Infinity;

        for (const wall of walls) {
            const dist = this.pointToSegmentDistance(point, wall.start, wall.end);
            if (dist < minDist) {
                minDist = dist;
            }
        }

        return minDist;
    }

    private pointToSegmentDistance(point: Vector2, segStart: Vector2, segEnd: Vector2): number {
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq === 0) {
            // Segment is a point
            return Math.sqrt((point.x - segStart.x) ** 2 + (point.y - segStart.y) ** 2);
        }

        // Project point onto line, clamped to segment
        let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));

        const projX = segStart.x + t * dx;
        const projY = segStart.y + t * dy;

        return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
    }

    private isPointInPolygon(point: Vector2, walls: WallSegment[]): boolean {
        if (walls.length < 3) return false;

        const vertices = walls.map((w) => w.start);
        let inside = false;
        const n = vertices.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = vertices[i].x;
            const yi = vertices[i].y;
            const xj = vertices[j].x;
            const yj = vertices[j].y;

            if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
                inside = !inside;
            }
        }

        return inside;
    }

    private calculateGrade(uniformity: number, avgLux: number): "A" | "B" | "C" | "D" | "F" {
        // Grading based on both uniformity and average lux level
        // With 800 lumen lights at 8ft ceiling, expect ~15 lux directly below
        // Target: avg lux 8-25 for good coverage, uniformity > 0.3 is good

        // Lux score: peaks at 10-20 lux for residential recessed lighting
        let luxScore: number;
        if (avgLux < 3) {
            luxScore = (avgLux / 3) * 0.2; // Very dim
        } else if (avgLux < 8) {
            luxScore = 0.2 + ((avgLux - 3) / 5) * 0.4; // Dim but usable
        } else if (avgLux <= 25) {
            luxScore = 0.6 + Math.min((avgLux - 8) / 12, 1) * 0.4; // Good range
        } else {
            luxScore = Math.max(0.7, 1 - (avgLux - 25) / 50); // Very bright, slight penalty
        }

        // Uniformity score: 0.3+ is considered decent for residential
        const uniformityScore = Math.min(1, uniformity / 0.35);

        // Weight: 50% lux level, 50% uniformity
        const combined = luxScore * 0.5 + uniformityScore * 0.5;

        if (combined >= 0.75) return "A";
        if (combined >= 0.6) return "B";
        if (combined >= 0.45) return "C";
        if (combined >= 0.3) return "D";
        return "F";
    }

    private generateCacheKey(
        lights: LightFixture[],
        walls: WallSegment[],
        ceilingHeight: number,
        gridSpacing: number,
    ): string {
        const lightsKey = lights
            .map(
                (l) =>
                    `${l.id}:${l.position.x.toFixed(2)},${l.position.y.toFixed(2)}:${l.properties.lumen}:${l.properties.beamAngle}`,
            )
            .join("|");

        const wallsKey = walls
            .map((w) => `${w.start.x.toFixed(2)},${w.start.y.toFixed(2)}-${w.end.x.toFixed(2)},${w.end.y.toFixed(2)}`)
            .join("|");

        return `${lightsKey}::${wallsKey}::${ceilingHeight}::${gridSpacing}`;
    }

    clearCache(): void {
        this.cachedMetrics = null;
        this.cacheKey = "";
    }
}

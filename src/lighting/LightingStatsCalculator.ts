import type { Vector2, LightFixture, WallSegment, BoundingBox, LightingMetrics, RoomType } from "../types";
import { ROOM_LIGHTING_STANDARDS } from "../types";
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
        roomType: RoomType = "living",
    ): LightingMetrics | null {
        if (lights.length === 0 || walls.length === 0) {
            return null;
        }

        const key = this.generateCacheKey(lights, walls, ceilingHeight, gridSpacing, roomType);
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

        // Calculate room-based metrics
        const roomArea = this.calculatePolygonArea(walls);
        const totalLumens = lights.reduce((sum, l) => sum + l.properties.lumen, 0);
        const lumensPerSqFt = roomArea > 0 ? totalLumens / roomArea : 0;

        // Get standards for room type
        const standards = ROOM_LIGHTING_STANDARDS[roomType];
        const recommendedLumens = roomArea * standards.ideal;

        // Calculate additional lights needed (assuming average lumen per light)
        const avgLumenPerLight = totalLumens / lights.length;
        const lumensNeeded = Math.max(0, recommendedLumens - totalLumens);
        const additionalLightsNeeded = avgLumenPerLight > 0 ? Math.ceil(lumensNeeded / avgLumenPerLight) : 0;

        // Calculate grade based on lumens per sq ft relative to room type standards
        const coverageGrade = this.calculateGrade(uniformityRatio, lumensPerSqFt, roomType);

        const metrics: LightingMetrics = {
            minLux,
            maxLux,
            avgLux,
            uniformityRatio,
            coverageGrade,
            sampleCount: samples.length,
            roomArea,
            totalLumens,
            lumensPerSqFt,
            recommendedLumens,
            additionalLightsNeeded,
            roomType,
        };

        this.cachedMetrics = metrics;
        this.cacheKey = key;

        return metrics;
    }

    private calculatePolygonArea(walls: WallSegment[]): number {
        if (walls.length < 3) return 0;

        const vertices = walls.map((w) => w.start);
        let area = 0;
        const n = vertices.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += vertices[i].x * vertices[j].y;
            area -= vertices[j].x * vertices[i].y;
        }

        return Math.abs(area) / 2;
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

    private calculateGrade(uniformity: number, lumensPerSqFt: number, roomType: RoomType): "A" | "B" | "C" | "D" | "F" {
        const standards = ROOM_LIGHTING_STANDARDS[roomType];

        // Brightness score based on lumens per sq ft relative to room type standards
        let brightnessScore: number;
        if (lumensPerSqFt < standards.min * 0.5) {
            brightnessScore = (lumensPerSqFt / (standards.min * 0.5)) * 0.25; // Very dim
        } else if (lumensPerSqFt < standards.min) {
            brightnessScore = 0.25 + ((lumensPerSqFt - standards.min * 0.5) / (standards.min * 0.5)) * 0.25; // Below minimum
        } else if (lumensPerSqFt < standards.ideal) {
            brightnessScore = 0.5 + ((lumensPerSqFt - standards.min) / (standards.ideal - standards.min)) * 0.4; // Good range
        } else if (lumensPerSqFt < standards.ideal * 1.5) {
            brightnessScore = 0.9 + ((lumensPerSqFt - standards.ideal) / (standards.ideal * 0.5)) * 0.1; // Ideal to bright
        } else {
            brightnessScore = 1.0; // Very bright (no penalty for over-lighting)
        }

        // Uniformity score: 0.4+ is good, 0.6+ is excellent
        const uniformityScore = Math.min(1, uniformity / 0.5);

        // Weight: 70% brightness (lumens), 30% uniformity
        const combined = brightnessScore * 0.7 + uniformityScore * 0.3;

        if (combined >= 0.85) return "A";
        if (combined >= 0.7) return "B";
        if (combined >= 0.5) return "C";
        if (combined >= 0.35) return "D";
        return "F";
    }

    private generateCacheKey(
        lights: LightFixture[],
        walls: WallSegment[],
        ceilingHeight: number,
        gridSpacing: number,
        roomType: RoomType,
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

        return `${lightsKey}::${wallsKey}::${ceilingHeight}::${gridSpacing}::${roomType}`;
    }

    clearCache(): void {
        this.cachedMetrics = null;
        this.cacheKey = "";
    }
}

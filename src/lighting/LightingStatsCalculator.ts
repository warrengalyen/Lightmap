import type { LightFixture, WallSegment, BoundingBox, LightingMetrics, RoomType, Obstacle } from '../types';
import { ROOM_LIGHTING_STANDARDS } from '../types';
import { LightCalculator } from './LightCalculator';
import { isPointInRoom, isPointInPolygon, calculateRoomArea, calculatePolygonArea, getDistanceToNearestWall } from '../utils/geometry';
import {
  WALL_MARGIN_FT,
  MIN_LUX_PERCENTILE,
  MAX_LUX_PERCENTILE,
  BRIGHTNESS_WEIGHT,
  UNIFORMITY_WEIGHT,
  UNIFORMITY_EXCELLENT_THRESHOLD,
  GRADE_THRESHOLDS,
} from './constants';

export class LightingStatsCalculator {
  private lightCalculator: LightCalculator;
  private cachedMetrics: LightingMetrics | null = null;
  private cacheKey: string = '';

  constructor() {
    this.lightCalculator = new LightCalculator();
  }

  calculateMetrics(
    lights: LightFixture[],
    walls: WallSegment[],
    bounds: BoundingBox,
    ceilingHeight: number,
    gridSpacing: number = 0.5,
    roomType: RoomType = 'living',
    obstacles: Obstacle[] = []
  ): LightingMetrics | null {
    if (lights.length === 0 || walls.length === 0) {
      return null;
    }

    const key = this.generateCacheKey(lights, walls, ceilingHeight, gridSpacing, roomType, obstacles);
    if (key === this.cacheKey && this.cachedMetrics) {
      return this.cachedMetrics;
    }

    const samples = this.sampleLuxValues(lights, walls, bounds, ceilingHeight, gridSpacing, obstacles);
    if (samples.length === 0) {
      return null;
    }

    // Sort samples for percentile calculations
    const sorted = [...samples].sort((a, b) => a - b);
    const n = sorted.length;

    // Use percentiles to exclude outliers
    const minIndex = Math.floor(n * MIN_LUX_PERCENTILE);
    const maxIndex = Math.floor(n * MAX_LUX_PERCENTILE);

    const minLux = sorted[minIndex] ?? sorted[0];
    const maxLux = sorted[maxIndex] ?? sorted[n - 1];
    const avgLux = samples.reduce((sum, v) => sum + v, 0) / n;

    // Uniformity: ratio of 5th percentile to average (more robust than absolute min)
    const uniformityRatio = avgLux > 0 ? minLux / avgLux : 0;

    // Calculate room-based metrics (subtract obstacle footprint areas)
    let roomArea = calculateRoomArea(walls);
    for (const obstacle of obstacles) {
      const obstacleVertices = obstacle.walls.map(w => w.start);
      roomArea -= calculatePolygonArea(obstacleVertices);
    }
    roomArea = Math.max(roomArea, 0);
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

  private sampleLuxValues(
    lights: LightFixture[],
    walls: WallSegment[],
    bounds: BoundingBox,
    ceilingHeight: number,
    gridSpacing: number,
    obstacles: Obstacle[] = []
  ): number[] {
    const samples: number[] = [];

    for (let x = bounds.minX; x <= bounds.maxX; x += gridSpacing) {
      for (let y = bounds.minY; y <= bounds.maxY; y += gridSpacing) {
        const point = { x, y };
        if (isPointInRoom(point, walls) &&
            getDistanceToNearestWall(point, walls) >= WALL_MARGIN_FT &&
            !this.isPointInAnyObstacle(point, obstacles)) {
          const lux = this.lightCalculator.calculateLux(point, lights, ceilingHeight);
          samples.push(lux);
        }
      }
    }

    return samples;
  }

  private isPointInAnyObstacle(point: { x: number; y: number }, obstacles: Obstacle[]): boolean {
    for (const obstacle of obstacles) {
      const vertices = obstacle.walls.map(w => w.start);
      if (isPointInPolygon(point, vertices)) {
        return true;
      }
    }
    return false;
  }

  private calculateGrade(uniformity: number, lumensPerSqFt: number, roomType: RoomType): 'A' | 'B' | 'C' | 'D' | 'F' {
    const standards = ROOM_LIGHTING_STANDARDS[roomType];

    // Brightness score based on lumens per sq ft relative to room type standards
    let brightnessScore: number;
    if (lumensPerSqFt < standards.min * 0.5) {
      brightnessScore = lumensPerSqFt / (standards.min * 0.5) * 0.25; // Very dim
    } else if (lumensPerSqFt < standards.min) {
      brightnessScore = 0.25 + (lumensPerSqFt - standards.min * 0.5) / (standards.min * 0.5) * 0.25; // Below minimum
    } else if (lumensPerSqFt < standards.ideal) {
      brightnessScore = 0.5 + (lumensPerSqFt - standards.min) / (standards.ideal - standards.min) * 0.4; // Good range
    } else if (lumensPerSqFt < standards.ideal * 1.5) {
      brightnessScore = 0.9 + (lumensPerSqFt - standards.ideal) / (standards.ideal * 0.5) * 0.1; // Ideal to bright
    } else {
      brightnessScore = 1.0; // Very bright (no penalty for over-lighting)
    }

    // Uniformity score normalized to excellent threshold
    const uniformityScore = Math.min(1, uniformity / UNIFORMITY_EXCELLENT_THRESHOLD);

    // Weighted combination of brightness and uniformity
    const combined = brightnessScore * BRIGHTNESS_WEIGHT + uniformityScore * UNIFORMITY_WEIGHT;

    if (combined >= GRADE_THRESHOLDS.A) return 'A';
    if (combined >= GRADE_THRESHOLDS.B) return 'B';
    if (combined >= GRADE_THRESHOLDS.C) return 'C';
    if (combined >= GRADE_THRESHOLDS.D) return 'D';
    return 'F';
  }

  private generateCacheKey(
    lights: LightFixture[],
    walls: WallSegment[],
    ceilingHeight: number,
    gridSpacing: number,
    roomType: RoomType,
    obstacles: Obstacle[] = []
  ): string {
    const lightsKey = lights.map(l =>
      `${l.id}:${l.position.x.toFixed(2)},${l.position.y.toFixed(2)}:${l.properties.lumen}:${l.properties.beamAngle}`
    ).join('|');

    const wallsKey = walls.map(w =>
      `${w.start.x.toFixed(2)},${w.start.y.toFixed(2)}-${w.end.x.toFixed(2)},${w.end.y.toFixed(2)}`
    ).join('|');

    const obstaclesKey = obstacles.map(o =>
      `${o.id}:${o.height}:${o.walls.length}`
    ).join('|');

    return `${lightsKey}::${wallsKey}::${ceilingHeight}::${gridSpacing}::${roomType}::${obstaclesKey}`;
  }

}

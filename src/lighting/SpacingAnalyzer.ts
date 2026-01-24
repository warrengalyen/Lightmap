import type { LightFixture, SpacingWarning, SpacingConfig, SpacingSeverity } from '../types';
import { LightCalculator } from './LightCalculator';
import { MIN_SPACING_RATIO, EXTREME_DISTANCE_MULTIPLIER, SEVERITY_THRESHOLDS } from './constants';

export class SpacingAnalyzer {
  private lightCalculator: LightCalculator;

  constructor() {
    this.lightCalculator = new LightCalculator();
  }

  analyzeSpacing(
    lights: LightFixture[],
    ceilingHeight: number,
    config: SpacingConfig
  ): SpacingWarning[] {
    if (lights.length < 2) {
      return [];
    }

    const warnings: SpacingWarning[] = [];

    for (let i = 0; i < lights.length; i++) {
      for (let j = i + 1; j < lights.length; j++) {
        const light1 = lights[i];
        const light2 = lights[j];

        const warning = this.analyzePair(light1, light2, ceilingHeight, config);
        if (warning) {
          warnings.push(warning);
        }
      }
    }

    return warnings;
  }

  private analyzePair(
    light1: LightFixture,
    light2: LightFixture,
    ceilingHeight: number,
    config: SpacingConfig
  ): SpacingWarning | null {
    const dx = light2.position.x - light1.position.x;
    const dy = light2.position.y - light1.position.y;
    const actualDistance = Math.sqrt(dx * dx + dy * dy);

    // Calculate beam radii
    const radius1 = this.lightCalculator.getBeamRadius(light1, ceilingHeight);
    const radius2 = this.lightCalculator.getBeamRadius(light2, ceilingHeight);
    const avgRadius = (radius1 + radius2) / 2;

    // Optimal spacing: lights should overlap by overlapFactor
    // If overlapFactor = 0.7, optimal distance = 2 * avgRadius * 0.7 = 1.4 * avgRadius
    const optimalDistance = 2 * avgRadius * config.overlapFactor;

    // Check for too close (significant overlap)
    const minDistance = optimalDistance * MIN_SPACING_RATIO;
    if (actualDistance < minDistance) {
      return {
        light1Id: light1.id,
        light2Id: light2.id,
        light1Position: { ...light1.position },
        light2Position: { ...light2.position },
        type: 'too_close',
        severity: this.calculateSeverity(actualDistance, minDistance, 'too_close'),
        actualDistance,
        optimalDistance,
      };
    }

    // Check for too far (gap between beams)
    const maxDistance = optimalDistance * (1 + config.gapTolerance);
    if (actualDistance > maxDistance) {
      // Only warn if lights should be working together (within reasonable range)
      const extremeDistance = optimalDistance * EXTREME_DISTANCE_MULTIPLIER;
      if (actualDistance < extremeDistance) {
        return {
          light1Id: light1.id,
          light2Id: light2.id,
          light1Position: { ...light1.position },
          light2Position: { ...light2.position },
          type: 'too_far',
          severity: this.calculateSeverity(actualDistance, maxDistance, 'too_far'),
          actualDistance,
          optimalDistance,
        };
      }
    }

    return null;
  }

  private calculateSeverity(
    actual: number,
    threshold: number,
    type: 'too_close' | 'too_far'
  ): SpacingSeverity {
    const ratio = type === 'too_close' ? threshold / actual : actual / threshold;

    if (ratio > SEVERITY_THRESHOLDS.high) return 'high';
    if (ratio > SEVERITY_THRESHOLDS.medium) return 'medium';
    return 'low';
  }
}

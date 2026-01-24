import type { Vector2, LightFixture } from '../types';
import { smoothstep, degToRad } from '../utils/math';
import { MIN_DISTANCE_FT, BEAM_FALLOFF, MIN_SOLID_ANGLE, MAX_LUX_FOR_COLOR, FEET_TO_METERS } from './constants';

export class LightCalculator {
  calculateLux(point: Vector2, lights: LightFixture[], ceilingHeight: number): number {
    let totalLux = 0;

    for (const light of lights) {
      totalLux += this.calculateSingleLight(point, light, ceilingHeight);
    }

    return totalLux;
  }

  calculateSingleLight(point: Vector2, light: LightFixture, height: number): number {
    const dx = light.position.x - point.x;
    const dy = light.position.y - point.y;

    const horizontalDist = Math.sqrt(dx * dx + dy * dy);
    const dist3D = Math.sqrt(horizontalDist * horizontalDist + height * height);

    if (dist3D < MIN_DISTANCE_FT) {
      return light.properties.lumen / (4 * Math.PI);
    }

    // Angle from vertical (0 = directly below light)
    const angleFromVertical = Math.atan2(horizontalDist, height);
    const halfBeam = degToRad(light.properties.beamAngle / 2);

    // Beam attenuation - soft falloff at beam edge (matches shader)
    const beamAtten = 1 - smoothstep(
      halfBeam * BEAM_FALLOFF.innerEdge,
      halfBeam * BEAM_FALLOFF.outerEdge,
      angleFromVertical
    );

    // Cosine factor for surface illumination (Lambert's cosine law)
    const cosAngle = height / dist3D;

    // Convert lumens to candelas for a directional light (matches shader)
    // For a spotlight: I = lumens / (2 * PI * (1 - cos(halfBeam)))
    const solidAngle = 2 * Math.PI * (1 - Math.cos(halfBeam));
    const candelas = light.properties.lumen / Math.max(solidAngle, MIN_SOLID_ANGLE);

    // Convert distance from feet to meters for lux calculation
    // Illuminance formula requires distance in meters: E = I / d²
    const dist3DMeters = dist3D * FEET_TO_METERS;

    // Illuminance = candelas * cos(angle) / distance^2
    const lux = (candelas * cosAngle) / (dist3DMeters * dist3DMeters);

    return lux * beamAtten;
  }

  getBeamRadius(light: LightFixture, ceilingHeight: number): number {
    const halfBeamRad = degToRad(light.properties.beamAngle / 2);
    return ceilingHeight * Math.tan(halfBeamRad);
  }

  luxToColor(lux: number): { r: number; g: number; b: number } {
    const t = Math.min(1, Math.max(0, lux / MAX_LUX_FOR_COLOR));

    if (t < 0.5) {
      const s = t * 2;
      return {
        r: 0,
        g: s,
        b: 1 - s,
      };
    } else {
      const s = (t - 0.5) * 2;
      return {
        r: s,
        g: 1 - s,
        b: 0,
      };
    }
  }
}

import type { Vector2, LightFixture } from "../types";
import { smoothstep, degToRad } from "../utils/math";

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
        const dz = height;

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance < 0.001) {
            return light.properties.lumen / (4 * Math.PI);
        }

        const horizontalDist = Math.sqrt(dx * dx + dy * dy);
        const angleFromVertical = Math.atan2(horizontalDist, dz);

        const halfBeam = degToRad(light.properties.beamAngle / 2);
        const beamAtten = 1 - smoothstep(halfBeam * 0.8, halfBeam, angleFromVertical);

        const intensity = light.properties.lumen / (4 * Math.PI * distance * distance);

        return intensity * beamAtten;
    }

    getBeamRadius(light: LightFixture, ceilingHeight: number): number {
        const halfBeamRad = degToRad(light.properties.beamAngle / 2);
        return ceilingHeight * Math.tan(halfBeamRad);
    }

    luxToColor(lux: number): { r: number; g: number; b: number } {
        const t = Math.min(1, Math.max(0, lux / 600));

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

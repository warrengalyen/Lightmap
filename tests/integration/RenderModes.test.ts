import { describe, it, expect, beforeEach } from 'vitest';
import { LightCalculator } from '../../src/lighting/LightCalculator';
import type { LightFixture } from '../../src/types';

describe('Render Modes Integration', () => {
  let lightCalculator: LightCalculator;

  beforeEach(() => {
    lightCalculator = new LightCalculator();
  });

  describe('Heatmap Calculations', () => {
    const defaultLight: LightFixture = {
      id: '1',
      position: { x: 10, y: 10 },
      properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
    };

    it('generates heatmap values across room', () => {
      const ceilingHeight = 8;
      const lights = [defaultLight];

      const samples: { pos: { x: number; y: number }; lux: number }[] = [];

      for (let x = 0; x <= 20; x += 5) {
        for (let y = 0; y <= 20; y += 5) {
          const lux = lightCalculator.calculateLux({ x, y }, lights, ceilingHeight);
          samples.push({ pos: { x, y }, lux });
        }
      }

      const center = samples.find((s) => s.pos.x === 10 && s.pos.y === 10);
      const corner = samples.find((s) => s.pos.x === 0 && s.pos.y === 0);

      expect(center).toBeDefined();
      expect(corner).toBeDefined();
      expect(center!.lux).toBeGreaterThan(corner!.lux);
    });

    it('converts lux to color spectrum', () => {
      const lowLux = lightCalculator.luxToColor(50);
      const midLux = lightCalculator.luxToColor(300);
      const highLux = lightCalculator.luxToColor(550);

      expect(lowLux.b).toBeGreaterThan(lowLux.r);
      expect(midLux.g).toBeGreaterThan(0.3);
      expect(highLux.r).toBeGreaterThan(highLux.b);
    });

    it('handles multiple overlapping lights', () => {
      const lights: LightFixture[] = [
        { id: '1', position: { x: 5, y: 10 }, properties: { lumen: 800, beamAngle: 120, warmth: 2700 } },
        { id: '2', position: { x: 15, y: 10 }, properties: { lumen: 800, beamAngle: 120, warmth: 2700 } },
      ];

      // Point equidistant from both lights should have more total light
      const overlap = lightCalculator.calculateLux({ x: 10, y: 10 }, lights, 8);
      // Point near one light
      const single = lightCalculator.calculateLux({ x: 5, y: 10 }, [lights[0]], 8);

      expect(overlap).toBeGreaterThan(single * 0.5);
    });
  });

  describe('Beam Radius Calculations', () => {
    it('calculates beam radius at floor level', () => {
      const light: LightFixture = {
        id: '1',
        position: { x: 0, y: 0 },
        properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
      };

      const radius = lightCalculator.getBeamRadius(light, 8);
      const expected = 8 * Math.tan((60 / 2) * (Math.PI / 180));

      expect(radius).toBeCloseTo(expected, 2);
    });

    it('beam radius scales with ceiling height', () => {
      const light: LightFixture = {
        id: '1',
        position: { x: 0, y: 0 },
        properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
      };

      const radius8ft = lightCalculator.getBeamRadius(light, 8);
      const radius12ft = lightCalculator.getBeamRadius(light, 12);

      expect(radius12ft / radius8ft).toBeCloseTo(12 / 8, 2);
    });
  });

  describe('Light Intensity Distribution', () => {
    it('intensity follows inverse square law', () => {
      const light: LightFixture = {
        id: '1',
        position: { x: 10, y: 10 },
        properties: { lumen: 800, beamAngle: 180, warmth: 2700 },
      };

      const lux1 = lightCalculator.calculateSingleLight({ x: 10, y: 10 }, light, 8);
      const lux2 = lightCalculator.calculateSingleLight({ x: 10, y: 10 }, light, 16);

      expect(lux1 / lux2).toBeCloseTo(4, 0);
    });

    it('beam angle attenuates light at edges', () => {
      const light: LightFixture = {
        id: '1',
        position: { x: 10, y: 10 },
        properties: { lumen: 800, beamAngle: 30, warmth: 2700 },
      };

      const center = lightCalculator.calculateSingleLight({ x: 10, y: 10 }, light, 8);
      const edge = lightCalculator.calculateSingleLight({ x: 12, y: 10 }, light, 8);
      const outside = lightCalculator.calculateSingleLight({ x: 20, y: 10 }, light, 8);

      expect(center).toBeGreaterThan(edge);
      expect(edge).toBeGreaterThan(outside);
    });
  });
});

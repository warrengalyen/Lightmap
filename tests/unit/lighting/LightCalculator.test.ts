import { describe, it, expect, beforeEach } from 'vitest';
import { LightCalculator } from '../../../src/lighting/LightCalculator';
import type { LightFixture } from '../../../src/types';

describe('LightCalculator', () => {
  let calculator: LightCalculator;

  const defaultLight: LightFixture = {
    id: '1',
    position: { x: 5, y: 5 },
    properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
  };

  beforeEach(() => {
    calculator = new LightCalculator();
  });

  describe('calculateLux', () => {
    it('calculates maximum intensity directly below light', () => {
      const lux = calculator.calculateLux({ x: 5, y: 5 }, [defaultLight], 8);
      expect(lux).toBeGreaterThan(0);
    });

    it('returns zero with no lights', () => {
      const lux = calculator.calculateLux({ x: 5, y: 5 }, [], 8);
      expect(lux).toBe(0);
    });
  });

  describe('calculateSingleLight', () => {
    it('applies inverse square falloff', () => {
      const luxClose = calculator.calculateSingleLight(
        { x: 5, y: 6 },
        defaultLight,
        8
      );
      const luxFar = calculator.calculateSingleLight(
        { x: 5, y: 10 },
        defaultLight,
        8
      );
      expect(luxClose).toBeGreaterThan(luxFar);
    });

    it('attenuates outside beam angle', () => {
      const luxInBeam = calculator.calculateSingleLight(
        { x: 5, y: 7 },
        defaultLight,
        8
      );
      const luxOutBeam = calculator.calculateSingleLight(
        { x: 5, y: 15 },
        defaultLight,
        8
      );
      expect(luxInBeam).toBeGreaterThan(luxOutBeam * 2);
    });

    it('returns higher intensity for more lumens', () => {
      const brightLight: LightFixture = {
        ...defaultLight,
        properties: { ...defaultLight.properties, lumen: 1600 },
      };

      const luxDefault = calculator.calculateSingleLight(
        { x: 5, y: 5 },
        defaultLight,
        8
      );
      const luxBright = calculator.calculateSingleLight(
        { x: 5, y: 5 },
        brightLight,
        8
      );

      expect(luxBright).toBeCloseTo(luxDefault * 2, 1);
    });

    it('handles wider beam angles', () => {
      const wideLight: LightFixture = {
        ...defaultLight,
        properties: { ...defaultLight.properties, beamAngle: 120 },
      };

      const luxNarrow = calculator.calculateSingleLight(
        { x: 5, y: 10 },
        defaultLight,
        8
      );
      const luxWide = calculator.calculateSingleLight(
        { x: 5, y: 10 },
        wideLight,
        8
      );

      expect(luxWide).toBeGreaterThan(luxNarrow);
    });

    it('ceiling height affects intensity', () => {
      const luxLow = calculator.calculateSingleLight(
        { x: 5, y: 5 },
        defaultLight,
        8
      );
      const luxHigh = calculator.calculateSingleLight(
        { x: 5, y: 5 },
        defaultLight,
        16
      );

      expect(luxLow).toBeGreaterThan(luxHigh);
    });
  });

  describe('multiple lights', () => {
    it('sums contributions from multiple lights', () => {
      const lights: LightFixture[] = [
        defaultLight,
        { ...defaultLight, id: '2', position: { x: 10, y: 5 } },
      ];

      const luxSingle = calculator.calculateLux({ x: 7.5, y: 5 }, [defaultLight], 8);
      const luxDouble = calculator.calculateLux({ x: 7.5, y: 5 }, lights, 8);

      expect(luxDouble).toBeGreaterThan(luxSingle);
    });

    it('handles overlapping light coverage', () => {
      const lights: LightFixture[] = [
        { ...defaultLight, position: { x: 0, y: 0 } },
        { ...defaultLight, id: '2', position: { x: 2, y: 0 } },
      ];

      const luxCenter = calculator.calculateLux({ x: 1, y: 0 }, lights, 8);
      const luxEdge = calculator.calculateLux({ x: -2, y: 0 }, lights, 8);

      expect(luxCenter).toBeGreaterThan(luxEdge);
    });
  });

  describe('getBeamRadius', () => {
    it('calculates correct beam radius at floor level', () => {
      const radius = calculator.getBeamRadius(defaultLight, 8);
      const expectedRadius = 8 * Math.tan((60 / 2) * (Math.PI / 180));
      expect(radius).toBeCloseTo(expectedRadius, 2);
    });

    it('wider beam angle produces larger radius', () => {
      const wideLight: LightFixture = {
        ...defaultLight,
        properties: { ...defaultLight.properties, beamAngle: 90 },
      };

      const narrowRadius = calculator.getBeamRadius(defaultLight, 8);
      const wideRadius = calculator.getBeamRadius(wideLight, 8);

      expect(wideRadius).toBeGreaterThan(narrowRadius);
    });
  });

  describe('luxToColor', () => {
    it('returns blue for zero lux', () => {
      const color = calculator.luxToColor(0);
      expect(color.b).toBeGreaterThan(color.r);
      expect(color.b).toBeGreaterThan(color.g);
    });

    it('returns green for medium lux', () => {
      const color = calculator.luxToColor(300);
      expect(color.g).toBeGreaterThan(color.b);
    });

    it('returns red for high lux', () => {
      const color = calculator.luxToColor(600);
      expect(color.r).toBeGreaterThan(color.b);
      expect(color.r).toBeGreaterThan(color.g);
    });

    it('clamps values above max', () => {
      const color = calculator.luxToColor(1200);
      expect(color.r).toBe(1);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
    });
  });
});

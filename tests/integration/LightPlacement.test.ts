import { describe, it, expect, beforeEach } from 'vitest';
import { LightManager } from '../../src/lighting/LightManager';
import { LightCalculator } from '../../src/lighting/LightCalculator';
import { PolygonValidator } from '../../src/geometry/PolygonValidator';
import type { WallSegment } from '../../src/types';

describe('Light Placement Integration', () => {
  let lightManager: LightManager;
  let lightCalculator: LightCalculator;
  let validator: PolygonValidator;
  let closedRoom: WallSegment[];

  beforeEach(() => {
    lightManager = new LightManager();
    lightCalculator = new LightCalculator();
    validator = new PolygonValidator();

    closedRoom = [
      { id: '1', start: { x: 0, y: 0 }, end: { x: 20, y: 0 }, length: 20 },
      { id: '2', start: { x: 20, y: 0 }, end: { x: 20, y: 15 }, length: 15 },
      { id: '3', start: { x: 20, y: 15 }, end: { x: 0, y: 15 }, length: 20 },
      { id: '4', start: { x: 0, y: 15 }, end: { x: 0, y: 0 }, length: 15 },
    ];
  });

  it('places light inside room', () => {
    const position = { x: 10, y: 7.5 };
    expect(validator.isPointInside(position, closedRoom)).toBe(true);

    const light = lightManager.addLight(position);

    expect(light).not.toBeNull();
    expect(light.position).toEqual(position);
    expect(lightManager.count).toBe(1);
  });

  it('detects point outside room', () => {
    const outsidePosition = { x: 25, y: 7.5 };
    expect(validator.isPointInside(outsidePosition, closedRoom)).toBe(false);
  });

  it('calculates lux at various positions', () => {
    const light = lightManager.addLight({ x: 10, y: 7.5 });
    const ceilingHeight = 8;

    const luxBelow = lightCalculator.calculateLux(
      { x: 10, y: 7.5 },
      [light],
      ceilingHeight
    );

    const luxNear = lightCalculator.calculateLux(
      { x: 12, y: 7.5 },
      [light],
      ceilingHeight
    );

    const luxFar = lightCalculator.calculateLux(
      { x: 18, y: 7.5 },
      [light],
      ceilingHeight
    );

    expect(luxBelow).toBeGreaterThan(luxNear);
    expect(luxNear).toBeGreaterThan(luxFar);
  });

  it('removes light by ID', () => {
    const light1 = lightManager.addLight({ x: 5, y: 5 });
    const light2 = lightManager.addLight({ x: 15, y: 5 });

    expect(lightManager.count).toBe(2);

    lightManager.removeLight(light1.id);

    expect(lightManager.count).toBe(1);
    expect(lightManager.getLight(light1.id)).toBeNull();
    expect(lightManager.getLight(light2.id)).not.toBeNull();
  });

  it('updates light properties', () => {
    const light = lightManager.addLight({ x: 10, y: 7.5 });

    lightManager.updateLight(light.id, {
      lumen: 1200,
      beamAngle: 45,
    });

    const updated = lightManager.getLight(light.id);
    expect(updated?.properties.lumen).toBe(1200);
    expect(updated?.properties.beamAngle).toBe(45);
    expect(updated?.properties.warmth).toBe(2700);
  });

  it('finds light at position', () => {
    const light1 = lightManager.addLight({ x: 5, y: 5 });
    lightManager.addLight({ x: 15, y: 10 });

    const found = lightManager.getLightAt({ x: 5.2, y: 5.2 }, 0.5);
    expect(found?.id).toBe(light1.id);

    const notFound = lightManager.getLightAt({ x: 10, y: 7.5 }, 0.5);
    expect(notFound).toBeNull();
  });

  it('multiple lights increase total illumination', () => {
    const ceilingHeight = 8;
    const testPoint = { x: 7.5, y: 7.5 };

    const light1 = lightManager.addLight({ x: 5, y: 7.5 }, { beamAngle: 90 });
    const luxSingle = lightCalculator.calculateLux(
      testPoint,
      [light1],
      ceilingHeight
    );

    lightManager.addLight({ x: 10, y: 7.5 }, { beamAngle: 90 });
    const luxDouble = lightCalculator.calculateLux(
      testPoint,
      lightManager.getAllLights(),
      ceilingHeight
    );

    expect(luxDouble).toBeGreaterThan(luxSingle);
  });

  it('beam angle affects coverage area', () => {
    const narrow = lightManager.addLight({ x: 10, y: 7.5 }, { beamAngle: 30 });
    const wide = lightManager.addLight({ x: 10, y: 7.5 }, { beamAngle: 120 });
    const ceilingHeight = 8;

    // Test at a point that's within the wide beam but at the edge of narrow beam
    const edgePoint = { x: 13, y: 7.5 };

    const luxNarrow = lightCalculator.calculateSingleLight(
      edgePoint,
      narrow,
      ceilingHeight
    );
    const luxWide = lightCalculator.calculateSingleLight(
      edgePoint,
      wide,
      ceilingHeight
    );

    expect(luxWide).toBeGreaterThan(luxNarrow);
  });

  it('ceiling height affects intensity', () => {
    const light = lightManager.addLight({ x: 10, y: 7.5 });
    const point = { x: 10, y: 7.5 };

    const luxLow = lightCalculator.calculateLux(point, [light], 8);
    const luxHigh = lightCalculator.calculateLux(point, [light], 12);

    expect(luxLow).toBeGreaterThan(luxHigh);
  });
});

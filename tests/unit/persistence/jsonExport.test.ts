import { describe, it, expect } from 'vitest';
import { getJSONString } from '../../../src/persistence/jsonExport';
import { validateRoomState, ValidationError, importFromString } from '../../../src/persistence/jsonImport';
import type { RoomState } from '../../../src/types';

describe('JSON Export/Import', () => {
  describe('getJSONString', () => {
    it('exports valid JSON structure', () => {
      const state: RoomState = {
        ceilingHeight: 8,
        walls: [],
        lights: [
          {
            id: '1',
            position: { x: 5, y: 5 },
            properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
          },
        ],
        isClosed: true,
      };

      const json = getJSONString(state);
      const parsed = JSON.parse(json);

      expect(parsed.lights[0].properties.lumen).toBe(800);
      expect(parsed.ceilingHeight).toBe(8);
    });

    it('produces formatted output', () => {
      const state: RoomState = {
        ceilingHeight: 8,
        walls: [],
        lights: [],
        isClosed: false,
      };

      const json = getJSONString(state);

      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('validateRoomState', () => {
    it('validates complete room state', () => {
      const data = {
        ceilingHeight: 8,
        walls: [
          { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
        ],
        lights: [
          {
            id: '1',
            position: { x: 5, y: 5 },
            properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
          },
        ],
        isClosed: true,
      };

      const result = validateRoomState(data);

      expect(result.ceilingHeight).toBe(8);
      expect(result.walls).toHaveLength(1);
      expect(result.lights).toHaveLength(1);
    });

    it('rejects invalid ceiling height', () => {
      const data = { ceilingHeight: 'invalid', walls: [], lights: [], isClosed: true };
      expect(() => validateRoomState(data)).toThrow(ValidationError);
    });

    it('rejects negative ceiling height', () => {
      const data = { ceilingHeight: -5, walls: [], lights: [], isClosed: true };
      expect(() => validateRoomState(data)).toThrow(ValidationError);
    });

    it('rejects missing walls array', () => {
      const data = { ceilingHeight: 8, lights: [], isClosed: true };
      expect(() => validateRoomState(data)).toThrow(ValidationError);
    });

    it('rejects missing lights array', () => {
      const data = { ceilingHeight: 8, walls: [], isClosed: true };
      expect(() => validateRoomState(data)).toThrow(ValidationError);
    });

    it('rejects missing isClosed', () => {
      const data = { ceilingHeight: 8, walls: [], lights: [] };
      expect(() => validateRoomState(data)).toThrow(ValidationError);
    });

    it('rejects invalid wall segment', () => {
      const data = {
        ceilingHeight: 8,
        walls: [{ id: 123, start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 }],
        lights: [],
        isClosed: true,
      };
      expect(() => validateRoomState(data)).toThrow(ValidationError);
    });

    it('rejects invalid light fixture', () => {
      const data = {
        ceilingHeight: 8,
        walls: [],
        lights: [
          {
            id: '1',
            position: { x: 5, y: 5 },
            properties: { lumen: -100, beamAngle: 60, warmth: 2700 },
          },
        ],
        isClosed: true,
      };
      expect(() => validateRoomState(data)).toThrow(ValidationError);
    });

    it('rejects beam angle out of range', () => {
      const data = {
        ceilingHeight: 8,
        walls: [],
        lights: [
          {
            id: '1',
            position: { x: 5, y: 5 },
            properties: { lumen: 800, beamAngle: 200, warmth: 2700 },
          },
        ],
        isClosed: true,
      };
      expect(() => validateRoomState(data)).toThrow(ValidationError);
    });

    it('rejects warmth out of range', () => {
      const data = {
        ceilingHeight: 8,
        walls: [],
        lights: [
          {
            id: '1',
            position: { x: 5, y: 5 },
            properties: { lumen: 800, beamAngle: 60, warmth: 500 },
          },
        ],
        isClosed: true,
      };
      expect(() => validateRoomState(data)).toThrow(ValidationError);
    });
  });

  describe('importFromString', () => {
    it('imports valid JSON string', () => {
      const json = JSON.stringify({
        ceilingHeight: 10,
        walls: [],
        lights: [],
        isClosed: false,
      });

      const result = importFromString(json);

      expect(result.ceilingHeight).toBe(10);
    });

    it('throws on invalid JSON', () => {
      expect(() => importFromString('not json')).toThrow(ValidationError);
    });

    it('throws on invalid structure', () => {
      expect(() => importFromString('{"invalid": true}')).toThrow(ValidationError);
    });
  });
});

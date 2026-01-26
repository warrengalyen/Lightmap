import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
} from '../../../src/persistence/localStorage';
import type { RoomState } from '../../../src/types';

describe('LocalStorage Persistence', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockLocalStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key];
      },
      clear: () => {
        Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
      },
    });
  });

  it('saves room state to localStorage', () => {
    const state: RoomState = {
      ceilingHeight: 9,
      walls: [
        {
          id: '1',
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
          length: 10,
        },
      ],
      lights: [],
      doors: [],
      isClosed: false,
    };

    saveToLocalStorage(state);

    const stored = JSON.parse(mockLocalStorage['lightmap_project']);
    expect(stored.ceilingHeight).toBe(9);
    expect(stored.walls).toHaveLength(1);
  });

  it('restores room state from localStorage', () => {
    const state: RoomState = {
      ceilingHeight: 10,
      walls: [],
      lights: [],
      doors: [],
      isClosed: true,
    };
    mockLocalStorage['lightmap_project'] = JSON.stringify(state);

    const restored = loadFromLocalStorage();

    expect(restored).not.toBeNull();
    expect(restored!.ceilingHeight).toBe(10);
    expect(restored!.isClosed).toBe(true);
  });

  it('returns null when no saved state exists', () => {
    const restored = loadFromLocalStorage();
    expect(restored).toBeNull();
  });

  it('clears localStorage', () => {
    mockLocalStorage['lightmap_project'] = JSON.stringify({ test: true });

    clearLocalStorage();

    expect(mockLocalStorage['lightmap_project']).toBeUndefined();
  });

  it('handles JSON parse errors gracefully', () => {
    mockLocalStorage['lightmap_project'] = 'invalid json';

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const restored = loadFromLocalStorage();

    expect(restored).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('preserves all room state properties', () => {
    const state: RoomState = {
      ceilingHeight: 12,
      walls: [
        { id: 'w1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
        { id: 'w2', start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, length: 10 },
      ],
      lights: [
        {
          id: 'l1',
          position: { x: 5, y: 5 },
          properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
        },
      ],
      doors: [],
      isClosed: true,
    };

    saveToLocalStorage(state);
    const restored = loadFromLocalStorage();

    expect(restored).toEqual(state);
  });
});

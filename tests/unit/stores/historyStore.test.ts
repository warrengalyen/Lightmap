import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { historyStore, canUndo, canRedo } from '../../../src/stores/historyStore';
import { roomStore } from '../../../src/stores/roomStore';

describe('historyStore', () => {
  beforeEach(() => {
    // Reset to initial state - set room first, then clear history
    roomStore.set({
      ceilingHeight: 8,
      walls: [],
      lights: [],
      isClosed: false,
    });
    historyStore.clear();
  });

  it('starts with empty history', () => {
    expect(get(canUndo)).toBe(false);
    expect(get(canRedo)).toBe(false);
  });

  it('records state changes', () => {
    // Make a change
    roomStore.update(state => ({ ...state, ceilingHeight: 10 }));

    // Should now be able to undo
    expect(get(canUndo)).toBe(true);
    expect(get(canRedo)).toBe(false);
  });

  it('can undo a state change', () => {
    const initialHeight = get(roomStore).ceilingHeight;

    // Make a change
    roomStore.update(state => ({ ...state, ceilingHeight: 12 }));
    expect(get(roomStore).ceilingHeight).toBe(12);

    // Undo
    const result = historyStore.undo();
    expect(result).toBe(true);
    expect(get(roomStore).ceilingHeight).toBe(initialHeight);
  });

  it('can redo after undo', () => {
    // Make a change
    roomStore.update(state => ({ ...state, ceilingHeight: 15 }));

    // Undo
    historyStore.undo();
    expect(get(canRedo)).toBe(true);

    // Redo
    const result = historyStore.redo();
    expect(result).toBe(true);
    expect(get(roomStore).ceilingHeight).toBe(15);
  });

  it('clears redo history on new action after undo', () => {
    // Make changes
    roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
    roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

    // Undo
    historyStore.undo();
    expect(get(canRedo)).toBe(true);

    // Make new change
    roomStore.update(state => ({ ...state, ceilingHeight: 20 }));

    // Redo should now be unavailable
    expect(get(canRedo)).toBe(false);
  });

  it('returns false when trying to undo with no history', () => {
    const result = historyStore.undo();
    expect(result).toBe(false);
  });

  it('returns false when trying to redo with no future', () => {
    const result = historyStore.redo();
    expect(result).toBe(false);
  });

  it('can clear history', () => {
    // Make changes
    roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
    roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

    expect(get(canUndo)).toBe(true);

    // Clear
    historyStore.clear();

    expect(get(canUndo)).toBe(false);
    expect(get(canRedo)).toBe(false);
  });

  it('handles multiple undos', () => {
    const initialHeight = get(roomStore).ceilingHeight;

    // Make multiple changes
    roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
    roomStore.update(state => ({ ...state, ceilingHeight: 12 }));
    roomStore.update(state => ({ ...state, ceilingHeight: 14 }));

    // Undo all
    historyStore.undo();
    expect(get(roomStore).ceilingHeight).toBe(12);

    historyStore.undo();
    expect(get(roomStore).ceilingHeight).toBe(10);

    historyStore.undo();
    expect(get(roomStore).ceilingHeight).toBe(initialHeight);

    // Can't undo anymore
    expect(get(canUndo)).toBe(false);
  });

  it('handles undo/redo of wall changes', () => {
    // Add walls
    const walls = [
      { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
      { id: '2', start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, length: 10 },
    ];

    roomStore.update(state => ({ ...state, walls, isClosed: false }));
    expect(get(roomStore).walls.length).toBe(2);

    // Undo
    historyStore.undo();
    expect(get(roomStore).walls.length).toBe(0);

    // Redo
    historyStore.redo();
    expect(get(roomStore).walls.length).toBe(2);
  });

  it('handles undo/redo of light changes', () => {
    // Add light
    const light = {
      id: 'light-1',
      position: { x: 5, y: 5 },
      properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
    };

    roomStore.update(state => ({ ...state, lights: [light] }));
    expect(get(roomStore).lights.length).toBe(1);

    // Undo
    historyStore.undo();
    expect(get(roomStore).lights.length).toBe(0);

    // Redo
    historyStore.redo();
    expect(get(roomStore).lights.length).toBe(1);
  });
});

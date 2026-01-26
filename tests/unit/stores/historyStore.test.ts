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
      doors: [],
      isClosed: false,
    });
    historyStore.clear();
  });

  describe('basic functionality', () => {
    it('starts with empty history', () => {
      expect(get(canUndo)).toBe(false);
      expect(get(canRedo)).toBe(false);
    });

    it('records state changes', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));

      expect(get(canUndo)).toBe(true);
      expect(get(canRedo)).toBe(false);
    });

    it('can undo a state change', () => {
      const initialHeight = get(roomStore).ceilingHeight;

      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));
      expect(get(roomStore).ceilingHeight).toBe(12);

      const result = historyStore.undo();
      expect(result).toBe(true);
      expect(get(roomStore).ceilingHeight).toBe(initialHeight);
    });

    it('can redo after undo', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 15 }));

      historyStore.undo();
      expect(get(canRedo)).toBe(true);

      const result = historyStore.redo();
      expect(result).toBe(true);
      expect(get(roomStore).ceilingHeight).toBe(15);
    });

    it('clears redo history on new action after undo', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

      historyStore.undo();
      expect(get(canRedo)).toBe(true);

      roomStore.update(state => ({ ...state, ceilingHeight: 20 }));

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
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

      expect(get(canUndo)).toBe(true);

      historyStore.clear();

      expect(get(canUndo)).toBe(false);
      expect(get(canRedo)).toBe(false);
    });
  });

  describe('multiple operations', () => {
    it('handles multiple undos', () => {
      const initialHeight = get(roomStore).ceilingHeight;

      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 14 }));

      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(12);

      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(10);

      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(initialHeight);

      expect(get(canUndo)).toBe(false);
    });

    it('handles multiple redos', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 14 }));

      // Undo all
      historyStore.undo();
      historyStore.undo();
      historyStore.undo();

      // Redo all
      historyStore.redo();
      expect(get(roomStore).ceilingHeight).toBe(10);

      historyStore.redo();
      expect(get(roomStore).ceilingHeight).toBe(12);

      historyStore.redo();
      expect(get(roomStore).ceilingHeight).toBe(14);

      expect(get(canRedo)).toBe(false);
    });

    it('handles alternating undo/redo', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(10);

      historyStore.redo();
      expect(get(roomStore).ceilingHeight).toBe(12);

      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(10);

      historyStore.redo();
      expect(get(roomStore).ceilingHeight).toBe(12);
    });
  });

  describe('complex state changes', () => {
    it('handles undo/redo of wall changes', () => {
      const walls = [
        { id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 },
        { id: '2', start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, length: 10 },
      ];

      roomStore.update(state => ({ ...state, walls, isClosed: false }));
      expect(get(roomStore).walls.length).toBe(2);

      historyStore.undo();
      expect(get(roomStore).walls.length).toBe(0);

      historyStore.redo();
      expect(get(roomStore).walls.length).toBe(2);
    });

    it('handles undo/redo of light changes', () => {
      const light = {
        id: 'light-1',
        position: { x: 5, y: 5 },
        properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
      };

      roomStore.update(state => ({ ...state, lights: [light] }));
      expect(get(roomStore).lights.length).toBe(1);

      historyStore.undo();
      expect(get(roomStore).lights.length).toBe(0);

      historyStore.redo();
      expect(get(roomStore).lights.length).toBe(1);
    });

    it('handles multiple property changes in one update', () => {
      roomStore.update(state => ({
        ...state,
        ceilingHeight: 10,
        isClosed: true,
      }));

      expect(get(roomStore).ceilingHeight).toBe(10);
      expect(get(roomStore).isClosed).toBe(true);

      historyStore.undo();

      expect(get(roomStore).ceilingHeight).toBe(8);
      expect(get(roomStore).isClosed).toBe(false);
    });
  });

  describe('duplicate state detection', () => {
    it('does not record duplicate states', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      expect(get(canUndo)).toBe(true);

      // Update to the same value - should not create new history entry
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));

      // Should still only need one undo
      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(8);
      expect(get(canUndo)).toBe(false);
    });

    it('detects duplicate complex states', () => {
      const light = {
        id: 'light-1',
        position: { x: 5, y: 5 },
        properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
      };

      roomStore.update(state => ({ ...state, lights: [light] }));

      // Set to identical state
      roomStore.update(state => ({
        ...state,
        lights: [{ ...light }],
      }));

      // Should only have one history entry
      historyStore.undo();
      expect(get(roomStore).lights.length).toBe(0);
      expect(get(canUndo)).toBe(false);
    });
  });

  describe('pause and resume recording', () => {
    it('does not record changes while paused', () => {
      historyStore.pauseRecording();

      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 14 }));

      expect(get(canUndo)).toBe(false);

      historyStore.resumeRecording();

      // After resume, should have one history entry for the entire paused period
      expect(get(canUndo)).toBe(true);

      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(8); // Back to original
      expect(get(canUndo)).toBe(false);
    });

    it('does not record if no changes made during pause', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      historyStore.clear();

      historyStore.pauseRecording();
      // No changes made
      historyStore.resumeRecording();

      expect(get(canUndo)).toBe(false);
    });

    it('handles pause when state returns to original', () => {
      const initialHeight = get(roomStore).ceilingHeight;

      historyStore.pauseRecording();

      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: initialHeight }));

      historyStore.resumeRecording();

      // No net change, so no history should be recorded
      expect(get(canUndo)).toBe(false);
    });

    it('handles multiple pause calls (idempotent)', () => {
      historyStore.pauseRecording();
      historyStore.pauseRecording();
      historyStore.pauseRecording();

      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));

      historyStore.resumeRecording();

      expect(get(canUndo)).toBe(true);
      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(8);
    });

    it('handles multiple resume calls (idempotent)', () => {
      historyStore.pauseRecording();

      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));

      historyStore.resumeRecording();
      historyStore.resumeRecording();
      historyStore.resumeRecording();

      expect(get(canUndo)).toBe(true);
      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(8);
    });

    it('clears pause state when clear() is called', () => {
      historyStore.pauseRecording();
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));

      // Clear while paused
      historyStore.clear();

      // Recording should resume working normally
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

      expect(get(canUndo)).toBe(true);
      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(10);
    });

    it('records changes after pause/resume cycle', () => {
      historyStore.pauseRecording();
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      historyStore.resumeRecording();

      // Make another change after resume
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

      expect(get(canUndo)).toBe(true);
      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(10);

      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(8);
    });

    it('clears future on resume with changes', () => {
      // Create some history
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

      // Undo to create future
      historyStore.undo();
      expect(get(canRedo)).toBe(true);

      // Pause and make changes
      historyStore.pauseRecording();
      roomStore.update(state => ({ ...state, ceilingHeight: 15 }));
      historyStore.resumeRecording();

      // Future should be cleared
      expect(get(canRedo)).toBe(false);
    });
  });

  describe('history limit', () => {
    it('limits history to MAX_HISTORY entries', () => {
      // Make 60 changes (more than MAX_HISTORY of 50)
      for (let i = 1; i <= 60; i++) {
        roomStore.update(state => ({ ...state, ceilingHeight: i }));
      }

      // Count how many undos we can do
      let undoCount = 0;
      while (historyStore.undo()) {
        undoCount++;
      }

      // Should be limited to 50
      expect(undoCount).toBe(50);
    });

    it('preserves most recent states when limit exceeded', () => {
      // Make 55 changes
      for (let i = 1; i <= 55; i++) {
        roomStore.update(state => ({ ...state, ceilingHeight: i }));
      }

      // Current state should be 55
      expect(get(roomStore).ceilingHeight).toBe(55);

      // Undo 50 times
      for (let i = 0; i < 50; i++) {
        historyStore.undo();
      }

      // Should be at state 5 (oldest preserved state: 6 would give us 5 after undo)
      // Initial + 55 changes, keep last 50, so oldest is 6 (5 dropped: initial, 1, 2, 3, 4, 5)
      // After 50 undos from 55, we should be at 5
      expect(get(roomStore).ceilingHeight).toBe(5);
    });
  });

  describe('canUndo and canRedo functions', () => {
    it('canUndo() returns correct value', () => {
      expect(historyStore.canUndo()).toBe(false);

      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      expect(historyStore.canUndo()).toBe(true);

      historyStore.undo();
      expect(historyStore.canUndo()).toBe(false);
    });

    it('canRedo() returns correct value', () => {
      expect(historyStore.canRedo()).toBe(false);

      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      expect(historyStore.canRedo()).toBe(false);

      historyStore.undo();
      expect(historyStore.canRedo()).toBe(true);

      historyStore.redo();
      expect(historyStore.canRedo()).toBe(false);
    });

    it('derived stores stay in sync with functions', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));

      expect(get(canUndo)).toBe(historyStore.canUndo());
      expect(get(canRedo)).toBe(historyStore.canRedo());

      historyStore.undo();

      expect(get(canUndo)).toBe(historyStore.canUndo());
      expect(get(canRedo)).toBe(historyStore.canRedo());
    });
  });

  describe('edge cases', () => {
    it('handles undo immediately after clear', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      historyStore.clear();

      const result = historyStore.undo();
      expect(result).toBe(false);
    });

    it('handles rapid state changes', () => {
      // Simulate rapid changes like during typing
      // Start from i=1 to avoid duplicate with initial state (ceilingHeight=8)
      for (let i = 1; i <= 10; i++) {
        roomStore.update(state => ({ ...state, ceilingHeight: 8 + i * 0.1 }));
      }

      expect(get(canUndo)).toBe(true);

      // Should be able to undo each change
      let count = 0;
      while (historyStore.undo()) {
        count++;
      }
      expect(count).toBe(10);
    });

    it('maintains state integrity after undo/redo cycle', () => {
      const originalState = get(roomStore);

      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

      historyStore.undo();
      historyStore.undo();
      historyStore.redo();
      historyStore.redo();
      historyStore.undo();
      historyStore.undo();

      expect(get(roomStore)).toEqual(originalState);
    });

    it('handles setting same state object reference', () => {
      const currentState = get(roomStore);

      // Set the exact same state
      roomStore.set(currentState);

      // Should not create history entry
      expect(get(canUndo)).toBe(false);
    });

    it('handles nested object changes', () => {
      const light = {
        id: 'light-1',
        position: { x: 5, y: 5 },
        properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
      };

      roomStore.update(state => ({ ...state, lights: [light] }));

      // Change nested property
      roomStore.update(state => ({
        ...state,
        lights: state.lights.map(l => ({
          ...l,
          position: { ...l.position, x: 10 },
        })),
      }));

      expect(get(roomStore).lights[0].position.x).toBe(10);

      historyStore.undo();
      expect(get(roomStore).lights[0].position.x).toBe(5);

      historyStore.undo();
      expect(get(roomStore).lights.length).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('simulates drag operation with pause/resume', () => {
      // Initial state
      const light = {
        id: 'light-1',
        position: { x: 5, y: 5 },
        properties: { lumen: 800, beamAngle: 60, warmth: 2700 },
      };
      roomStore.update(state => ({ ...state, lights: [light] }));
      historyStore.clear();

      // Start drag - pause recording
      historyStore.pauseRecording();

      // Simulate many intermediate positions during drag
      for (let i = 0; i < 50; i++) {
        roomStore.update(state => ({
          ...state,
          lights: state.lights.map(l => ({
            ...l,
            position: { x: 5 + i * 0.1, y: 5 + i * 0.1 },
          })),
        }));
      }

      // End drag - resume recording
      historyStore.resumeRecording();

      // Should only have ONE undo entry for the entire drag
      expect(get(canUndo)).toBe(true);

      historyStore.undo();
      expect(get(roomStore).lights[0].position.x).toBe(5);
      expect(get(roomStore).lights[0].position.y).toBe(5);

      expect(get(canUndo)).toBe(false);
    });

    it('simulates drawing walls with undo', () => {
      // Draw first wall
      roomStore.update(state => ({
        ...state,
        walls: [{ id: '1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, length: 10 }],
      }));

      // Draw second wall
      roomStore.update(state => ({
        ...state,
        walls: [
          ...state.walls,
          { id: '2', start: { x: 10, y: 0 }, end: { x: 10, y: 10 }, length: 10 },
        ],
      }));

      // Draw third wall
      roomStore.update(state => ({
        ...state,
        walls: [
          ...state.walls,
          { id: '3', start: { x: 10, y: 10 }, end: { x: 0, y: 10 }, length: 10 },
        ],
      }));

      expect(get(roomStore).walls.length).toBe(3);

      // Undo last wall
      historyStore.undo();
      expect(get(roomStore).walls.length).toBe(2);

      // Redo it
      historyStore.redo();
      expect(get(roomStore).walls.length).toBe(3);

      // Undo two walls
      historyStore.undo();
      historyStore.undo();
      expect(get(roomStore).walls.length).toBe(1);
    });

    it('handles clear followed by new changes', () => {
      roomStore.update(state => ({ ...state, ceilingHeight: 10 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 12 }));

      historyStore.clear();

      // Make new changes
      roomStore.update(state => ({ ...state, ceilingHeight: 14 }));
      roomStore.update(state => ({ ...state, ceilingHeight: 16 }));

      // Should have history for new changes only
      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(14);

      historyStore.undo();
      expect(get(roomStore).ceilingHeight).toBe(12);

      // Cannot undo further
      expect(get(canUndo)).toBe(false);
    });
  });
});

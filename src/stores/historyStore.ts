import { writable, get } from 'svelte/store';
import type { RoomState } from '../types';
import { roomStore } from '../stores/roomStore';

interface HistoryState {
  past: RoomState[];
  future: RoomState[];
}

const MAX_HISTORY = 50;

function createHistoryStore() {
  const { subscribe, set, update } = writable<HistoryState>({
    past: [],
    future: [],
  });

  let isPerformingHistoryOperation = false;
  let isRecordingPaused = false;
  let lastSavedState: RoomState | null = null;
  let stateBeforePause: RoomState | null = null;

  // Subscribe to room store changes to record history
  roomStore.subscribe((state) => {
    if (isPerformingHistoryOperation || isRecordingPaused) return;

    // Don't record if state hasn't meaningfully changed
    if (lastSavedState && JSON.stringify(state) === JSON.stringify(lastSavedState)) {
      return;
    }

    if (lastSavedState !== null) {
      update((history) => {
        const newPast = [...history.past, lastSavedState!];
        // Limit history size
        if (newPast.length > MAX_HISTORY) {
          newPast.shift();
        }
        return {
          past: newPast,
          future: [], // Clear future on new action
        };
      });
    }

    lastSavedState = structuredClone(state);
  });

  return {
    subscribe,

    undo: () => {
      const history = get({ subscribe });
      if (history.past.length === 0) return false;

      isPerformingHistoryOperation = true;

      const currentState = get(roomStore);
      const previousState = history.past[history.past.length - 1];

      update((h) => ({
        past: h.past.slice(0, -1),
        future: [currentState, ...h.future],
      }));

      roomStore.set(previousState);
      lastSavedState = structuredClone(previousState);

      isPerformingHistoryOperation = false;
      return true;
    },

    redo: () => {
      const history = get({ subscribe });
      if (history.future.length === 0) return false;

      isPerformingHistoryOperation = true;

      const currentState = get(roomStore);
      const nextState = history.future[0];

      update((h) => ({
        past: [...h.past, currentState],
        future: h.future.slice(1),
      }));

      roomStore.set(nextState);
      lastSavedState = structuredClone(nextState);

      isPerformingHistoryOperation = false;
      return true;
    },

    clear: () => {
      set({ past: [], future: [] });
      lastSavedState = structuredClone(get(roomStore));
      // Reset pause state to prevent stale state from affecting future recordings
      isRecordingPaused = false;
      stateBeforePause = null;
    },

    canUndo: () => {
      const history = get({ subscribe });
      return history.past.length > 0;
    },

    canRedo: () => {
      const history = get({ subscribe });
      return history.future.length > 0;
    },

    pauseRecording: () => {
      if (!isRecordingPaused) {
        isRecordingPaused = true;
        stateBeforePause = structuredClone(get(roomStore));
      }
    },

    resumeRecording: () => {
      if (isRecordingPaused) {
        isRecordingPaused = false;
        const currentState = get(roomStore);

        // Only record if the state actually changed during the pause
        if (stateBeforePause && JSON.stringify(currentState) !== JSON.stringify(stateBeforePause)) {
          update((history) => {
            const newPast = [...history.past, stateBeforePause!];
            if (newPast.length > MAX_HISTORY) {
              newPast.shift();
            }
            return {
              past: newPast,
              future: [], // Clear future on new action
            };
          });
          lastSavedState = structuredClone(currentState);
        }

        stateBeforePause = null;
      }
    },
  };
}

export const historyStore = createHistoryStore();

// Derived stores for UI bindings
export const canUndo = writable(false);
export const canRedo = writable(false);

// Update derived stores when history changes
historyStore.subscribe((history) => {
  canUndo.set(history.past.length > 0);
  canRedo.set(history.future.length > 0);
});

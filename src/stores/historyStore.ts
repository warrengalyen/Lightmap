import { writable, get } from "svelte/store";
import type { RoomState } from "../types";
import { roomStore } from "../stores/roomStore";

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

    let isUndoingOrRedoing = false;
    let lastSavedState: RoomState | null = null;

    // Subscribe to room store changes to record history
    roomStore.subscribe((state) => {
        if (isUndoingOrRedoing) return;

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

        lastSavedState = JSON.parse(JSON.stringify(state));
    });

    return {
        subscribe,

        undo: () => {
            const history = get({ subscribe });
            if (history.past.length === 0) return false;

            isUndoingOrRedoing = true;

            const currentState = get(roomStore);
            const previousState = history.past[history.past.length - 1];

            update((h) => ({
                past: h.past.slice(0, -1),
                future: [currentState, ...h.future],
            }));

            roomStore.set(previousState);
            lastSavedState = JSON.parse(JSON.stringify(previousState));

            isUndoingOrRedoing = false;
            return true;
        },

        redo: () => {
            const history = get({ subscribe });
            if (history.future.length === 0) return false;

            isUndoingOrRedoing = true;

            const currentState = get(roomStore);
            const nextState = history.future[0];

            update((h) => ({
                past: [...h.past, currentState],
                future: h.future.slice(1),
            }));

            roomStore.set(nextState);
            lastSavedState = JSON.parse(JSON.stringify(nextState));

            isUndoingOrRedoing = false;
            return true;
        },

        clear: () => {
            set({ past: [], future: [] });
            lastSavedState = JSON.parse(JSON.stringify(get(roomStore)));
        },

        canUndo: () => {
            const history = get({ subscribe });
            return history.past.length > 0;
        },

        canRedo: () => {
            const history = get({ subscribe });
            return history.future.length > 0;
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

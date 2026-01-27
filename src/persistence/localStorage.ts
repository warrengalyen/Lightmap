import type { Writable } from 'svelte/store';
import type { RoomState } from '../types';

const STORAGE_KEY = 'lightmap_project';
const AUTOSAVE_INTERVAL = 30000;

export function saveToLocalStorage(state: RoomState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

export function loadFromLocalStorage(): RoomState | null {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return null;
        const state = JSON.parse(data) as RoomState;
        // Migration: add doors array if missing (for backwards compatibility)
        if (!state.doors) {
            state.doors = [];
        }
        // Migration: add swingSide to doors if missing
        for (const door of state.doors) {
            if (!door.swingSide) {
                door.swingSide = 'inside';
            }
        }
        // Migration: add obstacles array if missing
        if (!state.obstacles) {
            state.obstacles = [];
        }
        return state;
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
        return null;
    }
}

export function clearLocalStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export function setupAutoSave(store: Writable<RoomState>): () => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastState: RoomState | null = null;

    const unsubscribe = store.subscribe((state) => {
        if (lastState && JSON.stringify(state) === JSON.stringify(lastState)) {
            return;
        }

        lastState = state;

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            saveToLocalStorage(state);
        }, AUTOSAVE_INTERVAL);
    });

    return () => {
        unsubscribe();
        if (timeout) {
            clearTimeout(timeout);
        }
    };
}

export function saveNow(state: RoomState): void {
    saveToLocalStorage(state);
}

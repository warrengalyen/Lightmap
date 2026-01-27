import { writable } from 'svelte/store';
import type { LightFixture } from '../types';

/**
 * Store for managing viewer mode state, including selected light for info panel
 */
export const selectedViewerLight = writable<LightFixture | null>(null);

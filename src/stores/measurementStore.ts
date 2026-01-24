import { writable } from 'svelte/store';

export const isMeasuring = writable<boolean>(false);

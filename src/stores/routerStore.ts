import { derived, writable } from 'svelte/store';

export type Route = 'editor' | 'viewer';

function getRouteFromHash(): Route {
    const raw = window.location.hash.replace(/^#\/?/, '');
    if (raw === 'viewer') return 'viewer';
    return 'editor';
}

const routeStore = writable<Route>(getRouteFromHash());

window.addEventListener('hashchange', () => {
    routeStore.set(getRouteFromHash());
});

export const currentRoute = derived(routeStore, ($r) => $r);

export function navigate(route: Route): void {
    window.location.hash = route === 'editor' ? '/' : `/${route}`;
}

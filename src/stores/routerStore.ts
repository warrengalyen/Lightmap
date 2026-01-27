import { derived, writable } from 'svelte/store';

export type Route = 'editor' | 'viewer';

function parseHash(): { route: Route; params: Record<string, string> } {
    const hash = window.location.hash.replace(/^#\/?/, '');

    // Split route from query string: "viewer?d=abc" → ["viewer", "d=abc"]
    const questionIndex = hash.indexOf('?');
    const routePart = questionIndex >= 0 ? hash.substring(0, questionIndex) : hash;
    const queryPart = questionIndex >= 0 ? hash.substring(questionIndex + 1) : '';

    const route: Route = routePart === 'viewer' ? 'viewer' : 'editor';

    // Parse query params manually (URLSearchParams converts + to space, breaking lz-string)
    const params: Record<string, string> = {};
    if (queryPart) {
        for (const pair of queryPart.split('&')) {
            const eqIndex = pair.indexOf('=');
            if (eqIndex >= 0) {
                params[pair.substring(0, eqIndex)] = pair.substring(eqIndex + 1);
            }
        }
    }

    return { route, params };
}

const hashState = writable(parseHash());

window.addEventListener('hashchange', () => {
    hashState.set(parseHash());
});

export const currentRoute = derived(hashState, ($s) => $s.route);

export const routeParams = derived(hashState, ($s) => $s.params);

export function navigate(route: Route, params?: Record<string, string>): void {
    let hash = route === 'editor' ? '/' : `/${route}`;
    if (params) {
        const queryParts = Object.entries(params).map(([k, v]) => `${k}=${v}`);
        if (queryParts.length > 0) {
            hash += '?' + queryParts.join('&');
        }
    }
    window.location.hash = hash;
}

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { get } from 'svelte/store';
import type { RoomState } from '../types';
import { lightDefinitions } from '../stores/lightDefinitionsStore';
import { importFromString } from './jsonImport';

export interface ShareResult {
    url: string;
    length: number;
    warning?: string;
}

function createSharePayload(state: RoomState): object {
    // Strip fields that aren't needed for viewing
    const stripped: Record<string, unknown> = {
        ceilingHeight: state.ceilingHeight,
        walls: state.walls,
        lights: state.lights,
        isClosed: state.isClosed,
    };

    // Only include doors/obstacles if non-empty
    if (state.doors.length > 0) {
        stripped.doors = state.doors;
    }
    if (state.obstacles.length > 0) {
        stripped.obstacles = state.obstacles;
    }

    // Check if any custom light definitions are in use
    const allDefinitions = get(lightDefinitions);
    const usedDefinitionIds = new Set(
        state.lights
            .map((light) => light.definitionId)
            .filter((id): id is string => id !== undefined && id.startsWith('custom-'))
    );
    const usedCustomDefinitions = allDefinitions.filter((def) => usedDefinitionIds.has(def.id));

    // Wrap in versioned format only if custom definitions are used
    if (usedCustomDefinitions.length > 0) {
        return {
            version: 2,
            roomState: stripped,
            lightDefinitions: usedCustomDefinitions,
        };
    }

    // Raw RoomState — processImportData handles both formats
    return stripped;
}

export function generateShareUrl(state: RoomState): ShareResult {
    const payload = createSharePayload(state);
    const json = JSON.stringify(payload);
    const compressed = compressToEncodedURIComponent(json);

    const base = `${window.location.origin}${window.location.pathname}`;
    const url = `${base}#/viewer?d=${compressed}`;

    const length = url.length;
    let warning: string | undefined;

    if (length > 8000) {
        warning =
            'This URL is very long and may not work in all browsers. Consider exporting as a JSON file instead.';
    } else if (length > 2000) {
        warning = 'This URL is long. Some platforms may truncate it when sharing.';
    }

    return { url, length, warning };
}

export function decodeShareData(compressed: string): RoomState {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) {
        throw new Error('Failed to decompress shared data. The URL may be corrupted.');
    }
    return importFromString(json);
}

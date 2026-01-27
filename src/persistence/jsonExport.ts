import { get } from 'svelte/store';
import type { RoomState, LightDefinition } from '../types';
import { lightDefinitions } from '../stores/lightDefinitionsStore';

export interface ExportData {
    version: 1 | 2;
    roomState: RoomState;
    lightDefinitions: LightDefinition[];
}

export function exportToJSON(state: RoomState): void {
    const exportData = createExportData(state);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `lightmap-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function getJSONString(state: RoomState): string {
    const exportData = createExportData(state);
    return JSON.stringify(exportData, null, 2);
}

function createExportData(state: RoomState): ExportData {
    // Get all current light definitions
    const allDefinitions = get(lightDefinitions);

    // Find which custom definitions are actually used by lights in this room
    const usedDefinitionIds = new Set(
        state.lights
            .map((light) => light.definitionId)
            .filter((id): id is string => id !== undefined && id.startsWith('custom-'))
    );

    // Only include custom definitions that are used
    const usedCustomDefinitions = allDefinitions.filter((def) => usedDefinitionIds.has(def.id));

    return {
        version: 2,
        roomState: state,
        lightDefinitions: usedCustomDefinitions,
    };
}

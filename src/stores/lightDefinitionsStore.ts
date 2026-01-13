import { writable, derived, get } from "svelte/store";
import type { LightDefinition, LightProperties } from "../types";
import { DEFAULT_LIGHT_DEFINITIONS } from "../types";

export const lightDefinitions = writable<LightDefinition[]>([...DEFAULT_LIGHT_DEFINITIONS]);

export const selectedDefinitionId = writable<string>(DEFAULT_LIGHT_DEFINITIONS[0].id);

export const selectedDefinition = derived([lightDefinitions, selectedDefinitionId], ([$definitions, $selectedId]) => {
    return $definitions.find((d) => d.id === $selectedId) ?? $definitions[0];
});

export function getDefinitionById(id: string): LightDefinition | undefined {
    return get(lightDefinitions).find((d) => d.id === id);
}

export function getPropertiesForLight(definitionId: string, fallbackProperties: LightProperties): LightProperties {
    const definition = getDefinitionById(definitionId);
    if (definition) {
        return {
            lumen: definition.lumen,
            beamAngle: definition.beamAngle,
            warmth: definition.warmth,
        };
    }
    return fallbackProperties;
}

export function addLightDefinition(definition: Omit<LightDefinition, "id">): LightDefinition {
    const newDef: LightDefinition = {
        ...definition,
        id: `custom-${Date.now()}`,
    };
    lightDefinitions.update((defs) => [...defs, newDef]);
    return newDef;
}

export function updateLightDefinition(id: string, updates: Partial<Omit<LightDefinition, "id">>): void {
    lightDefinitions.update((defs) => defs.map((d) => (d.id === id ? { ...d, ...updates } : d)));
}

export function deleteLightDefinition(id: string): void {
    // Don't allow deleting if it's the last one
    const defs = get(lightDefinitions);
    if (defs.length <= 1) return;

    // Don't allow deleting built-in definitions
    if (!id.startsWith("custom-")) return;

    lightDefinitions.update((defs) => defs.filter((d) => d.id !== id));

    // If the deleted definition was selected, select the first one
    if (get(selectedDefinitionId) === id) {
        selectedDefinitionId.set(get(lightDefinitions)[0].id);
    }
}

export function setSelectedDefinition(id: string): void {
    selectedDefinitionId.set(id);
}

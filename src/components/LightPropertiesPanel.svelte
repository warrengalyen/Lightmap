<script lang="ts">
    import { roomStore } from '../stores/roomStore';
    import { selectedLightIds, clearLightSelection } from '../stores/appStore';
    import { lightDefinitions, getDefinitionById } from '../stores/lightDefinitionsStore';
    import FloatingPanel from './FloatingPanel.svelte';
    import type { LightFixture, RoomState, LightDefinition } from '../types';

    let currentRoom: RoomState;
    let currentSelectedLightIds: Set<string> = new Set();
    let selectedLights: LightFixture[] = [];
    let definitions: LightDefinition[] = [];

    $: currentRoom = $roomStore;
    $: currentSelectedLightIds = $selectedLightIds;
    $: definitions = $lightDefinitions;
    $: selectedLights = currentRoom.lights.filter((l) => currentSelectedLightIds.has(l.id));
    $: visible = selectedLights.length > 0;

    // Check if all selected lights share the same definition
    $: commonDefinitionId = (() => {
        if (selectedLights.length === 0) return null;
        const firstDefId = selectedLights[0].definitionId;
        const allSame = selectedLights.every((l) => l.definitionId === firstDefId);
        return allSame ? firstDefId : null;
    })();

    function updateLightDefinition(e: Event): void {
        const newDefinitionId = (e.target as HTMLSelectElement).value;
        const definition = getDefinitionById(newDefinitionId);
        if (!definition) return;

        roomStore.update((state) => ({
            ...state,
            lights: state.lights.map((light) => {
                if (currentSelectedLightIds.has(light.id)) {
                    return {
                        ...light,
                        definitionId: newDefinitionId,
                        properties: {
                            lumen: definition.lumen,
                            beamAngle: definition.beamAngle,
                            warmth: definition.warmth,
                        },
                    };
                }
                return light;
            }),
        }));
    }

    function deleteSelectedLights(): void {
        if (currentSelectedLightIds.size === 0) return;

        roomStore.update((state) => ({
            ...state,
            lights: state.lights.filter((l) => !currentSelectedLightIds.has(l.id)),
        }));
        clearLightSelection();
    }

    function handleClose(): void {
        clearLightSelection();
    }
</script>

<FloatingPanel
    {visible}
    title={selectedLights.length > 1 ? `${selectedLights.length} Lights` : 'Light Properties'}
    defaultX={window.innerWidth - 530}
    defaultY={16}
    minWidth="250px"
    maxWidth="320px"
    maxHeight="calc(100vh - 200px)"
    persistenceKey="light-properties-panel"
    showCloseButton={true}
    onClose={handleClose}
>
    {#if selectedLights.length > 1}
        <div class="panel-section">
            <p class="multi-select-hint">Shift+click to add/remove lights from selection</p>
            <label class="definition-select">
                <span>{commonDefinitionId ? 'Type' : 'Change All To'}</span>
                <select
                    class="panel-select"
                    value={commonDefinitionId || ''}
                    on:change={updateLightDefinition}
                >
                    {#if !commonDefinitionId}
                        <option value="" disabled>Mixed types...</option>
                    {/if}
                    {#each definitions as def (def.id)}
                        <option value={def.id}>{def.name}</option>
                    {/each}
                </select>
            </label>
            {#if commonDefinitionId}
                {@const def = getDefinitionById(commonDefinitionId)}
                {#if def}
                    <div class="panel-info-box">
                        <div class="panel-info-row">
                            <span>Lumens (each)</span>
                            <span>{def.lumen} lm</span>
                        </div>
                        <div class="panel-info-row">
                            <span>Beam Angle</span>
                            <span>{def.beamAngle}°</span>
                        </div>
                        <div class="panel-info-row">
                            <span>Color Temp</span>
                            <span>{def.warmth}K</span>
                        </div>
                    </div>
                {/if}
            {/if}
            <div class="light-summary">
                <div class="summary-row">
                    <span>Total Lumens</span>
                    <span
                        >{selectedLights
                            .reduce((sum, l) => sum + l.properties.lumen, 0)
                            .toLocaleString()} lm</span
                    >
                </div>
            </div>
            <button class="panel-delete-btn" on:click={deleteSelectedLights}>
                Delete {selectedLights.length} Lights
            </button>
        </div>
    {:else if selectedLights.length === 1}
        {@const light = selectedLights[0]}
        <div class="panel-section">
            <p class="multi-select-hint">Shift+click to select multiple lights</p>
            <label class="definition-select">
                <span>Type</span>
                <select
                    class="panel-select"
                    value={light.definitionId || definitions[0]?.id}
                    on:change={updateLightDefinition}
                >
                    {#each definitions as def (def.id)}
                        <option value={def.id}>{def.name}</option>
                    {/each}
                </select>
            </label>
            <div class="panel-info-box">
                <div class="panel-info-row">
                    <span>Lumens</span>
                    <span>{light.properties.lumen} lm</span>
                </div>
                <div class="panel-info-row">
                    <span>Beam Angle</span>
                    <span>{light.properties.beamAngle}°</span>
                </div>
                <div class="panel-info-row">
                    <span>Color Temp</span>
                    <span>{light.properties.warmth}K</span>
                </div>
            </div>
            <div class="panel-row">
                <span>Position</span>
                <span class="panel-coords">
                    ({light.position.x.toFixed(1)}, {light.position.y.toFixed(1)})
                </span>
            </div>
            <button class="panel-delete-btn" on:click={deleteSelectedLights}> Delete Light </button>
        </div>
    {/if}
</FloatingPanel>

<style>
    /* Component-specific styles only - shared styles in App.svelte */
    .definition-select {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        margin-bottom: 8px;
    }

    .definition-select span {
        font-size: 12px;
        color: var(--text-muted);
    }

    .multi-select-hint {
        font-size: 11px;
        color: var(--text-muted);
        margin: 0 0 12px 0;
        font-style: italic;
    }

    .light-summary {
        background: var(--input-bg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 8px 12px;
        margin: 8px 0;
    }

    .summary-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
    }

    .summary-row span:first-child {
        color: var(--text-muted);
    }

    .summary-row span:last-child {
        font-weight: 600;
        color: var(--button-active);
    }
</style>

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
  $: selectedLights = currentRoom.lights.filter(l => currentSelectedLightIds.has(l.id));
  $: visible = selectedLights.length > 0;

  // Check if all selected lights share the same definition
  $: commonDefinitionId = (() => {
    if (selectedLights.length === 0) return null;
    const firstDefId = selectedLights[0].definitionId;
    const allSame = selectedLights.every(l => l.definitionId === firstDefId);
    return allSame ? firstDefId : null;
  })();

  function updateLightDefinition(e: Event): void {
    const newDefinitionId = (e.target as HTMLSelectElement).value;
    const definition = getDefinitionById(newDefinitionId);
    if (!definition) return;

    roomStore.update(state => ({
      ...state,
      lights: state.lights.map(light => {
        if (currentSelectedLightIds.has(light.id)) {
          return {
            ...light,
            definitionId: newDefinitionId,
            properties: {
              lumen: definition.lumen,
              beamAngle: definition.beamAngle,
              warmth: definition.warmth,
            }
          };
        }
        return light;
      })
    }));
  }

  function deleteSelectedLights(): void {
    if (currentSelectedLightIds.size === 0) return;

    roomStore.update(state => ({
      ...state,
      lights: state.lights.filter(l => !currentSelectedLightIds.has(l.id))
    }));
    clearLightSelection();
  }

  function handleClose(): void {
    clearLightSelection();
  }
</script>

<FloatingPanel
  visible={visible}
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
    <div class="property-section">
      <p class="multi-select-hint">Shift+click to add/remove lights from selection</p>
      <label class="property-row definition-select">
        <span>{commonDefinitionId ? 'Type' : 'Change All To'}</span>
        <select value={commonDefinitionId || ''} on:change={updateLightDefinition}>
          {#if !commonDefinitionId}
            <option value="" disabled>Mixed types...</option>
          {/if}
          {#each definitions as def}
            <option value={def.id}>{def.name}</option>
          {/each}
        </select>
      </label>
      {#if commonDefinitionId}
        {@const def = getDefinitionById(commonDefinitionId)}
        {#if def}
          <div class="light-specs">
            <div class="spec-row">
              <span>Lumens (each)</span>
              <span>{def.lumen} lm</span>
            </div>
            <div class="spec-row">
              <span>Beam Angle</span>
              <span>{def.beamAngle}°</span>
            </div>
            <div class="spec-row">
              <span>Color Temp</span>
              <span>{def.warmth}K</span>
            </div>
          </div>
        {/if}
      {/if}
      <div class="light-summary">
        <div class="summary-row">
          <span>Total Lumens</span>
          <span>{selectedLights.reduce((sum, l) => sum + l.properties.lumen, 0).toLocaleString()} lm</span>
        </div>
      </div>
      <button class="delete-button" on:click={deleteSelectedLights}>
        Delete {selectedLights.length} Lights
      </button>
    </div>
  {:else if selectedLights.length === 1}
    {@const light = selectedLights[0]}
    <div class="property-section">
      <p class="multi-select-hint">Shift+click to select multiple lights</p>
      <label class="property-row definition-select">
        <span>Type</span>
        <select
          value={light.definitionId || definitions[0]?.id}
          on:change={updateLightDefinition}
        >
          {#each definitions as def}
            <option value={def.id}>{def.name}</option>
          {/each}
        </select>
      </label>
      <div class="light-specs">
        <div class="spec-row">
          <span>Lumens</span>
          <span>{light.properties.lumen} lm</span>
        </div>
        <div class="spec-row">
          <span>Beam Angle</span>
          <span>{light.properties.beamAngle}°</span>
        </div>
        <div class="spec-row">
          <span>Color Temp</span>
          <span>{light.properties.warmth}K</span>
        </div>
      </div>
      <div class="property-row">
        <span>Position</span>
        <span class="coords">
          ({light.position.x.toFixed(1)}, {light.position.y.toFixed(1)})
        </span>
      </div>
      <button class="delete-button" on:click={deleteSelectedLights}>
        Delete Light
      </button>
    </div>
  {/if}
</FloatingPanel>

<style>
  .property-section {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .property-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .property-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
  }

  .property-row span:first-child {
    color: var(--text-muted);
  }

  .coords {
    font-family: monospace;
    font-size: 12px;
  }

  .definition-select {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .definition-select span {
    font-size: 12px;
    color: var(--text-muted);
  }

  .definition-select select {
    padding: 8px;
    background: var(--input-bg);
    color: var(--text-secondary);
    border: 1px solid var(--input-border);
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .definition-select select:focus {
    outline: none;
    border-color: var(--button-active);
  }

  .light-specs {
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 8px 12px;
    margin: 8px 0;
  }

  .spec-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 2px 0;
  }

  .spec-row span:first-child {
    color: var(--text-muted);
  }

  .spec-row span:last-child {
    font-weight: 500;
    color: var(--text-primary);
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

  .delete-button {
    width: 100%;
    padding: 8px;
    margin-top: 12px;
    background: var(--status-error);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .delete-button:hover {
    background: #dc2626;
  }
</style>

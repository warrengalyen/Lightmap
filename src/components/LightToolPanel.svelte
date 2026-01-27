<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { activeTool, setActiveTool } from '../stores/appStore';
  import { canPlaceLights } from '../stores/roomStore';
  import { lightDefinitions, selectedDefinitionId, setSelectedDefinition } from '../stores/lightDefinitionsStore';
  import FloatingPanel from './FloatingPanel.svelte';
  import type { LightDefinition } from '../types';

  const dispatch = createEventDispatcher<{ openLightManager: void }>();

  let definitions: LightDefinition[] = [];
  let currentDefinitionId: string;
  let currentTool: string;
  let canPlace: boolean;

  $: definitions = $lightDefinitions;
  $: currentDefinitionId = $selectedDefinitionId;
  $: currentTool = $activeTool;
  $: canPlace = $canPlaceLights;
  $: visible = canPlace && currentTool === 'light';

  function handleDefinitionChange(e: Event): void {
    const newDefinitionId = (e.target as HTMLSelectElement).value;
    setSelectedDefinition(newDefinitionId);
  }

  function openLightManager(): void {
    dispatch('openLightManager');
  }

  function handleClose(): void {
    setActiveTool('select');
  }
</script>

<FloatingPanel
  visible={visible}
  title="Place Light"
  defaultX={16}
  defaultY={16}
  minWidth="240px"
  maxWidth="320px"
  persistenceKey="light-tool-panel"
  showCloseButton={true}
  onClose={handleClose}
>
  <div class="panel-content">
      <label class="definition-select">
        <span class="label-text">Light Type</span>
        <select
          value={currentDefinitionId}
          on:change={handleDefinitionChange}
        >
          {#each definitions as def (def.id)}
            <option value={def.id}>{def.name}</option>
          {/each}
        </select>
      </label>

      <button class="manage-button" on:click={openLightManager}>
        Manage Light Types...
      </button>

      {#if definitions.find(d => d.id === currentDefinitionId)}
        {@const def = definitions.find(d => d.id === currentDefinitionId)}
        <div class="light-specs">
          <div class="spec-header">Specifications</div>
          <div class="spec-row">
            <span>Lumens</span>
            <span>{def?.lumen} lm</span>
          </div>
          <div class="spec-row">
            <span>Beam Angle</span>
            <span>{def?.beamAngle}°</span>
          </div>
          <div class="spec-row">
            <span>Color Temp</span>
            <span>{def?.warmth}K</span>
          </div>
        </div>
      {/if}

    <p class="hint">Click inside the room to place this light</p>
  </div>
</FloatingPanel>

<style>
  .panel-content {
    padding: 0;
  }

  .definition-select {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .label-text {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  select {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    font-size: 13px;
    background: var(--input-bg);
    color: var(--text-secondary);
    cursor: pointer;
    transition: border-color 0.15s ease;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  select:focus {
    outline: none;
    border-color: var(--button-active);
  }

  select:hover {
    border-color: var(--border-color);
  }

  .manage-button {
    width: 100%;
    padding: 8px;
    margin-bottom: 12px;
    background: var(--button-bg);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .manage-button:hover {
    background: var(--button-bg-hover);
    border-color: var(--text-muted);
  }

  .light-specs {
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .spec-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border-color);
  }

  .spec-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 4px 0;
  }

  .spec-row span:first-child {
    color: var(--text-muted);
  }

  .spec-row span:last-child {
    font-weight: 500;
    color: var(--text-primary);
    font-family: monospace;
  }

  .hint {
    margin: 0;
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.4;
    font-style: italic;
    padding: 8px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 4px;
  }
</style>
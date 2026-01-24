<script lang="ts">
  import { activeTool } from '../stores/appStore';
  import { canPlaceDoors } from '../stores/roomStore';
  import {
    doorPlacementSettings,
    setDoorWidth,
    setDoorSwingDirection,
    setDoorSwingSide,
    DOOR_WIDTHS
  } from '../stores/doorStore';
  import { displayPreferences } from '../stores/settingsStore';
  import FloatingPanel from './FloatingPanel.svelte';
  import type { DoorPlacementSettings } from '../stores/doorStore';
  import type { UnitFormat } from '../types';

  let settings: DoorPlacementSettings;
  let currentTool: string;
  let canPlace: boolean;
  let unitFormat: UnitFormat;

  $: settings = $doorPlacementSettings;
  $: currentTool = $activeTool;
  $: canPlace = $canPlaceDoors;
  $: unitFormat = $displayPreferences.unitFormat;
  $: visible = canPlace && currentTool === 'door';

  // Generate door width options based on unit format
  $: doorWidthOptions = Object.entries(DOOR_WIDTHS).map(([label, value]) => ({
    label: unitFormat === 'inches' ? `${Math.round(value * 12)}"` : label,
    value
  }));

  function handleWidthChange(e: Event): void {
    const newWidth = parseFloat((e.target as HTMLSelectElement).value);
    setDoorWidth(newWidth);
  }

  function handleSwingDirectionChange(e: Event): void {
    const direction = (e.target as HTMLSelectElement).value as 'left' | 'right';
    setDoorSwingDirection(direction);
  }

  function handleSwingSideChange(e: Event): void {
    const side = (e.target as HTMLSelectElement).value as 'inside' | 'outside';
    setDoorSwingSide(side);
  }
</script>

<FloatingPanel
  visible={visible}
  title="Place Door"
  defaultX={16}
  defaultY={16}
  minWidth="220px"
  persistenceKey="door-tool-panel"
>
  <div class="panel-content">
    <label class="setting-row">
      <span class="label-text">Door Width</span>
      <select value={settings.width} on:change={handleWidthChange}>
        {#each doorWidthOptions as { label, value }}
          <option value={value}>{label}</option>
        {/each}
      </select>
    </label>

    <label class="setting-row">
      <span class="label-text">Hinge Side</span>
      <select value={settings.swingDirection} on:change={handleSwingDirectionChange}>
        <option value="right">Right</option>
        <option value="left">Left</option>
      </select>
    </label>

    <label class="setting-row">
      <span class="label-text">Swing Direction</span>
      <select value={settings.swingSide} on:change={handleSwingSideChange}>
        <option value="inside">Inside</option>
        <option value="outside">Outside</option>
      </select>
    </label>

    <p class="hint">Click on a wall to place the door</p>
  </div>
</FloatingPanel>

<style>
  .panel-content {
    padding: 0;
  }

  .setting-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
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
  }

  select:focus {
    outline: none;
    border-color: var(--button-active);
  }

  select:hover {
    border-color: var(--border-color);
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

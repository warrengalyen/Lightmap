<script lang="ts">
  import { activeTool, viewMode, setActiveTool, setViewMode } from '../stores/appStore';
  import { canPlaceLights } from '../stores/roomStore';
  import { toggleRafters, rafterConfig, displayPreferences, toggleUnitFormat } from '../stores/settingsStore';
  import { toggleLightingStats, lightingStatsConfig } from '../stores/lightingStatsStore';
  import { toggleDeadZones, deadZoneConfig } from '../stores/deadZoneStore';
  import { toggleSpacingWarnings, spacingConfig } from '../stores/spacingStore';
  import { historyStore, canUndo, canRedo } from '../stores/historyStore';
  import type { Tool, ViewMode } from '../types';

  let currentTool: Tool;
  let currentViewMode: ViewMode;
  let lightsEnabled: boolean;
  let raftersVisible: boolean;
  let undoEnabled: boolean;
  let redoEnabled: boolean;
  let unitFormat: 'feet-inches' | 'inches';
  let statsVisible: boolean;
  let deadZonesEnabled: boolean;
  let spacingEnabled: boolean;
  let gridSnapEnabled: boolean;

  $: currentTool = $activeTool;
  $: currentViewMode = $viewMode;
  $: lightsEnabled = $canPlaceLights;
  $: raftersVisible = $rafterConfig.visible;
  $: undoEnabled = $canUndo;
  $: redoEnabled = $canRedo;
  $: unitFormat = $displayPreferences.unitFormat;
  $: statsVisible = $lightingStatsConfig.visible;
  $: deadZonesEnabled = $deadZoneConfig.enabled;
  $: spacingEnabled = $spacingConfig.enabled;
  $: gridSnapEnabled = $displayPreferences.gridSnapEnabled;

  function handleToolChange(tool: Tool): void {
    setActiveTool(tool);
  }

  function handleViewModeChange(mode: ViewMode): void {
    setViewMode(mode);
  }

  function toggleGridSnap(): void {
    displayPreferences.update(p => ({ ...p, gridSnapEnabled: !p.gridSnapEnabled }));
  }
</script>

<div class="toolbar">
  <div class="toolbar-section">
    <div class="button-group">
      <button
        class="icon-button"
        disabled={!undoEnabled}
        on:click={() => historyStore.undo()}
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        class="icon-button"
        disabled={!redoEnabled}
        on:click={() => historyStore.redo()}
        title="Redo (Ctrl+Y)"
      >
        ↷
      </button>
    </div>
  </div>

  <div class="toolbar-section">
    <span class="section-label">Tools</span>
    <div class="button-group">
      <button
        class="tool-button"
        class:active={currentTool === 'select'}
        on:click={() => handleToolChange('select')}
        title="Select (V)"
      >
        <span class="icon">↖</span>
        Select
      </button>
      <button
        class="tool-button"
        class:active={currentTool === 'draw'}
        on:click={() => handleToolChange('draw')}
        title="Draw Walls (D)"
      >
        <span class="icon">✏</span>
        Draw
      </button>
      <button
        class="tool-button"
        class:active={currentTool === 'light'}
        on:click={() => handleToolChange('light')}
        disabled={!lightsEnabled}
        title={lightsEnabled ? 'Place Lights (L)' : 'Close room first'}
      >
        <span class="icon">💡</span>
        Light
      </button>
      <button
        class="toggle-button"
        class:active={gridSnapEnabled}
        on:click={toggleGridSnap}
        title="Snap to Grid (S)"
      >
        <span class="icon">#</span>
        Snap
      </button>
    </div>
  </div>

  <div class="toolbar-section">
    <span class="section-label">View</span>
    <div class="button-group">
      <button
        class="view-button"
        class:active={currentViewMode === 'editor'}
        on:click={() => handleViewModeChange('editor')}
        title="Editor View (1)"
      >
        Editor
      </button>
      <button
        class="view-button"
        class:active={currentViewMode === 'shadow'}
        on:click={() => handleViewModeChange('shadow')}
        title="Shadow View (2)"
      >
        Shadow
      </button>
      <button
        class="view-button"
        class:active={currentViewMode === 'heatmap'}
        on:click={() => handleViewModeChange('heatmap')}
        title="Heatmap View (3)"
      >
        Heatmap
      </button>
    </div>
  </div>

  <div class="toolbar-section">
    <span class="section-label">Overlay</span>
    <div class="button-group">
      <button
        class="toggle-button"
        class:active={raftersVisible}
        on:click={toggleRafters}
        title="Toggle Rafters (R)"
      >
        <span class="icon">⊞</span>
        Rafters
      </button>
      <button
        class="toggle-button"
        class:active={deadZonesEnabled}
        on:click={toggleDeadZones}
        title="Toggle Dead Zones"
      >
        <span class="icon">⚠</span>
        Dead Zones
      </button>
      <button
        class="toggle-button"
        class:active={spacingEnabled}
        on:click={toggleSpacingWarnings}
        title="Toggle Spacing Warnings"
      >
        <span class="icon">↔</span>
        Spacing
      </button>
    </div>
  </div>

  <div class="toolbar-section">
    <span class="section-label">Analysis</span>
    <button
      class="toggle-button"
      class:active={statsVisible}
      on:click={toggleLightingStats}
      title="Toggle Lighting Stats (Q)"
    >
      <span class="icon">📊</span>
      Stats
    </button>
  </div>

  <div class="toolbar-section">
    <span class="section-label">Units</span>
    <button
      class="toggle-button"
      on:click={toggleUnitFormat}
      title="Toggle Units (U)"
    >
      {unitFormat === 'feet-inches' ? "ft' in\"" : 'in"'}
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 8px 16px;
    background: #fff;
    border-bottom: 1px solid #ddd;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .toolbar-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-label {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .button-group {
    display: flex;
    gap: 4px;
  }

  .tool-button,
  .view-button,
  .toggle-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tool-button:hover:not(:disabled),
  .view-button:hover,
  .toggle-button:hover {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .tool-button.active,
  .view-button.active,
  .toggle-button.active {
    background: #0066cc;
    border-color: #0066cc;
    color: #fff;
  }

  .tool-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon {
    font-size: 14px;
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .icon-button:hover:not(:disabled) {
    background: #f5f5f5;
    border-color: #ccc;
  }

  .icon-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { activeTool, viewMode, setActiveTool, setViewMode, selectedVertexIndex, selectedLightId, clearSelection } from '../stores/appStore';
  import { canPlaceLights, roomStore, resetRoom } from '../stores/roomStore';
  import { toggleRafters, rafterConfig, displayPreferences, toggleUnitFormat } from '../stores/settingsStore';
  import { toggleLightingStats, lightingStatsConfig } from '../stores/lightingStatsStore';
  import { toggleDeadZones, deadZoneConfig } from '../stores/deadZoneStore';
  import { toggleSpacingWarnings, spacingConfig } from '../stores/spacingStore';
  import { historyStore, canUndo, canRedo } from '../stores/historyStore';
  import { isMeasuring } from '../stores/measurementStore';
  import { exportToJSON } from '../persistence/jsonExport';
  import { importFromJSON } from '../persistence/jsonImport';
  import { saveNow, clearLocalStorage } from '../persistence/localStorage';
  import type { Tool, ViewMode, LightRadiusVisibility, RoomState } from '../types';

  let fileInput: HTMLInputElement;
  let currentRoom: RoomState;
  $: currentRoom = $roomStore;

  const dispatch = createEventDispatcher<{ toggleMeasurement: void }>();

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
  let measuringActive: boolean;
  let canMeasure: boolean;
  let lightRadiusVisibility: LightRadiusVisibility;
  let saveSuccess: boolean = false;

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
  $: measuringActive = $isMeasuring;
  $: canMeasure = $selectedVertexIndex !== null || $selectedLightId !== null;
  $: lightRadiusVisibility = $displayPreferences.lightRadiusVisibility;

  function handleToolChange(tool: Tool): void {
    setActiveTool(tool);
  }

  function handleViewModeChange(mode: ViewMode): void {
    setViewMode(mode);
  }

  function toggleGridSnap(): void {
    displayPreferences.update(p => ({ ...p, gridSnapEnabled: !p.gridSnapEnabled }));
  }

  function toggleMeasurement(): void {
    dispatch('toggleMeasurement');
  }

  function cycleLightRadiusVisibility(): void {
    displayPreferences.update(p => {
      const newVisibility: LightRadiusVisibility =
        p.lightRadiusVisibility === 'selected' ? 'always' : 'selected';
      return { ...p, lightRadiusVisibility: newVisibility };
    });
  }

  function getRadiusVisibilityLabel(visibility: LightRadiusVisibility): string {
    switch (visibility) {
      case 'selected': return 'Radius: Selected';
      case 'always': return 'Radius: Always';
      default: return 'Radius';
    }
  }

  function handleNew(): void {
    if (currentRoom.walls.length > 0 || currentRoom.lights.length > 0) {
      if (!confirm('Start a new project? Unsaved changes will be lost.')) {
        return;
      }
    }
    clearLocalStorage();
    resetRoom();
    clearSelection();
  }

  function handleSave(): void {
    saveNow(currentRoom);
    saveSuccess = true;
    setTimeout(() => {
      saveSuccess = false;
    }, 2000);
  }

  function handleExport(): void {
    exportToJSON(currentRoom);
  }

  function handleImportClick(): void {
    fileInput.click();
  }

  async function handleFileSelect(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const imported = await importFromJSON(file);
      roomStore.set(imported);
      clearSelection();
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    input.value = '';
  }
</script>

<input
  type="file"
  accept=".json"
  bind:this={fileInput}
  on:change={handleFileSelect}
  style="display: none"
/>

<div class="toolbar">
  <div class="toolbar-section">
    <span class="section-label">File</span>
    <div class="button-group">
      <button
        class="tool-button"
        on:click={handleNew}
        title="New Project"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <span class="label">New</span>
      </button>
      <button
        class="tool-button"
        class:save-success={saveSuccess}
        on:click={handleSave}
        title="Save to Browser"
      >
        {#if saveSuccess}
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span class="label">Saved!</span>
        {:else}
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span class="label">Save</span>
        {/if}
      </button>
      <button
        class="tool-button"
        on:click={handleImportClick}
        title="Import JSON"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="label">Open</span>
      </button>
      <button
        class="tool-button"
        on:click={handleExport}
        title="Export as JSON"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span class="label">Export</span>
      </button>
      <button
        class="tool-button"
        disabled={!undoEnabled}
        on:click={() => historyStore.undo()}
        title="Undo (Ctrl+Z)"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        <span class="label">Undo</span>
      </button>
      <button
        class="tool-button"
        disabled={!redoEnabled}
        on:click={() => historyStore.redo()}
        title="Redo (Ctrl+Y)"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        <span class="label">Redo</span>
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
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          <path d="M13 13l6 6"/>
        </svg>
        <span class="label">Select</span>
      </button>
      <button
        class="tool-button"
        class:active={currentTool === 'draw'}
        on:click={() => handleToolChange('draw')}
        title="Draw Walls (D)"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z"/>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
          <path d="M2 2l7.586 7.586"/>
          <circle cx="11" cy="11" r="2"/>
        </svg>
        <span class="label">Draw</span>
      </button>
      <button
        class="tool-button"
        class:active={currentTool === 'light'}
        on:click={() => handleToolChange('light')}
        disabled={!lightsEnabled}
        title={lightsEnabled ? 'Place Lights (L)' : 'Close room first'}
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          <circle cx="12" cy="12" r="5"/>
        </svg>
        <span class="label">Light</span>
      </button>
    </div>
  </div>

  <div class="toolbar-section">
    <span class="section-label">Modes</span>
    <div class="button-group">
      <button
        class="toggle-button"
        class:active={gridSnapEnabled}
        on:click={toggleGridSnap}
        title="Snap to Grid (S)"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="3" y1="15" x2="21" y2="15"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
        <span class="label">Snap</span>
      </button>
      <button
        class="toggle-button measuring"
        class:active={measuringActive}
        disabled={!canMeasure}
        on:click={toggleMeasurement}
        title={measuringActive ? "Measuring Active (Press M or ESC to exit)" : canMeasure ? "Start Measuring (M)" : "Select a vertex or light first"}
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/>
          <path d="m14.5 12.5 2-2"/>
          <path d="m11.5 9.5 2-2"/>
          <path d="m8.5 6.5 2-2"/>
          <path d="m17.5 15.5 2-2"/>
        </svg>
        <span class="label">Measure</span>
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
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span class="label">Editor</span>
      </button>
      <button
        class="view-button"
        class:active={currentViewMode === 'shadow'}
        on:click={() => handleViewModeChange('shadow')}
        title="Shadow View (2)"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3"/>
        </svg>
        <span class="label">Shadow</span>
      </button>
      <button
        class="view-button"
        class:active={currentViewMode === 'heatmap'}
        on:click={() => handleViewModeChange('heatmap')}
        title="Heatmap View (3)"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <rect x="7" y="7" width="3" height="3"/>
          <rect x="14" y="7" width="3" height="3"/>
          <rect x="7" y="14" width="3" height="3"/>
          <rect x="14" y="14" width="3" height="3"/>
        </svg>
        <span class="label">Heatmap</span>
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
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
        <span class="label">Rafters</span>
      </button>
      <button
        class="toggle-button"
        class:active={deadZonesEnabled}
        on:click={toggleDeadZones}
        title="Toggle Dead Zones"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span class="label">Dead Zones</span>
      </button>
      <button
        class="toggle-button"
        class:active={spacingEnabled}
        on:click={toggleSpacingWarnings}
        title="Toggle Spacing Warnings"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10H3"/>
          <path d="M21 6H3"/>
          <path d="M21 14H3"/>
          <path d="M21 18H3"/>
          <path d="M6 6v12"/>
          <path d="M18 6v12"/>
        </svg>
        <span class="label">Spacing</span>
      </button>
      <button
        class="toggle-button"
        class:active={lightRadiusVisibility === 'always'}
        on:click={cycleLightRadiusVisibility}
        title="Cycle Light Radius Visibility"
      >
        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
        <span class="label">Radius</span>
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
      <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
      <span class="label">Stats</span>
    </button>
  </div>

  <div class="toolbar-section">
    <span class="section-label">Units</span>
    <button
      class="toggle-button"
      on:click={toggleUnitFormat}
      title="Toggle Units (U)"
    >
      <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 3H3v18h18V3z"/>
        <path d="M21 9H3"/>
        <path d="M21 15H3"/>
        <path d="M9 3v18"/>
        <path d="M15 3v18"/>
      </svg>
      <span class="label">{unitFormat === 'feet-inches' ? "ft' in\"" : 'in"'}</span>
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: stretch;
    gap: 16px;
    padding: 6px 16px;
    background: var(--panel-bg);
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .toolbar-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 16px;
    border-right: 1px solid var(--border-color);
  }

  .toolbar-section:last-child {
    border-right: none;
    padding-right: 0;
  }

  .section-label {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: center;
  }

  .button-group {
    display: flex;
    gap: 2px;
    flex: 1;
  }

  .tool-button,
  .view-button,
  .toggle-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 12px;
    min-width: 56px;
    min-height: 54px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tool-button:hover:not(:disabled),
  .view-button:hover,
  .toggle-button:hover {
    background: var(--button-bg-hover);
    border-color: var(--border-color);
  }

  .tool-button.active,
  .view-button.active,
  .toggle-button.active {
    background: var(--button-active);
    border-color: var(--button-active);
    color: var(--text-primary);
  }

  .tool-button.save-success {
    background: #22c55e;
    border-color: #22c55e;
    color: white;
  }

  .tool-button:disabled,
  .toggle-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon-svg {
    width: 20px;
    height: 20px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .label {
    white-space: nowrap;
  }

  .icon-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 44px;
    min-height: 54px;
    padding: 8px 4px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 20px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .icon-button:hover:not(:disabled) {
    background: var(--button-bg-hover);
    border-color: var(--border-color);
  }

  .icon-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .toggle-button.measuring.active {
    background: #ff9500;
    border-color: #ff9500;
    color: var(--text-primary);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .toggle-button.measuring:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-button.measuring:not(.active):not(:disabled) {
    background: transparent;
    border-color: transparent;
    color: var(--text-secondary);
  }

  .toggle-button.measuring:not(.active):not(:disabled):hover {
    background: var(--button-bg-hover);
    border-color: var(--border-color);
  }
</style>

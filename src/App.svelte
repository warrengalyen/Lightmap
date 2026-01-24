<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Canvas from './components/Canvas.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import PropertyPanel from './components/PropertyPanel.svelte';
  import VertexPropertiesPanel from './components/VertexPropertiesPanel.svelte';
  import WallPropertiesPanel from './components/WallPropertiesPanel.svelte';
  import LightPropertiesPanel from './components/LightPropertiesPanel.svelte';
  import DoorPropertiesPanel from './components/DoorPropertiesPanel.svelte';
  import LightToolPanel from './components/LightToolPanel.svelte';
  import DoorToolPanel from './components/DoorToolPanel.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import LengthInput from './components/LengthInput.svelte';
  import RafterControls from './components/RafterControls.svelte';
  import LightingStatsPanel from './components/LightingStatsPanel.svelte';
  import LightDefinitionManager from './components/LightDefinitionManager.svelte';
  import { roomStore } from './stores/roomStore';
  import { activeTool, setActiveTool, setViewMode, requestCameraFit } from './stores/appStore';
  import { loadFromLocalStorage, setupAutoSave } from './persistence/localStorage';
  import { initSettingsFromRoom, displayPreferences } from './stores/settingsStore';
  import { togglePropertiesPanel } from './stores/propertiesPanelStore';
  import './stores/themeStore'; // Initialize theme CSS variables
  import type { Vector2 } from './types';

  const iconPath = `${import.meta.env.BASE_URL}icons/lightmap_icon.png`;

  let canvasComponent: Canvas;
  let mousePos: Vector2 = { x: 0, y: 0 };
  let snapType: string = '';
  let showLengthInput: boolean = false;
  let showLightManager: boolean = false;
  let cleanupAutoSave: (() => void) | null = null;
  let measurement: { deltaX: number; deltaY: number; distance: number } | null = null;

  function handleMouseMove(e: CustomEvent<{ worldPos: Vector2 }>): void {
    mousePos = e.detail.worldPos;
  }

  function handleSnapChange(e: CustomEvent<{ snapType: string }>): void {
    snapType = e.detail.snapType;
  }

  function handleMeasurement(e: CustomEvent<{ deltaX: number; deltaY: number; distance: number } | null>): void {
    measurement = e.detail;
  }

  function handleToggleMeasurement(): void {
    // Simulate pressing 'M' key to toggle measurement
    const event = new KeyboardEvent('keydown', { key: 'm' });
    window.dispatchEvent(event);
  }

  function handleLengthSubmit(e: CustomEvent<{ length: number }>): void {
    canvasComponent?.setManualLength(e.detail.length);
    showLengthInput = false;
  }

  function handleLengthCancel(): void {
    showLengthInput = false;
  }

  function handleOpenLightManager(): void {
    showLightManager = true;
  }

  function handleCloseLightManager(): void {
    showLightManager = false;
  }

  function handleGlobalKeydown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'escape':
        // Switch to selection tool if currently using a drawing tool
        if ($activeTool === 'draw' || $activeTool === 'light' || $activeTool === 'door') {
          setActiveTool('select');
        }
        break;
      case 'l':
        if ($activeTool === 'draw') {
          showLengthInput = true;
        } else {
          setActiveTool('light');
        }
        break;
      case 'v':
        setActiveTool('select');
        break;
      case 'd':
        setActiveTool('draw');
        break;
      case 's':
        displayPreferences.update(p => ({ ...p, gridSnapEnabled: !p.gridSnapEnabled }));
        break;
      case 'p':
        togglePropertiesPanel();
        break;
    }
  }

  onMount(() => {
    const savedState = loadFromLocalStorage();
    if (savedState) {
      roomStore.set(savedState);
      // Initialize settings from saved room state
      initSettingsFromRoom();
      // Fit camera to the loaded project
      requestCameraFit();
    }

    cleanupAutoSave = setupAutoSave(roomStore);

    window.addEventListener('keydown', handleGlobalKeydown);
  });

  onDestroy(() => {
    if (cleanupAutoSave) {
      cleanupAutoSave();
    }
    window.removeEventListener('keydown', handleGlobalKeydown);
  });
</script>

<div class="app">
  <Toolbar on:toggleMeasurement={handleToggleMeasurement} on:openLightManager={handleOpenLightManager} />

  <main class="main">
    <div class="canvas-area">
      <Canvas
        bind:this={canvasComponent}
        on:mouseMove={handleMouseMove}
        on:snapChange={handleSnapChange}
        on:measurement={handleMeasurement}
      />
      {#if measurement}
        <div class="measurement-panel">
          <div class="measurement-title">Measurement</div>
          <div class="measurement-row">
            <span class="measurement-label" style="color: var(--measurement-x);">ΔX:</span>
            <span class="measurement-value">{Math.abs(measurement.deltaX).toFixed(2)} ft</span>
          </div>
          <div class="measurement-row">
            <span class="measurement-label" style="color: var(--measurement-y);">ΔY:</span>
            <span class="measurement-value">{Math.abs(measurement.deltaY).toFixed(2)} ft</span>
          </div>
          <div class="measurement-row">
            <span class="measurement-label" style="color: var(--measurement-distance);">Distance:</span>
            <span class="measurement-value">{measurement.distance.toFixed(2)} ft</span>
          </div>
          <div class="measurement-hint">Press M or Esc to clear</div>
        </div>
      {/if}
      <RafterControls />
      <LightingStatsPanel />
      <LightToolPanel on:openLightManager={handleOpenLightManager} />
      <DoorToolPanel />
      <PropertyPanel />
      <VertexPropertiesPanel />
      <WallPropertiesPanel />
      <LightPropertiesPanel />
      <DoorPropertiesPanel />
    </div>
  </main>

  <StatusBar {mousePos} {snapType} />

  <LengthInput
    visible={showLengthInput}
    on:submit={handleLengthSubmit}
    on:cancel={handleLengthCancel}
  />

  <LightDefinitionManager
    visible={showLightManager}
    on:close={handleCloseLightManager}
  />
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    background: var(--input-bg);
    color: var(--text-secondary);
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--input-bg);
  }


  .main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .canvas-area {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .measurement-panel {
    position: absolute;
    top: var(--spacing-16);
    left: var(--spacing-16);
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--spacing-12) var(--spacing-16);
    box-shadow: var(--shadow-md);
    font-size: 13px;
    min-width: 160px;
  }

  .measurement-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-8);
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border-color);
  }

  .measurement-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-4);
  }

  .measurement-label {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .measurement-value {
    font-family: monospace;
    color: var(--text-primary);
  }

  .measurement-hint {
    margin-top: 8px;
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
  }
</style>

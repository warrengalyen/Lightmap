<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Canvas from './components/Canvas.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import PropertyPanel from './components/PropertyPanel.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import LengthInput from './components/LengthInput.svelte';
  import RafterControls from './components/RafterControls.svelte';
  import FileMenu from './components/FileMenu.svelte';
  import { roomStore } from './stores/roomStore';
  import { activeTool, setActiveTool, setViewMode } from './stores/appStore';
  import { loadFromLocalStorage, setupAutoSave } from './persistence/localStorage';
  import { initSettingsFromRoom } from './stores/settingsStore';
  import type { Vector2 } from './types';

  let canvasComponent: Canvas;
  let mousePos: Vector2 = { x: 0, y: 0 };
  let snapType: string = '';
  let showLengthInput: boolean = false;
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

  function handleLengthSubmit(e: CustomEvent<{ length: number }>): void {
    canvasComponent?.setManualLength(e.detail.length);
    showLengthInput = false;
  }

  function handleLengthCancel(): void {
    showLengthInput = false;
  }

  function handleGlobalKeydown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
      return;
    }

    switch (e.key.toLowerCase()) {
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
    }
  }

  onMount(() => {
    const savedState = loadFromLocalStorage();
    if (savedState) {
      roomStore.set(savedState);
      initSettingsFromRoom();
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
  <header class="header">
    <div class="header-left">
      <h1>Lightmap</h1>
      <span class="tagline">Recessed Lighting Planner</span>
    </div>
    <Toolbar />
    <FileMenu />
  </header>

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
            <span class="measurement-label" style="color: #ff6600;">ΔX:</span>
            <span class="measurement-value">{Math.abs(measurement.deltaX).toFixed(2)} ft</span>
          </div>
          <div class="measurement-row">
            <span class="measurement-label" style="color: #0066ff;">ΔY:</span>
            <span class="measurement-value">{Math.abs(measurement.deltaY).toFixed(2)} ft</span>
          </div>
          <div class="measurement-row">
            <span class="measurement-label" style="color: #ff00ff;">Distance:</span>
            <span class="measurement-value">{measurement.distance.toFixed(2)} ft</span>
          </div>
          <div class="measurement-hint">Press M or Esc to clear</div>
        </div>
      {/if}
      <RafterControls />
    </div>
    <PropertyPanel />
  </main>

  <StatusBar {mousePos} {snapType} />

  <LengthInput
    visible={showLengthInput}
    on:submit={handleLengthSubmit}
    on:cancel={handleLengthCancel}
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
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f5f5f5;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 0 16px;
    background: #fff;
    border-bottom: 1px solid #ddd;
    height: 52px;
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #333;
  }

  .tagline {
    font-size: 12px;
    color: #888;
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
    top: 16px;
    left: 16px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    font-size: 13px;
    min-width: 160px;
  }

  .measurement-title {
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #eee;
  }

  .measurement-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .measurement-label {
    font-weight: 500;
  }

  .measurement-value {
    font-family: monospace;
    color: #333;
  }

  .measurement-hint {
    margin-top: 8px;
    font-size: 11px;
    color: #888;
    text-align: center;
  }
</style>
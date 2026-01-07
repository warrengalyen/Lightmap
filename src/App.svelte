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
  import type { Vector2 } from './types';

  let canvasComponent: Canvas;
  let mousePos: Vector2 = { x: 0, y: 0 };
  let snapType: string = '';
  let showLengthInput: boolean = false;
  let cleanupAutoSave: (() => void) | null = null;

  function handleMouseMove(e: CustomEvent<{ worldPos: Vector2 }>): void {
    mousePos = e.detail.worldPos;
  }

  function handleSnapChange(e: CustomEvent<{ snapType: string }>): void {
    snapType = e.detail.snapType;
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
      />
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
</style>
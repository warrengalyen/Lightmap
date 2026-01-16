<script lang="ts">
  import { viewMode, activeTool, appMode } from '../stores/appStore';
  import { roomStore } from '../stores/roomStore';
  import { formatImperial } from '../utils/format';
  import type { Vector2, ViewMode, Tool, AppMode } from '../types';

  export let mousePos: Vector2 = { x: 0, y: 0 };
  export let snapType: string = '';

  let currentViewMode: ViewMode;
  let currentTool: Tool;
  let currentAppMode: AppMode;
  let isClosed: boolean;

  $: currentViewMode = $viewMode;
  $: currentTool = $activeTool;
  $: currentAppMode = $appMode;
  $: isClosed = $roomStore.isClosed;

  function formatCoord(value: number): string {
    return formatImperial(value, { decimal: false });
  }

  function getToolLabel(tool: Tool): string {
    switch (tool) {
      case 'select': return 'Select';
      case 'draw': return 'Draw Walls';
      case 'light': return 'Place Light';
      default: return tool;
    }
  }

  function getViewModeLabel(mode: ViewMode): string {
    switch (mode) {
      case 'editor': return 'Editor';
      case 'shadow': return 'Shadow';
      case 'heatmap': return 'Heatmap';
      default: return mode;
    }
  }
</script>

<div class="status-bar">
  <div class="status-section">
    <span class="label">Position:</span>
    <span class="value coords">
      X: {formatCoord(mousePos.x)}, Y: {formatCoord(mousePos.y)}
    </span>
  </div>

  {#if snapType && snapType !== 'none'}
    <div class="status-section snap-indicator">
      <span class="snap-badge">{snapType}</span>
    </div>
  {/if}

  <div class="status-section">
    <span class="label">Tool:</span>
    <span class="value">{getToolLabel(currentTool)}</span>
  </div>

  <div class="status-section">
    <span class="label">View:</span>
    <span class="value view-mode">{getViewModeLabel(currentViewMode)}</span>
  </div>

  <div class="status-section">
    <span class="label">Room:</span>
    <span class="value" class:status-closed={isClosed} class:status-open={!isClosed}>
      {isClosed ? 'Closed' : 'Open'}
    </span>
  </div>

  <div class="status-spacer"></div>

  <div class="status-section hints">
    {#if currentTool === 'draw' && !isClosed}
      <span>Click to place vertices | ESC to cancel | Close polygon to finish</span>
    {:else if currentTool === 'light' && isClosed}
      <span>Click inside room to place light</span>
    {:else if currentTool === 'select'}
      <span>Click to select | DEL to delete | Scroll to zoom | Alt+drag to pan</span>
    {/if}
  </div>
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 6px 16px;
    background: #2d2d30;
    border-top: 1px solid #3e3e42;
    font-size: 12px;
  }

  .status-section {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .label {
    color: #999999;
  }

  .value {
    color: #cccccc;
    font-weight: 500;
  }

  .coords {
    font-family: monospace;
    min-width: 160px;
  }

  .view-mode {
    color: #0066cc;
  }

  .status-closed {
    color: #22c55e;
  }

  .status-open {
    color: #f59e0b;
  }

  .snap-badge {
    display: inline-block;
    padding: 2px 8px;
    background: #0066cc;
    color: white;
    border-radius: 3px;
    font-size: 11px;
    text-transform: capitalize;
  }

  .status-spacer {
    flex: 1;
  }

  .hints {
    color: #999999;
    font-style: italic;
  }
</style>
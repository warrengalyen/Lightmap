<script lang="ts">
  import { roomStore, updateWallLength, getVertices, updateVertexPosition, deleteVertex } from '../stores/roomStore';
  import { selectedWallId, selectedVertexIndex, clearVertexSelection } from '../stores/appStore';
  import { formatImperial, parseImperial } from '../utils/format';
  import { displayPreferences, toggleUnitFormat } from '../stores/settingsStore';
  import { propertiesPanelConfig, togglePropertiesPanel } from '../stores/propertiesPanelStore';
  import FloatingPanel from './FloatingPanel.svelte';
  import type { WallSegment, RoomState, PropertiesPanelConfig } from '../types';

  let config: PropertiesPanelConfig;

  let currentRoom: RoomState;
  let currentSelectedWallId: string | null;
  let currentSelectedVertexIndex: number | null;
  let selectedWall: WallSegment | null = null;
  let selectedVertex: import('../types').Vector2 | null = null;
  let ceilingHeightInput: string = '';
  let wallLengthInput: string = '';
  let vertexXInput: string = '';
  let vertexYInput: string = '';
  let unitFormat: 'feet-inches' | 'inches';

  $: config = $propertiesPanelConfig;
  $: currentRoom = $roomStore;
  $: unitFormat = $displayPreferences.unitFormat;
  $: currentSelectedWallId = $selectedWallId;
  $: currentSelectedVertexIndex = $selectedVertexIndex;

  $: selectedWall = currentSelectedWallId
    ? currentRoom.walls.find(w => w.id === currentSelectedWallId) ?? null
    : null;

  $: {
    const vertices = getVertices(currentRoom);
    selectedVertex = currentSelectedVertexIndex !== null && currentSelectedVertexIndex < vertices.length
      ? vertices[currentSelectedVertexIndex]
      : null;
  }

  $: ceilingHeightInput = formatImperial(currentRoom.ceilingHeight);

  $: if (selectedWall) {
    wallLengthInput = formatImperial(selectedWall.length);
  }

  $: if (selectedVertex && selectedVertex.x != null && selectedVertex.y != null) {
    vertexXInput = selectedVertex.x.toFixed(2);
    vertexYInput = selectedVertex.y.toFixed(2);
  }

  function handleCeilingHeightChange(e: Event): void {
    ceilingHeightInput = (e.target as HTMLInputElement).value;
  }

  function handleCeilingHeightKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      applyCeilingHeight();
    }
  }

  function applyCeilingHeight(): void {
    const newHeight = parseImperial(ceilingHeightInput);
    if (newHeight !== null && newHeight > 0 && newHeight <= 50) {
      roomStore.update(state => ({ ...state, ceilingHeight: newHeight }));
    } else {
      // Reset to current value if invalid
      ceilingHeightInput = formatImperial(currentRoom.ceilingHeight);
    }
  }

  function handleWallLengthChange(e: Event): void {
    wallLengthInput = (e.target as HTMLInputElement).value;
  }

  function handleWallLengthKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      applyWallLength();
    }
  }

  function applyWallLength(): void {
    if (!currentSelectedWallId) return;

    const newLength = parseImperial(wallLengthInput);
    if (newLength !== null && newLength > 0) {
      updateWallLength(currentSelectedWallId, newLength);
    } else {
      // Reset to current value if invalid
      if (selectedWall) {
        wallLengthInput = formatImperial(selectedWall.length);
      }
    }
  }

  function handleVertexXChange(e: Event): void {
    vertexXInput = (e.target as HTMLInputElement).value;
  }

  function handleVertexYChange(e: Event): void {
    vertexYInput = (e.target as HTMLInputElement).value;
  }

  function handleVertexKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      applyVertexPosition();
    }
  }

  function applyVertexPosition(): void {
    if (currentSelectedVertexIndex === null) return;

    const newX = parseFloat(vertexXInput);
    const newY = parseFloat(vertexYInput);

    if (!isNaN(newX) && !isNaN(newY)) {
      updateVertexPosition(currentSelectedVertexIndex, { x: newX, y: newY });
    } else {
      // Reset to current value if invalid
      if (selectedVertex) {
        vertexXInput = selectedVertex.x.toFixed(2);
        vertexYInput = selectedVertex.y.toFixed(2);
      }
    }
  }

  function deleteSelectedVertex(): void {
    if (currentSelectedVertexIndex === null) return;
    if (currentRoom.walls.length <= 3) return; // Need at least 3 vertices

    deleteVertex(currentSelectedVertexIndex);
    clearVertexSelection();
  }
</script>

<FloatingPanel
  visible={config.visible}
  title="Properties"
  defaultX={window.innerWidth - 266}
  defaultY={16}
  minWidth="250px"
  maxHeight="calc(100vh - 200px)"
  persistenceKey="properties-panel"
  showCloseButton={true}
  onClose={togglePropertiesPanel}
>
  <div class="property-section">
      <h4>Room</h4>
      <label class="property-row">
        <span>Ceiling Height</span>
      <div class="input-group">
        <input
          type="text"
          value={ceilingHeightInput}
          on:input={handleCeilingHeightChange}
          on:keydown={handleCeilingHeightKeydown}
          on:blur={applyCeilingHeight}
          class="height-input"
          placeholder="e.g., 8' 6&quot;"
        />
      </div>
    </label>
    <div class="property-row info">
      <span>Walls</span>
      <span>{currentRoom.walls.length}</span>
    </div>
    <div class="property-row info">
      <span>Status</span>
      <span class:closed={currentRoom.isClosed}>
        {currentRoom.isClosed ? 'Closed' : 'Open'}
      </span>
    </div>
    <div class="property-row info">
      <span>Lights</span>
      <span class="light-count">{currentRoom.lights.length}</span>
    </div>
    <div class="property-row">
      <span>Units</span>
      <button class="unit-toggle" on:click={toggleUnitFormat} title="Toggle Units (U)">
        {unitFormat === 'feet-inches' ? "ft' in\"" : 'in"'}
      </button>
    </div>
  </div>

  {#if selectedVertex}
    <div class="property-section">
      <h4>Vertex</h4>
      <label class="property-row">
        <span>X</span>
        <div class="input-group">
          <input
            type="text"
            value={vertexXInput}
            on:input={handleVertexXChange}
            on:keydown={handleVertexKeydown}
            on:blur={applyVertexPosition}
            class="coord-input"
          />
          <span class="unit">ft</span>
        </div>
      </label>
      <label class="property-row">
        <span>Y</span>
        <div class="input-group">
          <input
            type="text"
            value={vertexYInput}
            on:input={handleVertexYChange}
            on:keydown={handleVertexKeydown}
            on:blur={applyVertexPosition}
            class="coord-input"
          />
          <span class="unit">ft</span>
        </div>
      </label>
      <p class="wall-hint">
        Drag the vertex or type new coordinates and press Enter.
        Double-click a wall to insert a new vertex.
      </p>
      {#if currentRoom.walls.length > 3}
        <button class="delete-button" on:click={deleteSelectedVertex}>
          Delete Vertex
        </button>
      {:else}
        <p class="wall-hint">Cannot delete: minimum 3 vertices required.</p>
      {/if}
    </div>
  {:else if selectedWall}
    <div class="property-section">
      <h4>Wall Segment</h4>
      <label class="property-row">
        <span>Length</span>
        <div class="input-group">
          <input
            type="text"
            value={wallLengthInput}
            on:input={handleWallLengthChange}
            on:keydown={handleWallLengthKeydown}
            on:blur={applyWallLength}
            class="length-input"
            placeholder="e.g., 10' 6&quot;"
          />
        </div>
      </label>
      <div class="property-row info">
        <span>Start</span>
        <span class="coords">
          ({selectedWall.start.x.toFixed(1)}, {selectedWall.start.y.toFixed(1)})
        </span>
      </div>
      <div class="property-row info">
        <span>End</span>
        <span class="coords">
          ({selectedWall.end.x.toFixed(1)}, {selectedWall.end.y.toFixed(1)})
        </span>
      </div>
      <p class="wall-hint">
        Type a new length and press Enter to apply.
        Format: 10' 6" or 10.5
      </p>
    </div>
  {:else if !currentRoom.isClosed}
    <div class="property-section hint">
      <p>Close the room polygon to edit walls and place lights.</p>
    </div>
  {/if}
</FloatingPanel>

<style>
  h4 {
    margin: 0 0 12px 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

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

  .input-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  input[type="number"] {
    width: 70px;
    padding: 4px 8px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-secondary);
    font-size: 13px;
    text-align: right;
  }

  input[type="number"]:focus {
    outline: none;
    border-color: var(--button-active);
  }

  .length-input,
  .height-input {
    width: 90px;
    padding: 4px 8px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-secondary);
    font-size: 13px;
    text-align: right;
  }

  .length-input:focus,
  .height-input:focus {
    outline: none;
    border-color: var(--button-active);
  }

  .coord-input {
    width: 70px;
    padding: 4px 8px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-secondary);
    font-size: 13px;
    text-align: right;
  }

  .coord-input:focus {
    outline: none;
    border-color: var(--button-active);
  }

  .unit {
    font-size: 12px;
    color: var(--text-muted);
    min-width: 20px;
  }

  .info span:last-child {
    font-weight: 500;
    color: var(--text-primary);
  }

  .closed {
    color: var(--status-success) !important;
  }

  .light-count {
    color: var(--status-info) !important;
  }

  .coords {
    font-family: monospace;
    font-size: 12px;
  }

  .wall-hint {
    margin: 12px 0 0 0;
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
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
    background: #dc2626; /* Darker red for hover */
  }

  .hint {
    color: var(--text-muted);
    font-size: 13px;
    font-style: italic;
  }

  .hint p {
    margin: 0;
  }

  .manage-button {
    width: 100%;
    padding: 8px;
    margin-top: 8px;
    background: var(--button-bg);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .manage-button:hover {
    background: var(--button-bg-hover);
  }

  .unit-toggle {
    padding: 4px 10px;
    background: var(--button-bg);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .unit-toggle:hover {
    background: var(--button-bg-hover);
  }
</style>
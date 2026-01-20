<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { roomStore, canPlaceLights, updateWallLength, getVertices, updateVertexPosition, deleteVertex } from '../stores/roomStore';
  import { selectedLightId, selectedLightIds, selectedWallId, selectedVertexIndex, clearLightSelection, clearVertexSelection, activeTool } from '../stores/appStore';
  import { lightDefinitions, selectedDefinitionId, setSelectedDefinition, getDefinitionById } from '../stores/lightDefinitionsStore';
  import { formatImperial, parseImperial } from '../utils/format';
  import type { LightFixture, WallSegment, RoomState, LightDefinition } from '../types';

  const dispatch = createEventDispatcher<{ openLightManager: void }>();

  let currentRoom: RoomState;
  let currentSelectedLightId: string | null;
  let currentSelectedLightIds: Set<string> = new Set();
  let currentSelectedWallId: string | null;
  let currentSelectedVertexIndex: number | null;
  let selectedLight: LightFixture | null = null;
  let selectedLights: LightFixture[] = [];
  let selectedWall: WallSegment | null = null;
  let selectedVertex: import('../types').Vector2 | null = null;
  let canPlace: boolean;
  let wallLengthInput: string = '';
  let vertexXInput: string = '';
  let vertexYInput: string = '';
  let definitions: LightDefinition[] = [];
  let currentDefinitionId: string;

  $: currentRoom = $roomStore;
  $: currentSelectedLightId = $selectedLightId;
  $: currentSelectedLightIds = $selectedLightIds;
  $: currentSelectedWallId = $selectedWallId;
  $: currentSelectedVertexIndex = $selectedVertexIndex;
  $: canPlace = $canPlaceLights;
  $: definitions = $lightDefinitions;
  $: currentDefinitionId = $selectedDefinitionId;
  $: currentTool = $activeTool;

  $: selectedLights = currentRoom.lights.filter(l => currentSelectedLightIds.has(l.id));

  // Check if all selected lights share the same definition
  $: commonDefinitionId = (() => {
    if (selectedLights.length === 0) return null;
    const firstDefId = selectedLights[0].definitionId;
    const allSame = selectedLights.every(l => l.definitionId === firstDefId);
    return allSame ? firstDefId : null;
  })();

  $: selectedLight = currentSelectedLightId
    ? currentRoom.lights.find(l => l.id === currentSelectedLightId) ?? null
    : null;

  $: selectedWall = currentSelectedWallId
    ? currentRoom.walls.find(w => w.id === currentSelectedWallId) ?? null
    : null;

  $: {
    const vertices = getVertices(currentRoom);
    selectedVertex = currentSelectedVertexIndex !== null && currentSelectedVertexIndex < vertices.length
      ? vertices[currentSelectedVertexIndex]
      : null;
  }

  $: if (selectedWall) {
    wallLengthInput = formatImperial(selectedWall.length);
  }

  $: if (selectedVertex && selectedVertex.x != null && selectedVertex.y != null) {
    vertexXInput = selectedVertex.x.toFixed(2);
    vertexYInput = selectedVertex.y.toFixed(2);
  }

  function updateCeilingHeight(e: Event): void {
    const value = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(value) && value > 0) {
      roomStore.update(state => ({ ...state, ceilingHeight: value }));
    }
  }

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

  function handleNewLightDefinitionChange(e: Event): void {
    const newDefinitionId = (e.target as HTMLSelectElement).value;
    setSelectedDefinition(newDefinitionId);
  }

  function openLightManager(): void {
    dispatch('openLightManager');
  }

  function getDefinitionForLight(light: LightFixture): LightDefinition | undefined {
    return light.definitionId ? getDefinitionById(light.definitionId) : undefined;
  }

  function deleteSelectedLights(): void {
    if (currentSelectedLightIds.size === 0) return;

    roomStore.update(state => ({
      ...state,
      lights: state.lights.filter(l => !currentSelectedLightIds.has(l.id))
    }));
    clearLightSelection();
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

<div class="property-panel">
  <h3>Properties</h3>

  <div class="property-section">
    <h4>Room</h4>
    <label class="property-row">
      <span>Ceiling Height</span>
      <div class="input-group">
        <input
          type="number"
          min="1"
          max="50"
          step="0.5"
          value={currentRoom.ceilingHeight}
          on:change={updateCeilingHeight}
        />
        <span class="unit">ft</span>
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
  {:else if selectedLights.length > 1}
    <div class="property-section">
      <h4>{selectedLights.length} Lights Selected</h4>
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
      <h4>Light Fixture</h4>
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
  {:else if canPlace && currentTool === 'light'}
    <div class="property-section">
      <h4>New Light</h4>
      <label class="property-row definition-select">
        <span>Type</span>
        <select
          value={currentDefinitionId}
          on:change={handleNewLightDefinitionChange}
        >
          {#each definitions as def}
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
      <p class="wall-hint">Click inside the room to place a light with these settings.</p>
    </div>
  {:else}
    <div class="property-section hint">
      <p>Close the room polygon to edit walls and place lights.</p>
    </div>
  {/if}
</div>

<style>
  .property-panel {
    width: 250px;
    background: var(--panel-bg-alt);
    border-left: 1px solid var(--border-color);
    padding: 16px;
    overflow-y: auto;
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

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

  .length-input {
    width: 90px;
    padding: 4px 8px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-secondary);
    font-size: 13px;
    text-align: right;
  }

  .length-input:focus {
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
    color: #22c55e !important;
  }

  .light-count {
    color: #0066cc !important;
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

  .definition-select span:first-child {
    margin-bottom: 2px;
  }

  .definition-select select {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    font-size: 13px;
    background: var(--input-bg);
    color: var(--text-secondary);
    cursor: pointer;
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
    background: #ef4444;
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
</style>

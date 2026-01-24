<script lang="ts">
  import { roomStore, getVertices, updateVertexPosition, deleteVertex } from '../stores/roomStore';
  import { selectedVertexIndex, clearVertexSelection } from '../stores/appStore';
  import FloatingPanel from './FloatingPanel.svelte';
  import type { RoomState } from '../types';

  let currentRoom: RoomState;
  let currentSelectedVertexIndex: number | null;
  let selectedVertex: import('../types').Vector2 | null = null;
  let vertexXInput: string = '';
  let vertexYInput: string = '';

  $: currentRoom = $roomStore;
  $: currentSelectedVertexIndex = $selectedVertexIndex;

  $: {
    const vertices = getVertices(currentRoom);
    selectedVertex = currentSelectedVertexIndex !== null && currentSelectedVertexIndex < vertices.length
      ? vertices[currentSelectedVertexIndex]
      : null;
  }

  $: if (selectedVertex && selectedVertex.x != null && selectedVertex.y != null) {
    vertexXInput = selectedVertex.x.toFixed(2);
    vertexYInput = selectedVertex.y.toFixed(2);
  }

  $: visible = selectedVertex !== null;

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

  function handleClose(): void {
    clearVertexSelection();
  }
</script>

<FloatingPanel
  visible={visible}
  title="Vertex Properties"
  defaultX={window.innerWidth - 530}
  defaultY={16}
  minWidth="220px"
  maxWidth="320px"
  maxHeight="calc(100vh - 200px)"
  persistenceKey="vertex-properties-panel"
  showCloseButton={true}
  onClose={handleClose}
>
  {#if selectedVertex}
    <div class="property-section">
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
      <p class="hint">
        Drag the vertex or type new coordinates and press Enter.
        Double-click a wall to insert a new vertex.
      </p>
      {#if currentRoom.walls.length > 3}
        <button class="delete-button" on:click={deleteSelectedVertex}>
          Delete Vertex
        </button>
      {:else}
        <p class="hint warning">Cannot delete: minimum 3 vertices required.</p>
      {/if}
    </div>
  {/if}
</FloatingPanel>

<style>
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
  }

  .property-row span:first-child {
    font-size: 12px;
    color: var(--text-muted);
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .coord-input {
    width: 70px;
    padding: 4px 6px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    font-size: 13px;
    background: var(--input-bg);
    color: var(--text-primary);
    text-align: right;
    font-family: monospace;
  }

  .coord-input:focus {
    outline: none;
    border-color: var(--button-active);
  }

  .unit {
    font-size: 11px;
    color: var(--text-muted);
    min-width: 16px;
  }

  .hint {
    margin: 12px 0 0 0;
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
    font-style: italic;
    padding: 8px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 4px;
  }

  .hint.warning {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
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
    background: #dc2626;
  }
</style>
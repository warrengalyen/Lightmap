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
    <div class="panel-section">
      <label class="panel-row">
        <span>X</span>
        <div class="input-group">
          <input
            type="text"
            value={vertexXInput}
            on:input={handleVertexXChange}
            on:keydown={handleVertexKeydown}
            on:blur={applyVertexPosition}
            class="panel-input coord-input"
          />
          <span class="unit">ft</span>
        </div>
      </label>
      <label class="panel-row">
        <span>Y</span>
        <div class="input-group">
          <input
            type="text"
            value={vertexYInput}
            on:input={handleVertexYChange}
            on:keydown={handleVertexKeydown}
            on:blur={applyVertexPosition}
            class="panel-input coord-input"
          />
          <span class="unit">ft</span>
        </div>
      </label>
      <p class="panel-hint">
        Drag the vertex or type new coordinates and press Enter.
        Double-click a wall to insert a new vertex.
      </p>
      {#if currentRoom.walls.length > 3}
        <button class="panel-delete-btn" on:click={deleteSelectedVertex}>
          Delete Vertex
        </button>
      {:else}
        <p class="panel-hint warning">Cannot delete: minimum 3 vertices required.</p>
      {/if}
    </div>
  {/if}
</FloatingPanel>

<style>
  /* Component-specific styles only - shared styles in App.svelte */
  .input-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .coord-input {
    width: 70px;
  }

  .unit {
    font-size: 11px;
    color: var(--text-muted);
    min-width: 16px;
  }
</style>
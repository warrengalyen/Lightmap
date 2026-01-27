<script lang="ts">
  import { roomStore, updateObstacle, removeObstacle } from '../stores/roomStore';
  import { selectedObstacleId, clearObstacleSelection } from '../stores/appStore';
  import FloatingPanel from './FloatingPanel.svelte';
  import type { Obstacle, RoomState } from '../types';

  let currentRoom: RoomState;
  let currentSelectedObstacleId: string | null = null;
  let selectedObstacle: Obstacle | null = null;

  $: currentRoom = $roomStore;
  $: currentSelectedObstacleId = $selectedObstacleId;
  $: selectedObstacle = currentSelectedObstacleId
    ? (currentRoom.obstacles ?? []).find(o => o.id === currentSelectedObstacleId) ?? null
    : null;
  $: visible = selectedObstacle !== null;

  function updateHeight(e: Event): void {
    if (!currentSelectedObstacleId) return;
    const value = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(value) && value > 0) {
      updateObstacle(currentSelectedObstacleId, { height: value });
    }
  }

  function updateLabel(e: Event): void {
    if (!currentSelectedObstacleId) return;
    const value = (e.target as HTMLInputElement).value.trim();
    updateObstacle(currentSelectedObstacleId, { label: value || undefined });
  }

  function deleteSelectedObstacle(): void {
    if (!currentSelectedObstacleId) return;
    removeObstacle(currentSelectedObstacleId);
    clearObstacleSelection();
  }

  function handleClose(): void {
    clearObstacleSelection();
  }
</script>

<FloatingPanel
  visible={visible}
  title="Obstacle Properties"
  defaultX={window.innerWidth - 530}
  defaultY={16}
  minWidth="220px"
  maxWidth="320px"
  maxHeight="calc(100vh - 200px)"
  persistenceKey="obstacle-properties-panel"
  showCloseButton={true}
  onClose={handleClose}
>
  {#if selectedObstacle}
    <div class="panel-section">
      <label class="input-row">
        <span>Height (ft)</span>
        <input
          type="number"
          class="panel-input"
          value={selectedObstacle.height}
          min="0.5"
          max="20"
          step="0.5"
          on:change={updateHeight}
        />
      </label>

      <label class="input-row">
        <span>Label</span>
        <input
          type="text"
          class="panel-input text-input"
          value={selectedObstacle.label ?? ''}
          placeholder="e.g. Kitchen Island"
          on:change={updateLabel}
        />
      </label>

      <div class="panel-info-box">
        <div class="panel-info-row">
          <span>Walls</span>
          <span>{selectedObstacle.walls.length}</span>
        </div>
        <div class="panel-info-row">
          <span>Height</span>
          <span>{selectedObstacle.height} ft</span>
        </div>
      </div>

      <button class="panel-delete-btn" on:click={deleteSelectedObstacle}>
        Delete Obstacle
      </button>
    </div>
  {/if}
</FloatingPanel>

<style>
  .input-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .input-row span:first-child {
    font-size: 12px;
    color: var(--text-muted);
  }

  .text-input {
    text-align: left;
    font-family: inherit;
  }
</style>

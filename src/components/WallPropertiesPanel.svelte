<script lang="ts">
  import { roomStore, updateWallLength } from '../stores/roomStore';
  import { selectedWallId, clearWallSelection } from '../stores/appStore';
  import { formatImperial, parseImperial } from '../utils/format';
  import FloatingPanel from './FloatingPanel.svelte';
  import type { WallSegment, RoomState } from '../types';

  let currentRoom: RoomState;
  let currentSelectedWallId: string | null;
  let selectedWall: WallSegment | null = null;
  let wallLengthInput: string = '';

  $: currentRoom = $roomStore;
  $: currentSelectedWallId = $selectedWallId;

  $: selectedWall = currentSelectedWallId
    ? currentRoom.walls.find(w => w.id === currentSelectedWallId) ?? null
    : null;

  $: if (selectedWall) {
    wallLengthInput = formatImperial(selectedWall.length);
  }

  $: visible = selectedWall !== null;

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

  function handleClose(): void {
    clearWallSelection();
  }
</script>

<FloatingPanel
  visible={visible}
  title="Wall Properties"
  defaultX={window.innerWidth - 530}
  defaultY={16}
  minWidth="220px"
  maxWidth="320px"
  maxHeight="calc(100vh - 200px)"
  persistenceKey="wall-properties-panel"
  showCloseButton={true}
  onClose={handleClose}
>
  {#if selectedWall}
    <div class="property-section">
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
      <p class="hint">
        Type a new length and press Enter to apply.
        Format: 10' 6" or 10.5
      </p>
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

  .property-row.info {
    padding: 6px 0;
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .length-input {
    width: 90px;
    padding: 4px 6px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    font-size: 13px;
    background: var(--input-bg);
    color: var(--text-primary);
    text-align: right;
    font-family: monospace;
  }

  .length-input:focus {
    outline: none;
    border-color: var(--button-active);
  }

  .coords {
    font-size: 12px;
    color: var(--text-primary);
    font-family: monospace;
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
</style>
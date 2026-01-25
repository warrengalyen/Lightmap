<script lang="ts">
  import { roomStore, updateDoor, removeDoor } from '../stores/roomStore';
  import { selectedDoorId, clearDoorSelection } from '../stores/appStore';
  import { displayPreferences } from '../stores/settingsStore';
  import FloatingPanel from './FloatingPanel.svelte';
  import type { Door, RoomState, DoorSwingDirection, DoorSwingSide, UnitFormat } from '../types';
  import { DOOR_WIDTHS } from '../interactions/handlers/DoorPlacementHandler';
  import { formatImperial } from '../utils/format';

  let currentRoom: RoomState;
  let currentSelectedDoorId: string | null = null;
  let selectedDoor: Door | null = null;
  let unitFormat: UnitFormat;

  $: currentRoom = $roomStore;
  $: currentSelectedDoorId = $selectedDoorId;
  $: unitFormat = $displayPreferences.unitFormat;
  $: selectedDoor = currentSelectedDoorId
    ? currentRoom.doors.find(d => d.id === currentSelectedDoorId) ?? null
    : null;
  $: visible = selectedDoor !== null;

  // Generate door width options based on unit format
  $: doorWidthOptions = Object.entries(DOOR_WIDTHS).map(([label, value]) => ({
    label: unitFormat === 'inches' ? `${Math.round(value * 12)}"` : label,
    value
  }));

  function updateDoorWidth(e: Event): void {
    if (!currentSelectedDoorId) return;
    const newWidth = parseFloat((e.target as HTMLSelectElement).value);
    updateDoor(currentSelectedDoorId, { width: newWidth });
  }

  function updateSwingDirection(e: Event): void {
    if (!currentSelectedDoorId) return;
    const newDirection = (e.target as HTMLSelectElement).value as DoorSwingDirection;
    updateDoor(currentSelectedDoorId, { swingDirection: newDirection });
  }

  function updateSwingSide(e: Event): void {
    if (!currentSelectedDoorId) return;
    const newSide = (e.target as HTMLSelectElement).value as DoorSwingSide;
    updateDoor(currentSelectedDoorId, { swingSide: newSide });
  }

  function deleteSelectedDoor(): void {
    if (!currentSelectedDoorId) return;
    removeDoor(currentSelectedDoorId);
    clearDoorSelection();
  }

  function handleClose(): void {
    clearDoorSelection();
  }

  function formatWidth(width: number): string {
    return formatImperial(width, { format: unitFormat });
  }

  function formatPosition(position: number): string {
    return formatImperial(position, { format: unitFormat });
  }
</script>

<FloatingPanel
  visible={visible}
  title="Door Properties"
  defaultX={window.innerWidth - 530}
  defaultY={16}
  minWidth="220px"
  maxWidth="320px"
  maxHeight="calc(100vh - 200px)"
  persistenceKey="door-properties-panel"
  showCloseButton={true}
  onClose={handleClose}
>
  {#if selectedDoor}
    <div class="panel-section">
      <label class="select-row">
        <span>Width</span>
        <select class="panel-select" value={selectedDoor.width} on:change={updateDoorWidth}>
          {#each doorWidthOptions as { label, value }}
            <option value={value}>{label}</option>
          {/each}
        </select>
      </label>

      <label class="select-row">
        <span>Hinge Side</span>
        <select class="panel-select" value={selectedDoor.swingDirection} on:change={updateSwingDirection}>
          <option value="right">Right</option>
          <option value="left">Left</option>
        </select>
      </label>

      <label class="select-row">
        <span>Swing Side</span>
        <select class="panel-select" value={selectedDoor.swingSide ?? 'inside'} on:change={updateSwingSide}>
          <option value="inside">Inside</option>
          <option value="outside">Outside</option>
        </select>
      </label>

      <div class="panel-info-box">
        <div class="panel-info-row">
          <span>Position on Wall</span>
          <span>{formatPosition(selectedDoor.position)}</span>
        </div>
        <div class="panel-info-row">
          <span>Current Width</span>
          <span>{formatWidth(selectedDoor.width)}</span>
        </div>
      </div>

      <button class="panel-delete-btn" on:click={deleteSelectedDoor}>
        Delete Door
      </button>
    </div>
  {/if}
</FloatingPanel>

<style>
  /* Component-specific styles only - shared styles in App.svelte */
  .select-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .select-row span:first-child {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
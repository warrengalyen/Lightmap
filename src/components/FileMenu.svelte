<script lang="ts">
  import { roomStore, resetRoom } from '../stores/roomStore';
  import { clearSelection } from '../stores/appStore';
  import { exportToJSON } from '../persistence/jsonExport';
  import { importFromJSON } from '../persistence/jsonImport';
  import { saveNow, clearLocalStorage } from '../persistence/localStorage';
  import type { RoomState } from '../types';

  let currentRoom: RoomState;
  let fileInput: HTMLInputElement;

  $: currentRoom = $roomStore;

  function handleNew(): void {
    if (currentRoom.walls.length > 0 || currentRoom.lights.length > 0) {
      if (!confirm('Start a new project? Unsaved changes will be lost.')) {
        return;
      }
    }
    clearLocalStorage();
    resetRoom();
    clearSelection();
  }

  function handleSave(): void {
    saveNow(currentRoom);
    alert('Project saved to browser storage.');
  }

  function handleExport(): void {
    exportToJSON(currentRoom);
  }

  function handleImportClick(): void {
    fileInput.click();
  }

  async function handleFileSelect(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const imported = await importFromJSON(file);
      roomStore.set(imported);
      clearSelection();
      alert('Project imported successfully.');
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    input.value = '';
  }
</script>

<div class="file-menu">
  <button on:click={handleNew} title="New Project">
    New
  </button>
  <button on:click={handleSave} title="Save to Browser">
    Save
  </button>
  <button on:click={handleExport} title="Export as JSON">
    Export
  </button>
  <button on:click={handleImportClick} title="Import JSON">
    Import
  </button>
  <input
    type="file"
    accept=".json"
    bind:this={fileInput}
    on:change={handleFileSelect}
    style="display: none"
  />
</div>

<style>
  .file-menu {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }

  button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  button:hover {
    background: #f5f5f5;
    border-color: #ccc;
  }
</style>
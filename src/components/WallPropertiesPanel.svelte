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
        ? (currentRoom.walls.find((w) => w.id === currentSelectedWallId) ?? null)
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
    {visible}
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
        <div class="panel-section">
            <label class="panel-row">
                <span>Length</span>
                <div class="input-group">
                    <input
                        type="text"
                        value={wallLengthInput}
                        on:input={handleWallLengthChange}
                        on:keydown={handleWallLengthKeydown}
                        on:blur={applyWallLength}
                        class="panel-input length-input"
                        placeholder="e.g., 10' 6&quot;"
                    />
                </div>
            </label>
            <div class="panel-row info">
                <span>Start</span>
                <span class="panel-coords">
                    ({selectedWall.start.x.toFixed(1)}, {selectedWall.start.y.toFixed(1)})
                </span>
            </div>
            <div class="panel-row info">
                <span>End</span>
                <span class="panel-coords">
                    ({selectedWall.end.x.toFixed(1)}, {selectedWall.end.y.toFixed(1)})
                </span>
            </div>
            <p class="panel-hint">
                Type a new length and press Enter to apply. Format: 10' 6" or 10.5
            </p>
        </div>
    {/if}
</FloatingPanel>

<style>
    /* Component-specific styles only - shared styles in App.svelte */
    .info {
        padding: 6px 0;
    }

    .input-group {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .length-input {
        width: 90px;
    }
</style>

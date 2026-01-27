<script lang="ts">
    import { roomStore } from '../stores/roomStore';
    import { formatImperial, parseImperial } from '../utils/format';
    import { displayPreferences, toggleUnitFormat } from '../stores/settingsStore';
    import { propertiesPanelConfig, togglePropertiesPanel } from '../stores/propertiesPanelStore';
    import FloatingPanel from './FloatingPanel.svelte';
    import type { RoomState, PropertiesPanelConfig } from '../types';

    let config: PropertiesPanelConfig;
    let currentRoom: RoomState;
    let ceilingHeightInput: string = '';
    let unitFormat: 'feet-inches' | 'inches';

    $: config = $propertiesPanelConfig;
    $: currentRoom = $roomStore;
    $: unitFormat = $displayPreferences.unitFormat;
    $: ceilingHeightInput = formatImperial(currentRoom.ceilingHeight);

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
            roomStore.update((state) => ({ ...state, ceilingHeight: newHeight }));
        } else {
            // Reset to current value if invalid
            ceilingHeightInput = formatImperial(currentRoom.ceilingHeight);
        }
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
        <div class="property-row info">
            <span>Doors</span>
            <span>{currentRoom.doors.length}</span>
        </div>
        <div class="property-row">
            <span>Units</span>
            <button class="unit-toggle" on:click={toggleUnitFormat} title="Toggle Units (U)">
                {unitFormat === 'feet-inches' ? 'ft\' in"' : 'in"'}
            </button>
        </div>
    </div>
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

    .height-input:focus {
        outline: none;
        border-color: var(--button-active);
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

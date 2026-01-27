<script lang="ts">
    import { rafterConfig, setRafterOrientation, setRafterSpacing } from '../stores/settingsStore';
    import FloatingPanel from './FloatingPanel.svelte';
    import type { RafterConfig } from '../types';

    let config: RafterConfig;
    $: config = $rafterConfig;

    function handleOrientationChange(e: Event): void {
        const value = (e.target as HTMLSelectElement).value as 'horizontal' | 'vertical';
        setRafterOrientation(value);
    }

    function handleSpacingChange(e: Event): void {
        const inches = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(inches) && inches > 0) {
            setRafterSpacing(inches / 12);
        }
    }

    function handleOffsetChange(axis: 'offsetX' | 'offsetY', e: Event): void {
        const inches = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(inches)) {
            rafterConfig.update((c) => ({ ...c, [axis]: inches / 12 }));
        }
    }
</script>

<FloatingPanel
    visible={config.visible}
    title="Rafter Settings"
    defaultX={16}
    defaultY={60}
    minWidth="200px"
    persistenceKey="rafter-controls-panel"
>
    <div class="rafter-content">
        <label class="control-row">
            <span>Orientation</span>
            <select value={config.orientation} on:change={handleOrientationChange}>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
            </select>
        </label>

        <label class="control-row">
            <span>Spacing</span>
            <div class="input-group">
                <input
                    type="number"
                    min="1"
                    max="48"
                    step="1"
                    value={Math.round(config.spacing * 12)}
                    on:change={handleSpacingChange}
                />
                <span class="unit">in</span>
            </div>
        </label>

        <label class="control-row">
            <span>Offset X</span>
            <div class="input-group">
                <input
                    type="number"
                    min="-48"
                    max="48"
                    step="1"
                    value={Math.round(config.offsetX * 12)}
                    on:change={(e) => handleOffsetChange('offsetX', e)}
                />
                <span class="unit">in</span>
            </div>
        </label>

        <label class="control-row">
            <span>Offset Y</span>
            <div class="input-group">
                <input
                    type="number"
                    min="-48"
                    max="48"
                    step="1"
                    value={Math.round(config.offsetY * 12)}
                    on:change={(e) => handleOffsetChange('offsetY', e)}
                />
                <span class="unit">in</span>
            </div>
        </label>
    </div>
</FloatingPanel>

<style>
    .rafter-content {
        padding: 0;
    }

    .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
    }

    .control-row span:first-child {
        color: var(--text-muted);
    }

    select {
        padding: 4px 8px;
        border: 1px solid var(--input-border);
        border-radius: 4px;
        font-size: 13px;
        background: var(--input-bg);
        color: var(--text-secondary);
    }

    .input-group {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    input[type='number'] {
        width: 60px;
        padding: 4px 8px;
        border: 1px solid var(--input-border);
        border-radius: 4px;
        font-size: 13px;
        background: var(--input-bg);
        color: var(--text-secondary);
        text-align: right;
    }

    .unit {
        font-size: 12px;
        color: var(--text-muted);
        min-width: 20px;
    }
</style>

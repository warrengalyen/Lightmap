<script lang="ts">
    import { activeTool } from '../stores/appStore';
    import { roomStore } from '../stores/roomStore';
    import { formatImperial } from '../utils/format';
    import type { Vector2, Tool } from '../types';

    export let mousePos: Vector2 = { x: 0, y: 0 };
    export let snapType: string = '';

    let currentTool: Tool;
    let isClosed: boolean;

    $: currentTool = $activeTool;
    $: isClosed = $roomStore.isClosed;

    function formatCoord(value: number): string {
        return formatImperial(value, { decimal: false });
    }
</script>

<div class="status-bar">
    <div class="status-section">
        <span class="value coords">{formatCoord(mousePos.x)}, {formatCoord(mousePos.y)}</span>
    </div>

    {#if snapType && snapType !== 'none'}
        <div class="status-section snap-indicator">
            <span class="snap-badge">{snapType}</span>
        </div>
    {/if}

    <div class="status-section">
        <span class="label">Room:</span>
        <span class="value" class:status-closed={isClosed} class:status-open={!isClosed}>
            {isClosed ? 'Closed' : 'Open'}
        </span>
    </div>

    <div class="status-spacer"></div>

    <div class="status-section hints">
        {#if currentTool === 'draw' && !isClosed}
            <span>Click to place vertices | ESC to cancel | Close polygon to finish</span>
        {:else if currentTool === 'light' && isClosed}
            <span>Click inside room to place light</span>
        {:else if currentTool === 'select'}
            <span>Click to select | DEL to delete | Scroll to zoom | Alt+drag to pan</span>
        {/if}
    </div>
</div>

<style>
    .status-bar {
        display: flex;
        align-items: center;
        gap: var(--spacing-16);
        padding: 6px var(--spacing-16);
        background: var(--status-bar-bg);
        border-top: 1px solid var(--border-color);
        font-size: 12px;
    }

    .status-section {
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
    }

    .label {
        color: var(--text-muted);
    }

    .value {
        color: var(--text-secondary);
        font-weight: 500;
    }

    .coords {
        font-family: monospace;
        min-width: 120px;
    }

    .status-closed {
        color: var(--status-success);
    }

    .status-open {
        color: var(--status-warning);
    }

    .snap-badge {
        display: inline-block;
        padding: 2px var(--spacing-8);
        background: var(--status-info);
        color: white;
        border-radius: var(--radius-sm);
        font-size: 11px;
        text-transform: capitalize;
    }

    .status-spacer {
        flex: 1;
    }

    .hints {
        color: var(--text-muted);
        font-style: italic;
    }
</style>

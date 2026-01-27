<script lang="ts">
    import {
        lightingStatsConfig,
        lightingMetrics,
        setRoomType,
    } from '../stores/lightingStatsStore';
    import type { LightingMetrics, LightingStatsConfig, RoomType } from '../types';
    import { ROOM_LIGHTING_STANDARDS } from '../types';

    let config: LightingStatsConfig;
    let metrics: LightingMetrics | null;
    let expanded = false;

    $: config = $lightingStatsConfig;
    $: metrics = $lightingMetrics;

    function getGradeColor(grade: string): string {
        switch (grade) {
            case 'A':
                return 'var(--status-success)';
            case 'B':
                return '#84cc16';
            case 'C':
                return 'var(--status-warning)';
            case 'D':
                return '#f97316';
            case 'F':
                return 'var(--status-error)';
            default:
                return 'var(--text-muted)';
        }
    }

    function formatLux(lux: number): string {
        return lux.toFixed(1);
    }

    function formatPercent(ratio: number): string {
        return (ratio * 100).toFixed(0) + '%';
    }

    function formatNumber(n: number): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    function toggleExpanded(): void {
        expanded = !expanded;
    }

    function handleRoomTypeChange(e: Event): void {
        const value = (e.target as HTMLSelectElement).value as RoomType;
        setRoomType(value);
    }

    const roomTypes: { value: RoomType; label: string }[] = [
        { value: 'living', label: 'Living Room' },
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'bedroom', label: 'Bedroom' },
        { value: 'bathroom', label: 'Bathroom' },
        { value: 'office', label: 'Home Office' },
        { value: 'hallway', label: 'Hallway' },
    ];
</script>

{#if config.visible && metrics}
    <div class="stats-panel" class:expanded>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="stats-collapsed" on:click={toggleExpanded}>
            <span class="grade" style="color: {getGradeColor(metrics.coverageGrade)}">
                {metrics.coverageGrade}
            </span>
            <span class="summary">
                {formatNumber(metrics.totalLumens)} lm &middot; {formatNumber(metrics.roomArea)} ft²
            </span>
            <span class="toggle-icon">{expanded ? '▾' : '▴'}</span>
        </div>

        {#if expanded}
            <div class="stats-expanded">
                <div class="stat-row">
                    <span class="stat-label">Room Type</span>
                    <select
                        value={config.roomType}
                        on:change={handleRoomTypeChange}
                        on:click|stopPropagation
                    >
                        {#each roomTypes as rt (rt.value)}
                            <option value={rt.value}>{rt.label}</option>
                        {/each}
                    </select>
                </div>

                <div class="stat-row">
                    <span class="stat-label">Lumens/ft²</span>
                    <span class="stat-value">{metrics.lumensPerSqFt.toFixed(1)}</span>
                </div>

                <div class="stat-row">
                    <span class="stat-label">Recommended</span>
                    <span class="stat-value">{formatNumber(metrics.recommendedLumens)} lm</span>
                </div>

                <div class="stat-row">
                    <span class="stat-label">Uniformity</span>
                    <span class="stat-value">{formatPercent(metrics.uniformityRatio)}</span>
                </div>

                <div class="stat-row">
                    <span class="stat-label">Min/Max Lux</span>
                    <span class="stat-value"
                        >{formatLux(metrics.minLux)} - {formatLux(metrics.maxLux)}</span
                    >
                </div>

                {#if metrics.additionalLightsNeeded > 0}
                    <div class="recommendation warn">
                        Add {metrics.additionalLightsNeeded} more light{metrics.additionalLightsNeeded >
                        1
                            ? 's'
                            : ''}
                    </div>
                {:else}
                    <div class="recommendation good">
                        Sufficient for {ROOM_LIGHTING_STANDARDS[
                            metrics.roomType
                        ].label.toLowerCase()}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<style>
    .stats-panel {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--panel-bg);
        border-top: 1px solid var(--border-color);
        z-index: 10;
    }

    .stats-collapsed {
        display: flex;
        align-items: center;
        gap: 12px;
        height: 48px;
        padding: 0 16px;
        cursor: pointer;
        user-select: none;
    }

    .stats-collapsed:hover {
        background: var(--button-bg-hover);
    }

    .grade {
        font-size: 24px;
        font-weight: 700;
        line-height: 1;
    }

    .summary {
        flex: 1;
        font-size: 13px;
        color: var(--text-secondary);
        font-family: monospace;
    }

    .toggle-icon {
        font-size: 12px;
        color: var(--text-muted);
    }

    .stats-expanded {
        padding: 0 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
    }

    .stat-label {
        color: var(--text-muted);
    }

    .stat-value {
        font-family: monospace;
        color: var(--text-primary);
        font-weight: 500;
    }

    .stat-row select {
        padding: 4px 8px;
        border: 1px solid var(--input-border);
        border-radius: 4px;
        font-size: 12px;
        background: var(--input-bg);
        color: var(--text-secondary);
    }

    .recommendation {
        text-align: center;
        font-size: 12px;
        padding: 6px 8px;
        border-radius: 4px;
        margin-top: 4px;
    }

    .recommendation.warn {
        background: #3e3320;
        border: 1px solid #5c4d1f;
        color: #ffcc66;
    }

    .recommendation.good {
        background: #1f3e2d;
        border: 1px solid #28a745;
        color: #66ff88;
    }
</style>

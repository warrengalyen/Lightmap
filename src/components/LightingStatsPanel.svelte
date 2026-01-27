<script lang="ts">
  import { lightingStatsConfig, lightingMetrics, setRoomType, toggleLightingStats } from '../stores/lightingStatsStore';
  import FloatingPanel from './FloatingPanel.svelte';
  import type { LightingMetrics, LightingStatsConfig, RoomType } from '../types';
  import { ROOM_LIGHTING_STANDARDS } from '../types';

  let config: LightingStatsConfig;
  let metrics: LightingMetrics | null;

  $: config = $lightingStatsConfig;
  $: metrics = $lightingMetrics;

  function getGradeColor(grade: string): string {
    switch (grade) {
      case 'A': return 'var(--status-success)';
      case 'B': return '#84cc16'; // lime-500 - between success and warning
      case 'C': return 'var(--status-warning)';
      case 'D': return '#f97316'; // orange-500 - between warning and error
      case 'F': return 'var(--status-error)';
      default: return 'var(--text-muted)';
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

<FloatingPanel
  visible={config.visible}
  title="Lighting Analysis"
  defaultX={16}
  defaultY={16}
  minWidth="300px"
  maxHeight="calc(100vh - 100px)"
  persistenceKey="lighting-stats-panel"
  showCloseButton={true}
  onClose={toggleLightingStats}
>
  <div class="room-type-selector">
      <label>
        <span>Room Type</span>
        <select value={config.roomType} on:change={handleRoomTypeChange}>
          {#each roomTypes as rt (rt.value)}
            <option value={rt.value}>{rt.label}</option>
          {/each}
        </select>
      </label>
    </div>

    {#if metrics}
      <div class="grade-section">
        <span class="grade-label">Grade</span>
        <span class="grade-value" style="color: {getGradeColor(metrics.coverageGrade)}">
          {metrics.coverageGrade}
        </span>
      </div>

      <div class="metrics-section primary">
        <div class="metric-row highlight">
          <span class="metric-label">Total Lumens</span>
          <span class="metric-value">{formatNumber(metrics.totalLumens)}</span>
        </div>
        <div class="metric-row highlight">
          <span class="metric-label">Room Area</span>
          <span class="metric-value">{formatNumber(metrics.roomArea)} ft²</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Lumens/ft²</span>
          <span class="metric-value">{metrics.lumensPerSqFt.toFixed(1)}</span>
        </div>
        <div class="metric-row recommended">
          <span class="metric-label">Recommended</span>
          <span class="metric-value">{formatNumber(metrics.recommendedLumens)} lm</span>
        </div>
      </div>

      {#if metrics.additionalLightsNeeded > 0}
        <div class="recommendation">
          Add <strong>{metrics.additionalLightsNeeded}</strong> more light{metrics.additionalLightsNeeded > 1 ? 's' : ''} for ideal brightness
        </div>
      {:else}
        <div class="recommendation good">
          Brightness is sufficient for a {ROOM_LIGHTING_STANDARDS[metrics.roomType].label.toLowerCase()}
        </div>
      {/if}

      <div class="metrics-section secondary">
        <div class="section-title">Distribution</div>
        <div class="metric-row">
          <span class="metric-label">Uniformity</span>
          <span class="metric-value">{formatPercent(metrics.uniformityRatio)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Min/Max Lux</span>
          <span class="metric-value">{formatLux(metrics.minLux)} - {formatLux(metrics.maxLux)}</span>
        </div>
      </div>
  {:else}
    <div class="no-data">
      Draw a closed room and add lights to see analysis
    </div>
  {/if}
</FloatingPanel>

<style>
  .room-type-selector {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .room-type-selector label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .room-type-selector span {
    color: var(--text-muted);
  }

  .room-type-selector select {
    padding: 4px 8px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    font-size: 13px;
    background: var(--input-bg);
    color: var(--text-secondary);
  }

  .grade-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .grade-label {
    font-size: 13px;
    color: var(--text-muted);
  }

  .grade-value {
    font-size: 32px;
    font-weight: 700;
  }

  .metrics-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .metrics-section.primary {
    margin-bottom: 12px;
  }

  .metrics-section.secondary {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .metric-row.highlight {
    font-weight: 500;
  }

  .metric-row.recommended {
    color: var(--text-muted);
    font-style: italic;
  }

  .metric-label {
    color: var(--text-muted);
  }

  .metric-value {
    font-family: monospace;
    color: var(--text-primary);
    font-weight: 500;
  }

  .recommendation {
    background: #3e3320;
    border: 1px solid #5c4d1f;
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 12px;
    color: #ffcc66;
    text-align: center;
  }

  .recommendation.good {
    background: #1f3e2d;
    border-color: #28a745;
    color: #66ff88;
  }

  .recommendation strong {
    font-weight: 600;
  }

  .no-data {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    padding: 8px 0;
  }
</style>
<script lang="ts">
  import { lightingStatsConfig, lightingMetrics, setRoomType } from '../stores/lightingStatsStore';
  import type { LightingMetrics, LightingStatsConfig, RoomType } from '../types';
  import { ROOM_LIGHTING_STANDARDS } from '../types';

  let config: LightingStatsConfig;
  let metrics: LightingMetrics | null;

  $: config = $lightingStatsConfig;
  $: metrics = $lightingMetrics;

  function getGradeColor(grade: string): string {
    switch (grade) {
      case 'A': return '#22c55e';
      case 'B': return '#84cc16';
      case 'C': return '#eab308';
      case 'D': return '#f97316';
      case 'F': return '#ef4444';
      default: return '#666';
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

{#if config.visible}
  <div class="stats-panel">
    <h4>Lighting Analysis</h4>

    <div class="room-type-selector">
      <label>
        <span>Room Type</span>
        <select value={config.roomType} on:change={handleRoomTypeChange}>
          {#each roomTypes as rt}
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
  </div>
{/if}

<style>
  .stats-panel {
    position: absolute;
    top: 16px;
    right: 280px;
    background: rgba(255, 255, 255, 0.98);
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    z-index: 100;
    min-width: 220px;
    border: 1px solid #ddd;
  }

  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
  }

  .room-type-selector {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
  }

  .room-type-selector label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .room-type-selector span {
    color: #666;
  }

  .room-type-selector select {
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
    background: white;
  }

  .grade-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
  }

  .grade-label {
    font-size: 13px;
    color: #666;
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
    border-top: 1px solid #eee;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: #999;
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
    color: #666;
    font-style: italic;
  }

  .metric-label {
    color: #666;
  }

  .metric-value {
    font-family: monospace;
    color: #333;
    font-weight: 500;
  }

  .recommendation {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 12px;
    color: #856404;
    text-align: center;
  }

  .recommendation.good {
    background: #d4edda;
    border-color: #28a745;
    color: #155724;
  }

  .recommendation strong {
    font-weight: 600;
  }

  .no-data {
    font-size: 12px;
    color: #888;
    text-align: center;
    padding: 8px 0;
  }
</style>
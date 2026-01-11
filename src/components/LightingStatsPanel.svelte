<script lang="ts">
  import { lightingStatsConfig, lightingMetrics } from '../stores/lightingStatsStore';
  import type { LightingMetrics, LightingStatsConfig } from '../types';

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
</script>

{#if config.visible}
  <div class="stats-panel">
    <h4>Lighting Stats</h4>

    {#if metrics}
      <div class="grade-section">
        <span class="grade-label">Grade</span>
        <span class="grade-value" style="color: {getGradeColor(metrics.coverageGrade)}">
          {metrics.coverageGrade}
        </span>
      </div>

      <div class="metrics-section">
        <div class="metric-row">
          <span class="metric-label">Min Lux</span>
          <span class="metric-value">{formatLux(metrics.minLux)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Max Lux</span>
          <span class="metric-value">{formatLux(metrics.maxLux)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Avg Lux</span>
          <span class="metric-value">{formatLux(metrics.avgLux)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Uniformity</span>
          <span class="metric-value">{formatPercent(metrics.uniformityRatio)}</span>
        </div>
      </div>

      <div class="sample-info">
        {metrics.sampleCount} sample points
      </div>
    {:else}
      <div class="no-data">
        Draw a closed room and add lights to see stats
      </div>
    {/if}
  </div>
{/if}

<style>
  .stats-panel {
    position: absolute;
    top: 16px;
    right: 280px;
    background: rgba(255, 255, 255, 0.95);
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    z-index: 100;
    min-width: 180px;
    border: 1px solid #ddd;
  }

  h4 {
    margin: 0 0 12px 0;
    font-size: 13px;
    font-weight: 600;
    color: #333;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
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
    font-size: 28px;
    font-weight: 700;
  }

  .metrics-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .metric-label {
    color: #666;
  }

  .metric-value {
    font-family: monospace;
    color: #333;
    font-weight: 500;
  }

  .sample-info {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #eee;
    font-size: 11px;
    color: #999;
    text-align: center;
  }

  .no-data {
    font-size: 12px;
    color: #888;
    text-align: center;
    padding: 8px 0;
  }
</style>
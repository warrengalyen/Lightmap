<script lang="ts">
  import { onMount } from 'svelte';
  import { lightingStatsConfig, lightingMetrics, setRoomType, toggleLightingStats } from '../stores/lightingStatsStore';
  import type { LightingMetrics, LightingStatsConfig, RoomType } from '../types';
  import { ROOM_LIGHTING_STANDARDS } from '../types';

  let config: LightingStatsConfig;
  let metrics: LightingMetrics | null;

  $: config = $lightingStatsConfig;
  $: metrics = $lightingMetrics;

  // Drag state
  let panelElement: HTMLDivElement;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let position = { x: -1, y: -1 }; // -1 means use default CSS position

  function handleMouseDown(e: MouseEvent): void {
    // Only drag from the header area
    const target = e.target as HTMLElement;
    if (target.closest('select') || target.closest('button')) return;

    isDragging = true;
    const rect = panelElement.getBoundingClientRect();
    const parentRect = panelElement.parentElement?.getBoundingClientRect() || { left: 0, top: 0 };

    // Initialize position if first drag
    if (position.x === -1) {
      position.x = rect.left - parentRect.left;
      position.y = rect.top - parentRect.top;
    }

    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!isDragging || !panelElement.parentElement) return;

    const parentRect = panelElement.parentElement.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();

    let newX = e.clientX - parentRect.left - dragOffset.x;
    let newY = e.clientY - parentRect.top - dragOffset.y;

    // Constrain to parent bounds
    newX = Math.max(0, Math.min(newX, parentRect.width - panelRect.width));
    newY = Math.max(0, Math.min(newY, parentRect.height - panelRect.height));

    position = { x: newX, y: newY };
  }

  function handleMouseUp(): void {
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

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
  <div
    class="stats-panel"
    class:dragging={isDragging}
    bind:this={panelElement}
    style={position.x >= 0 ? `left: ${position.x}px; top: ${position.y}px; right: auto;` : ''}
  >
    <div class="panel-header" on:mousedown={handleMouseDown}>
      <h4>Lighting Analysis</h4>
      <button class="close-button" on:click={toggleLightingStats} title="Close (Q)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

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
    background: rgba(45, 45, 48, 0.95);
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    z-index: 100;
    min-width: 220px;
    border: 1px solid var(--border-color);
    user-select: none;
  }

  .stats-panel.dragging {
    opacity: 0.9;
    cursor: grabbing;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: -16px -16px 12px -16px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px 8px 0 0;
    cursor: grab;
  }

  .panel-header:active {
    cursor: grabbing;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }

  .close-button svg {
    width: 14px;
    height: 14px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

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

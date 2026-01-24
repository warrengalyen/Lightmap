<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { bringPanelToFront, panelZIndices } from '../stores/panelZIndexStore';

  export let visible: boolean = true;
  export let title: string;
  export let defaultX: number = 16;
  export let defaultY: number = 16;
  export let minWidth: string = '200px';
  export let maxWidth: string | null = null;
  export let maxHeight: string = 'calc(100vh - 200px)';
  export let persistenceKey: string | null = null;
  export let draggable: boolean = true;
  export let showCloseButton: boolean = false;
  export let onClose: (() => void) | null = null;

  let panelElement: HTMLDivElement;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let position = { x: -1, y: -1 }; // -1 means use default position
  let zIndex = 1000;

  // Update z-index reactively
  $: if (persistenceKey) {
    zIndex = $panelZIndices[persistenceKey] ?? 1000;
  }

  // Load position from localStorage if persistenceKey provided
  onMount(() => {
    if (persistenceKey) {
      const savedPosition = localStorage.getItem(`floating-panel-${persistenceKey}`);
      if (savedPosition) {
        try {
          const parsed = JSON.parse(savedPosition);
          position = parsed;
        } catch (e) {
          // Invalid JSON, use defaults
          position = { x: defaultX, y: defaultY };
        }
      } else {
        position = { x: defaultX, y: defaultY };
      }
    } else {
      position = { x: defaultX, y: defaultY };
    }
  });

  // Save position to localStorage when it changes
  $: if (persistenceKey && position.x >= 0 && position.y >= 0) {
    localStorage.setItem(`floating-panel-${persistenceKey}`, JSON.stringify(position));
  }

  function handleMouseDown(e: MouseEvent): void {
    if (!draggable) return;

    // Bring panel to front when clicked
    if (persistenceKey) {
      bringPanelToFront(persistenceKey);
    }

    // Only drag from the header area, not from interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('select') || target.closest('button') || target.closest('input')) return;

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

  onDestroy(() => {
    // Clean up event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  });

  function handleClose(): void {
    if (onClose) {
      onClose();
    }
  }
</script>

{#if visible}
  <div
    class="floating-panel"
    class:dragging={isDragging}
    class:draggable
    bind:this={panelElement}
    style:left={position.x >= 0 ? `${position.x}px` : undefined}
    style:top={position.y >= 0 ? `${position.y}px` : undefined}
    style:min-width={minWidth}
    style:max-width={maxWidth}
    style:max-height={maxHeight}
    style:z-index={zIndex}
  >
    <div class="panel-header" on:mousedown={handleMouseDown} role="banner">
      <h3>{title}</h3>
      {#if showCloseButton}
        <button class="close-button" on:click={handleClose} title="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      {/if}
    </div>

    <div class="panel-content">
      <slot></slot>
    </div>
  </div>
{/if}

<style>
  .floating-panel {
    position: absolute;
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .floating-panel.draggable .panel-header {
    cursor: move;
  }

  .floating-panel.dragging {
    opacity: 0.9;
    user-select: none;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-12) var(--spacing-16);
    background: var(--panel-bg-alt);
    border-bottom: 1px solid var(--border-color);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-button {
    width: 20px;
    height: 20px;
    padding: 0;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }

  .close-button:hover {
    background: var(--button-bg-hover);
    color: var(--text-primary);
  }

  .close-button svg {
    width: 14px;
    height: 14px;
  }

  .panel-content {
    padding: var(--spacing-16);
    overflow-y: auto;
    flex: 1;
  }

  /* Scrollbar styling */
  .panel-content::-webkit-scrollbar {
    width: 8px;
  }

  .panel-content::-webkit-scrollbar-track {
    background: var(--panel-bg);
  }

  .panel-content::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: var(--radius-sm);
  }

  .panel-content::-webkit-scrollbar-thumb:hover {
    background: var(--button-bg-hover);
  }
</style>

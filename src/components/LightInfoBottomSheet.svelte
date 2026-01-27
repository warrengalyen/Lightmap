<script lang="ts">
    import { selectedViewerLight } from '../stores/viewerStore';
    import { DEFAULT_LIGHT_DEFINITIONS } from '../types/lighting';
    import { formatImperial } from '../utils/format';

    $: light = $selectedViewerLight;
    $: definition = light?.definitionId
        ? DEFAULT_LIGHT_DEFINITIONS.find((d) => d.id === light.definitionId)
        : null;

    let isClosing = false;
    let sheetElement: HTMLDivElement;
    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let translateY = 0;
    let isSwipeClose = false;

    function handleClose(fromSwipe = false): void {
        isClosing = true;
        isSwipeClose = fromSwipe;

        if (fromSwipe) {
            // For swipe close, animate from current position to fully off-screen
            translateY = window.innerHeight;
            // Wait for the transform transition to complete
            setTimeout(() => {
                selectedViewerLight.set(null);
                isClosing = false;
                isSwipeClose = false;
                translateY = 0;
            }, 300);
        } else {
            // For button/backdrop close, use CSS animation
            setTimeout(() => {
                selectedViewerLight.set(null);
                isClosing = false;
                translateY = 0;
            }, 300);
        }
    }

    function handleBackdropClick(e: MouseEvent): void {
        if (e.target === e.currentTarget) {
            handleClose(false);
        }
    }

    function handleTouchStart(e: TouchEvent): void {
        // Only handle touches on the handle bar area
        const target = e.target as HTMLElement;
        if (!target.closest('.handle-bar') && !target.closest('.sheet-header')) {
            return;
        }

        isDragging = true;
        startY = e.touches[0].clientY;
        currentY = startY;
    }

    function handleTouchMove(e: TouchEvent): void {
        if (!isDragging) return;

        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        // Only allow dragging down
        if (deltaY > 0) {
            translateY = deltaY;
            e.preventDefault();
        }
    }

    function handleTouchEnd(): void {
        if (!isDragging) return;

        isDragging = false;
        const deltaY = currentY - startY;

        // Close if dragged down more than 100px
        if (deltaY > 100) {
            handleClose(true);
        } else {
            // Snap back to original position
            translateY = 0;
        }
    }
</script>

{#if light}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="backdrop" class:closing={isClosing && !isSwipeClose} on:click={handleBackdropClick}>
        <div
            class="bottom-sheet"
            class:closing={isClosing && !isSwipeClose}
            class:dragging={isDragging}
            bind:this={sheetElement}
            style="transform: translateY({translateY}px)"
            on:touchstart={handleTouchStart}
            on:touchmove={handleTouchMove}
            on:touchend={handleTouchEnd}
            on:touchcancel={handleTouchEnd}
        >
            <div class="handle-bar"></div>

            <div class="sheet-header">
                <h3>Light Information</h3>
                <button class="close-btn" on:click={handleClose} aria-label="Close">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <div class="sheet-content">
                {#if definition}
                    <div class="info-row">
                        <span class="label">Light Type</span>
                        <span class="value">{definition.name}</span>
                    </div>
                {/if}

                <div class="info-row">
                    <span class="label">Position</span>
                    <span class="value"
                        >{formatImperial(light.position.x)}, {formatImperial(
                            light.position.y
                        )}</span
                    >
                </div>

                <div class="info-row">
                    <span class="label">Brightness</span>
                    <span class="value">{light.properties.lumen} lm</span>
                </div>

                <div class="info-row">
                    <span class="label">Beam Angle</span>
                    <span class="value">{light.properties.beamAngle}°</span>
                </div>

                <div class="info-row">
                    <span class="label">Warmth</span>
                    <span class="value">{light.properties.warmth}K</span>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: flex-end;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
    }

    .backdrop.closing {
        animation: fadeOut 0.3s ease-out;
    }

    @keyframes fadeIn {
        from {
            background: rgba(0, 0, 0, 0);
        }
        to {
            background: rgba(0, 0, 0, 0.3);
        }
    }

    @keyframes fadeOut {
        from {
            background: rgba(0, 0, 0, 0.3);
        }
        to {
            background: rgba(0, 0, 0, 0);
        }
    }

    .bottom-sheet {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: var(--panel-bg);
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        box-shadow: var(--shadow-xl);
        animation: slideUp 0.3s ease-out;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        transition: transform 0.2s ease-out;
        touch-action: none;
    }

    .bottom-sheet.dragging {
        transition: none;
    }

    .bottom-sheet.closing {
        animation: slideDown 0.3s ease-out;
    }

    @keyframes slideUp {
        from {
            transform: translateY(100%);
        }
        to {
            transform: translateY(0);
        }
    }

    @keyframes slideDown {
        from {
            transform: translateY(0);
        }
        to {
            transform: translateY(100%);
        }
    }

    .handle-bar {
        width: 40px;
        height: 4px;
        background: var(--border-color);
        border-radius: 2px;
        margin: 8px auto;
        cursor: grab;
    }

    .handle-bar:active {
        cursor: grabbing;
    }

    .sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 20px 12px;
        border-bottom: 1px solid var(--border-color);
    }

    .sheet-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
    }

    .close-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        transition: all 0.15s ease;
    }

    .close-btn:hover {
        background: var(--input-hover);
        color: var(--text-primary);
    }

    .sheet-content {
        padding: 20px;
        overflow-y: auto;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-color);
    }

    .info-row:last-child {
        border-bottom: none;
    }

    .label {
        font-size: 14px;
        color: var(--text-muted);
        font-weight: 500;
    }

    .value {
        font-size: 14px;
        color: var(--text-primary);
        font-weight: 600;
    }

    @media (min-width: 768px) {
        .bottom-sheet {
            max-height: 60vh;
        }
    }
</style>

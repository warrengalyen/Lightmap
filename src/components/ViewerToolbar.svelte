<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { navigate } from '../stores/routerStore';
    import type { ViewMode } from '../types';

    export let viewMode: ViewMode = 'editor';
    export let hasProject: boolean = false;

    const dispatch = createEventDispatcher<{
        openFile: { file: File };
        viewModeChange: { mode: ViewMode };
    }>();

    let fileInput: HTMLInputElement;

    function handleOpenFile(): void {
        fileInput?.click();
    }

    function handleFileChange(e: Event): void {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            dispatch('openFile', { file: input.files[0] });
            // Reset so the same file can be re-loaded
            input.value = '';
        }
    }

    export function triggerFileOpen(): void {
        fileInput?.click();
    }

    function setViewMode(mode: ViewMode): void {
        viewMode = mode;
        dispatch('viewModeChange', { mode });
    }

    function goToEditor(): void {
        navigate('editor');
    }
</script>

<header class="viewer-toolbar">
    <div class="toolbar-left">
        <button class="back-btn" on:click={goToEditor} title="Back to Editor">
            <span class="back-icon">&larr;</span>
            <span class="back-text">Editor</span>
        </button>
        <span class="brand">Lightmap Viewer</span>
    </div>

    <div class="toolbar-center">
        <button class="open-btn" on:click={handleOpenFile}>
            <span class="open-icon">&#128194;</span>
            <span class="open-text">Open File</span>
        </button>
        <input
            bind:this={fileInput}
            type="file"
            accept=".json"
            class="file-input"
            on:change={handleFileChange}
        />
    </div>

    <div class="toolbar-right">
        {#if hasProject}
            <div class="view-modes">
                <button
                    class="mode-btn"
                    class:active={viewMode === 'editor'}
                    on:click={() => setViewMode('editor')}
                    title="Layout"
                >
                    <svg
                        class="mode-icon-svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <rect x="3" y="3" width="18" height="18" rx="1" />
                        <line x1="3" y1="12" x2="14" y2="12" />
                        <line x1="14" y1="3" x2="14" y2="12" />
                    </svg>
                    <span class="mode-label">Layout</span>
                </button>
                <button
                    class="mode-btn"
                    class:active={viewMode === 'shadow'}
                    on:click={() => setViewMode('shadow')}
                    title="Shadow"
                >
                    <svg
                        class="mode-icon-svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
                    </svg>
                    <span class="mode-label">Shadow</span>
                </button>
                <button
                    class="mode-btn"
                    class:active={viewMode === 'heatmap'}
                    on:click={() => setViewMode('heatmap')}
                    title="Heatmap"
                >
                    <svg
                        class="mode-icon-svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <rect x="7" y="7" width="3" height="3" />
                        <rect x="14" y="7" width="3" height="3" />
                        <rect x="7" y="14" width="3" height="3" />
                        <rect x="14" y="14" width="3" height="3" />
                    </svg>
                    <span class="mode-label">Heatmap</span>
                </button>
            </div>
        {/if}
    </div>
</header>

<style>
    .viewer-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 48px;
        padding: 0 12px;
        background: var(--panel-bg);
        border-bottom: 1px solid var(--border-color);
        flex-shrink: 0;
        gap: 8px;
    }

    .toolbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
    }

    .toolbar-center {
        display: flex;
        align-items: center;
    }

    .toolbar-right {
        display: flex;
        align-items: center;
    }

    .back-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: var(--button-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 13px;
        white-space: nowrap;
    }

    .back-btn:hover {
        background: var(--button-bg-hover);
    }

    .brand {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
    }

    .open-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: var(--button-active);
        border: none;
        border-radius: var(--radius-md);
        color: white;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
    }

    .open-btn:hover {
        opacity: 0.9;
    }

    .file-input {
        display: none;
    }

    .view-modes {
        display: flex;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        overflow: hidden;
    }

    .mode-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: var(--button-bg);
        border: none;
        border-right: 1px solid var(--border-color);
        color: var(--text-muted);
        cursor: pointer;
        font-size: 12px;
        white-space: nowrap;
    }

    .mode-btn:last-child {
        border-right: none;
    }

    .mode-btn:hover {
        background: var(--button-bg-hover);
        color: var(--text-secondary);
    }

    .mode-btn.active {
        background: var(--button-active);
        color: white;
    }

    .mode-icon-svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
    }

    /* Mobile: hide text labels, show icons only */
    @media (max-width: 600px) {
        .back-text,
        .open-text,
        .mode-label {
            display: none;
        }

        .brand {
            font-size: 12px;
        }

        .viewer-toolbar {
            padding: 0 8px;
        }

        .back-btn,
        .open-btn,
        .mode-btn {
            padding: 6px 8px;
        }
    }
</style>

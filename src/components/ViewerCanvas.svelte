<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { Scene } from '../core/Scene';
    import { EditorRenderer } from '../rendering/EditorRenderer';
    import { HeatmapRenderer } from '../rendering/HeatmapRenderer';
    import { ShadowRenderer } from '../rendering/ShadowRenderer';
    import { roomBounds, roomStore } from '../stores/roomStore';
    import { shouldFitCamera } from '../stores/appStore';
    import type { BoundingBox, RoomState, ViewMode } from '../types';

    export let viewMode: ViewMode = 'editor';

    let container: HTMLDivElement;
    let scene: Scene;
    let editorRenderer: EditorRenderer;
    let heatmapRenderer: HeatmapRenderer;
    let shadowRenderer: ShadowRenderer;
    let animationFrameId: number;

    // Pan/zoom state
    let isPanning = false;
    let lastPointerPos = { x: 0, y: 0 };

    // Touch state
    let lastTouchDist = 0;
    let lastTouchCenter = { x: 0, y: 0 };
    let activeTouches: Touch[] = [];

    // Reactive state
    let currentRoomState: RoomState;
    let currentBounds: BoundingBox;

    $: currentRoomState = $roomStore;
    $: currentBounds = $roomBounds;

    $: if (scene && viewMode) {
        updateViewMode(viewMode);
    }

    $: if (editorRenderer && currentRoomState) {
        editorRenderer.updateWalls(
            currentRoomState.walls,
            null,
            null,
            currentRoomState.doors ?? []
        );
        editorRenderer.updateLights(
            currentRoomState.lights,
            currentRoomState.ceilingHeight,
            new Set()
        );
        editorRenderer.updateDoors(currentRoomState.doors ?? [], currentRoomState.walls, null);
        editorRenderer.updateObstacles(currentRoomState.obstacles ?? [], null);
    }

    $: if (heatmapRenderer && currentRoomState && currentBounds) {
        heatmapRenderer.updateBounds(currentBounds);
        heatmapRenderer.updateWalls(currentRoomState.walls);
        heatmapRenderer.updateObstacles(currentRoomState.obstacles ?? []);
        heatmapRenderer.updateLights(currentRoomState.lights, currentRoomState.ceilingHeight);
    }

    $: if (shadowRenderer && currentRoomState && currentBounds) {
        shadowRenderer.updateShadows(
            currentRoomState.lights,
            currentRoomState.walls,
            currentBounds,
            currentRoomState.doors ?? [],
            currentRoomState.obstacles ?? [],
            currentRoomState.ceilingHeight
        );
    }

    $: if ($shouldFitCamera && scene && currentBounds && currentRoomState.walls.length > 0) {
        scene.fitToBounds(currentBounds);
        shouldFitCamera.set(false);
    }

    function updateViewMode(mode: ViewMode): void {
        if (!editorRenderer || !heatmapRenderer || !shadowRenderer) return;
        editorRenderer.setVisible(mode === 'editor');
        heatmapRenderer.setVisible(mode === 'heatmap');
        shadowRenderer.setVisible(mode === 'shadow');
        editorRenderer.setLightsVisible(mode === 'editor' || mode === 'shadow');
    }

    function animate(): void {
        scene.render();
        animationFrameId = requestAnimationFrame(animate);
    }

    // Mouse pan/zoom handlers
    function handleMouseDown(e: MouseEvent): void {
        if (e.button === 0 || e.button === 1) {
            isPanning = true;
            lastPointerPos = { x: e.clientX, y: e.clientY };
        }
    }

    function handleMouseMove(e: MouseEvent): void {
        if (!isPanning || !scene) return;
        const dx = e.clientX - lastPointerPos.x;
        const dy = e.clientY - lastPointerPos.y;
        scene.pan(-dx, dy);
        lastPointerPos = { x: e.clientX, y: e.clientY };
    }

    function handleMouseUp(): void {
        isPanning = false;
    }

    function handleWheel(e: WheelEvent): void {
        e.preventDefault();
        if (!scene) return;
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        scene.setZoom(scene.getZoom() * zoomFactor);
    }

    // Touch handlers
    function getTouchDist(t1: Touch, t2: Touch): number {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchCenter(t1: Touch, t2: Touch): { x: number; y: number } {
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2,
        };
    }

    function handleTouchStart(e: TouchEvent): void {
        e.preventDefault();
        activeTouches = Array.from(e.touches);
        if (activeTouches.length === 1) {
            lastPointerPos = { x: activeTouches[0].clientX, y: activeTouches[0].clientY };
        } else if (activeTouches.length === 2) {
            lastTouchDist = getTouchDist(activeTouches[0], activeTouches[1]);
            lastTouchCenter = getTouchCenter(activeTouches[0], activeTouches[1]);
        }
    }

    function handleTouchMove(e: TouchEvent): void {
        e.preventDefault();
        if (!scene) return;
        const touches = Array.from(e.touches);

        if (touches.length === 1) {
            // 1-finger pan
            const dx = touches[0].clientX - lastPointerPos.x;
            const dy = touches[0].clientY - lastPointerPos.y;
            scene.pan(-dx, dy);
            lastPointerPos = { x: touches[0].clientX, y: touches[0].clientY };
        } else if (touches.length === 2) {
            // 2-finger pinch zoom + pan
            const dist = getTouchDist(touches[0], touches[1]);
            const center = getTouchCenter(touches[0], touches[1]);

            if (lastTouchDist > 0) {
                const scale = dist / lastTouchDist;
                scene.setZoom(scene.getZoom() * scale);
            }

            const dx = center.x - lastTouchCenter.x;
            const dy = center.y - lastTouchCenter.y;
            scene.pan(-dx, dy);

            lastTouchDist = dist;
            lastTouchCenter = center;
        }

        activeTouches = touches;
    }

    function handleTouchEnd(e: TouchEvent): void {
        activeTouches = Array.from(e.touches);
        if (activeTouches.length < 2) {
            lastTouchDist = 0;
        }
        if (activeTouches.length === 1) {
            lastPointerPos = { x: activeTouches[0].clientX, y: activeTouches[0].clientY };
        }
    }

    onMount(() => {
        scene = new Scene(container);
        // Cap pixel ratio on mobile
        scene.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Attach pan/zoom events to the Three.js canvas (it sits on top of the container)
        const canvas = scene.domElement;
        canvas.style.touchAction = 'none';
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);

        editorRenderer = new EditorRenderer(scene.scene);
        heatmapRenderer = new HeatmapRenderer(scene.scene);
        shadowRenderer = new ShadowRenderer(scene.scene);

        heatmapRenderer.setVisible(false);
        shadowRenderer.setVisible(false);

        animate();
    });

    onDestroy(() => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        editorRenderer?.dispose();
        heatmapRenderer?.dispose();
        shadowRenderer?.dispose();
        scene?.dispose();
    });
</script>

<div class="viewer-canvas" bind:this={container}></div>

<style>
    .viewer-canvas {
        width: 100%;
        height: 100%;
        overflow: hidden;
        touch-action: none;
        cursor: grab;
    }

    .viewer-canvas:active {
        cursor: grabbing;
    }
</style>

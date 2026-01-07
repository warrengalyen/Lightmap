<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Scene } from '../core/Scene';
  import { InputManager, type InputEvent } from '../core/InputManager';
  import { EditorRenderer } from '../rendering/EditorRenderer';
  import { HeatmapRenderer } from '../rendering/HeatmapRenderer';
  import { ShadowRenderer } from '../rendering/ShadowRenderer';
  import { RafterOverlay } from '../rendering/RafterOverlay';
  import { WallBuilder } from '../geometry/WallBuilder';
  import { PolygonValidator } from '../geometry/PolygonValidator';
  import { LightManager } from '../lighting/LightManager';
  import { roomStore, roomBounds, canPlaceLights } from '../stores/roomStore';
  import { viewMode, activeTool, selectedLightId, selectedWallId, selectedVertexIndex, isDrawingEnabled, isLightPlacementEnabled } from '../stores/appStore';
  import { getVertices, updateVertexPosition, insertVertexOnWall, deleteVertex } from '../stores/roomStore';
  import { historyStore } from '../stores/historyStore';
  import { rafterConfig } from '../stores/settingsStore';
  import type { Vector2, ViewMode, RoomState, BoundingBox, RafterConfig } from '../types';

  let container: HTMLDivElement;
  let scene: Scene;
  let inputManager: InputManager;
  let editorRenderer: EditorRenderer;
  let heatmapRenderer: HeatmapRenderer;
  let shadowRenderer: ShadowRenderer;
  let rafterOverlay: RafterOverlay;
  let wallBuilder: WallBuilder;
  let polygonValidator: PolygonValidator;
  let lightManager: LightManager;
  let animationFrameId: number;

  const dispatch = createEventDispatcher<{
    mouseMove: { worldPos: Vector2 };
    snapChange: { snapType: string };
  }>();

  let currentMousePos: Vector2 = { x: 0, y: 0 };
  let currentViewMode: ViewMode = 'editor';
  let currentRoomState: RoomState;
  let currentBounds: BoundingBox;
  let currentRafterConfig: RafterConfig;
  let isDrawing = false;
  let isPlacingLights = false;
  let currentSelectedLightId: string | null = null;
  let currentSelectedWallId: string | null = null;
  let currentSelectedVertexIndex: number | null = null;
  let isDraggingVertex = false;
  let isDraggingLight = false;

  $: currentViewMode = $viewMode;
  $: currentRoomState = $roomStore;
  $: currentBounds = $roomBounds;
  $: isDrawing = $isDrawingEnabled;
  $: isPlacingLights = $isLightPlacementEnabled;
  $: currentSelectedLightId = $selectedLightId;
  $: currentSelectedWallId = $selectedWallId;
  $: currentSelectedVertexIndex = $selectedVertexIndex;
  $: currentRafterConfig = $rafterConfig;

  $: if (scene && currentViewMode) {
    updateViewMode(currentViewMode);
  }

  $: if (editorRenderer && currentRoomState) {
    editorRenderer.updateWalls(currentRoomState.walls, currentSelectedWallId, currentSelectedVertexIndex);
    editorRenderer.updateLights(currentRoomState.lights, currentRoomState.ceilingHeight, currentSelectedLightId);
    lightManager?.setLights(currentRoomState.lights);
  }

  $: if (heatmapRenderer && currentRoomState && currentBounds) {
    heatmapRenderer.updateBounds(currentBounds);
    heatmapRenderer.updateLights(currentRoomState.lights, currentRoomState.ceilingHeight);
  }

  $: if (shadowRenderer && currentRoomState && currentBounds) {
    shadowRenderer.updateShadows(currentRoomState.lights, currentRoomState.walls, currentBounds);
  }

  $: if (rafterOverlay && currentRafterConfig && currentBounds) {
    rafterOverlay.updateConfig(currentRafterConfig);
    rafterOverlay.render(currentBounds);
  }

  function updateViewMode(mode: ViewMode): void {
    if (!editorRenderer || !heatmapRenderer || !shadowRenderer) return;

    editorRenderer.setVisible(mode === 'editor');
    heatmapRenderer.setVisible(mode === 'heatmap');
    shadowRenderer.setVisible(mode === 'shadow');

    // Show lights in both editor and shadow modes
    editorRenderer.setLightsVisible(mode === 'editor' || mode === 'shadow');
  }

  function handleClick(event: InputEvent): void {
    if (isDrawing) {
      handleDrawingClick(event.worldPos);
    } else if (isPlacingLights && $canPlaceLights) {
      handleLightPlacement(event.worldPos);
    } else if ($activeTool === 'select') {
      handleSelection(event.worldPos);
    }
  }

  function handleDrawingClick(pos: Vector2): void {
    if (!wallBuilder.drawing) {
      wallBuilder.startDrawing(pos);
      // Show the starting vertex immediately
      editorRenderer.updateDrawingVertices(wallBuilder.getVertices());
    } else {
      const snappedPos = wallBuilder.continueDrawing(pos);
      const snap = wallBuilder.currentSnap;

      if (snap?.snapType === 'closure' && wallBuilder.vertexCount >= 3) {
        const walls = wallBuilder.closeLoop();
        if (walls && polygonValidator.isValid(walls)) {
          // Clear drawing vertices and phantom line
          editorRenderer.updateDrawingVertices([]);
          editorRenderer.setPhantomLine(null, null);
          roomStore.update(state => ({
            ...state,
            walls,
            isClosed: true,
          }));
        } else {
          wallBuilder.cancel();
          editorRenderer.updateDrawingVertices([]);
          editorRenderer.setPhantomLine(null, null);
        }
      } else {
        wallBuilder.placeVertex(snappedPos);
        // Update the drawing vertices display
        editorRenderer.updateDrawingVertices(wallBuilder.getVertices());
      }
    }
  }

  function handleLightPlacement(pos: Vector2): void {
    if (!polygonValidator.isPointInside(pos, currentRoomState.walls)) {
      return;
    }

    const newLight = lightManager.addLight(pos);
    roomStore.update(state => ({
      ...state,
      lights: [...state.lights, newLight],
    }));
  }

  function handleSelection(pos: Vector2): void {
    // First check for vertices (only if room is closed)
    if (currentRoomState.isClosed) {
      const vertices = getVertices(currentRoomState);
      const vertexIndex = getVertexAtPosition(pos, vertices, 0.3);
      if (vertexIndex !== null) {
        selectedVertexIndex.set(vertexIndex);
        selectedWallId.set(null);
        selectedLightId.set(null);
        isDraggingVertex = true;
        return;
      }
    }

    // Then check for lights
    const light = lightManager.getLightAt(pos, 0.5);
    if (light) {
      selectedLightId.set(light.id);
      selectedWallId.set(null);
      selectedVertexIndex.set(null);
      isDraggingLight = true;
      return;
    }

    // Then check for walls (only if room is closed)
    if (currentRoomState.isClosed) {
      const wall = editorRenderer.getWallAtPosition(pos, currentRoomState.walls, 0.3);
      if (wall) {
        selectedWallId.set(wall.id);
        selectedLightId.set(null);
        selectedVertexIndex.set(null);
        return;
      }
    }

    // Nothing selected
    selectedLightId.set(null);
    selectedWallId.set(null);
    selectedVertexIndex.set(null);
  }

  function getVertexAtPosition(pos: Vector2, vertices: Vector2[], tolerance: number): number | null {
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      const dist = Math.sqrt(Math.pow(pos.x - v.x, 2) + Math.pow(pos.y - v.y, 2));
      if (dist <= tolerance) {
        return i;
      }
    }
    return null;
  }

  function handleMouseMove(event: InputEvent): void {
    currentMousePos = event.worldPos;
    dispatch('mouseMove', { worldPos: event.worldPos });

    // Handle vertex dragging
    if (isDraggingVertex && currentSelectedVertexIndex !== null) {
      updateVertexPosition(currentSelectedVertexIndex, event.worldPos);
      return;
    }

    // Handle light dragging
    if (isDraggingLight && currentSelectedLightId) {
      // Only allow moving lights inside the room
      if (currentRoomState.isClosed && polygonValidator.isPointInside(event.worldPos, currentRoomState.walls)) {
        roomStore.update(state => ({
          ...state,
          lights: state.lights.map(light =>
            light.id === currentSelectedLightId
              ? { ...light, position: { ...event.worldPos } }
              : light
          ),
        }));
      }
      return;
    }

    if (wallBuilder.drawing) {
      const snappedPos = wallBuilder.continueDrawing(event.worldPos);
      const lastVertex = wallBuilder.lastVertex;

      if (lastVertex) {
        editorRenderer.setPhantomLine(lastVertex, snappedPos);
      }

      const snap = wallBuilder.currentSnap;
      if (snap) {
        dispatch('snapChange', { snapType: snap.snapType });
      }
    }
  }

  function handleMouseUp(): void {
    isDraggingVertex = false;
    isDraggingLight = false;
  }

  function handleDoubleClick(event: InputEvent): void {
    // Double-click on a wall to insert a vertex
    if (currentRoomState.isClosed && $activeTool === 'select') {
      const wall = editorRenderer.getWallAtPosition(event.worldPos, currentRoomState.walls, 0.3);
      if (wall) {
        // Project the click position onto the wall to get the exact insertion point
        const insertPos = projectPointOntoWall(event.worldPos, wall);
        const newVertexIndex = insertVertexOnWall(wall.id, insertPos);
        if (newVertexIndex !== null) {
          selectedVertexIndex.set(newVertexIndex);
          selectedWallId.set(null);
          selectedLightId.set(null);
        }
      }
    }
  }

  function projectPointOntoWall(point: Vector2, wall: import('../types').WallSegment): Vector2 {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return { ...wall.start };

    let t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lengthSq;
    t = Math.max(0.1, Math.min(0.9, t)); // Keep some distance from endpoints

    return {
      x: wall.start.x + t * dx,
      y: wall.start.y + t * dy,
    };
  }

  function handleKeyDown(event: InputEvent): void {
    if (!event.key) return;

    // Handle undo/redo
    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
      if (event.shiftKey) {
        historyStore.redo();
      } else {
        historyStore.undo();
      }
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'y') {
      historyStore.redo();
      return;
    }

    switch (event.key) {
      case 'Escape':
        if (wallBuilder.drawing) {
          wallBuilder.cancel();
          editorRenderer.setPhantomLine(null, null);
          editorRenderer.updateDrawingVertices([]);
        }
        selectedLightId.set(null);
        selectedWallId.set(null);
        selectedVertexIndex.set(null);
        break;

      case 'Delete':
      case 'Backspace':
        if (currentSelectedLightId) {
          lightManager.removeLight(currentSelectedLightId);
          roomStore.update(state => ({
            ...state,
            lights: state.lights.filter(l => l.id !== currentSelectedLightId),
          }));
          selectedLightId.set(null);
        } else if (currentSelectedVertexIndex !== null) {
          // Delete selected vertex (merge adjacent walls)
          if (currentRoomState.walls.length > 3) {
            deleteVertex(currentSelectedVertexIndex);
            selectedVertexIndex.set(null);
          }
        }
        break;

      case '1':
        viewMode.set('editor');
        break;

      case '2':
        viewMode.set('shadow');
        break;

      case '3':
        viewMode.set('heatmap');
        break;

      case 'r':
      case 'R':
        rafterConfig.update(c => ({ ...c, visible: !c.visible }));
        break;
    }
  }

  function animate(): void {
    scene.render();
    animationFrameId = requestAnimationFrame(animate);
  }

  onMount(() => {
    scene = new Scene(container);
    inputManager = new InputManager(scene);
    editorRenderer = new EditorRenderer(scene.scene);
    heatmapRenderer = new HeatmapRenderer(scene.scene);
    shadowRenderer = new ShadowRenderer(scene.scene);
    rafterOverlay = new RafterOverlay(scene.scene, currentRafterConfig);
    wallBuilder = new WallBuilder();
    polygonValidator = new PolygonValidator();
    lightManager = new LightManager();

    inputManager.on('click', handleClick);
    inputManager.on('dblclick', handleDoubleClick);
    inputManager.on('move', handleMouseMove);
    inputManager.on('drag', handleMouseMove);  // Also handle drag events for phantom line during drawing
    inputManager.on('mouseup', handleMouseUp);
    inputManager.on('keydown', handleKeyDown);

    heatmapRenderer.setVisible(false);
    shadowRenderer.setVisible(false);

    if (currentRoomState.lights.length > 0) {
      lightManager.setLights(currentRoomState.lights);
    }

    animate();
  });

  onDestroy(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    inputManager?.dispose();
    editorRenderer?.dispose();
    heatmapRenderer?.dispose();
    shadowRenderer?.dispose();
    rafterOverlay?.dispose();
    scene?.dispose();
  });

  export function setManualLength(length: number): void {
    wallBuilder.setManualLength(length);
  }

  export function clearManualLength(): void {
    wallBuilder.clearManualLength();
  }
</script>

<div class="canvas-container" bind:this={container}></div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
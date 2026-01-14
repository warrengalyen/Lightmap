<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Scene } from '../core/Scene';
  import { InputManager, type InputEvent } from '../core/InputManager';
  import { EditorRenderer } from '../rendering/EditorRenderer';
  import { HeatmapRenderer } from '../rendering/HeatmapRenderer';
  import { ShadowRenderer } from '../rendering/ShadowRenderer';
  import { RafterOverlay } from '../rendering/RafterOverlay';
  import { DeadZoneRenderer } from '../rendering/DeadZoneRenderer';
  import { SpacingWarningRenderer } from '../rendering/SpacingWarningRenderer';
  import { WallBuilder } from '../geometry/WallBuilder';
  import { PolygonValidator } from '../geometry/PolygonValidator';
  import { LightManager } from '../lighting/LightManager';
  import { SnapController } from '../controllers/SnapController';
  import { MeasurementController } from '../controllers/MeasurementController';
  import { roomStore, roomBounds, canPlaceLights, getVertices, updateVertexPosition, insertVertexOnWall, deleteVertex, moveWall } from '../stores/roomStore';
  import { viewMode, activeTool, selectedLightId, selectedLightIds, selectedWallId, selectedVertexIndex, isDrawingEnabled, isLightPlacementEnabled, selectLight, clearLightSelection } from '../stores/appStore';
  import { historyStore } from '../stores/historyStore';
  import { rafterConfig, displayPreferences, toggleUnitFormat } from '../stores/settingsStore';
  import { deadZoneConfig } from '../stores/deadZoneStore';
  import { spacingConfig, spacingWarnings } from '../stores/spacingStore';
  import { toggleLightingStats } from '../stores/lightingStatsStore';
  import { selectedDefinitionId } from '../stores/lightDefinitionsStore';
  import { findVertexAtPosition, projectPointOntoSegment, projectPointOntoSegmentForInsertion } from '../utils/math';
  import type { Vector2, ViewMode, RoomState, BoundingBox, RafterConfig, DisplayPreferences, DeadZoneConfig, SpacingConfig, SpacingWarning } from '../types';

  // ============================================
  // Component State
  // ============================================

  let container: HTMLDivElement;
  let scene: Scene;
  let inputManager: InputManager;
  let editorRenderer: EditorRenderer;
  let heatmapRenderer: HeatmapRenderer;
  let shadowRenderer: ShadowRenderer;
  let rafterOverlay: RafterOverlay;
  let deadZoneRenderer: DeadZoneRenderer;
  let spacingWarningRenderer: SpacingWarningRenderer;
  let wallBuilder: WallBuilder;
  let polygonValidator: PolygonValidator;
  let lightManager: LightManager;
  let snapController: SnapController;
  let measurementController: MeasurementController;
  let animationFrameId: number;

  const dispatch = createEventDispatcher<{
    mouseMove: { worldPos: Vector2 };
    snapChange: { snapType: string };
    measurement: { from: Vector2; to: Vector2; deltaX: number; deltaY: number; distance: number } | null;
  }>();

  // ============================================
  // Reactive State
  // ============================================

  let currentMousePos: Vector2 = { x: 0, y: 0 };
  let currentViewMode: ViewMode = 'editor';
  let currentRoomState: RoomState;
  let currentBounds: BoundingBox;
  let currentRafterConfig: RafterConfig;
  let currentDisplayPrefs: DisplayPreferences;
  let currentDeadZoneConfig: DeadZoneConfig;
  let currentSpacingConfig: SpacingConfig;
  let currentSpacingWarnings: SpacingWarning[];
  let isDrawing = false;
  let isPlacingLights = false;
  let currentSelectedLightId: string | null = null;
  let currentSelectedLightIds: Set<string> = new Set();
  let currentSelectedWallId: string | null = null;
  let currentSelectedVertexIndex: number | null = null;

  // Drag state
  let isDraggingVertex = false;
  let isDraggingLight = false;
  let isDraggingWall = false;
  let didDragVertex = false;
  let wallDragStart: Vector2 | null = null;
  let wallDragOriginalVertices: { start: Vector2; end: Vector2 } | null = null;

  // ============================================
  // Store Subscriptions
  // ============================================

  $: currentViewMode = $viewMode;
  $: currentRoomState = $roomStore;
  $: currentBounds = $roomBounds;
  $: isDrawing = $isDrawingEnabled;
  $: isPlacingLights = $isLightPlacementEnabled;
  $: currentSelectedLightId = $selectedLightId;
  $: currentSelectedLightIds = $selectedLightIds;
  $: currentSelectedWallId = $selectedWallId;
  $: currentSelectedVertexIndex = $selectedVertexIndex;
  $: currentRafterConfig = $rafterConfig;
  $: currentDisplayPrefs = $displayPreferences;
  $: currentDeadZoneConfig = $deadZoneConfig;
  $: currentSpacingConfig = $spacingConfig;
  $: currentSpacingWarnings = $spacingWarnings;

  // ============================================
  // Reactive Updates
  // ============================================

  $: if (scene && currentViewMode) {
    updateViewMode(currentViewMode);
  }

  $: if (editorRenderer && currentRoomState) {
    editorRenderer.updateWalls(currentRoomState.walls, currentSelectedWallId, currentSelectedVertexIndex);
    editorRenderer.updateLights(currentRoomState.lights, currentRoomState.ceilingHeight, currentSelectedLightIds);
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

  $: if (editorRenderer && currentDisplayPrefs) {
    editorRenderer.setUnitFormat(currentDisplayPrefs.unitFormat);
  }

  $: if (deadZoneRenderer && currentRoomState && currentBounds) {
    deadZoneRenderer.updateBounds(currentBounds);
    deadZoneRenderer.updateLights(currentRoomState.lights, currentRoomState.ceilingHeight);
  }

  $: if (deadZoneRenderer && currentDeadZoneConfig) {
    deadZoneRenderer.setVisible(currentDeadZoneConfig.enabled);
    deadZoneRenderer.updateConfig(currentDeadZoneConfig);
  }

  $: if (spacingWarningRenderer && currentSpacingConfig) {
    spacingWarningRenderer.setVisible(currentSpacingConfig.enabled);
  }

  $: if (spacingWarningRenderer && currentSpacingWarnings) {
    spacingWarningRenderer.updateWarnings(currentSpacingWarnings);
  }

  // ============================================
  // View Mode
  // ============================================

  function updateViewMode(mode: ViewMode): void {
    if (!editorRenderer || !heatmapRenderer || !shadowRenderer) return;

    editorRenderer.setVisible(mode === 'editor');
    heatmapRenderer.setVisible(mode === 'heatmap');
    shadowRenderer.setVisible(mode === 'shadow');
    editorRenderer.setLightsVisible(mode === 'editor' || mode === 'shadow');
  }

  // ============================================
  // Click Handling
  // ============================================

  function handleClick(event: InputEvent): void {
    if (measurementController.isActive) {
      handleMeasurementClick(event);
      return;
    }

    if (isDrawing) {
      handleDrawingClick(event.worldPos);
    } else if (isPlacingLights && $canPlaceLights) {
      handleLightPlacement(event.worldPos);
    } else if ($activeTool === 'select') {
      handleSelection(event);
    }
  }

  function handleMeasurementClick(event: InputEvent): void {
    const vertices = getVertices(currentRoomState);

    if (measurementController.isFromLight) {
      // Measuring from a light
      const clickedLight = lightManager.getLightAt(event.worldPos, 0.5);

      // Check if clicking on the source light to drag it
      if (clickedLight && clickedLight.id === measurementController.sourceLightId) {
        selectLight(clickedLight.id);
        isDraggingLight = true;
        return;
      }

      // Check if clicking on another light to measure to it
      if (clickedLight && clickedLight.id !== measurementController.sourceLightId) {
        measurementController.setTargetLight(clickedLight.id, clickedLight.position);
        updateMeasurementDisplay();
        return;
      }

      // Check for wall click
      const wall = editorRenderer.getWallAtPosition(event.worldPos, currentRoomState.walls, 0.4);
      if (wall) {
        measurementController.setTargetWall(wall.id, wall);
        updateMeasurementDisplay();
        return;
      }

      // Check for vertex click
      const clickedVertexIndex = findVertexAtPosition(event.worldPos, vertices, 0.4);
      if (clickedVertexIndex !== null) {
        measurementController.setTargetVertex(clickedVertexIndex, vertices[clickedVertexIndex]);
        updateMeasurementDisplay();
      }
    } else {
      // Measuring from vertex - allow vertex selection for dragging
      const clickedVertexIndex = findVertexAtPosition(event.worldPos, vertices, 0.4);
      if (clickedVertexIndex !== null) {
        selectedVertexIndex.set(clickedVertexIndex);
        selectedWallId.set(null);
        clearLightSelection();
        isDraggingVertex = true;
        didDragVertex = false;
      }
    }
  }

  function handleDrawingClick(pos: Vector2): void {
    // Apply grid snap if enabled (bypasses angle snapping)
    const gridSize = currentDisplayPrefs.gridSize || 0.5; // Default 6 inches
    if (currentDisplayPrefs.gridSnapEnabled && gridSize > 0) {
      const gridPos = snapController.snapToGrid(pos, gridSize);

      if (!wallBuilder.drawing) {
        wallBuilder.startDrawing(gridPos);
        editorRenderer.updateDrawingVertices(wallBuilder.getVertices());
      } else {
        // Check for closure - if clicking near the start vertex
        const startVertex = wallBuilder.startVertex;
        const closureThreshold = gridSize; // Use grid size as threshold
        if (startVertex && wallBuilder.vertexCount >= 3) {
          const dist = Math.hypot(gridPos.x - startVertex.x, gridPos.y - startVertex.y);
          if (dist < closureThreshold) {
            const walls = wallBuilder.closeLoop();
            if (walls && polygonValidator.isValid(walls)) {
              editorRenderer.updateDrawingVertices([]);
              editorRenderer.setPhantomLine(null, null);
              roomStore.update(state => ({ ...state, walls, isClosed: true }));
            } else {
              wallBuilder.cancel();
              editorRenderer.updateDrawingVertices([]);
              editorRenderer.setPhantomLine(null, null);
            }
            return;
          }
        }

        wallBuilder.placeVertex(gridPos);
        editorRenderer.updateDrawingVertices(wallBuilder.getVertices());
      }
      return;
    }

    // Normal drawing with angle snapping
    if (!wallBuilder.drawing) {
      wallBuilder.startDrawing(pos);
      editorRenderer.updateDrawingVertices(wallBuilder.getVertices());
    } else {
      const snappedPos = wallBuilder.continueDrawing(pos);
      const snap = wallBuilder.currentSnap;

      if (snap?.snapType === 'closure' && wallBuilder.vertexCount >= 3) {
        const walls = wallBuilder.closeLoop();
        if (walls && polygonValidator.isValid(walls)) {
          editorRenderer.updateDrawingVertices([]);
          editorRenderer.setPhantomLine(null, null);
          roomStore.update(state => ({ ...state, walls, isClosed: true }));
        } else {
          wallBuilder.cancel();
          editorRenderer.updateDrawingVertices([]);
          editorRenderer.setPhantomLine(null, null);
        }
      } else {
        wallBuilder.placeVertex(snappedPos);
        editorRenderer.updateDrawingVertices(wallBuilder.getVertices());
      }
    }
  }

  function handleLightPlacement(pos: Vector2): void {
    if (!polygonValidator.isPointInside(pos, currentRoomState.walls)) return;

    const newLight = lightManager.addLight(pos, $selectedDefinitionId);
    roomStore.update(state => ({ ...state, lights: [...state.lights, newLight] }));
  }

  function handleSelection(event: InputEvent): void {
    const pos = event.worldPos;
    const addToSelection = event.shiftKey ?? false;

    // Check vertices first (if room is closed)
    if (currentRoomState.isClosed) {
      const vertices = getVertices(currentRoomState);
      const vertexIndex = findVertexAtPosition(pos, vertices, 0.3);
      if (vertexIndex !== null) {
        selectedVertexIndex.set(vertexIndex);
        selectedWallId.set(null);
        clearLightSelection();
        isDraggingVertex = true;
        return;
      }
    }

    // Check lights
    const light = lightManager.getLightAt(pos, 0.5);
    if (light) {
      selectLight(light.id, addToSelection);
      // Only enable dragging for single selection
      if (!addToSelection || currentSelectedLightIds.size <= 1) {
        isDraggingLight = true;
      }
      return;
    }

    // Check walls (if room is closed)
    if (currentRoomState.isClosed) {
      const wall = editorRenderer.getWallAtPosition(pos, currentRoomState.walls, 0.3);
      if (wall) {
        selectedWallId.set(wall.id);
        clearLightSelection();
        selectedVertexIndex.set(null);
        isDraggingWall = true;
        wallDragStart = { ...pos };
        wallDragOriginalVertices = { start: { ...wall.start }, end: { ...wall.end } };
        return;
      }
    }

    // Clear selection if clicking on empty space (unless shift is held)
    if (!addToSelection) {
      clearLightSelection();
      selectedWallId.set(null);
      selectedVertexIndex.set(null);
    }
  }

  // ============================================
  // Mouse Move Handling
  // ============================================

  function handleMouseMove(event: InputEvent): void {
    currentMousePos = event.worldPos;
    dispatch('mouseMove', { worldPos: event.worldPos });

    if (isDraggingVertex && currentSelectedVertexIndex !== null) {
      handleVertexDrag(event);
      return;
    }

    if (isDraggingLight && currentSelectedLightId) {
      handleLightDrag(event);
      return;
    }

    if (isDraggingWall && currentSelectedWallId && wallDragStart && wallDragOriginalVertices) {
      handleWallDrag(event);
      return;
    }

    if (wallBuilder.drawing) {
      handleDrawingMove(event);
    }
  }

  function handleVertexDrag(event: InputEvent): void {
    didDragVertex = true;
    const vertices = getVertices(currentRoomState);
    let targetPos = event.worldPos;

    // Grid snap has priority when enabled
    const gridSize = currentDisplayPrefs.gridSize || 0.5;
    if (currentDisplayPrefs.gridSnapEnabled && gridSize > 0) {
      targetPos = snapController.snapToGrid(targetPos, gridSize);
      editorRenderer.setSnapGuides([]);
    }
    // Snap to other vertices when holding Shift
    else if (event.shiftKey) {
      const snapResult = snapController.snapToVertices(event.worldPos, vertices, currentSelectedVertexIndex!);
      targetPos = snapResult.snappedPos;
      editorRenderer.setSnapGuides(snapResult.guides);
    } else {
      editorRenderer.setSnapGuides([]);
    }

    updateVertexPosition(currentSelectedVertexIndex!, targetPos);

    // Update measurement if vertex is part of it
    if (measurementController.isActive && measurementController.toPosition) {
      updateMeasurementForVertexDrag(targetPos, vertices);
    }
  }

  function updateMeasurementForVertexDrag(targetPos: Vector2, vertices: Vector2[]): void {
    const fromPos = measurementController.fromPosition;
    const toPos = measurementController.toPosition;
    if (!fromPos || !toPos) return;

    // Check if dragged vertex matches from position
    const fromMatch = Math.abs(vertices[currentSelectedVertexIndex!]?.x - fromPos.x) < 0.01 &&
                      Math.abs(vertices[currentSelectedVertexIndex!]?.y - fromPos.y) < 0.01;

    // Check if dragged vertex matches to position
    const toMatch = Math.abs(vertices[currentSelectedVertexIndex!]?.x - toPos.x) < 0.01 &&
                    Math.abs(vertices[currentSelectedVertexIndex!]?.y - toPos.y) < 0.01;

    if (fromMatch) {
      measurementController.updateSourcePosition(targetPos);
      updateMeasurementDisplay();
    } else if (toMatch) {
      measurementController.updateTargetPosition(targetPos);
      updateMeasurementDisplay();
    }
  }

  function handleLightDrag(event: InputEvent): void {
    let targetPos = event.worldPos;

    // Snap when holding Shift (to other lights)
    if (event.shiftKey) {
      const snapResult = snapController.snapToLights(event.worldPos, currentRoomState.lights, currentSelectedLightId!);
      targetPos = snapResult.snappedPos;
      editorRenderer.setSnapGuides(snapResult.guides);
    } else {
      editorRenderer.setSnapGuides([]);
    }

    // Only move if inside room
    if (!currentRoomState.isClosed || !polygonValidator.isPointInside(targetPos, currentRoomState.walls)) {
      return;
    }

    roomStore.update(state => ({
      ...state,
      lights: state.lights.map(light =>
        light.id === currentSelectedLightId ? { ...light, position: { ...targetPos } } : light
      ),
    }));

    // Update measurement if this light is part of it
    if (measurementController.isActive) {
      if (measurementController.sourceLightId === currentSelectedLightId) {
        measurementController.updateSourcePosition(targetPos, currentRoomState.walls);
        updateMeasurementDisplay();
      } else if (measurementController.targetLightId === currentSelectedLightId) {
        measurementController.updateTargetPosition(targetPos);
        updateMeasurementDisplay();
      }
    }
  }

  function handleWallDrag(event: InputEvent): void {
    const delta = {
      x: event.worldPos.x - wallDragStart!.x,
      y: event.worldPos.y - wallDragStart!.y,
    };

    let newStart = {
      x: wallDragOriginalVertices!.start.x + delta.x,
      y: wallDragOriginalVertices!.start.y + delta.y,
    };
    let newEnd = {
      x: wallDragOriginalVertices!.end.x + delta.x,
      y: wallDragOriginalVertices!.end.y + delta.y,
    };

    // Snap when holding Shift
    if (event.shiftKey) {
      const wallIndex = currentRoomState.walls.findIndex(w => w.id === currentSelectedWallId);
      if (wallIndex !== -1) {
        const vertices = getVertices(currentRoomState);
        const numWalls = currentRoomState.walls.length;
        const excludeIndices = [wallIndex, (wallIndex + 1) % numWalls];
        const snapResult = snapController.snapWallToVertices(newStart, newEnd, vertices, excludeIndices);
        newStart = snapResult.snappedStart;
        newEnd = snapResult.snappedEnd;
        editorRenderer.setSnapGuides(snapResult.guides);
      }
    } else {
      editorRenderer.setSnapGuides([]);
    }

    moveWall(currentSelectedWallId!, newStart, newEnd);
  }

  function handleDrawingMove(event: InputEvent): void {
    const lastVertex = wallBuilder.lastVertex;
    if (!lastVertex) return;

    // Grid snap mode - bypass angle snapping entirely
    const gridSize = currentDisplayPrefs.gridSize || 0.5;
    if (currentDisplayPrefs.gridSnapEnabled && gridSize > 0) {
      const gridPos = snapController.snapToGrid(event.worldPos, gridSize);
      editorRenderer.setPhantomLine(lastVertex, gridPos);
      return;
    }

    // Normal mode with angle snapping
    const snappedPos = wallBuilder.continueDrawing(event.worldPos);
    editorRenderer.setPhantomLine(lastVertex, snappedPos);

    const snap = wallBuilder.currentSnap;
    if (snap) {
      dispatch('snapChange', { snapType: snap.snapType });
    }
  }

  // ============================================
  // Mouse Up Handling
  // ============================================

  function handleMouseUp(): void {
    // Set measurement endpoint if vertex was clicked but not dragged
    if (measurementController.isActive && !measurementController.isFromLight &&
        currentSelectedVertexIndex !== null && isDraggingVertex && !didDragVertex) {
      const vertices = getVertices(currentRoomState);
      measurementController.setTargetVertex(currentSelectedVertexIndex, vertices[currentSelectedVertexIndex]);
      updateMeasurementDisplay();
    }

    // Reset drag state
    isDraggingVertex = false;
    isDraggingLight = false;
    isDraggingWall = false;
    didDragVertex = false;
    wallDragStart = null;
    wallDragOriginalVertices = null;
    editorRenderer?.setSnapGuides([]);
  }

  // ============================================
  // Double Click Handling
  // ============================================

  function handleDoubleClick(event: InputEvent): void {
    if (currentRoomState.isClosed && $activeTool === 'select') {
      const wall = editorRenderer.getWallAtPosition(event.worldPos, currentRoomState.walls, 0.3);
      if (wall) {
        const insertPos = projectPointOntoSegmentForInsertion(event.worldPos, wall.start, wall.end);
        const newVertexIndex = insertVertexOnWall(wall.id, insertPos);
        if (newVertexIndex !== null) {
          selectedVertexIndex.set(newVertexIndex);
          selectedWallId.set(null);
          clearLightSelection();
        }
      }
    }
  }

  // ============================================
  // Keyboard Handling
  // ============================================

  function handleKeyDown(event: InputEvent): void {
    if (!event.key) return;

    // Undo/Redo
    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
      event.shiftKey ? historyStore.redo() : historyStore.undo();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'y') {
      historyStore.redo();
      return;
    }

    switch (event.key) {
      case 'Escape':
        handleEscape();
        break;

      case 'Delete':
      case 'Backspace':
        handleDelete();
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

      case 'u':
      case 'U':
        toggleUnitFormat();
        break;

      case 'm':
      case 'M':
        handleMeasurementToggle();
        break;

      case 'q':
      case 'Q':
        toggleLightingStats();
        break;
    }
  }

  function handleEscape(): void {
    if (measurementController.isActive) {
      clearMeasurement();
    }
    if (wallBuilder.drawing) {
      wallBuilder.cancel();
      editorRenderer.setPhantomLine(null, null);
      editorRenderer.updateDrawingVertices([]);
    }
    clearLightSelection();
    selectedWallId.set(null);
    selectedVertexIndex.set(null);
  }

  function handleDelete(): void {
    if (currentSelectedLightIds.size > 0) {
      // Remove all selected lights
      for (const id of currentSelectedLightIds) {
        lightManager.removeLight(id);
      }
      roomStore.update(state => ({
        ...state,
        lights: state.lights.filter(l => !currentSelectedLightIds.has(l.id)),
      }));
      clearLightSelection();
    } else if (currentSelectedVertexIndex !== null && currentRoomState.walls.length > 3) {
      deleteVertex(currentSelectedVertexIndex);
      selectedVertexIndex.set(null);
    }
  }

  function handleMeasurementToggle(): void {
    if (measurementController.isActive) {
      clearMeasurement();
      return;
    }

    // Start from vertex
    if (currentSelectedVertexIndex !== null) {
      const vertices = getVertices(currentRoomState);
      measurementController.startFromVertex(currentSelectedVertexIndex, vertices[currentSelectedVertexIndex]);
      dispatch('measurement', null);
      return;
    }

    // Start from light
    if (currentSelectedLightId) {
      const light = currentRoomState.lights.find(l => l.id === currentSelectedLightId);
      if (light) {
        measurementController.startFromLight(currentSelectedLightId, light.position);
        dispatch('measurement', null);
      }
    }
  }

  // ============================================
  // Measurement Helpers
  // ============================================

  function updateMeasurementDisplay(): void {
    const from = measurementController.fromPosition;
    const to = measurementController.toPosition;
    editorRenderer.setMeasurementLine(from, to);

    const data = measurementController.getMeasurementData();
    dispatch('measurement', data);
  }

  function clearMeasurement(): void {
    measurementController.clear();
    editorRenderer?.setMeasurementLine(null, null);
    dispatch('measurement', null);
  }

  // ============================================
  // Animation
  // ============================================

  function animate(): void {
    scene.render();
    animationFrameId = requestAnimationFrame(animate);
  }

  // ============================================
  // Lifecycle
  // ============================================

  onMount(() => {
    scene = new Scene(container);
    inputManager = new InputManager(scene);
    editorRenderer = new EditorRenderer(scene.scene);
    heatmapRenderer = new HeatmapRenderer(scene.scene);
    shadowRenderer = new ShadowRenderer(scene.scene);
    rafterOverlay = new RafterOverlay(scene.scene, currentRafterConfig);
    deadZoneRenderer = new DeadZoneRenderer(scene.scene);
    spacingWarningRenderer = new SpacingWarningRenderer(scene.scene);
    wallBuilder = new WallBuilder();
    polygonValidator = new PolygonValidator();
    lightManager = new LightManager();
    snapController = new SnapController();
    measurementController = new MeasurementController();

    inputManager.on('click', handleClick);
    inputManager.on('dblclick', handleDoubleClick);
    inputManager.on('move', handleMouseMove);
    inputManager.on('drag', handleMouseMove);
    inputManager.on('mouseup', handleMouseUp);
    inputManager.on('keydown', handleKeyDown);

    heatmapRenderer.setVisible(false);
    shadowRenderer.setVisible(false);
    deadZoneRenderer.setVisible(false);
    spacingWarningRenderer.setVisible(false);

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
    deadZoneRenderer?.dispose();
    spacingWarningRenderer?.dispose();
    scene?.dispose();
  });

  // ============================================
  // Exported Methods
  // ============================================

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
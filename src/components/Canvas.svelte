<script lang="ts">
    import {createEventDispatcher, onDestroy, onMount} from 'svelte';
    import {get} from 'svelte/store';
    import {Scene} from '../core/Scene';
    import {type InputEvent, InputManager} from '../core/InputManager';
    import {EditorRenderer} from '../rendering/EditorRenderer';
    import {HeatmapRenderer} from '../rendering/HeatmapRenderer';
    import {ShadowRenderer} from '../rendering/ShadowRenderer';
    import {RafterOverlay} from '../rendering/RafterOverlay';
    import {DeadZoneRenderer} from '../rendering/DeadZoneRenderer';
    import {SpacingWarningRenderer} from '../rendering/SpacingWarningRenderer';
    import {WallBuilder} from '../geometry/WallBuilder';
    import {PolygonValidator} from '../geometry/PolygonValidator';
    import {LightManager} from '../lighting/LightManager';
    import {MeasurementController, SnapController} from '../controllers';
    import {
        canPlaceLights,
        canPlaceDoors,
        deleteVertex,
        getVertices,
        getDoorsByWallId,
        insertVertexOnWall,
        moveWall,
        roomBounds,
        roomStore,
        updateVertexPosition,
        updateObstacleVertexPosition,
        updateDoor,
        addDoor,
        removeDoor,
        addObstacle,
        removeObstacle,
        moveObstacle
    } from '../stores/roomStore';
    import {
        clearLightSelection,
        clearVertexSelection,
        clearDoorSelection,
        clearObstacleSelection,
        clearObstacleVertexSelection,
        isDrawingEnabled,
        isLightPlacementEnabled,
        isDoorPlacementEnabled,
        isObstacleDrawingEnabled,
        selectedLightId,
        selectedLightIds,
        selectedVertexIndex,
        selectedVertexIndices,
        selectedWallId,
        selectedDoorId,
        selectedObstacleId,
        selectedObstacleVertexIndices,
        selectLight,
        selectVertex,
        selectObstacle,
        selectObstacleVertex,
        shouldFitCamera,
        selectDoor,
        viewMode
    } from '../stores/appStore';
    import {historyStore} from '../stores/historyStore';
    import {getDoorPlacementSettings} from '../stores/doorStore';
    import {displayPreferences, rafterConfig, toggleUnitFormat} from '../stores/settingsStore';
    import {deadZoneConfig} from '../stores/deadZoneStore';
    import {spacingConfig, spacingWarnings} from '../stores/spacingStore';
    import {toggleLightingStats} from '../stores/lightingStatsStore';
    import {selectedDefinitionId} from '../stores/lightDefinitionsStore';
    import {isMeasuring} from '../stores/measurementStore';
    import type {
        BoundingBox,
        BoxSelectionState,
        DeadZoneConfig,
        DisplayPreferences,
        InteractionContext,
        RafterConfig,
        RoomState,
        SpacingConfig,
        SpacingWarning,
        Vector2,
        ViewMode
    } from '../types';

    // Interaction system imports
    import {
        BoxSelectionHandler,
        createDefaultKeyboardShortcuts,
        DoorDragOperation,
        DragManager,
        DrawingHandler,
        DoorPlacementHandler,
        EMPTY_MODIFIERS,
        GrabModeDragOperation,
        GrabModeHandler,
        InteractionManager,
        KeyboardShortcutManager,
        LightPlacementHandler,
        MeasurementHandler,
        ObstacleDrawingHandler,
        ObstacleDragOperation,
        ObstacleVertexDragOperation,
        SelectionHandler,
        UnifiedDragOperation,
        WallDragOperation,
    } from '../interactions';

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
  let obstacleWallBuilder: WallBuilder;
  let polygonValidator: PolygonValidator;
  let lightManager: LightManager;
  let snapController: SnapController;
  let measurementController: MeasurementController;
  let animationFrameId: number;

  // Interaction system
  let dragManager: DragManager;
  let interactionManager: InteractionManager;
  let keyboardShortcutManager: KeyboardShortcutManager;

  // Handlers
  let drawingHandler: DrawingHandler;
  let obstacleDrawingHandler: ObstacleDrawingHandler;
  let lightPlacementHandler: LightPlacementHandler;
  let doorPlacementHandler: DoorPlacementHandler;
  let boxSelectionHandler: BoxSelectionHandler;
  let measurementHandler: MeasurementHandler;
  let grabModeHandler: GrabModeHandler;
  let selectionHandler: SelectionHandler;

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
  let isPlacingDoors = false;
  let isObstacleDrawing = false;
  let currentSelectedLightId: string | null = null;
  let currentSelectedLightIds: Set<string> = new Set();
  let currentSelectedWallId: string | null = null;
  let currentSelectedDoorId: string | null = null;
  let currentSelectedObstacleId: string | null = null;
  let currentSelectedVertexIndex: number | null = null;
  let currentSelectedVertexIndices: Set<number> = new Set();
  let currentSelectedObstacleVertexIndices: Set<number> = new Set();

  // Interaction state
  let isGrabMode = false;
  let boxSelectionState: BoxSelectionState = {
    isSelecting: false,
    startPosition: null,
    currentPosition: null,
  };

  // ============================================
  // Store Subscriptions
  // ============================================

  $: currentViewMode = $viewMode;
  $: currentRoomState = $roomStore;
  $: currentBounds = $roomBounds;
  $: isDrawing = $isDrawingEnabled;
  $: isPlacingLights = $isLightPlacementEnabled;
  $: isPlacingDoors = $isDoorPlacementEnabled;
  $: isObstacleDrawing = $isObstacleDrawingEnabled;

  // Clear door preview when exiting door placement mode
  $: if (editorRenderer && !isPlacingDoors) {
    editorRenderer.clearDoorPreview();
  }

  // Clear vertex preview when exiting draw mode
  $: if (editorRenderer && !isDrawing) {
    editorRenderer.setPreviewVertex(null);
  }

  // Clear light preview when exiting light placement mode
  $: if (editorRenderer && !isPlacingLights) {
    editorRenderer.setPreviewLight(null);
  }

  // Clear obstacle drawing preview when exiting obstacle drawing mode
  $: if (editorRenderer && !isObstacleDrawing) {
    editorRenderer.setPreviewVertex(null);
  }

  $: currentSelectedLightId = $selectedLightId;
  $: currentSelectedLightIds = $selectedLightIds;
  $: currentSelectedWallId = $selectedWallId;
  $: currentSelectedDoorId = $selectedDoorId;
  $: currentSelectedObstacleId = $selectedObstacleId;
  $: currentSelectedObstacleVertexIndices = $selectedObstacleVertexIndices;
  $: currentSelectedVertexIndex = $selectedVertexIndex;
  $: currentSelectedVertexIndices = $selectedVertexIndices;
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
    editorRenderer.updateWalls(currentRoomState.walls, currentSelectedWallId, currentSelectedVertexIndices, currentRoomState.doors ?? []);
    editorRenderer.updateLights(currentRoomState.lights, currentRoomState.ceilingHeight, currentSelectedLightIds);
    editorRenderer.updateDoors(currentRoomState.doors ?? [], currentRoomState.walls, currentSelectedDoorId);
    editorRenderer.updateObstacles(currentRoomState.obstacles ?? [], currentSelectedObstacleId, currentSelectedObstacleVertexIndices);
    lightManager?.setLights(currentRoomState.lights);
  }

  $: if (heatmapRenderer && currentRoomState && currentBounds) {
    heatmapRenderer.updateBounds(currentBounds);
    heatmapRenderer.updateWalls(currentRoomState.walls);
    heatmapRenderer.updateObstacles(currentRoomState.obstacles ?? []);
    heatmapRenderer.updateLights(currentRoomState.lights, currentRoomState.ceilingHeight);
  }

  $: if (shadowRenderer && currentRoomState && currentBounds) {
    shadowRenderer.updateShadows(currentRoomState.lights, currentRoomState.walls, currentBounds, currentRoomState.doors ?? [], currentRoomState.obstacles ?? [], currentRoomState.ceilingHeight);
  }

  $: if (rafterOverlay && currentRafterConfig && currentBounds) {
    rafterOverlay.updateConfig(currentRafterConfig);
    rafterOverlay.render(currentBounds);
  }

  $: if (editorRenderer && currentDisplayPrefs) {
    editorRenderer.setUnitFormat(currentDisplayPrefs.unitFormat);
    editorRenderer.setLightRadiusVisibility(currentDisplayPrefs.lightRadiusVisibility);
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

  // Fit camera to room bounds only when explicitly requested (project load/import)
  $: if ($shouldFitCamera && scene && currentBounds && currentRoomState.walls.length > 0) {
    scene.fitToBounds(currentBounds);
    shouldFitCamera.set(false);
  }

  // Update measurement when room state changes (e.g., undo/redo)
  $: if (measurementController && currentRoomState && measurementController.isActive) {
    updateMeasurementPositions();
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
  // Context Builder
  // ============================================

  function buildInteractionContext(): InteractionContext {
    return {
      roomState: currentRoomState,
      selection: {
        selectedVertexIndices: currentSelectedVertexIndices,
        selectedLightIds: currentSelectedLightIds,
        selectedWallId: currentSelectedWallId,
        selectedDoorId: currentSelectedDoorId,
        selectedObstacleId: currentSelectedObstacleId,
        selectedObstacleVertexIndices: currentSelectedObstacleVertexIndices,
      },
      isDrawingEnabled: isDrawing,
      isPlacingLights: isPlacingLights,
      isPlacingDoors: isPlacingDoors,
      isObstacleDrawing: isObstacleDrawing,
      isMeasuring: measurementController?.isActive ?? false,
      isGrabMode: isGrabMode,
      isBoxSelecting: boxSelectionState.isSelecting,
      currentMousePos: currentMousePos,
      vertices: getVertices(currentRoomState),
    };
  }

  // ============================================
  // Event Handlers
  // ============================================

  function handleClick(event: InputEvent): void {
    const context = buildInteractionContext();
    interactionManager.handleClick(event, context);
  }

  function handleDoubleClick(event: InputEvent): void {
    const context = buildInteractionContext();
    interactionManager.handleDoubleClick(event, context);
  }

  function handleMouseMove(event: InputEvent): void {
    currentMousePos = event.worldPos;
    dispatch('mouseMove', { worldPos: event.worldPos });

    const context = buildInteractionContext();

    // Handle drag updates
    if (dragManager.isActive && !isGrabMode) {
      dragManager.updateDrag(event.worldPos, {
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
      });
      return;
    }

    interactionManager.handleMouseMove(event, context);
  }

  function handleMouseUp(event: InputEvent): void {
    // Don't handle mouse up in grab mode
    if (isGrabMode) return;

    const context = buildInteractionContext();

    // First check if InteractionManager handles it (e.g., box selection)
    if (interactionManager.handleMouseUp(event, context)) return;

    // Commit any active drag
    if (dragManager.isActive) {
      dragManager.commitDrag();
    }
  }

  function handleKeyDown(event: InputEvent): void {
    if (!event.key) return;

    const context = buildInteractionContext();

    // Let InteractionManager handle first (for mode-specific keys)
    if (interactionManager.handleKeyDown(event, context)) return;

    // Then try keyboard shortcuts
    keyboardShortcutManager.handle(event, context);
  }

  // ============================================
  // Measurement Helpers
  // ============================================

  function updateMeasurementPositions(): void {
    const vertices = getVertices(currentRoomState);
    const source = measurementController.source;
    const target = measurementController.target;

    // Update source position if it's a vertex
    if (source?.type === 'vertex') {
      const idx = source.index;
      if (vertices[idx]) {
        measurementController.updateSourcePosition(vertices[idx]);
      }
    }

    // Update source position if it's a light
    if (source?.type === 'light') {
      const light = currentRoomState.lights.find(l => l.id === source.id);
      if (light) {
        measurementController.updateSourcePosition(light.position, currentRoomState.walls);
      }
    }

    // Update target position if it's a vertex
    if (target?.type === 'vertex') {
      const idx = target.index;
      if (vertices[idx]) {
        measurementController.updateTargetPosition(vertices[idx]);
      }
    }

    // Update target position if it's a light
    if (target?.type === 'light') {
      const light = currentRoomState.lights.find(l => l.id === target.id);
      if (light) {
        measurementController.updateTargetPosition(light.position);
      }
    }

    // Refresh the display
    if (measurementController.fromPosition && measurementController.toPosition) {
      editorRenderer?.setMeasurementLine(measurementController.fromPosition, measurementController.toPosition);
      dispatch('measurement', measurementController.getMeasurementData());
    }
  }

  function handleMeasurementToggle(): void {
    if (measurementController.isActive) {
      measurementHandler.clearMeasurement();
      return;
    }

    // Start from vertex
    if (currentSelectedVertexIndex !== null) {
      const vertices = getVertices(currentRoomState);
      measurementHandler.startFromVertex(currentSelectedVertexIndex, vertices[currentSelectedVertexIndex]);
      isMeasuring.set(true);
      return;
    }

    // Start from light
    if (currentSelectedLightId) {
      const light = currentRoomState.lights.find(l => l.id === currentSelectedLightId);
      if (light) {
        measurementHandler.startFromLight(currentSelectedLightId, light.position);
        isMeasuring.set(true);
      }
    }
  }

  function handleEscape(): void {
    if (isGrabMode) {
      dragManager.cancelDrag();
      isGrabMode = false;
      return;
    }
    if (boxSelectionState.isSelecting) {
      boxSelectionState = { isSelecting: false, startPosition: null, currentPosition: null };
      editorRenderer?.setSelectionBox(null, null);
      return;
    }
    if (dragManager.axisLock !== 'none') {
      dragManager.clearAxisLock();
      return;
    }
    if (measurementController.isActive) {
      measurementHandler.clearMeasurement();
      return;
    }
    if (obstacleWallBuilder?.drawing) {
      obstacleWallBuilder.cancel();
      editorRenderer.setPhantomLine(null, null);
      editorRenderer.updateDrawingVertices([]);
      return;
    }
    if (wallBuilder.drawing) {
      wallBuilder.cancel();
      editorRenderer.setPhantomLine(null, null);
      editorRenderer.updateDrawingVertices([]);
      return;
    }
    clearLightSelection();
    selectedWallId.set(null);
    clearVertexSelection();
    clearDoorSelection();
    clearObstacleSelection();
    clearObstacleVertexSelection();
  }

  function handleSelectAllObstacleVertices(): void {
    if (!currentSelectedObstacleId) return;
    const obstacles = currentRoomState.obstacles ?? [];
    const obstacle = obstacles.find(o => o.id === currentSelectedObstacleId);
    if (!obstacle) return;

    const allIndices = new Set<number>();
    for (let i = 0; i < obstacle.walls.length; i++) {
      allIndices.add(i);
    }
    selectedObstacleVertexIndices.set(allIndices);
  }

  function handleDelete(): void {
    if (currentSelectedVertexIndices.size > 0 && currentRoomState.walls.length > 3) {
      const sortedIndices = Array.from(currentSelectedVertexIndices).sort((a, b) => b - a);
      for (const idx of sortedIndices) {
        if (currentRoomState.walls.length > 3) {
          deleteVertex(idx);
        }
      }
      clearVertexSelection();
    } else if (currentSelectedObstacleId && currentSelectedObstacleVertexIndices.size === 0) {
      removeObstacle(currentSelectedObstacleId);
      clearObstacleSelection();
    } else if (currentSelectedDoorId) {
      removeDoor(currentSelectedDoorId);
      clearDoorSelection();
    } else if (currentSelectedLightIds.size > 0) {
      for (const id of currentSelectedLightIds) {
        lightManager.removeLight(id);
      }
      roomStore.update(state => ({
        ...state,
        lights: state.lights.filter(l => !currentSelectedLightIds.has(l.id)),
      }));
      clearLightSelection();
    }
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
    // Core components
    scene = new Scene(container);
    inputManager = new InputManager(scene);
    editorRenderer = new EditorRenderer(scene.scene);
    heatmapRenderer = new HeatmapRenderer(scene.scene);
    shadowRenderer = new ShadowRenderer(scene.scene);
    rafterOverlay = new RafterOverlay(scene.scene, currentRafterConfig);
    deadZoneRenderer = new DeadZoneRenderer(scene.scene);
    spacingWarningRenderer = new SpacingWarningRenderer(scene.scene);
    wallBuilder = new WallBuilder();
    obstacleWallBuilder = new WallBuilder();
    polygonValidator = new PolygonValidator();
    lightManager = new LightManager();
    snapController = new SnapController();
    measurementController = new MeasurementController();

    // Initialize drag manager
    dragManager = new DragManager({
      onUpdateVertexPosition: (idx, pos) => updateVertexPosition(idx, pos),
      onUpdateLightPositions: (updates) => {
        roomStore.update(state => ({
          ...state,
          lights: state.lights.map(light => {
            const newPos = updates.get(light.id);
            return newPos ? { ...light, position: newPos } : light;
          }),
        }));
      },
      onMoveWall: (wallId, newStart, newEnd) => moveWall(wallId, newStart, newEnd),
      onUpdateDoorPosition: (doorId, position) => updateDoor(doorId, { position }),
      onUpdateObstacleVertexPosition: (obstacleId, vertexIndex, position) => updateObstacleVertexPosition(obstacleId, vertexIndex, position),
      onMoveObstacle: (obstacleId, vertexPositions) => moveObstacle(obstacleId, vertexPositions),
      onSetSnapGuides: (guides) => editorRenderer?.setSnapGuides(guides),
      onPauseHistory: () => historyStore.pauseRecording(),
      onResumeHistory: () => historyStore.resumeRecording(),
    });

    // Initialize interaction manager
    interactionManager = new InteractionManager();

    // Initialize keyboard shortcut manager
    keyboardShortcutManager = new KeyboardShortcutManager();
    keyboardShortcutManager.registerAll(createDefaultKeyboardShortcuts({
      setViewMode: (mode) => viewMode.set(mode),
      toggleRafters: () => rafterConfig.update(c => ({ ...c, visible: !c.visible })),
      toggleUnitFormat: () => toggleUnitFormat(),
      toggleMeasurement: () => handleMeasurementToggle(),
      toggleLightingStats: () => toggleLightingStats(),
      undo: () => historyStore.undo(),
      redo: () => historyStore.redo(),
      handleEscape: () => handleEscape(),
      handleDelete: () => handleDelete(),
      selectAllObstacleVertices: () => handleSelectAllObstacleVertices(),
    }));

    // Initialize handlers
    drawingHandler = new DrawingHandler(
      {
        wallBuilder,
        polygonValidator,
        snapController,
        getGridSnapEnabled: () => currentDisplayPrefs.gridSnapEnabled,
        getGridSize: () => currentDisplayPrefs.gridSize || 0.5,
      },
      {
        onUpdateDrawingVertices: (vertices) => editorRenderer.updateDrawingVertices(vertices),
        onSetPhantomLine: (from, to) => editorRenderer.setPhantomLine(from, to),
        onSetPreviewVertex: (pos) => editorRenderer.setPreviewVertex(pos),
        onCloseRoom: (walls) => roomStore.update(state => ({ ...state, walls, isClosed: true })),
        onSnapChange: (snapType) => dispatch('snapChange', { snapType }),
      }
    );

    obstacleDrawingHandler = new ObstacleDrawingHandler(
      {
        wallBuilder: obstacleWallBuilder,
        polygonValidator,
        snapController,
        getGridSnapEnabled: () => currentDisplayPrefs.gridSnapEnabled,
        getGridSize: () => currentDisplayPrefs.gridSize || 0.5,
      },
      {
        onUpdateDrawingVertices: (vertices) => editorRenderer.updateDrawingVertices(vertices),
        onSetPhantomLine: (from, to) => editorRenderer.setPhantomLine(from, to),
        onSetPreviewVertex: (pos) => editorRenderer.setPreviewVertex(pos),
        onCloseObstacle: (walls) => {
          const obstacle = {
            id: `obstacle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            walls,
            height: currentRoomState.ceilingHeight,
          };
          addObstacle(obstacle);
        },
        onSnapChange: (snapType) => dispatch('snapChange', { snapType }),
      }
    );

    lightPlacementHandler = new LightPlacementHandler(
      {
        lightManager,
        polygonValidator,
        snapController,
        getSelectedDefinitionId: () => get(selectedDefinitionId),
        canPlaceLights: () => get(canPlaceLights),
        getWalls: () => currentRoomState.walls,
        getGridSnapEnabled: () => currentDisplayPrefs.gridSnapEnabled,
        getGridSize: () => currentDisplayPrefs.gridSize || 0.5,
      },
      {
        onLightPlaced: (light) => roomStore.update(state => ({ ...state, lights: [...state.lights, light] })),
        onSetPreviewLight: (pos, isValid) => editorRenderer.setPreviewLight(pos, isValid),
      }
    );

    doorPlacementHandler = new DoorPlacementHandler(
      {
        getWalls: () => currentRoomState.walls,
        getDoors: () => currentRoomState.doors ?? [],
        getWallAtPosition: (pos, walls, tolerance) => editorRenderer.getWallAtPosition(pos, walls, tolerance),
        getSelectedDoorWidth: () => getDoorPlacementSettings().width,
        getSelectedDoorSwingDirection: () => getDoorPlacementSettings().swingDirection,
        getSelectedDoorSwingSide: () => getDoorPlacementSettings().swingSide,
        canPlaceDoors: () => get(canPlaceDoors),
      },
      {
        onDoorPlaced: (door) => addDoor(door),
        onDoorPreview: (door, wall, canPlace) => {
          if (door && wall) {
            editorRenderer.setDoorPreview(door, wall, canPlace);
          } else {
            editorRenderer.clearDoorPreview();
          }
        },
      }
    );

    boxSelectionHandler = new BoxSelectionHandler(
      {
        getBoxSelectionState: () => boxSelectionState,
        setBoxSelectionState: (state) => { boxSelectionState = state; },
      },
      {
        onBoxSelectionStart: (_start) => {},
        onBoxSelectionUpdate: (start, current) => editorRenderer.setSelectionBox(start, current),
        onBoxSelectionComplete: (vertexIndices, lightIds, obstacleVertices, addToSelection) => {
          // When an obstacle is selected, box select only applies to that obstacle's vertices
          if (obstacleVertices.length > 0) {
            const first = obstacleVertices[0];
            if (addToSelection) {
              selectedObstacleVertexIndices.update(existing => {
                const newSet = new Set(existing);
                for (const idx of first.vertexIndices) newSet.add(idx);
                return newSet;
              });
            } else {
              selectedObstacleVertexIndices.set(new Set(first.vertexIndices));
            }
          } else if (currentSelectedObstacleId) {
            // Obstacle selected but no obstacle vertices in box — clear obstacle vertex selection
            if (!addToSelection) {
              selectedObstacleVertexIndices.set(new Set());
            }
          } else {
            // No obstacle selected — normal room vertex/light selection
            if (vertexIndices.length > 0) {
              if (addToSelection) {
                selectedVertexIndices.update(existing => {
                  const newSet = new Set(existing);
                  for (const idx of vertexIndices) newSet.add(idx);
                  return newSet;
                });
              } else {
                selectedVertexIndices.set(new Set(vertexIndices));
              }
            }
            if (lightIds.length > 0) {
              if (addToSelection) {
                selectedLightIds.update(existing => {
                  const newSet = new Set(existing);
                  for (const id of lightIds) newSet.add(id);
                  return newSet;
                });
              } else {
                selectedLightIds.set(new Set(lightIds));
              }
            }
          }
          editorRenderer?.setSelectionBox(null, null);
        },
        onBoxSelectionCancel: () => editorRenderer?.setSelectionBox(null, null),
      }
    );

    measurementHandler = new MeasurementHandler(
      {
        measurementController,
        lightManager,
        getWalls: () => currentRoomState.walls,
      },
      {
        onMeasurementUpdate: (data) => {
          if (data) {
            editorRenderer.setMeasurementLine(data.from, data.to);
          }
          dispatch('measurement', data);
        },
        onMeasurementClear: () => {
          isMeasuring.set(false);
          editorRenderer?.setMeasurementLine(null, null);
          dispatch('measurement', null);
        },
        onSelectLight: (id) => selectLight(id),
        onSelectVertex: (index, addToSelection) => {
          selectVertex(index, addToSelection);
          selectedWallId.set(null);
          clearLightSelection();
        },
        onStartDrag: (vertexIndex, lightId, pos) => {
          const operation = createUnifiedDragOperation();
          operation.setAnchor(vertexIndex, lightId);
          dragManager.startDrag(operation, {
            position: pos,
            modifiers: EMPTY_MODIFIERS,
            roomState: currentRoomState,
            selection: buildInteractionContext().selection,
          });
        },
        getWallAtPosition: (pos, walls, tolerance) => editorRenderer.getWallAtPosition(pos, walls, tolerance),
      }
    );

    grabModeHandler = new GrabModeHandler(
      {
        dragManager,
        createGrabOperation: () => new GrabModeDragOperation(
          {
            snapController,
            getGridSnapEnabled: () => currentDisplayPrefs.gridSnapEnabled,
            getGridSize: () => currentDisplayPrefs.gridSize || 0.5,
            getVertices: () => getVertices(currentRoomState),
            getLights: () => currentRoomState.lights,
            getWalls: () => currentRoomState.walls,
            getWallById: (id) => currentRoomState.walls.find(w => w.id === id),
            getDoors: () => currentRoomState.doors ?? [],
            getDoorById: (id) => (currentRoomState.doors ?? []).find(d => d.id === id),
            getDoorsByWallId: (wallId) => getDoorsByWallId(currentRoomState, wallId),
            isRoomClosed: () => currentRoomState.isClosed,
            getCurrentMousePos: () => currentMousePos,
          },
          dragManager.getCallbacks()
        ),
        getGrabModeState: () => ({ isActive: isGrabMode, offset: null, originalPositions: null as any }),
        setGrabModeActive: (active) => { isGrabMode = active; },
        getSelection: () => buildInteractionContext().selection,
        getCurrentMousePos: () => currentMousePos,
        getVertices: () => getVertices(currentRoomState),
        getLights: () => currentRoomState.lights,
        getWalls: () => currentRoomState.walls,
        getDoors: () => currentRoomState.doors ?? [],
        getDoorById: (id) => (currentRoomState.doors ?? []).find(d => d.id === id),
        getWallById: (id) => currentRoomState.walls.find(w => w.id === id),
      },
      {
        onGrabModeStart: () => {},
        onGrabModeConfirm: () => {},
        onGrabModeCancel: () => {},
      }
    );

    selectionHandler = new SelectionHandler(
      {
        lightManager,
        dragManager,
        boxSelectionHandler,
        createUnifiedDragOperation,
        createWallDragOperation,
        createDoorDragOperation,
        createObstacleVertexDragOperation,
        createObstacleDragOperation,
        getSelection: () => buildInteractionContext().selection,
        getCurrentMousePos: () => currentMousePos,
      },
      {
        onSelectVertex: (index, addToSelection) => selectVertex(index, addToSelection),
        onSelectLight: (id, addToSelection) => selectLight(id, addToSelection),
        onSelectWall: (id) => selectedWallId.set(id),
        onSelectDoor: (id) => selectDoor(id),
        onSelectObstacle: (id) => selectObstacle(id),
        onSelectObstacleVertex: (obstacleId, vertexIndex, addToSelection) => selectObstacleVertex(obstacleId, vertexIndex, addToSelection),
        onClearSelection: () => {
          clearLightSelection();
          selectedWallId.set(null);
          clearVertexSelection();
          clearDoorSelection();
          clearObstacleSelection();
          dragManager.clearAxisLock();
        },
        onClearLightSelection: () => clearLightSelection(),
        onClearVertexSelection: () => clearVertexSelection(),
        onClearWallSelection: () => selectedWallId.set(null),
        onClearDoorSelection: () => clearDoorSelection(),
        onClearObstacleSelection: () => clearObstacleSelection(),
        onClearObstacleVertexSelection: () => clearObstacleVertexSelection(),
        onInsertVertex: (wallId, position) => insertVertexOnWall(wallId, position),
        getSelectedVertexIndices: () => get(selectedVertexIndices),
        getSelectedLightIds: () => get(selectedLightIds),
        getSelectedObstacleVertexIndices: () => get(selectedObstacleVertexIndices),
        getWallAtPosition: (pos, walls, tolerance) => editorRenderer.getWallAtPosition(pos, walls, tolerance),
        getDoors: () => currentRoomState.doors ?? [],
        getObstacles: () => currentRoomState.obstacles ?? [],
      }
    );

    // Register handlers (order determines priority for overlapping canHandle)
    interactionManager.registerHandler(grabModeHandler);
    interactionManager.registerHandler(measurementHandler);
    interactionManager.registerHandler(drawingHandler);
    interactionManager.registerHandler(obstacleDrawingHandler);
    interactionManager.registerHandler(lightPlacementHandler);
    interactionManager.registerHandler(doorPlacementHandler);
    interactionManager.registerHandler(selectionHandler);
    interactionManager.registerHandler(boxSelectionHandler);

    // Set up input events
    inputManager.on('click', handleClick);
    inputManager.on('dblclick', handleDoubleClick);
    inputManager.on('move', handleMouseMove);
    inputManager.on('drag', handleMouseMove);
    inputManager.on('mouseup', handleMouseUp);
    inputManager.on('keydown', handleKeyDown);

    // Initial renderer visibility
    heatmapRenderer.setVisible(false);
    shadowRenderer.setVisible(false);
    deadZoneRenderer.setVisible(false);
    spacingWarningRenderer.setVisible(false);

    if (currentRoomState.lights.length > 0) {
      lightManager.setLights(currentRoomState.lights);
    }

    animate();
  });

  // Factory functions for drag operations
  function createUnifiedDragOperation(): UnifiedDragOperation {
    return new UnifiedDragOperation(
      {
        snapController,
        getGridSnapEnabled: () => currentDisplayPrefs.gridSnapEnabled,
        getGridSize: () => currentDisplayPrefs.gridSize || 0.5,
        getVertices: () => getVertices(currentRoomState),
        getLights: () => currentRoomState.lights,
        getWalls: () => currentRoomState.walls,
        isRoomClosed: () => currentRoomState.isClosed,
      },
      {
        ...dragManager.getCallbacks(),
        onMeasurementUpdate: (_delta) => {
          // Handle measurement updates during drag if needed
        },
      }
    );
  }

  function createWallDragOperation(): WallDragOperation {
    return new WallDragOperation(
      {
        snapController,
        getVertices: () => getVertices(currentRoomState),
        getWalls: () => currentRoomState.walls,
        getWallById: (id) => currentRoomState.walls.find(w => w.id === id),
      },
      dragManager.getCallbacks()
    );
  }

  function createObstacleVertexDragOperation(): ObstacleVertexDragOperation {
    return new ObstacleVertexDragOperation(
      {
        snapController,
        getGridSnapEnabled: () => currentDisplayPrefs.gridSnapEnabled,
        getGridSize: () => currentDisplayPrefs.gridSize || 0.5,
        getRoomVertices: () => getVertices(currentRoomState),
      },
      dragManager.getCallbacks()
    );
  }

  function createObstacleDragOperation(): ObstacleDragOperation {
    return new ObstacleDragOperation(
      {
        snapController,
        getGridSnapEnabled: () => currentDisplayPrefs.gridSnapEnabled,
        getGridSize: () => currentDisplayPrefs.gridSize || 0.5,
        getRoomVertices: () => getVertices(currentRoomState),
      },
      dragManager.getCallbacks()
    );
  }

  function createDoorDragOperation(): DoorDragOperation {
    return new DoorDragOperation(
      {
        getWallById: (id) => currentRoomState.walls.find(w => w.id === id),
        getDoorById: (id) => (currentRoomState.doors ?? []).find(d => d.id === id),
        getDoorsByWallId: (wallId) => getDoorsByWallId(currentRoomState, wallId),
      },
      dragManager.getCallbacks()
    );
  }

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

</script>

<div class="canvas-container" bind:this={container}></div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>

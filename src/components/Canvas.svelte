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
  import { getVertices, updateVertexPosition, insertVertexOnWall, deleteVertex, moveWall } from '../stores/roomStore';
  import { historyStore } from '../stores/historyStore';
  import { rafterConfig, displayPreferences, toggleUnitFormat } from '../stores/settingsStore';
  import type { Vector2, ViewMode, RoomState, BoundingBox, RafterConfig, DisplayPreferences } from '../types';

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
    measurement: { from: Vector2; to: Vector2; deltaX: number; deltaY: number; distance: number } | null;
  }>();

  let currentMousePos: Vector2 = { x: 0, y: 0 };
  let currentViewMode: ViewMode = 'editor';
  let currentRoomState: RoomState;
  let currentBounds: BoundingBox;
  let currentRafterConfig: RafterConfig;
  let currentDisplayPrefs: DisplayPreferences;
  let isDrawing = false;
  let isPlacingLights = false;
  let currentSelectedLightId: string | null = null;
  let currentSelectedWallId: string | null = null;
  let currentSelectedVertexIndex: number | null = null;
  let isDraggingVertex = false;
  let isDraggingLight = false;
  let isDraggingWall = false;
  let wallDragStart: Vector2 | null = null;
  let wallDragOriginalVertices: { start: Vector2; end: Vector2 } | null = null;
  let isMeasuring = false;
  let measureFromVertex: Vector2 | null = null;
  let measureToVertex: Vector2 | null = null;
  let didDragVertex = false;
  let measureFromLightId: string | null = null; // Track if measuring from a light
  let measureToWallId: string | null = null; // Track if measuring to a wall

  $: currentViewMode = $viewMode;
  $: currentRoomState = $roomStore;
  $: currentBounds = $roomBounds;
  $: isDrawing = $isDrawingEnabled;
  $: isPlacingLights = $isLightPlacementEnabled;
  $: currentSelectedLightId = $selectedLightId;
  $: currentSelectedWallId = $selectedWallId;
  $: currentSelectedVertexIndex = $selectedVertexIndex;
  $: currentRafterConfig = $rafterConfig;
  $: currentDisplayPrefs = $displayPreferences;

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

  $: if (editorRenderer && currentDisplayPrefs) {
    editorRenderer.setUnitFormat(currentDisplayPrefs.unitFormat);
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
    // Handle measurement mode - allow vertex selection for dragging
    // Measurement endpoint is set on mouseup if vertex wasn't dragged
    if (isMeasuring && measureFromVertex) {
      // If measuring from a light, allow clicking on walls or dragging the light
      if (measureFromLightId) {
        // Check if clicking on the source light to drag it
        const clickedLight = lightManager.getLightAt(event.worldPos, 0.5);
        if (clickedLight && clickedLight.id === measureFromLightId) {
          // Select light for dragging
          selectedLightId.set(clickedLight.id);
          selectedWallId.set(null);
          selectedVertexIndex.set(null);
          isDraggingLight = true;
          return;
        }

        const wall = editorRenderer.getWallAtPosition(event.worldPos, currentRoomState.walls, 0.4);
        if (wall) {
          // Project light position onto wall to get perpendicular point
          measureToWallId = wall.id;
          measureToVertex = projectPointOntoWallPerpendicular(measureFromVertex, wall);
          editorRenderer.setMeasurementLine(measureFromVertex, measureToVertex);
          dispatchMeasurement();
          return;
        }
        // Also allow clicking vertices when measuring from light
        const clickedVertexIndex = getVertexAtPosition(event.worldPos, getVertices(currentRoomState), 0.4);
        if (clickedVertexIndex !== null) {
          const vertices = getVertices(currentRoomState);
          measureToVertex = vertices[clickedVertexIndex];
          editorRenderer.setMeasurementLine(measureFromVertex, measureToVertex);
          dispatchMeasurement();
        }
        return;
      }

      // Measuring from vertex - allow vertex selection for dragging
      const clickedVertexIndex = getVertexAtPosition(event.worldPos, getVertices(currentRoomState), 0.4);
      if (clickedVertexIndex !== null) {
        // Select vertex for potential dragging
        selectedVertexIndex.set(clickedVertexIndex);
        selectedWallId.set(null);
        selectedLightId.set(null);
        isDraggingVertex = true;
        didDragVertex = false;
      }
      return;
    }

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
        isDraggingWall = true;
        wallDragStart = { ...pos };
        wallDragOriginalVertices = {
          start: { ...wall.start },
          end: { ...wall.end },
        };
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
      didDragVertex = true;
      let targetPos = event.worldPos;

      // Snap to other vertices when holding Shift
      if (event.shiftKey) {
        targetPos = snapToVertexAlignment(event.worldPos, currentSelectedVertexIndex);
      }

      updateVertexPosition(currentSelectedVertexIndex, targetPos);

      // Update measurement line if measuring and this vertex is an endpoint
      if (isMeasuring && measureFromVertex && measureToVertex) {
        const vertices = getVertices(currentRoomState);
        // Update measurement with current vertex positions
        const fromIdx = vertices.findIndex(v =>
          Math.abs(v.x - measureFromVertex!.x) < 0.01 && Math.abs(v.y - measureFromVertex!.y) < 0.01
        );
        const toIdx = vertices.findIndex(v =>
          Math.abs(v.x - measureToVertex!.x) < 0.01 && Math.abs(v.y - measureToVertex!.y) < 0.01
        );

        // If dragging one of the measurement vertices, update the measurement
        if (currentSelectedVertexIndex === fromIdx) {
          measureFromVertex = targetPos;
          editorRenderer.setMeasurementLine(measureFromVertex, measureToVertex);
          dispatchMeasurement();
        } else if (currentSelectedVertexIndex === toIdx) {
          measureToVertex = targetPos;
          editorRenderer.setMeasurementLine(measureFromVertex, measureToVertex);
          dispatchMeasurement();
        }
      }

      // Update snap guides
      if (event.shiftKey) {
        const snapResult = getSnapAlignment(event.worldPos, currentSelectedVertexIndex);
        editorRenderer.setSnapGuides(snapResult.guides);
      } else {
        editorRenderer.setSnapGuides([]);
      }
      return;
    }

    // Handle light dragging
    if (isDraggingLight && currentSelectedLightId) {
      let targetPos = event.worldPos;

      // Snap to other lights when holding Shift
      if (event.shiftKey) {
        const snapResult = getLightSnapAlignment(event.worldPos, currentSelectedLightId);
        targetPos = snapResult.snappedPos;
        editorRenderer.setSnapGuides(snapResult.guides);
      } else {
        editorRenderer.setSnapGuides([]);
      }

      // Only allow moving lights inside the room
      if (currentRoomState.isClosed && polygonValidator.isPointInside(targetPos, currentRoomState.walls)) {
        roomStore.update(state => ({
          ...state,
          lights: state.lights.map(light =>
            light.id === currentSelectedLightId
              ? { ...light, position: { ...targetPos } }
              : light
          ),
        }));

        // Update measurement if measuring from this light
        if (isMeasuring && measureFromLightId === currentSelectedLightId) {
          measureFromVertex = { ...targetPos };

          // If measuring to a wall, recalculate the projection
          if (measureToWallId) {
            const wall = currentRoomState.walls.find(w => w.id === measureToWallId);
            if (wall) {
              measureToVertex = projectPointOntoWallPerpendicular(measureFromVertex, wall);
            }
          }

          if (measureToVertex) {
            editorRenderer.setMeasurementLine(measureFromVertex, measureToVertex);
            dispatchMeasurement();
          }
        }
      }
      return;
    }

    // Handle wall dragging
    if (isDraggingWall && currentSelectedWallId && wallDragStart && wallDragOriginalVertices) {
      const delta = {
        x: event.worldPos.x - wallDragStart.x,
        y: event.worldPos.y - wallDragStart.y,
      };

      let newStart = {
        x: wallDragOriginalVertices.start.x + delta.x,
        y: wallDragOriginalVertices.start.y + delta.y,
      };
      let newEnd = {
        x: wallDragOriginalVertices.end.x + delta.x,
        y: wallDragOriginalVertices.end.y + delta.y,
      };

      // Snap to other vertices when holding Shift
      if (event.shiftKey) {
        const wallIndex = currentRoomState.walls.findIndex(w => w.id === currentSelectedWallId);
        if (wallIndex !== -1) {
          const snapResult = getWallSnapAlignment(newStart, newEnd, wallIndex);
          newStart = snapResult.snappedStart;
          newEnd = snapResult.snappedEnd;
          editorRenderer.setSnapGuides(snapResult.guides);
        }
      } else {
        editorRenderer.setSnapGuides([]);
      }

      moveWall(currentSelectedWallId, newStart, newEnd);
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
    // If measuring and a vertex was selected but not dragged, set it as measurement endpoint
    if (isMeasuring && measureFromVertex && currentSelectedVertexIndex !== null && isDraggingVertex && !didDragVertex) {
      const vertices = getVertices(currentRoomState);
      measureToVertex = vertices[currentSelectedVertexIndex];
      editorRenderer.setMeasurementLine(measureFromVertex, measureToVertex);
      dispatchMeasurement();
    }

    isDraggingVertex = false;
    isDraggingLight = false;
    isDraggingWall = false;
    didDragVertex = false;
    wallDragStart = null;
    wallDragOriginalVertices = null;
    editorRenderer?.setSnapGuides([]);
  }

  function dispatchMeasurement(): void {
    if (!measureFromVertex || !measureToVertex) return;
    const deltaX = measureToVertex.x - measureFromVertex.x;
    const deltaY = measureToVertex.y - measureFromVertex.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    dispatch('measurement', {
      from: measureFromVertex,
      to: measureToVertex,
      deltaX,
      deltaY,
      distance,
    });
  }

  const SNAP_THRESHOLD = 0.5; // feet

  interface SnapGuide {
    axis: 'x' | 'y';
    value: number;
    from: Vector2;
    to: Vector2;
  }

  function getSnapAlignment(pos: Vector2, excludeIndex: number): { snappedPos: Vector2; guides: SnapGuide[] } {
    const vertices = getVertices(currentRoomState);
    const guides: SnapGuide[] = [];
    let snappedX = pos.x;
    let snappedY = pos.y;
    let snapXVertex: Vector2 | null = null;
    let snapYVertex: Vector2 | null = null;

    for (let i = 0; i < vertices.length; i++) {
      if (i === excludeIndex) continue;

      const v = vertices[i];

      // Check X alignment
      if (Math.abs(pos.x - v.x) < SNAP_THRESHOLD) {
        if (!snapXVertex || Math.abs(pos.x - v.x) < Math.abs(pos.x - snapXVertex.x)) {
          snappedX = v.x;
          snapXVertex = v;
        }
      }

      // Check Y alignment
      if (Math.abs(pos.y - v.y) < SNAP_THRESHOLD) {
        if (!snapYVertex || Math.abs(pos.y - v.y) < Math.abs(pos.y - snapYVertex.y)) {
          snappedY = v.y;
          snapYVertex = v;
        }
      }
    }

    // Create guide lines
    if (snapXVertex) {
      guides.push({
        axis: 'x',
        value: snappedX,
        from: { x: snappedX, y: Math.min(pos.y, snapXVertex.y) - 1 },
        to: { x: snappedX, y: Math.max(pos.y, snapXVertex.y) + 1 },
      });
    }

    if (snapYVertex) {
      guides.push({
        axis: 'y',
        value: snappedY,
        from: { x: Math.min(pos.x, snapYVertex.x) - 1, y: snappedY },
        to: { x: Math.max(pos.x, snapYVertex.x) + 1, y: snappedY },
      });
    }

    return {
      snappedPos: { x: snappedX, y: snappedY },
      guides,
    };
  }

  function snapToVertexAlignment(pos: Vector2, excludeIndex: number): Vector2 {
    return getSnapAlignment(pos, excludeIndex).snappedPos;
  }

  function getLightSnapAlignment(pos: Vector2, excludeLightId: string): { snappedPos: Vector2; guides: SnapGuide[] } {
    const lights = currentRoomState.lights;
    const guides: SnapGuide[] = [];
    let snappedX = pos.x;
    let snappedY = pos.y;
    let snapXLight: Vector2 | null = null;
    let snapYLight: Vector2 | null = null;

    for (const light of lights) {
      if (light.id === excludeLightId) continue;

      const p = light.position;

      // Check X alignment
      if (Math.abs(pos.x - p.x) < SNAP_THRESHOLD) {
        if (!snapXLight || Math.abs(pos.x - p.x) < Math.abs(pos.x - snapXLight.x)) {
          snappedX = p.x;
          snapXLight = p;
        }
      }

      // Check Y alignment
      if (Math.abs(pos.y - p.y) < SNAP_THRESHOLD) {
        if (!snapYLight || Math.abs(pos.y - p.y) < Math.abs(pos.y - snapYLight.y)) {
          snappedY = p.y;
          snapYLight = p;
        }
      }
    }

    // Create guide lines
    if (snapXLight) {
      guides.push({
        axis: 'x',
        value: snappedX,
        from: { x: snappedX, y: Math.min(pos.y, snapXLight.y) - 1 },
        to: { x: snappedX, y: Math.max(pos.y, snapXLight.y) + 1 },
      });
    }

    if (snapYLight) {
      guides.push({
        axis: 'y',
        value: snappedY,
        from: { x: Math.min(pos.x, snapYLight.x) - 1, y: snappedY },
        to: { x: Math.max(pos.x, snapYLight.x) + 1, y: snappedY },
      });
    }

    return {
      snappedPos: { x: snappedX, y: snappedY },
      guides,
    };
  }

  function getWallSnapAlignment(
    start: Vector2,
    end: Vector2,
    wallIndex: number
  ): { snappedStart: Vector2; snappedEnd: Vector2; guides: SnapGuide[] } {
    const vertices = getVertices(currentRoomState);
    const guides: SnapGuide[] = [];

    // Indices to exclude: the two vertices of this wall
    const numWalls = currentRoomState.walls.length;
    const startVertexIndex = wallIndex;
    const endVertexIndex = (wallIndex + 1) % numWalls;

    let snapDeltaX: number | null = null;
    let snapDeltaY: number | null = null;
    let snapXVertex: Vector2 | null = null;
    let snapYVertex: Vector2 | null = null;
    let snapFromStart = true;

    // Check start vertex alignment
    for (let i = 0; i < vertices.length; i++) {
      if (i === startVertexIndex || i === endVertexIndex) continue;
      const v = vertices[i];

      // X alignment for start
      if (Math.abs(start.x - v.x) < SNAP_THRESHOLD) {
        if (snapDeltaX === null || Math.abs(start.x - v.x) < Math.abs(snapDeltaX)) {
          snapDeltaX = v.x - start.x;
          snapXVertex = v;
          snapFromStart = true;
        }
      }
      // Y alignment for start
      if (Math.abs(start.y - v.y) < SNAP_THRESHOLD) {
        if (snapDeltaY === null || Math.abs(start.y - v.y) < Math.abs(snapDeltaY)) {
          snapDeltaY = v.y - start.y;
          snapYVertex = v;
          snapFromStart = true;
        }
      }

      // X alignment for end
      if (Math.abs(end.x - v.x) < SNAP_THRESHOLD) {
        if (snapDeltaX === null || Math.abs(end.x - v.x) < Math.abs(snapDeltaX)) {
          snapDeltaX = v.x - end.x;
          snapXVertex = v;
          snapFromStart = false;
        }
      }
      // Y alignment for end
      if (Math.abs(end.y - v.y) < SNAP_THRESHOLD) {
        if (snapDeltaY === null || Math.abs(end.y - v.y) < Math.abs(snapDeltaY)) {
          snapDeltaY = v.y - end.y;
          snapYVertex = v;
          snapFromStart = false;
        }
      }
    }

    // Apply snapping
    let snappedStart = { ...start };
    let snappedEnd = { ...end };

    if (snapDeltaX !== null) {
      snappedStart.x += snapDeltaX;
      snappedEnd.x += snapDeltaX;
    }
    if (snapDeltaY !== null) {
      snappedStart.y += snapDeltaY;
      snappedEnd.y += snapDeltaY;
    }

    // Create guide lines
    if (snapXVertex) {
      const refPoint = snapFromStart ? snappedStart : snappedEnd;
      guides.push({
        axis: 'x',
        value: snapXVertex.x,
        from: { x: snapXVertex.x, y: Math.min(refPoint.y, snapXVertex.y) - 1 },
        to: { x: snapXVertex.x, y: Math.max(refPoint.y, snapXVertex.y) + 1 },
      });
    }

    if (snapYVertex) {
      const refPoint = snapFromStart ? snappedStart : snappedEnd;
      guides.push({
        axis: 'y',
        value: snapYVertex.y,
        from: { x: Math.min(refPoint.x, snapYVertex.x) - 1, y: snapYVertex.y },
        to: { x: Math.max(refPoint.x, snapYVertex.x) + 1, y: snapYVertex.y },
      });
    }

    return { snappedStart, snappedEnd, guides };
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

  function projectPointOntoWallPerpendicular(point: Vector2, wall: import('../types').WallSegment): Vector2 {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return { ...wall.start };

    let t = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / lengthSq;
    // Clamp to wall segment bounds
    t = Math.max(0, Math.min(1, t));

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
        if (isMeasuring) {
          clearMeasurement();
        }
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

      case 'u':
      case 'U':
        toggleUnitFormat();
        break;

      case 'm':
      case 'M':
        // Enter measurement mode if a vertex or light is selected
        if (currentSelectedVertexIndex !== null && !isMeasuring) {
          const vertices = getVertices(currentRoomState);
          measureFromVertex = vertices[currentSelectedVertexIndex];
          measureToVertex = null;
          measureFromLightId = null;
          isMeasuring = true;
          dispatch('measurement', null); // Clear any previous measurement display
        } else if (currentSelectedLightId && !isMeasuring) {
          // Start measurement from a light
          const light = currentRoomState.lights.find(l => l.id === currentSelectedLightId);
          if (light) {
            measureFromVertex = { ...light.position };
            measureFromLightId = currentSelectedLightId;
            measureToVertex = null;
            isMeasuring = true;
            dispatch('measurement', null);
          }
        } else if (isMeasuring) {
          // Exit measurement mode
          clearMeasurement();
        }
        break;
    }
  }

  function clearMeasurement(): void {
    isMeasuring = false;
    measureFromVertex = null;
    measureToVertex = null;
    measureFromLightId = null;
    measureToWallId = null;
    editorRenderer?.setMeasurementLine(null, null);
    dispatch('measurement', null);
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
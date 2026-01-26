import * as THREE from 'three';
import type { Vector2, WallSegment, Door } from '../types';
import type { SnapGuide } from '../controllers/SnapController';
import { VERTEX_RADIUS_SELECTED, VERTEX_RADIUS_DEFAULT, DRAWING_VERTEX_START_RADIUS, DRAWING_VERTEX_RADIUS } from '../constants/editor';
import {
  Z_LAYERS,
  GEOMETRY,
  DASH_PATTERNS,
  PREVIEW_COLORS,
} from '../constants/rendering';
import { getTheme } from '../constants/themes';
import { getWallDirection, getDoorEndpoints } from '../utils/geometry';

/**
 * Pure rendering functions for editor geometry.
 * These functions create THREE.js objects without side effects.
 */

/**
 * Represents a visible segment of a wall (between doors or wall endpoints).
 */
export interface WallSegmentPart {
  start: Vector2;
  end: Vector2;
  length: number;
  /** Distance from wall start to this segment's start */
  startDistance: number;
  /** Distance from wall start to this segment's end */
  endDistance: number;
}

/**
 * Calculate the visible wall segments for a wall, accounting for door openings.
 * Returns an array of segment parts that should be rendered as solid wall lines.
 */
export function getWallSegmentsWithDoors(wall: WallSegment, doors: Door[]): WallSegmentPart[] {
  const { normalized, length: wallLength } = getWallDirection(wall);
  if (wallLength === 0) return [];

  // Get doors on this wall, sorted by position
  const doorsOnWall = doors
    .filter(d => d.wallId === wall.id)
    .sort((a, b) => a.position - b.position);

  if (doorsOnWall.length === 0) {
    // No doors - return the full wall as a single segment
    return [{
      start: wall.start,
      end: wall.end,
      length: wallLength,
      startDistance: 0,
      endDistance: wallLength,
    }];
  }

  const segments: WallSegmentPart[] = [];
  let currentStart = 0;

  for (const door of doorsOnWall) {
    const doorStart = door.position - door.width / 2;
    const doorEnd = door.position + door.width / 2;

    // Add segment from current position to door start (if there's space)
    if (doorStart > currentStart + 0.01) { // Small epsilon to avoid tiny segments
      const segmentStart = {
        x: wall.start.x + normalized.x * currentStart,
        y: wall.start.y + normalized.y * currentStart,
      };
      const segmentEnd = {
        x: wall.start.x + normalized.x * doorStart,
        y: wall.start.y + normalized.y * doorStart,
      };
      segments.push({
        start: segmentStart,
        end: segmentEnd,
        length: doorStart - currentStart,
        startDistance: currentStart,
        endDistance: doorStart,
      });
    }

    // Move past the door
    currentStart = doorEnd;
  }

  // Add final segment from last door to wall end (if there's space)
  if (wallLength > currentStart + 0.01) {
    const segmentStart = {
      x: wall.start.x + normalized.x * currentStart,
      y: wall.start.y + normalized.y * currentStart,
    };
    segments.push({
      start: segmentStart,
      end: wall.end,
      length: wallLength - currentStart,
      startDistance: currentStart,
      endDistance: wallLength,
    });
  }

  return segments;
}

/**
 * Create wall lines for a wall with door gaps.
 * Returns multiple line objects, one for each visible segment.
 */
export function createWallLinesWithDoors(
  wall: WallSegment,
  doors: Door[],
  isSelected: boolean
): THREE.Line[] {
  const theme = getTheme();
  const segments = getWallSegmentsWithDoors(wall, doors);

  return segments.map(segment => {
    const points = [
      new THREE.Vector3(segment.start.x, segment.start.y, 0),
      new THREE.Vector3(segment.end.x, segment.end.y, 0),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: isSelected ? theme.editor.wallSelected : theme.editor.wall,
      linewidth: isSelected ? theme.editor.wallLineWidthSelected : theme.editor.wallLineWidth,
    });
    const line = new THREE.Line(geometry, material);
    line.userData.wallId = wall.id;
    return line;
  });
}

export function createVertexCircle(
  pos: Vector2,
  index: number,
  isSelected: boolean
): THREE.Mesh {
  const theme = getTheme();
  const geometry = new THREE.CircleGeometry(
    isSelected ? VERTEX_RADIUS_SELECTED : VERTEX_RADIUS_DEFAULT,
    GEOMETRY.CIRCLE_SEGMENTS
  );
  const material = new THREE.MeshBasicMaterial({
    color: isSelected ? theme.editor.vertexSelected : theme.editor.vertex,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos.x, pos.y, Z_LAYERS.VERTEX);
  mesh.userData.vertexIndex = index;
  return mesh;
}

export function createPhantomLine(start: Vector2, end: Vector2): THREE.Line {
  const theme = getTheme();
  const points = [
    new THREE.Vector3(start.x, start.y, Z_LAYERS.WALL),
    new THREE.Vector3(end.x, end.y, Z_LAYERS.WALL),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: theme.editor.phantomLine,
    dashSize: DASH_PATTERNS.PHANTOM_LINE.dashSize,
    gapSize: DASH_PATTERNS.PHANTOM_LINE.gapSize,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

export function createDrawingVertex(pos: Vector2, isStart: boolean): THREE.Mesh {
  const theme = getTheme();
  const geometry = new THREE.CircleGeometry(
    isStart ? DRAWING_VERTEX_START_RADIUS : DRAWING_VERTEX_RADIUS,
    GEOMETRY.CIRCLE_SEGMENTS
  );
  const material = new THREE.MeshBasicMaterial({
    color: isStart ? theme.editor.drawingVertexStart : theme.editor.drawingVertex,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos.x, pos.y, Z_LAYERS.DRAWING_VERTEX);
  return mesh;
}

export function createDrawingLine(start: Vector2, end: Vector2): THREE.Line {
  const theme = getTheme();
  const points = [
    new THREE.Vector3(start.x, start.y, Z_LAYERS.DRAWING_LINE),
    new THREE.Vector3(end.x, end.y, Z_LAYERS.DRAWING_LINE),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: theme.editor.drawingLine });
  return new THREE.Line(geometry, material);
}

export function createSnapGuideLine(guide: SnapGuide): THREE.Line {
  const points = [
    new THREE.Vector3(guide.from.x, guide.from.y, Z_LAYERS.SNAP_GUIDE),
    new THREE.Vector3(guide.to.x, guide.to.y, Z_LAYERS.SNAP_GUIDE),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: guide.axis === 'x' ? PREVIEW_COLORS.SNAP_GUIDE_X : PREVIEW_COLORS.SNAP_GUIDE_Y,
    dashSize: DASH_PATTERNS.SNAP_GUIDE.dashSize,
    gapSize: DASH_PATTERNS.SNAP_GUIDE.gapSize,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

export function createSelectionBox(start: Vector2, end: Vector2): THREE.Line {
  // Create a rectangle from the two corners
  const points = [
    new THREE.Vector3(start.x, start.y, Z_LAYERS.SELECTION_BOX),
    new THREE.Vector3(end.x, start.y, Z_LAYERS.SELECTION_BOX),
    new THREE.Vector3(end.x, end.y, Z_LAYERS.SELECTION_BOX),
    new THREE.Vector3(start.x, end.y, Z_LAYERS.SELECTION_BOX),
    new THREE.Vector3(start.x, start.y, Z_LAYERS.SELECTION_BOX), // Close the loop
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: PREVIEW_COLORS.SELECTION_BOX,
    dashSize: DASH_PATTERNS.SELECTION_BOX.dashSize,
    gapSize: DASH_PATTERNS.SELECTION_BOX.gapSize,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

export function createDimensionLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  const fontSize = 24;
  const padding = 12;
  context.font = `${fontSize}px Arial`;
  const textWidth = context.measureText(text).width;

  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = fontSize + padding;

  context.font = `${fontSize}px Arial`;
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'black';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);

  const aspectRatio = canvas.width / canvas.height;
  sprite.scale.set(aspectRatio * 0.5, 0.5, 1);

  return sprite;
}

/**
 * Creates the visual representation of a door including:
 * - Door panel line (at 90° open position)
 * - Swing arc (quarter circle)
 * - Hinge indicator (small circle)
 */
export function createDoorGraphics(door: Door, wall: WallSegment, isSelected: boolean): THREE.Object3D[] {
  const theme = getTheme();
  const objects: THREE.Object3D[] = [];

  const { start: doorStart, end: doorEnd, hingePos } = getDoorEndpoints(door, wall);

  // Calculate wall direction and perpendicular (for swing direction)
  const { normalized, length } = getWallDirection(wall);
  if (length === 0) return objects;

  // Perpendicular direction (for door swing)
  // Using left-hand perpendicular: rotate 90° counterclockwise for 'inside'
  // Flip direction for 'outside'
  const sideMultiplier = door.swingSide === 'outside' ? -1 : 1;
  const perpDir = {
    x: -normalized.y * sideMultiplier,
    y: normalized.x * sideMultiplier
  };

  const doorColor = isSelected ? theme.editor.doorSelected : theme.editor.door;
  const arcColor = isSelected ? theme.editor.doorSelected : theme.editor.doorArc;

  // 1. Door panel line (from hinge, perpendicular to wall, length = door width)
  const panelEnd = {
    x: hingePos.x + perpDir.x * door.width,
    y: hingePos.y + perpDir.y * door.width,
  };

  const panelPoints = [
    new THREE.Vector3(hingePos.x, hingePos.y, Z_LAYERS.DOOR_PANEL),
    new THREE.Vector3(panelEnd.x, panelEnd.y, Z_LAYERS.DOOR_PANEL),
  ];
  const panelGeometry = new THREE.BufferGeometry().setFromPoints(panelPoints);
  const panelMaterial = new THREE.LineBasicMaterial({
    color: doorColor,
    linewidth: theme.editor.doorLineWidth,
  });
  const panelLine = new THREE.Line(panelGeometry, panelMaterial);
  panelLine.userData.doorId = door.id;
  objects.push(panelLine);

  // 2. Swing arc (quarter circle from closed to open position)
  const arcPoints: THREE.Vector3[] = [];

  // For 'right' swing: hinge at doorStart, arc goes from wall direction (+normalizedDir) to perpendicular
  // For 'left' swing: hinge at doorEnd, arc goes from opposite wall direction (-normalizedDir) to perpendicular
  // sideMultiplier flips the arc direction for 'outside' swing

  if (door.swingDirection === 'right') {
    // Arc from closed (along wall toward doorEnd) to open (perpendicular)
    const startAngle = Math.atan2(normalized.y, normalized.x);
    for (let i = 0; i <= GEOMETRY.ARC_SEGMENTS; i++) {
      const t = i / GEOMETRY.ARC_SEGMENTS;
      // Sweep direction depends on swing side
      const angle = startAngle + (Math.PI / 2) * t * sideMultiplier;
      const x = hingePos.x + Math.cos(angle) * door.width;
      const y = hingePos.y + Math.sin(angle) * door.width;
      arcPoints.push(new THREE.Vector3(x, y, Z_LAYERS.DOOR_ARC));
    }
  } else {
    // Arc from closed (along wall toward doorStart, i.e., -normalizedDir) to open (perpendicular)
    const startAngle = Math.atan2(-normalized.y, -normalized.x);
    for (let i = 0; i <= GEOMETRY.ARC_SEGMENTS; i++) {
      const t = i / GEOMETRY.ARC_SEGMENTS;
      // Sweep direction depends on swing side
      const angle = startAngle - (Math.PI / 2) * t * sideMultiplier;
      const x = hingePos.x + Math.cos(angle) * door.width;
      const y = hingePos.y + Math.sin(angle) * door.width;
      arcPoints.push(new THREE.Vector3(x, y, Z_LAYERS.DOOR_ARC));
    }
  }

  const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const arcMaterial = new THREE.LineDashedMaterial({
    color: arcColor,
    dashSize: DASH_PATTERNS.DOOR_ARC.dashSize,
    gapSize: DASH_PATTERNS.DOOR_ARC.gapSize,
  });
  const arcLine = new THREE.Line(arcGeometry, arcMaterial);
  arcLine.computeLineDistances();
  objects.push(arcLine);

  // 3. Hinge indicator (small circle)
  const hingeGeometry = new THREE.CircleGeometry(GEOMETRY.HINGE_RADIUS, GEOMETRY.HINGE_SEGMENTS);
  const hingeMaterial = new THREE.MeshBasicMaterial({ color: doorColor });
  const hingeMesh = new THREE.Mesh(hingeGeometry, hingeMaterial);
  hingeMesh.position.set(hingePos.x, hingePos.y, Z_LAYERS.HINGE);
  objects.push(hingeMesh);

  // 4. Door opening indicator (line across the door opening on the wall)
  const openingPoints = [
    new THREE.Vector3(doorStart.x, doorStart.y, Z_LAYERS.DOOR_OPENING),
    new THREE.Vector3(doorEnd.x, doorEnd.y, Z_LAYERS.DOOR_OPENING),
  ];
  const openingGeometry = new THREE.BufferGeometry().setFromPoints(openingPoints);
  const openingMaterial = new THREE.LineDashedMaterial({
    color: doorColor,
    dashSize: DASH_PATTERNS.DOOR_OPENING.dashSize,
    gapSize: DASH_PATTERNS.DOOR_OPENING.gapSize,
  });
  const openingLine = new THREE.Line(openingGeometry, openingMaterial);
  openingLine.computeLineDistances();
  objects.push(openingLine);

  return objects;
}

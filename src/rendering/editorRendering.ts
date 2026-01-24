import * as THREE from 'three';
import type { Vector2, WallSegment, Door } from '../types';
import type { SnapGuide } from '../controllers/SnapController';
import { VERTEX_RADIUS_SELECTED, VERTEX_RADIUS_DEFAULT, DRAWING_VERTEX_START_RADIUS, DRAWING_VERTEX_RADIUS } from '../constants/editor';
import { getTheme } from '../constants/themes';

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
  const wallDir = {
    x: wall.end.x - wall.start.x,
    y: wall.end.y - wall.start.y,
  };
  const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.y * wallDir.y);
  if (wallLength === 0) return [];

  const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };

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
        x: wall.start.x + normalizedDir.x * currentStart,
        y: wall.start.y + normalizedDir.y * currentStart,
      };
      const segmentEnd = {
        x: wall.start.x + normalizedDir.x * doorStart,
        y: wall.start.y + normalizedDir.y * doorStart,
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
      x: wall.start.x + normalizedDir.x * currentStart,
      y: wall.start.y + normalizedDir.y * currentStart,
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

export function createWallLine(wall: WallSegment, isSelected: boolean): THREE.Line {
  const theme = getTheme();
  const points = [
    new THREE.Vector3(wall.start.x, wall.start.y, 0),
    new THREE.Vector3(wall.end.x, wall.end.y, 0),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: isSelected ? theme.editor.wallSelected : theme.editor.wall,
    linewidth: isSelected ? theme.editor.wallLineWidthSelected : theme.editor.wallLineWidth,
  });
  const line = new THREE.Line(geometry, material);
  line.userData.wallId = wall.id;
  return line;
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
    16
  );
  const material = new THREE.MeshBasicMaterial({
    color: isSelected ? theme.editor.vertexSelected : theme.editor.vertex,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos.x, pos.y, 0.05);
  mesh.userData.vertexIndex = index;
  return mesh;
}

export function createPhantomLine(start: Vector2, end: Vector2): THREE.Line {
  const theme = getTheme();
  const points = [
    new THREE.Vector3(start.x, start.y, 0),
    new THREE.Vector3(end.x, end.y, 0),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: theme.editor.phantomLine,
    dashSize: 0.3,
    gapSize: 0.15,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

export function createDrawingVertex(pos: Vector2, isStart: boolean): THREE.Mesh {
  const theme = getTheme();
  const geometry = new THREE.CircleGeometry(
    isStart ? DRAWING_VERTEX_START_RADIUS : DRAWING_VERTEX_RADIUS,
    16
  );
  const material = new THREE.MeshBasicMaterial({
    color: isStart ? theme.editor.drawingVertexStart : theme.editor.drawingVertex,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos.x, pos.y, 0.1);
  return mesh;
}

export function createDrawingLine(start: Vector2, end: Vector2): THREE.Line {
  const theme = getTheme();
  const points = [
    new THREE.Vector3(start.x, start.y, 0.05),
    new THREE.Vector3(end.x, end.y, 0.05),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: theme.editor.drawingLine });
  return new THREE.Line(geometry, material);
}

export function createSnapGuideLine(guide: SnapGuide): THREE.Line {
  const points = [
    new THREE.Vector3(guide.from.x, guide.from.y, 0.15),
    new THREE.Vector3(guide.to.x, guide.to.y, 0.15),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: guide.axis === 'x' ? 0xff6600 : 0x0066ff,
    dashSize: 0.2,
    gapSize: 0.1,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

export function createSelectionBox(start: Vector2, end: Vector2): THREE.Line {
  // Create a rectangle from the two corners
  const points = [
    new THREE.Vector3(start.x, start.y, 0.2),
    new THREE.Vector3(end.x, start.y, 0.2),
    new THREE.Vector3(end.x, end.y, 0.2),
    new THREE.Vector3(start.x, end.y, 0.2),
    new THREE.Vector3(start.x, start.y, 0.2), // Close the loop
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0x0088ff,
    dashSize: 0.2,
    gapSize: 0.1,
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
 * Helper function to get door endpoints on a wall.
 */
function getDoorEndpoints(door: Door, wall: WallSegment): { start: Vector2; end: Vector2; hingePos: Vector2 } {
  const wallDir = {
    x: wall.end.x - wall.start.x,
    y: wall.end.y - wall.start.y,
  };
  const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.y * wallDir.y);
  if (wallLength === 0) {
    return { start: wall.start, end: wall.start, hingePos: wall.start };
  }

  const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };
  const halfWidth = door.width / 2;

  // Door start and end positions on the wall
  const doorStart = {
    x: wall.start.x + normalizedDir.x * (door.position - halfWidth),
    y: wall.start.y + normalizedDir.y * (door.position - halfWidth),
  };
  const doorEnd = {
    x: wall.start.x + normalizedDir.x * (door.position + halfWidth),
    y: wall.start.y + normalizedDir.y * (door.position + halfWidth),
  };

  // Hinge position (left side of door opening for 'right' swing, right side for 'left' swing)
  const hingePos = door.swingDirection === 'right' ? doorStart : doorEnd;

  return { start: doorStart, end: doorEnd, hingePos };
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
  const wallDir = {
    x: wall.end.x - wall.start.x,
    y: wall.end.y - wall.start.y,
  };
  const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.y * wallDir.y);
  if (wallLength === 0) return objects;

  const normalizedDir = { x: wallDir.x / wallLength, y: wallDir.y / wallLength };

  // Perpendicular direction (for door swing)
  // Using left-hand perpendicular: rotate 90° counterclockwise for 'inside'
  // Flip direction for 'outside'
  const sideMultiplier = door.swingSide === 'outside' ? -1 : 1;
  const perpDir = {
    x: -normalizedDir.y * sideMultiplier,
    y: normalizedDir.x * sideMultiplier
  };

  const doorColor = isSelected ? theme.editor.doorSelected : theme.editor.door;
  const arcColor = isSelected ? theme.editor.doorSelected : theme.editor.doorArc;

  // 1. Door panel line (from hinge, perpendicular to wall, length = door width)
  const panelEnd = {
    x: hingePos.x + perpDir.x * door.width,
    y: hingePos.y + perpDir.y * door.width,
  };

  const panelPoints = [
    new THREE.Vector3(hingePos.x, hingePos.y, 0.06),
    new THREE.Vector3(panelEnd.x, panelEnd.y, 0.06),
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
  const arcSegments = 16;
  const arcPoints: THREE.Vector3[] = [];

  // For 'right' swing: hinge at doorStart, arc goes from wall direction (+normalizedDir) to perpendicular
  // For 'left' swing: hinge at doorEnd, arc goes from opposite wall direction (-normalizedDir) to perpendicular
  // sideMultiplier flips the arc direction for 'outside' swing

  if (door.swingDirection === 'right') {
    // Arc from closed (along wall toward doorEnd) to open (perpendicular)
    const startAngle = Math.atan2(normalizedDir.y, normalizedDir.x);
    for (let i = 0; i <= arcSegments; i++) {
      const t = i / arcSegments;
      // Sweep direction depends on swing side
      const angle = startAngle + (Math.PI / 2) * t * sideMultiplier;
      const x = hingePos.x + Math.cos(angle) * door.width;
      const y = hingePos.y + Math.sin(angle) * door.width;
      arcPoints.push(new THREE.Vector3(x, y, 0.05));
    }
  } else {
    // Arc from closed (along wall toward doorStart, i.e., -normalizedDir) to open (perpendicular)
    const startAngle = Math.atan2(-normalizedDir.y, -normalizedDir.x);
    for (let i = 0; i <= arcSegments; i++) {
      const t = i / arcSegments;
      // Sweep direction depends on swing side
      const angle = startAngle - (Math.PI / 2) * t * sideMultiplier;
      const x = hingePos.x + Math.cos(angle) * door.width;
      const y = hingePos.y + Math.sin(angle) * door.width;
      arcPoints.push(new THREE.Vector3(x, y, 0.05));
    }
  }

  const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const arcMaterial = new THREE.LineDashedMaterial({
    color: arcColor,
    dashSize: 0.15,
    gapSize: 0.1,
  });
  const arcLine = new THREE.Line(arcGeometry, arcMaterial);
  arcLine.computeLineDistances();
  objects.push(arcLine);

  // 3. Hinge indicator (small circle)
  const hingeGeometry = new THREE.CircleGeometry(0.08, 12);
  const hingeMaterial = new THREE.MeshBasicMaterial({ color: doorColor });
  const hingeMesh = new THREE.Mesh(hingeGeometry, hingeMaterial);
  hingeMesh.position.set(hingePos.x, hingePos.y, 0.07);
  objects.push(hingeMesh);

  // 4. Door opening indicator (line across the door opening on the wall)
  const openingPoints = [
    new THREE.Vector3(doorStart.x, doorStart.y, 0.06),
    new THREE.Vector3(doorEnd.x, doorEnd.y, 0.06),
  ];
  const openingGeometry = new THREE.BufferGeometry().setFromPoints(openingPoints);
  const openingMaterial = new THREE.LineDashedMaterial({
    color: doorColor,
    dashSize: 0.1,
    gapSize: 0.1,
  });
  const openingLine = new THREE.Line(openingGeometry, openingMaterial);
  openingLine.computeLineDistances();
  objects.push(openingLine);

  return objects;
}

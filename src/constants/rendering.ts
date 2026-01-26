/**
 * Rendering constants for the editor.
 * Centralizes magic numbers used across rendering files.
 */

// Z-layer ordering for depth management
export const Z_LAYERS = {
  WALL: 0,
  VERTEX: 0.05,
  DRAWING_LINE: 0.05,
  DOOR_ARC: 0.05,
  DOOR_PANEL: 0.06,
  DOOR_OPENING: 0.06,
  HINGE: 0.07,
  PREVIEW_VERTEX: 0.08,
  PREVIEW_LIGHT_RING: 0.09,
  DRAWING_VERTEX: 0.1,
  PREVIEW_LIGHT_CENTER: 0.1,
  SNAP_GUIDE: 0.15,
  SELECTION_BOX: 0.2,
  MEASUREMENT: 0.2,
  DIMENSION_LABEL: 0.2,
} as const;

// Geometry sizes (in feet)
export const GEOMETRY = {
  PREVIEW_VERTEX_RADIUS: 0.12,
  LIGHT_PREVIEW_OUTER_RADIUS: 0.5,
  LIGHT_PREVIEW_INNER_RADIUS: 0.48,
  LIGHT_PREVIEW_CENTER_RADIUS: 0.08,
  HINGE_RADIUS: 0.08,
  MEASUREMENT_MARKER_RADIUS: 0.15,
  CIRCLE_SEGMENTS: 16,
  CIRCLE_SEGMENTS_HIGH: 32,
  HINGE_SEGMENTS: 12,
  ARC_SEGMENTS: 16,
} as const;

// Line dash patterns
export const DASH_PATTERNS = {
  PHANTOM_LINE: { dashSize: 0.3, gapSize: 0.15 },
  DOOR_ARC: { dashSize: 0.15, gapSize: 0.1 },
  DOOR_OPENING: { dashSize: 0.1, gapSize: 0.1 },
  SELECTION_BOX: { dashSize: 0.2, gapSize: 0.1 },
  SNAP_GUIDE: { dashSize: 0.2, gapSize: 0.1 },
  MEASUREMENT_COMPONENT: { dashSize: 0.15, gapSize: 0.1 },
} as const;

// Preview colors
export const PREVIEW_COLORS = {
  VALID: 0x22c55e,
  INVALID: 0xef4444,
  PREVIEW_VERTEX: 0x888888,
  SELECTION_BOX: 0x0088ff,
  SNAP_GUIDE_X: 0xff6600,
  SNAP_GUIDE_Y: 0x0066ff,
} as const;

// Opacity values
export const OPACITY = {
  PREVIEW_VERTEX: 0.5,
  PREVIEW_LIGHT_RING: 0.4,
  PREVIEW_LIGHT_CENTER: 0.6,
  DOOR_PREVIEW: 0.6,
} as const;

// Sprite/label scaling
export const LABEL_SCALE = {
  DIMENSION_LABEL: 0.5,
  MEASUREMENT_LABEL: 0.4,
} as const;

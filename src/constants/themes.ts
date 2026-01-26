export interface Theme {
  name: string;

  // Canvas colors
  canvas: {
    background: number;
    gridMajor: number;
    gridMinor: number;
  };

  // Editor rendering colors
  editor: {
    wall: number;
    wallSelected: number;
    wallLineWidth: number;
    wallLineWidthSelected: number;
    vertex: number;
    vertexSelected: number;
    phantomLine: number;
    drawingLine: number;
    drawingVertexStart: number;
    drawingVertex: number;
    door: number;
    doorSelected: number;
    doorArc: number;
    doorLineWidth: number;
  };

  // UI colors
  ui: {
    panelBackground: string;
    panelBackgroundAlt: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    inputBackground: string;
    inputBorder: string;
    buttonBackground: string;
    buttonBackgroundHover: string;
    buttonActive: string;
    statusBarBackground: string;

    // Status colors
    statusSuccess: string;
    statusWarning: string;
    statusError: string;
    statusInfo: string;

    // Measurement colors
    measurementX: string;
    measurementY: string;
    measurementDistance: string;
    measurementActive: string;

    // Spacing scale
    spacing4: string;
    spacing8: string;
    spacing12: string;
    spacing16: string;
    spacing24: string;

    // Border radius
    radiusSmall: string;
    radiusMedium: string;
    radiusLarge: string;

    // Shadow scale
    shadowSmall: string;
    shadowMedium: string;
    shadowLarge: string;
  };
}

export const BLUEPRINT_THEME: Theme = {
  name: 'blueprint',

  canvas: {
    background: 0x0a3d62,
    gridMajor: 0x2a5d82,
    gridMinor: 0x1a4d72,
  },

  editor: {
    wall: 0xffffff,
    wallSelected: 0xffff00,
    wallLineWidth: 4,
    wallLineWidthSelected: 5,
    vertex: 0xffffff,
    vertexSelected: 0xffff00,
    phantomLine: 0x6ba3d6,
    drawingLine: 0x6ba3d6,
    drawingVertexStart: 0xffff00,
    drawingVertex: 0x6ba3d6,
    door: 0x4a90d9,
    doorSelected: 0xff9500,
    doorArc: 0x4a90d9,
    doorLineWidth: 2,
  },

  ui: {
    panelBackground: '#2d2d30',
    panelBackgroundAlt: '#252526',
    border: '#3e3e42',
    textPrimary: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#999999',
    inputBackground: '#1e1e1e',
    inputBorder: '#3e3e42',
    buttonBackground: '#333337',
    buttonBackgroundHover: '#3e3e42',
    buttonActive: '#0066cc',
    statusBarBackground: '#2d2d30',

    // Status colors
    statusSuccess: '#22c55e',
    statusWarning: '#ff9500',
    statusError: '#ef4444',
    statusInfo: '#0066cc',

    // Measurement colors
    measurementX: '#ff6600',
    measurementY: '#0066ff',
    measurementDistance: '#ff00ff',
    measurementActive: '#ff9500',

    // Spacing scale
    spacing4: '4px',
    spacing8: '8px',
    spacing12: '12px',
    spacing16: '16px',
    spacing24: '24px',

    // Border radius
    radiusSmall: '4px',
    radiusMedium: '6px',
    radiusLarge: '8px',

    // Shadow scale
    shadowSmall: '0 1px 3px rgba(0, 0, 0, 0.3)',
    shadowMedium: '0 2px 8px rgba(0, 0, 0, 0.5)',
    shadowLarge: '0 2px 10px rgba(0, 0, 0, 0.5)',
  },
};

export const DARK_THEME: Theme = {
  name: 'dark',

  canvas: {
    background: 0x1e1e1e,
    gridMajor: 0x666666,
    gridMinor: 0x444444,
  },

  editor: {
    wall: 0xcccccc,
    wallSelected: 0x0066cc,
    wallLineWidth: 4,
    wallLineWidthSelected: 5,
    vertex: 0x999999,
    vertexSelected: 0x00aa00,
    phantomLine: 0x0066cc,
    drawingLine: 0x0066cc,
    drawingVertexStart: 0x00aa00,
    drawingVertex: 0x0066cc,
    door: 0x66aaff,
    doorSelected: 0xff9500,
    doorArc: 0x66aaff,
    doorLineWidth: 2,
  },

  ui: {
    panelBackground: '#2d2d30',
    panelBackgroundAlt: '#252526',
    border: '#3e3e42',
    textPrimary: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#999999',
    inputBackground: '#1e1e1e',
    inputBorder: '#3e3e42',
    buttonBackground: '#333337',
    buttonBackgroundHover: '#3e3e42',
    buttonActive: '#0066cc',
    statusBarBackground: '#2d2d30',

    // Status colors
    statusSuccess: '#22c55e',
    statusWarning: '#ff9500',
    statusError: '#ef4444',
    statusInfo: '#0066cc',

    // Measurement colors
    measurementX: '#ff6600',
    measurementY: '#0066ff',
    measurementDistance: '#ff00ff',
    measurementActive: '#ff9500',

    // Spacing scale
    spacing4: '4px',
    spacing8: '8px',
    spacing12: '12px',
    spacing16: '16px',
    spacing24: '24px',

    // Border radius
    radiusSmall: '4px',
    radiusMedium: '6px',
    radiusLarge: '8px',

    // Shadow scale
    shadowSmall: '0 1px 3px rgba(0, 0, 0, 0.3)',
    shadowMedium: '0 2px 8px rgba(0, 0, 0, 0.5)',
    shadowLarge: '0 2px 10px rgba(0, 0, 0, 0.5)',
  },
};

export const LIGHT_THEME: Theme = {
  name: 'light',

  canvas: {
    background: 0xf5f5f5,
    gridMajor: 0xcccccc,
    gridMinor: 0xe0e0e0,
  },

  editor: {
    wall: 0x000000,
    wallSelected: 0x0066cc,
    wallLineWidth: 2,
    wallLineWidthSelected: 3,
    vertex: 0x333333,
    vertexSelected: 0x00aa00,
    phantomLine: 0x0066cc,
    drawingLine: 0x0066cc,
    drawingVertexStart: 0x00aa00,
    drawingVertex: 0x0066cc,
    door: 0x0066cc,
    doorSelected: 0xff6600,
    doorArc: 0x0066cc,
    doorLineWidth: 2,
  },

  ui: {
    panelBackground: '#ffffff',
    panelBackgroundAlt: '#f8f9fa',
    border: '#ddd',
    textPrimary: '#333',
    textSecondary: '#666',
    textMuted: '#888',
    inputBackground: '#ffffff',
    inputBorder: '#ddd',
    buttonBackground: '#f0f0f0',
    buttonBackgroundHover: '#e0e0e0',
    buttonActive: '#0066cc',
    statusBarBackground: '#f8f8f8',

    // Status colors
    statusSuccess: '#22c55e',
    statusWarning: '#ff9500',
    statusError: '#ef4444',
    statusInfo: '#0066cc',

    // Measurement colors
    measurementX: '#ff6600',
    measurementY: '#0066ff',
    measurementDistance: '#ff00ff',
    measurementActive: '#ff9500',

    // Spacing scale
    spacing4: '4px',
    spacing8: '8px',
    spacing12: '12px',
    spacing16: '16px',
    spacing24: '24px',

    // Border radius
    radiusSmall: '4px',
    radiusMedium: '6px',
    radiusLarge: '8px',

    // Shadow scale
    shadowSmall: '0 1px 3px rgba(0, 0, 0, 0.2)',
    shadowMedium: '0 2px 8px rgba(0, 0, 0, 0.3)',
    shadowLarge: '0 2px 10px rgba(0, 0, 0, 0.3)',
  },
};

// Active theme (default to blueprint)
// This is used by the canvas/THREE.js rendering
let activeTheme: Theme = BLUEPRINT_THEME;

/**
 * Get the current theme for canvas rendering.
 * This is used by Scene.ts and editorRendering.ts
 */
export function getTheme(): Theme {
  return activeTheme;
}


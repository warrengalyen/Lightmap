import { writable, derived } from 'svelte/store';
import { BLUEPRINT_THEME, DARK_THEME, LIGHT_THEME, type Theme, _setThemeInternal } from '../constants/themes';

export const currentTheme = writable<Theme>(BLUEPRINT_THEME);

/**
 * Set the active theme and update both CSS variables and canvas theme.
 * After calling this, you should also call scene.updateTheme() and re-render the editor.
 */
export function setActiveTheme(theme: Theme): void {
  currentTheme.set(theme);
  _setThemeInternal(theme); // Update canvas theme
  updateCSSVariables(theme);
}

export { BLUEPRINT_THEME, DARK_THEME, LIGHT_THEME };

/**
 * Update CSS custom properties based on the current theme
 */
function updateCSSVariables(theme: Theme): void {
  const root = document.documentElement;

  // Set UI color variables
  root.style.setProperty('--panel-bg', theme.ui.panelBackground);
  root.style.setProperty('--panel-bg-alt', theme.ui.panelBackgroundAlt);
  root.style.setProperty('--border-color', theme.ui.border);
  root.style.setProperty('--text-primary', theme.ui.textPrimary);
  root.style.setProperty('--text-secondary', theme.ui.textSecondary);
  root.style.setProperty('--text-muted', theme.ui.textMuted);
  root.style.setProperty('--input-bg', theme.ui.inputBackground);
  root.style.setProperty('--input-border', theme.ui.inputBorder);
  root.style.setProperty('--button-bg', theme.ui.buttonBackground);
  root.style.setProperty('--button-bg-hover', theme.ui.buttonBackgroundHover);
  root.style.setProperty('--button-active', theme.ui.buttonActive);
  root.style.setProperty('--status-bar-bg', theme.ui.statusBarBackground);

  // Status colors
  root.style.setProperty('--status-success', theme.ui.statusSuccess);
  root.style.setProperty('--status-warning', theme.ui.statusWarning);
  root.style.setProperty('--status-error', theme.ui.statusError);
  root.style.setProperty('--status-info', theme.ui.statusInfo);

  // Measurement colors
  root.style.setProperty('--measurement-x', theme.ui.measurementX);
  root.style.setProperty('--measurement-y', theme.ui.measurementY);
  root.style.setProperty('--measurement-distance', theme.ui.measurementDistance);
  root.style.setProperty('--measurement-active', theme.ui.measurementActive);

  // Spacing scale
  root.style.setProperty('--spacing-4', theme.ui.spacing4);
  root.style.setProperty('--spacing-8', theme.ui.spacing8);
  root.style.setProperty('--spacing-12', theme.ui.spacing12);
  root.style.setProperty('--spacing-16', theme.ui.spacing16);
  root.style.setProperty('--spacing-24', theme.ui.spacing24);

  // Border radius
  root.style.setProperty('--radius-sm', theme.ui.radiusSmall);
  root.style.setProperty('--radius-md', theme.ui.radiusMedium);
  root.style.setProperty('--radius-lg', theme.ui.radiusLarge);

  // Shadow scale
  root.style.setProperty('--shadow-sm', theme.ui.shadowSmall);
  root.style.setProperty('--shadow-md', theme.ui.shadowMedium);
  root.style.setProperty('--shadow-lg', theme.ui.shadowLarge);
}

// Derived store for theme name (useful for displaying current theme)
export const themeName = derived(currentTheme, $theme => $theme.name);

// Initialize CSS variables on module load
updateCSSVariables(BLUEPRINT_THEME);

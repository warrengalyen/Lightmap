import { writable, derived } from "svelte/store";
import { BLUEPRINT_THEME, DARK_THEME, LIGHT_THEME, type Theme, _setThemeInternal } from "../constants/themes";

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
    root.style.setProperty("--panel-bg", theme.ui.panelBackground);
    root.style.setProperty("--panel-bg-alt", theme.ui.panelBackgroundAlt);
    root.style.setProperty("--border-color", theme.ui.border);
    root.style.setProperty("--text-primary", theme.ui.textPrimary);
    root.style.setProperty("--text-secondary", theme.ui.textSecondary);
    root.style.setProperty("--text-muted", theme.ui.textMuted);
    root.style.setProperty("--input-bg", theme.ui.inputBackground);
    root.style.setProperty("--input-border", theme.ui.inputBorder);
    root.style.setProperty("--button-bg", theme.ui.buttonBackground);
    root.style.setProperty("--button-bg-hover", theme.ui.buttonBackgroundHover);
    root.style.setProperty("--button-active", theme.ui.buttonActive);
    root.style.setProperty("--status-bar-bg", theme.ui.statusBarBackground);
}

// Derived store for theme name (useful for displaying current theme)
export const themeName = derived(currentTheme, ($theme) => $theme.name);

// Initialize CSS variables on module load
updateCSSVariables(BLUEPRINT_THEME);

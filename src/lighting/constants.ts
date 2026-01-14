/**
 * Constants for lighting calculations and analysis.
 */

// ============================================
// Sampling Configuration
// ============================================

/** Distance from walls (in feet) to exclude when sampling lux values */
export const WALL_MARGIN_FT = 1.5;

/** Percentile for calculating minimum lux (excludes dark outliers) */
export const MIN_LUX_PERCENTILE = 0.05;

/** Percentile for calculating maximum lux (excludes bright outliers) */
export const MAX_LUX_PERCENTILE = 0.95;

// ============================================
// Grade Calculation
// ============================================

/** Weight for brightness in overall grade calculation (0-1) */
export const BRIGHTNESS_WEIGHT = 0.7;

/** Weight for uniformity in overall grade calculation (0-1) */
export const UNIFORMITY_WEIGHT = 0.3;

/** Uniformity value that gives maximum uniformity score */
export const UNIFORMITY_EXCELLENT_THRESHOLD = 0.5;

/** Grade thresholds for combined score */
export const GRADE_THRESHOLDS = {
    A: 0.85,
    B: 0.7,
    C: 0.5,
    D: 0.35,
} as const;

// ============================================
// Lux Calculation
// ============================================

/** Minimum distance (in feet) before using point source approximation */
export const MIN_DISTANCE_FT = 0.001;

/** Softness factors for beam edge falloff */
export const BEAM_FALLOFF = {
    innerEdge: 0.7,
    outerEdge: 1.2,
} as const;

/** Minimum solid angle to prevent division by zero */
export const MIN_SOLID_ANGLE = 0.1;

/** Maximum lux value for color mapping normalization */
export const MAX_LUX_FOR_COLOR = 600;

// ============================================
// Spacing Analysis
// ============================================

/** Ratio of actual to optimal distance that is considered minimum safe spacing */
export const MIN_SPACING_RATIO = 0.5;

/** Distance multiplier beyond which lights are considered unrelated */
export const EXTREME_DISTANCE_MULTIPLIER = 2;

/** Severity thresholds based on ratio deviation */
export const SEVERITY_THRESHOLDS = {
    high: 1.5,
    medium: 1.2,
} as const;

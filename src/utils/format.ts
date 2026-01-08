export interface FormatOptions {
    decimal?: boolean;
    format?: 'feet-inches' | 'inches';
}

export function formatImperial(feet: number, options: FormatOptions = {}): string {
    if (options.decimal) {
        return `${feet.toFixed(2)}'`;
    }

    const totalInches = Math.round(feet * 12);

    if (options.format === 'inches') {
        return `${totalInches}"`;
    }

    const wholeFeet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;

    if (inches === 0) {
        return `${wholeFeet}'`;
    }

    return `${wholeFeet}' ${inches}"`;
}

export function parseImperial(input: string): number | null {
    const trimmed = input.trim();

    const decimalMatch = trimmed.match(/^([\d.]+)'?$/);
    if (decimalMatch) {
        const value = parseFloat(decimalMatch[1]);
        return isNaN(value) ? null : value;
    }

    const feetInchesMatch = trimmed.match(/^(\d+)'?\s*(\d+)"?$/);
    if (feetInchesMatch) {
        const feetVal = parseInt(feetInchesMatch[1], 10);
        const inchesVal = parseInt(feetInchesMatch[2], 10);
        return feetVal + inchesVal / 12;
    }

    const feetOnlyMatch = trimmed.match(/^(\d+)'$/);
    if (feetOnlyMatch) {
        return parseInt(feetOnlyMatch[1], 10);
    }

    const inchesOnlyMatch = trimmed.match(/^(\d+)"$/);
    if (inchesOnlyMatch) {
        return parseInt(inchesOnlyMatch[1], 10) / 12;
    }

    return null;
}

const KELVIN_SCALE_DIVISOR = 100;
const MAX_COLOR_VALUE = 255;
const MIN_COLOR_VALUE = 0;

const LOW_TEMP_THRESHOLD = 66;
const BLUE_LOW_TEMP_THRESHOLD = 19;
const BLUE_TEMP_OFFSET = 10;
const HIGH_TEMP_OFFSET = 60;

// Curve-fitting coefficients for green (low temp)
const GREEN_LOW_COEFF = 99.4708025861;
const GREEN_LOW_INTERCEPT = 161.1195681661;

// Curve-fitting coefficients for red (high temp)
const RED_HIGH_COEFF = 329.698727446;
const RED_HIGH_EXPONENT = -0.1332047592;

// Curve-fitting coefficients for green (high temp)
const GREEN_HIGH_COEFF = 288.1221695283;
const GREEN_HIGH_EXPONENT = -0.0755148492;

// Curve-fitting coefficients for blue (mid temp)
const BLUE_MID_COEFF = 138.5177312231;
const BLUE_MID_INTERCEPT = 305.0447927307;

export function kelvinToRGB(kelvin: number): { r: number; g: number; b: number } {
    const temp = kelvin / KELVIN_SCALE_DIVISOR;
    const clamp = (value: number) => Math.max(MIN_COLOR_VALUE, Math.min(MAX_COLOR_VALUE, value));

    let r: number, g: number, b: number;

    if (temp <= LOW_TEMP_THRESHOLD) {
        r = MAX_COLOR_VALUE;
        g = clamp(GREEN_LOW_COEFF * Math.log(temp) - GREEN_LOW_INTERCEPT);
    } else {
        r = clamp(RED_HIGH_COEFF * Math.pow(temp - HIGH_TEMP_OFFSET, RED_HIGH_EXPONENT));
        g = clamp(GREEN_HIGH_COEFF * Math.pow(temp - HIGH_TEMP_OFFSET, GREEN_HIGH_EXPONENT));
    }

    if (temp >= LOW_TEMP_THRESHOLD) {
        b = MAX_COLOR_VALUE;
    } else if (temp <= BLUE_LOW_TEMP_THRESHOLD) {
        b = MIN_COLOR_VALUE;
    } else {
        b = clamp(BLUE_MID_COEFF * Math.log(temp - BLUE_TEMP_OFFSET) - BLUE_MID_INTERCEPT);
    }

    return { r: r / MAX_COLOR_VALUE, g: g / MAX_COLOR_VALUE, b: b / MAX_COLOR_VALUE };
}

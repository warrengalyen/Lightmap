/**
 * Parser for IES (Illuminating Engineering Society) photometric data files.
 * Extracts lumens and calculates beam angle from candela distribution.
 */

export interface IESData {
  name: string;
  manufacturer: string;
  lumens: number;
  beamAngle: number;
  verticalAngles: number[];
  horizontalAngles: number[];
  candelaValues: number[][];
  inputWatts: number;
}

export interface IESParseResult {
  success: boolean;
  data?: IESData;
  error?: string;
}

/**
 * Parse an IES file content string and extract photometric data.
 */
export function parseIESFile(content: string): IESParseResult {
  try {
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    // Find TILT line index - this marks the start of the data section
    let tiltIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toUpperCase().startsWith('TILT=')) {
        tiltIndex = i;
        break;
      }
    }

    if (tiltIndex === -1) {
      return { success: false, error: 'Invalid IES file: TILT line not found' };
    }

    // Extract metadata from header (lines before TILT)
    const metadata = extractMetadata(lines.slice(0, tiltIndex));

    // Check for TILT=INCLUDE which adds extra lines
    const tiltLine = lines[tiltIndex].toUpperCase();
    let dataStartIndex = tiltIndex + 1;

    if (tiltLine === 'TILT=INCLUDE') {
      // Skip tilt data: lamp-to-luminaire geometry, # of angles, angles, multiplying factors
      // This is typically 4 additional lines
      dataStartIndex += 4;
    }

    // Parse the data lines (combine them since values can span multiple lines)
    const dataLines = lines.slice(dataStartIndex);
    const allValues = parseDataValues(dataLines);

    if (allValues.length < 13) {
      return { success: false, error: 'Invalid IES file: insufficient data values' };
    }

    // Extract lamp data from first line of values
    // Format: numLamps lumensPerLamp multiplier numVertAngles numHorizAngles photometricType unitType width length height
    const numLamps = Math.round(allValues[0]);
    const lumensPerLamp = allValues[1];
    const multiplier = allValues[2];
    const numVertAngles = Math.round(allValues[3]);
    const numHorizAngles = Math.round(allValues[4]);
    // photometricType = allValues[5] (1=Type C, 2=Type B, 3=Type A)
    // unitType = allValues[6] (1=feet, 2=meters)
    // width, length, height = allValues[7], allValues[8], allValues[9]

    // Next line: ballast factor, ballast-lamp photometric factor, input watts
    // Use 1.0 as default if factors are 0 or invalid
    const ballastFactor = allValues[10] > 0 ? allValues[10] : 1.0;
    const blpFactor = allValues[11] > 0 ? allValues[11] : 1.0;
    const inputWatts = allValues[12];

    // Extract vertical angles
    let valueIndex = 13;
    const verticalAngles: number[] = [];
    for (let i = 0; i < numVertAngles; i++) {
      if (valueIndex >= allValues.length) {
        return { success: false, error: 'Invalid IES file: missing vertical angles' };
      }
      verticalAngles.push(allValues[valueIndex++]);
    }

    // Extract horizontal angles
    const horizontalAngles: number[] = [];
    for (let i = 0; i < numHorizAngles; i++) {
      if (valueIndex >= allValues.length) {
        return { success: false, error: 'Invalid IES file: missing horizontal angles' };
      }
      horizontalAngles.push(allValues[valueIndex++]);
    }

    // Extract candela values: one set of vertical values for each horizontal angle
    const candelaValues: number[][] = [];
    for (let h = 0; h < numHorizAngles; h++) {
      const vertValues: number[] = [];
      for (let v = 0; v < numVertAngles; v++) {
        if (valueIndex >= allValues.length) {
          return { success: false, error: 'Invalid IES file: missing candela values' };
        }
        vertValues.push(allValues[valueIndex++]);
      }
      candelaValues.push(vertValues);
    }

    // Calculate lumens
    // If lumensPerLamp is -1 (or negative), candela values are absolute and we must calculate lumens
    // Otherwise, use the provided value
    let lumens: number;
    const effectiveMultiplier = multiplier !== 0 ? Math.abs(multiplier) : 1.0;

    if (lumensPerLamp < 0) {
      // Calculate lumens from candela distribution by integrating over the sphere
      lumens = calculateLumensFromCandela(verticalAngles, horizontalAngles, candelaValues);
      // Apply multiplier and ballast factors
      lumens *= effectiveMultiplier * ballastFactor * blpFactor;
    } else {
      lumens = Math.max(1, numLamps) * lumensPerLamp * effectiveMultiplier * ballastFactor * blpFactor;
    }

    // Ensure lumens is positive and reasonable
    lumens = Math.max(1, Math.abs(lumens));

    // Calculate beam angle from candela distribution
    const beamAngle = calculateBeamAngle(verticalAngles, horizontalAngles, candelaValues);

    return {
      success: true,
      data: {
        name: metadata.name || 'Imported IES Light',
        manufacturer: metadata.manufacturer || '',
        lumens: Math.round(lumens),
        beamAngle: Math.round(beamAngle),
        verticalAngles,
        horizontalAngles,
        candelaValues,
        inputWatts,
      },
    };
  } catch (e) {
    return { success: false, error: `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}` };
  }
}

/**
 * Extract metadata from IES header lines.
 */
function extractMetadata(headerLines: string[]): { name: string; manufacturer: string } {
  let name = '';
  let manufacturer = '';

  for (const line of headerLines) {
    const upperLine = line.toUpperCase();

    // Look for common IES keywords
    if (upperLine.startsWith('[LUMINAIRE]') || upperLine.startsWith('[LUMCAT]')) {
      name = line.substring(line.indexOf(']') + 1).trim();
    } else if (upperLine.startsWith('[LAMP]')) {
      if (!name) name = line.substring(line.indexOf(']') + 1).trim();
    } else if (upperLine.startsWith('[MANUFAC]')) {
      manufacturer = line.substring(line.indexOf(']') + 1).trim();
    } else if (upperLine.startsWith('[TEST]') || upperLine.startsWith('[TESTLAB]')) {
      // Skip test info
    } else if (!upperLine.startsWith('[') && !name && line.length > 0) {
      // First non-keyword line might be the name
      name = line;
    }
  }

  return { name, manufacturer };
}

/**
 * Parse all numeric values from data lines, handling various delimiters.
 */
function parseDataValues(dataLines: string[]): number[] {
  const values: number[] = [];

  for (const line of dataLines) {
    // Split by whitespace and/or commas
    const parts = line.split(/[\s,]+/).filter(p => p.length > 0);
    for (const part of parts) {
      const num = parseFloat(part);
      if (!isNaN(num)) {
        values.push(num);
      }
    }
  }

  return values;
}

/**
 * Calculate total lumens from candela distribution by integrating over the sphere.
 * Uses the zonal cavity method to sum up the light output.
 */
function calculateLumensFromCandela(
  verticalAngles: number[],
  horizontalAngles: number[],
  candelaValues: number[][]
): number {
  if (verticalAngles.length < 2 || horizontalAngles.length < 1 || candelaValues.length < 1) {
    return 800; // Fallback default
  }

  let totalLumens = 0;

  const numHorizAngles = horizontalAngles.length;

  // For each zone between vertical angles
  for (let v = 0; v < verticalAngles.length - 1; v++) {
    const theta1 = verticalAngles[v] * Math.PI / 180;
    const theta2 = verticalAngles[v + 1] * Math.PI / 180;

    // Solid angle of this zone (per horizontal segment)
    // For a full rotation: ΔΩ = 2π * |cos(θ1) - cos(θ2)|
    const zonalSolidAngle = Math.abs(Math.cos(theta1) - Math.cos(theta2));

    // Average candela for this zone across all horizontal angles
    let avgCandela = 0;
    for (let h = 0; h < numHorizAngles; h++) {
      // Average of candela at start and end of zone
      avgCandela += (candelaValues[h][v] + candelaValues[h][v + 1]) / 2;
    }
    avgCandela /= numHorizAngles;

    // Lumens for this zone = candela × solid angle
    // The 2π comes from integrating around the full horizontal circle
    totalLumens += avgCandela * zonalSolidAngle * 2 * Math.PI;
  }

  return totalLumens;
}

/**
 * Calculate beam angle from candela distribution.
 * Beam angle is typically defined as the angle where intensity drops to 50% of peak.
 */
function calculateBeamAngle(
  verticalAngles: number[],
  horizontalAngles: number[],
  candelaValues: number[][]
): number {
  // For downlights (Type C photometry), we typically look at the 0° horizontal plane
  // and find where intensity drops to 50% of the nadir (0° vertical) value

  // Average candela values across all horizontal angles for each vertical angle
  const avgCandela: number[] = [];
  for (let v = 0; v < verticalAngles.length; v++) {
    let sum = 0;
    for (let h = 0; h < horizontalAngles.length; h++) {
      sum += candelaValues[h][v];
    }
    avgCandela.push(sum / horizontalAngles.length);
  }

  // Find peak candela (usually at 0° or near it)
  let peakCandela = 0;
  let peakIndex = 0;
  for (let i = 0; i < avgCandela.length; i++) {
    if (avgCandela[i] > peakCandela) {
      peakCandela = avgCandela[i];
      peakIndex = i;
    }
  }

  if (peakCandela === 0) {
    return 60; // Default beam angle if no data
  }

  const halfPeak = peakCandela * 0.5;

  // Find the angle where intensity drops to 50% of peak
  // Search from peak outward
  let beamHalfAngle = 90; // Default to hemisphere if 50% point not found

  for (let i = peakIndex; i < avgCandela.length; i++) {
    if (avgCandela[i] < halfPeak) {
      // Interpolate between this point and the previous one
      if (i > peakIndex) {
        const ratio = (halfPeak - avgCandela[i]) / (avgCandela[i - 1] - avgCandela[i]);
        beamHalfAngle = verticalAngles[i] - ratio * (verticalAngles[i] - verticalAngles[i - 1]);
      } else {
        beamHalfAngle = verticalAngles[i];
      }
      break;
    }
  }

  // Beam angle is typically expressed as the full cone angle (2x the half-angle from nadir)
  // But for vertical angles measured from nadir, the beam angle IS the angle at 50%
  // For symmetric distributions, we multiply by 2
  const fullBeamAngle = beamHalfAngle * 2;

  // Clamp to reasonable values
  return Math.max(10, Math.min(180, fullBeamAngle));
}

/**
 * Read an IES file from a File object.
 */
export async function readIESFile(file: File): Promise<IESParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        resolve(parseIESFile(content));
      } else {
        resolve({ success: false, error: 'Failed to read file content' });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' });
    };

    reader.readAsText(file);
  });
}

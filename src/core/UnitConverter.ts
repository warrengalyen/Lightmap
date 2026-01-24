export class UnitConverter {
  static feetToInches(feet: number): number {
    return feet * 12;
  }

  static inchesToFeet(inches: number): number {
    return inches / 12;
  }

  static feetToMeters(feet: number): number {
    return feet * 0.3048;
  }

  static metersToFeet(meters: number): number {
    return meters / 0.3048;
  }

  static parseFeetInches(input: string): number | null {
    const trimmed = input.trim();

    const decimalMatch = trimmed.match(/^([\d.]+)(?:'|ft)?$/i);
    if (decimalMatch) {
      const value = parseFloat(decimalMatch[1]);
      return isNaN(value) ? null : value;
    }

    const feetInchesMatch = trimmed.match(/^(\d+)(?:'|ft)?\s*(\d+(?:\.\d+)?)(?:"|in)?$/i);
    if (feetInchesMatch) {
      const feet = parseInt(feetInchesMatch[1], 10);
      const inches = parseFloat(feetInchesMatch[2]);
      return feet + inches / 12;
    }

    const inchesOnlyMatch = trimmed.match(/^(\d+(?:\.\d+)?)(?:"|in)$/i);
    if (inchesOnlyMatch) {
      return parseFloat(inchesOnlyMatch[1]) / 12;
    }

    return null;
  }

  static formatFeetInches(feet: number, useFractions: boolean = true): string {
    const totalInches = feet * 12;
    const wholeFeet = Math.floor(totalInches / 12);
    const remainingInches = totalInches % 12;

    if (useFractions) {
      const wholeInches = Math.floor(remainingInches);
      const fraction = remainingInches - wholeInches;

      if (wholeInches === 0 && fraction === 0) {
        return `${wholeFeet}'`;
      }

      let fractionStr = '';
      if (fraction >= 0.875) {
        fractionStr = '';
        return wholeFeet > 0 ? `${wholeFeet}' ${wholeInches + 1}"` : `${wholeInches + 1}"`;
      } else if (fraction >= 0.625) {
        fractionStr = '3/4';
      } else if (fraction >= 0.375) {
        fractionStr = '1/2';
      } else if (fraction >= 0.125) {
        fractionStr = '1/4';
      }

      if (wholeInches === 0 && fractionStr === '') {
        return `${wholeFeet}'`;
      }

      const inchesStr = fractionStr ? `${wholeInches} ${fractionStr}"` : `${wholeInches}"`;
      return wholeFeet > 0 ? `${wholeFeet}' ${inchesStr}` : inchesStr;
    }

    if (remainingInches === 0) {
      return `${wholeFeet}'`;
    }

    return `${wholeFeet}' ${remainingInches.toFixed(1)}"`;
  }
}

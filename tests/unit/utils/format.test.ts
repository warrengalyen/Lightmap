import { describe, it, expect } from 'vitest';
import { formatImperial, parseImperial, kelvinToRGB } from '../../../src/utils/format';

describe('Imperial Formatting', () => {
  describe('formatImperial', () => {
    it('formats whole feet', () => {
      expect(formatImperial(10)).toBe("10'");
    });

    it('formats feet and inches', () => {
      expect(formatImperial(10.5)).toBe("10' 6\"");
    });

    it('formats fractional inches', () => {
      expect(formatImperial(10.25)).toBe("10' 3\"");
    });

    it('handles decimal mode', () => {
      expect(formatImperial(10.5, { decimal: true })).toBe("10.50'");
    });

    it('handles zero', () => {
      expect(formatImperial(0)).toBe("0'");
    });

    it('handles small values', () => {
      expect(formatImperial(0.5)).toBe("0' 6\"");
    });
  });

  describe('parseImperial', () => {
    it('parses decimal feet', () => {
      expect(parseImperial('10.5')).toBe(10.5);
    });

    it('parses feet with apostrophe', () => {
      expect(parseImperial("12'")).toBe(12);
    });

    it('parses feet and inches', () => {
      expect(parseImperial("10' 6\"")).toBeCloseTo(10.5);
    });

    it('parses feet and inches without quotes', () => {
      expect(parseImperial('10 6')).toBeCloseTo(10.5);
    });

    it('parses inches only', () => {
      expect(parseImperial('6"')).toBeCloseTo(0.5);
    });

    it('returns null for invalid input', () => {
      expect(parseImperial('invalid')).toBeNull();
    });

    it('handles whitespace', () => {
      expect(parseImperial('  10.5  ')).toBe(10.5);
    });
  });
});

describe('kelvinToRGB', () => {
  it('returns warm color for low kelvin', () => {
    const rgb = kelvinToRGB(2700);
    expect(rgb.r).toBeGreaterThan(rgb.b);
  });

  it('returns cooler color for higher kelvin', () => {
    const rgb2700 = kelvinToRGB(2700);
    const rgb6500 = kelvinToRGB(6500);
    // At 6500K, blue should be higher relative to red compared to 2700K
    expect(rgb6500.b).toBeGreaterThan(rgb2700.b);
  });

  it('clamps values between 0 and 1', () => {
    const rgb = kelvinToRGB(2000);
    expect(rgb.r).toBeGreaterThanOrEqual(0);
    expect(rgb.r).toBeLessThanOrEqual(1);
    expect(rgb.g).toBeGreaterThanOrEqual(0);
    expect(rgb.g).toBeLessThanOrEqual(1);
    expect(rgb.b).toBeGreaterThanOrEqual(0);
    expect(rgb.b).toBeLessThanOrEqual(1);
  });
});
